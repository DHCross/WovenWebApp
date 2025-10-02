/**
 * WOVEN MAP BLUEPRINT - THE JSON CONTRACT
 *
 * This is the canonical interface between Math Brain and Poetic Brain.
 *
 * THE TWO-MIND ARCHITECTURE:
 * - Math Brain builds the instrument (calculates, normalizes, structures)
 * - Poetic Brain plays the instrument (interprets, reflects, voices)
 * - This JSON is the score (complete, self-describing, sufficient)
 *
 * VERSION CONTROL:
 * - All changes to this contract MUST be versioned
 * - Math Brain outputs this structure
 * - Poetic Brain consumes this structure
 * - No architectural logic crosses this boundary
 */

// ============================================================================
// PROVENANCE - Where the data came from, how it was made
// ============================================================================

export interface ProvenanceBlock {
  source: string;                    // e.g., "MathBrain", "mock", "cache"
  engine: string;                    // e.g., "Astrologer API v4"
  version: string;                   // e.g., "1.3.0"
  schema_version: string;            // e.g., "WM-Chart-1.3-lite"
  generated_at: string;              // ISO timestamp
  timezone: string;                  // IANA timezone used for calculations
  houses_disclosure: string;         // Human-readable: "Houses recalculated: A_local" or "Houses natal"
  relocation_frames?: {              // Which charts were relocated
    a?: string;                      // e.g., "A_local", "A_natal"
    b?: string;                      // e.g., "B_local", "B_natal"
  };
  calculation_notes?: string;        // Any warnings or special conditions
}

// ============================================================================
// CONTEXT - What kind of reading, what lens is active
// ============================================================================

export type ContractMode =
  | 'solo_mirror'                    // Natal only
  | 'solo_balance_meter'             // Natal + transits
  | 'relational_mirror'              // Synastry (no transits)
  | 'relational_balance_meter';      // Synastry + transits

export interface TranslocationContext {
  applies: boolean;                  // Is relocation active?
  method: string;                    // e.g., "A_local", "Both_local", "Midpoint"
  houses_basis: 'natal' | 'relocation'; // Which coordinates were used for houses
  disclosure: string;                // Human-readable explanation
  current_location?: string;         // e.g., "Tokyo, Japan"
  coords?: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
}

export interface ContextBlock {
  mode: ContractMode;                // The report contract type
  person_a?: {                       // Person A metadata
    name: string;
    birth_date: string;
    birth_time: string;
    birth_place: string;
  };
  person_b?: {                       // Person B metadata (if relational)
    name: string;
    birth_date: string;
    birth_time: string;
    birth_place: string;
  };
  translocation: TranslocationContext;
  relationship_type?: string;        // e.g., "romantic", "familial", "professional"
  time_window?: {                    // For Balance Meter reports
    start_date: string;
    end_date: string;
    step_days: number;
  };
}

// ============================================================================
// CHART DATA - Positions, aspects, houses, transits
// ============================================================================

export interface PlanetaryPosition {
  planet: string;                    // e.g., "Sun", "Moon", "Mars"
  longitude: number;                 // Ecliptic longitude 0-360°
  latitude?: number;                 // Ecliptic latitude
  sign: string;                      // e.g., "Aries", "Taurus"
  degree: number;                    // Degree within sign 0-30
  house: number;                     // House placement 1-12
  retrograde: boolean;
  speed?: number;                    // Daily motion in degrees
}

export interface Aspect {
  planet1: string;
  planet2: string;
  aspect_type: string;               // e.g., "conjunction", "trine", "square"
  orb: number;                       // Orb in degrees
  applying: boolean;                 // Aspect getting tighter?
  exact_angle: number;               // Theoretical exact angle (0, 60, 90, etc.)
  actual_angle: number;              // Actual angle between planets
  weight?: number;                   // Calculated intensity/significance
}

export interface HouseCusp {
  house: number;                     // 1-12
  longitude: number;                 // Ecliptic longitude of cusp
  sign: string;                      // Sign on cusp
}

export interface TransitReading {
  date: string;                      // ISO date
  magnitude: number;                 // 0-5 scale
  valence: number;                   // -5 to +5 scale
  volatility: number;                // 0-5 scale
  magnitude_label?: string;          // e.g., "Active", "Surge"
  valence_label?: string;            // e.g., "Supportive", "Challenging"
  volatility_label?: string;         // e.g., "Stable", "Scattered"
  aspects?: Aspect[];                // Transit aspects for this date
  seismograph?: {                    // Raw seismograph data
    support: number;
    friction: number;
    sfd_cont: number;
  };
}

export interface ChartData {
  meta: {
    birth_time_known: boolean;
    time_precision: 'exact' | 'approximate' | 'noon_default' | 'unknown';
    houses_suppressed: boolean;
    effective_time_used?: string;
  };
  details: {
    name: string;
    birth_date: string;
    birth_time: string;
    birth_location: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  chart: {
    positions: PlanetaryPosition[];
    aspects: Aspect[];
    houses?: HouseCusp[];            // May be null if time unknown
    house_system?: string;           // e.g., "Placidus", "Whole Sign"
    ascendant?: number;              // ASC degree
    midheaven?: number;              // MC degree
    transitsByDate?: Record<string, TransitReading>; // Only for Balance Meter
  };
  derived?: {
    seismograph_summary?: {          // Overall summary for time window
      magnitude: number;
      magnitude_label: string;
      valence: number;
      valence_bounded: number;
      valence_label: string;
      volatility: number;
      volatility_label: string;
      peak_dates?: string[];
    };
    polarity_scores?: Record<string, number>; // Support vs Friction analysis
  };
}

// ============================================================================
// RELATIONAL DATA - Synastry, composite (if applicable)
// ============================================================================

export interface SynastryAspect extends Aspect {
  person_a_planet: string;
  person_b_planet: string;
  aspect_class: 'support' | 'friction' | 'neutral';
}

export interface RelationalData {
  synastry_aspects?: SynastryAspect[];
  composite_chart?: {
    positions: PlanetaryPosition[];
    aspects: Aspect[];
  };
  support_friction_differential?: {
    support_score: number;
    friction_score: number;
    sfd: number;                     // Normalized -1 to +1
    interpretation: string;
  };
}

// ============================================================================
// THE COMPLETE BLUEPRINT - What Poetic Brain receives
// ============================================================================

export interface WovenMapBlueprint {
  // Metadata about the calculation
  provenance: ProvenanceBlock;

  // What kind of reading and what lens
  context: ContextBlock;

  // Person A chart (always present)
  person_a: ChartData;

  // Person B chart (only if relational)
  person_b?: ChartData;

  // Relational analysis (only if relational)
  relational?: RelationalData;

  // Additional narrative hooks (optional)
  narrative_hooks?: {
    dominant_elements?: string[];    // e.g., ["Fire", "Water"]
    key_polarities?: string[];       // e.g., ["independence-connection", "action-rest"]
    primary_tension?: string;        // Main theme
  };

  // Data tables for reference (optional, for comprehensive analysis)
  data_tables?: {
    natal_positions?: any[];
    natal_aspects?: any[];
    person_b_positions?: any[];
    synastry_aspects?: any[];
    daily_readings?: any[];
  };
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function isBalanceMeter(blueprint: WovenMapBlueprint): boolean {
  return blueprint.context.mode.includes('balance_meter');
}

export function isRelational(blueprint: WovenMapBlueprint): boolean {
  return blueprint.context.mode.includes('relational');
}

export function hasRelocation(blueprint: WovenMapBlueprint): boolean {
  return blueprint.context.translocation.applies;
}

export function getRelocationDisclosure(blueprint: WovenMapBlueprint): string | null {
  return blueprint.context.translocation.applies
    ? blueprint.context.translocation.disclosure
    : null;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isWovenMapBlueprint(obj: any): obj is WovenMapBlueprint {
  return (
    obj &&
    typeof obj === 'object' &&
    'provenance' in obj &&
    'context' in obj &&
    'person_a' in obj &&
    obj.context?.mode !== undefined
  );
}

// ============================================================================
// THE CONTRACT OATH
// ============================================================================

/**
 * THE TWO-MIND ARCHITECTURE OATH
 *
 * Math Brain's Promise:
 * "I will give you a perfect, complete, self-describing WovenMapBlueprint.
 * You will never need to know how I made it. If relocation was applied,
 * you'll see houses_basis: 'relocation' and a clear disclosure.
 * Trust the data."
 *
 * Poetic Brain's Promise:
 * "I will read only the WovenMapBlueprint you give me. I will never calculate,
 * transform, or fetch additional data. I will translate the geometry into
 * resonant language following the contract. The voice emerges from the
 * blueprint alone."
 *
 * The JSON's Promise:
 * "I am the complete score. I contain everything needed for the performance.
 * I am the interface between the architect and the interpreter.
 * I am sufficient."
 */
