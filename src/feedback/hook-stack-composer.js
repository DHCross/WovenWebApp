// Hook Stack Recognition Gateway
// Generates 2-4 high-charge, dual-polarity titles from tightest aspects
// Purpose: Bypass analysis, trigger limbic "that's me" ping, open door for depth work

function safeNum(x, def = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

/**
 * Aspect intensity scoring for Hook Stack selection
 * Prioritizes tight orbs and high-charge aspect types
 */
function calculateAspectIntensity(aspect) {
  if (!aspect) return 0;
  
  const orb = safeNum(aspect.orb, 10);
  const aspectType = (aspect.name || aspect.type || '').toLowerCase();
  
  // Tier-1 Orbs: Surgical window for immediate recognition
  const orbWeight = orb <= 1 ? 10 : orb <= 2 ? 8 : orb <= 3 ? 6 : orb <= 4 ? 4 : orb <= 5 ? 2 : 1;
  
  // High-charge aspect type multipliers
  const aspectWeights = {
    'conjunction': 9,
    'opposition': 9,
    'square': 8,
    'trine': 6,
    'sextile': 4,
    'quincunx': 7,
    'sesquiquadrate': 6,
    'semi-square': 5,
    'semi-sextile': 3,
    'quintile': 4,
    'biquintile': 4
  };
  
  const aspectWeight = aspectWeights[aspectType] || 3;
  
  // Outer planet multiplier for generational vs personal impact
  const planet1 = (aspect.planet1 || aspect.first_planet || '').toLowerCase();
  const planet2 = (aspect.planet2 || aspect.second_planet || '').toLowerCase();
  
  const outerPlanets = ['uranus', 'neptune', 'pluto'];
  const personalPlanets = ['sun', 'moon', 'mercury', 'venus', 'mars'];
  
  let planetWeight = 1;
  if (personalPlanets.includes(planet1) || personalPlanets.includes(planet2)) {
    planetWeight = 1.5; // Personal planet involvement increases intensity
  }
  if (outerPlanets.includes(planet1) || outerPlanets.includes(planet2)) {
    planetWeight *= 1.3; // Outer planet adds generational depth
  }
  
  return orbWeight * aspectWeight * planetWeight;
}

/**
 * Dual-polarity hook generators for different aspect patterns
 */
const HOOK_TEMPLATES = {
  // Sun aspects - identity and core expression
  sun_mars: {
    conjunction: "Dynamic & Action-Oriented / Impulsive or Burning Out",
    opposition: "Confident Leadership / Aggressive or Combative",
    square: "Driven & Ambitious / Frustrated or Impatient",
    trine: "Natural Authority / Overconfident or Domineering"
  },
  
  sun_saturn: {
    conjunction: "Disciplined & Structured / Rigid or Self-Critical",
    opposition: "Responsible & Mature / Restricted or Pessimistic", 
    square: "Hardworking & Persistent / Blocked or Self-Doubting",
    trine: "Steady Achievement / Overly Conservative"
  },
  
  sun_uranus: {
    conjunction: "Innovative & Independent / Erratic or Rebellious",
    opposition: "Original Thinker / Unpredictable or Detached",
    square: "Creative Breakthrough / Restless or Disruptive",
    trine: "Visionary Freedom / Scattered or Impractical"
  },
  
  moon_mars: {
    conjunction: "Emotionally Intense / Reactive or Moody",
    opposition: "Passionate Feelings / Volatile or Aggressive",
    square: "Strong Instincts / Irritable or Defensive", 
    trine: "Emotional Courage / Impulsive or Rash"
  },
  
  moon_saturn: {
    conjunction: "Emotionally Mature / Withdrawn or Depressed",
    opposition: "Responsible Caregiver / Cold or Rejecting",
    square: "Inner Strength / Self-Protective or Isolated",
    trine: "Stable Emotions / Emotionally Controlled"
  },
  
  venus_mars: {
    conjunction: "Magnetic Attraction / Possessive or Jealous",
    opposition: "Dynamic Relationships / Conflicted in Love",
    square: "Passionate Desires / Frustrated or Indulgent",
    trine: "Creative Harmony / Lazy or Self-Indulgent"
  },
  
  mars_saturn: {
    conjunction: "Focused Determination / Blocked or Self-Limiting",
    opposition: "Strategic Action / Frustrated or Rigid",
    square: "Persistent Effort / Angry or Inhibited",
    trine: "Disciplined Energy / Overly Cautious"
  },
  
  // Transit-to-natal patterns
  transit_conjunction: "Intense Focus & New Beginnings / Overwhelming or Obsessive",
  transit_opposition: "External Challenge & Perspective / Confrontational or Polarized",
  transit_square: "Dynamic Tension & Growth / Frustrated or Blocked",
  transit_trine: "Flowing Opportunity / Complacent or Overconfident"
};

/**
 * Generate aspect key for template lookup
 */
function generateAspectKey(aspect) {
  const p1 = (aspect.planet1 || aspect.first_planet || '').toLowerCase();
  const p2 = (aspect.planet2 || aspect.second_planet || '').toLowerCase();
  const aspectType = (aspect.name || aspect.type || '').toLowerCase();
  
  // Sort planets alphabetically for consistent keys
  const [planet1, planet2] = [p1, p2].sort();
  
  // Check for specific planet combinations
  const comboKey = `${planet1}_${planet2}`;
  if (HOOK_TEMPLATES[comboKey] && HOOK_TEMPLATES[comboKey][aspectType]) {
    return `${comboKey}.${aspectType}`;
  }
  
  // Fall back to transit patterns for unmatched combinations
  if (aspect.is_transit || aspect.transit) {
    return `transit_${aspectType}`;
  }
  
  return null;
}

/**
 * Generate hook title from aspect pattern
 */
function generateHookTitle(aspect) {
  const key = generateAspectKey(aspect);
  if (!key) return null;
  
  const [templateKey, aspectType] = key.split('.');
  const template = HOOK_TEMPLATES[templateKey];
  
  if (template && typeof template === 'object') {
    return template[aspectType] || null;
  } else if (typeof template === 'string') {
    return template;
  }
  
  return null;
}

/**
 * Build Hook Stack from aspects
 * Returns 2-4 high-charge, dual-polarity titles for immediate recognition
 */
function buildHookStack(aspects, options = {}) {
  if (!Array.isArray(aspects) || aspects.length === 0) {
    return {
      hooks: [],
      tier_1_orbs: 0,
      total_intensity: 0,
      coverage: 'minimal'
    };
  }
  
  const maxHooks = options.maxHooks || 4;
  const minIntensity = options.minIntensity || 10;
  
  // Score and sort aspects by intensity
  const scoredAspects = aspects
    .map(aspect => ({
      aspect,
      intensity: calculateAspectIntensity(aspect),
      title: generateHookTitle(aspect),
      orb: safeNum(aspect.orb, 10)
    }))
    .filter(item => item.title && item.intensity >= minIntensity)
    .sort((a, b) => b.intensity - a.intensity);
  
  // Select top hooks, avoiding duplicates
  const selectedHooks = [];
  const usedTitles = new Set();
  
  for (const item of scoredAspects) {
    if (selectedHooks.length >= maxHooks) break;
    if (usedTitles.has(item.title)) continue;
    
    selectedHooks.push({
      title: item.title,
      intensity: item.intensity,
      orb: item.orb,
      planets: [
        item.aspect.planet1 || item.aspect.first_planet,
        item.aspect.planet2 || item.aspect.second_planet
      ].filter(Boolean),
      aspect_type: item.aspect.name || item.aspect.type,
      is_tier_1: item.orb <= 1
    });
    
    usedTitles.add(item.title);
  }
  
  const tier1Count = selectedHooks.filter(h => h.is_tier_1).length;
  const totalIntensity = selectedHooks.reduce((sum, h) => sum + h.intensity, 0);
  
  // Determine coverage level
  let coverage = 'minimal';
  if (selectedHooks.length >= 3 && tier1Count >= 1) coverage = 'adequate';
  if (selectedHooks.length >= 4 && tier1Count >= 2) coverage = 'strong';
  
  return {
    hooks: selectedHooks,
    tier_1_orbs: tier1Count,
    total_intensity: totalIntensity,
    coverage,
    schema: 'HookStack-1.0'
  };
}

/**
 * Extract aspects from various result structures
 */
function extractAspectsFromResult(result) {
  const aspects = [];
  
  // Natal aspects
  const personA = result.person_a || {};
  if (Array.isArray(personA.aspects)) {
    aspects.push(...personA.aspects.map(a => ({ ...a, source: 'natal_a' })));
  }
  
  // Transit aspects (current drivers)
  const transits = personA.chart?.transitsByDate || {};
  const dates = Object.keys(transits).sort();
  const latestDate = dates[dates.length - 1];
  
  if (latestDate && Array.isArray(transits[latestDate]?.drivers)) {
    const transitAspects = transits[latestDate].drivers.map(a => ({ 
      ...a, 
      source: 'transit',
      is_transit: true 
    }));
    aspects.push(...transitAspects);
  }
  
  // Synastry aspects
  if (Array.isArray(result.synastry_aspects)) {
    aspects.push(...result.synastry_aspects.map(a => ({ ...a, source: 'synastry' })));
  }
  
  // Composite aspects
  if (Array.isArray(result.composite?.aspects)) {
    aspects.push(...result.composite.aspects.map(a => ({ ...a, source: 'composite' })));
  }
  
  return aspects;
}

/**
 * Main Hook Stack composer function
 */
function composeHookStack(result, options = {}) {
  const aspects = extractAspectsFromResult(result);
  const hookStack = buildHookStack(aspects, options);
  
  return {
    ...hookStack,
    timestamp: new Date().toISOString(),
    source_aspects_count: aspects.length,
    provenance: {
      composer: 'hook-stack-composer',
      version: '1.0.0',
      tier_1_threshold: 1.0, // orb degrees
      min_intensity_threshold: options.minIntensity || 10
    }
  };
}

module.exports = {
  composeHookStack,
  buildHookStack,
  calculateAspectIntensity,
  generateHookTitle,
  HOOK_TEMPLATES
};