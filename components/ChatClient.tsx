"use client";

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { generateId } from "../lib/id";
import { formatFullClimateDisplay, type ClimateData } from "../lib/climate-renderer";
import type { RelocationSummary } from "../lib/relocation";
import { type PingResponse } from "./PingFeedback";
import { hasPendingValidations, getValidationStats, formatValidationSummary, validationReducer } from "@/lib/validation/validationUtils";
import { parseValidationPoints } from "@/lib/validation/parseValidationPoints";
import type { ValidationPoint, ValidationState } from "@/lib/validation/types";
import MirrorResponseActions from "./MirrorResponseActions";
import SessionWrapUpModal from "./SessionWrapUpModal";
import WrapUpCard from "./WrapUpCard";
import { pingTracker } from "../lib/ping-tracker";
import GranularValidation from "./feedback/GranularValidation";
import {
  APP_NAME,
  STATUS_CONNECTED,
  INPUT_PLACEHOLDER,
} from "../lib/ui-strings";
import type { Intent } from "../lib/raven/intent";
import type { SSTProbe } from "../lib/raven/sst";
import { buildNoContextGuardCopy } from "../lib/guard/no-context";
import { referencesAstroSeekWithoutGeometry } from "../lib/raven/guards";
import { requestsPersonalReading } from "../lib/raven/personal-reading";
import type { PersonaMode } from "../lib/persona";
import { escapeHtml, formatShareableDraft } from "@/lib/raven-narrative";
import {
  formatFriendlyErrorMessage,
  formatIntentHook,
  formatClimate,
  containsInitialProbe,
  getPingCheckpointType,
  extractBalanceMeterSummary,
  formatBalanceMeterSummaryLine,
} from "@/lib/raven-formatting";
import {
  ASTROSEEK_GUARD_DRAFT,
  ASTROSEEK_GUARD_SOURCE,
  NO_CONTEXT_GUARD_SOURCE,
  WEATHER_ONLY_PATTERN,
  containsResonanceMarkers,
  detectReportMetadata,
  mapRelocationToPayload,
  parseReportContent,
  type ReportContext,
} from "@/lib/report-parsing";

type RavenDraftResponse = {
  ok?: boolean;
  intent?: Intent;
  draft?: Record<string, any> | null;
  prov?: Record<string, any> | null;
  climate?: string | ClimateData | null;
  sessionId?: string;
  probe?: SSTProbe | null;
  guard?: boolean;
  guidance?: string;
  error?: string;
  details?: any;
  validation?: {
    mode: 'resonance' | 'none';
    allowFallback?: boolean;
  } | null;
};

type MessageRole = "user" | "raven";

interface Message {
  id: string;
  role: MessageRole;
  html: string;
  climate?: string;
  hook?: string;
  intent?: Intent;
  probe?: SSTProbe | null;
  prov?: Record<string, any> | null;
  pingFeedbackRecorded?: boolean;
  rawText?: string; // Store clean text for copying
  validationPoints?: ValidationPoint[];
  validationComplete?: boolean;
  metadata?: {
    onboardingActions?: {
      startReading: () => void;
      upload: () => void;
      dialogue: () => void;
    };
  };
}

interface StoredMathBrainPayload {
  savedAt: string;
  from?: string;
  reportType?: string;
  mode?: string;
  includeTransits?: boolean;
  window?: {
    start?: string;
    end?: string;
    step?: string;
  } | null;
  subjects?: {
    personA?: {
      name?: string;
      timezone?: string;
      city?: string;
      state?: string;
    } | null;
    personB?: {
      name?: string;
      timezone?: string;
      city?: string;
      state?: string;
    } | null;
  } | null;
  payload: any;
}

type RavenSessionExport = {
  sessionId?: string;
  scores?: any;
  log?: any;
  suggestions?: any[];
};

type SessionMode = 'idle' | 'exploration' | 'report';

type SessionShiftOptions = {
  message?: string;
  hook?: string;
  climate?: string;
};

const MB_LAST_PAYLOAD_KEY = "mb.lastPayload";
const MB_LAST_PAYLOAD_ACK_KEY = "mb.lastPayloadAck";

/**
 * Retry logic with exponential backoff + jitter for API requests.
 * Handles transient network failures gracefully.
 */
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  timeoutMs: number = 30000,
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error as Error;
      clearTimeout(0); // Clean up timeout if needed

      // Don't retry on abort signals from caller
      if ((error as Error)?.name === "AbortError" && options.signal?.aborted) {
        throw error;
      }

      // Only retry on network errors and timeouts, not on other abort errors
      if (
        attempt < maxRetries &&
        ((error as Error)?.name === "TypeError" || // Network error
          (error as Error)?.name === "AbortError") // Timeout
      ) {
        // Exponential backoff with jitter: 100ms * 2^attempt ± random 0-50%
        const baseDelay = 100 * Math.pow(2, attempt);
        const jitter = baseDelay * 0.5 * Math.random();
        const delay = baseDelay + jitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw (
    lastError ||
    new Error(`Request failed after ${maxRetries + 1} attempts`)
  );
};

const sanitizeHtml = (html: string): string => {
  if (typeof window === "undefined" || !DOMPurify) {
    return escapeHtml(html);
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "div",
      "span",
      "p",
      "strong",
      "em",
      "b",
      "i",
      "ul",
      "ol",
      "li",
      "br",
      "a",
      "code",
      "pre",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "button",
    ],
    // Strict allowlist: only essential attributes + explicitly safe data-action
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "class",
      "style",
      "data-action", // only this single data-* attr allowed
    ],
    ALLOW_DATA_ATTR: false, // Disable blanket data-* attribute permission
    KEEP_CONTENT: true,
  });
};

const createInitialMessage = (): Message => ({
  id: generateId(),
  role: "raven",
  html: `<p style="margin:0; line-height:1.65;">I’m a clean mirror. Share whatever’s moving—type below to talk freely, or upload your Mirror + Symbolic Weather JSON when you want the formal reading. I’ll keep you oriented either way.</p>`,
  climate: formatFullClimateDisplay({ magnitude: 1, valence: 2, volatility: 0 }),
  hook: "Session · Orientation",
  rawText: `I’m a clean mirror. Share whatever’s moving—type below to talk freely, or upload your Mirror + Symbolic Weather JSON when you want the formal reading. I’ll keep you oriented either way.`,
  validationPoints: [],
  validationComplete: true,
});

export default function ChatClient() {
  // ... rest of the code remains the same ...
  const [messages, setMessages] = useState<Message[]>(() => [createInitialMessage()]);
  const [validationMap, dispatchValidation] = useReducer(validationReducer, {} as ValidationState);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [personaMode, setPersonaMode] = useState<PersonaMode>('hybrid');
  const copyResetRef = useRef<number | null>(null);

  const handleCopyMessage = useCallback(async (messageId: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      if (copyResetRef.current) {
        window.clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = window.setTimeout(() => {
        setCopiedMessageId(null);
        copyResetRef.current = null;
      }, 2000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to copy text:", err);
    }
  }, []);

  useEffect(
    () => () => {
      if (copyResetRef.current) {
        window.clearTimeout(copyResetRef.current);
        copyResetRef.current = null;
      }
    },
    [],
  );

  const handleValidationUpdate = useCallback(
    (messageId: string, points: ValidationPoint[]) => {
      dispatchValidation({ type: "setPoints", messageId, points });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                validationPoints: points,
                validationComplete:
                  points.length > 0 && !hasPendingValidations(points),
              }
            : msg,
        ),
      );
    },
    [dispatchValidation],
  );

  const handleValidationNoteChange = useCallback(
    (messageId: string, pointId: string, note: string) => {
      dispatchValidation({ type: "setNote", messageId, pointId, note });
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const nextPoints = (msg.validationPoints ?? []).map((point) =>
            point.id === pointId ? { ...point, note } : point,
          );
          return {
            ...msg,
            validationPoints: nextPoints,
          };
        }),
      );
    },
    [dispatchValidation],
  );

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reportContexts, setReportContexts] = useState<ReportContext[]>([]);
  const [uploadType, setUploadType] = useState<"mirror" | "balance" | null>(null);
  const [relocation, setRelocation] = useState<RelocationSummary | null>(null);
  const [storedPayload, setStoredPayload] = useState<StoredMathBrainPayload | null>(null);
  const [hasSavedPayloadSnapshot, setHasSavedPayloadSnapshot] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>('idle');
  const [isWrapUpOpen, setIsWrapUpOpen] = useState(false);
  const [wrapUpLoading, setWrapUpLoading] = useState(false);
  const [showWrapUpPanel, setShowWrapUpPanel] = useState(false);
  const [wrapUpExport, setWrapUpExport] = useState<RavenSessionExport | null>(null);
  const [showClearMirrorExport, setShowClearMirrorExport] = useState(false);
  const [showResonanceCard, setShowResonanceCard] = useState(false);
  const [resonanceCard, setResonanceCard] = useState<any>(null);
  const [contextualSuggestions, setContextualSuggestions] = useState<string[]>([]);

  const conversationRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const sessionAnnouncementRef = useRef<string | null>(null);
  const sessionAnnouncementHookRef = useRef<string | undefined>(undefined);
  const sessionAnnouncementClimateRef = useRef<string | undefined>(undefined);
  const previousModeRef = useRef<SessionMode>('idle');
  const pendingContextRequirementRef = useRef<'mirror' | 'weather' | null>(null);

  const pushRavenNarrative = useCallback(
    (text: string, options: { hook?: string; climate?: string } = {}) => {
      const safe = text.trim();
      if (!safe) return;
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "raven",
          html: `<p style="margin:0; line-height:1.65;">${escapeHtml(safe)}</p>`,
          hook: options.hook,
          climate: options.climate,
          rawText: safe,
          validationPoints: [],
          validationComplete: true,
        },
      ]);
    },
    [],
  );

  const shiftSessionMode = useCallback(
    (nextMode: SessionMode, options: SessionShiftOptions = {}) => {
      if (nextMode === 'idle') {
        setSessionMode('idle');
        setSessionStarted(false);
        return;
      }

      if (nextMode === sessionMode) {
        setSessionStarted(true);
        return;
      }

      sessionAnnouncementRef.current = options.message ?? null;
      sessionAnnouncementHookRef.current = options.hook;
      sessionAnnouncementClimateRef.current = options.climate;

      setSessionStarted(true);
      setSessionMode((prev) => (prev === nextMode ? prev : nextMode));
    },
    [sessionMode],
  );

  useEffect(() => {
    if (!sessionStarted) {
      previousModeRef.current = sessionMode;
      return;
    }
    const prev = previousModeRef.current;
    if (sessionMode === prev || sessionMode === 'idle') {
      previousModeRef.current = sessionMode;
      return;
    }

    let message = sessionAnnouncementRef.current;
    let hook = sessionAnnouncementHookRef.current;
    let climate = sessionAnnouncementClimateRef.current;

    if (!message) {
      if (sessionMode === 'exploration') {
        message =
          "Session open. We are outside a formal reading—share whatever you want reflected and I will respond in real time.";
      } else if (sessionMode === 'report') {
        message =
          "Structured reading engaged. Because a report is in play, I will track resonance pings until you end the session.";
      }
    }
    if (!hook) {
      hook =
        sessionMode === 'report'
          ? "Session · Structured Reading"
          : "Session · Open Dialogue";
    }
    if (!climate) {
      climate =
        sessionMode === 'report'
          ? "VOICE · Report Interpretation"
          : "Listening · Open Dialogue";
    }

    if (message) {
      pushRavenNarrative(message, { hook, climate });
    }

    sessionAnnouncementRef.current = null;
    sessionAnnouncementHookRef.current = undefined;
    sessionAnnouncementClimateRef.current = undefined;
    previousModeRef.current = sessionMode;
  }, [pushRavenNarrative, sessionMode, sessionStarted]);

  const sessionModeDescriptor = useMemo(() => {
    switch (sessionMode) {
      case 'exploration':
        return {
          label: 'Exploratory Dialogue',
          description:
            'Free-form voice. No report is attached, so feel free to orient, vent, or ask for guidance. Upload a Math Brain export to shift into a structured reading.',
          badgeClass: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
        };
      case 'report':
        return {
          label: 'Structured Reading',
          description:
            'A report or upload triggered Raven’s VOICE layer. Resonance pings are tracked until you end the session or clear the context.',
          badgeClass: 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200',
        };
      default:
        return {
          label: 'Session Idle',
          description: 'Begin typing below to start speaking with Raven.',
          badgeClass: 'border-slate-700/50 bg-slate-800/60 text-slate-300',
        };
    }
  }, [sessionMode]);

  useEffect(() => {
    if (
      sessionStarted &&
      sessionMode === 'report' &&
      reportContexts.length === 0
    ) {
      shiftSessionMode('exploration', {
        message:
          'Report context cleared. We are back in open dialogue until you upload another file or resume Math Brain.',
        hook: 'Session · Open Dialogue',
        climate: 'Listening · Open Dialogue',
      });
    }
  }, [reportContexts.length, sessionMode, sessionStarted, shiftSessionMode]);

  useEffect(() => {
    const el = conversationRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MB_LAST_PAYLOAD_KEY);
      if (!raw) {
        setHasSavedPayloadSnapshot(false);
        return;
      }
      const parsed = JSON.parse(raw) as StoredMathBrainPayload | null;
      if (!parsed || !parsed.payload) {
        setHasSavedPayloadSnapshot(false);
        return;
      }

      const savedAt =
        typeof parsed.savedAt === "string" && parsed.savedAt
          ? parsed.savedAt
          : new Date().toISOString();
      setHasSavedPayloadSnapshot(true);

      const ack = window.localStorage.getItem(MB_LAST_PAYLOAD_ACK_KEY);
      if (ack && ack === savedAt) return;

      setStoredPayload({ ...parsed, savedAt });
    } catch {
      setHasSavedPayloadSnapshot(false);
    }
  }, []);

  useEffect(() => {
    if (reportContexts.length > 0 && storedPayload) {
      setStoredPayload(null);
    }
  }, [reportContexts, storedPayload]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = window.setTimeout(() => setErrorMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    if (typing) return;
    messages.forEach((msg) => {
      if (msg.role === "raven" && containsInitialProbe(msg.html)) {
        const existing = pingTracker.getFeedback(msg.id);
        if (!existing) {
          pingTracker.registerPending(
            msg.id,
            getPingCheckpointType(msg.html),
            msg.html,
          );
        }
      }
    });
  }, [messages, typing]);

  const validationSyncRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const readyForSync = messages.filter(
      (msg) =>
        msg.role === "raven" &&
        Array.isArray(msg.validationPoints) &&
        msg.validationPoints.length > 0 &&
        !msg.validationComplete &&
        !hasPendingValidations(msg.validationPoints ?? []) &&
        !validationSyncRef.current.has(msg.id),
    );

    readyForSync.forEach((msg) => {
      validationSyncRef.current.add(msg.id);
      const payload = {
        sessionId: sessionId ?? null,
        messageId: msg.id,
        hook: msg.hook ?? null,
        climate: msg.climate ?? null,
        validations: (msg.validationPoints ?? []).map((point) => ({
          id: point.id,
          field: point.field,
          voice: point.voice,
          tag: point.tag ?? null,
          note: point.note ?? null,
        })),
      };

      void fetch("/api/validation-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(() => {
          setMessages((prev) =>
            prev.map((entry) =>
              entry.id === msg.id
                ? { ...entry, validationComplete: true }
                : entry,
            ),
          );
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error("Failed to persist validation log:", error);
        })
        .finally(() => {
          validationSyncRef.current.delete(msg.id);
        });
    });
  }, [messages, sessionId]);

  const storedPayloadSummary = useMemo(() => {
    if (!storedPayload) return "";
    const parts: string[] = [];
    const person = storedPayload.subjects?.personA?.name?.trim();
    if (person) parts.push(person);
    if (storedPayload.includeTransits) parts.push("Transits on");
    const windowStart = storedPayload.window?.start;
    const windowEnd = storedPayload.window?.end;
    if (windowStart && windowEnd) {
      parts.push(`${windowStart} → ${windowEnd}`);
    } else if (windowStart) {
      parts.push(`Starting ${windowStart}`);
    } else if (windowEnd) {
      parts.push(`Ending ${windowEnd}`);
    }
    return parts.join(" • ");
  }, [storedPayload]);

  const acknowledgeStoredPayload = useCallback((timestamp?: string) => {
    if (typeof window === "undefined") return;
    try {
      const token =
        typeof timestamp === "string" && timestamp
          ? timestamp
          : new Date().toISOString();
      window.localStorage.setItem(MB_LAST_PAYLOAD_ACK_KEY, token);
    } catch {
      // ignore storage quota issues
    }
  }, []);

  const dismissStoredPayload = useCallback(
    (record?: StoredMathBrainPayload | null) => {
      acknowledgeStoredPayload(record?.savedAt);
      setStoredPayload(null);
    },
    [acknowledgeStoredPayload],
  );

  const recoverLastStoredPayload = useCallback(() => {
    if (storedPayload) {
      setStatusMessage("Math Brain export already queued.");
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MB_LAST_PAYLOAD_KEY);
      if (!raw) {
        setHasSavedPayloadSnapshot(false);
        setStatusMessage("No saved Math Brain export found.");
        return;
      }

      const parsed = JSON.parse(raw) as StoredMathBrainPayload | null;
      if (!parsed || !parsed.payload) {
        setHasSavedPayloadSnapshot(false);
        setStatusMessage("No saved Math Brain export found.");
        return;
      }

      const savedAt =
        typeof parsed.savedAt === "string" && parsed.savedAt
          ? parsed.savedAt
          : new Date().toISOString();
      setHasSavedPayloadSnapshot(true);

      const ack = window.localStorage.getItem(MB_LAST_PAYLOAD_ACK_KEY);
      if (ack && ack === savedAt) return;

      setStoredPayload({ ...parsed, savedAt });
      setHasSavedPayloadSnapshot(true);
      setStatusMessage("Last Math Brain export is ready to load.");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to recover stored payload:", error);
      setErrorMessage("Could not retrieve the saved Math Brain export.");
    }
  }, [
    storedPayload,
    setErrorMessage,
    setHasSavedPayloadSnapshot,
    setStatusMessage,
    setStoredPayload,
  ]);

  const commitError = useCallback((ravenId: string, message: string) => {
    let friendly = formatFriendlyErrorMessage(message);

    // Handle OSR detection specifically
    if (message.toLowerCase().includes("osr_detected")) {
      friendly = "I'm sensing we might need to reframe that question.";
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === ravenId
          ? {
              ...msg,
              html: `<div class="raven-error">
                <p class="text-rose-400">${escapeHtml(friendly)}</p>
              </div>`,
              climate: "VOICE · Realignment",
              hook: message.toLowerCase().includes("osr_detected")
                ? "Let's Try Again"
                : msg.hook,
              rawText: friendly,
            }
          : msg,
      ),
    );
  }, []);

  const applyRavenResponse = useCallback(
    (ravenId: string, response: RavenDraftResponse, fallbackMessage: string) => {
      const guidance =
        typeof response?.guidance === "string" ? response.guidance.trim() : "";
      const { html: formattedHtml, rawText } = response?.draft
        ? formatShareableDraft(response.draft, response.prov ?? null)
        : guidance
          ? {
              html: `<div class="raven-guard" style="font-size:13px; line-height:1.5; color:#94a3b8; white-space:pre-line;">${escapeHtml(guidance)}</div>`,
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
    [dispatchValidation, validationMap],
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
        
        // Use fetch with retry/backoff for better network resilience
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
          3, // max retries
          30000, // 30 second timeout
        );

        // Handle non-JSON responses
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

        // Process successful response
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

  const analyzeReportContext = useCallback(
    async (reportContext: ReportContext, contextsForPayload?: ReportContext[]) => {
      const contextList = contextsForPayload ?? reportContexts;
      const currentMetadata = detectReportMetadata(reportContext.content);
      const metadataList = contextList.map((ctx) => ({
        id: ctx.id,
        type: ctx.type,
        metadata: detectReportMetadata(ctx.content),
      }));

      const hasMirrorDirective = metadataList.some((entry) => entry.metadata.hasMirrorDirective);
      const hasSymbolicWeather = metadataList.some((entry) => entry.metadata.hasSymbolicWeather);
      const hasRelationalMirror = metadataList.some((entry) => entry.metadata.isRelationalMirror);

      if (
        reportContext.type === 'mirror' &&
        currentMetadata.format === null &&
        pendingContextRequirementRef.current !== 'mirror'
      ) {
        pendingContextRequirementRef.current = 'mirror';
        setStatusMessage("Mirror upload needs the JSON export.");
        shiftSessionMode('idle');
        setSessionStarted(false);
        const prompt =
          "Looks like Rubric skipped the directive export—I only have the printable markdown. Re-run Math Brain (or grab the Mirror Directive JSON / combined Mirror + Symbolic Weather JSON) and drop that in, then I can continue the reading.";
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'raven',
            html: `<p style="margin:0; line-height:1.65;">${escapeHtml(prompt)}</p>`,
            hook: "Upload · Mirror JSON Needed",
            climate: "VOICE · Awaiting Upload",
            rawText: prompt,
            validationPoints: [],
            validationComplete: true,
          },
        ]);
        // eslint-disable-next-line no-console
        console.info('[Poetic Brain] Mirror directive upload missing JSON format', {
          contextId: reportContext.id,
          summary: reportContext.summary,
        });
        return;
      }

      if (hasRelationalMirror && !hasSymbolicWeather) {
        setStatusMessage("Waiting for the symbolic weather export…");
        if (pendingContextRequirementRef.current !== 'weather') {
          pendingContextRequirementRef.current = 'weather';
          const prompt =
            "I’m holding the relational mirror directive, but its symbolic weather companion isn’t here yet. Upload the Mirror+SymbolicWeather JSON export from Math Brain so I can begin the reading.";
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'raven',
              html: `<p style="margin:0; line-height:1.65;">${escapeHtml(prompt)}</p>`,
              hook: "Upload · Missing Weather",
              climate: "VOICE · Awaiting Upload",
              rawText: prompt,
              validationPoints: [],
              validationComplete: true,
            },
          ]);
          // eslint-disable-next-line no-console
          console.info('[Poetic Brain] Waiting for symbolic weather payload', {
            contexts: metadataList.map((entry) => ({
              id: entry.id,
              type: entry.type,
              format: entry.metadata.format,
              hasMirrorDirective: entry.metadata.hasMirrorDirective,
              hasSymbolicWeather: entry.metadata.hasSymbolicWeather,
              isRelationalMirror: entry.metadata.isRelationalMirror,
            })),
          });
        }
        return;
      }

      if (hasSymbolicWeather && !hasMirrorDirective) {
        setStatusMessage("Waiting for the mirror directive upload…");
        if (pendingContextRequirementRef.current !== 'mirror') {
          pendingContextRequirementRef.current = 'mirror';
          const prompt =
            "I received the symbolic weather export, but I still need the Mirror Directive JSON. Drop the mirror file from Math Brain so we can complete the pair.";
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'raven',
              html: `<p style="margin:0; line-height:1.65;">${escapeHtml(prompt)}</p>`,
              hook: "Upload · Missing Mirror",
              climate: "VOICE · Awaiting Upload",
              rawText: prompt,
              validationPoints: [],
              validationComplete: true,
            },
          ]);
          // eslint-disable-next-line no-console
          console.info('[Poetic Brain] Waiting for mirror directive payload', {
            contexts: metadataList.map((entry) => ({
              id: entry.id,
              type: entry.type,
              format: entry.metadata.format,
              hasMirrorDirective: entry.metadata.hasMirrorDirective,
              hasSymbolicWeather: entry.metadata.hasSymbolicWeather,
              isRelationalMirror: entry.metadata.isRelationalMirror,
            })),
          });
        }
        return;
      }

      if (pendingContextRequirementRef.current) {
        pendingContextRequirementRef.current = null;
        setStatusMessage(null);
      }

      const reportLabel = reportContext.name?.trim()
        ? `"${reportContext.name.trim()}"`
        : 'This report';

      // Set session mode to report and mark as started
      setSessionMode('report');
      setSessionStarted(true);

      // Show session start message
      const sessionStartMessage = {
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

      // Create a single placeholder for the complete mirror flow report
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
        // Let the backend auto-execution handle the full mirror flow
        // Send an empty input to trigger auto-execution based on report context
        await runRavenRequest(
          {
            input: '', // Empty input triggers auto-execution logic
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
        // Fallback to a simple message if there's an error
        const errorMessage = {
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
    [reportContexts, runRavenRequest, sessionId, shiftSessionMode],
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
        html: `<p>${escapeHtml(trimmed)}</p>`,
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
    [relocation, reportContexts, runRavenRequest, sessionId, sessionMode, shiftSessionMode],
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
    (messageId: string, response: PingResponse, note?: string) => {
      const message = messages.find((m) => m.id === messageId);
      const checkpointType = message
        ? getPingCheckpointType(message.html)
        : "general";
      const messageContent = message ? message.html : "";
      const alreadyAcknowledged = message?.pingFeedbackRecorded;

      const skipAutoProgrammatic = note === "__quick_reply__";
      const sanitizedNote = skipAutoProgrammatic ? undefined : note;

      pingTracker.recordFeedback(
        messageId,
        response,
        sanitizedNote,
        checkpointType,
        messageContent,
      );

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
    [messages, sendProgrammatic, pushRavenNarrative],
  );

  const sendCurrentInput = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    void sendMessage(text);
  }, [input, sendMessage]);

  const handleSubmit = useCallback(
    (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      sendCurrentInput();
    },
    [sendCurrentInput],
  );

  const handleUploadButton = useCallback((type: "mirror" | "balance") => {
    setUploadType(type);
    fileInputRef.current?.click();
  }, []);

  const stop = useCallback(() => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        // ignore
      }
    }
  }, []);

const performSessionReset = useCallback(() => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        // ignore
      }
    }
    shiftSessionMode('idle');
    sessionAnnouncementRef.current = null;
    sessionAnnouncementHookRef.current = undefined;
    sessionAnnouncementClimateRef.current = undefined;
    previousModeRef.current = 'idle';
    setWrapUpLoading(false);
    setShowWrapUpPanel(false);
    setWrapUpExport(null);
    setMessages([createInitialMessage()]);
    setReportContexts([]);
    setRelocation(null);
    setSessionId(null);
    setStoredPayload(null);
    setStatusMessage("Session cleared. Begin typing whenever you're ready.");
    pingTracker.sealSession(sessionId ?? undefined);
  }, [sessionId, shiftSessionMode]);

  const closeServerSession = useCallback(async (sealedSessionId?: string | null) => {
    if (!sealedSessionId) return;
    try {
      await fetch("/api/raven", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", sessionId: sealedSessionId }),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to close session on server:", error);
    }
  }, []);

  const handleWrapUpSealed = useCallback(async (sealedSessionId: string) => {
    await closeServerSession(sealedSessionId);
    performSessionReset();
    setShowWrapUpPanel(false);
  }, [closeServerSession, performSessionReset]);

  const handleStartWrapUp = useCallback(() => {
    setIsWrapUpOpen(true);
  }, []);

  const handleDismissWrapUp = useCallback(() => {
    setIsWrapUpOpen(false);
  }, []);

  const handleConfirmWrapUp = useCallback(async () => {
    setIsWrapUpOpen(false);

    if (!sessionStarted) {
      performSessionReset();
      return;
    }

    setWrapUpLoading(true);
    try {
      let exportPayload: RavenSessionExport | null = null;
      if (sessionId) {
        const response = await fetch("/api/raven", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "export", sessionId }),
        });

        if (response.ok) {
          exportPayload = await response.json();
        } else if (response.status !== 404) {
          throw new Error(`Export failed (${response.status})`);
        }
      }

      setWrapUpExport(exportPayload);
      setShowWrapUpPanel(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to prepare wrap-up:", error);
      setStatusMessage("Wrap-up export failed, clearing session instead.");
      performSessionReset();
    } finally {
      setWrapUpLoading(false);
    }
  }, [performSessionReset, sessionId, sessionStarted, setStatusMessage]);

  const handleSkipToExport = useCallback(() => {
    setIsWrapUpOpen(false);
    setShowClearMirrorExport(true);
  }, []);

  const handleGenerateClearMirrorPDF = useCallback(async () => {
    try {
      const { buildClearMirrorFromContexts } = await import('@/lib/pdf/clear-mirror-context-adapter');
      const { generateClearMirrorPDF } = await import('@/lib/pdf/clear-mirror-pdf');
      
      const clearMirrorData = buildClearMirrorFromContexts(reportContexts);
      await generateClearMirrorPDF(clearMirrorData);
      
      setStatusMessage('Clear Mirror PDF exported successfully.');
      setShowClearMirrorExport(false);
      performSessionReset();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Clear Mirror PDF export failed:', error);
      setStatusMessage('Clear Mirror export failed. Please try again.');
    }
  }, [reportContexts, setStatusMessage, performSessionReset]);

  const handleCloseClearMirrorExport = useCallback(() => {
    setShowClearMirrorExport(false);
    performSessionReset();
  }, [performSessionReset]);

  const handleRemoveReportContext = useCallback((contextId: string) => {
    setReportContexts((prev) => {
      const next = prev.filter((ctx) => ctx.id !== contextId);
      if (!next.some((ctx) => ctx.relocation)) {
        setRelocation(null);
      }
      return next;
    });
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // File size guard: 50 MB limit for PDFs, 10 MB for text files
      const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB
      const MAX_TEXT_SIZE = 10 * 1024 * 1024; // 10 MB
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const maxSize = isPdf ? MAX_PDF_SIZE : MAX_TEXT_SIZE;

      if (file.size > maxSize) {
        const sizeInMB = (maxSize / (1024 * 1024)).toFixed(0);
        setErrorMessage(`File too large. Max size: ${sizeInMB}MB. Please upload a smaller file.`);
        if (event.target) event.target.value = "";
        return;
      }

      let rawContent = "";

      if (isPdf) {
        try {
          setStatusMessage("Extracting PDF text...");
          const pdfjsLib = await import("pdfjs-dist");
          (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;

          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i += 1) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => ("str" in item ? (item as any).str : ""))
              .join(" ");
            fullText += pageText + "\n\n";
          }

          rawContent = fullText.trim();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error extracting PDF text:", error);
          setErrorMessage("Failed to extract text from that PDF.");
          if (event.target) event.target.value = "";
          return;
        }
      } else {
        try {
          setStatusMessage("Reading file...");
          rawContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(String(e.target?.result ?? ""));
            reader.onerror = () => reject(new Error("File read failure"));
            reader.readAsText(file);
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("File read error:", error);
          setErrorMessage("Failed to read that file.");
          if (event.target) event.target.value = "";
          return;
        }
      }

      if (!rawContent.trim()) {
        setErrorMessage("That file looked empty.");
        if (event.target) event.target.value = "";
        return;
      }

      const parsed = parseReportContent(rawContent, {
        uploadType,
        fileName: file.name,
      });

      const nextContexts = [
        ...reportContexts.filter((ctx) => ctx.id !== parsed.context.id),
        parsed.context,
      ];
      setReportContexts(nextContexts);
      setRelocation(parsed.relocation ?? null);

      if (parsed.isMirror) {
        setStatusMessage("Mirror context loaded.");
      } else {
        setStatusMessage("Report context added.");
      }

      await analyzeReportContext(parsed.context, nextContexts);

      if (event.target) {
        event.target.value = "";
      }
      setUploadType(null);
    },
    [analyzeReportContext, reportContexts, uploadType],
  );

  const applyStoredPayload = useCallback(
    async (record: StoredMathBrainPayload) => {
      if (!record?.payload) {
        dismissStoredPayload(record);
        return;
      }
      if (typing) {
        setStatusMessage("Hold on—analysis already in progress.");
        return;
      }

      try {
        let rawContent: string;
        if (typeof record.payload === "string") {
          rawContent = record.payload;
        } else {
          try {
            rawContent = JSON.stringify(record.payload);
          } catch {
            rawContent = String(record.payload);
          }
        }

        const parsed = parseReportContent(rawContent, {
          uploadType:
            record.reportType === "mirror"
              ? "mirror"
              : record.reportType === "balance"
                ? "balance"
                : null,
          sourceLabel: record.from || record.reportType || undefined,
          windowLabel:
            record.window?.start && record.window?.end
              ? `Window ${record.window.start} → ${record.window.end}`
              : record.window?.start
                ? `Window starting ${record.window.start}`
                : record.window?.end
                  ? `Window ending ${record.window.end}`
                  : null,
        });

        const nextContexts = [
          ...reportContexts.filter((ctx) => ctx.id !== parsed.context.id),
          parsed.context,
        ];

        const reportLabel = parsed.context.name?.trim()
          ? `“${parsed.context.name.trim()}”`
          : 'This report';
        shiftSessionMode('report', {
          message: `Structured reading resumed from Math Brain. ${reportLabel} is ready for interpretation.`,
          hook: "Session · Structured Reading",
          climate: "VOICE · Report Interpretation",
        });

        setReportContexts(nextContexts);
        setRelocation(parsed.relocation ?? null);

        acknowledgeStoredPayload(record.savedAt);
        setStoredPayload(null);
        setStatusMessage("Math Brain payload loaded.");

        await analyzeReportContext(parsed.context, nextContexts);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to apply stored payload:", error);
        setStatusMessage("Could not load the stored Math Brain report. Upload it manually.");
        dismissStoredPayload(record);
      }
    },
    [
      acknowledgeStoredPayload,
      analyzeReportContext,
      dismissStoredPayload,
      reportContexts,
      shiftSessionMode,
      typing,
    ],
  );

  const showRelocationBanner = relocation !== null;

  const canRecoverStoredPayload = hasSavedPayloadSnapshot || Boolean(storedPayload);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#05060b] via-[#0c111e] to-[#010207] text-slate-100">
      <header className="border-b border-slate-800/60 bg-slate-900/70 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Raven Calder · Poetic Brain
            </div>
            <h1 className="text-2xl font-semibold text-slate-100">{APP_NAME}</h1>
            <p className="text-sm text-slate-400">
              Raven is already listening—share what is present, or upload Math Brain and Mirror exports when you are ready for a structured reading.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-300">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <span>{STATUS_CONNECTED}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-600/60 bg-slate-800/60 px-3 py-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Persona
              </span>
              <select
                value={personaMode}
                onChange={(event) => setPersonaMode(event.target.value as PersonaMode)}
                className="bg-transparent text-sm font-medium text-slate-100 focus:outline-none"
              >
                <option value="plain" className="bg-slate-900 text-slate-100">
                  Plain · Technical
                </option>
                <option value="hybrid" className="bg-slate-900 text-slate-100">
                  Hybrid · Default
                </option>
                <option value="poetic" className="bg-slate-900 text-slate-100">
                  Poetic · Lyrical
                </option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => handleUploadButton("mirror")}
              className="rounded-lg border border-slate-600/60 bg-slate-800/60 px-4 py-2 font-medium text-slate-100 hover:border-slate-500 hover:bg-slate-800 transition"
            >
              🪞 Upload Mirror
            </button>
            <button
              type="button"
              onClick={() => handleUploadButton("balance")}
              className="rounded-lg border border-slate-600/60 bg-slate-800/60 px-4 py-2 font-medium text-slate-100 hover:border-slate-500 hover:bg-slate-800 transition"
            >
              🌡️ Upload Weather
            </button>
            {canRecoverStoredPayload && (
              <button
                type="button"
                onClick={recoverLastStoredPayload}
                className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 font-medium text-emerald-100 transition hover:bg-emerald-500/20"
              >
                ⏮️ Resume Math Brain
              </button>
            )}
            <button
              type="button"
              onClick={handleStartWrapUp}
              className="rounded-lg border border-transparent px-4 py-2 text-slate-400 hover:text-slate-200 transition"
            >
              Reset Session
            </button>
          </div>
        </div>
      </header>

      {sessionStarted && (
        <div className="border-b border-slate-800/60 bg-slate-900/60">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${sessionModeDescriptor.badgeClass}`}
              >
                {sessionModeDescriptor.label}
              </span>
              <p className="mt-2 text-xs text-slate-300 sm:max-w-xl">
                {sessionModeDescriptor.description}
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartWrapUp}
              className="inline-flex items-center justify-center rounded-md border border-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
            >
              End Session
            </button>
          </div>
        </div>
      )}

      {storedPayload && (
        <div className="border-b border-emerald-500/30 bg-emerald-500/10">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-200">
                Math Brain export is ready to hand off.
              </p>
              {storedPayloadSummary && (
                <p className="text-xs text-emerald-200/80">{storedPayloadSummary}</p>
              )}
            </div>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => void applyStoredPayload(storedPayload)}
                className="rounded-md border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 font-medium text-emerald-100 hover:bg-emerald-500/30 transition"
              >
                Load now
              </button>
              <button
                type="button"
                onClick={() => dismissStoredPayload(storedPayload)}
                className="rounded-md border border-transparent px-3 py-1 font-medium text-emerald-200 hover:text-emerald-100 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {showRelocationBanner && relocation && (
        <div className="flex h-full flex-col">
          <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800/50">
            <h1 className="text-xl font-semibold">Poetic Brain</h1>
            <a
              href="/math-brain"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center transition-colors"
              title="Return to Math Brain"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Math Brain
            </a>
          </div>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="mb-6 max-w-lg text-gray-300">
              Welcome to the Poetic Brain. I'm here to help you explore the deeper meanings and patterns in your astrological data.
            </p>
            {relocation.label && <span className="text-slate-400">• {relocation.label}</span>}
            {relocation.status && <span className="text-slate-400">• {relocation.status}</span>}
            {relocation.disclosure && (
              <span className="text-slate-500">• {relocation.disclosure}</span>
            )}
          </div>
        </div>
      )}

      {reportContexts.length > 0 && (
        <div className="border-b border-slate-800/60 bg-slate-950/70">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-6 py-3 text-xs">
            {reportContexts.map((ctx) => (
              <span
                key={ctx.id}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-slate-100"
              >
                <span>{ctx.type === "mirror" ? "🪞" : "🌡️"}</span>
                <span className="truncate font-medium">{ctx.name}</span>
                {ctx.summary && (
                  <span className="hidden text-slate-400 sm:inline">
                    · {ctx.summary}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveReportContext(ctx.id)}
                  className="text-slate-400 hover:text-slate-200"
                  aria-label={`Remove ${ctx.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="border-b border-emerald-500/30 bg-emerald-500/10 text-center text-sm text-emerald-200">
          <div className="mx-auto max-w-5xl px-6 py-3">{statusMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="border-b border-rose-500/40 bg-rose-500/10 text-center text-sm text-rose-200">
          <div className="mx-auto max-w-5xl px-6 py-3">{errorMessage}</div>
        </div>
      )}

      {!sessionStarted && !storedPayload && reportContexts.length === 0 && (
        <section className="mx-auto mt-8 w-full max-w-3xl rounded-xl border border-emerald-500/40 bg-slate-900/60 px-6 py-5 text-slate-100 shadow-lg">
          <h2 className="text-lg font-semibold text-emerald-200">Drop in whenever you&apos;re ready</h2>
          <p className="mt-3 text-sm text-slate-300">
            Raven is already listening. Begin typing below to share what&apos;s on your mind, or send a quick
            question to move straight into open dialogue.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Uploading a Math Brain export (or resuming a saved chart) automatically opens a structured
            reading. Raven will announce the shift and the banner above will always tell you which lane
            you are in. End the session any time to clear the slate.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleUploadButton("mirror")}
              className="rounded-lg border border-slate-600/60 bg-slate-800/70 px-4 py-2 text-sm text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Upload a Report
            </button>
            {canRecoverStoredPayload && (
              <button
                type="button"
                onClick={recoverLastStoredPayload}
                className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
              >
                Resume last Math Brain export
              </button>
            )}
          </div>
          <div className="flex justify-between items-center p-2 border-b border-gray-700">
            <div></div> {/* Empty div for flex spacing */}
            <h1 className="text-xl font-semibold">Poetic Brain</h1>
            <a
              href="/math-brain"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
              title="Return to Math Brain"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Math Brain
            </a>
          </div>
        </section>
      )}

      <main ref={conversationRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
          {/* Resonance Card */}
          {showResonanceCard && resonanceCard && (
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl border border-indigo-500/30 p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-indigo-200">{resonanceCard.title}</h3>
                <button 
                  onClick={() => setShowResonanceCard(false)}
                  className="text-indigo-400 hover:text-indigo-200"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-indigo-900/30 p-4 rounded-lg">
                  <p className="text-indigo-100 italic">"{resonanceCard.resonantLine}"</p>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="px-3 py-1 bg-indigo-800/50 rounded-full text-indigo-200">
                    {resonanceCard.scoreIndicator}
                  </span>
                  <span className={`px-3 py-1 rounded-full ${
                    resonanceCard.resonanceFidelity.band === 'HIGH' 
                      ? 'bg-green-900/50 text-green-200' 
                      : resonanceCard.resonanceFidelity.band === 'MIXED'
                      ? 'bg-amber-900/50 text-amber-200'
                      : 'bg-rose-900/50 text-rose-200'
                  }`}>
                    {resonanceCard.resonanceFidelity.percentage}% {resonanceCard.resonanceFidelity.label}
                  </span>
                </div>
                <div className="text-indigo-100 text-sm">
                  <p className="font-medium">Pattern:</p>
                  <p>{resonanceCard.compositeGuess}</p>
                </div>
                {resonanceCard.driftFlag && (
                  <div className="text-amber-400 text-sm flex items-center">
                    <span className="mr-2">⚠️</span>
                    <span>{resonanceCard.driftFlag}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contextual Suggestions */}
          {contextualSuggestions.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {contextualSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInput(suggestion);
                      setContextualSuggestions([]);
                      handleSubmit();
                    }}
                    className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-full text-sm text-slate-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => {
            const isRaven = msg.role === "raven";
            const showCopyButton = isRaven && Boolean(msg.rawText && msg.rawText.trim());
            const validationPoints =
              validationMap[msg.id] ??
              msg.validationPoints ??
              [];
            const hasValidation = validationPoints.length > 0;
            const validationPending = hasValidation && hasPendingValidations(validationPoints);
            const validationStats = hasValidation ? getValidationStats(validationPoints) : null;
            const validationSummaryText = hasValidation
              ? validationPending
                ? `Resonance check in progress: ${validationStats?.completed ?? 0} of ${
                    validationStats?.total ?? validationPoints.length
                  } reflections tagged.`
                : formatValidationSummary(validationPoints)
              : null;

            return (
              <div
                key={msg.id}
                className={`flex ${isRaven ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-full rounded-2xl border px-5 py-4 shadow-lg transition ${
                    isRaven
                      ? "bg-slate-900/70 border-slate-800/70 text-slate-100"
                      : "bg-slate-800/80 border-slate-700/60 text-slate-100"
                  }`}
                  style={{ width: "100%" }}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span className="font-semibold text-slate-200">
                      {isRaven ? "Raven" : "You"}
                    </span>
                    {msg.climate && <span className="text-slate-400/80">{msg.climate}</span>}
                    {msg.hook && <span className="text-slate-400/60">{msg.hook}</span>}
                  </div>
                  <div className={showCopyButton ? "flex items-start gap-3" : undefined}>
                    <div
                      className={`${showCopyButton ? "flex-1" : ""} space-y-3 text-[15px] leading-relaxed text-slate-100`}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.html) }}
                    />
                    {showCopyButton && (
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.rawText ?? "")}
                        className="shrink-0 rounded-md border border-slate-700/60 bg-slate-800/70 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                      >
                        {copiedMessageId === msg.id ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                  {isRaven && msg.probe && !msg.pingFeedbackRecorded && (
                    <div className="mt-4">
                      <MirrorResponseActions
                        messageId={msg.id}
                        onFeedback={handlePingFeedback}
                        checkpointType={getPingCheckpointType(msg.html)}
                      />
                    </div>
                  )}
                  {isRaven && hasValidation && (
                    <div className="mt-4 space-y-3">
                      {validationSummaryText && (
                        <p
                          className={`rounded-md border px-3 py-2 text-xs ${
                            validationPending
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          }`}
                        >
                          {validationSummaryText}
                        </p>
                      )}
                      <GranularValidation
                        messageId={msg.id}
                        validationPoints={validationPoints}
                        onComplete={(points) => handleValidationUpdate(msg.id, points)}
                        onNoteChange={(pointId, note) =>
                          handleValidationNoteChange(msg.id, pointId, note)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="flex justify-start">
              <div className="max-w-full rounded-2xl border border-slate-800/70 bg-slate-900/60 px-5 py-4 text-sm text-slate-300 shadow-lg">
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Raven
                </div>
                <div className="flex items-center gap-3">
                  <span className="animate-pulse text-slate-300">Composing…</span>
                  <button
                    type="button"
                    onClick={stop}
                    className="rounded-md border border-slate-600/60 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 transition"
                  >
                    Stop
                  </button>
                </div>
              </div>
            </div>
          )}
          {messages.length === 0 && !typing && (
            <div className="space-y-6 py-12">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-slate-100 mb-2">Start the Symbolic Reading</h2>
                <p className="text-slate-400 mb-6">Share what's moving, or choose a direction below</p>
                <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setInput("Begin with a symbolic weather report");
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-200 text-sm hover:border-slate-500 hover:bg-slate-800/80 transition"
                  >
                    📊 Start with symbolic weather
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInput("Read my natal mirror");
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-200 text-sm hover:border-slate-500 hover:bg-slate-800/80 transition"
                  >
                    🪞 Explore my natal pattern
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInput("What patterns do you see in this data?");
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-200 text-sm hover:border-slate-500 hover:bg-slate-800/80 transition"
                  >
                    💬 Ask a question
                  </button>
                </div>
              </div>
              <div className="text-center text-xs text-slate-500">
                Or paste your Mirror + Symbolic Weather JSON using the upload buttons below
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-800/70 bg-slate-950/80">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-6"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={INPUT_PLACEHOLDER}
            rows={3}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.ctrlKey &&
                !event.altKey &&
                !event.metaKey
              ) {
                event.preventDefault();
                sendCurrentInput();
              }
            }}
            className="w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-400 focus:ring-0"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 text-sm">
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="rounded-lg border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
              <button
                type="button"
                onClick={() => handleUploadButton("mirror")}
                className="rounded-lg border border-slate-600/60 bg-slate-800/70 px-3 py-2 text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
              >
                🪞 Mirror
              </button>
              <button
                type="button"
                onClick={() => handleUploadButton("balance")}
                className="rounded-lg border border-slate-600/60 bg-slate-800/70 px-3 py-2 text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
              >
                🌡️ Weather
              </button>
              {typing && (
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-lg border border-slate-600/60 bg-slate-900/70 px-3 py-2 text-slate-200 transition hover:bg-slate-800"
                >
                  Stop
                </button>
              )}
            </div>
            <div className="text-xs text-slate-500">
              Upload Math Brain exports, Mirror JSON, or AstroSeek charts to give Raven geometry.
            </div>
          </div>
        </form>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
          accept=".txt,.md,.json,.pdf"
        />
      </footer>
      <SessionWrapUpModal
        open={isWrapUpOpen}
        sessionId={sessionId}
        onDismiss={handleDismissWrapUp}
        onConfirmEnd={handleConfirmWrapUp}
        onSkipToExport={reportContexts.length > 0 ? handleSkipToExport : undefined}
      />
      {wrapUpLoading && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70">
          <div className="rounded-lg border border-slate-700/70 bg-slate-900 px-6 py-4 text-sm text-slate-200 shadow-xl">
            Preparing wrap-up summary…
          </div>
        </div>
      )}
      {showWrapUpPanel && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 px-4 py-6">
          <div className="w-full max-w-4xl">
            <WrapUpCard
              sessionId={sessionId ?? undefined}
              exportData={wrapUpExport ?? undefined}
              onClose={() => {
                setShowWrapUpPanel(false);
              }}
              onSealed={(sealedSessionId) => {
                void handleWrapUpSealed(sealedSessionId);
              }}
              onExportClearMirror={reportContexts.length > 0 ? () => {
                setShowWrapUpPanel(false);
                setShowClearMirrorExport(true);
              } : undefined}
            />
          </div>
        </div>
      )}
      {showClearMirrorExport && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 px-4 py-6">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
                  Clear Mirror Export
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-100">
                  Generate Clear Mirror PDF
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {reportContexts.length === 2
                    ? `Relational mirror for ${reportContexts[0]?.name || 'Person A'} and ${reportContexts[1]?.name || 'Person B'}`
                    : `Solo mirror for ${reportContexts[0]?.name || 'Unknown'}`}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Clear Mirror export"
                className="text-slate-500 transition hover:text-slate-300"
                onClick={handleCloseClearMirrorExport}
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-6 text-sm text-slate-300">
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3">
                <p className="font-semibold text-slate-100">This export includes:</p>
                <ul className="mt-2 space-y-1 text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="mt-[3px] text-emerald-300">•</span>
                    <span>E-Prime formatted narrative (no "is/am/are" constructions)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-[3px] text-emerald-300">•</span>
                    <span>Core Insights with symbolic geometry footnotes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-[3px] text-emerald-300">•</span>
                    <span>Polarity Cards highlighting tension patterns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-[3px] text-emerald-300">•</span>
                    <span>Mirror Voice reflection and Socratic closure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-[3px] text-emerald-300">•</span>
                    <span>Developer audit layer (collapsible tables)</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-blue-800/50 bg-blue-950/30 px-4 py-3">
                <p className="text-sm text-blue-200">
                  <strong>Note:</strong> This is a template-based export. Full Raven Calder
                  language generation will be integrated in a future update.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-800 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseClearMirrorExport}
                className="inline-flex items-center justify-center rounded-md border border-slate-700/80 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateClearMirrorPDF}
                className="inline-flex items-center justify-center rounded-md border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
