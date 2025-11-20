import { applyEPrimeFilter, replaceWithConditional } from "@/lib/poetic-brain/runtime";

export const escapeHtml = (input: string): string =>
  input.replace(/[&<>]/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
    };
    return map[char] ?? char;
  });

export const removeCitationAnnotations = (text: string): string => {
  return text.replace(/\s*\[\d+\]/g, "");
};

export const stripPersonaMetadata = (text: string): string => {
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (/^(RAVEN|VOICE|SESSION|ORIENTATION|SYMBOLIC WEATHER|MIRROR READING|MAP|FIELD)/.test(trimmed)) {
        return false;
      }
      if (/^[A-Z\s·]+$/.test(trimmed) && trimmed.length < 60) {
        return false;
      }
      return true;
    })
    .join("\n")
    .trim();
};

export const ensureSentence = (value: string | undefined | null): string => {
  if (!value) return "";
  const cleaned = String(value).replace(/\s*\[\d+\]/g, "");
  const trimmed = cleaned.trim();
  if (!trimmed) return "";
  return trimmed.replace(/([^.!?])$/, "$1.");
};

const MAGNITUDE_PATTERN = /\bMagnitude\s*:\s*-?\d+(\.\d+)?/i;
const DIRECTIONAL_PATTERN = /\bDirectional\s+Bias\s*:\s*-?\d+(\.\d+)?/i;
const COHERENCE_PATTERN = /\b(Coherence|Volatility)\s*:\s*-?\d+(\.\d+)?/i;
const RESONANCE_PATTERN = /\b(?:WB|ABE|OSR)\b/;
const QUESTION_PATTERN = /\?/;

export const hasStructuralScaffolding = (text: string | undefined | null): boolean => {
  if (!text) return false;
  const normalized = text.trim();
  if (!normalized) return false;

  const hasFieldLayer =
    /\bFIELD\s+(?:LAYER|→)\b/i.test(normalized) ||
    /\bFIELD\s*[:\-]/i.test(normalized);
  const hasMapLayer =
    /\bMAP\s+(?:LAYER|→)\b/i.test(normalized) ||
    /\bMAP\s*[:\-]/i.test(normalized);
  const hasVoiceLayer =
    /\bVOICE\s+(?:LAYER|→)\b/i.test(normalized) ||
    /\bVOICE\s*[:\-]/i.test(normalized);

  if (!hasFieldLayer || !hasMapLayer || !hasVoiceLayer) {
    return false;
  }

  const hasAxisData =
    MAGNITUDE_PATTERN.test(normalized) &&
    DIRECTIONAL_PATTERN.test(normalized) &&
    COHERENCE_PATTERN.test(normalized);
  const hasResonanceTag = RESONANCE_PATTERN.test(normalized);
  const hasQuestion = QUESTION_PATTERN.test(normalized);

  return hasAxisData && hasResonanceTag && hasQuestion;
};

export interface NarrativeSectionProps {
  text: string;
}

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

const FieldSection = ({ text }: NarrativeSectionProps): string =>
  renderNarrativeSection("Field", "field", text);

const MapSection = ({ text }: NarrativeSectionProps): string =>
  renderNarrativeSection("Map", "map", text);

const VoiceSection = ({ text }: NarrativeSectionProps): string =>
  renderNarrativeSection("Voice", "voice", text);

export const coalesceSegments = (segments: Array<string | undefined | null>): string =>
  segments
    .map((segment) => (typeof segment === "string" ? segment.trim() : ""))
    .filter((segment) => Boolean(segment))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

export const ensureParagraph = (prefix: string, body: string): string => {
  if (!body) return "";
  const prefixed = `${prefix} ${body}`.replace(/\s+/g, " ").trim();
  return ensureSentence(prefixed);
};

export const formatAppendixHighlights = (
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

export const buildNarrativeDraft = (
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
  if (fieldParagraph) sections.push(FieldSection({ text: fieldParagraph }));
  if (mapParagraph) sections.push(MapSection({ text: mapParagraph }));
  if (voiceParagraph) sections.push(VoiceSection({ text: voiceParagraph }));

  if (!sections.length) {
    const fallbackText =
      "I'm Raven Calder. I've set your upload aside for interpretation, but I'm here for live dialogue too—ask a question or tell me what pattern to mirror.";
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

    if (!hasStructuralScaffolding(cleanedText) && draft && Object.keys(draft).length > 0) {
      return buildNarrativeDraft(draft, prov);
    }

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
