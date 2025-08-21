// Seismograph module for astrological aspect aggregation
// Provides the aggregate function for calculating magnitude, valence, and volatility from transit aspects

/**
 * Aggregates astrological aspects into seismographic metrics
 * @param {Array} aspects - Array of aspect objects with transit/natal data
 * @param {Object|null} prev - Previous aggregation state with scored and Y_effective
 * @returns {Object} Aggregated metrics: {magnitude, valence, volatility, scored}
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
  let scoreSum = 0;

  for (const aspect of aspects) {
    // Extract aspect properties
    const transitBody = aspect.transit?.body || '';
    const natalBody = aspect.natal?.body || '';
    const aspectType = aspect.type || '';
    const orbDeg = aspect.orbDeg || 0;
    const isAngleProx = aspect.natal?.isAngleProx || false;
    const isLuminary = aspect.natal?.isLuminary || false;

    // Calculate magnitude based on orb (tighter orbs = higher magnitude)
    const orbMagnitude = Math.max(0, (10 - orbDeg) / 10);
    
    // Base magnitude with modifiers for important points
    let magnitude = orbMagnitude;
    if (isAngleProx) magnitude *= 1.5; // Angles are more significant
    if (isLuminary) magnitude *= 1.3; // Luminaries are important
    
    // Calculate valence based on aspect type
    let valence = 0;
    switch (aspectType.toLowerCase()) {
      case 'conjunction':
        valence = 0.1; // Neutral to slightly positive
        break;
      case 'sextile':
      case 'trine':
        valence = 0.7; // Positive aspects
        break;
      case 'square':
      case 'opposition':
        valence = -0.6; // Challenging aspects
        break;
      case 'quincunx':
      case 'sesquiquadrate':
        valence = -0.3; // Mildly challenging
        break;
      default:
        valence = 0; // Unknown aspects are neutral
    }

    // Calculate volatility (how much change/instability this aspect brings)
    let volatility = orbMagnitude * 0.5;
    if (['square', 'opposition'].includes(aspectType.toLowerCase())) {
      volatility *= 1.4; // Hard aspects increase volatility
    }

    // Outer planet modifiers (more intense, longer-lasting effects)
    const outerPlanets = ['saturn', 'uranus', 'neptune', 'pluto'];
    if (outerPlanets.includes(transitBody.toLowerCase())) {
      magnitude *= 1.2;
      volatility *= 1.1;
    }

    // Accumulate values
    totalMagnitude += magnitude;
    totalValence += valence * magnitude; // Weight valence by magnitude
    totalVolatility += volatility;
    scoreSum += magnitude; // For tracking total scoring weight
  }

  // Normalize values
  const avgMagnitude = totalMagnitude / aspects.length;
  const avgValence = scoreSum > 0 ? totalValence / scoreSum : 0;
  const avgVolatility = totalVolatility / aspects.length;

  // Apply smoothing with previous values if available
  let finalValence = avgValence;
  if (prev && typeof prev.Y_effective === 'number') {
    // Smooth transition from previous valence (momentum effect)
    finalValence = (avgValence * 0.7) + (prev.Y_effective * 0.3);
  }

  return {
    magnitude: Math.max(0, Math.min(10, avgMagnitude)), // Clamp to 0-10 range
    valence: Math.max(-2, Math.min(2, finalValence)), // Clamp to reasonable range
    volatility: Math.max(0, Math.min(5, avgVolatility)), // Clamp volatility
    scored: scoreSum
  };
}

module.exports = { aggregate };