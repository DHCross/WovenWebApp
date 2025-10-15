export type ClampInfo = { hitMin: boolean; hitMax: boolean };

export const clamp = (value: number, min: number, max: number): [number, ClampInfo] => {
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
};

export const roundHalfUp = (value: number, decimals = 1): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  const adjusted = Math.round(Math.abs(value) * factor + Number.EPSILON);
  return Math.sign(value) * (adjusted / factor);
};

const ROUND_1DP = 1;
const ROUND_2DP = 2;

// Scale factor used by the rendering system
export const SCALE_FACTOR = 5;

export const scaleUnipolar = (normalized: number) => {
  const safe = Number.isFinite(normalized) ? normalized : 0;
  const raw = safe * SCALE_FACTOR;
  const [clamped, flags] = clamp(raw, 0, 5);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
};

export const scaleBipolar = (normalized: number) => {
  const safe = Number.isFinite(normalized) ? normalized : 0;
  const raw = safe * SCALE_FACTOR;
  const [clamped, flags] = clamp(raw, -5, 5);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
};

// Backwards-compatible helpers
export const toUnipolarDisplay = (normalized: number): number => scaleUnipolar(normalized).value;
export const toBipolarDisplay = (normalized: number): number => scaleBipolar(normalized).value;

// Legacy label helpers
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

// Convenience helper for modules needing simple clamp behavior
export const clampValue = (value: number, min: number, max: number): number => clamp(value, min, max)[0];

// Re-export domain amplifiers for single-import convenience
export { amplifyByMagnitude, normalizeAmplifiedBias, normalizeVolatilityForCoherence } from './amplifiers';
