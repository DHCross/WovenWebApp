import * as runtime from './relocation-runtime.js';

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

type NeedsLocationResult = {
  needsLoc: boolean;
  hasLoc: boolean;
  hasBirthTime: boolean;
  canSubmit: boolean;
};

export const needsLocation = (
  reportType: 'balance' | 'mirror',
  includeTransitTag: boolean,
  s?: SubjectUI,
): NeedsLocationResult => runtime.needsLocation(reportType, includeTransitTag, s);

// Relocation ("translocation") utilities
// Keeps aspect + planetary geometry fixed; remaps Houses when lens applies.

export type RelocationMode =
  | 'birthplace'
  | 'A_local'
  | 'B_local'
  | 'both_local'
  | 'event'
  | 'midpoint_advanced_hidden';

export type RelocationScope = 'off' | 'person_a' | 'person_b' | 'shared' | 'event';

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
  coords?: {
    latitude?: number | string;
    longitude?: number | string;
    tz?: string;
    timezone?: string;
  } | null;
  coordinates?: {
    latitude?: number | string;
    longitude?: number | string;
    tz?: string;
    timezone?: string;
  } | null;
  zodiac_type?: string;
}

export interface NatalContext {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  timezone?: string;
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
  confidence: 'normal' | 'low';
  coordinates: RelocationCoordinates | null;
  natalTimezone: string | null;
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
    confidence: 'normal' | 'low';
  };
}

export const relocationActive = (mode: RelocationMode): boolean => runtime.relocationActive(mode);

export const relocationDisclosure = (
  mode: RelocationMode,
  label?: string | null,
): string => runtime.relocationDisclosure(mode, label);

export const summarizeRelocation = (ctx: ReportContext): RelocationSummary =>
  runtime.summarizeRelocation(ctx) as RelocationSummary;

export const formatHouseContrast = (
  symbol: string,
  natalHouse: number,
  relocatedHouse: number,
): string => runtime.formatHouseContrast(symbol, natalHouse, relocatedHouse);

export const detectRelocation = (raw: unknown): boolean => runtime.detectRelocation(raw);

// --- Time precision helpers (UI ↔ server contract) ---
export type TimePrecision = 'exact' | 'unknown' | 'noon_fallback' | 'range_scan';

export interface TimePolicy {
  birth_time_known: boolean;
  time_precision: TimePrecision;
  effective_time_used?: string;
  houses_suppressed: boolean;
}

export const isTimeUnknown = (s?: SubjectUI): boolean => runtime.isTimeUnknown(s);

export const deriveTimePolicy = (
  s?: SubjectUI,
  choice?: 'planetary_only' | 'whole_sign' | 'scan',
): TimePolicy => runtime.deriveTimePolicy(s, choice) as TimePolicy;
