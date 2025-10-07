// ---------- Utils ----------
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function safeNumber(value, fallback = null) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

// ---------- Orb Resolution Framework (v2.0) ----------
const ORB_RESOLUTION_PROFILES = {
  SURGICAL: {
    name: 'Surgical Weather',
    description: 'Maximum precision; only high-voltage aspects; builds cognitive trust',
    major_aspects: 3.0,
    minor_aspects: 1.0,
    luminaries: 3.0,
    planets: 2.5,
    points: 1.5,
    precision_level: 'maximum',
    signal_noise_ratio: 'high',
    diagnostic_confidence: 'strong',
    use_case: 'Hook Stack, precise diagnostics, exactness-dependent calculations'
  },

  STANDARD: {
    name: 'Standard Weather',
    description: 'Balanced precision and coverage; optimal for most Balance Meter applications',
    major_aspects: 6.0,
    minor_aspects: 3.0,
    luminaries: 6.0,
    planets: 4.0,
    points: 3.0,
    precision_level: 'high',
    signal_noise_ratio: 'balanced',
    diagnostic_confidence: 'good',
    use_case: 'Daily climate calculations, general Balance Meter reports'
  },

  ATMOSPHERIC: {
    name: 'Broad Climate',
    description: 'Extended sensitivity; captures ambient background influence over longer periods',
    major_aspects: 9.0,
    minor_aspects: 4.5,
    luminaries: 9.0,
    planets: 6.0,
    points: 4.5,
    precision_level: 'moderate',
    signal_noise_ratio: 'low',
    diagnostic_confidence: 'contextual',
    use_case: 'Long-term trend analysis, atmospheric background'
  }
};

function getOrbProfile(profileName = 'STANDARD') {
  const key = String(profileName).toUpperCase();
  return ORB_RESOLUTION_PROFILES[key] || ORB_RESOLUTION_PROFILES.STANDARD;
}

function classifyOrbIntegrity(actualOrb, profileMaxOrb) {
  const ratio = actualOrb / profileMaxOrb;
  if (ratio <= 0.33) {
    return {
      classification: 'EXACT',
      confidence_multiplier: 1.2,
      diagnostic_weight: 'maximum'
    };
  }
  if (ratio <= 0.66) {
    return {
      classification: 'TIGHT',
      confidence_multiplier: 1.1,
      diagnostic_weight: 'high'
    };
  }
  if (ratio <= 1.0) {
    return {
      classification: 'STANDARD',
      confidence_multiplier: 1.0,
      diagnostic_weight: 'normal'
    };
  }
  return {
    classification: 'REJECTED',
    confidence_multiplier: 0.0,
    diagnostic_weight: 'none'
  };
}

/**
 * calculateOrbWeight
 * Produces a numeric weight (0..1.2) and metadata based on orb closeness & aspect type.
 * aspectType: 'major' | 'minor'
 */
function calculateOrbWeight(actualOrb, aspectType = 'major', profileName = 'STANDARD', category = null) {
  const profile = getOrbProfile(profileName);

  // Pick the correct max orb by precedence: category override > major/minor
  let maxAllowed = aspectType === 'major' ? profile.major_aspects : profile.minor_aspects;
  if (category) {
    if (String(category).toLowerCase() === 'luminary') maxAllowed = profile.luminaries;
    else if (String(category).toLowerCase() === 'planet') maxAllowed = profile.planets;
    else if (String(category).toLowerCase() === 'point') maxAllowed = profile.points;
  }

  const integ = classifyOrbIntegrity(actualOrb, maxAllowed);

  // Base weight from closeness
  let weight = 0;
  if (integ.classification === 'EXACT') weight = 1.0;
  else if (integ.classification === 'TIGHT') weight = 0.85;
  else if (integ.classification === 'STANDARD') weight = 0.7;
  else weight = 0.0;

  // Slight bonus for major aspects since they carry more structure
  if (aspectType === 'major') weight *= 1.05;

  // Apply confidence multiplier (caps at ~1.26 in the best case)
  weight *= integ.confidence_multiplier;

  // Final clamp
  weight = clamp(weight, 0, 1.2);

  return {
    weight,
    classification: integ.classification,
    diagnostic_confidence: integ.diagnostic_weight
  };
}

// ---------- Directional Bias / Numinosity / Narrative Coherence ----------
const DIRECTIONAL_BIAS_LEVELS = [
  { min: -5,   max: -4,    label: 'Maximum Inward', emoji: '🔻', direction: 'inward',  code: 'max_inward',    motion: 'peak contraction; boundaries enforced strongly' },
  { min: -4,   max: -2.5,  label: 'Strong Inward',  emoji: '⬇️', direction: 'inward',  code: 'strong_inward', motion: 'substantial contraction; clear containment' },
  { min: -2.5, max: -1,    label: 'Mild Inward',    emoji: '↘️', direction: 'inward',  code: 'mild_inward',   motion: 'gentle contraction; soft boundaries' },
  { min: -1,   max: 1,     label: 'Equilibrium',    emoji: '⚖️', direction: 'neutral', code: 'equilibrium',   motion: 'no lean; forces balanced' },
  { min: 1,    max: 2.5,   label: 'Mild Outward',   emoji: '↗️', direction: 'outward', code: 'mild_outward',  motion: 'gentle extension; soft openings' },
  { min: 2.5,  max: 5.01,  label: 'Strong Outward', emoji: '⬆️', direction: 'outward', code: 'strong_outward',motion: 'substantial extension; boundaries dissolve' }
];

// Legacy valence (for backward compatibility only)
const VALENCE_LEVELS = [
  { min: -5,   max: -4,    label: 'Collapse',   emoji: '🌋', polarity: 'negative', code: 'collapse' },
  { min: -4,   max: -2.5,  label: 'Friction',   emoji: '⚔️', polarity: 'negative', code: 'friction' },
  { min: -2.5, max: -1,    label: 'Drag',       emoji: '🌪️', polarity: 'negative', code: 'drag' },
  { min: -1,   max: 1,     label: 'Equilibrium',emoji: '⚖️', polarity: 'neutral',  code: 'equilibrium' },
  { min: 1,    max: 2.5,   label: 'Flow',       emoji: '🌊', polarity: 'positive', code: 'flow' },
  { min: 2.5,  max: 5.01,  label: 'Expansion',  emoji: '🦋', polarity: 'positive', code: 'expansion' }
];

const NUMINOSITY_LEVELS = [
  { max: 0.5,      label: 'Latent',    description: 'background hum; barely detectable charge' },
  { max: 1.5,      label: 'Pulse',     description: 'gentle motifs; noticeable but subtle' },
  { max: 2.5,      label: 'Wave',      description: 'steady presence; clear symbolic pressure' },
  { max: 3.5,      label: 'Surge',     description: 'strong clustering; palpable intensity' },
  { max: 4.5,      label: 'Peak',      description: 'commanding presence; major life chapter' },
  { max: Infinity, label: 'Threshold', description: 'peak numinosity; defining transformation' }
];

// Legacy magnitude
const MAGNITUDE_LEVELS = [
  { max: 0.5,      label: 'Trace' },
  { max: 1.5,      label: 'Pulse' },
  { max: 2.5,      label: 'Wave' },
  { max: 3.5,      label: 'Surge' },
  { max: 4.5,      label: 'Peak' },
  { max: Infinity, label: 'Threshold' }
];

const NARRATIVE_COHERENCE_LEVELS = [
  { max: 1,        label: 'Single Thread',  emoji: '➿', coherence: 'high',    description: 'consistent arc; clear storyline' },
  { max: 2,        label: 'Mostly Coherent',emoji: '📖', coherence: 'good',    description: 'stable theme with minor cross-currents' },
  { max: 3,        label: 'Mixed Threads',  emoji: '🔀', coherence: 'moderate',description: 'multiple storylines; ambiguous direction' },
  { max: 4,        label: 'Splintered Arc', emoji: '🧩', coherence: 'low',     description: 'contradictory themes; fragmented narrative' },
  { max: Infinity, label: 'Chaotic',        emoji: '🌀', coherence: 'none',    description: 'no stable storyline; maximum dispersion' }
];

// Legacy volatility
const VOLATILITY_LEVELS = [
  { max: 0.5,      label: 'Aligned Flow',     emoji: '➿' },
  { max: 2,        label: 'Cycled Pull',      emoji: '🔄' },
  { max: 3,        label: 'Mixed Paths',      emoji: '🔀' },
  { max: 5,        label: 'Fragment Scatter', emoji: '🧩' },
  { max: Infinity, label: 'Vortex Dispersion',emoji: '🌀' }
];

// ---------- Classifiers ----------
function classifyDirectionalBias(value) {
  const num = safeNumber(value, null);
  if (num == null) return null;
  const bounded = clamp(num, -5, 5);
  const tier = DIRECTIONAL_BIAS_LEVELS.find(level => bounded >= level.min && bounded < level.max);
  if (!tier) {
    return {
      value: +bounded.toFixed(2),
      label: null,
      emoji: null,
      direction: bounded >= 0 ? 'outward' : 'inward',
      band: null,
      code: null,
      motion: null
    };
  }
  return {
    value: +bounded.toFixed(2),
    label: tier.label,
    emoji: tier.emoji,
    direction: tier.direction,
    band: [tier.min, tier.max],
    code: tier.code,
    motion: tier.motion
  };
}

function classifyValence(value) { // legacy
  const num = safeNumber(value, null);
  if (num == null) return null;
  const bounded = clamp(num, -5, 5);
  const tier = VALENCE_LEVELS.find(level => bounded >= level.min && bounded < level.max);
  if (!tier) {
    return {
      value: +bounded.toFixed(2),
      label: null,
      emoji: null,
      polarity: bounded >= 0 ? 'positive' : 'negative',
      band: null,
      code: null
    };
  }
  return {
    value: +bounded.toFixed(2),
    label: tier.label,
    emoji: tier.emoji,
    polarity: tier.polarity,
    band: [tier.min, tier.max],
    code: tier.code
  };
}

function classifyNuminosity(value) {
  const num = safeNumber(value, null);
  if (num == null) return null;
  const tier = NUMINOSITY_LEVELS.find(level => num <= level.max);
  return {
    value: +num.toFixed(2),
    label: tier ? tier.label : null,
    description: tier ? tier.description : null
  };
}

function classifyMagnitude(value) { // legacy
  const num = safeNumber(value, null);
  if (num == null) return null;
  const tier = MAGNITUDE_LEVELS.find(level => num <= level.max);
  return {
    value: +num.toFixed(2),
    label: tier ? tier.label : null
  };
}

function classifyNarrativeCoherence(value) {
  const num = safeNumber(value, null);
  if (num == null) return null;
  const tier = NARRATIVE_COHERENCE_LEVELS.find(level => num <= level.max);
  return {
    value: +num.toFixed(2),
    label: tier ? tier.label : null,
    emoji: tier ? tier.emoji : null,
    coherence: tier ? tier.coherence : null,
    description: tier ? tier.description : null
  };
}

function classifyVolatility(value) { // legacy
  const num = safeNumber(value, null);
  if (num == null) return null;
  const tier = VOLATILITY_LEVELS.find(level => num <= level.max);
  return {
    value: +num.toFixed(2),
    label: tier ? tier.label : null,
    emoji: tier ? tier.emoji : null
  };
}

function classifyIntegrationBias(value) {
  const num = safeNumber(value, null);
  if (num == null) return null;
  const bounded = clamp(num, -5, 5);
  let cooperation = 'mixed';
  let label = 'Forces Mixed';
  let description = 'outcome depends on response';

  if (bounded >= 1) {
    cooperation = 'supportive';
    label = 'Forces Cooperate';
    description = 'net cooperation; easier integration';
  } else if (bounded <= -1) {
    cooperation = 'frictional';
    label = 'Forces Fragment';
    description = 'net opposition; fragmentation likely';
  }

  return {
    value: +bounded.toFixed(2),
    cooperation,
    label,
    description,
    // legacy discrete flag
    disc: bounded >= 1 ? 1 : (bounded <= -1 ? -1 : 0)
  };
}


// ---------- Orb-Aware Filters & Diagnostics ----------
function filterAspectsByOrbIntegrity(aspects, profileName = 'STANDARD') {
  const profile = getOrbProfile(profileName);
  const filtered = {
    included: [],
    rejected: [],
    statistics: {
      total_input: aspects.length,
      passed_filter: 0,
      failed_orb_test: 0,
      precision_level: profile.precision_level,
      profile_used: profileName
    }
  };

  aspects.forEach(aspect => {
    // expected aspect fields:
    // { type: 'major'|'minor', orb: number, category?: 'luminary'|'planet'|'point', magnitude?: number, cooperation_type?: 'supportive'|'frictional' }
    const aspectType = aspect.type || 'major';
    const category = aspect.category || null;

    let maxOrb = aspectType === 'major' ? profile.major_aspects : profile.minor_aspects;
    if (category) {
      const c = String(category).toLowerCase();
      if (c === 'luminary') maxOrb = profile.luminaries;
      else if (c === 'planet') maxOrb = profile.planets;
      else if (c === 'point') maxOrb = profile.points;
    }

    if (aspect.orb <= maxOrb) {
      const weightData = calculateOrbWeight(aspect.orb, aspectType, profileName, category);
      filtered.included.push({
        ...aspect,
        orb_weight: weightData.weight,
        orb_classification: weightData.classification,
        diagnostic_confidence: weightData.diagnostic_confidence
      });
      filtered.statistics.passed_filter++;
    } else {
      filtered.rejected.push({
        ...aspect,
        rejection_reason: 'orb_tolerance_exceeded',
        max_allowed_orb: maxOrb
      });
      filtered.statistics.failed_orb_test++;
    }
  });

  return filtered;
}


// Core: magnitude weighted by orb precision
function calculateBalanceMeterWithOrbIntegrity(aspectData, profileName = 'STANDARD') {
  const filtered = filterAspectsByOrbIntegrity(aspectData, profileName);
  const profile = getOrbProfile(profileName);

  // Weighted magnitude (neutral charge proxy)
  const included = filtered.included;
  const weightedMagnitude = included.length === 0
    ? 0
    : included.reduce((sum, a) => {
        const base = safeNumber(a.magnitude, 1);
        return sum + base * safeNumber(a.orb_weight, 0);
      }, 0) / included.length;

  return {
    magnitude: +weightedMagnitude.toFixed(3),
    orb_filtered_aspects: included,
    rejected_aspects: filtered.rejected,
    diagnostic_metadata: {
      orb_profile: profile.name,
      precision_level: profile.precision_level,
      confidence: profile.diagnostic_confidence,
      total_aspects_processed: aspectData.length,
      aspects_included: filtered.statistics.passed_filter,
      aspects_rejected: filtered.statistics.failed_orb_test,
      orb_integrity_maintained: filtered.statistics.failed_orb_test === 0
    }
  };
}

// ---------- Exports ----------
module.exports = {
  // V2.0 Balance Meter Terminology
  DIRECTIONAL_BIAS_LEVELS,
  NUMINOSITY_LEVELS,
  NARRATIVE_COHERENCE_LEVELS,
  classifyDirectionalBias,
  classifyNuminosity,
  classifyNarrativeCoherence,
  classifyIntegrationBias,

  // Orb Resolution Framework
  ORB_RESOLUTION_PROFILES,
  getOrbProfile,
  classifyOrbIntegrity,
  calculateOrbWeight,
  filterAspectsByOrbIntegrity,
  calculateBalanceMeterWithOrbIntegrity,

  // Legacy exports
  VALENCE_LEVELS,
  MAGNITUDE_LEVELS,
  VOLATILITY_LEVELS,
  classifyValence,
  classifyMagnitude,
  classifyVolatility,

  // utils
  clamp,
  safeNumber
};