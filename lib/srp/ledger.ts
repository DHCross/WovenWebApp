/**
 * SRP Light Ledger (LsG) - 144 Blends of Constructive Resonance
 * 
 * Generated from the 12x12 Driver × Manner matrix.
 * Each blend represents a testable symbolic pattern.
 * 
 * Note: This is a minimal subset for Phase 1 proof-of-concept.
 * Full 144-entry ledger to be populated from codex.
 */

import type { LightBlend, ShadowBlend } from './types';

/**
 * Light Ledger: 144 blends (Driver × Manner)
 * Format: [Driver Sign × Manner Sign]
 * 
 * Example: Blend 1 = Aries (Initiate) × Aries (Initiate)
 */
export const LIGHT_LEDGER: Record<number, LightBlend> = {
  // Fire × Fire blends
  1: {
    id: 1,
    driver: 'Aries',
    driverVerb: 'initiate',
    manner: 'Aries',
    mannerVerb: 'initiate',
    hingePhrase: 'Fervent Flame: Initiating the Initiate',
    elementWeave: 'Fire-Fire',
    sampleVoice: 'Speaks in surges boldly, words Initiate Initiate that stir the core\'s rhythm like Fire-Fire weaves. Relates forthrightly with inspiring presence, motivated by initiates that initiate without fracture. Under strain, initiates surgesly, echoing Fervent Flame: Initiateing Initiate in quiet resolve.',
    auditNotes: 'Pure cardinal fire; impulse meets impulse'
  },
  
  5: {
    id: 5,
    driver: 'Aries',
    driverVerb: 'initiate',
    manner: 'Leo',
    mannerVerb: 'validate',
    hingePhrase: 'Fervent Flame: Initiating Validation',
    elementWeave: 'Fire-Fire',
    sampleVoice: 'Speaks in surges boldly, words Initiate Validate that stir the core\'s rhythm like Fire-Fire weaves. Relates forthrightly with inspiring presence, motivated by initiates that validate without fracture. Under strain, validates holdsly, echoing Fervent Flame: Initiateing Validate in quiet resolve.',
  },

  9: {
    id: 9,
    driver: 'Aries',
    driverVerb: 'initiate',
    manner: 'Sagittarius',
    mannerVerb: 'inspire',
    hingePhrase: 'Fervent Flame: Initiateing Inspire',
    elementWeave: 'Fire-Fire',
    sampleVoice: 'Speaks in surges boldly, words Initiate Inspire that stir the core\'s rhythm like Fire-Fire weaves. Relates forthrightly with inspiring presence, motivated by initiates that inspire without fracture. Under strain, inspires flowsly, echoing Fervent Flame: Initiateing Inspire in quiet resolve.',
  },

  // Fire × Earth blends
  2: {
    id: 2,
    driver: 'Aries',
    driverVerb: 'initiate',
    manner: 'Taurus',
    mannerVerb: 'stabilize',
    hingePhrase: 'Grounded Blaze: Initiateing Stabilize',
    elementWeave: 'Fire-Earth',
    sampleVoice: 'Speaks in surges boldly, words Initiate Stabilize that stir the core\'s rhythm like Fire-Earth weaves. Relates loyally with protective anchors, motivated by initiates that stabilize without fracture. Under strain, stabilizes holdsly, echoing Grounded Blaze: Initiateing Stabilize in quiet resolve.',
  },

  // Earth × Earth blends
  14: {
    id: 14,
    driver: 'Taurus',
    driverVerb: 'stabilize',
    manner: 'Taurus',
    mannerVerb: 'stabilize',
    hingePhrase: 'Solid Core: Stabilizeing Stabilize',
    elementWeave: 'Earth-Earth',
    sampleVoice: 'Speaks in holds steadfastly, words Stabilize Stabilize that stir the core\'s rhythm like Earth-Earth weaves. Relates loyally with protective anchors, motivated by stabilizes that stabilize without fracture. Under strain, stabilizes holdsly, echoing Solid Core: Stabilizeing Stabilize in quiet resolve.',
    auditNotes: 'Pure fixed earth; endurance meets endurance'
  },

  // Air × Air blends
  27: {
    id: 27,
    driver: 'Gemini',
    driverVerb: 'connect',
    manner: 'Gemini',
    mannerVerb: 'connect',
    hingePhrase: 'Whirling Thought: Connecting Connect',
    elementWeave: 'Air-Air',
    sampleVoice: 'Speaks in flows adaptively, words Connect Connect that stir the core\'s rhythm like Air-Air weaves. Relates sociably with detached poise, motivated by connects that connect without fracture. Under strain, connects flowsly, echoing Whirling Thought: Connecting Connect in quiet resolve.',
  },

  // Water × Water blends
  40: {
    id: 40,
    driver: 'Cancer',
    driverVerb: 'nurture',
    manner: 'Cancer',
    mannerVerb: 'nurture',
    hingePhrase: 'Oceanic Depth: Nurtureing Nurture',
    elementWeave: 'Water-Water',
    sampleVoice: 'Speaks in surges boldly, words Nurture Nurture that stir the core\'s rhythm like Water-Water weaves. Relates compassionately with private depths, motivated by nurtures that nurture without fracture. Under strain, nurtures surgesly, echoing Oceanic Depth: Nurtureing Nurture in quiet resolve.',
  },

  // Cross-element examples
  119: {
    id: 119,
    driver: 'Capricorn',
    driverVerb: 'architect',
    manner: 'Aquarius',
    mannerVerb: 'reform',
    hingePhrase: 'Stable Breeze: Architecting Reform',
    elementWeave: 'Earth-Air',
    sampleVoice: 'Speaks in surges boldly, words Architect Reform that stir the core\'s rhythm like Earth-Air weaves. Relates sociably with detached poise, motivated by architects that reform without fracture. Under strain, reforms holdsly, echoing Stable Breeze: Architecting Reform in quiet resolve.',
    auditNotes: 'Innovation meets structure; the Conductive Keep of PSS lore'
  },

  // TODO: Populate remaining 136 blends from codex
  // Pattern: id = ((driver_index - 1) * 12) + manner_index
  // where Aries=1, Taurus=2, ..., Pisces=12
};

/**
 * Shadow Ledger (ShA) - 144 Inversions
 * 
 * Each shadow blend is the entropic twin of its light counterpart.
 * Format: originBlendId + 'R' (e.g., "1R" is shadow of blend 1)
 */
export const SHADOW_LEDGER: Record<string, ShadowBlend> = {
  '1R': {
    id: '1R',
    originBlendId: 1,
    fracturePhrase: 'Smoldering Void: Incinerateing Incinerate',
    shadowVoice: 'Speaks in charred surges, words that scar rather than spark, devouring their own rhythm. Under strain, assertion collapses into manic burnout.',
    auditPolarity: { abe: 8, wb: 1, osr: 1 },
    restorationCue: 'Name the void; allow a single unburnt thread to weave back to fervent initiation.',
    collapseMode: 'self-devouring'
  },

  '14R': {
    id: '14R',
    originBlendId: 14,
    fracturePhrase: 'Calcified Crypt: Entombing Entomb',
    shadowVoice: 'Speaks in unmoving vaults, words that crush their own resonance. Structure hardens into tyranny; stillness into death.',
    auditPolarity: { abe: 8, wb: 1, osr: 1 },
    restorationCue: 'Name the crypt; allow a softening root to fissure the calcify toward solid core.',
    collapseMode: 'custody'
  },

  '119R': {
    id: '119R',
    originBlendId: 119,
    fracturePhrase: 'Entombed Ideal',
    shadowVoice: 'The Architect seals the Keep against the Air, preserving order through exclusion. Ideas circle but cannot land. Reform becomes simulation.',
    auditPolarity: { abe: 6, wb: 2, osr: 2 },
    restorationCue: 'Name the seal; ground the current—the Keep reopens when stone touches wind without fear.',
    collapseMode: 'exclusion'
  },

  // TODO: Populate remaining 141 shadow blends
};

/**
 * Helper: Get light blend by ID
 */
export function getLightBlend(id: number): LightBlend | null {
  return LIGHT_LEDGER[id] || null;
}

/**
 * Helper: Get shadow blend by origin ID
 */
export function getShadowBlend(originId: number): ShadowBlend | null {
  const shadowId = `${originId}R`;
  return SHADOW_LEDGER[shadowId] || null;
}

/**
 * Helper: Get shadow restoration cue
 */
export function getRestorationCue(originId: number): string | null {
  const shadow = getShadowBlend(originId);
  return shadow?.restorationCue || null;
}

/**
 * Helper: Check if blend exists in ledger
 */
export function hasLightBlend(id: number): boolean {
  return id in LIGHT_LEDGER;
}

/**
 * Helper: Check if shadow exists in ledger
 */
export function hasShadowBlend(originId: number): boolean {
  return `${originId}R` in SHADOW_LEDGER;
}

/**
 * Zodiac sign index (1-12)
 */
export const ZODIAC_INDEX: Record<string, number> = {
  'Aries': 1,
  'Taurus': 2,
  'Gemini': 3,
  'Cancer': 4,
  'Leo': 5,
  'Virgo': 6,
  'Libra': 7,
  'Scorpio': 8,
  'Sagittarius': 9,
  'Capricorn': 10,
  'Aquarius': 11,
  'Pisces': 12,
};

/**
 * Calculate blend ID from driver/manner signs
 * Formula: ((driver_index - 1) * 12) + manner_index
 */
export function calculateBlendId(driver: string, manner: string): number | null {
  const driverIdx = ZODIAC_INDEX[driver];
  const mannerIdx = ZODIAC_INDEX[manner];
  
  if (!driverIdx || !mannerIdx) return null;
  
  return ((driverIdx - 1) * 12) + mannerIdx;
}
