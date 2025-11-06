import DOMPurify from 'dompurify';
import { generateId } from './id';
import type { Message, ReportContext } from '../components/chat/types';
import type { RelocationSummary } from './relocation';
import {
  formatFullClimateDisplay,
  type ClimateData,
} from './climate-renderer';
import { summarizeRelocation } from './relocation';
import { applyEPrimeFilter, replaceWithConditional } from './poetic-brain/runtime';

export const mapRelocationToPayload = (
  summary: any | null | undefined,
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

export function containsResonanceMarkers(text: string | undefined | null): boolean {
  if (!text) return false;
  return RESONANCE_MARKERS.some((marker) => text.includes(marker));
}

export const escapeHtml = (input: string): string =>
  input.replace(/[&<>]/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
    };
    return map[char] ?? char;
  });

export const sanitizeHtml = (html: string): string => {
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
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "class",
      "style",
      "data-action",
    ],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  });
};

const stripPersonaMetadata = (text: string): string => {
  return text
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      if (/^(RAVEN|VOICE|SESSION|ORIENTATION|SYMBOLIC WEATHER|MIRROR READING|MAP|FIELD)/.test(trimmed)) {
        return false;
      }
      if (/^[A-Z\s·]+$/.test(trimmed) && trimmed.length < 60) {
        return false;
      }
      return true;
    })
    .join('\n')
    .trim();
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

const renderNarrativeSection = (label: string, variant: string, text: string): string => {
  const sanitized = text.trim();
  if (!sanitized) return "";
  return [
    `<section class="raven-section raven-section--${variant}">`,
    `<h3 class="raven-section__title">${escapeHtml(label)}</h3>`,
    `<p class="raven-section__body">${escapeHtml(sanitized)}</p>`,
    `</section>`,
  ].join("");
};

const coalesceSegments = (segments: Array<string | undefined | null>): string =>
  segments
    .map((segment) => (typeof segment === "string" ? segment.trim() : ""))
    .filter((segment) => Boolean(segment))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const ensureParagraph = (prefix: string, body: string): string => {
  if (!body) return "";
  const prefixed = `${prefix} ${body}`.replace(/\s+/g, " ").trim();
  return ensureSentence(prefixed);
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

  const rawPicture = typeof draft.picture === "string" ? stripPersonaMetadata(draft.picture) : "";
  const rawFeeling = typeof draft.feeling === "string" ? stripPersonaMetadata(draft.feeling) : "";
  const rawContainer = typeof draft.container === "string" ? stripPersonaMetadata(draft.container) : "";
  const rawOption = typeof draft.option === "string" ? stripPersonaMetadata(draft.option) : "";
  const rawNextStep = typeof draft.next_step === "string" ? stripPersonaMetadata(draft.next_step) : "";

  const appendix =
    typeof draft.appendix === "object" && draft.appendix
      ? draft.appendix
      : undefined;
  const highlightSentences = formatAppendixHighlights(
    appendix as Record<string, any> | undefined,
  );

  const sanitizeBody = (text: string): string =>
    applyEPrimeFilter(replaceWithConditional(text));

  const fieldBody = sanitizeBody(coalesceSegments([rawPicture, rawFeeling]));
  const mapBody = sanitizeBody(
    coalesceSegments([rawContainer, ...highlightSentences]),
  );
  const voiceBody = sanitizeBody(
    coalesceSegments([rawOption, rawNextStep]),
  );

  const fieldParagraph = fieldBody
    ? ensureParagraph("Field layer may mirror this:", fieldBody)
    : "";
  const mapParagraph = mapBody
    ? ensureParagraph("Map layer could translate this:", mapBody)
    : "";
  const voiceParagraph = voiceBody
    ? ensureParagraph("Voice invitation tends to ask:", voiceBody)
    : "";

  const sections: string[] = [];
  if (fieldParagraph) sections.push(renderNarrativeSection("Field", "field", fieldParagraph));
  if (mapParagraph) sections.push(renderNarrativeSection("Map", "map", mapParagraph));
  if (voiceParagraph) sections.push(renderNarrativeSection("Voice", "voice", voiceParagraph));

  if (!sections.length) {
    const fallbackText =
      "I've logged this report and set it aside for interpretation. Let me know when you'd like me to mirror a pattern.";
    return {
      html: `<p style="margin:0; line-height:1.6;">${escapeHtml(fallbackText)}</p>`,
      rawText: fallbackText,
    };
  }

  const provenanceText =
    prov?.source && typeof prov.source === "string"
      ? `Source · ${prov.source}`
      : null;

  const provenanceHtml = provenanceText
    ? `<footer class="raven-provenance" style="margin-top:12px; font-size:11px; color:#94a3b8;">${escapeHtml(
        provenanceText,
      )}</footer>`
    : "";

  const html = `
    <section class="mirror-draft narrative" style="display:flex; flex-direction:column; gap:12px;">
      ${sections.join("")}
      ${provenanceHtml}
    </section>
  `;

  const rawSegments = [fieldParagraph, mapParagraph, voiceParagraph];
  if (provenanceText) rawSegments.push(provenanceText);
  const rawText = rawSegments.filter(Boolean).join("\n\n");

  return { html, rawText };
};

export const formatShareableDraft = (
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

export const formatFriendlyErrorMessage = (rawMessage: string): string => {
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

export const formatIntentHook =
  (intent?: any, prov?: Record<string, any> | null): string | undefined => {
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

export const formatClimate =
  (climate?: string | ClimateData | null): string | undefined => {
    if (!climate) return undefined;
    if (typeof climate === "string") return climate;
    try {
      return formatFullClimateDisplay(climate);
    } catch {
      return undefined;
    }
  };

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

export const parseReportContent = (rawContent: string, opts: ParseOptions = {}): ParsedReportContent => {
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
