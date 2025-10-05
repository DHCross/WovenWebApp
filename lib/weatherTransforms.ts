// weatherTransforms.ts
// Correct transform pipeline: normalize → scale → clamp → round → label
// Per Raven Calder diagnostic (2025-01-04)

export type ScaleMode = "absolute_x50"; // future-proof
export const SCALE_MODE: ScaleMode = "absolute_x50";

// ---------- helpers ----------
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const round1 = (x: number) => Math.round(x * 10) / 10;
const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Normalizes any raw value to [0,1] given min/max. If min===max, returns 0.
 */
export function normalize(raw: number, min: number, max: number): number {
  if (!isFinite(raw) || !isFinite(min) || !isFinite(max) || min === max) return 0;
  return clamp((raw - min) / (max - min), 0, 1);
}

/**
 * Directional Bias: expects a normalized bias in [-0.1, +0.1] *when using "absolute_x50".
 * We DON'T clamp early. We scale, then clamp at the end to avoid "pegged at -5" artifacts.
 */
export function toDirectionalBias(normSignedBias: number, mode: ScaleMode = SCALE_MODE): number {
  let scaled: number;
  if (mode === "absolute_x50") {
    // map [-0.1..+0.1] → [-5..+5]
    scaled = normSignedBias * 50;
  } else {
    scaled = normSignedBias * 5; // fallback
  }
  return round1(clamp(scaled, -5, 5));
}

/**
 * Magnitude (0..5) from normalized energy [0..0.1] in absolute_x50 mode.
 */
export function toMagnitude(normMag: number, mode: ScaleMode = SCALE_MODE): number {
  const scaled = mode === "absolute_x50" ? normMag * 50 : normMag * 5;
  return round1(clamp(scaled, 0, 5));
}

/**
 * Coherence (0..5) = inverted, scaled Volatility.
 * Input: normalized volatility (e.g., [0..0.1] in absolute_x50).
 * Inversion happens AFTER scaling: coherence = 5 - scaledVol.
 */
export function toCoherence(normVolatility: number, mode: ScaleMode = SCALE_MODE): number {
  const volScaled = mode === "absolute_x50" ? normVolatility * 50 : normVolatility * 5;
  const coherence = 5 - volScaled;
  return round1(clamp(coherence, 0, 5));
}

/**
 * SFD (−1.00..+1.00) = (Support − Friction) / (Support + Friction)
 * Pass summed weights already filtered by aspect category; return "null" when undefined.
 */
export function computeSFD(supportSum: number, frictionSum: number): number | null {
  const denom = supportSum + frictionSum;
  if (!isFinite(denom) || Math.abs(denom) < 1e-9) return null; // n/a: no drivers
  const raw = (supportSum - frictionSum) / denom;
  return round2(clamp(raw, -1, 1));
}

// Labels for each channel
export function getMagnitudeLabel(value: number): string {
  if (value >= 4) return 'Peak';
  if (value >= 2) return 'Active';
  if (value >= 1) return 'Murmur';
  return 'Latent';
}

export function getDirectionalBiasLabel(value: number): string {
  if (value >= 3) return 'Strong Outward';
  if (value >= 1) return 'Mild Outward';
  if (value >= -1) return 'Equilibrium';
  if (value >= -3) return 'Mild Inward';
  return 'Strong Inward';
}

export function getCoherenceLabel(value: number): string {
  if (value >= 4) return 'Very Stable';
  if (value >= 2) return 'Stable';
  if (value >= 1) return 'Moderate';
  return 'Scattered';
}

export function getSFDLabel(value: number | null): string {
  if (value === null) return 'n/a';
  if (value >= 0.5) return 'Strong Cooperation';
  if (value >= 0.1) return 'Mild Cooperation';
  if (value >= -0.1) return 'Balanced';
  if (value >= -0.5) return 'Mild Fragmentation';
  return 'Strong Fragmentation';
}
