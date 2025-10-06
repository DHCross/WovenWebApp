/**
 * Canonical Balance Meter scaling utilities (runtime implementation).
 * Mirrors the v3.1 spec and pairs with TypeScript declarations for typing.
 */

const {
  amplifyByMagnitude,
  normalizeAmplifiedBias,
  normalizeVolatilityForCoherence,
} = require('./amplifiers');

const SPEC_VERSION = '3.1';
const SCALE_FACTOR = 50;
const RANGES = Object.freeze({
  magnitude: { min: 0, max: 5 },
  bias: { min: -5, max: 5 },
  coherence: { min: 0, max: 5 },
  sfd: { min: -1, max: 1 },
});

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

const ROUND_1DP = 1;
const ROUND_2DP = 2;

function scaleUnipolar(normalized) {
  const safe = Number.isFinite(normalized) ? normalized : 0;
  const raw = safe * SCALE_FACTOR;
  const [clamped, flags] = clamp(raw, RANGES.magnitude.min, RANGES.magnitude.max);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
}

function scaleBipolar(normalized) {
  const safe = Number.isFinite(normalized) ? normalized : 0;
  const raw = safe * SCALE_FACTOR;
  const [clamped, flags] = clamp(raw, RANGES.bias.min, RANGES.bias.max);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
}

function scaleCoherenceFromVol(volatilityNorm) {
  const safe = Number.isFinite(volatilityNorm) ? volatilityNorm : 0;
  const raw = RANGES.coherence.max - safe * SCALE_FACTOR;
  const [clamped, flags] = clamp(raw, RANGES.coherence.min, RANGES.coherence.max);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
}

const MINUS_SIGN = '−';

function scaleSFD(sfdRaw, preScaled = false) {
  if (sfdRaw == null || Number.isNaN(sfdRaw)) {
    return {
      raw: null,
      value: null,
      display: 'n/a',
      flags: { hitMin: false, hitMax: false },
    };
  }
  const base = preScaled ? sfdRaw : sfdRaw * 10;
  const [clamped, flags] = clamp(base, RANGES.sfd.min, RANGES.sfd.max);
  const value = roundHalfUp(clamped, ROUND_2DP);
  const formatted = value === 0
    ? '0.00'
    : value > 0
      ? value.toFixed(2)
      : `${MINUS_SIGN}${Math.abs(value).toFixed(2)}`;
  return {
    raw: base,
    value,
    display: formatted,
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

function sfdValue(raw, opts = {}) {
  return scaleSFD(raw, opts.preScaled === true).value;
}

function sfdDisplay(raw, opts = {}) {
  return scaleSFD(raw, opts.preScaled === true).display;
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

function getSFDLabel(value) {
  if (value === null || value === 'n/a') return 'n/a';
  const numValue = typeof value === 'string' ? Number(value.replace(MINUS_SIGN, '-')) : value;
  if (!Number.isFinite(numValue)) return 'n/a';
  if (numValue >= 0.5) return 'Strong Cooperation';
  if (numValue >= 0.1) return 'Mild Cooperation';
  if (numValue >= -0.1) return 'Balanced';
  if (numValue >= -0.5) return 'Mild Fragmentation';
  return 'Strong Fragmentation';
}

module.exports = {
  SPEC_VERSION,
  SCALE_FACTOR,
  RANGES,
  clamp,
  roundHalfUp,
  scaleUnipolar,
  scaleBipolar,
  scaleCoherenceFromVol,
  scaleSFD,
  toUnipolarDisplay,
  toBipolarDisplay,
  coherenceFromVolatility,
  sfdValue,
  sfdDisplay,
  getMagnitudeLabel,
  getDirectionalBiasLabel,
  getCoherenceLabel,
  getSFDLabel,
  clampValue,
  amplifyByMagnitude,
  normalizeAmplifiedBias,
  normalizeVolatilityForCoherence,
};
