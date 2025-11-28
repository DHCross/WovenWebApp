import { generateId } from "./id";
import {
  extractBalanceMeterSummary,
  formatBalanceMeterSummaryLine,
} from "./raven-formatting";
import { summarizeRelocation, type RelocationSummary } from "./relocation";

export const RESONANCE_MARKERS = [
  "FIELD:",
  "MAP:",
  "VOICE:",
  "WB ·",
  "ABE ·",
  "OSR ·",
  "Resonance Ledger",
  "VALIDATION:",
] as const;

export const MIRROR_SECTION_ORDER: Array<{ key: string; label: string }> = [
  { key: "picture", label: "Picture" },
  { key: "feeling", label: "Feeling" },
  { key: "container", label: "Container" },
  { key: "option", label: "Option" },
  { key: "next_step", label: "Next Step" },
];

export const WEATHER_ONLY_PATTERN =
  /\b(weather|sky today|planetary (weather|currents)|what's happening in the sky)\b/i;

export const ASTROSEEK_GUARD_SOURCE = "Conversational Guard (AstroSeek)";
export const ASTROSEEK_GUARD_DRAFT: Record<string, string> = {
  picture: "Got your AstroSeek mention—one more step.",
  feeling: "I need the actual export contents to mirror accurately.",
  container: 'Option 1 · Click "Upload report" and drop the AstroSeek download (JSON or text).',
  option: "Option 2 · Open the export and paste the full table or text here.",
  next_step: "Once the geometry is included, I can read you in detail.",
};

export const NO_CONTEXT_GUARD_SOURCE = "Conversational Guard";

export type ReportContextType = "mirror" | "balance";

export interface ReportContext {
  id: string;
  type: ReportContextType;
  name: string;
  summary: string;
  content: string;
  relocation?: RelocationSummary;
}

export interface ParseOptions {
  uploadType?: ReportContextType | null;
  fileName?: string;
  sourceLabel?: string;
  windowLabel?: string | null;
}

export interface ParsedReportContent {
  context: ReportContext;
  relocation: RelocationSummary | null;
  isMirror: boolean;
}

export type ReportMetadata = {
  format: string | null;
  hasMirrorDirective: boolean;
  hasSymbolicWeather: boolean;
  isRelationalMirror: boolean;
};

export const containsResonanceMarkers = (text: string | undefined | null): boolean => {
  if (!text) return false;
  return RESONANCE_MARKERS.some((marker) => text.includes(marker));
};

export const mapRelocationToPayload = (
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

export const parseReportContent = (
  rawContent: string,
  opts: ParseOptions = {},
): ParsedReportContent => {
  let inferredType: ReportContextType | null = null;
  let relocationSummary: RelocationSummary | null = null;
  const summaryParts: string[] = [];
  const baseLabel = opts.sourceLabel?.trim() || opts.fileName?.trim() || "Uploaded report";
  let displayLabel = baseLabel || "Uploaded report";

  try {
    const jsonData = JSON.parse(rawContent);
    if (jsonData && typeof jsonData === "object") {
      // Explicit Mirror Directive export
      if (jsonData._format === "mirror_directive_json") {
        inferredType = "mirror";
        const personName =
          jsonData?.person_a?.name ||
          jsonData?.person_a?.details?.name;
        displayLabel = personName ? `Mirror Directive for ${personName}` : "Mirror Directive";
        summaryParts.push("Mirror Directive JSON");
      }

      // Balance/Weather style export with context
      else if (jsonData.context && jsonData.balance_meter) {
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

        // Heuristic: if mirror templates are present OR raw contains "solo mirror",
        // classify as mirror; otherwise balance. This remains as-is.
        if (jsonData.reports?.templates?.solo_mirror || /solo mirror/i.test(rawContent)) {
          inferredType = "mirror";
        } else {
          inferredType = "balance";
        }
      }

      // Template-only indicator
      else if (jsonData.reports?.templates?.solo_mirror) {
        inferredType = "mirror";
      }

      // NEW: Combined Mirror + Symbolic Weather export or mirror-like payloads
      // If the payload carries mirror-specific fields, force type to 'mirror'.
      if (
        !inferredType && (
          (jsonData._format && /^(mirror-symbolic-weather-v1|symbolic_weather_json)$/i.test(jsonData._format)) ||
          (jsonData.mirror_contract && typeof jsonData.mirror_contract === "object") ||
          (jsonData.contract && typeof jsonData.contract === "object") ||
          (jsonData.person_a && typeof jsonData.person_a === "object") ||
          (jsonData.personA && typeof jsonData.personA === "object")
        )
      ) {
        inferredType = "mirror";
        const personAName =
          jsonData?.person_a?.name ||
          jsonData?.person_a?.details?.name ||
          jsonData?.personA?.name ||
          jsonData?.personA?.details?.name;
        const personBName =
          jsonData?.person_b?.name ||
          jsonData?.person_b?.details?.name ||
          jsonData?.personB?.name ||
          jsonData?.personB?.details?.name;
        const isRelational = Boolean(personBName);
        
        if (personAName && !/Mirror Directive/.test(displayLabel)) {
          if (isRelational && personBName) {
            displayLabel = `Relational Mirror: ${personAName} ↔ ${personBName}`;
          } else {
            displayLabel = `Mirror Directive for ${personAName}`;
          }
        }
        if (jsonData._format) {
          summaryParts.push(String(jsonData._format));
        }
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

  const resolvedType = (opts.uploadType || inferredType || "balance") as ReportContextType;
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

export const detectReportMetadata = (rawContent: string | undefined): ReportMetadata => {
  const empty: ReportMetadata = {
    format: null,
    hasMirrorDirective: false,
    hasSymbolicWeather: false,
    isRelationalMirror: false,
  };
  if (!rawContent || typeof rawContent !== "string") {
    return empty;
  }
  let data: any;
  try {
    data = JSON.parse(rawContent);
  } catch {
    return empty;
  }

  const format = typeof data?._format === "string" ? data._format : null;
  const mirrorContract =
    (data?.mirror_contract && typeof data.mirror_contract === "object" && data.mirror_contract) ||
    (data?.contract && typeof data.contract === "object" && data.contract) ||
    null;

  const reportKindRaw =
    mirrorContract?.report_kind ??
    data?.report_kind ??
    data?.report_type ??
    data?.mode ??
    data?.context?.report_kind ??
    null;
  const reportKind = typeof reportKindRaw === "string" ? reportKindRaw.toLowerCase() : "";

  const hasMirrorDirective =
    format === "mirror_directive_json" ||
    Boolean(
      mirrorContract ||
        data?.narrative_sections ||
        (data?.person_a && typeof data.person_a === "object") ||
        (data?.personA && typeof data.personA === "object") ||
        (data?.person_b && typeof data.person_b === "object") ||
        (data?.personB && typeof data.personB === "object"),
    );

  const hasSymbolicWeather =
    format === "mirror-symbolic-weather-v1" ||
    format === "symbolic_weather_json" ||
    Boolean(
      data?.symbolic_weather ||
        data?.symbolic_weather_context ||
        data?.weather_overlay ||
        data?.balance_meter?.channel_summary_canonical ||
        data?.balance_meter_frontstage ||
        Array.isArray(data?.daily_readings),
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
