/**
 * SST Integrity Rules - The Epistemological Backbone of The Woven Map
 * 
 * The Symbolic Spectrum Table (SST) is a diagnostic instrument providing
 * standardized grammar for classifying resonance fidelity between geometric
 * patterns (Math Brain) and lived experiences (Querent).
 * 
 * Without SST, the system risks collapsing into "metaphor soup."
 */

import type { SSTTag, SSTSource, SSTProbe } from './sst';
import type { QuerentRole } from './context-gate';

// =============================================================================
// SST CLASSIFICATION TIERS
// =============================================================================

export const SST_TIERS = {
  /** Clear resonance; experience directly reflects the archetypal configuration */
  WB: 'Within Boundary',
  /** Partial/ambiguous resonance; archetype present but manifests atypically */
  ABE: 'At Boundary Edge', 
  /** Complete lack of resonance; pattern does not apply. The system's "strongest honesty currency." */
  OSR: 'Outside Symbolic Range',
} as const;

export const SST_DESCRIPTIONS: Record<SSTTag, string> = {
  WB: 'Clear resonance confirmed by lived experience',
  ABE: 'Partial resonance—pattern present but atypical expression (inversion, tone miscalibration)',
  OSR: 'Signal void—no discernible resonance. Logged as verifiable miss.',
};

// =============================================================================
// INTEGRITY RULES
// =============================================================================

/**
 * Rule 1: The Human is the Final Authority on Resonance
 * - A "ping" is ALWAYS human-confirmed
 * - No AI can declare resonance from chart data alone
 * - The SST renders geometry TESTABLE, not fated
 */
export function isHumanConfirmed(probe: SSTProbe): boolean {
  return probe.committed === true && probe.tag !== undefined;
}

/**
 * Rule 2: Diagnosis is NOT Confirmation
 * - Geometric confidence ≠ felt experience
 * - The chart is the instrument; the person is the musician
 * - Reserve WB label until user confirms
 */
export function canAssignWB(probe: SSTProbe): boolean {
  // WB can only be assigned after human confirmation
  return probe.committed === true;
}

/**
 * Rule 3: OSR Integrity (Logging the Misses)
 * - System must preserve ability to be proven wrong
 * - OSR outcomes are verifiable data points, not failures
 * - Misses feed back into model refinement
 */
export function isValidOSR(probe: SSTProbe): boolean {
  return probe.tag === 'OSR' && probe.committed === true;
}

// =============================================================================
// DATA PROVENANCE
// =============================================================================

export interface ProvenanceMetadata {
  /** Who confirmed: the subject themselves or an outside observer */
  source: SSTSource;
  /** The querent's role in the session */
  querentRole: QuerentRole;
  /** Whose pattern is under discussion (may differ from querent) */
  subjectName?: string;
  /** ISO timestamp of confirmation */
  confirmedAt: string;
}

/**
 * Determine if this is primary (self-report) or secondary (observer) data
 */
export function isPrimarySelfReport(source: SSTSource): boolean {
  return source === 'self';
}

/**
 * Observer confirmations support map refinement but never substitute
 * for primary felt experience confirmation.
 */
export function getProvenanceWeight(source: SSTSource): number {
  return source === 'self' ? 1.0 : 0.6; // Observer data weighted at 60%
}

// =============================================================================
// SST TIMING REQUIREMENTS
// =============================================================================

export const SST_TIMING = {
  /**
   * PRE-EXPERIENCE: SST criteria must be defined before the lived outcome
   * is known, particularly for forecasts or probes. Prevents narrative bias.
   */
  preExperience: 'diagnostic_framing',
  
  /**
   * DURING SESSION: Applied immediately when querent provides feedback.
   * Tags source provenance (self vs observer).
   */
  duringSession: 'data_provenance',
  
  /**
   * POST-VALIDATION: Misses cataloged and fed back into model refinement.
   * Makes system adaptive and self-correcting.
   */
  postValidation: 'system_refinement',
} as const;

// =============================================================================
// O-INTEGRATION TRACKING
// =============================================================================

/**
 * O-Integration: When an old natal pattern that used to trigger reactivity
 * becomes "operationally silent." The OSR classification marks this
 * successful transcendence.
 */
export interface OIntegrationMarker {
  patternId: string;
  previousTag: SSTTag;
  currentTag: 'OSR';
  integrationDate: string;
  notes?: string;
}

export function isOIntegration(
  previousProbe: SSTProbe,
  currentProbe: SSTProbe
): boolean {
  // Pattern was previously resonant (WB/ABE) but now shows no resonance (OSR)
  return (
    previousProbe.tag !== 'OSR' &&
    currentProbe.tag === 'OSR' &&
    currentProbe.committed === true
  );
}

// =============================================================================
// VOICE LAYER LANGUAGE GUIDANCE
// =============================================================================

/**
 * SST classification informs Raven's language strength
 */
export function getLanguageGuidance(tag?: SSTTag): string {
  switch (tag) {
    case 'WB':
      return 'Confirmed resonance. May use slightly stronger conditional phrasing while maintaining humility.';
    case 'ABE':
      return 'Partial resonance. Use exploratory language: "Something here lands, but not quite as described..."';
    case 'OSR':
      return 'Signal void. Acknowledge the silence: "This pattern doesn\'t seem to track for you right now."';
    default:
      return 'Unconfirmed. Use maximum conditional framing: "This chart suggests..." "One expression might..."';
  }
}
