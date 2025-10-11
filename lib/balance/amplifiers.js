/**
 * Domain-specific amplification helpers for Balance Meter calculations.
 * Mirrors the v3.1 spec implementation used by TypeScript callers.
 */

// Outer-planet & orb amplification applied to signed raw S before normalization.
function applyGeometryAmplification(S_raw, aspect) {
  const OUTERS = new Set(['Saturn','Uranus','Neptune','Pluto']);
  const isOuterPair = OUTERS.has(aspect.p1) || OUTERS.has(aspect.p2);
  const isDoubleOuter = OUTERS.has(aspect.p1) && OUTERS.has(aspect.p2);

  // Tightness boost (major aspects) — spec v3 mandate: reward ≤3°
  const MAJOR = new Set(['conjunction','opposition','square','trine','sextile']);
  const tight = Math.max(0, 1 - (aspect.orbDeg / (MAJOR.has(aspect.type) ? 3 : 1))); // 0..1
  const tightBoost = 1 + (0.35 * tight);       // up to ×1.35 for exact majors

  // Outer planet potency
  const outerBoost =
    isDoubleOuter ? 1.35 :
    isOuterPair   ? 1.20 : 1.0;

  // Catastrophe kicker: Pluto/Saturn participating AND orb ≤ 1°
  const catastrophe =
    (aspect.p1 === 'Pluto' || aspect.p2 === 'Pluto' || aspect.p1 === 'Saturn' || aspect.p2 === 'Saturn') &&
    aspect.orbDeg <= 1 ? 1.15 : 1.0;

  return S_raw * tightBoost * outerBoost * catastrophe;
}

/**
 * Amplify directional bias signal based on magnitude.
 * 
 * Higher magnitude days have more pronounced directional signals.
 * This asymmetric amplification accounts for the observation that
 * high-energy fields show clearer directional trends.
 * 
 * @param {number} rawBias - Raw directional bias (sum of aspect scores)
 * @param {number} magnitude0to5 - Magnitude on [0, 5] scale
 * @returns {number} Amplified bias ready for normalization
 * 
 * @example
 * // Low magnitude day: minimal amplification
 * amplifyByMagnitude(-10, 1.0) // → -10 × (0.8 + 0.4×1.0) = -12
 * 
 * // High magnitude day: maximum amplification
 * amplifyByMagnitude(-10, 5.0) // → -10 × (0.8 + 0.4×5.0) = -28
 */
function amplifyByMagnitude(rawBias, magnitude0to5) {
  if (!Number.isFinite(rawBias) || !Number.isFinite(magnitude0to5)) {
    return 0;
  }
  
  // Base weight 0.8 + magnitude-dependent boost up to 2.8×
  // Ensures low-magnitude days aren't over-amplified
  const amplificationFactor = 0.8 + 0.4 * magnitude0to5;
  return rawBias * amplificationFactor;
}

const BIAS_DIVISOR = 50;  // v5.0: Prevents saturation with magnitude amplification (0.8-2.8x)
const VOLATILITY_DIVISOR = 50;

/**
 * Normalize amplified bias to [-1, +1] typical range.
 *
 * After magnitude amplification (0.8-2.8x), Y_amplified typically ranges from
 * -28 to +28 for extreme days. Dividing by 50 maps this to [-0.56, +0.56],
 * which scales to [-2.8, +2.8] display range, reserving ±5 for rare peaks.
 * 
 * @param {number} amplifiedBias - Output from amplifyByMagnitude()
 * @returns {number} Normalized bias in [-1, +1] range
 */
function normalizeAmplifiedBias(amplifiedBias) {
  if (!Number.isFinite(amplifiedBias)) {
    return 0;
  }

  const normalized = amplifiedBias / BIAS_DIVISOR;
  if (normalized > 1) return 1;
  if (normalized < -1) return -1;
  return normalized;
}

function normalizeVolatilityForCoherence(volatilityIndex) {
  if (!Number.isFinite(volatilityIndex) || volatilityIndex < 0) {
    return 0;
  }
  const normalized = volatilityIndex / VOLATILITY_DIVISOR;
  return Math.min(1, Math.max(0, normalized));
}

module.exports = {
  BIAS_DIVISOR,
  VOLATILITY_DIVISOR,
  applyGeometryAmplification,
  amplifyByMagnitude,
  normalizeAmplifiedBias,
  normalizeVolatilityForCoherence,
};
