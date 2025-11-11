import { formatFullClimateDisplay, type ClimateData } from "./climate-renderer";
import type { Intent } from "./raven/intent";

const REPAIR_VALIDATION_PATTERNS = [
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

const INITIAL_PROBE_PATTERNS = [
  /does any of this feel familiar/i,
  /did this land/i,
  /does this fit your experience/i,
  /feel true to you/i,
  /does this resonate/i,
  /ring true/i,
  /sound right/i,
  /feel accurate/i,
];

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

export const formatIntentHook = (
  intent?: Intent,
  prov?: Record<string, any> | null,
): string | undefined => {
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

export const formatClimate = (
  climate?: string | ClimateData | null,
): string | undefined => {
  if (!climate) return undefined;
  if (typeof climate === "string") return climate;
  try {
    return formatFullClimateDisplay(climate);
  } catch {
    return undefined;
  }
};

export const containsRepairValidation = (text: string): boolean => {
  return REPAIR_VALIDATION_PATTERNS.some((pattern) => pattern.test(text));
};

export const containsInitialProbe = (text: string): boolean => {
  if (containsRepairValidation(text)) {
    return false;
  }
  return INITIAL_PROBE_PATTERNS.some((pattern) => pattern.test(text));
};

export const getPingCheckpointType = (
  text: string,
): "hook" | "vector" | "aspect" | "repair" | "general" => {
  if (containsRepairValidation(text)) return "repair";
  if (/core insights|hook stack|paradox.*tags|rock.*spark/i.test(text)) return "hook";
  if (/hidden push|counterweight|vector signature/i.test(text)) return "vector";
  if (/mars.*saturn|personal.*outer|hard aspect/i.test(text)) return "aspect";
  return "general";
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

export interface BalanceMeterSummary {
  magnitude?: number;
  magnitudeLabel?: string;
  directionalBias?: number;
  directionalBiasLabel?: string;
  directionalBiasEmoji?: string;
}

export const extractBalanceMeterSummary = (balanceMeter: any): BalanceMeterSummary | null => {
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

export const formatBalanceMeterSummaryLine = (
  summary: BalanceMeterSummary | null,
): string | null => {
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

