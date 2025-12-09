import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { fetchWithRetry } from "@/lib/api/fetchWithRetry";
import { generateId } from "@/lib/id";
import { containsResonanceMarkers } from "@/lib/report-parsing";
import {
  formatClimate,
  formatFriendlyErrorMessage,
  formatIntentHook,
} from "@/lib/raven-formatting";
import {
  escapeHtml,
  formatShareableDraft,
} from "@/lib/raven-narrative";
import type {
  Message,
  RavenDraftResponse,
} from "@/lib/raven-client/types";
import type { PersonaMode } from "@/lib/persona";
import {
  hasPendingValidations,
} from "@/lib/validation/validationUtils";
import type {
  ValidationPoint,
  ValidationState,
} from "@/lib/validation/types";
import { parseValidationPoints } from "@/lib/validation/parseValidationPoints";
import { getAccessTokenAsync } from "./useAuth";

export interface UseRavenRequestArgs {
  personaMode: PersonaMode;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  sessionId: string | null;
  setSessionId: Dispatch<SetStateAction<string | null>>;
  validationMap: ValidationState;
  setValidationPoints: (messageId: string, points: ValidationPoint[]) => void;
}

export interface UseRavenRequestResult {
  typing: boolean;
  runRavenRequest: (
    payload: Record<string, any>,
    placeholderId: string,
    fallbackMessage: string,
  ) => Promise<RavenDraftResponse | null>;
  stop: () => void;
}

export function useRavenRequest({
  personaMode,
  setMessages,
  sessionId,
  setSessionId,
  validationMap,
  setValidationPoints,
}: UseRavenRequestArgs): UseRavenRequestResult {
  const [typing, setTyping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const commitError = useCallback(
    (messageId: string, message: string, httpStatus?: number) => {
      const friendly = formatFriendlyErrorMessage(message, httpStatus);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
              ...msg,
              html: `<div class="raven-error"><p class="text-rose-400" style="white-space: pre-line;">${escapeHtml(
                friendly,
              )}</p></div>`,
              climate: "VOICE · Realignment",
              hook: message.toLowerCase().includes("osr_detected")
                ? "Let's Try Again"
                : "Issue Detected",
              rawText: friendly,
            }
            : msg,
        ),
      );
    },
    [setMessages],
  );

  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
      );
    },
    [setMessages]
  );

  const applyRavenResponse = useCallback(
    (messageId: string, response: RavenDraftResponse, fallbackMessage: string) => {
      const guidance =
        typeof response?.guidance === "string" ? response.guidance.trim() : "";

      const { html: formattedHtml, rawText } = response?.draft
        ? formatShareableDraft(response.draft, response.prov ?? null)
        : guidance
          ? {
            html: `<div class="raven-guard" style="font-size:13px; line-height:1.5; color:#94a3b8; white-space:pre-line;">${escapeHtml(
              guidance,
            )}</div>`,
            rawText: guidance,
          }
          : {
            html: `<p>${escapeHtml(fallbackMessage)}</p>`,
            rawText: fallbackMessage,
          };

      const climateDisplay = formatClimate(response?.climate ?? undefined);
      // Prefer explicit hook from response, fall back to formatted intent
      const hook = response?.hook ?? formatIntentHook(response?.intent, response?.prov ?? null);

      const allowValidationMarkers =
        containsResonanceMarkers(rawText) ||
        response?.validation?.mode === "resonance";
      const shouldParseValidation =
        Boolean(response?.draft) && Boolean(rawText) && allowValidationMarkers;

      const existingPoints = validationMap[messageId] ?? [];
      const parsedPoints = shouldParseValidation
        ? parseValidationPoints(rawText, existingPoints, {
          allowParagraphFallback:
            response?.validation?.allowFallback === true,
        })
        : existingPoints;

      if (shouldParseValidation) {
        if (parsedPoints.length > 0) {
          setValidationPoints(messageId, parsedPoints);
        } else if (existingPoints.length > 0) {
          setValidationPoints(messageId, []);
        }
      }

      updateMessage(messageId, {
        html: formattedHtml,
        rawText: rawText || "",
        climate: climateDisplay,
        hook: hook,
        intent: response.intent,
        probe: response.probe ?? null,
        prov: response.prov ?? null,
        validationMode: response.validation?.mode,
        ...(shouldParseValidation ? {
          validationPoints: parsedPoints,
          validationComplete: parsedPoints.length === 0 || !hasPendingValidations(parsedPoints),
        } : {})
      });

      if (response?.sessionId) {
        setSessionId(response.sessionId);
      }
    },
    [setSessionId, setValidationPoints, validationMap, updateMessage],
  );

  const stop = useCallback(() => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        // ignore abort errors
      }
    }
  }, []);

  const runRavenRequest = useCallback(
    async (
      payload: Record<string, any>,
      placeholderId: string,
      fallbackMessage: string,
    ): Promise<RavenDraftResponse | null> => {
      const controller = new AbortController();
      abortRef.current = controller;
      setTyping(true);

      try {
        let mergedPayload = payload;
        if (typeof mergedPayload.sessionId === "undefined" && sessionId) {
          mergedPayload = { ...mergedPayload, sessionId };
        }
        if (typeof mergedPayload.persona === "undefined") {
          mergedPayload = { ...mergedPayload, persona: personaMode };
        }

        // Get a fresh access token (will refresh if expired)
        const accessToken = await getAccessTokenAsync();

        const response = await fetchWithRetry(
          "/api/raven",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Request-Id": generateId(),
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(mergedPayload),
            signal: controller.signal,
          },
          3,
          30000,
        );

        const contentType = response.headers.get("content-type") ?? "";

        // Handle Streaming Response (NDJSON or Server-Sent Events)
        if (contentType.includes("text/event-stream") || contentType.includes("application/x-ndjson")) {
          const reader = response.body?.getReader();
          if (!reader) throw new Error("Response body is not readable");

          const decoder = new TextDecoder();
          let buffer = "";
          let accumulatedDraft = "";
          let finalResponseData: RavenDraftResponse | null = null;

          // Phase tracking for phase-gated streaming
          let currentPhase: string | null = null;
          let currentPhaseLabel: string = "";
          let currentPhaseIcon: string = "";
          let phaseContents: Map<string, string> = new Map();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              // Handle SSE "data: " prefix if present
              const dataStr = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;

              try {
                const chunk = JSON.parse(dataStr);

                // === PHASE-GATED STREAMING EVENTS ===
                if (chunk.type === 'phase_start' && chunk.phaseKey) {
                  currentPhase = chunk.phaseKey as string;
                  currentPhaseLabel = chunk.phaseLabel || 'Section';
                  currentPhaseIcon = chunk.phaseIcon || '📖';
                  phaseContents.set(currentPhase, '');
                  continue;
                }

                if (chunk.type === 'phase_delta' && currentPhase) {
                  const existing = phaseContents.get(currentPhase!) || '';
                  phaseContents.set(currentPhase, existing + chunk.delta);

                  // Rebuild accumulated draft from all phases
                  accumulatedDraft = '';
                  for (const [phase, content] of phaseContents) {
                    const label = currentPhase === phase ? currentPhaseLabel : phase;
                    const icon = currentPhase === phase ? currentPhaseIcon : '📖';
                    accumulatedDraft += `\n\n**${icon} ${label}**\n\n${content}`;
                  }
                  accumulatedDraft = accumulatedDraft.trim();

                  // Real-time update
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === placeholderId
                        ? {
                          ...msg,
                          html: `<p>${escapeHtml(accumulatedDraft)}</p>`,
                          rawText: accumulatedDraft
                        }
                        : msg
                    )
                  );
                  continue;
                }

                if (chunk.type === 'phase_end') {
                  // Phase complete, keep currentPhase for ordering
                  continue;
                }

                if (chunk.type === 'complete') {
                  // All phases complete
                  continue;
                }

                // === LEGACY / FALLBACK: Standard delta events ===
                if (chunk.delta) {
                  accumulatedDraft += chunk.delta;
                  // Real-time update using escaped HTML to prevent XSS during streaming
                  // Note: This is a raw render; markdown formatting is applied at the end
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === placeholderId
                        ? {
                          ...msg,
                          html: `<p>${escapeHtml(accumulatedDraft)}</p>`,
                          rawText: accumulatedDraft
                        }
                        : msg
                    )
                  );
                }

                // Merge other metadata as it arrives
                if (chunk.intent || chunk.climate || chunk.hook || chunk.probe || chunk.prov) {
                  if (!finalResponseData) finalResponseData = { ok: true };
                  Object.assign(finalResponseData, chunk);

                  // Update metadata in UI immediately
                  updateMessage(placeholderId, {
                    climate: formatClimate(chunk.climate),
                    hook: formatIntentHook(chunk.intent, chunk.prov),
                    probe: chunk.probe,
                    prov: chunk.prov
                  });
                }

                if (chunk.sessionId) {
                  setSessionId(chunk.sessionId);
                }

                if (chunk.error) {
                  throw new Error(chunk.error);
                }

              } catch (e) {
                // eslint-disable-next-line no-console
                console.warn("Failed to parse stream chunk", e);
              }
            }
          }

          // Final pass to format the complete message properly with markdown/paragraphs
          if (accumulatedDraft) {
            const finalDraft = { conversation: accumulatedDraft };
            const finalResponse: RavenDraftResponse = {
              ok: true,
              draft: finalDraft,
              ...finalResponseData
            };
            applyRavenResponse(placeholderId, finalResponse, fallbackMessage);
            return finalResponse;
          }

          return finalResponseData;
        }

        // Handle Legacy JSON Response
        if (!contentType.includes("application/json")) {
          const errorText = await response.text();
          throw new Error(
            `Invalid response format: ${errorText.substring(0, 200)}`,
          );
        }

        const data: RavenDraftResponse = await response
          .json()
          .catch(() => ({
            ok: false,
            error: "Failed to parse server response",
          }));

        if (!response.ok || !data?.ok) {
          // Pass the full error data as JSON so the formatter can extract all details
          // Note: API returns 'detail' but RavenDraftResponse type uses 'details'
          const errorPayload = {
            error: data?.error || `Request failed`,
            detail: (data as any)?.detail || (data as any)?.details,
            reason: (data as any)?.reason,
            hint: (data as any)?.hint,
            status: response.status,
          };
          commitError(placeholderId, JSON.stringify(errorPayload), response.status);
          return null;
        }

        applyRavenResponse(placeholderId, data, fallbackMessage);
        return data;
      } catch (error: any) {
        if (error?.name === "AbortError") {
          commitError(placeholderId, "Request cancelled.");
        } else {
          console.error("Raven request failed:", error);
          const networkMessage =
            error?.message && error.message.includes("Failed to fetch")
              ? "Network error: Unable to connect to the server. Please check your connection and try again."
              : "I apologize, but I'm having trouble processing your request. Please try rephrasing or ask about something else.";
          commitError(placeholderId, networkMessage);
        }
        return null;
      } finally {
        setTyping(false);
        abortRef.current = null;
      }
    },
    [applyRavenResponse, commitError, personaMode, sessionId, setSessionId, updateMessage],
  );

  return {
    typing,
    runRavenRequest,
    stop,
  };
}

export default useRavenRequest;
