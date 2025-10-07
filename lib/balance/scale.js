/**
 * Canonical Balance Meter scaling utilities (runtime implementation).
 * Mirrors the v3.1 spec and pairs with TypeScript declarations for typing.
 */

const {
  amplifyByMagnitude,
  normalizeAmplifiedBias,
  normalizeVolatilityForCoherence,
} = require('./amplifiers');

const {
  SPEC_VERSION,
  SCALE_FACTOR,
  ROUND_1DP,
  RANGE_MAG,
  RANGE_BIAS,
  RANGE_COH,
} = require('./constants');

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return [min, { hitMin: true, hitMax: false }];
  }
  if (value < min) {
    return [min, { hitMin: true, hitMax: false }];
  }
  if (value > max) {
    return [max, { hitMin: false, hitMax: true }];
  }
  return [value, { hitMin: false, hitMax: false }];
}

function roundHalfUp(value, decimals = 1) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  const shifted = value * factor;
  const rounded = shifted >= 0 ? Math.floor(shifted + 0.5) : Math.ceil(shifted - 0.5);
  return rounded / factor;
}

const ROUND_2DP = 2;

function scaleUnipolar(normalized) {
  const safe = Number.isFinite(normalized) ? normalized : 0;
  const raw = safe * SCALE_FACTOR;
  const [clamped, flags] = clamp(raw, RANGE_MAG[0], RANGE_MAG[1]);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
}

function scaleBipolar(normalized) {
  const safe = Number.isFinite(normalized) ? normalized : 0;
  const raw = safe * SCALE_FACTOR;
  const [clamped, flags] = clamp(raw, RANGE_BIAS[0], RANGE_BIAS[1]);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
}

function scaleCoherenceFromVol(volatilityNorm) {
  const safe = Number.isFinite(volatilityNorm) ? volatilityNorm : 0;
  const raw = RANGE_COH[1] - safe * SCALE_FACTOR;
  const [clamped, flags] = clamp(raw, RANGE_COH[0], RANGE_COH[1]);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
}


function toUnipolarDisplay(normalized) {
  return scaleUnipolar(normalized).value;
}

function toBipolarDisplay(normalized) {
  return scaleBipolar(normalized).value;
}

function coherenceFromVolatility(volatilityNorm) {
  return scaleCoherenceFromVol(volatilityNorm).value;
}


function clampValue(value, min, max) {
  return clamp(value, min, max)[0];
}

function getMagnitudeLabel(value) {
  if (!Number.isFinite(value)) return 'n/a';
  if (value >= 4) return 'Peak';
  if (value >= 2) return 'Active';
  if (value >= 1) return 'Murmur';
  return 'Latent';
}

function getDirectionalBiasLabel(value) {
  if (!Number.isFinite(value)) return 'Equilibrium';
  if (value >= 3) return 'Strong Outward';
  if (value >= 1) return 'Mild Outward';
  if (value >= -1) return 'Equilibrium';
  if (value >= -3) return 'Mild Inward';
  return 'Strong Inward';
}

function getCoherenceLabel(value) {
  if (!Number.isFinite(value)) return 'n/a';
  if (value >= 4) return 'Very Stable';
  if (value >= 2) return 'Stable';
  if (value >= 1) return 'Moderate';
  return 'Scattered';
}


module.exports = {
  SPEC_VERSION,
  SCALE_FACTOR,
  RANGES: {
    magnitude: { min: RANGE_MAG[0], max: RANGE_MAG[1] },
    bias: { min: RANGE_BIAS[0], max: RANGE_BIAS[1] },
    coherence: { min: RANGE_COH[0], max: RANGE_COH[1] },
  },
  clamp,
  roundHalfUp,
  scaleUnipolar,
  scaleBipolar,
  scaleCoherenceFromVol,
  toUnipolarDisplay,
  toBipolarDisplay,
  coherenceFromVolatility,
  getMagnitudeLabel,
  getDirectionalBiasLabel,
  getCoherenceLabel,
  clampValue,
  amplifyByMagnitude,
  normalizeAmplifiedBias,
  normalizeVolatilityForCoherence,
};
