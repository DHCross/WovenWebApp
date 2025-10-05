// weatherDataTransforms.ts
// Data flow layer: apply transforms BEFORE anything renders
// Single source of truth for display

import { toDirectionalBias, toMagnitude, toCoherence, computeSFD, getMagnitudeLabel, getDirectionalBiasLabel, getCoherenceLabel, getSFDLabel } from './weatherTransforms';

export type RawSeismograph = {
  magnitude?: number;
  valence?: number;
  valence_bounded?: number;
  bias_signed?: number;
  volatility?: number;
  sfd?: number;
};

export type TransformedWeatherData = {
  magnitude: number;
  magnitude_label: string;
  directional_bias: number;
  directional_bias_label: string;
  coherence: number;
  coherence_label: string;
  sfd: number | null;
  sfd_label: string;
  _raw: RawSeismograph; // preserve for debugging
  _clamped: {
    bias: boolean;
    magnitude: boolean;
    coherence: boolean;
  };
};

/**
 * Transform raw API seismograph data into display-ready values.
 * Apply: normalize → scale → clamp → round → label
 */
export function transformWeatherData(raw: RawSeismograph): TransformedWeatherData {
  // Extract raw values (API may send valence, valence_bounded, or bias_signed)
  const rawMag = raw.magnitude ?? 0;
  const rawBias = raw.bias_signed ?? raw.valence_bounded ?? raw.valence ?? 0;
  const rawVol = raw.volatility ?? 0;
  const rawSFD = raw.sfd;

  // Normalize to [0, 0.1] range (assuming backend sends 0-500 scale)
  // If backend already normalized, adjust divisor
  const normMag = rawMag / 100; // 0-500 → 0-5 → /100 = 0-0.05 (then * 50 = 0-2.5)
  // Actually, let's check the scale. If rawMag is already 0-5, don't divide
  // Based on user's screenshot showing ~3.13, it's already frontstage. Let's pass through.

  // IMPORTANT: Determine if values are already frontstage (0-5) or backstage (0-500)
  // User screenshot shows magnitude: 3.13, so it's FRONTSTAGE already
  // We'll apply minimal transform, just ensure coherence inversion

  const magnitude = typeof rawMag === 'number' ? Math.min(5, Math.max(0, Math.round(rawMag * 10) / 10)) : 0;

  // Directional Bias: if already in -5 to +5 range, just clamp
  const directional_bias = typeof rawBias === 'number' ? Math.min(5, Math.max(-5, Math.round(rawBias * 10) / 10)) : 0;

  // Coherence: INVERT volatility (this is the key fix)
  const volatility = typeof rawVol === 'number' ? Math.min(5, Math.max(0, rawVol)) : 0;
  const coherence = Math.round((5 - volatility) * 10) / 10;

  // SFD: pass through if valid, otherwise null
  const sfd = (typeof rawSFD === 'number' && isFinite(rawSFD))
    ? Math.min(1, Math.max(-1, Math.round(rawSFD * 100) / 100))
    : null;

  // Check for clamping
  const biasWasClamped = directional_bias === -5 || directional_bias === 5;
  const magWasClamped = magnitude === 0 || magnitude === 5;
  const cohWasClamped = coherence === 0 || coherence === 5;

  return {
    magnitude,
    magnitude_label: getMagnitudeLabel(magnitude),
    directional_bias,
    directional_bias_label: getDirectionalBiasLabel(directional_bias),
    coherence,
    coherence_label: getCoherenceLabel(coherence),
    sfd,
    sfd_label: getSFDLabel(sfd),
    _raw: raw,
    _clamped: {
      bias: biasWasClamped,
      magnitude: magWasClamped,
      coherence: cohWasClamped,
    },
  };
}

/**
 * Transform a day's worth of transit data
 */
export function transformDailyWeather(dayData: any): TransformedWeatherData {
  const seismo = dayData?.seismograph || dayData || {};
  return transformWeatherData(seismo);
}

/**
 * Transform entire transitsByDate object
 */
export function transformTransitsByDate(transitsByDate: Record<string, any>): Record<string, TransformedWeatherData> {
  const transformed: Record<string, TransformedWeatherData> = {};

  Object.entries(transitsByDate).forEach(([date, dayData]) => {
    transformed[date] = transformDailyWeather(dayData);
  });

  return transformed;
}
