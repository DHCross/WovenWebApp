/**
 * Domain-specific amplification logic for Balance Meter calculations.
 * 
 * These helpers apply context-aware transformations BEFORE canonical scaling.
 * All functions here must be deterministic and maintain spec v3.1 compliance.
 * 
 * @module lib/balance/amplifiers
 */

/**
 * Amplify directional bias signal based on magnitude.
 * 
 * Higher magnitude days have more pronounced directional signals.
 * This asymmetric amplification accounts for the observation that
 * high-energy fields show clearer directional trends.
 * 
 * @param rawBias - Raw directional bias (sum of aspect scores)
 * @param magnitude0to5 - Magnitude on [0, 5] scale
 * @returns Amplified bias ready for normalization
 * 
 * @example
 * // Low magnitude day: minimal amplification
 * amplifyByMagnitude(-10, 1.0) // → -10 × (0.8 + 0.4×1.0) = -12
 * 
 * // High magnitude day: maximum amplification
 * amplifyByMagnitude(-10, 5.0) // → -10 × (0.8 + 0.4×5.0) = -28
 */
export const amplifyByMagnitude = (rawBias: number, magnitude0to5: number): number => {
  if (!Number.isFinite(rawBias) || !Number.isFinite(magnitude0to5)) {
    return 0;
  }
  
  // Base weight 0.8 + magnitude-dependent boost up to 2.8×
  // Ensures low-magnitude days aren't over-amplified
  const amplificationFactor = 0.8 + 0.4 * magnitude0to5;
  return rawBias * amplificationFactor;
};

/**
 * Normalize amplified bias to [-0.1, +0.1] typical range.
 * 
 * After magnitude amplification, Y_amplified typically ranges from -10 to +10
 * for extreme days. This normalization prepares the value for canonical
 * ×50 scaling to the display range [-5, +5].
 * 
 * @param amplifiedBias - Output from amplifyByMagnitude()
 * @returns Normalized bias in [-0.1, +0.1] range
 */
export const normalizeAmplifiedBias = (amplifiedBias: number): number => {
  if (!Number.isFinite(amplifiedBias)) {
    return 0;
  }
  
  // Y_amplified / 100 → typical range [-0.1, +0.1]
  // Then ×50 in canonical scaler → [-5, +5]
  return amplifiedBias / 100;
};

/**
 * Normalize volatility index for coherence calculation.
 * 
 * VI typically ranges 0-10+. This normalizes to [0, 0.1] so that
 * the canonical coherence formula (5 - vol_norm × 50) produces
 * values in the expected [0, 5] range.
 * 
 * @param volatilityIndex - Raw volatility index from seismograph
 * @returns Normalized volatility ready for scaleCoherenceFromVol()
 */
export const normalizeVolatilityForCoherence = (volatilityIndex: number): number => {
  if (!Number.isFinite(volatilityIndex) || volatilityIndex < 0) {
    return 0;
  }
  
  // VI / 100 → [0, 0.1] typical range
  // Min caps at 0.1 to prevent negative coherence after inversion
  return Math.min(0.1, volatilityIndex / 100);
};
