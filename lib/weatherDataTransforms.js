/**
 * Runtime transforms for Balance Meter seismograph outputs.
 * Mirrors the TypeScript definitions in `weatherDataTransforms.ts` so that
 * CommonJS consumers can share the same scaling + invariant enforcement.
 */

const {
  scaleUnipolar,
  scaleBipolar,
  getMagnitudeLabel,
  getDirectionalBiasLabel,
} = require('./balance/scale');
const { assertBalanceMeterInvariants } = require('./balance/assertions');

const SCALING_META = Object.freeze({
  mode: 'absolute',
  factor: 5,
  pipeline: 'normalize→scale→clamp→round',
});

const MAX_GUESS_NORMALIZED = 0.12;
const FALLBACK_DIVISORS = [10, 100];

function transformWeatherData(raw = {}) {
  const magN = normalizeAxis(raw.magnitude, raw.raw_magnitude);
  const biasCandidate = raw.bias_signed ?? raw.valence_bounded ?? raw.valence;
  const biasN = normalizeAxis(biasCandidate, raw.raw_bias_signed);

  const magnitudeScaled = scaleUnipolar(magN.value);
  const biasScaled = scaleBipolar(biasN.value);

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
  };

  const result = {
    axes,
    labels: {
      magnitude: getMagnitudeLabel(axes.magnitude.value),
      directional_bias: getDirectionalBiasLabel(axes.directional_bias.value),
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

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function transformFieldFileDaily(fieldFile = {}) {
  const daily = fieldFile && typeof fieldFile === 'object' ? fieldFile.daily : null;
  if (!daily || typeof daily !== 'object') return {};

  const transformed = {};

  Object.entries(daily).forEach(([date, entry]) => {
    const meter = entry && typeof entry === 'object' ? entry.meter : null;
    const magX10 = meter ? toFiniteNumber(meter.mag_x10) : null;
    const biasX10 = meter ? toFiniteNumber(meter.bias_x10) : null;

    const magnitude = magX10 !== null ? magX10 / 10 : null;
    const directionalBias = biasX10 !== null ? biasX10 / 10 : null;

    const magnitudeNorm = magnitude !== null
      ? clamp(magnitude / SCALING_META.factor, 0, 1)
      : 0;
    const biasNorm = directionalBias !== null
      ? clamp(directionalBias / SCALING_META.factor, -1, 1)
      : 0;

    const magnitudeScaled = scaleUnipolar(magnitudeNorm);
    const biasScaled = scaleBipolar(biasNorm);

    transformed[date] = {
      axes: {
        magnitude: {
          normalized: magnitudeNorm,
          raw: magnitudeScaled.raw,
          value: magnitudeScaled.value,
          flags: magnitudeScaled.flags,
          source: 'field_meter',
        },
        directional_bias: {
          normalized: biasNorm,
          raw: biasScaled.raw,
          value: biasScaled.value,
          flags: biasScaled.flags,
          source: 'field_meter',
        },
      },
      labels: {
        magnitude: getMagnitudeLabel(magnitudeScaled.value),
        directional_bias: getDirectionalBiasLabel(biasScaled.value),
      },
      scaling: SCALING_META,
      _raw: {
        magnitude: magnitude !== null ? magnitude : undefined,
        valence: directionalBias !== null ? directionalBias : undefined,
        valence_bounded: directionalBias !== null ? directionalBias : undefined,
        bias_signed: directionalBias !== null ? directionalBias : undefined,
      },
    };
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
  transformFieldFileDaily,
};
