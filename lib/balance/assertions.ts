/**
 * Runtime invariant checks for Balance Meter outputs.
 *
 * These assertions enforce spec v5.0 compliance at runtime, catching
 * any drift in scaling, clamping, or null-handling logic.
 *
 * Balance Meter v5.0: Two-axis model (Magnitude, Directional Bias only)
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
 * Assert that all Balance Meter values conform to spec v5.0.
 *
 * Checks:
 * - Range compliance for both axes (Magnitude, Directional Bias)
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

  // 2. Range checks (v5.0: two axes only)
  const { magnitude, directional_bias } = axes;

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

  // 3. Finite value check
  if (!Number.isFinite(magnitude.value) ||
      !Number.isFinite(directional_bias.value)) {
    throw new BalanceMeterInvariantViolation(
      'Non-finite value detected',
      {
        magnitude: magnitude.value,
        directional_bias: directional_bias.value
      }
    );
  }

  // 4. Scaling metadata check
  if (!scaling.pipeline || scaling.pipeline !== spec.pipeline) {
    throw new BalanceMeterInvariantViolation(
      `Pipeline mismatch: expected "${spec.pipeline}", got "${scaling.pipeline}"`,
      { expected: spec.pipeline, actual: scaling.pipeline }
    );
  }
}

/**
 * Validate that a seismograph output matches spec expectations (v5.0).
 *
 * Used for testing and validation of the core engine.
 *
 * @param seismo - Raw seismograph output
 * @throws {BalanceMeterInvariantViolation} If any invariant is violated
 */
export function assertSeismographInvariants(seismo: {
  magnitude: number;
  directional_bias: number;
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

  // Finite check
  if (!Number.isFinite(seismo.magnitude) ||
      !Number.isFinite(seismo.directional_bias)) {
    throw new BalanceMeterInvariantViolation(
      'Non-finite value in seismograph output',
      seismo
    );
  }
}

/**
 * Assert display ranges for v5.0 two-axis model
 */
export function assertDisplayRanges(params: {
  mag: number;
  bias: number;
}): void {
  const { mag, bias } = params;

  if (mag < 0 || mag > 5) {
    throw new BalanceMeterInvariantViolation(`Magnitude out of range: ${mag}`, { value: mag });
  }

  if (bias < -5 || bias > 5) {
    throw new BalanceMeterInvariantViolation(`Directional bias out of range: ${bias}`, { value: bias });
  }
}
