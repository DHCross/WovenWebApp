import { useCallback, useRef } from 'react';
import { generateId } from '../../../lib/id';
import type { Message } from '../types';
import {
  formatShareableDraft,
  formatFriendlyErrorMessage,
  formatIntentHook,
  formatClimate,
  containsResonanceMarkers,
} from '../../../lib/chatUtils';
import { parseValidationPoints } from '@/lib/validation/parseValidationPoints';
import { hasPendingValidations } from '@/lib/validation/validationUtils';
import { fetchWithRetry } from '../../../lib/fetch';
import type { PersonaMode } from '../../../lib/persona';

type RavenDraftResponse = {
  ok?: boolean;
  intent?: any;
  draft?: Record<string, any> | null;
  prov?: Record<string, any> | null;
  climate?: string | any | null;
  sessionId?: string;
  probe?: any | null;
  guard?: boolean;
  guidance?: string;
  error?: string;
  details?: any;
  validation?: {
    mode: 'resonance' | 'none';
    allowFallback?: boolean;
  } | null;
};

interface useApiProps {
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setTyping: React.Dispatch<React.SetStateAction<boolean>>;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  dispatchValidation: React.Dispatch<any>;
  validationMap: any;
  personaMode: PersonaMode;
  abortRef: React.MutableRefObject<AbortController | null>;
}

export function useApi({
  setMessages,
  setTyping,
  setSessionId,
  dispatchValidation,
  validationMap,
  personaMode,
  abortRef,
}: useApiProps) {
  const commitError = useCallback((ravenId: string, message: string) => {
    let friendly = formatFriendlyErrorMessage(message);

    if (message.toLowerCase().includes("osr_detected")) {
      friendly = "I'm sensing we might need to reframe that question.";
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === ravenId
          ? {
              ...msg,
              html: `<div class="raven-error"><p class="text-rose-400">${friendly}</p></div>`,
              climate: "VOICE · Realignment",
              hook: message.toLowerCase().includes("osr_detected")
                ? "Let's Try Again"
                : msg.hook,
              rawText: friendly,
            }
          : msg,
      ),
    );
  }, [setMessages]);

  const applyRavenResponse = useCallback(
    (ravenId: string, response: RavenDraftResponse, fallbackMessage: string) => {
      const guidance =
        typeof response?.guidance === "string" ? response.guidance.trim() : "";
      const { html: formattedHtml, rawText } = response?.draft
        ? formatShareableDraft(response.draft, response.prov ?? null)
        : guidance
          ? {
              html: `<div class="raven-guard" style="font-size:13px; line-height:1.5; color:#94a3b8; white-space:pre-line;">${guidance}</div>`,
              rawText: guidance,
            }
          : {
              html: `<p>${fallbackMessage}</p>`,
              rawText: fallbackMessage,
            };

      const climateDisplay = formatClimate(response?.climate ?? undefined);
      const hook = formatIntentHook(response?.intent, response?.prov ?? null);
      const allowValidationMarkers =
        containsResonanceMarkers(rawText) ||
        response?.validation?.mode === "resonance";
      const shouldParseValidation =
        Boolean(response?.draft) && Boolean(rawText) && allowValidationMarkers;
      const existingPoints = validationMap[ravenId] ?? [];
      const parsedPoints = shouldParseValidation
        ? parseValidationPoints(rawText, existingPoints, {
            allowParagraphFallback: response?.validation?.allowFallback === true,
          })
        : existingPoints;

      if (shouldParseValidation) {
        if (parsedPoints.length > 0) {
          dispatchValidation({
            type: "setPoints",
            messageId: ravenId,
            points: parsedPoints,
          });
        } else if (existingPoints.length > 0) {
          dispatchValidation({
            type: "setPoints",
            messageId: ravenId,
            points: [],
          });
        }
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== ravenId) return msg;
          const nextMessage: Message = {
            ...msg,
            html: formattedHtml,
            rawText: rawText || msg.rawText || "",
            climate: climateDisplay ?? msg.climate,
            hook: hook ?? msg.hook,
            intent: response.intent ?? msg.intent,
            probe: response.probe ?? msg.probe ?? null,
            prov: response.prov ?? msg.prov ?? null,
          };

          if (shouldParseValidation) {
            if (parsedPoints.length > 0) {
              nextMessage.validationPoints = parsedPoints;
              nextMessage.validationComplete = !hasPendingValidations(parsedPoints);
            } else {
              nextMessage.validationPoints = [];
              nextMessage.validationComplete = true;
            }
          }

          return nextMessage;
        }),
      );

      if (response?.sessionId) {
        setSessionId(response.sessionId);
      }
    },
    [dispatchValidation, validationMap, setMessages, setSessionId],
  );

  const runRavenRequest = useCallback(
    async (
      payload: Record<string, any>,
      placeholderId: string,
      fallbackMessage: string,
    ): Promise<RavenDraftResponse | null> => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setTyping(true);
      try {
        const payloadWithPersona =
          payload && typeof payload.persona !== "undefined"
            ? payload
            : { ...payload, persona: personaMode };

        const res = await fetchWithRetry(
          "/api/raven",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Request-Id": generateId(),
            },
            body: JSON.stringify(payloadWithPersona),
            signal: ctrl.signal,
          },
          3,
          30000,
        );

        if (!res.headers.get('content-type')?.includes('application/json')) {
          const errorText = await res.text();
          throw new Error(`Invalid response format: ${errorText.substring(0, 200)}`);
        }

        const data: RavenDraftResponse = await res.json().catch((err) => {
          console.error('Failed to parse JSON response:', err);
          return { ok: false, error: 'Failed to parse server response' };
        });

        if (!res.ok || !data?.ok) {
          const errorMessage = data?.error || `Request failed (${res.status})`;
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
    [applyRavenResponse, commitError, personaMode, abortRef, setTyping],
  );

  return { runRavenRequest };
}
