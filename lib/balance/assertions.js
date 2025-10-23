/**
 * Runtime invariant checks for Balance Meter outputs.
 * 
 * JavaScript implementation that mirrors assertions.ts but uses require() instead of import.
 * Uses spec.json as single source of truth for all range validations.
 * 
 * @module lib/balance/assertions
 */

const spec = require('../../config/spec.json');

class BalanceMeterInvariantViolation extends Error {
  constructor(message, context) {
    super(message);
    this.name = 'BalanceMeterInvariantViolation';
    this.context = context;
  }
}

function assertSeismographInvariants(seismo) {
  // Use spec.json as single source of truth for ranges
  const { magnitude: magRange, directional_bias: biasRange } = spec.ranges;
  
  // Range checks
  if (seismo.magnitude < magRange.min || seismo.magnitude > magRange.max) {
    throw new BalanceMeterInvariantViolation(
      `Magnitude out of range: ${seismo.magnitude} not in [${magRange.min}, ${magRange.max}]`,
      { value: seismo.magnitude, range: magRange }
    );
  }

  if (seismo.directional_bias < biasRange.min || seismo.directional_bias > biasRange.max) {
    throw new BalanceMeterInvariantViolation(
      `Directional bias out of range: ${seismo.directional_bias} not in [${biasRange.min}, ${biasRange.max}]`,
      { value: seismo.directional_bias, range: biasRange }
    );
  }

  // Finite check
  const magFinite = Number.isFinite(seismo.magnitude);
  const biasFinite = Number.isFinite(seismo.directional_bias);
  
  if (!magFinite || !biasFinite) {
    throw new BalanceMeterInvariantViolation(
      `Non-finite value in seismograph output (mag:${magFinite}, bias:${biasFinite})`,
      { 
        magnitude: seismo.magnitude, 
        directional_bias: seismo.directional_bias, 
        magFinite,
        biasFinite,
      }
    );
  }
}

function assertBalanceMeterInvariants(result) {
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

  // 2. Range checks
  const { magnitude, directional_bias } = axes;

  if (magnitude.value < spec.ranges.magnitude.min || magnitude.value > spec.ranges.magnitude.max) {
    throw new BalanceMeterInvariantViolation(
      `Magnitude out of range: ${magnitude.value} not in [${spec.ranges.magnitude.min}, ${spec.ranges.magnitude.max}]`,
      { value: magnitude.value, range: spec.ranges.magnitude, normalized: magnitude.normalized }
    );
  }

  if (directional_bias.value < spec.ranges.directional_bias.min || 
      directional_bias.value > spec.ranges.directional_bias.max) {
    throw new BalanceMeterInvariantViolation(
      `Directional bias out of range: ${directional_bias.value} not in [${spec.ranges.directional_bias.min}, ${spec.ranges.directional_bias.max}]`,
      { value: directional_bias.value, range: spec.ranges.directional_bias, normalized: directional_bias.normalized }
    );
  }

  // 4. Finite value check
  if (!Number.isFinite(magnitude.value) || 
      !Number.isFinite(directional_bias.value)) {
    throw new BalanceMeterInvariantViolation(
      'Non-finite value detected',
      { 
        magnitude: magnitude.value, 
        directional_bias: directional_bias.value,
      }
    );
  }

  // 5. Scaling metadata check
  if (scaling.pipeline !== spec.pipeline) {
    throw new BalanceMeterInvariantViolation(
      `Pipeline mismatch: expected "${spec.pipeline}", got "${scaling.pipeline}"`,
      { expected: spec.pipeline, actual: scaling.pipeline }
    );
  }
}

function assertDisplayRanges(params) {
  const { mag, bias } = params;
  
  // Use spec.json as single source of truth for ranges
  const { magnitude: magRange, directional_bias: biasRange } = spec.ranges;

  if (mag < magRange.min || mag > magRange.max) {
    throw new BalanceMeterInvariantViolation(
      `Magnitude out of range: ${mag} not in [${magRange.min}, ${magRange.max}]`, 
      { value: mag, range: magRange }
    );
  }

  if (bias < biasRange.min || bias > biasRange.max) {
    throw new BalanceMeterInvariantViolation(
      `Directional bias out of range: ${bias} not in [${biasRange.min}, ${biasRange.max}]`, 
      { value: bias, range: biasRange }
    );
  }
}

module.exports = {
  BalanceMeterInvariantViolation,
  assertSeismographInvariants,
  assertBalanceMeterInvariants,
  assertDisplayRanges
};
