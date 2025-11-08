/**
 * Safe Lexicon System - Valence and Magnitude mappings
 * Extracted from legacy index.html for reuse
 * All terms use neutral, falsifiable language
 */

/**
 * Negative Valence Types (🌑)
 * When energy pulls down, contracts, destabilizes
 */
export const NEGATIVE_VALENCE_TYPES = {
  RECURSION_PULL: {
    emoji: '♾️',
    name: 'Recursion Pull',
    description: 'Old cycles resurface; déjà vu gravity.',
    field: 'cyclic pull, familiar weight'
  },
  FRICTION_CLASH: {
    emoji: '⚔️',
    name: 'Friction Clash',
    description: 'Mars-style conflict, arguments, accidents, heat.',
    field: 'friction heat, clash pressure'
  },
  CROSS_CURRENT: {
    emoji: '↔️',
    name: 'Cross Current',
    description: 'Competing priorities, mixed flows, confusion.',
    field: 'cross-pull tension, scattered direction'
  },
  FOG_DISSOLUTION: {
    emoji: '🌫️',
    name: 'Fog / Dissolution',
    description: 'Blurred boundaries, scattered signal.',
    field: 'boundary blur, dissolving edges'
  },
  PRESSURE_ERUPTION: {
    emoji: '🌋',
    name: 'Pressure / Eruption',
    description: 'Compression that forces release.',
    field: 'compression heat, eruption pressure'
  },
  SATURN_WEIGHT: {
    emoji: '⏳',
    name: 'Saturn Weight',
    description: 'Heaviness, delay, endurance tests.',
    field: 'heavy drag, delay pressure'
  },
  FRAGMENTATION: {
    emoji: '🧩',
    name: 'Fragmentation',
    description: 'Fractured focus, scatter.',
    field: 'fractured pull, scattered attention'
  },
  ENTROPY_DRIFT: {
    emoji: '🕳️',
    name: 'Entropy Drift',
    description: 'Inertia, slow leak of momentum.',
    field: 'inertia weight, slow drain'
  }
};

/**
 * Positive Valence Types (🌞)
 * When energy uplifts, harmonizes, expands
 */
export const POSITIVE_VALENCE_TYPES = {
  FERTILE_FIELD: {
    emoji: '🌱',
    name: 'Fertile Field',
    description: 'Growth, new opportunities, creativity sprouts.',
    field: 'growth pull, opening ease'
  },
  HARMONIC_RESONANCE: {
    emoji: '✨',
    name: 'Harmonic Resonance',
    description: 'Trines/sextiles, things click, natural flow.',
    field: 'flowing ease, harmonic click'
  },
  EXPANSION_LIFT: {
    emoji: '💎',
    name: 'Expansion Lift',
    description: 'Jupiter blessing, confidence, abundance.',
    field: 'expansive lift, confidence ease'
  },
  COMBUSTION_CLARITY: {
    emoji: '🔥',
    name: 'Combustion Clarity',
    description: 'Pressure breaks but reveals hidden truth, sudden insight.',
    field: 'clarity burn, breakthrough pressure'
  },
  LIBERATION_RELEASE: {
    emoji: '🦋',
    name: 'Liberation / Release',
    description: 'Uranian breakthroughs, freedom, change feels fresh.',
    field: 'liberation snap, release ease'
  },
  INTEGRATION: {
    emoji: '⚖️',
    name: 'Integration',
    description: 'Opposites reconcile; balance returns.',
    field: 'balance pull, reconciliation ease'
  },
  FLOW_TIDE: {
    emoji: '🌊',
    name: 'Flow Tide',
    description: 'Ease, adaptability, emotions moving freely.',
    field: 'flow ease, adaptive current'
  },
  VISIONARY_SPARK: {
    emoji: '🌈',
    name: 'Visionary Spark',
    description: 'Inspiration, Neptune dream turned into art, spiritual elevation.',
    field: 'visionary lift, dream clarity'
  }
};

/**
 * Magnitude Scale (0-5)
 * Neutral intensity markers - no judgment on direction
 */
export const MAGNITUDE_SCALE = {
  0: { label: 'Whisper', emoji: '・', description: 'Barely perceptible symbolic pressure' },
  1: { label: 'Pulse', emoji: '◦', description: 'Subtle background hum' },
  2: { label: 'Wave', emoji: '〜', description: 'Noticeable current' },
  3: { label: 'Surge', emoji: '≈', description: 'Strong presence' },
  4: { label: 'Peak', emoji: '⚡', description: 'Commanding attention' },
  5: { label: 'Apex', emoji: '⚡⚡', description: 'Maximum symbolic intensity' }
};

/**
 * Volatility Indicators
 * Distribution pattern of symbolic pressure
 */
export const VOLATILITY_SCALE = {
  LOW: { label: 'Steady', emoji: '━', description: 'Concentrated, sustained pressure' },
  MEDIUM: { label: 'Variable', emoji: '≈', description: 'Alternating intensity' },
  HIGH: { label: 'Stormy', emoji: '🌪️', description: 'Scattered, unpredictable surges' }
};

/**
 * Get valence type from aspect characteristics
 * @param {Object} aspect - Aspect data
 * @returns {Object|null} Valence type object or null
 */
export function getValenceType(aspect) {
  const aspectType = aspect.aspect?.toLowerCase();
  
  // Positive aspect types
  if (aspectType === 'trine' || aspectType === 'sextile') {
    return POSITIVE_VALENCE_TYPES.HARMONIC_RESONANCE;
  }
  
  // Negative aspect types
  if (aspectType === 'square') {
    return NEGATIVE_VALENCE_TYPES.FRICTION_CLASH;
  }
  
  if (aspectType === 'opposition') {
    return NEGATIVE_VALENCE_TYPES.CROSS_CURRENT;
  }
  
  // Conjunction needs context (can be either)
  if (aspectType === 'conjunction') {
    // Check planets involved for clues
    const p1 = aspect.p1_name?.toLowerCase() || '';
    const p2 = aspect.p2_name?.toLowerCase() || '';
    
    if (p1.includes('saturn') || p2.includes('saturn')) {
      return NEGATIVE_VALENCE_TYPES.SATURN_WEIGHT;
    }
    if (p1.includes('neptune') || p2.includes('neptune')) {
      return NEGATIVE_VALENCE_TYPES.FOG_DISSOLUTION;
    }
    if (p1.includes('pluto') || p2.includes('pluto')) {
      return NEGATIVE_VALENCE_TYPES.PRESSURE_ERUPTION;
    }
    if (p1.includes('jupiter') || p2.includes('jupiter')) {
      return POSITIVE_VALENCE_TYPES.EXPANSION_LIFT;
    }
    if (p1.includes('uranus') || p2.includes('uranus')) {
      return POSITIVE_VALENCE_TYPES.LIBERATION_RELEASE;
    }
  }
  
  return null;
}

/**
 * Get magnitude label from numeric value
 * @param {number} magnitude - 0-5 scale
 * @returns {Object} Magnitude descriptor
 */
export function getMagnitudeDescriptor(magnitude) {
  const rounded = Math.round(Math.max(0, Math.min(5, magnitude)));
  return MAGNITUDE_SCALE[rounded];
}

/**
 * Get volatility descriptor
 * @param {number} volatility - Volatility value
 * @returns {Object} Volatility descriptor
 */
export function getVolatilityDescriptor(volatility) {
  if (volatility < 1.5) return VOLATILITY_SCALE.LOW;
  if (volatility < 3.0) return VOLATILITY_SCALE.MEDIUM;
  return VOLATILITY_SCALE.HIGH;
}
