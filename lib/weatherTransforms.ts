// weatherTransforms.ts
// Correct transform pipeline: normalize → scale → clamp → round → label
// Per Raven Calder diagnostic (2025-01-04)

import {
  clampValue,
  roundHalfUp,
  toBipolarDisplay,
  toUnipolarDisplay,
  coherenceFromVolatility,
  sfdValue,
} from './balance/scale';

export { getMagnitudeLabel, getDirectionalBiasLabel, getCoherenceLabel, getSFDLabel } from './balance/scale';

export type ScaleMode = "absolute_x50"; // future-proof
export const SCALE_MODE: ScaleMode = "absolute_x50";

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
 * Directional Bias: expects a normalized bias in [-0.1, +0.1] *when using "absolute_x50".
 * We DON'T clamp early. We scale, then clamp at the end to avoid "pegged at -5" artifacts.
 */
export function toDirectionalBias(normSignedBias: number, mode: ScaleMode = SCALE_MODE): number {
  if (mode === "absolute_x50") {
    return toBipolarDisplay(normSignedBias);
  }
  const scaled = normSignedBias * 5;
  return round1(clampValue(scaled, -5, 5));
}

/**
 * Magnitude (0..5) from normalized energy [0..0.1] in absolute_x50 mode.
 */
export function toMagnitude(normMag: number, mode: ScaleMode = SCALE_MODE): number {
  if (mode === "absolute_x50") {
    return toUnipolarDisplay(normMag);
  }
  const scaled = normMag * 5;
  return round1(clampValue(scaled, 0, 5));
}

/**
 * Coherence (0..5) = inverted, scaled Volatility.
 * Input: normalized volatility (e.g., [0..0.1] in absolute_x50).
 * Inversion happens AFTER scaling: coherence = 5 - scaledVol.
 */
export function toCoherence(normVolatility: number, mode: ScaleMode = SCALE_MODE): number {
  if (mode === "absolute_x50") {
    return coherenceFromVolatility(normVolatility);
  }
  const volScaled = normVolatility * 5;
  const coherence = 5 - volScaled;
  return round1(clampValue(coherence, 0, 5));
}

/**
 * SFD (−1.00..+1.00) = (Support − Friction) / (Support + Friction)
 * Pass summed weights already filtered by aspect category; return "null" when undefined.
 */
export function computeSFD(supportSum: number, frictionSum: number): number | null {
  const denom = supportSum + frictionSum;
  if (!isFinite(denom) || Math.abs(denom) < 1e-9) return null; // n/a: no drivers
  const raw = (supportSum - frictionSum) / denom;
  return sfdValue(raw, { preScaled: true });
}
