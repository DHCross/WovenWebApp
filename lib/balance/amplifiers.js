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

// Optional day-level amplification by resulting magnitude (gentle)
// used only after summing S; keeps 0.8..1.2 range
function amplifyByMagnitude(sumS, magnitude0to5) {
  const k = 0.08; // small—prevents runaway
  return sumS * (1 + k * (magnitude0to5 - 2.5)); // center at 2.5
}

const BIAS_DIVISOR = 10;
const VOLATILITY_DIVISOR = 100;

function normalizeAmplifiedBias(amplifiedBias) {
  if (!Number.isFinite(amplifiedBias)) {
    return 0;
  }
  return amplifiedBias / BIAS_DIVISOR;
}

function normalizeVolatilityForCoherence(volatilityIndex) {
  if (!Number.isFinite(volatilityIndex) || volatilityIndex < 0) {
    return 0;
  }
  return Math.min(0.1, volatilityIndex / VOLATILITY_DIVISOR);
}

module.exports = {
  BIAS_DIVISOR,
  VOLATILITY_DIVISOR,
  applyGeometryAmplification,
  amplifyByMagnitude,
  normalizeAmplifiedBias,
  normalizeVolatilityForCoherence,
};
