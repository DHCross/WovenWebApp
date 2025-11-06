import { useCallback } from 'react';
import { generateId } from '../../../lib/id';
import type { Message, ReportContext, RelocationSummary, SessionMode } from '../chat/types';
import {
  buildNoContextGuardCopy,
  referencesAstroSeekWithoutGeometry,
  requestsPersonalReading,
} from '../../../lib/raven/guards';
import { formatShareableDraft, formatIntentHook } from '../../../lib/chatUtils';
import { mapRelocationToPayload } from '../../../lib/chatUtils';

const WEATHER_ONLY_PATTERN =
  /\b(weather|sky today|planetary (weather|currents)|what's happening in the sky)\b/i;

const ASTROSEEK_GUARD_SOURCE = "Conversational Guard (AstroSeek)";
const ASTROSEEK_GUARD_DRAFT: Record<string, string> = {
  picture: "Got your AstroSeek mention—one more step.",
  feeling: "I need the actual export contents to mirror accurately.",
  container: 'Option 1 · Click "Upload report" and drop the AstroSeek download (JSON or text).',
  option: "Option 2 · Open the export and paste the full table or text here.",
  next_step: "Once the geometry is included, I can read you in detail.",
};

const NO_CONTEXT_GUARD_SOURCE = "Conversational Guard";

interface useChatLogicProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  reportContexts: ReportContext[];
  runRavenRequest: (
    payload: Record<string, any>,
    placeholderId: string,
    fallbackMessage: string,
  ) => Promise<any | null>;
  sessionId: string | null;
  shiftSessionMode: (nextMode: SessionMode, options?: any) => void;
  setSessionStarted: React.Dispatch<React.SetStateAction<boolean>>;
  relocation: RelocationSummary | null;
  sessionMode: SessionMode;
  abortRef: React.MutableRefObject<AbortController | null>;
}

export function useChatLogic({
  messages,
  setMessages,
  reportContexts,
  runRavenRequest,
  sessionId,
  shiftSessionMode,
  setSessionStarted,
  relocation,
  sessionMode,
  abortRef,
}: useChatLogicProps) {
  const pushRavenNarrative = useCallback(
    (text: string, options: { hook?: string; climate?: string } = {}) => {
      const safe = text.trim();
      if (!safe) return;
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "raven",
          html: `<p style="margin:0; line-height:1.65;">${safe}</p>`,
          hook: options.hook,
          climate: options.climate,
          rawText: safe,
          validationPoints: [],
          validationComplete: true,
        },
      ]);
    },
    [setMessages],
  );

  const analyzeReportContext = useCallback(
    async (reportContext: ReportContext, contextsForPayload?: ReportContext[]) => {
      const contextList = contextsForPayload ?? reportContexts;

      const reportLabel = reportContext.name?.trim()
        ? `"${reportContext.name.trim()}"`
        : 'This report';

      setSessionStarted(true);
      shiftSessionMode('report');

      const sessionStartMessage: Message = {
        id: generateId(),
        role: 'raven' as const,
        html: `<div class="session-start">
          <p>🌌 <strong>Session Started: Mirror Reading</strong></p>
          <p>${reportLabel} has been loaded. I'll begin with a symbolic weather report, then we'll explore the mirror together.</p>
          <p>Shall we begin?</p>
        </div>`,
        hook: "Session · Mirror Reading",
        climate: "VOICE · Symbolic Weather",
        rawText: `Session Started: Mirror Reading\n\n${reportLabel} has been loaded. I'll begin with a symbolic weather report, then we'll explore the mirror together.\n\nShall we begin?`,
        validationPoints: [],
        validationComplete: true,
      };

      const mirrorPlaceholderId = generateId();
      const mirrorPlaceholder: Message = {
        id: mirrorPlaceholderId,
        role: "raven",
        html: "",
        climate: "",
        hook: "",
        intent: undefined,
        probe: null,
        prov: null,
        rawText: "",
        validationPoints: [],
        validationComplete: false,
      };

      setMessages(prev => [...prev, sessionStartMessage, mirrorPlaceholder]);

      const relocationPayload = mapRelocationToPayload(reportContext.relocation);
      const contextPayload = contextList.map((ctx) => {
        const ctxRelocation = mapRelocationToPayload(ctx.relocation);
        return {
          id: ctx.id,
          type: ctx.type,
          name: ctx.name,
          summary: ctx.summary,
          content: ctx.content,
          ...(ctxRelocation ? { relocation: ctxRelocation } : {}),
        };
      });

      try {
        await runRavenRequest(
          {
            input: '',
            sessionId: sessionId ?? undefined,
            options: {
              reportType: reportContext.type,
              reportId: reportContext.id,
              reportName: reportContext.name,
              reportSummary: reportContext.summary,
              ...(relocationPayload ? { relocation: relocationPayload } : {}),
              reportContexts: contextPayload,
            },
          },
          mirrorPlaceholderId,
          "Generating complete mirror flow report...",
        );
      } catch (error) {
        console.error('Error during report analysis:', error);
        const errorMessage: Message = {
          id: generateId(),
          role: 'raven' as const,
          html: `<div class="error-message">
            <p>I had some trouble generating the full analysis, but I'm ready to help you explore this report.</p>
            <p>What would you like to know about ${reportLabel}?</p>
          </div>`,
          hook: "Session · Ready",
          climate: "VOICE · Awaiting Input",
          rawText: `I had some trouble generating the full analysis, but I'm ready to help you explore this report.\n\nWhat would you like to know about ${reportLabel}?`,
          validationPoints: [],
          validationComplete: true,
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    },
    [reportContexts, runRavenRequest, sessionId, setMessages, setSessionStarted, shiftSessionMode],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (sessionMode === 'idle') {
        shiftSessionMode('exploration');
      } else {
        setSessionStarted(true);
      }
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {
          // ignore abort errors
        }
      }

      const relocationPayload = mapRelocationToPayload(relocation);
      const contexts = reportContexts.map((ctx) => {
        const ctxRelocation = mapRelocationToPayload(ctx.relocation);
        return {
          id: ctx.id,
          type: ctx.type,
          name: ctx.name,
          summary: ctx.summary,
          content: ctx.content,
          ...(ctxRelocation ? { relocation: ctxRelocation } : {}),
        };
      });

      const userId = generateId();
      const userMessage: Message = {
        id: userId,
        role: "user",
        html: `<p>${trimmed}</p>`,
        rawText: trimmed,
        validationPoints: [],
        validationComplete: true,
      };

      const hasReportContext = contexts.length > 0;
      const wantsWeatherOnly = WEATHER_ONLY_PATTERN.test(trimmed);
      const wantsPersonalReading = requestsPersonalReading(trimmed);
      const mentionsAstroSeek = referencesAstroSeekWithoutGeometry(trimmed);

      if (!hasReportContext && !wantsWeatherOnly && (wantsPersonalReading || mentionsAstroSeek)) {
        const guardDraft = mentionsAstroSeek
          ? { ...ASTROSEEK_GUARD_DRAFT }
          : (() => {
              const copy = buildNoContextGuardCopy();
              return {
                picture: copy.picture,
                feeling: copy.feeling,
                container: copy.container,
                option: copy.option,
                next_step: copy.next_step,
              };
            })();
        const guardSource = mentionsAstroSeek ? ASTROSEEK_GUARD_SOURCE : NO_CONTEXT_GUARD_SOURCE;
        const guardProv = { source: guardSource };
        const { html: guardHtml, rawText: guardRawText } = formatShareableDraft(guardDraft, guardProv);
        const guardHook = formatIntentHook("conversation", guardProv);
        const guardMessage: Message = {
          id: generateId(),
          role: "raven",
          html: guardHtml,
          climate: undefined,
          hook: guardHook,
          intent: "conversation",
          probe: null,
          prov: guardProv,
          rawText: guardRawText,
          validationPoints: [],
          validationComplete: true,
        };
        setMessages((prev) => [...prev, userMessage, guardMessage]);
        return;
      }

      const placeholderId = generateId();
      const placeholder: Message = {
        id: placeholderId,
        role: "raven",
        html: "",
        climate: "",
        hook: "",
        intent: undefined,
        probe: null,
        prov: null,
        rawText: "",
        validationPoints: [],
        validationComplete: false,
      };

      setMessages((prev) => [...prev, userMessage, placeholder]);

      await runRavenRequest(
        {
          input: trimmed,
          sessionId: sessionId ?? undefined,
          options: {
            reportContexts: contexts,
            ...(relocationPayload ? { relocation: relocationPayload } : {}),
          },
        },
        placeholderId,
        "No mirror returned for this lane.",
      );
    },
    [relocation, reportContexts, runRavenRequest, sessionId, sessionMode, shiftSessionMode, setSessionStarted, setMessages, abortRef],
  );

  const sendProgrammatic = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      void sendMessage(trimmed);
    },
    [sendMessage],
  );

  const handlePingFeedback = useCallback(
    (messageId: string, response: any, note?: string) => {
      const message = messages.find((m) => m.id === messageId);
      const alreadyAcknowledged = message?.pingFeedbackRecorded;

      const skipAutoProgrammatic = note === "__quick_reply__";
      const sanitizedNote = skipAutoProgrammatic ? undefined : note;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, pingFeedbackRecorded: true } : msg,
        ),
      );

      if (!alreadyAcknowledged) {
        let acknowledgement: string | null = null;
        switch (response) {
          case "yes":
            acknowledgement =
              "Logged as WB — glad that landed. I'll keep threading that resonance.";
            break;
          case "maybe":
            acknowledgement =
              "Logged as ABE — partially resonant. I'll refine the mirror so we can see the contour more clearly.";
            break;
          case "no":
            acknowledgement =
              "Logged as OSR — thanks for catching the miss. Let me adjust and offer a repair.";
            break;
          case "unclear":
            acknowledgement =
              "Logged as unclear — thanks for flagging the fog. I'll restate it in plainer language so we can test it again.";
            break;

          default:
            acknowledgement = null;
        }

        if (acknowledgement) {
          pushRavenNarrative(acknowledgement);
        }
      }

      if (!skipAutoProgrammatic) {
        const followUpParts: string[] = [];
        if (response === "yes") {
          followUpParts.push("yes, that resonates with me");
        } else if (response === "no") {
          followUpParts.push("that doesn't feel familiar to me");
        } else if (response === "maybe") {
          followUpParts.push("that partially resonates, but not completely");
        } else if (response === "unclear") {
          followUpParts.push("that feels confusing or unclear to me");
        }
        if (sanitizedNote) {
          followUpParts.push(sanitizedNote);
        }

        if (followUpParts.length > 0) {
          window.setTimeout(() => {
            void sendProgrammatic(followUpParts.join(". "));
          }, 400);
        }
      }
    },
    [messages, sendProgrammatic, pushRavenNarrative, setMessages],
  );

  const stop = useCallback(() => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        // ignore
      }
    }
  }, [abortRef]);

  const sendCurrentInput = useCallback(() => {
    const text = (document.querySelector('textarea')?.value ?? '').trim();
    if (!text) return;
    sendMessage(text);
  }, [sendMessage]);

  return { analyzeReportContext, sendMessage, sendProgrammatic, handlePingFeedback, stop, sendCurrentInput, pushRavenNarrative };
}
