/**
 * HOOK STACK COMPOSER
 * -------------------
 * This module operates within the Math Brain measurement domain.
 * Filters reflect the current profile's calibrated measurement window,
 * not judgments of validity. Aspects outside the cap are simply
 * beyond this instrument's confidence range; the Poetic Brain layer
 * may still treat them as experientially significant.
 *
 * Purpose: Generate 2-4 high-charge, dual-polarity titles from tightest aspects
 * Goal: Bypass analysis, trigger limbic "that's me" ping, open door for depth work
 * v1.1.0: Cap-aware filtering, normalized aspect names, diversity rules, engine-aligned weighting
 */
let cachedSRPMapper = undefined;

function tryLoadSRPMapper() {
  if (cachedSRPMapper !== undefined) {
    return cachedSRPMapper;
  }

  try {
    const { mapAspectToSRP } = require('../../lib/srp/mapper');
    cachedSRPMapper = typeof mapAspectToSRP === 'function' ? mapAspectToSRP : null;
  } catch (err) {
    cachedSRPMapper = null;
  }

  return cachedSRPMapper;
}

function isSRPEnabled() {
  return process.env.ENABLE_SRP === 'true';
}

function safeNum(x, def = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

function enrichHooksWithSRP(hooks) {
  if (!isSRPEnabled()) return hooks;
  const mapper = tryLoadSRPMapper();
  if (!mapper) return hooks;

  return hooks.map(hook => {
    if (!hook) return hook;
    
    // Handle both formats:
    // 1. New format: { planets: ['Sun', 'Moon'], aspect_type: 'square', ... }
    // 2. Old format: { planet1: 'Sun', planet2: 'Moon', name: 'square', ... }
    const planet1 = hook.planets?.[0] || hook.planet1;
    const planet2 = hook.planets?.[1] || hook.planet2;
    const aspectType = hook.aspect_type || hook.name;
    
    if (!planet1 || !planet2 || !aspectType) return hook;

    const orbText = typeof hook.orb === 'number' ? ` (${hook.orb.toFixed(1)}°)` : '';
    const label = `${planet1} ${aspectType} ${planet2}${orbText}`;
    const enrichment = mapper(label, hook.resonanceState || undefined);
    
    return {
      ...hook,
      srp: enrichment
    };
  });
}

// --- Normalization helpers (synonyms, planets, points, caps) ---
const ASPECT_SYNONYMS = {
  'semi-square': 'semisquare',
  'semi square': 'semisquare',
  'semi-sextile': 'semisextile',
  'semi sextile': 'semisextile',
  'sesqui-square': 'sesquiquadrate',
  'sesquisquare': 'sesquiquadrate',
  'inconjunct': 'quincunx'
};

const PERSONAL = new Set(['sun','moon','mercury','venus','mars']);
const SOCIAL   = new Set(['jupiter','saturn']);
const OUTER    = new Set(['uranus','neptune','pluto']);
const ANGLES   = new Set(['asc','mc','ic','dc','ascendant','midheaven','imum coeli','descendant','medium_coeli']);
const POINTS   = new Set(['chiron','mean_node','true_node','north_node','south_node','mean_lilith','true_lilith','vertex','fortune','mean_south_node','true_south_node']);

function normAspectType(t='') {
  let k = String(t||'').trim().toLowerCase();
  k = ASPECT_SYNONYMS[k] || k;
  return k;
}

function isPointish(p='') {
  const k = String(p||'').toLowerCase().replace(/_/g,'_'); // normalize underscores
  return POINTS.has(k) || ANGLES.has(k);
}

function isLuminary(p='') { 
  const k = String(p||'').toLowerCase(); 
  return k==='sun' || k==='moon'; 
}

function isHard(t=''){ 
  t=normAspectType(t); 
  return t==='conjunction'||t==='square'||t==='opposition'; 
}

function isSoft(t=''){ 
  t=normAspectType(t); 
  return t==='trine'||t==='sextile'||t==='quincunx'||t==='semisextile'||t==='sesquiquadrate'||t==='semisquare'||t==='quintile'||t==='biquintile'; 
}

// Pull caps from options.orbCaps or supply v5 defaults consistent with engine
const DEFAULT_V5_CAPS = {
  // majors: 4° for general, but engine may tighten for points
  conjunction: 3.5, square: 4.0, opposition: 4.0,
  // minors: surgical
  trine: 3.0, sextile: 1.0, quincunx: 1.0, semisextile: 0.5, 
  sesquiquadrate: 0.8, semisquare: 0.8, quintile: 0.5, biquintile: 0.5
};

function capFor(aspectType, p1, p2, caps=DEFAULT_V5_CAPS) {
  const t = normAspectType(aspectType);
  let base = caps[t] ?? 1;
  const eitherPoint = isPointish(p1) || isPointish(p2);
  const lumTouch = isLuminary(p1) || isLuminary(p2);
  // Luminary exception +0.5° ONLY for planet–planet hard aspects
  if (isHard(t) && lumTouch && !eitherPoint) base += 0.5;
  return base;
}

/**
 * Aspect intensity scoring for Hook Stack selection
 * Prioritizes tight orbs and high-charge aspect types
 * Now cap-aware and engine-aligned with v5 orb discipline
 */
function calculateAspectIntensity(aspect) {
  if (!aspect) return 0;
  
  const aspectType = normAspectType(aspect.name || aspect.type || '');
  const p1 = (aspect.planet1 || aspect.first_planet || '').toLowerCase();
  const p2 = (aspect.planet2 || aspect.second_planet || '').toLowerCase();
  const orb = safeNum(aspect.orb, 10);
  
  // Respect v5 caps: beyond measurement window → confidence drops to zero
  const caps = (aspect._orbCaps) || DEFAULT_V5_CAPS;
  const cap = capFor(aspectType, p1, p2, caps);
  if (orb > cap) return 0; // beyond calibrated cap for this profile
  
  // Smooth step: reward exactness, floor at 4 near boundary
  // Map orb in [0, cap] → weight in [10 .. 4]
  const tightness = Math.max(0, Math.min(1, (cap - Math.abs(orb)) / cap)); // 1 at exact, 0 at cap
  const orbWeight = Math.max(4, 4 + 6 * tightness); // 10 at exact, 4 at cap
  
  // High-charge aspect type multipliers (engine-aligned, unsigned for salience)
  const aspectWeights = {
    'conjunction': 1.0,
    'opposition': 1.0,
    'square': 0.9,     // small bump to reflect crisis salience in hooks
    'trine': 0.8,      // slightly down; trines less "hooky" despite being positive
    'sextile': 0.55,
    'quincunx': 0.35,
    'sesquiquadrate': 0.45,
    'semi-square': 0.45,
    'semisquare': 0.45,
    'semi-sextile': 0.2,
    'semisextile': 0.2,
    'quintile': 0.3,
    'biquintile': 0.3
  };
  
  const aspectWeight = aspectWeights[aspectType] ?? 0.2;
  
  // Planet weighting: personal contact (relatable) × outer driver (depth)
  let planetWeight = 1;
  const personalTouch = PERSONAL.has(p1) || PERSONAL.has(p2);
  const outerTouch = OUTER.has(p1) || OUTER.has(p2);
  if (personalTouch) planetWeight *= 1.4;
  if (outerTouch)    planetWeight *= 1.25;
  // De-emphasize point-only interactions in hooks (still valid, just less "that's me")
  if (isPointish(p1) || isPointish(p2)) planetWeight *= 0.9;
  
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
  const aspectType = normAspectType(aspect.name || aspect.type || '');
  
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
 * v1.1.0: Diversity rules, cap-aware selection, engine-aligned filtering
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
  const orbCaps = options.orbCaps || DEFAULT_V5_CAPS;
  
  // Score and sort aspects by intensity
  const scoredAspects = aspects
    .map(aspect => ({
      aspect: { ...aspect, _orbCaps: orbCaps },
      intensity: calculateAspectIntensity({ ...aspect, _orbCaps: orbCaps }),
      title: generateHookTitle(aspect),
      orb: safeNum(aspect.orb, 10),
      type: normAspectType(aspect.name || aspect.type || ''),
      p1: (aspect.planet1 || aspect.first_planet || '').toLowerCase(),
      p2: (aspect.planet2 || aspect.second_planet || '').toLowerCase(),
      isTransit: !!(aspect.is_transit || aspect.transit)
    }))
    .filter(item => item.title && item.intensity >= minIntensity)
    .sort((a, b) => b.intensity - a.intensity);
  
  // Select top hooks with diversity rules
  const selectedHooks = [];
  const usedTitles = new Set();
  const usedCombos = new Set(); // avoid repeated planet pairs
  const usedTypes  = new Set(); // avoid all-squares, etc.
  const usedSource = new Set(); // prefer mixing transit/natal/synastry
  
  for (const item of scoredAspects) {
    if (selectedHooks.length >= maxHooks) break;
    if (usedTitles.has(item.title)) continue;
    
    const pairKey = [item.p1, item.p2].sort().join('-');
    const sourceKey = item.isTransit ? 'transit' : (item.aspect.source || 'unknown');
    
    // gentle diversity: allow duplicates only if intensity is very high and we need slots
    const duplicatePenalty = (usedCombos.has(pairKey) || usedTypes.has(item.type) || usedSource.has(sourceKey)) ? 1 : 0;
    if (duplicatePenalty && selectedHooks.length < maxHooks - 1) continue;
    
    selectedHooks.push({
      title: item.title,
      intensity: item.intensity,
      orb: item.orb,
      planets: [
        item.aspect.planet1 || item.aspect.first_planet,
        item.aspect.planet2 || item.aspect.second_planet
      ].filter(Boolean),
      aspect_type: item.type,
      is_tier_1: item.orb <= 1 && item.intensity > 0, // tight orb within measurement window
      resonanceState: item.aspect.resonanceState,
      source: sourceKey
    });
    
    usedTitles.add(item.title);
    usedCombos.add(pairKey);
    usedTypes.add(item.type);
    usedSource.add(sourceKey);
  }
  
  const tier1Count = selectedHooks.filter(h => h.is_tier_1).length;
  const totalIntensity = selectedHooks.reduce((sum, h) => sum + h.intensity, 0);
  
  // Determine coverage level
  let coverage = 'minimal';
  if (selectedHooks.length >= 3 && tier1Count >= 1) coverage = 'adequate';
  if (selectedHooks.length >= 4 && tier1Count >= 2) coverage = 'strong';
  
  return {
    hooks: enrichHooksWithSRP(selectedHooks),
    tier_1_orbs: tier1Count,
    total_intensity: totalIntensity,
    coverage,
    schema: 'HookStack-1.1'
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
 * v1.1.0: Engine-aligned with seismograph orb discipline and v5 caps
 */
function composeHookStack(result, options = {}) {
  const aspects = extractAspectsFromResult(result);
  const hookStack = buildHookStack(aspects, {
    ...options,  // Pass through all options including minIntensity
    orbCaps: options.orbCaps || DEFAULT_V5_CAPS
  });
  
  return {
    ...hookStack,
    timestamp: new Date().toISOString(),
    source_aspects_count: aspects.length,
    provenance: {
      composer: 'hook-stack-composer',
      version: '1.1.0',
      tier_1_threshold: 1.0, // orb degrees
      min_intensity_threshold: options.minIntensity || 10, // This is just for reporting, actual filtering happens in buildHookStack
      orb_profile: options.orbProfile || 'wm-tight-2025-11-v5',
      diversity_rules: 'planet_pairs + aspect_types + sources mixed'
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