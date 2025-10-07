import { amplifyByMagnitude, normalizeAmplifiedBias, normalizeVolatilityForCoherence } from './amplifiers';

export declare const SPEC_VERSION = "3.1";
export declare const SCALE_FACTOR = 5;
export declare const RANGES: {
  readonly magnitude: { readonly min: number; readonly max: number };
  readonly bias: { readonly min: number; readonly max: number };
  readonly coherence: { readonly min: number; readonly max: number };
  readonly sfd: { readonly min: number; readonly max: number };
};

export type ClampInfo = { hitMin: boolean; hitMax: boolean };
export declare const clamp: (value: number, min: number, max: number) => [number, ClampInfo];
export declare const roundHalfUp: (value: number, decimals?: number) => number;
export declare const scaleUnipolar: (normalized: number) => { raw: number; value: number; flags: ClampInfo };
export declare const scaleBipolar: (normalized: number) => { raw: number; value: number; flags: ClampInfo };
export declare const scaleCoherenceFromVol: (volatilityNorm: number) => { raw: number; value: number; flags: ClampInfo };
export declare const scaleSFD: (sfdRaw: number | null, preScaled?: boolean) => {
  raw: number | null;
  value: number | null;
  display: string;
  flags: ClampInfo;
};
export declare const toUnipolarDisplay: (normalized: number) => number;
export declare const toBipolarDisplay: (normalized: number) => number;
export declare const coherenceFromVolatility: (volatilityNorm: number) => number;
export declare const sfdValue: (raw: number | null, opts?: { preScaled?: boolean }) => number | null;
export declare const sfdDisplay: (raw: number | null, opts?: { preScaled?: boolean }) => string;
export declare function getMagnitudeLabel(value: number): string;
export declare function getDirectionalBiasLabel(value: number): string;
export declare function getCoherenceLabel(value: number): string;
export declare function getSFDLabel(value: number | null | string): string;
export declare const clampValue: (value: number, min: number, max: number) => number;
export { amplifyByMagnitude, normalizeAmplifiedBias, normalizeVolatilityForCoherence };
