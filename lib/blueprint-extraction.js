/**
 * Blueprint Mode Extraction
 * Extracts Primary/Secondary/Shadow modes from natal chart placements
 * Maps to Jungian functions: Thinking, Feeling, Sensation, Intuition
 *
 * Referenced by: woven-map-composer.js, raven-lite-mapper.js
 */

/**
 * Jungian function mapping based on astrological placements
 */
const FUNCTION_MAP = {
  // Elements map to functions
  element: {
    fire: 'Intuition',    // Visionary, pattern-seeking, future-oriented
    earth: 'Sensation',   // Practical, present-focused, tangible
    air: 'Thinking',      // Logical, analytical, conceptual
    water: 'Feeling'      // Values-based, empathic, relational
  },

  // Qualities (modalities) influence expression
  quality: {
    cardinal: 'initiating', // Action-oriented, leadership
    fixed: 'sustaining',    // Enduring, concentrated
    mutable: 'adapting'     // Flexible, responsive
  }
};

/**
 * Weight factors for determining dominant function
 */
const WEIGHTS = {
  sun: 3.0,           // Primary identity
  ascendant: 2.5,     // Ego presentation
  moon: 2.0,          // Emotional core
  mercury: 1.5,       // Processing style
  venus: 1.2,         // Values/aesthetics
  mars: 1.2,          // Drive/assertion
  saturn: 2.0,        // Structure/constraint (Shadow indicator)
  jupiter: 1.0,       // Expansion
  midheaven: 1.5,     // Public expression
  pluto: 1.8,         // Power/transformation (Shadow indicator)
  neptune: 1.5,       // Dissolution/ideals (Shadow indicator)
  chiron: 1.3         // Wound/healer archetype
};

/**
 * Extract element and quality from placement
 */
function getPlacementTraits(placement) {
  if (!placement) return null;

  return {
    element: (placement.element || '').toLowerCase(),
    quality: (placement.quality || '').toLowerCase(),
    sign: placement.sign || '',
    house: placement.house || placement.house_number || null,
    retrograde: placement.retrograde || false
  };
}

/**
 * Determine primary function from weighted placements
 */
function determinePrimaryMode(natalChart) {
  const functionScores = {
    Thinking: 0,
    Feeling: 0,
    Sensation: 0,
    Intuition: 0
  };

  const data = natalChart?.data || natalChart?.chart?.data || {};

  // Score each major placement
  const placements = [
    { name: 'sun', data: data.sun, weight: WEIGHTS.sun },
    { name: 'ascendant', data: data.ascendant, weight: WEIGHTS.ascendant },
    { name: 'moon', data: data.moon, weight: WEIGHTS.moon },
    { name: 'mercury', data: data.mercury, weight: WEIGHTS.mercury },
    { name: 'midheaven', data: data.medium_coeli || data.midheaven, weight: WEIGHTS.midheaven }
  ];

  for (const { name, data: placement, weight } of placements) {
    if (!placement) continue;

    const traits = getPlacementTraits(placement);
    if (!traits || !traits.element) continue;

    const func = FUNCTION_MAP.element[traits.element];
    if (func) {
      functionScores[func] += weight;
    }
  }

  // Find dominant function
  let maxScore = 0;
  let primaryFunction = 'Thinking'; // Default fallback

  for (const [func, score] of Object.entries(functionScores)) {
    if (score > maxScore) {
      maxScore = score;
      primaryFunction = func;
    }
  }

  // Get representative placement for description
  const sun = getPlacementTraits(data.sun);
  const asc = getPlacementTraits(data.ascendant);

  return {
    function: primaryFunction,
    description: describeFunction(primaryFunction),
    primary_placements: [
      sun ? `Sun in ${sun.sign} (${sun.element})` : null,
      asc ? `${asc.sign} Rising (${asc.element})` : null
    ].filter(Boolean),
    score: maxScore
  };
}

/**
 * Determine secondary (supporting) function
 */
function determineSecondaryMode(natalChart, primaryFunction) {
  const functionScores = {
    Thinking: 0,
    Feeling: 0,
    Sensation: 0,
    Intuition: 0
  };

  // Exclude primary function from scoring
  delete functionScores[primaryFunction];

  const data = natalChart?.data || natalChart?.chart?.data || {};

  // Secondary scoring focuses on Moon, Venus, rhythm houses (3rd, 6th, 9th, 12th)
  const placements = [
    { name: 'moon', data: data.moon, weight: WEIGHTS.moon },
    { name: 'venus', data: data.venus, weight: WEIGHTS.venus },
    { name: 'mercury', data: data.mercury, weight: WEIGHTS.mercury * 0.8 },
    { name: 'mars', data: data.mars, weight: WEIGHTS.mars }
  ];

  for (const { data: placement, weight } of placements) {
    if (!placement) continue;

    const traits = getPlacementTraits(placement);
    if (!traits || !traits.element) continue;

    const func = FUNCTION_MAP.element[traits.element];
    if (func && func !== primaryFunction) {
      functionScores[func] += weight;
    }
  }

  // Find highest secondary score
  let maxScore = 0;
  let secondaryFunction = null;

  for (const [func, score] of Object.entries(functionScores)) {
    if (score > maxScore) {
      maxScore = score;
      secondaryFunction = func;
    }
  }

  if (!secondaryFunction) {
    // Fallback: complementary function
    secondaryFunction = getComplementaryFunction(primaryFunction);
  }

  const moon = getPlacementTraits(data.moon);
  const venus = getPlacementTraits(data.venus);

  return {
    function: secondaryFunction,
    description: describeFunction(secondaryFunction),
    supporting_placements: [
      moon ? `Moon in ${moon.sign} (${moon.element})` : null,
      venus ? `Venus in ${venus.sign} (${venus.element})` : null
    ].filter(Boolean),
    score: maxScore
  };
}

/**
 * Determine shadow (friction/constraint) mode
 */
function determineShadowMode(natalChart) {
  const data = natalChart?.data || natalChart?.chart?.data || {};
  const aspects = natalChart?.aspects || natalChart?.chart?.aspects || [];

  // Shadow indicators: Saturn, Pluto, Neptune, hard aspects
  const shadowPlacements = [
    { name: 'saturn', data: data.saturn, weight: WEIGHTS.saturn },
    { name: 'pluto', data: data.pluto, weight: WEIGHTS.pluto },
    { name: 'neptune', data: data.neptune, weight: WEIGHTS.neptune },
    { name: 'chiron', data: data.chiron, weight: WEIGHTS.chiron }
  ];

  const functionScores = {
    Thinking: 0,
    Feeling: 0,
    Sensation: 0,
    Intuition: 0
  };

  // Score shadow placements
  for (const { name, data: placement, weight } of shadowPlacements) {
    if (!placement) continue;

    const traits = getPlacementTraits(placement);
    if (!traits || !traits.element) continue;

    const func = FUNCTION_MAP.element[traits.element];
    if (func) {
      functionScores[func] += weight;
    }
  }

  // Boost score for hard aspects to personal planets
  const hardAspects = aspects.filter(asp => {
    const type = (asp.aspect || asp.type || '').toLowerCase();
    return ['square', 'opposition'].includes(type);
  });

  for (const asp of hardAspects.slice(0, 5)) {
    // Examine first 5 hard aspects
    const p1 = asp.p1_name;
    const p2 = asp.p2_name;

    const heavyPlanets = ['Saturn', 'Pluto', 'Neptune', 'Chiron'];
    if (heavyPlanets.includes(p1) || heavyPlanets.includes(p2)) {
      // Hard aspect involving shadow planet - add weight
      // Determine which function is under pressure
      const targetPlanet = heavyPlanets.includes(p1) ? p2 : p1;
      const targetData = data[targetPlanet.toLowerCase()];

      if (targetData) {
        const traits = getPlacementTraits(targetData);
        if (traits && traits.element) {
          const func = FUNCTION_MAP.element[traits.element];
          if (func) {
            functionScores[func] += 1.5; // Hard aspect weight
          }
        }
      }
    }
  }

  // Find dominant shadow function
  let maxScore = 0;
  let shadowFunction = 'Feeling'; // Default (most common shadow)

  for (const [func, score] of Object.entries(functionScores)) {
    if (score > maxScore) {
      maxScore = score;
      shadowFunction = func;
    }
  }

  const saturn = getPlacementTraits(data.saturn);
  const pluto = getPlacementTraits(data.pluto);

  return {
    function: shadowFunction,
    description: describeFunction(shadowFunction, true), // Shadow version
    shadow_indicators: [
      saturn ? `Saturn in ${saturn.sign}` : null,
      pluto ? `Pluto in ${pluto.sign}` : null,
      hardAspects.length > 0 ? `${hardAspects.length} hard aspects` : null
    ].filter(Boolean),
    score: maxScore
  };
}

/**
 * Get complementary function (Jungian opposites)
 */
function getComplementaryFunction(primaryFunction) {
  const complements = {
    Thinking: 'Feeling',
    Feeling: 'Thinking',
    Sensation: 'Intuition',
    Intuition: 'Sensation'
  };
  return complements[primaryFunction] || 'Thinking';
}

/**
 * Describe function in everyday language
 */
function describeFunction(func, isShadow = false) {
  const descriptions = {
    Thinking: isShadow
      ? 'Logic compressed, analysis doubted, structure questioned'
      : 'Organizes through logic, seeks clarity, builds frameworks',
    Feeling: isShadow
      ? 'Values suppressed, empathy constrained, harmony disrupted'
      : 'Organizes through values, attunes to emotional tone, seeks harmony',
    Sensation: isShadow
      ? 'Presence scattered, tangibility lost, groundedness shaken'
      : 'Organizes through the tangible, grounds in present reality, practical focus',
    Intuition: isShadow
      ? 'Vision clouded, patterns missed, future uncertainty'
      : 'Organizes through patterns, envisions possibilities, synthesizes meaning'
  };

  return descriptions[func] || func;
}

/**
 * Generate blueprint metaphor combining modes
 */
function generateBlueprintMetaphor(primary, secondary, shadow) {
  // Template: "[primary texture] with [secondary current], [shadow tension]"
  const textures = {
    Thinking: 'a structured lattice',
    Feeling: 'a flowing current',
    Sensation: 'a steady foundation',
    Intuition: 'a branching web'
  };

  const currents = {
    Thinking: 'analytical precision',
    Feeling: 'empathic resonance',
    Sensation: 'grounded presence',
    Intuition: 'visionary leaps'
  };

  const tensions = {
    Thinking: 'logic under pressure',
    Feeling: 'values constrained',
    Sensation: 'stability shaken',
    Intuition: 'vision compressed'
  };

  const primaryTexture = textures[primary.function] || 'a complex pattern';
  const secondaryCurrent = currents[secondary.function] || 'supportive flow';
  const shadowTension = tensions[shadow.function] || 'hidden friction';

  return `${primaryTexture} threaded with ${secondaryCurrent}, occasionally strained by ${shadowTension}`;
}

/**
 * Extract complete blueprint modes from natal chart
 * @param {Object} natalChart - Natal chart data with placements and aspects
 * @returns {Object} Blueprint modes with Primary/Secondary/Shadow
 */
function extractBlueprintModes(natalChart) {
  if (!natalChart) {
    return {
      primary_mode: null,
      secondary_mode: null,
      shadow_mode: null,
      blueprint_metaphor: 'Blueprint data unavailable',
      extraction_status: 'failed',
      reason: 'No natal chart data provided'
    };
  }

  const primary = determinePrimaryMode(natalChart);
  const secondary = determineSecondaryMode(natalChart, primary.function);
  const shadow = determineShadowMode(natalChart);

  const metaphor = generateBlueprintMetaphor(primary, secondary, shadow);

  return {
    primary_mode: primary,
    secondary_mode: secondary,
    shadow_mode: shadow,
    blueprint_metaphor: metaphor,
    extraction_status: 'success',
    confidence: calculateConfidence(primary, secondary, shadow)
  };
}

/**
 * Calculate confidence score based on data completeness
 */
function calculateConfidence(primary, secondary, shadow) {
  let score = 0;
  const maxScore = 3;

  if (primary && primary.score > 0) score += 1;
  if (secondary && secondary.score > 0) score += 1;
  if (shadow && shadow.score > 0) score += 1;

  const percentage = (score / maxScore) * 100;

  if (percentage >= 80) return 'high';
  if (percentage >= 50) return 'medium';
  return 'low';
}

module.exports = {
  extractBlueprintModes,
  determinePrimaryMode,
  determineSecondaryMode,
  determineShadowMode,
  generateBlueprintMetaphor,
  describeFunction,
  FUNCTION_MAP,
  WEIGHTS
};
