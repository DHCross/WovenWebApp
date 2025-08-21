/**
 * Seismograph module for calculating astrological transit impact metrics
 * This provides the aggregate function used by astrology-mathbrain.js
 */

/**
 * Calculate seismograph metrics from astrological aspects
 * @param {Array} aspects - Array of aspect objects with transit, natal, type, and orbDeg properties
 * @param {Object} prev - Previous calculation state with scored and Y_effective properties
 * @returns {Object} Aggregated metrics including magnitude, valence, volatility, scored, etc.
 */
function aggregate(aspects = [], prev = null) {
  if (!Array.isArray(aspects) || aspects.length === 0) {
    return {
      magnitude: 0,
      valence: 0,
      volatility: 0,
      scored: [],
      Y_effective: prev?.Y_effective || 0
    };
  }

  // Aspect strength weights based on type
  const aspectWeights = {
    'conjunction': 1.0,
    'opposition': 0.9,
    'square': 0.8,
    'trine': 0.6,
    'sextile': 0.5,
    'quincunx': 0.4,
    'semisquare': 0.3,
    'sesquiquadrate': 0.3,
    'quintile': 0.2,
    'biquintile': 0.2
  };

  // Valence mapping (positive/negative emotional impact)
  const aspectValence = {
    'conjunction': 0.1,   // Neutral to slightly positive
    'opposition': -0.7,   // Challenging
    'square': -0.8,       // Challenging
    'trine': 0.8,         // Harmonious
    'sextile': 0.6,       // Harmonious
    'quincunx': -0.3,     // Mildly challenging
    'semisquare': -0.5,   // Challenging
    'sesquiquadrate': -0.5, // Challenging
    'quintile': 0.4,      // Creative, positive
    'biquintile': 0.4     // Creative, positive
  };

  let totalMagnitude = 0;
  let totalValence = 0;
  let volatilityFactors = [];
  const scored = [];

  for (const aspect of aspects) {
    if (!aspect || !aspect.type) continue;

    const aspectType = aspect.type.toLowerCase();
    const weight = aspectWeights[aspectType] || 0.1;
    const valence = aspectValence[aspectType] || 0;
    
    // Calculate orb factor (tighter orbs = stronger influence)
    const orbDeg = typeof aspect.orbDeg === 'number' ? Math.abs(aspect.orbDeg) : 6.0;
    const orbFactor = Math.max(0.1, 1 - (orbDeg / 10)); // Stronger when orb is tighter
    
    // Natal point significance
    let natalFactor = 1.0;
    if (aspect.natal) {
      if (aspect.natal.isLuminary) natalFactor = 1.5; // Sun/Moon more significant
      if (aspect.natal.isAngleProx) natalFactor = 1.3; // Angles more significant
      if (aspect.natal.degCrit) natalFactor = 1.2; // Critical degrees
    }

    // Calculate individual aspect strength
    const aspectStrength = weight * orbFactor * natalFactor;
    const aspectValenceContribution = valence * aspectStrength;

    totalMagnitude += aspectStrength;
    totalValence += aspectValenceContribution;
    volatilityFactors.push(Math.abs(aspectValenceContribution));

    scored.push({
      transit: aspect.transit?.body || 'Unknown',
      natal: aspect.natal?.body || 'Unknown',
      type: aspectType,
      strength: aspectStrength,
      valence: aspectValenceContribution,
      orbDeg: orbDeg
    });
  }

  // Calculate volatility as the standard deviation of valence contributions
  const meanValence = volatilityFactors.length > 0 ? 
    volatilityFactors.reduce((sum, val) => sum + val, 0) / volatilityFactors.length : 0;
  
  const variance = volatilityFactors.length > 0 ?
    volatilityFactors.reduce((sum, val) => sum + Math.pow(val - meanValence, 2), 0) / volatilityFactors.length : 0;
  
  const volatility = Math.sqrt(variance);

  // Apply previous state influence (momentum factor)
  const prevYEffective = prev?.Y_effective || 0;
  const momentumFactor = 0.1; // How much previous state influences current
  const adjustedValence = totalValence + (prevYEffective * momentumFactor);

  return {
    magnitude: Math.round(totalMagnitude * 100) / 100,
    valence: Math.round(adjustedValence * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    scored: scored,
    Y_effective: adjustedValence
  };
}

module.exports = {
  aggregate
};