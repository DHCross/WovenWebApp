// weatherTransforms.ts
// Correct transform pipeline: normalize → scale → clamp → round → label
// Per Raven Calder diagnostic (2025-01-04)

import {
  clampValue,
  roundHalfUp,
  toBipolarDisplay,
  toUnipolarDisplay,
  coherenceFromVolatility,
} from './balance/scale';

export { getMagnitudeLabel, getDirectionalBiasLabel, getCoherenceLabel } from './balance/scale';

export type ScaleMode = "absolute_x5";
export const SCALE_MODE: ScaleMode = "absolute_x5";

const round1 = (x: number) => roundHalfUp(x, 1);
const round2 = (x: number) => roundHalfUp(x, 2);

/**
 * Normalizes any raw value to [0,1] given min/max. If min===max, returns 0.
 */
export function normalize(raw: number, min: number, max: number): number {
  if (!isFinite(raw) || !isFinite(min) || !isFinite(max) || min === max) return 0;
  return clampValue((raw - min) / (max - min), 0, 1);
}

/**
 * Directional Bias: expects a normalized bias in [-1, +1] *when using "absolute_x5".
 * We DON'T clamp early. We scale, then clamp at the end to avoid "pegged at -5" artifacts.
 */
export function toDirectionalBias(normSignedBias: number, mode: ScaleMode = SCALE_MODE): number {
  if (mode === "absolute_x5") {
    return toBipolarDisplay(normSignedBias);
  }
  const scaled = normSignedBias * 5;
  return round1(clampValue(scaled, -5, 5));
}

/**
 * Magnitude (0..5) from normalized energy [0..1] in absolute_x5 mode.
 */
export function toMagnitude(normMag: number, mode: ScaleMode = SCALE_MODE): number {
  if (mode === "absolute_x5") {
    return toUnipolarDisplay(normMag);
  }
  const scaled = normMag * 5;
  return round1(clampValue(scaled, 0, 5));
}

/**
 * Coherence (0..5) = inverted, scaled Volatility.
 * Input: normalized volatility (e.g., [0..1] in absolute_x5).
 * Inversion happens AFTER scaling: coherence = 5 - scaledVol.
 */
export function toCoherence(normVolatility: number, mode: ScaleMode = SCALE_MODE): number {
  if (mode === "absolute_x5") {
    return coherenceFromVolatility(normVolatility);
  }
  const volScaled = normVolatility * 5;
  const coherence = 5 - volScaled;
  return round1(clampValue(coherence, 0, 5));
}


