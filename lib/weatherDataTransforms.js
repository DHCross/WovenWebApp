/**
 * Runtime transforms for Balance Meter seismograph outputs.
 * Mirrors the TypeScript definitions in `weatherDataTransforms.ts` so that
 * CommonJS consumers can share the same scaling + invariant enforcement.
 */

const {
  scaleUnipolar,
  scaleBipolar,
  scaleCoherenceFromVol,
  getMagnitudeLabel,
  getDirectionalBiasLabel,
  getCoherenceLabel,
} = require('./balance/scale');
const { assertBalanceMeterInvariants } = require('./balance/assertions');

const SCALING_META = Object.freeze({
  mode: 'absolute',
  factor: 5,
  pipeline: 'normalize→scale→clamp→round',
  coherence_inversion: true,
});

const MAX_GUESS_NORMALIZED = 0.12;
const FALLBACK_DIVISORS = [10, 100];

function transformWeatherData(raw = {}) {
  const magN = normalizeAxis(raw.magnitude, raw.raw_magnitude);
  const biasCandidate = raw.bias_signed ?? raw.valence_bounded ?? raw.valence;
  const biasN = normalizeAxis(biasCandidate, raw.raw_bias_signed);
  const volN = normalizeAxis(raw.volatility, raw.raw_volatility);

  const volatilityBounded = Math.max(0, Math.min(MAX_GUESS_NORMALIZED, volN.value));

  const magnitudeScaled = scaleUnipolar(magN.value);
  const biasScaled = scaleBipolar(biasN.value);
  const coherenceScaled = scaleCoherenceFromVol(volatilityBounded);

  const axes = {
    magnitude: {
      normalized: magN.value,
      raw: magnitudeScaled.raw,
      value: magnitudeScaled.value,
      flags: magnitudeScaled.flags,
      source: magN.source,
    },
    directional_bias: {
      normalized: biasN.value,
      raw: biasScaled.raw,
      value: biasScaled.value,
      flags: biasScaled.flags,
      source: biasN.source,
    },
    coherence: {
      normalized: volN.value,
      raw: coherenceScaled.raw,
      value: coherenceScaled.value,
      flags: coherenceScaled.flags,
      source: volN.source,
    },
  };

  const result = {
    axes,
    labels: {
      magnitude: getMagnitudeLabel(axes.magnitude.value),
      directional_bias: getDirectionalBiasLabel(axes.directional_bias.value),
      coherence: getCoherenceLabel(axes.coherence.value),
    },
    scaling: SCALING_META,
    _raw: raw,
  };

  assertBalanceMeterInvariants(result);

  return result;
}

function transformDailyWeather(dayData) {
  const seismo = dayData && typeof dayData === 'object' ? (dayData.seismograph || dayData) : {};
  return transformWeatherData(seismo);
}

function transformTransitsByDate(transitsByDate = {}) {
  const transformed = {};
  Object.entries(transitsByDate).forEach(([date, dayData]) => {
    transformed[date] = transformDailyWeather(dayData);
  });
  return transformed;
}

function normalizeAxis(primary, fallback) {
  const candidates = [
    { src: 'primary', val: primary },
    { src: 'raw_fallback', val: fallback },
  ];

  for (const { src, val } of candidates) {
    if (!Number.isFinite(val)) continue;
    const n = Number(val);
    const abs = Math.abs(n);

    // If the value is already in the normalized range [0, 0.12], it's a direct hit.
    if (abs <= MAX_GUESS_NORMALIZED) {
      return { value: n, source: src };
    }

    // If the value is in the final display range [0.12+, 5], reverse the scaling.
    if (abs > MAX_GUESS_NORMALIZED && abs <= SCALING_META.factor) {
      return { value: n / SCALING_META.factor, source: 'reversed_scale' };
    }

    // Fallback for legacy data: try dividing by common historical factors.
    for (const div of FALLBACK_DIVISORS) {
      const divided = n / div;
      if (Math.abs(divided) <= MAX_GUESS_NORMALIZED) {
        return { value: divided, source: div === 10 ? 'div_10' : 'div_100' };
      }
    }
  }

  return { value: 0, source: 'zero_default' };
}

module.exports = {
  transformWeatherData,
  transformDailyWeather,
  transformTransitsByDate,
};
