/**
 * Orb Profiles Configuration
 * Defines aspect orb limits for different calculation profiles
 * Referenced by: balance-meter.js, astrology-mathbrain.js
 */

/**
 * Balance Default Profile (wm-spec-2025-09)
 * Standard Balance Meter orbs optimized for symbolic weather accuracy
 */
const BALANCE_DEFAULT = {
  id: 'wm-spec-2025-09',
  name: 'Balance Default',
  description: 'Standard Balance Meter orbs optimized for symbolic weather',
  orbs: {
    // Major aspects
    conjunction: 8.0,
    opposition: 8.0,
    square: 7.0,
    trine: 7.0,
    sextile: 5.0,

    // Minor aspects
    quincunx: 3.0,
    semisquare: 2.0,
    sesquiquadrate: 2.0,
    semisextile: 2.0,
    quintile: 1.0,
    biquintile: 1.0
  },
  modifiers: {
    // Moon gets wider orbs (+1°)
    moon_bonus: 1.0,

    // Outer planets to personal planets get tighter orbs (-1°)
    // Outer = Jupiter, Saturn, Uranus, Neptune, Pluto
    // Personal = Sun, Moon, Mercury, Venus, Mars
    outer_to_personal_penalty: -1.0,

    // Luminaries (Sun/Moon) to angles (ASC/MC/DSC/IC)
    luminary_to_angle_bonus: 1.0
  },
  caps: {
    // Absolute maximum orb regardless of modifiers
    max_orb: 10.0,

    // Minimum orb to consider aspect valid
    min_orb: 0.0
  }
};

/**
 * Woven Tight Profile v5 (wm-tight-2025-11-v5)
 * Selective hard-aspect loosening for crisis detection
 * - Hard majors (opposition, square): 4.0° to capture crisis signatures
 * - Trines: 3.0° (stay tight to prevent positivity padding)
 * - Luminary exception: +0.5° for hard aspects to Sun/Moon
 * - Points (Nodes/Lilith/Chiron): disciplined (min 1-2° for softs)
 * Used for: Magnitude & Directional Bias calculation ONLY
 */
const WOVEN_TIGHT_V5 = {
  id: 'wm-tight-2025-11-v5',
  name: 'Woven Tight v5 (Selective Hard)',
  description: 'v5: Hard majors 4°, trines 3° tight, luminary +0.5° exception',
  orbs: {
    // Hard majors: 4° to capture crisis edges (☍, □)
    opposition: 4.0,
    square: 4.0,

    // Conjunction: 3.5° (neutral/hard-ish, slight bump)
    conjunction: 3.5,

    // Soft majors: stay tight to avoid positivity padding
    trine: 3.0,
    sextile: 1.0,

    // Minor aspects: surgical
    quincunx: 1.0,
    semisquare: 0.8,
    sesquiquadrate: 0.8,
    semisextile: 0.5,
    quintile: 0.5,
    biquintile: 0.5
  },
  modifiers: {
    // No automatic Moon bonus (per-pair exceptions handled separately)
    moon_bonus: 0.0,

    // No outer-to-personal penalty (tight already)
    outer_to_personal_penalty: 0.0,

    // No luminary bonus (per-pair exceptions handled separately)
    luminary_to_angle_bonus: 0.0
  },
  caps: {
    max_orb: 4.0,
    min_orb: 0.0
  },
  // Per-pair modifier function
  applyPairCap: function(type, p1, p2) {
    const isLuminary = (name) => /^(Sun|Moon)$/.test(name);
    const isPoint = (name) => /(Node|Lilith|Chiron)/i.test(name);

    let cap = this.orbs[type] || 3.0;

    // Luminary exception: hard aspects to Sun/Moon get +0.5°
    // BUT: NOT if one of the bodies is a point (Node, Lilith, Chiron)
    if ((type === 'opposition' || type === 'square' || type === 'conjunction') && 
        (isLuminary(p1) || isLuminary(p2))) {
      // Only grant exception if NEITHER body is a point
      if (!isPoint(p1) && !isPoint(p2)) {
        cap += 0.5;
      }
    }

    // Points discipline: hard aspects to points get tightened by 0.5°
    // Soft aspects to points get much tighter
    if ((isPoint(p1) || isPoint(p2))) {
      if (type === 'opposition' || type === 'square') {
        cap -= 0.5; // 4.0 → 3.5°, filters marginal wide-orb aspects
      } else if (type === 'trine') {
        cap = Math.min(cap, 2.0);
      } else if (type === 'sextile' || type === 'quincunx') {
        cap = Math.min(cap, 1.0);
      }
    }

    // Enforce absolute max_orb cap
    cap = Math.min(cap, this.caps.max_orb);

    return cap;
  }
};

/**
 * Astro-Seek Strict Profile
 * Tighter orbs to reduce false positives, align with Astro-Seek conventions
 */
const ASTRO_SEEK_STRICT = {
  id: 'astro-seek-strict',
  name: 'Astro-Seek Strict',
  description: 'Tighter orbs to reduce false positives',
  orbs: {
    // Major aspects (tighter than Balance Default)
    conjunction: 6.0,
    opposition: 6.0,
    square: 5.0,
    trine: 5.0,
    sextile: 4.0,

    // Minor aspects (much tighter)
    quincunx: 2.0,
    semisquare: 1.5,
    sesquiquadrate: 1.5,
    semisextile: 1.5,
    quintile: 0.5,
    biquintile: 0.5
  },
  modifiers: {
    // Smaller Moon bonus
    moon_bonus: 0.5,

    // Larger penalty for outer-to-personal
    outer_to_personal_penalty: -1.5,

    // No special luminary bonus
    luminary_to_angle_bonus: 0.0
  },
  caps: {
    max_orb: 8.0,
    min_orb: 0.0
  }
};

/**
 * Planet classifications for orb modifiers
 */
const PLANET_TYPES = {
  personal: new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']),
  outer: new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']),
  luminaries: new Set(['Sun', 'Moon']),
  angles: new Set(['Ascendant', 'Medium_Coeli', 'Descendant', 'Imum_Coeli', 'MC', 'IC', 'ASC', 'DSC'])
};

/**
 * Get orb profile by ID
 * @param {string} profileId - Profile identifier
 * @returns {Object} Orb profile configuration
 */
function getOrbProfile(profileId = 'wm-tight-2025-11-v5') {
  switch (profileId) {
    case 'wm-tight-2025-11-v5':
      return WOVEN_TIGHT_V5;
    case 'astro-seek-strict':
      return ASTRO_SEEK_STRICT;
    case 'wm-spec-2025-09':
    default:
      return BALANCE_DEFAULT;
  }
}

/**
 * Calculate effective orb limit for an aspect
 * @param {string} aspectType - Type of aspect (conjunction, square, etc.)
 * @param {string} planet1 - First planet/point name
 * @param {string} planet2 - Second planet/point name
 * @param {string} profileId - Orb profile to use
 * @returns {number} Effective orb limit in degrees
 */
function getEffectiveOrb(aspectType, planet1, planet2, profileId = 'wm-tight-2025-11-v5') {
  const profile = getOrbProfile(profileId);
  const aspectLower = (aspectType || '').toLowerCase();

  // v5 profiles have per-pair modifier function
  if (profile.applyPairCap && typeof profile.applyPairCap === 'function') {
    return profile.applyPairCap(aspectLower, planet1, planet2);
  }

  // Legacy: Base orb from profile with modifiers
  let orb = profile.orbs[aspectLower] || profile.orbs.conjunction || 6.0;

  // Apply Moon bonus
  if (PLANET_TYPES.luminaries.has(planet1) || PLANET_TYPES.luminaries.has(planet2)) {
    if (planet1 === 'Moon' || planet2 === 'Moon') {
      orb += profile.modifiers.moon_bonus;
    }
  }

  // Apply outer-to-personal penalty
  const p1Outer = PLANET_TYPES.outer.has(planet1);
  const p2Outer = PLANET_TYPES.outer.has(planet2);
  const p1Personal = PLANET_TYPES.personal.has(planet1);
  const p2Personal = PLANET_TYPES.personal.has(planet2);

  if ((p1Outer && p2Personal) || (p2Outer && p1Personal)) {
    orb += profile.modifiers.outer_to_personal_penalty; // This is negative, so reduces orb
  }

  // Apply luminary-to-angle bonus
  const hasLuminary = PLANET_TYPES.luminaries.has(planet1) || PLANET_TYPES.luminaries.has(planet2);
  const hasAngle = PLANET_TYPES.angles.has(planet1) || PLANET_TYPES.angles.has(planet2);

  if (hasLuminary && hasAngle) {
    orb += profile.modifiers.luminary_to_angle_bonus;
  }

  // Enforce caps
  orb = Math.max(profile.caps.min_orb, Math.min(profile.caps.max_orb, orb));

  return orb;
}

/**
 * Check if an aspect is within orb tolerance
 * @param {Object} aspect - Aspect object with {aspect, p1_name, p2_name, orb}
 * @param {string} profileId - Orb profile to use
 * @returns {boolean} True if aspect is within tolerance
 */
function isWithinOrb(aspect, profileId = 'wm-spec-2025-09') {
  const aspectType = aspect.aspect || aspect.type;
  const p1 = aspect.p1_name || aspect.a || aspect.transit;
  const p2 = aspect.p2_name || aspect.b || aspect.natal;
  const actualOrb = Math.abs(aspect.orb || aspect.orbit || 0);

  const effectiveOrb = getEffectiveOrb(aspectType, p1, p2, profileId);

  return actualOrb <= effectiveOrb;
}

/**
 * Filter aspects array by orb profile
 * @param {Array} aspects - Array of aspect objects
 * @param {string} profileId - Orb profile to use
 * @returns {Array} Filtered aspects within orb tolerance
 */
function filterByOrbProfile(aspects, profileId = 'wm-spec-2025-09') {
  if (!Array.isArray(aspects)) return [];

  return aspects.filter(asp => isWithinOrb(asp, profileId));
}

/**
 * Get list of available profiles for UI
 * @returns {Array} Array of profile objects with {id, name, description}
 */
function getAvailableProfiles() {
  return [
    {
      id: BALANCE_DEFAULT.id,
      name: BALANCE_DEFAULT.name,
      description: BALANCE_DEFAULT.description
    },
    {
      id: ASTRO_SEEK_STRICT.id,
      name: ASTRO_SEEK_STRICT.name,
      description: ASTRO_SEEK_STRICT.description
    }
  ];
}

module.exports = {
  BALANCE_DEFAULT,
  WOVEN_TIGHT_V5,
  ASTRO_SEEK_STRICT,
  PLANET_TYPES,
  getOrbProfile,
  getEffectiveOrb,
  isWithinOrb,
  filterByOrbProfile,
  getAvailableProfiles
};
