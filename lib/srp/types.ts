/**
 * Symbolic Resonance Protocol (SRP) Type Definitions
 *
 * Core types for the 288+ fold resonance ecology:
 * - LsG (Light Ledger): 144 blends of constructive resonance
 * - ShA (Shadow Annex): 144 blends of entropic resonance
 * - PSS (Post-Shadow Series): Meta-ledger of self-referential resonance
 */

// Zodiac archetypes as Driver impulses
export type ZodiacDriver =
  | 'Aries'      // Initiate (Fire/Cardinal)
  | 'Taurus'     // Stabilize (Earth/Fixed)
  | 'Gemini'     // Connect (Air/Mutable)
  | 'Cancer'     // Nurture (Water/Cardinal)
  | 'Leo'        // Validate (Fire/Fixed)
  | 'Virgo'      // Optimize (Earth/Mutable)
  | 'Libra'      // Harmonize (Air/Cardinal)
  | 'Scorpio'    // Probe (Water/Fixed)
  | 'Sagittarius' // Inspire (Fire/Mutable)
  | 'Capricorn'  // Architect (Earth/Cardinal)
  | 'Aquarius'   // Reform (Air/Fixed)
  | 'Pisces';    // Empathize (Water/Mutable)

// Verb forms for each driver
export type DriverVerb =
  | 'initiate' | 'stabilize' | 'connect' | 'nurture'
  | 'validate' | 'optimize' | 'harmonize' | 'probe'
  | 'inspire' | 'architect' | 'reform' | 'empathize';

// Element + Modality combinations
export type Element = 'Fire' | 'Earth' | 'Air' | 'Water';
export type Modality = 'Cardinal' | 'Fixed' | 'Mutable';

// Resonance audit states (already in use)
export type ResonanceState = 'WB' | 'ABE' | 'OSR';

// Light Ledger blend (1-144)
export interface LightBlend {
  id: number;
  driver: ZodiacDriver;
  driverVerb: DriverVerb;
  manner: ZodiacDriver;
  mannerVerb: DriverVerb;
  hingePhrase: string;
  elementWeave: string; // e.g., "Fire-Fire", "Earth-Water"
  sampleVoice: string;
  auditNotes?: string;
}

// Shadow Annex blend (1R-144R)
export interface ShadowBlend {
  id: string; // e.g., "1R", "14R"
  originBlendId: number;
  fracturePhrase: string;
  shadowVoice: string;
  auditPolarity: {
    abe: number;
    wb: number;
    osr: number;
  };
  restorationCue: string;
  collapseMode?: string; // e.g., "self-devouring", "custody"
}

// Post-Shadow Series entry (145+)
export interface PSSEntry {
  id: number;
  eventClass: 'FSE' | 'RPA' | 'PSE'; // Stasis, Loop, Flow
  originBlendId: number;
  falsificationType: string;
  hingePhrase: string;
  revisedVoice: string;
  auditPolarity: {
    abe: number;
    wb: number;
    osr: number;
  };
  interpretation: string;
  ledgerStatus?: 'active' | 'resolved';
}

// Compact blend reference for payload enrichment
export interface SRPBlendRef {
  blendId: number;
  hingePhrase: string;
  elementWeave: string;
  driver: ZodiacDriver;
  manner: ZodiacDriver;
}

// Shadow cue reference
export interface SRPShadowRef {
  shadowId: string; // e.g., "1R"
  fracturePhrase: string;
  restorationCue: string;
  collapseMode?: string;
}

// PSS reference
export interface SRPPSSRef {
  pssId: number;
  eventClass: 'FSE' | 'RPA' | 'PSE';
  interpretation: string;
}

// Mapper result (what gets attached to hooks)
export interface SRPEnrichment {
  blendId?: number;
  hingePhrase?: string;
  elementWeave?: string;
  shadowRef?: SRPShadowRef;
  pssRef?: SRPPSSRef;
}

/**
 * Helper to determine if a blend ID is valid
 */
export function isValidBlendId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= 144;
}

/**
 * Helper to parse shadow ID
 */
export function parseShadowId(shadowId: string): number | null {
  const match = shadowId.match(/^(\d+)R$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Helper to create shadow ID from blend ID
 */
export function toShadowId(blendId: number): string {
  return `${blendId}R`;
}

/**
 * Helper to determine PSS event class from audit polarity
 */
export function inferPSSEventClass(osr: number, abe: number): 'FSE' | 'RPA' | 'PSE' {
  if (osr === 0 && abe <= 2) return 'PSE'; // Resolved
  if (osr >= 1 && abe >= 4) return 'RPA'; // Loop
  return 'FSE'; // Stasis
}
