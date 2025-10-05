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

export const scaleUnipolar = (normalized: number) => {
  const safe = Number.isFinite(normalized) ? normalized : 0;
  const raw = safe * 50;
  const [clamped, flags] = clamp(raw, 0, 5);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
};

export const scaleBipolar = (normalized: number) => {
  const safe = Number.isFinite(normalized) ? normalized : 0;
  const raw = safe * 50;
  const [clamped, flags] = clamp(raw, -5, 5);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
};

export const scaleCoherenceFromVol = (volatilityNorm: number) => {
  const safe = Number.isFinite(volatilityNorm) ? volatilityNorm : 0;
  const raw = 5 - safe * 50;
  const [clamped, flags] = clamp(raw, 0, 5);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
};

const MINUS_SIGN = '−';

export const scaleSFD = (sfdRaw: number | null, preScaled = false) => {
  if (sfdRaw == null || Number.isNaN(sfdRaw)) {
    return {
      raw: null as number | null,
      value: null as number | null,
      display: 'n/a',
      flags: { hitMin: false, hitMax: false } as ClampInfo,
    };
  }
  const base = preScaled ? sfdRaw : sfdRaw * 10;
  const [clamped, flags] = clamp(base, -1, 1);
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
};

// Backwards-compatible helpers
export const toUnipolarDisplay = (normalized: number): number => scaleUnipolar(normalized).value;
export const toBipolarDisplay = (normalized: number): number => scaleBipolar(normalized).value;
export const coherenceFromVolatility = (volatilityNorm: number): number =>
  scaleCoherenceFromVol(volatilityNorm).value;
export const sfdValue = (raw: number | null, opts?: { preScaled?: boolean }): number | null =>
  scaleSFD(raw, opts?.preScaled ?? false).value;
export const sfdDisplay = (raw: number | null, opts?: { preScaled?: boolean }): string =>
  scaleSFD(raw, opts?.preScaled ?? false).display;

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

export function getCoherenceLabel(value: number): string {
  if (value >= 4) return 'Very Stable';
  if (value >= 2) return 'Stable';
  if (value >= 1) return 'Moderate';
  return 'Scattered';
}

export function getSFDLabel(value: number | null | string): string {
  if (value === null || value === 'n/a') return 'n/a';
  const numValue = typeof value === 'string' ? Number(value.replace(MINUS_SIGN, '-')) : value;
  if (!Number.isFinite(numValue)) return 'n/a';
  if (numValue >= 0.5) return 'Strong Cooperation';
  if (numValue >= 0.1) return 'Mild Cooperation';
  if (numValue >= -0.1) return 'Balanced';
  if (numValue >= -0.5) return 'Mild Fragmentation';
  return 'Strong Fragmentation';
}

// Convenience helper for modules needing simple clamp behavior
export const clampValue = (value: number, min: number, max: number): number => clamp(value, min, max)[0];

// Re-export domain amplifiers for single-import convenience
export { amplifyByMagnitude, normalizeAmplifiedBias, normalizeVolatilityForCoherence } from './amplifiers';
