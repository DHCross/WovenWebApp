import {
  scaleUnipolar,
  scaleBipolar,
  scaleCoherenceFromVol,
  scaleSFD,
  getMagnitudeLabel,
  getDirectionalBiasLabel,
  getCoherenceLabel,
  getSFDLabel,
  ClampInfo,
} from './balance/scale';
import { assertBalanceMeterInvariants } from './balance/assertions';

export type RawSeismograph = {
  magnitude?: number;
  valence?: number;
  valence_bounded?: number;
  bias_signed?: number;
  volatility?: number;
  sfd?: number;
  raw_magnitude?: number;
  raw_bias_signed?: number;
  raw_volatility?: number;
};

export type AxisDisplay = {
  normalized: number;
  raw: number;
  value: number;
  flags: ClampInfo;
};

export type SfdDisplay = {
  normalized: number | null;
  raw: number | null;
  value: number | null;
  display: string;
  flags: ClampInfo;
};

export type TransformedWeatherData = {
  axes: {
    magnitude: AxisDisplay;
    directional_bias: AxisDisplay;
    coherence: AxisDisplay;
    sfd: SfdDisplay;
  };
  labels: {
    magnitude: string;
    directional_bias: string;
    coherence: string;
    sfd: string;
  };
  scaling: {
    mode: 'absolute';
    factor: 50;
    pipeline: 'scale→clamp→round';
    coherence_inversion: true;
  };
  _raw: RawSeismograph;
};

const SCALING_META = Object.freeze({
  mode: 'absolute' as const,
  factor: 50 as const,
  pipeline: 'scale→clamp→round' as const,
  coherence_inversion: true as const,
});

const MAX_GUESS_NORMALIZED = 0.25;
const FALLBACK_DIVISORS = [50, 100, 500, 1000, 5000, 10000];

export function transformWeatherData(raw: RawSeismograph): TransformedWeatherData {
  const magnitudeNormalized = normalizeAxis(raw.magnitude, raw.raw_magnitude);
  const biasNormalized = normalizeAxis(raw.bias_signed ?? raw.valence_bounded ?? raw.valence, raw.raw_bias_signed);
  const volatilityNormalized = normalizeAxis(raw.volatility, raw.raw_volatility);
  const sfdNormalized = resolveSfd(raw);

  const magnitudeScaled = scaleUnipolar(magnitudeNormalized);
  const biasScaled = scaleBipolar(biasNormalized);
  const coherenceScaled = scaleCoherenceFromVol(volatilityNormalized);
  const sfdScaled = scaleSFD(sfdNormalized, detectPreScaledSfd(raw));

  const axes = {
    magnitude: {
      normalized: magnitudeNormalized,
      raw: magnitudeScaled.raw,
      value: magnitudeScaled.value,
      flags: magnitudeScaled.flags,
    },
    directional_bias: {
      normalized: biasNormalized,
      raw: biasScaled.raw,
      value: biasScaled.value,
      flags: biasScaled.flags,
    },
    coherence: {
      normalized: volatilityNormalized,
      raw: coherenceScaled.raw,
      value: coherenceScaled.value,
      flags: coherenceScaled.flags,
    },
    sfd: {
      normalized: sfdNormalized,
      raw: sfdScaled.raw,
      value: sfdScaled.value,
      display: sfdScaled.display,
      flags: sfdScaled.flags,
    },
  };

  const result = {
    axes,
    labels: {
      magnitude: getMagnitudeLabel(axes.magnitude.value),
      directional_bias: getDirectionalBiasLabel(axes.directional_bias.value),
      coherence: getCoherenceLabel(axes.coherence.value),
      sfd: getSFDLabel(axes.sfd.display),
    },
    scaling: SCALING_META,
    _raw: raw,
  };

  // Runtime validation: enforce spec v3.1 compliance
  assertBalanceMeterInvariants(result);

  return result;
}

export function transformDailyWeather(dayData: any): TransformedWeatherData {
  const seismo = dayData?.seismograph || dayData || {};
  return transformWeatherData(seismo);
}

export function transformTransitsByDate(transitsByDate: Record<string, any>): Record<string, TransformedWeatherData> {
  const transformed: Record<string, TransformedWeatherData> = {};
  Object.entries(transitsByDate).forEach(([date, dayData]) => {
    transformed[date] = transformDailyWeather(dayData);
  });
  return transformed;
}

function normalizeAxis(primary?: number | null, fallback?: number | null): number {
  const candidateSources = [primary, fallback];
  for (const source of candidateSources) {
    if (!Number.isFinite(source as number)) continue;
    const value = source as number;
    const abs = Math.abs(value);
    if (abs <= MAX_GUESS_NORMALIZED) {
      return value;
    }
    for (const divisor of FALLBACK_DIVISORS) {
      const divided = value / divisor;
      if (Math.abs(divided) <= MAX_GUESS_NORMALIZED) {
        return divided;
      }
    }
  }
  return 0;
}

function resolveSfd(raw: RawSeismograph): number | null {
  const candidates: Array<number | null | undefined> = [
    raw.sfd,
    (raw as Record<string, unknown>).sfd_cont as number | undefined,
    (raw as Record<string, unknown>).integration_bias as number | undefined,
    (raw as Record<string, unknown>).integrationBias as number | undefined,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return null;
}

function detectPreScaledSfd(raw: RawSeismograph): boolean {
  const value = resolveSfd(raw);
  if (value == null) return false;
  return Math.abs(value) > 0.15;
}
