/**
 * Domain-specific amplification helpers for Balance Meter calculations.
 * Mirrors the v3.1 spec implementation used by TypeScript callers.
 */

const BIAS_DIVISOR = 100;
const VOLATILITY_DIVISOR = 100;

function amplifyByMagnitude(rawBias, magnitude0to5) {
  if (!Number.isFinite(rawBias) || !Number.isFinite(magnitude0to5)) {
    return 0;
  }

  const m = Math.max(0, Math.min(5, magnitude0to5));
  const amplificationFactor = 0.8 + 0.4 * m;
  return rawBias * amplificationFactor;
}

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
  amplifyByMagnitude,
  normalizeAmplifiedBias,
  normalizeVolatilityForCoherence,
};
