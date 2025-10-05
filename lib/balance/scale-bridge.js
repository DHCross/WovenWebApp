/**
 * CommonJS bridge for balance meter scalers.
 * 
 * This module allows src/seismograph.js (CommonJS) to import TypeScript modules.
 * Since tsconfig has noEmit:true, we use tsx/ts-node runtime transpilation.
 * 
 * @module lib/balance/scale-bridge
 */

// Inline implementations extracted from TypeScript sources
// This ensures CommonJS compatibility without build step

/**
 * Amplify raw bias by magnitude
 * Formula: rawBias × (0.8 + 0.4 × mag)
 */
function amplifyByMagnitude(rawBias, mag) {
  const amplification = 0.8 + 0.4 * mag;
  return rawBias * amplification;
}

/**
 * Normalize amplified bias to [-1, +1] range
 * Formula: amplified / 100
 */
function normalizeAmplifiedBias(amplified) {
  return amplified / 100;
}

/**
 * Normalize volatility for coherence calculation
 * Formula: min(0.1, VI / 100)
 */
function normalizeVolatilityForCoherence(VI) {
  return Math.min(0.1, VI / 100);
}

/**
 * Scale bipolar value [-1, +1] to display range [-5, +5]
 * Returns {raw, value, flags: {hitMin, hitMax}}
 */
function scaleBipolar(normalizedValue) {
  const safe = Number.isFinite(normalizedValue) ? normalizedValue : 0;
  const raw = safe * 50;
  const clamped = Math.max(-5, Math.min(5, raw));
  const rounded = parseFloat(clamped.toFixed(1));
  
  return {
    raw,
    value: rounded,
    flags: {
      hitMin: raw < -5,
      hitMax: raw > 5,
    },
  };
}

/**
 * Scale unipolar value [0, 1] to display range [0, 5]
 * Returns {raw, value, flags: {hitMin, hitMax}}
 */
function scaleUnipolar(normalizedValue) {
  const safe = Number.isFinite(normalizedValue) ? normalizedValue : 0;
  const raw = safe * 50;
  const clamped = Math.max(0, Math.min(5, raw));
  const rounded = parseFloat(clamped.toFixed(1));
  
  return {
    raw,
    value: rounded,
    flags: {
      hitMin: raw < 0,
      hitMax: raw > 5,
    },
  };
}

/**
 * Scale coherence from volatility (inverted)
 * Formula: 5 - (vol_norm × 50)
 * Returns {raw, value, flags: {hitMin, hitMax}}
 */
function scaleCoherenceFromVol(volatilityNormalized) {
  const safe = Number.isFinite(volatilityNormalized) ? volatilityNormalized : 0;
  const raw = 5 - (safe * 50);
  const clamped = Math.max(0, Math.min(5, raw));
  const rounded = parseFloat(clamped.toFixed(1));
  
  return {
    raw,
    value: rounded,
    flags: {
      hitMin: raw < 0,
      hitMax: raw > 5,
    },
  };
}

/**
 * Scale SFD (support-friction delta) to [-1, +1] range
 * @param {number|null} sfdRaw - Already calculated SFD value (or null if no drivers)
 * @param {boolean} preScaled - If true, value is already in [-1, +1] range
 * Returns {raw, value, display, flags: {hitMin, hitMax}}
 */
function scaleSFD(sfdRaw, preScaled = false) {
  const MINUS_SIGN = '−';
  
  if (sfdRaw == null || Number.isNaN(sfdRaw)) {
    return {
      raw: null,
      value: null,
      display: 'n/a',
      flags: { hitMin: false, hitMax: false },
    };
  }
  
  // If preScaled, sfdRaw is already in [-1, +1]
  // Otherwise, scale by 10 (but calculateSFD already returns in [-1, +1], so we should use preScaled=true)
  const base = preScaled ? sfdRaw : sfdRaw * 10;
  const safe = Number.isFinite(base) ? base : 0;
  const clamped = Math.max(-1, Math.min(1, safe));
  const value = parseFloat(clamped.toFixed(2));
  
  const formatted = value === 0
    ? '0.00'
    : value > 0
      ? value.toFixed(2)
      : `${MINUS_SIGN}${Math.abs(value).toFixed(2)}`;
  
  return {
    raw: base,
    value,
    display: formatted,
    flags: {
      hitMin: safe < -1,
      hitMax: safe > 1,
    },
  };
}

module.exports = {
  scaleBipolar,
  scaleUnipolar,
  scaleCoherenceFromVol,
  scaleSFD,
  amplifyByMagnitude,
  normalizeAmplifiedBias,
  normalizeVolatilityForCoherence,
};
