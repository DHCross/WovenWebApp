/**
 * Balance Meter Tooltip Types
 * 
 * Type definitions for the scored aspects data used in Balance Meter tooltips.
 * These types represent the seismograph output structure exposed via the
 * `include_balance_tooltips` API flag.
 * 
 * @see src/seismograph.js - Source of scored aspect calculation
 * @see docs/MANDATE_2_IMPLEMENTATION_PLAN.md - Implementation specification
 */

/**
 * A single scored aspect from the seismograph.
 * Represents one planetary geometry contributing to the Balance Meter values.
 */
export interface ScoredAspect {
  /** Transiting planet information */
  transit: {
    /** Planet name (e.g., 'Saturn', 'Jupiter', 'Mars') */
    body: string;
    /** Whether the planet is in retrograde motion */
    retrograde: boolean;
  };
  /** Natal planet information */
  natal: {
    /** Planet name (e.g., 'Moon', 'Sun', 'Venus') */
    body: string;
  };
  /** Aspect type (e.g., 'opposition', 'square', 'trine', 'sextile', 'conjunction') */
  type: AspectType;
  /** Orb in degrees - how exact the aspect is (0 = exact, higher = looser) */
  orbDeg: number;
  /** 
   * Final score after all multipliers applied.
   * Negative = restrictive/challenging, Positive = harmonious/supportive.
   * Typical range: -1.0 to +1.0, can exceed with outer planet amplification.
   */
  S: number;
  /** Optional amplification diagnostics (only present when enableDiagnostics is true) */
  _amplification?: {
    /** Score before amplification */
    before: number;
    /** Score after amplification */
    after: number;
    /** Amplification factor applied */
    factor: number;
  };
}

/**
 * Aspect types recognized by the seismograph.
 */
export type AspectType = 
  | 'conjunction'
  | 'opposition'
  | 'square'
  | 'trine'
  | 'sextile'
  | 'quincunx'
  | 'semisextile';

/**
 * Hard aspects that typically produce negative scores (restrictive energy).
 */
export const HARD_ASPECTS: AspectType[] = ['opposition', 'square'];

/**
 * Soft aspects that typically produce positive scores (harmonious energy).
 */
export const SOFT_ASPECTS: AspectType[] = ['trine', 'sextile'];

/**
 * Neutral aspects that can go either way depending on planets involved.
 */
export const NEUTRAL_ASPECTS: AspectType[] = ['conjunction', 'quincunx', 'semisextile'];

/**
 * A single day's balance tooltip data.
 */
export interface BalanceTooltipEntry {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Array of scored aspects contributing to this day's Balance Meter */
  scored_aspects: ScoredAspect[];
}

/**
 * The full balance_tooltips response shape from the Math Brain API.
 * Only present when `include_balance_tooltips: true` in request.
 */
export type BalanceTooltipsResponse = BalanceTooltipEntry[];

/**
 * Helper to check if an aspect is restrictive (hard aspect).
 */
export function isRestrictiveAspect(type: AspectType): boolean {
  return HARD_ASPECTS.includes(type);
}

/**
 * Helper to check if an aspect is harmonious (soft aspect).
 */
export function isHarmonicAspect(type: AspectType): boolean {
  return SOFT_ASPECTS.includes(type);
}

/**
 * Get the directional bias contribution from a scored aspect.
 * Negative S values contribute to "inward" bias (challenging).
 * Positive S values contribute to "outward" bias (supportive).
 */
export function getAspectBiasDirection(aspect: ScoredAspect): 'inward' | 'outward' | 'neutral' {
  if (aspect.S < -0.1) return 'inward';
  if (aspect.S > 0.1) return 'outward';
  return 'neutral';
}

/**
 * Sort scored aspects by absolute contribution (most impactful first).
 */
export function sortByImpact(aspects: ScoredAspect[]): ScoredAspect[] {
  return [...aspects].sort((a, b) => Math.abs(b.S) - Math.abs(a.S));
}

/**
 * Get the top N most impactful aspects.
 */
export function getTopDrivers(aspects: ScoredAspect[], n: number = 3): ScoredAspect[] {
  return sortByImpact(aspects).slice(0, n);
}

/**
 * Separate aspects into restrictive and harmonious groups.
 */
export function partitionByValence(aspects: ScoredAspect[]): {
  restrictive: ScoredAspect[];
  harmonious: ScoredAspect[];
  neutral: ScoredAspect[];
} {
  return {
    restrictive: aspects.filter(a => a.S < -0.1),
    harmonious: aspects.filter(a => a.S > 0.1),
    neutral: aspects.filter(a => a.S >= -0.1 && a.S <= 0.1),
  };
}

/**
 * Calculate aggregate statistics for a set of scored aspects.
 */
export function calculateAspectStats(aspects: ScoredAspect[]): {
  count: number;
  totalScore: number;
  avgScore: number;
  maxPositive: number;
  maxNegative: number;
  tightestOrb: number;
} {
  if (aspects.length === 0) {
    return {
      count: 0,
      totalScore: 0,
      avgScore: 0,
      maxPositive: 0,
      maxNegative: 0,
      tightestOrb: Infinity,
    };
  }

  const scores = aspects.map(a => a.S);
  const orbs = aspects.map(a => a.orbDeg);

  return {
    count: aspects.length,
    totalScore: scores.reduce((sum, s) => sum + s, 0),
    avgScore: scores.reduce((sum, s) => sum + s, 0) / aspects.length,
    maxPositive: Math.max(...scores, 0),
    maxNegative: Math.min(...scores, 0),
    tightestOrb: Math.min(...orbs),
  };
}
