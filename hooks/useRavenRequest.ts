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

export interface UseRavenRequestArgs {
  personaMode: PersonaMode;
  setMessages: Dispatch<SetStateAction<Message[]>>;
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
  setSessionId,
  validationMap,
  setValidationPoints,
}: UseRavenRequestArgs): UseRavenRequestResult {
  const [typing, setTyping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const commitError = useCallback(
    (messageId: string, message: string) => {
      const friendly = formatFriendlyErrorMessage(message);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                html: `<div class="raven-error"><p class="text-rose-400">${escapeHtml(
                  friendly,
                )}</p></div>`,
                climate: "VOICE · Realignment",
                hook: message.toLowerCase().includes("osr_detected")
                  ? "Let's Try Again"
                  : msg.hook,
                rawText: friendly,
              }
            : msg,
        ),
      );
    },
    [setMessages],
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
      const hook = formatIntentHook(response?.intent, response?.prov ?? null);

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

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const next: Message = {
            ...msg,
            html: formattedHtml,
            rawText: rawText || msg.rawText || "",
            climate: climateDisplay ?? msg.climate,
            hook: hook ?? msg.hook,
            intent: response.intent ?? msg.intent,
            probe: response.probe ?? msg.probe ?? null,
            prov: response.prov ?? msg.prov ?? null,
            validationMode: response.validation?.mode ?? msg.validationMode,
          };

          if (shouldParseValidation) {
            next.validationPoints = parsedPoints;
            next.validationComplete =
              parsedPoints.length === 0 || !hasPendingValidations(parsedPoints);
          }

          return next;
        }),
      );

      if (response?.sessionId) {
        setSessionId(response.sessionId);
      }
    },
    [setMessages, setSessionId, setValidationPoints, validationMap],
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
        const payloadWithPersona =
          payload && typeof payload.persona !== "undefined"
            ? payload
            : { ...payload, persona: personaMode };

        const response = await fetchWithRetry(
          "/api/raven",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Request-Id": generateId(),
            },
            body: JSON.stringify(payloadWithPersona),
            signal: controller.signal,
          },
          3,
          30000,
        );

        const contentType = response.headers.get("content-type") ?? "";
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
          const errorMessage = data?.error || `Request failed (${response.status})`;
          commitError(placeholderId, errorMessage);
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
    [applyRavenResponse, commitError, personaMode],
  );

  return {
    typing,
    runRavenRequest,
    stop,
  };
}

export default useRavenRequest;
