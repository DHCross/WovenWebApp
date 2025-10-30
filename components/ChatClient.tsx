"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { generateId } from "../lib/id";
import { formatFullClimateDisplay, type ClimateData } from "../lib/climate-renderer";
import { summarizeRelocation, type RelocationSummary } from "../lib/relocation";
import PingFeedback, { type PingResponse } from "./PingFeedback";
import { pingTracker } from "../lib/ping-tracker";
import {
  APP_NAME,
  STATUS_CONNECTED,
  INPUT_PLACEHOLDER,
} from "../lib/ui-strings";
import type { Intent } from "../lib/raven/intent";
import type { SSTProbe } from "../lib/raven/sst";

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
}

interface ReportContext {
  id: string;
  type: "mirror" | "balance";
  name: string;
  summary: string;
  content: string;
  relocation?: RelocationSummary;
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

interface ParseOptions {
  uploadType?: "mirror" | "balance" | null;
  fileName?: string;
  sourceLabel?: string;
  windowLabel?: string | null;
}

interface ParsedReportContent {
  context: ReportContext;
  relocation: RelocationSummary | null;
  isMirror: boolean;
}

const MB_LAST_PAYLOAD_KEY = "mb.lastPayload";
const MB_LAST_PAYLOAD_ACK_KEY = "mb.lastPayloadAck";

const MIRROR_SECTION_ORDER: Array<{ key: string; label: string }> = [
  { key: "picture", label: "Picture" },
  { key: "feeling", label: "Feeling" },
  { key: "container", label: "Container" },
  { key: "option", label: "Option" },
  { key: "next_step", label: "Next Step" },
];

const escapeHtml = (input: string): string =>
  input.replace(/[&<>]/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
    };
    return map[char] ?? char;
  });

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
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  });
};

const ensureSentence = (value: string | undefined | null): string => {
  if (!value) return "";
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const formatAppendixHighlights = (
  appendix?: Record<string, any>,
): string[] => {
  if (!appendix || typeof appendix !== "object") return [];

  const highlights: string[] = [];
  const metrics: string[] = [];

  const magnitude =
    typeof appendix.magnitude === "number"
      ? appendix.magnitude
      : typeof appendix.magnitude === "string"
        ? Number(appendix.magnitude)
        : undefined;

  if (typeof magnitude === "number" && Number.isFinite(magnitude)) {
    const label =
      typeof appendix.magnitude_label === "string"
        ? ` (${appendix.magnitude_label})`
        : "";
    metrics.push(`magnitude ${magnitude.toFixed(2)}${label}`);
  }

  const directional =
    typeof appendix.directional_bias === "number"
      ? appendix.directional_bias
      : typeof appendix.valence === "number"
        ? appendix.valence
        : undefined;

  if (typeof directional === "number" && Number.isFinite(directional)) {
    const label =
      typeof appendix.directional_bias_label === "string"
        ? ` (${appendix.directional_bias_label})`
        : "";
    metrics.push(
      `directional bias ${directional >= 0 ? "+" : ""}${directional.toFixed(2)}${label}`,
    );
  }

  const coherence =
    typeof appendix.coherence === "number"
      ? appendix.coherence
      : typeof appendix.volatility === "number"
        ? appendix.volatility
        : undefined;

  if (typeof coherence === "number" && Number.isFinite(coherence)) {
    const label =
      typeof appendix.coherence_label === "string"
        ? ` (${appendix.coherence_label})`
        : "";
    metrics.push(`coherence ${coherence.toFixed(2)}${label}`);
  }

  if (metrics.length) {
    highlights.push(`Key signals: ${metrics.join(", ")}.`);
  }

  if (Array.isArray(appendix.hooks) && appendix.hooks.length) {
    highlights.push(
      `Hooks waiting for exploration: ${appendix.hooks.slice(0, 3).join(" · ")}.`,
    );
  }

  const windowStart = appendix.period_start;
  const windowEnd = appendix.period_end;
  if (windowStart && windowEnd) {
    highlights.push(`Window secured: ${windowStart} to ${windowEnd}.`);
  } else if (windowStart) {
    highlights.push(`Window opens ${windowStart}.`);
  }

  if (appendix.relationship_scope_label) {
    const description =
      typeof appendix.relationship_scope_description === "string"
        ? ` — ${appendix.relationship_scope_description}`
        : "";
    highlights.push(
      `Relational frame: ${appendix.relationship_scope_label}${description}.`,
    );
  }

  if (appendix.relationship_role) {
    highlights.push(`Role noted: ${appendix.relationship_role}.`);
  }

  if (appendix.contact_state) {
    highlights.push(`Contact state: ${appendix.contact_state}.`);
  }

  const intimacy =
    appendix.intimacy_tier_label ?? appendix.intimacy_tier ?? undefined;
  if (intimacy) {
    highlights.push(`Intimacy tier registered as ${intimacy}.`);
  }

  if (appendix.relationship_notes) {
    highlights.push(`Notes captured: ${appendix.relationship_notes}.`);
  }

  return highlights;
};

const buildNarrativeDraft = (
  draft?: Record<string, any> | null,
  prov?: Record<string, any> | null,
): string => {
  if (!draft || typeof draft !== "object") {
    return `<p style="margin:0; line-height:1.6;">${escapeHtml(
      "I'm here whenever you're ready to upload a chart or ask for a translation.",
    )}</p>`;
  }

  const picture = ensureSentence(
    typeof draft.picture === "string" ? draft.picture : undefined,
  );
  const feeling = ensureSentence(
    typeof draft.feeling === "string" ? draft.feeling : undefined,
  );
  const container = ensureSentence(
    typeof draft.container === "string" ? draft.container : undefined,
  );
  const option = ensureSentence(
    typeof draft.option === "string" ? draft.option : undefined,
  );
  const nextStep = ensureSentence(
    typeof draft.next_step === "string" ? draft.next_step : undefined,
  );

  const appendix =
    typeof draft.appendix === "object" && draft.appendix ? draft.appendix : undefined;
  const highlightSentences = formatAppendixHighlights(
    appendix as Record<string, any> | undefined,
  );

  const paragraphs: string[] = [];
  const intro = [picture, feeling].filter(Boolean).join(" ");
  if (intro) paragraphs.push(intro);

  const context = [container, ...highlightSentences].filter(Boolean).join(" ");
  if (context) paragraphs.push(context);

  const invitation = [option, nextStep].filter(Boolean).join(" ");
  if (invitation) paragraphs.push(invitation);

  if (!paragraphs.length) {
    paragraphs.push(
      "I've logged this report and set it aside for interpretation. Let me know when you'd like me to mirror a pattern.",
    );
  }

  const provenance =
    prov?.source && typeof prov.source === "string"
      ? `<div style="margin-top:12px; font-size:11px; color:#94a3b8;">Source · ${escapeHtml(
          prov.source,
        )}</div>`
      : "";

  const htmlParagraphs = paragraphs
    .map(
      (text) =>
        `<p style="margin:0 0 12px 0; line-height:1.65;">${escapeHtml(text)}</p>`,
    )
    .join("");

  return `
    <section class="mirror-draft narrative" style="display:flex; flex-direction:column;">
      ${htmlParagraphs}
      ${provenance}
    </section>
  `;
};

const formatFriendlyErrorMessage = (rawMessage: string): string => {
  const text = rawMessage.trim();
  if (!text) {
    return "I reached for the mirror but nothing answered. Try again in a moment.";
  }
  if (/cancel/i.test(text)) {
    return "The channel was closed before I could finish. Ask again whenever you're ready.";
  }
  if (/no mirror returned/i.test(text)) {
    return "I reached for the mirror but it stayed silent. Upload a report or ask again so I can keep listening.";
  }
  if (/failed to reach raven api/i.test(text) || /request failed/i.test(text)) {
    return "I'm having trouble reaching my poetic voice right now. Give me a moment and try again, or upload another chart for me to hold.";
  }
  if (/401/.test(text) || /auth/i.test(text)) {
    return "I couldn't authenticate with the Perplexity wellspring. Double-check the key, then invite me again.";
  }
  return `I'm having trouble responding: ${text}`;
};

function formatShareableDraft(
  draft?: Record<string, any> | null,
  prov?: Record<string, any> | null,
): string {
  if (!draft) return "<i>No mirror draft returned.</i>";

  const conversationText =
    typeof draft.conversation === "string" ? draft.conversation.trim() : "";
  if (conversationText) {
    const paragraphs = conversationText
      .split(/\n{2,}/)
      .map(
        (block) =>
          `<p style="margin:0; line-height:1.6;">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`,
      )
      .join('<div style="height:0.75rem;"></div>');
    const provenance = prov?.source
      ? `<div class="mirror-provenance" style="margin-top:12px; font-size:11px; color:#94a3b8;">Source · ${escapeHtml(String(prov.source))}</div>`
      : "";
    return `
      <section class="mirror-draft conversation" style="display:flex; flex-direction:column; gap:12px;">
        ${paragraphs || `<p style="margin:0; line-height:1.6;">${escapeHtml(conversationText)}</p>`}
        ${provenance}
      </section>
    `;
  }

  return buildNarrativeDraft(draft, prov);
}

function formatIntentHook(
  intent?: Intent,
  prov?: Record<string, any> | null,
): string | undefined {
  if (!intent) return prov?.source ? `Source · ${prov.source}` : undefined;
  const lane =
    intent === "geometry"
      ? "Geometry"
      : intent === "report"
        ? "Report"
        : "Conversation";
  const source = prov?.source ? ` · ${prov.source}` : "";
  return `Lane · ${lane}${source}`;
}

function formatClimate(
  climate?: string | ClimateData | null,
): string | undefined {
  if (!climate) return undefined;
  if (typeof climate === "string") return climate;
  try {
    return formatFullClimateDisplay(climate);
  } catch {
    return undefined;
  }
}

function containsRepairValidation(text: string): boolean {
  const repairValidationPatterns = [
    /does this repair feel true/i,
    /is this a more accurate description/i,
    /is that a more accurate description/i,
    /does this feel more accurate/i,
    /is this closer to your experience/i,
    /does this better capture/i,
    /does this sound closer/i,
    /probe missed.*describing/i,
    /that missed.*you're actually/i,
    /i'm logging that probe as osr/i,
  ];

  return repairValidationPatterns.some((pattern) => pattern.test(text));
}

function containsInitialProbe(text: string): boolean {
  const probePatterns = [
    /does any of this feel familiar/i,
    /did this land/i,
    /does this fit your experience/i,
    /feel true to you/i,
    /does this resonate/i,
    /ring true/i,
    /sound right/i,
    /feel accurate/i,
  ];

  if (containsRepairValidation(text)) {
    return false;
  }

  return probePatterns.some((pattern) => pattern.test(text));
}

function getPingCheckpointType(
  text: string,
): "hook" | "vector" | "aspect" | "repair" | "general" {
  if (containsRepairValidation(text)) return "repair";
  if (/hook stack|paradox.*tags|rock.*spark/i.test(text)) return "hook";
  if (/hidden push|counterweight|vector signature/i.test(text)) return "vector";
  if (/mars.*saturn|personal.*outer|hard aspect/i.test(text)) return "aspect";
  return "general";
}

const mapRelocationToPayload = (
  summary: RelocationSummary | null | undefined,
): Record<string, any> | undefined => {
  if (!summary) return undefined;
  return {
    active: summary.active,
    mode: summary.mode,
    scope: summary.scope,
    label: summary.label,
    status: summary.status,
    disclosure: summary.disclosure,
    invariants: summary.invariants,
    confidence: summary.confidence,
    coordinates: summary.coordinates,
    houseSystem: summary.houseSystem,
    zodiacType: summary.zodiacType,
    engineVersions: summary.engineVersions,
    house_system: summary.houseSystem ?? null,
    zodiac_type: summary.zodiacType ?? null,
    engine_versions: summary.engineVersions ?? null,
    provenance: summary.provenance,
  };
};

const coerceNumericValue = (value: any): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object") return undefined;
  if (typeof value.value === "number" && Number.isFinite(value.value)) return value.value;
  if (typeof value.mean === "number" && Number.isFinite(value.mean)) return value.mean;
  if (typeof value.score === "number" && Number.isFinite(value.score)) return value.score;
  if (typeof value.raw === "number" && Number.isFinite(value.raw)) return value.raw;
  return undefined;
};

interface BalanceMeterSummary {
  magnitude?: number;
  magnitudeLabel?: string;
  directionalBias?: number;
  directionalBiasLabel?: string;
  directionalBiasEmoji?: string;
}

const extractBalanceMeterSummary = (balanceMeter: any): BalanceMeterSummary | null => {
  if (!balanceMeter || typeof balanceMeter !== "object") return null;
  const canonical = balanceMeter.channel_summary_canonical;
  const axes =
    canonical?.axes ??
    balanceMeter.axes ??
    null;
  const labels =
    canonical?.labels ??
    balanceMeter.labels ??
    null;

  const magnitudeAxis =
    axes?.magnitude ??
    balanceMeter.magnitude ??
    balanceMeter.magnitude_axis ??
    balanceMeter.magnitude_summary;

  const directionalAxis =
    axes?.directional_bias ??
    balanceMeter.directional_bias ??
    balanceMeter.bias_signed ??
    balanceMeter.valence ??
    balanceMeter.valence_bounded;

  const magnitude = coerceNumericValue(magnitudeAxis ?? balanceMeter.magnitude_value);
  const directionalBias = coerceNumericValue(directionalAxis ?? balanceMeter.bias_signed);

  const magnitudeLabel =
    labels?.magnitude ??
    balanceMeter.magnitude_label ??
    balanceMeter.magnitude?.label ??
    balanceMeter.magnitude?.term ??
    undefined;

  const directionalBiasLabel =
    labels?.directional_bias ??
    balanceMeter.directional_bias_label ??
    balanceMeter.directional_bias?.label ??
    balanceMeter.directional_bias?.term ??
    balanceMeter.valence_label ??
    undefined;

  const directionalBiasEmoji =
    labels?.directional_bias_emoji ??
    balanceMeter.directional_bias_emoji ??
    undefined;

  if (
    magnitude === undefined &&
    directionalBias === undefined &&
    !magnitudeLabel &&
    !directionalBiasLabel
  ) {
    return null;
  }

  return {
    magnitude,
    magnitudeLabel,
    directionalBias,
    directionalBiasLabel,
    directionalBiasEmoji,
  };
};

const formatBalanceMeterSummaryLine = (summary: BalanceMeterSummary | null): string | null => {
  if (!summary) return null;
  const parts: string[] = [];
  if (typeof summary.magnitude === "number") {
    const magPart = summary.magnitudeLabel
      ? `Magnitude ${summary.magnitude.toFixed(1)} (${summary.magnitudeLabel})`
      : `Magnitude ${summary.magnitude.toFixed(1)}`;
    parts.push(magPart);
  }
  if (typeof summary.directionalBias === "number") {
    const biasValue =
      summary.directionalBias > 0
        ? `+${summary.directionalBias.toFixed(1)}`
        : summary.directionalBias.toFixed(1);
    const label = summary.directionalBiasLabel ? ` (${summary.directionalBiasLabel})` : "";
    const emoji = summary.directionalBiasEmoji ? `${summary.directionalBiasEmoji} ` : "";
    parts.push(`${emoji}Directional Bias ${biasValue}${label}`);
  } else if (summary.directionalBiasLabel) {
    const emoji = summary.directionalBiasEmoji ? `${summary.directionalBiasEmoji} ` : "";
    parts.push(`${emoji}${summary.directionalBiasLabel}`);
  }
  return parts.length ? parts.join(" · ") : null;
};

const parseReportContent = (rawContent: string, opts: ParseOptions = {}): ParsedReportContent => {
  let inferredType: "mirror" | "balance" | null = null;
  let relocationSummary: RelocationSummary | null = null;
  const summaryParts: string[] = [];
  const baseLabel = opts.sourceLabel?.trim() || opts.fileName?.trim() || "Uploaded report";
  let displayLabel = baseLabel || "Uploaded report";

  try {
    const jsonData = JSON.parse(rawContent);
    if (jsonData && typeof jsonData === "object") {
      if (jsonData._format === "mirror_directive_json") {
        inferredType = "mirror";
        const personName =
          jsonData?.person_a?.name ||
          jsonData?.person_a?.details?.name;
        displayLabel = personName ? `Mirror Directive for ${personName}` : "Mirror Directive";
        summaryParts.push("Mirror Directive JSON");
      } else if (jsonData.context && jsonData.balance_meter) {
        const context = jsonData.context;
        const subject = context?.natal?.name || "Unknown";
        displayLabel = `JSON Report for ${subject}`;
        const summaryLine = formatBalanceMeterSummaryLine(
          extractBalanceMeterSummary(jsonData.balance_meter),
        );
        if (summaryLine) summaryParts.push(summaryLine);

        try {
          const trans = context?.translocation || {};
          const provenance = jsonData.provenance || context?.provenance || null;
          relocationSummary = summarizeRelocation({
            type: jsonData.type || context?.type || "balance",
            natal:
              context?.natal || {
                name: subject,
                birth_date: context?.natal?.birth_date || "",
                birth_time: context?.natal?.birth_time || "",
                birth_place: context?.natal?.birth_place || "",
                timezone: context?.natal?.timezone || null,
              },
            translocation: {
              applies: Boolean(trans?.applies ?? provenance?.relocation_mode),
              method: trans?.method || trans?.mode,
              mode: trans?.mode,
              current_location: trans?.current_location || trans?.label,
              label: trans?.label,
              house_system: trans?.house_system,
              tz: trans?.tz,
              timezone: trans?.timezone,
              coords: trans?.coords || null,
              coordinates: trans?.coordinates || null,
              zodiac_type: trans?.zodiac_type,
            },
            provenance,
            relocation_mode: provenance?.relocation_mode || trans?.mode || null,
            relocation_label: provenance?.relocation_label || trans?.label || null,
          } as any);
        } catch {
          relocationSummary = null;
        }

        const windowStart = context?.window?.start || context?.window_start;
        const windowEnd = context?.window?.end || context?.window_end;
        if (windowStart && windowEnd) {
          summaryParts.push(`Window ${windowStart} → ${windowEnd}`);
        } else if (windowStart) {
          summaryParts.push(`Window starting ${windowStart}`);
        } else if (windowEnd) {
          summaryParts.push(`Window ending ${windowEnd}`);
        }

        if (
          jsonData.reports?.templates?.solo_mirror ||
          /solo mirror/i.test(rawContent)
        ) {
          inferredType = "mirror";
        } else {
          inferredType = "balance";
        }
      } else if (jsonData.reports?.templates?.solo_mirror) {
        inferredType = "mirror";
      }
    }
  } catch {
    // non-JSON input
  }

  if (opts.windowLabel) {
    summaryParts.push(opts.windowLabel);
  }
  if (relocationSummary?.disclosure) {
    summaryParts.push(relocationSummary.disclosure);
  }
  if (relocationSummary?.status) {
    summaryParts.push(relocationSummary.status);
  }

  const resolvedType = (opts.uploadType || inferredType || "balance") as "mirror" | "balance";
  const summary = Array.from(
    new Set([displayLabel, ...summaryParts].filter(Boolean)),
  );

  const context: ReportContext = {
    id: generateId(),
    type: resolvedType,
    name:
      displayLabel.split("|")[0]?.trim() ||
      (resolvedType === "mirror" ? "Mirror Report" : "Balance Report"),
    summary: summary.join(" • "),
    content: rawContent,
    relocation: relocationSummary || undefined,
  };

  return { context, relocation: relocationSummary, isMirror: resolvedType === "mirror" };
};

const createInitialMessage = (): Message => ({
  id: generateId(),
  role: "raven",
  html: `I’m a clean mirror. I put what you share next to the pattern I see and speak it back in plain language. No fate talk, no certainty—just useful reflections you can test.`,
  climate: formatFullClimateDisplay({ magnitude: 1, valence: 2, volatility: 0 }),
  hook: "Atmosphere · Creator ∠ Mirror",
});

export default function ChatClient() {
  const [messages, setMessages] = useState<Message[]>(() => [createInitialMessage()]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reportContexts, setReportContexts] = useState<ReportContext[]>([]);
  const [uploadType, setUploadType] = useState<"mirror" | "balance" | null>(null);
  const [relocation, setRelocation] = useState<RelocationSummary | null>(null);
  const [storedPayload, setStoredPayload] = useState<StoredMathBrainPayload | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const conversationRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = conversationRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MB_LAST_PAYLOAD_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredMathBrainPayload | null;
      if (!parsed || !parsed.payload) return;
      const savedAt =
        typeof parsed.savedAt === "string" && parsed.savedAt
          ? parsed.savedAt
          : new Date().toISOString();
      const ack = window.localStorage.getItem(MB_LAST_PAYLOAD_ACK_KEY);
      if (ack && ack === savedAt) return;
      setStoredPayload({ ...parsed, savedAt });
    } catch {
      // ignore storage issues
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
  }, [messages]);

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

  const commitError = useCallback((ravenId: string, message: string) => {
    const friendly = formatFriendlyErrorMessage(message);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === ravenId
          ? {
              ...msg,
              html: `<div class="raven-error" style="font-size:14px; line-height:1.6; color:#fca5a5;">
                <strong style="font-weight:600;">Raven:</strong>
                <span style="margin-left:6px;">${escapeHtml(friendly)}</span>
              </div>`,
              climate: undefined,
              hook: undefined,
            }
          : msg,
      ),
    );
  }, []);

  const applyRavenResponse = useCallback(
    (ravenId: string, response: RavenDraftResponse, fallbackMessage: string) => {
      const guidance =
        typeof response?.guidance === "string" ? response.guidance.trim() : "";
      const html = response?.draft
        ? formatShareableDraft(response.draft, response.prov ?? null)
        : guidance
          ? `<div class="raven-guard" style="font-size:13px; line-height:1.5; color:#94a3b8; white-space:pre-line;">${escapeHtml(guidance)}</div>`
          : `<p>${escapeHtml(fallbackMessage)}</p>`;
      const climateDisplay = formatClimate(response?.climate ?? undefined);
      const hook = formatIntentHook(response?.intent, response?.prov ?? null);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === ravenId
            ? {
                ...msg,
                html,
                climate: climateDisplay ?? msg.climate,
                hook: hook ?? msg.hook,
                intent: response.intent ?? msg.intent,
                probe: response.probe ?? msg.probe ?? null,
                prov: response.prov ?? msg.prov ?? null,
              }
            : msg,
        ),
      );

      if (response?.sessionId) {
        setSessionId(response.sessionId);
      }
    },
    [],
  );

  const runRavenRequest = useCallback(
    async (
      payload: Record<string, any>,
      placeholderId: string,
      fallbackMessage: string,
    ) => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setTyping(true);
      try {
        const res = await fetch("/api/raven", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        const data: RavenDraftResponse = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          const fallback =
            typeof data?.error === "string"
              ? data.error
              : `Request failed (${res.status})`;
          commitError(placeholderId, fallback);
          return;
        }
        applyRavenResponse(placeholderId, data, fallbackMessage);
      } catch (error: any) {
        if (error?.name === "AbortError") {
          commitError(placeholderId, "Request cancelled.");
        } else {
          // eslint-disable-next-line no-console
          console.error("Raven request failed:", error);
          commitError(placeholderId, "Error: Failed to reach Raven API.");
        }
      } finally {
        setTyping(false);
        abortRef.current = null;
      }
    },
    [applyRavenResponse, commitError],
  );

  const analyzeReportContext = useCallback(
    async (reportContext: ReportContext, contextsForPayload?: ReportContext[]) => {
      const contextList = contextsForPayload ?? reportContexts;
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
      };
      setMessages((prev) => [...prev, placeholder]);

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

      await runRavenRequest(
        {
          input: reportContext.content,
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
        placeholderId,
        "No mirror returned for this report.",
      );
    },
    [reportContexts, runRavenRequest, sessionId],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {
          // ignore abort errors
        }
      }

      const userId = generateId();
      const placeholderId = generateId();
      const userMessage: Message = {
        id: userId,
        role: "user",
        html: `<p>${escapeHtml(trimmed)}</p>`,
      };
      const placeholder: Message = {
        id: placeholderId,
        role: "raven",
        html: "",
        climate: "",
        hook: "",
        intent: undefined,
        probe: null,
        prov: null,
      };

      setMessages((prev) => [...prev, userMessage, placeholder]);

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
    [relocation, reportContexts, runRavenRequest, sessionId],
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

      pingTracker.recordFeedback(
        messageId,
        response,
        note,
        checkpointType,
        messageContent,
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, pingFeedbackRecorded: true } : msg,
        ),
      );

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
      if (note) {
        followUpParts.push(note);
      }

      if (followUpParts.length > 0) {
        window.setTimeout(() => {
          void sendProgrammatic(followUpParts.join(". "));
        }, 400);
      }
    },
    [messages, sendProgrammatic],
  );

  const sendCurrentInput = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    void sendMessage(text);
  }, [input, sendMessage]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
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

  const handleReset = useCallback(() => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        // ignore
      }
    }
    setMessages([createInitialMessage()]);
    setReportContexts([]);
    setRelocation(null);
    setSessionId(null);
    pingTracker.sealSession(sessionId ?? undefined);
  }, [sessionId]);

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

      let rawContent = "";

      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        try {
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
      typing,
    ],
  );

  const showRelocationBanner = relocation !== null;

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
              Upload Math Brain or Mirror exports, then ask Raven to reflect what resonates.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-300">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <span>{STATUS_CONNECTED}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
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
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-transparent px-4 py-2 text-slate-400 hover:text-slate-200 transition"
            >
              Start New Session
            </button>
          </div>
        </div>
      </header>

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
        <div className="border-b border-slate-800/60 bg-slate-900/60">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-6 py-3 text-xs text-slate-300">
            <span className="font-semibold text-emerald-300">
              {relocation.active ? "Relocation active" : "Relocation context"}
            </span>
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

      <main ref={conversationRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
          {messages.map((msg) => {
            const isRaven = msg.role === "raven";
            return (
              <div key={msg.id} className={`flex ${isRaven ? "justify-start" : "justify-end"}`}>
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
                  <div
                    className="space-y-3 text-[15px] leading-relaxed text-slate-100"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.html) }}
                  />
                  {isRaven && msg.probe && !msg.pingFeedbackRecorded && (
                    <div className="mt-4">
                      <PingFeedback messageId={msg.id} onFeedback={handlePingFeedback} />
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
            <p className="text-center text-sm text-slate-400">
              Upload a report or ask Raven a question to begin.
            </p>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-800/70 bg-slate-950/80">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-6"
        >
          <textarea
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
    </div>
  );
}
