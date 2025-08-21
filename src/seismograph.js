// Seismograph aggregation logic for transit aspect scoring
// This module provides functions to calculate magnitude, valence, and volatility
// for astrological transits based on aspect types, orbs, and planetary significance

/**
 * Aggregate aspects for a single day into seismograph metrics
 * @param {Array} aspects - Array of aspect objects for the day
 * @param {Object} prev - Previous day's aggregation state
 * @returns {Object} Aggregated metrics (magnitude, valence, volatility, scored)
 */
function aggregate(aspects, prev = null) {
  if (!Array.isArray(aspects) || aspects.length === 0) {
    return {
      magnitude: 0,
      valence: 0,
      volatility: 0,
      scored: 0
    };
  }

  let totalMagnitude = 0;
  let totalValence = 0;
  let totalVolatility = 0;
  let scoredAspects = 0;

  for (const aspect of aspects) {
    const score = scoreAspect(aspect);
    if (score !== null) {
      totalMagnitude += score.magnitude;
      totalValence += score.valence;
      totalVolatility += score.volatility;
      scoredAspects++;
    }
  }

  // Calculate average metrics
  const avgMagnitude = scoredAspects > 0 ? totalMagnitude / scoredAspects : 0;
  const avgValence = scoredAspects > 0 ? totalValence / scoredAspects : 0;
  const avgVolatility = scoredAspects > 0 ? totalVolatility / scoredAspects : 0;

  // Apply continuity factor if previous day exists
  let finalValence = avgValence;
  if (prev && typeof prev.Y_effective === 'number') {
    // Smooth transitions between days (80% current, 20% previous)
    finalValence = (avgValence * 0.8) + (prev.Y_effective * 0.2);
  }

  return {
    magnitude: +avgMagnitude.toFixed(2),
    valence: +finalValence.toFixed(2),
    volatility: +avgVolatility.toFixed(2),
    scored: scoredAspects
  };
}

/**
 * Score a single aspect based on planetary significance, aspect type, and orb
 * @param {Object} aspect - Aspect object with transit, natal, type, and orbDeg properties
 * @returns {Object|null} Score object with magnitude, valence, volatility or null if not scoreable
 */
function scoreAspect(aspect) {
  if (!aspect || !aspect.transit || !aspect.natal || !aspect.type) {
    return null;
  }

  // Base scores for different aspect types
  const aspectScores = {
    'conjunction': { magnitude: 1.0, valence: 0.0, volatility: 0.8 },
    'opposition': { magnitude: 0.9, valence: -0.7, volatility: 0.9 },
    'square': { magnitude: 0.8, valence: -0.6, volatility: 0.8 },
    'trine': { magnitude: 0.7, valence: 0.6, volatility: 0.3 },
    'sextile': { magnitude: 0.5, valence: 0.4, volatility: 0.2 },
    'quincunx': { magnitude: 0.4, valence: -0.2, volatility: 0.6 },
    'semisextile': { magnitude: 0.3, valence: 0.1, volatility: 0.3 },
    'semisquare': { magnitude: 0.4, valence: -0.3, volatility: 0.5 },
    'sesquiquadrate': { magnitude: 0.4, valence: -0.3, volatility: 0.5 }
  };

  const baseScore = aspectScores[aspect.type.toLowerCase()];
  if (!baseScore) {
    return null; // Unknown aspect type
  }

  // Planetary significance multipliers
  const transitPlanetMultiplier = getPlanetaryWeight(aspect.transit.body);
  const natalPlanetMultiplier = getPlanetaryWeight(aspect.natal.body);

  // Orb tightness factor (tighter orb = stronger effect)
  const orbFactor = calculateOrbFactor(aspect.orbDeg);

  // Angle proximity bonus
  const angleBonus = aspect.natal.isAngleProx ? 1.3 : 1.0;

  // Luminary bonus
  const luminaryBonus = aspect.natal.isLuminary ? 1.2 : 1.0;

  // Calculate final scores
  const magnitude = baseScore.magnitude * transitPlanetMultiplier * natalPlanetMultiplier * orbFactor * angleBonus * luminaryBonus;
  const valence = baseScore.valence * transitPlanetMultiplier * orbFactor;
  const volatility = baseScore.volatility * transitPlanetMultiplier * orbFactor;

  return {
    magnitude: Math.max(0, magnitude),
    valence: Math.max(-1, Math.min(1, valence)),
    volatility: Math.max(0, Math.min(1, volatility))
  };
}

/**
 * Get planetary weight based on astrological significance
 * @param {string} planetName - Name of the planet/point
 * @returns {number} Weight multiplier
 */
function getPlanetaryWeight(planetName) {
  const weights = {
    // Luminaries (highest impact)
    'Sun': 1.0,
    'Moon': 1.0,
    
    // Personal planets
    'Mercury': 0.8,
    'Venus': 0.8,
    'Mars': 0.8,
    
    // Social planets
    'Jupiter': 0.9,
    'Saturn': 0.9,
    
    // Outer planets (transformative)
    'Uranus': 0.7,
    'Neptune': 0.6,
    'Pluto': 0.8,
    
    // Angles (structural)
    'Ascendant': 0.9,
    'Medium_Coeli': 0.9,
    'Descendant': 0.9,
    'Imum_Coeli': 0.9,
    'MC': 0.9,
    'ASC': 0.9,
    'DSC': 0.9,
    'IC': 0.9,
    
    // Lunar nodes
    'North_Node': 0.5,
    'South_Node': 0.5,
    'True_Node': 0.5,
    
    // Other points
    'Chiron': 0.4,
    'Lilith': 0.3,
    'Part_of_Fortune': 0.3
  };

  return weights[planetName] || 0.3; // Default for unknown points
}

/**
 * Calculate orb tightness factor
 * @param {number} orbDeg - Orb in degrees
 * @returns {number} Factor between 0.3 and 1.0
 */
function calculateOrbFactor(orbDeg) {
  if (typeof orbDeg !== 'number' || orbDeg < 0) {
    return 0.5; // Default for invalid orb
  }
  
  // Tighter orb = stronger effect
  // 0° = 1.0, 6°+ = 0.3
  const factor = Math.max(0.3, 1.0 - (orbDeg / 10));
  return Math.min(1.0, factor);
}

module.exports = {
  aggregate,
  scoreAspect,
  getPlanetaryWeight,
  calculateOrbFactor
};