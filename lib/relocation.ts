export type SubjectUI = {
  name?: string;
  year: number | string;
  month: number | string;
  day: number | string;
  hour?: number | string | null;
  minute?: number | string | null;
  city?: string;
  nation?: string;
  latitude?: number | string;
  longitude?: number | string;
  timezone?: string; // IANA preferred
  zodiac_type?: "Tropic" | "Sidereal" | string;
  houses_system_identifier?: string;
};

export function needsLocation(
  reportType: 'balance'|'mirror',
  includeTransitTag: boolean,
  s?: SubjectUI
) {
  const needsLoc = reportType === 'balance' || (reportType === 'mirror' && includeTransitTag);
  // Accept numeric strings as valid lat/lon (e.g., "40.7128")
  const maybeLat = (s as any)?.latitude;
  const maybeLon = (s as any)?.longitude;
  const hasLat = typeof maybeLat === 'number' || (typeof maybeLat === 'string' && maybeLat.trim() !== '' && Number.isFinite(Number(maybeLat)));
  const hasLon = typeof maybeLon === 'number' || (typeof maybeLon === 'string' && maybeLon.trim() !== '' && Number.isFinite(Number(maybeLon)));
  const hasTz = !!(s as any)?.timezone;
  const hasLoc = !!s && hasLat && hasLon && hasTz;
  // Treat non-empty hour/minute strings as present for UI gating (detailed provenance left to server)
  const hasHour = typeof (s as any)?.hour === 'number' || (typeof (s as any)?.hour === 'string' && (s as any).hour !== '');
  const hasMinute = typeof (s as any)?.minute === 'number' || (typeof (s as any)?.minute === 'string' && (s as any).minute !== '');
  const hasBirthTime = hasHour && hasMinute;
  return { needsLoc, hasLoc, hasBirthTime, canSubmit: !needsLoc || (needsLoc && hasLoc) };
}
// Relocation ("translocation") utilities
// Keeps aspect + planetary geometry fixed; remaps Houses when lens applies.

export type RelocationMode =
  | "birthplace"
  | "A_local"
  | "B_local"
  | "both_local"
  | "event"
  | "midpoint_advanced_hidden";

export type RelocationScope =
  | "off"
  | "person_a"
  | "person_b"
  | "shared"
  | "event";

export interface RelocationCoordinates {
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}

export interface TranslocationContext {
  applies?: boolean;
  method?: string;
  mode?: string;
  current_location?: string;
  label?: string;
  house_system?: string;
  tz?: string;
  timezone?: string;
  coords?: { latitude?: number | string; longitude?: number | string; tz?: string; timezone?: string } | null;
  coordinates?: { latitude?: number | string; longitude?: number | string; tz?: string; timezone?: string } | null;
  zodiac_type?: string;
}

export interface NatalContext {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  timezone?: string; // Natal timezone (IANA)
}

export interface ReportContext {
  type: string;
  natal: NatalContext;
  translocation: TranslocationContext;
  provenance?: Record<string, any> | null;
  relocation_mode?: string | null;
  relocation_label?: string | null;
}

export interface RelocationSummary {
  active: boolean;
  mode: RelocationMode;
  scope: RelocationScope;
  label: string | null;
  status: string;
  disclosure: string;
  invariants: string;
  confidence: "normal" | "low";
  coordinates: RelocationCoordinates | null;
  natalTimezone: string | null; // Birth timezone from natal chart
  houseSystem: string | null;
  zodiacType: string | null;
  engineVersions: Record<string, string> | null;
  provenance: {
    relocation_mode: RelocationMode;
    relocation_label: string | null;
    coords: RelocationCoordinates | null;
    tz: string | null;
    natal_tz: string | null;
    house_system: string | null;
    zodiac_type: string | null;
    engine_versions: Record<string, string> | null;
    confidence: "normal" | "low";
  };
}

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
};

const normalizeRelocationMode = (
  raw: unknown,
  fallback: RelocationMode,
): RelocationMode => {
  if (!raw && raw !== 0) return fallback;
  const token = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  switch (token) {
    case "a_local":
    case "a_local_lens":
    case "person_a_local":
    case "alocal":
    case "a_local_mode":
      return "A_local";
    case "b_local":
    case "person_b_local":
    case "blocal":
    case "b_local_mode":
      return "B_local";
    case "both_local":
    case "both":
    case "shared":
    case "shared_local":
    case "dual_local":
    case "same_city":
      return "both_local";
    case "event":
    case "custom":
    case "event_city":
    case "custom_event":
      return "event";
    case "midpoint":
    case "midpoint_advanced":
    case "midpoint_advanced_hidden":
    case "composite_midpoint":
      return "midpoint_advanced_hidden";
    case "birthplace":
    case "none":
    case "natal":
    case "a_natal":
    case "b_natal":
    case "off":
      return "birthplace";
    default:
      if (token.includes("midpoint")) return "midpoint_advanced_hidden";
      if (token.includes("both") || token.includes("shared")) return "both_local";
      if (token.includes("b_local")) return "B_local";
      if (token.includes("a_local")) return "A_local";
      if (token.includes("event")) return "event";
      return fallback;
  }
};

export const relocationActive = (mode: RelocationMode): boolean => mode !== "birthplace";

const scopeFromMode = (mode: RelocationMode): RelocationScope => {
  switch (mode) {
    case "A_local":
      return "person_a";
    case "B_local":
      return "person_b";
    case "both_local":
    case "midpoint_advanced_hidden":
      return "shared";
    case "event":
      return "event";
    default:
      return "off";
  }
};

export const relocationDisclosure = (
  mode: RelocationMode,
  label?: string | null,
): string => {
  const place = label?.trim();
  const safe = place && place.length > 0 ? place : undefined;
  switch (mode) {
    case "birthplace":
      return "Relocation: None (birthplace houses/angles).";
    case "A_local":
      return `Relocation on: ${safe ?? "Person A’s city"}. Houses/angles move; planets stay fixed.`;
    case "B_local":
      return `Relocation on: ${safe ?? "Person B’s city"}. Houses/angles move; planets stay fixed.`;
    case "both_local":
      return `Relocation on: ${safe ?? "Shared city for A & B"}. Houses/angles move; planets stay fixed.`;
    case "event":
      return `Relocation on: ${safe ?? "Event city"}. Houses/angles move; planets stay fixed.`;
    case "midpoint_advanced_hidden":
      return "Relocation: Midpoint (symbolic; lower confidence).";
    default:
      return `Relocation on: ${safe ?? "Selected city"}. Houses/angles move; planets stay fixed.`;
  }
};

const relocationStatusLine = (
  mode: RelocationMode,
): string => {
  switch (mode) {
    case "birthplace":
      return "Relocation is off. Houses/angles stay at birth locations.";
    case "A_local":
      return "Relocation on: Person A’s city. Houses/angles move; planets stay fixed.";
    case "B_local":
      return "Relocation on: Person B’s city. Houses/angles move; planets stay fixed.";
    case "both_local":
      return "Relocation on: Shared city for A & B. Houses/angles move; planets stay fixed.";
    case "event":
      return "Relocation on: Event city. Houses/angles move; planets stay fixed.";
    case "midpoint_advanced_hidden":
      return "Symbolic midpoint lens (not a real city). Lower diagnostic confidence.";
    default:
      return "Relocation lens active.";
  }
};

const relocationInvariants = (mode: RelocationMode): string => {
  if (mode === "midpoint_advanced_hidden") {
    return "Symbolic midpoint frame. Planets stay fixed; treat as low confidence.";
  }
  if (mode === "birthplace") {
    return "Planets and houses remain at birth coordinates.";
  }
  return "Planets stay fixed; houses/angles remap to the selected location.";
};

const firstDefined = <T>(...values: Array<T | null | undefined>): T | null => {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return null;
};

export function summarizeRelocation(ctx: ReportContext): RelocationSummary {
  const provenance = (ctx as any)?.provenance || (ctx as any)?.meta || {};
  const t = ctx.translocation || (ctx as any)?.translocation || {};
  const applies = Boolean(t?.applies ?? provenance?.relocation_mode);
  const fallbackMode: RelocationMode = applies ? "event" : "birthplace";
  const rawMode =
    (ctx as any)?.relocation_mode ??
    t?.mode ??
    t?.method ??
    provenance?.relocation_mode ??
    (applies ? "event" : "birthplace");
  const mode = normalizeRelocationMode(rawMode, fallbackMode);

  // Extract natal timezone from natal context
  const natalTimezone = firstDefined(
    ctx?.natal?.timezone,
    provenance?.natal_timezone,
    provenance?.birth_timezone,
  );

  const active = relocationActive(mode);
  const label = firstDefined(
    t?.current_location,
    t?.label,
    (ctx as any)?.relocation_label,
    provenance?.relocation_label,
  );

  const coordsRaw =
    t?.coords ??
    t?.coordinates ??
    provenance?.relocation_coords ??
    provenance?.coords ??
    null;

  const latitude = parseNumber((coordsRaw as any)?.latitude ?? (coordsRaw as any)?.lat);
  const longitude = parseNumber((coordsRaw as any)?.longitude ?? (coordsRaw as any)?.lon);
  const timezone = firstDefined(
    t?.tz,
    t?.timezone,
    (coordsRaw as any)?.timezone,
    (coordsRaw as any)?.tz,
    provenance?.relocation_timezone,
    provenance?.tz,
  );

  const coordinates: RelocationCoordinates | null = active
    ? {
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        timezone: timezone ?? null,
      }
    : null;

  const houseSystem = firstDefined(
    t?.house_system,
    provenance?.house_system,
    provenance?.house_system_name,
  );
  const zodiacType = firstDefined(t?.zodiac_type, provenance?.zodiac_type);

  const engineVersions =
    provenance?.engine_versions && typeof provenance.engine_versions === "object"
      ? provenance.engine_versions
      : null;

  const confidence: "normal" | "low" = (() => {
    const rawConfidence = provenance?.confidence;
    if (typeof rawConfidence === "string") {
      return rawConfidence.toLowerCase().includes("low") ? "low" : "normal";
    }
    return mode === "midpoint_advanced_hidden" ? "low" : "normal";
  })();

  const disclosure = relocationDisclosure(mode, label);
  const status = relocationStatusLine(mode);
  const invariants = relocationInvariants(mode);

  return {
    active,
    mode,
    scope: scopeFromMode(mode),
    label: active ? (label ?? null) : null,
    status,
    disclosure,
    invariants,
    confidence,
    coordinates,
    natalTimezone: natalTimezone ?? null,
    houseSystem: houseSystem ?? null,
    zodiacType: zodiacType ?? null,
    engineVersions,
    provenance: {
      relocation_mode: mode,
      relocation_label: active ? (label ?? null) : null,
      coords: coordinates,
      tz: coordinates?.timezone ?? null,
      natal_tz: natalTimezone ?? null,
      house_system: houseSystem ?? null,
      zodiac_type: zodiacType ?? null,
      engine_versions: engineVersions,
      confidence,
    },
  };
}

/**
 * Formats a contrast line given a natal vs relocated House channel for a transit or factor.
 */
export function formatHouseContrast(symbol: string, natalHouse: number, relocatedHouse: number): string {
  if (natalHouse === relocatedHouse) return `${symbol}: Same arena (House ${natalHouse}) under relocation.`;
  return `${symbol}: Natal House ${natalHouse} → Relocated House ${relocatedHouse} (channel shift)`;
}

/**
 * Helper to safely read translocation applies flag from arbitrary uploaded JSON.
 */
export function detectRelocation(raw: any): boolean {
  try { return !!raw?.context?.translocation?.applies; } catch { return false; }
}

// --- Time precision helpers (UI ↔ server contract) ---
export type TimePrecision = 'exact' | 'unknown' | 'noon_fallback' | 'range_scan';

export function isTimeUnknown(s?: SubjectUI): boolean {
  if (!s) return true;
  const hasHour = typeof s.hour === 'number' || (typeof s.hour === 'string' && s.hour !== '');
  const hasMinute = typeof s.minute === 'number' || (typeof s.minute === 'string' && s.minute !== '');
  return !(hasHour && hasMinute);
}

export interface TimePolicy {
  birth_time_known: boolean;
  time_precision: TimePrecision;
  effective_time_used?: string; // e.g., "12:00 (local noon)"
  houses_suppressed: boolean;   // UI should hide house/angle language when true
}

export function deriveTimePolicy(s?: SubjectUI, choice?: 'planetary_only'|'whole_sign'|'scan'): TimePolicy {
  const unknown = isTimeUnknown(s);
  if (!unknown) {
    return { birth_time_known: true, time_precision: 'exact', houses_suppressed: false };
  }
  // Default is planetary-only (no houses)
  if (!choice || choice === 'planetary_only') {
    return {
      birth_time_known: false,
      time_precision: 'unknown',
      effective_time_used: undefined,
      houses_suppressed: true,
    };
  }
  if (choice === 'whole_sign') {
    return {
      birth_time_known: false,
      time_precision: 'noon_fallback',
      effective_time_used: '12:00 (local noon fallback)',
      houses_suppressed: false, // allowed with lower confidence banner in UI
    };
  }
  // scan
  return {
    birth_time_known: false,
    time_precision: 'range_scan',
    effective_time_used: '00:00-23:59 (scan)',
    houses_suppressed: true
  };
}

if (process.env.NODE_ENV !== 'production') {
  const assertions: Array<[boolean, string]> = [
    [relocationActive('birthplace') === false, 'relocationActive should be false for birthplace'],
    [relocationActive('both_local') === true, 'relocationActive should be true for both_local'],
    [
      (() => {
        const probe = summarizeRelocation({
          type: 'probe',
          natal: { name: 'Test', birth_date: '', birth_time: '', birth_place: '' },
          translocation: {
            applies: true,
            method: 'Both_local',
            current_location: 'Shared City',
            tz: 'UTC',
          },
        });
        return /Shared city/i.test(probe.disclosure);
      })(),
      'both_local disclosure should mention Shared city',
    ],
  ];
  const failed = assertions.filter(([passed]) => !passed);
  if (failed.length > 0) {
    console.warn(
      '[relocation] self-check failed:',
      failed.map(([, message]) => message).join('; '),
    );
  }
}
