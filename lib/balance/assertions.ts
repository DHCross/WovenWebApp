/**
 * Runtime invariant checks for Balance Meter outputs.
 * 
 * These assertions enforce spec v3.1 compliance at runtime, catching
 * any drift in scaling, clamping, or null-handling logic.
 * 
 * @module lib/balance/assertions
 */

import spec from '@/config/spec.json';
import type { TransformedWeatherData } from '@/lib/weatherDataTransforms';

export class BalanceMeterInvariantViolation extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = 'BalanceMeterInvariantViolation';
  }
}

/**
 * Assert that all Balance Meter values conform to spec v3.1.
 * 
 * Checks:
 * - Range compliance for all axes
 * - Null integrity for SFD
 * - Spec version match
 * - No fabricated values
 * 
 * @param result - Transformed weather data to validate
 * @throws {BalanceMeterInvariantViolation} If any invariant is violated
 */
export function assertBalanceMeterInvariants(result: TransformedWeatherData): void {
  const { axes, scaling } = result;

  // 1. Spec version check
  if (scaling.mode !== spec.scaling_mode) {
    throw new BalanceMeterInvariantViolation(
      `Scaling mode mismatch: expected "${spec.scaling_mode}", got "${scaling.mode}"`,
      { expected: spec.scaling_mode, actual: scaling.mode }
    );
  }

  if (scaling.factor !== spec.scale_factor) {
    throw new BalanceMeterInvariantViolation(
      `Scale factor mismatch: expected ${spec.scale_factor}, got ${scaling.factor}`,
      { expected: spec.scale_factor, actual: scaling.factor }
    );
  }

  if (scaling.coherence_inversion !== spec.coherence_inversion) {
    throw new BalanceMeterInvariantViolation(
      `Coherence inversion mismatch: expected ${spec.coherence_inversion}, got ${scaling.coherence_inversion}`,
      { expected: spec.coherence_inversion, actual: scaling.coherence_inversion }
    );
  }

  // 2. Range checks
  const { magnitude, directional_bias, coherence, sfd } = axes;

  // Magnitude: [0, 5]
  if (magnitude.value < spec.ranges.magnitude.min || magnitude.value > spec.ranges.magnitude.max) {
    throw new BalanceMeterInvariantViolation(
      `Magnitude out of range: ${magnitude.value} not in [${spec.ranges.magnitude.min}, ${spec.ranges.magnitude.max}]`,
      { value: magnitude.value, range: spec.ranges.magnitude, normalized: magnitude.normalized }
    );
  }

  // Directional Bias: [-5, +5]
  if (directional_bias.value < spec.ranges.directional_bias.min || 
      directional_bias.value > spec.ranges.directional_bias.max) {
    throw new BalanceMeterInvariantViolation(
      `Directional bias out of range: ${directional_bias.value} not in [${spec.ranges.directional_bias.min}, ${spec.ranges.directional_bias.max}]`,
      { value: directional_bias.value, range: spec.ranges.directional_bias, normalized: directional_bias.normalized }
    );
  }

  // Coherence: [0, 5]
  if (coherence.value < spec.ranges.coherence.min || coherence.value > spec.ranges.coherence.max) {
    throw new BalanceMeterInvariantViolation(
      `Coherence out of range: ${coherence.value} not in [${spec.ranges.coherence.min}, ${spec.ranges.coherence.max}]`,
      { value: coherence.value, range: spec.ranges.coherence, normalized: coherence.normalized }
    );
  }

  // SFD: [-1, +1] or null
  if (sfd.value !== null) {
    if (sfd.value < spec.ranges.sfd.min || sfd.value > spec.ranges.sfd.max) {
      throw new BalanceMeterInvariantViolation(
        `SFD out of range: ${sfd.value} not in [${spec.ranges.sfd.min}, ${spec.ranges.sfd.max}]`,
        { value: sfd.value, range: spec.ranges.sfd, normalized: sfd.normalized }
      );
    }
  }

  // 3. Null integrity check
  if (sfd.value === null && sfd.display !== spec.ranges.sfd.null_display) {
    throw new BalanceMeterInvariantViolation(
      `SFD fabrication detected: null value but display="${sfd.display}" (expected "${spec.ranges.sfd.null_display}")`,
      { value: sfd.value, display: sfd.display, expected: spec.ranges.sfd.null_display }
    );
  }

  // 4. Finite value check
  if (!Number.isFinite(magnitude.value) || 
      !Number.isFinite(directional_bias.value) || 
      !Number.isFinite(coherence.value) ||
      (sfd.value !== null && !Number.isFinite(sfd.value))) {
    throw new BalanceMeterInvariantViolation(
      'Non-finite value detected',
      { 
        magnitude: magnitude.value, 
        directional_bias: directional_bias.value, 
        coherence: coherence.value, 
        sfd: sfd.value 
      }
    );
  }

  // 5. Scaling metadata check
  if (!scaling.pipeline || scaling.pipeline !== spec.pipeline) {
    throw new BalanceMeterInvariantViolation(
      `Pipeline mismatch: expected "${spec.pipeline}", got "${scaling.pipeline}"`,
      { expected: spec.pipeline, actual: scaling.pipeline }
    );
  }
}

/**
 * Validate that a seismograph output matches spec expectations.
 * 
 * Used for testing and validation of the core engine.
 * 
 * @param seismo - Raw seismograph output
 * @throws {BalanceMeterInvariantViolation} If any invariant is violated
 */
export function assertSeismographInvariants(seismo: {
  magnitude: number;
  directional_bias: number;
  coherence: number;
  sfd: number | null;
  [key: string]: unknown;
}): void {
  // Range checks
  if (seismo.magnitude < 0 || seismo.magnitude > 5) {
    throw new BalanceMeterInvariantViolation(
      `Magnitude out of range: ${seismo.magnitude}`,
      { value: seismo.magnitude }
    );
  }

  if (seismo.directional_bias < -5 || seismo.directional_bias > 5) {
    throw new BalanceMeterInvariantViolation(
      `Directional bias out of range: ${seismo.directional_bias}`,
      { value: seismo.directional_bias }
    );
  }

  if (seismo.coherence < 0 || seismo.coherence > 5) {
    throw new BalanceMeterInvariantViolation(
      `Coherence out of range: ${seismo.coherence}`,
      { value: seismo.coherence }
    );
  }

  if (seismo.sfd !== null && (seismo.sfd < -1 || seismo.sfd > 1)) {
    throw new BalanceMeterInvariantViolation(
      `SFD out of range: ${seismo.sfd}`,
      { value: seismo.sfd }
    );
  }

  // Finite check
  if (!Number.isFinite(seismo.magnitude) || 
      !Number.isFinite(seismo.directional_bias) || 
      !Number.isFinite(seismo.coherence) ||
      (seismo.sfd !== null && !Number.isFinite(seismo.sfd))) {
    throw new BalanceMeterInvariantViolation(
      'Non-finite value in seismograph output',
      seismo
    );
  }
}
