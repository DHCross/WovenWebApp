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

export const scaleCoherenceFromVol = (volatilityNorm: number) => {
  const safe = Number.isFinite(volatilityNorm) ? volatilityNorm : 0;
  const raw = 5 - safe * SCALE_FACTOR;
  const [clamped, flags] = clamp(raw, 0, 5);
  return {
    raw,
    value: roundHalfUp(clamped, ROUND_1DP),
    flags,
  };
};

const MINUS_SIGN = '−';

const warnOnce = (() => {
  const seen = new Set<string>();
  return (key: string, message: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    try {
      // eslint-disable-next-line no-console
      console.warn(message);
    } catch {
      /* noop */
    }
  };
})();

export const scaleSFD = (sfdRaw: number | null, preScaled = false) => {
  warnOnce(
    'scaleSFD',
    'DEPRECATED: scaleSFD() invoked. SFD was removed from Balance Meter v5. Use directional bias and magnitude instead.',
  );
  return {
    raw: null,
    value: null,
    display: 'deprecated',
    flags: { hitMin: false, hitMax: false } as ClampInfo,
  };
};

// Backwards-compatible helpers
export const toUnipolarDisplay = (normalized: number): number => scaleUnipolar(normalized).value;
export const toBipolarDisplay = (normalized: number): number => scaleBipolar(normalized).value;
export const coherenceFromVolatility = (volatilityNorm: number): number =>
  scaleCoherenceFromVol(volatilityNorm).value;
export const sfdValue = (raw: number | null, opts?: { preScaled?: boolean }): number | null => {
  warnOnce(
    'sfdValue',
    'DEPRECATED: sfdValue() invoked. SFD output is no longer supported.',
  );
  void opts; // retain signature
  return null;
};
export const sfdDisplay = (raw: number | null, opts?: { preScaled?: boolean }): string => {
  warnOnce(
    'sfdDisplay',
    'DEPRECATED: sfdDisplay() invoked. SFD output is no longer supported.',
  );
  void raw;
  void opts;
  return 'deprecated';
};

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
  warnOnce(
    'getSFDLabel',
    'DEPRECATED: getSFDLabel() invoked. SFD labels are no longer provided.',
  );
  void value;
  return 'Deprecated';
}

// Convenience helper for modules needing simple clamp behavior
export const clampValue = (value: number, min: number, max: number): number => clamp(value, min, max)[0];

// Re-export domain amplifiers for single-import convenience
export { amplifyByMagnitude, normalizeAmplifiedBias, normalizeVolatilityForCoherence } from './amplifiers';
