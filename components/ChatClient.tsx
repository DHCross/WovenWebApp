"use client";

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { generateId } from "../lib/id";
import { formatFullClimateDisplay, type ClimateData } from "../lib/climate-renderer";
import { summarizeRelocation, type RelocationSummary } from "../lib/relocation";
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

const RESONANCE_MARKERS = [
  "FIELD:",
  "MAP:",
  "VOICE:",
  "WB ·",
  "ABE ·",
  "OSR ·",
  "Resonance Ledger",
  "VALIDATION:",
];

function containsResonanceMarkers(text: string | undefined | null): boolean {
  if (!text) return false;
  return RESONANCE_MARKERS.some((marker) => text.includes(marker));
}

const MIRROR_SECTION_ORDER: Array<{ key: string; label: string }> = [
  { key: "picture", label: "Picture" },
  { key: "feeling", label: "Feeling" },
  { key: "container", label: "Container" },
  { key: "option", label: "Option" },
  { key: "next_step", label: "Next Step" },
];

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
      "button",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style", "data-action"],
    ALLOW_DATA_ATTR: true,
    KEEP_CONTENT: true,
  });
};

const removeCitationAnnotations = (text: string): string => {
  return text.replace(/\s*\[\d+\]/g, "");
};

const ensureSentence = (value: string | undefined | null): string => {
  if (!value) return "";
  const cleaned = String(value).replace(/\s*\[\d+\]/g, "");
  const trimmed = cleaned.trim();
  if (!trimmed) return "";
  return trimmed.replace(/([^.!?])$/, "$1.");
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
): { html: string; rawText: string } => {
  if (!draft || typeof draft !== "object") {
    const defaultText = "I'm here whenever you're ready to upload a chart or ask for a translation.";
    return {
      html: `<p style="margin:0; line-height:1.6;">${escapeHtml(defaultText)}</p>`,
      rawText: defaultText,
    };
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
    typeof draft.appendix === "object" && draft.appendix
      ? draft.appendix
      : undefined;
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

  const rawText = paragraphs.join("\n\n");

  return {
    html: `
      <section class="mirror-draft narrative" style="display:flex; flex-direction:column;">
        ${htmlParagraphs}
        ${provenance}
      </section>
    `,
    rawText,
  };
};

const formatShareableDraft = (
  draft?: Record<string, any> | null,
  prov?: Record<string, any> | null,
): { html: string; rawText: string } => {
  if (!draft) {
    return {
      html: "<i>No mirror draft returned.</i>",
      rawText: "No mirror draft returned.",
    };
  }

  const conversationText =
    typeof draft.conversation === "string" ? draft.conversation.trim() : "";
  if (conversationText) {
    const cleanedText = conversationText.replace(/\s*\[\d+\]/g, "");
    const paragraphs = cleanedText
      .split(/\n{2,}/)
      .map(
        (block) =>
          `<p style="margin:0; line-height:1.6;">${escapeHtml(block).replace(
            /\n/g,
            "<br />",
          )}</p>`,
      )
      .join('<div style="height:0.75rem;"></div>');
    const provenance = prov?.source
      ? `<div class="mirror-provenance" style="margin-top:12px; font-size:11px; color:#94a3b8;">Source · ${escapeHtml(
          String(prov.source),
        )}</div>`
      : "";

    return {
      html: `
        <section class="mirror-draft conversation" style="display:flex; flex-direction:column; gap:12px;">
          ${paragraphs || `<p style="margin:0; line-height:1.6;">${escapeHtml(cleanedText)}</p>`}
          ${provenance}
        </section>
      `,
      rawText: cleanedText,
    };
  }

  return buildNarrativeDraft(draft, prov);
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

const formatIntentHook =
  (intent?: Intent, prov?: Record<string, any> | null): string | undefined => {
    if (!intent) return prov?.source ? `Source · ${prov.source}` : undefined;
    const lane =
      intent === "geometry"
        ? "Geometry"
        : intent === "report"
          ? "Report"
          : "Conversation";
    const source = prov?.source ? ` · ${prov.source}` : "";
    return `Lane · ${lane}${source}`;
  };

const formatClimate =
  (climate?: string | ClimateData | null): string | undefined => {
    if (!climate) return undefined;
    if (typeof climate === "string") return climate;
    try {
      return formatFullClimateDisplay(climate);
    } catch {
      return undefined;
    }
  };

const containsRepairValidation = (text: string): boolean => {
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
};

const containsInitialProbe = (text: string): boolean => {
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
};

const getPingCheckpointType =
  (text: string): "hook" | "vector" | "aspect" | "repair" | "general" => {
    if (containsRepairValidation(text)) return "repair";
    if (/hook stack|paradox.*tags|rock.*spark/i.test(text)) return "hook";
    if (/hidden push|counterweight|vector signature/i.test(text)) return "vector";
    if (/mars.*saturn|personal.*outer|hard aspect/i.test(text)) return "aspect";
    return "general";
  };

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

type ReportMetadata = {
  format: string | null;
  hasMirrorDirective: boolean;
  hasSymbolicWeather: boolean;
  isRelationalMirror: boolean;
};

const detectReportMetadata = (rawContent: string | undefined): ReportMetadata => {
  const empty: ReportMetadata = {
    format: null,
    hasMirrorDirective: false,
    hasSymbolicWeather: false,
    isRelationalMirror: false,
  };
  if (!rawContent || typeof rawContent !== 'string') {
    return empty;
  }
  let data: any;
  try {
    data = JSON.parse(rawContent);
  } catch {
    return empty;
  }

  const format = typeof data?._format === 'string' ? data._format : null;
  const mirrorContract =
    (data?.mirror_contract && typeof data.mirror_contract === 'object' && data.mirror_contract) ||
    (data?.contract && typeof data.contract === 'object' && data.contract) ||
    null;

  const reportKindRaw =
    mirrorContract?.report_kind ??
    data?.report_kind ??
    data?.report_type ??
    data?.mode ??
    data?.context?.report_kind ??
    null;
  const reportKind = typeof reportKindRaw === 'string' ? reportKindRaw.toLowerCase() : '';

  const hasMirrorDirective =
    format === 'mirror_directive_json' ||
    Boolean(
      mirrorContract ||
        data?.narrative_sections ||
        (data?.person_a && typeof data.person_a === 'object') ||
        (data?.personA && typeof data.personA === 'object')
    );

  const hasSymbolicWeather =
    format === 'mirror-symbolic-weather-v1' ||
    format === 'symbolic_weather_json' ||
    Boolean(
      data?.symbolic_weather ||
        data?.symbolic_weather_context ||
        data?.weather_overlay ||
        data?.balance_meter?.channel_summary_canonical ||
        data?.balance_meter_frontstage ||
        Array.isArray(data?.daily_readings)
    );

  const mirrorIsRelational =
    Boolean(mirrorContract?.is_relational) ||
    Boolean(mirrorContract?.relationship_type) ||
    /relational|synastry|composite/.test(reportKind) ||
    Boolean(data?.person_b || data?.personB);

  return {
    format,
    hasMirrorDirective,
    hasSymbolicWeather,
    isRelationalMirror: Boolean(hasMirrorDirective && mirrorIsRelational),
  };
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
        const res = await fetch("/api/raven", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": generateId(), // Add request ID for tracking
          },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });

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
    [applyRavenResponse, commitError],
  );

  const analyzeReportContext = useCallback(
    async (reportContext: ReportContext, contextsForPayload?: ReportContext[]) => {
      const contextList = contextsForPayload ?? reportContexts;
      const metadataList = contextList.map((ctx) => ({
        id: ctx.id,
        type: ctx.type,
        metadata: detectReportMetadata(ctx.content),
      }));

      const hasMirrorDirective = metadataList.some((entry) => entry.metadata.hasMirrorDirective);
      const hasSymbolicWeather = metadataList.some((entry) => entry.metadata.hasSymbolicWeather);
      const hasRelationalMirror = metadataList.some((entry) => entry.metadata.isRelationalMirror);

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

      const weatherPlaceholderId = generateId();
      const weatherPlaceholder: Message = {
        id: weatherPlaceholderId,
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

      setMessages(prev => [...prev, sessionStartMessage, weatherPlaceholder, mirrorPlaceholder]);

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
        // First, get the symbolic weather report with a safer prompt
        const weatherResponse = await runRavenRequest(
          {
            input: `Provide a brief astrological weather update for ${reportLabel}, focusing on major transits and aspects. Keep it concise and focused on the current celestial patterns.`,
            sessionId: sessionId ?? undefined,
            options: {
              reportType: reportContext.type,
              reportId: reportContext.id,
              reportName: reportContext.name,
              reportSummary: reportContext.summary,
              ...(relocationPayload ? { relocation: relocationPayload } : {}),
              reportContexts: contextPayload,
              intent: 'astrology_weather',
              safety_level: 'high',
              max_tokens: 400
            },
          },
          weatherPlaceholderId,
          "Analyzing current astrological patterns...",
        );

        // If weather report was successful, proceed with mirror reading
        if (weatherResponse?.ok !== false) {
          // Then, start the mirror reading with a more structured prompt
          await runRavenRequest(
            {
              input: `Please analyze the key patterns in this ${reportContext.type} report for ${reportLabel}. Focus on the most significant aspects and their potential meanings.`,
              sessionId: sessionId ?? undefined,
              options: {
                reportType: reportContext.type,
                reportId: reportContext.id,
                reportName: reportContext.name,
                reportSummary: reportContext.summary,
                ...(relocationPayload ? { relocation: relocationPayload } : {}),
                reportContexts: contextPayload,
                intent: 'pattern_analysis',
                safety_level: 'high',
                max_tokens: 600
              },
            },
            mirrorPlaceholderId,
            `Analyzing patterns in ${reportLabel}...`,
          );
        } else {
          // If weather report failed, try a more general approach
          await runRavenRequest(
            {
              input: `Let's explore the patterns in ${reportLabel}. What stands out to you as the most significant theme or pattern here?`,
              sessionId: sessionId ?? undefined,
              options: {
                reportType: reportContext.type,
                reportId: reportContext.id,
                reportName: reportContext.name,
                reportSummary: reportContext.summary,
                ...(relocationPayload ? { relocation: relocationPayload } : {}),
                reportContexts: contextPayload,
                intent: 'explore_patterns',
                safety_level: 'high',
                max_tokens: 500
              },
            },
            mirrorPlaceholderId,
            `Exploring patterns in ${reportLabel}...`,
          );
        }
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
            <p className="text-center text-sm text-slate-400">
              Session ready. Raven is preparing your mirror—watch for the reading to appear.
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
            />
          </div>
        </div>
      )}
    </div>
  );
}
