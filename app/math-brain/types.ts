export type ReportContractType =
  | 'solo_mirror'
  | 'solo_balance_meter'
  | 'relational_mirror'
  | 'relational_balance_meter';

export type ReportMode =
  | 'NATAL_ONLY'
  | 'NATAL_TRANSITS'
  | 'SYNASTRY'
  | 'SYNASTRY_TRANSITS'
  | 'COMPOSITE'
  | 'COMPOSITE_TRANSITS';

export type TranslocationOption =
  | 'NONE'
  | 'A_NATAL'
  | 'A_LOCAL'
  | 'B_NATAL'
  | 'B_LOCAL'
  | 'BOTH_LOCAL'
  | 'MIDPOINT';

export type TimePolicyChoice =
  | 'planetary_only'
  | 'whole_sign'
  | 'sensitivity_scan'
  | 'user_provided';

export type Subject = {
  name: string;
  year: number | string;
  month: number | string;
  day: number | string;
  hour: number | string;
  minute: number | string;
  city: string;
  state: string;
  nation?: string;
  latitude: number | string;
  longitude: number | string;
  timezone: string;
  zodiac_type: 'Tropic' | 'Sidereal' | string;
};

/**
 * AstroAPI v3 birth_data structure
 * Used in nested subject payloads for the new API
 */
export interface BirthDataV3 {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
  // Location: Use coordinates OR city+country_code (not both)
  latitude?: number;
  longitude?: number;
  timezone?: string;  // IANA format: "America/New_York", "Europe/London"
  city?: string;
  country_code?: string;  // ISO 2-letter: "US", "GB", "DE"
}

/**
 * AstroAPI v3 subject structure
 */
export interface SubjectV3 {
  name: string;
  birth_data: BirthDataV3;
}

/**
 * AstroAPI v3 date structure for date_range
 */
export interface DateV3 {
  year: number;
  month: number;
  day: number;
}

/**
 * AstroAPI v3 date_range for transit requests
 * Allows requesting up to 90+ days in a single call
 */
export interface DateRangeV3 {
  start_date: DateV3;
  end_date: DateV3;
}

/**
 * AstroAPI v3 chart options
 */
export interface ChartOptionsV3 {
  house_system: 'P' | 'W' | 'K' | 'E' | 'C' | 'R' | 'O' | 'M' | 'B' | 'A';
  zodiac_type: 'Tropic' | 'Sidereal';
  active_points?: string[];
  precision?: number;
}

/**
 * AstroAPI v3 natal-transits request payload
 */
export interface NatalTransitsRequestV3 {
  subject: SubjectV3;
  date_range: DateRangeV3;
  options?: ChartOptionsV3;
}

/**
 * AstroAPI v3 synastry request payload
 */
export interface SynastryRequestV3 {
  subject1: SubjectV3;
  subject2: SubjectV3;
  options?: ChartOptionsV3;
}

/**
 * AstroAPI v3 relocation request payload
 */
export interface RelocationRequestV3 {
  subject: SubjectV3;
  target_location: {
    latitude: number;
    longitude: number;
    timezone?: string;
  };
  options?: ChartOptionsV3;
}

export interface RelocationStatus {
  effectiveMode: TranslocationOption;
  notice: string | null;
}

export interface RelocationOptionConfig {
  value: TranslocationOption;
  disabled?: boolean;
  title?: string;
}

export interface ModeOption {
  value: ReportMode;
  label: string;
}

// ============================================================
// RESONANCE SEISMOGRAPH TYPES (Synastry + Transits)
// ============================================================

/**
 * Individual day's resonance data for relational weather
 */
export interface ResonanceDailyEntry {
  date: string;
  magnitude: number;         // 0-5, clamped
  directional_bias: number;  // -5 to +5
  volatility: number;        // 0-5, clamped
  flags: {
    is_resonance_day: boolean;
    is_divergent: boolean;
    resonance_source: string[];
  };
  individual: {
    personA: { magnitude: number; bias: number };
    personB: { magnitude: number; bias: number };
  };
}

/**
 * Corpus-compliant seismograph entry
 * Used in daily_entries for SST bridge requirements
 */
export interface CorpusSeismographEntry {
  magnitude: number;      // 0-5
  valence: number;        // -5 to +5 (CORPUS REQUIREMENT: mapped from directional_bias)
  volatility: number;     // 0-5
}

/**
 * Corpus-compliant resonance flags
 * Provides geometric evidence for WB/ABE/OSR narrative selection
 */
export interface CorpusResonanceFlags {
  divergence: boolean;           // ABE tension indicator
  shared_geometry: string[];     // WB potential evidence (e.g., "Sun_conjunct_Venus")
}

/**
 * Corpus-compliant daily entry for synastry-transits
 */
export interface CorpusDailyEntry {
  date: string;
  seismograph: CorpusSeismographEntry;
  resonance_flags: CorpusResonanceFlags;
}

/**
 * Full Corpus-compliant payload for synastry-transits report
 * This is the schema the Raven Calder Corpus is written to ingest.
 * 
 * @see Raven_Calder_config_Updated.yaml
 */
export interface CorpusSynastryTransitsPayload {
  // === GOLDEN HANDSHAKE: Mandatory root metadata ===
  _format: 'mirror-symbolic-weather-v1';
  _poetic_brain_compatible: true;
  _natal_section?: boolean;
  
  report_type: 'synastry-transits';
  
  // === SUBJECTS ===
  subjects: {
    person_a: { name?: string; birth_data: Partial<Subject> };
    person_b: { name?: string; birth_data: Partial<Subject> };
  };
  
  // === RELATIONSHIP CONTEXT ===
  relationship_context?: {
    type?: string;         // PARTNER, FRIEND, FAMILY, etc.
    intimacy_tier?: string; // P1, P2, P3, etc.
    scope?: string;
  };
  
  // === ANGLE DRIFT GUARDRAIL ===
  context: {
    angle_drift_alert: boolean;
    house_system: string;
  };
  
  // === CORPUS-COMPLIANT DAILY ENTRIES ===
  daily_entries: CorpusDailyEntry[];
  
  // === PROVENANCE ===
  provenance: {
    math_brain_version: string;
    generation_timestamp: string;
    angle_drift_alert: boolean;
    person_a?: string;
    person_b?: string;
    window?: { start: string; end: string };
    terrain?: {
      hot_degrees: number[];
      hot_degrees_count: number;
      synastry_aspects_used: number;
    };
  };
  
  // === SUMMARY STATS ===
  summary?: {
    peak_resonance_day: string | null;
    peak_magnitude: number;
    avg_magnitude: number;
    divergence_days: number;
    resonance_events_count: number;
    total_days: number;
  };
}

/**
 * @deprecated Use CorpusSynastryTransitsPayload instead
 * Legacy payload format - retained for backwards compatibility
 */
export interface ResonanceSeismographPayload {
  report_type: 'synastry-transits';
  date_range: { start: string; end: string };
  
  /** The merged relational weather graph */
  resonance_seismograph: ResonanceDailyEntry[];
  
  /** Summary statistics */
  summary: {
    peak_resonance_day: string | null;
    peak_magnitude: number;
    avg_magnitude: number;
    divergence_days: number;
    resonance_events_count: number;
    total_days: number;
  };
  
  /** Synastry terrain info (the "map" behind the weather) */
  synastry_terrain: {
    hot_degrees_count: number;
    synastry_aspects_used: number;
    dominant_themes?: string[];
  };
  
  /** Standard provenance */
  provenance?: {
    house_system: string;
    orbs_profile: string;
    math_brain_version: string;
    engine_versions?: Record<string, string>;
  };
}

/**
 * Synastry aspect from API response
 */
export interface SynastryAspectV3 {
  p1_planet: string;
  p2_planet: string;
  aspect: string;
  orb: number;
  degree_a?: number;
  degree_b?: number;
}
