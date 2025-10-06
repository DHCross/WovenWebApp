/**
 * Domain-specific amplification helpers for Balance Meter calculations (spec v3.1).
 */
export declare const BIAS_DIVISOR = 100;
export declare const VOLATILITY_DIVISOR = 100;
export declare const amplifyByMagnitude: (rawBias: number, magnitude0to5: number) => number;
export declare const normalizeAmplifiedBias: (amplifiedBias: number) => number;
export declare const normalizeVolatilityForCoherence: (volatilityIndex: number) => number;
