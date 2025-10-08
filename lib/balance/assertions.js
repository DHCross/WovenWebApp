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

/**
 * Validate that a seismograph output matches spec expectations.
 * v4: SFD is now optional/retired.
 */
function assertSeismographInvariants(seismo) {
  // Use spec.json as single source of truth for ranges
  const { magnitude: magRange, directional_bias: biasRange, coherence: cohRange, sfd: sfdRange } = spec.ranges;
  
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

  if (seismo.coherence < cohRange.min || seismo.coherence > cohRange.max) {
    throw new BalanceMeterInvariantViolation(
      `Coherence out of range: ${seismo.coherence} not in [${cohRange.min}, ${cohRange.max}]`,
      { value: seismo.coherence, range: cohRange }
    );
  }

  // v4: SFD retired - only check if provided (legacy compatibility)
  if (seismo.sfd !== undefined && seismo.sfd !== null && (seismo.sfd < sfdRange.min || seismo.sfd > sfdRange.max)) {
    throw new BalanceMeterInvariantViolation(
      `SFD out of range: ${seismo.sfd} not in [${sfdRange.min}, ${sfdRange.max}]`,
      { value: seismo.sfd, range: sfdRange }
    );
  }

  // Finite check
  const magFinite = Number.isFinite(seismo.magnitude);
  const biasFinite = Number.isFinite(seismo.directional_bias);
  const cohFinite = Number.isFinite(seismo.coherence);
  
  if (!magFinite || !biasFinite || !cohFinite) {
    throw new BalanceMeterInvariantViolation(
      `Non-finite value in seismograph output (mag:${magFinite}, bias:${biasFinite}, coh:${cohFinite})`,
      { 
        magnitude: seismo.magnitude, 
        directional_bias: seismo.directional_bias, 
        coherence: seismo.coherence,
        magFinite,
        biasFinite,
        cohFinite
      }
    );
  }

  // v4: SFD finite check only if provided (legacy)
  if (seismo.sfd !== undefined && seismo.sfd !== null && !Number.isFinite(seismo.sfd)) {
    throw new BalanceMeterInvariantViolation(
      'Non-finite SFD value detected',
      { value: seismo.sfd }
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

  if (scaling.coherence_inversion !== spec.coherence_inversion) {
    throw new BalanceMeterInvariantViolation(
      `Coherence inversion mismatch: expected ${spec.coherence_inversion}, got ${scaling.coherence_inversion}`,
      { expected: spec.coherence_inversion, actual: scaling.coherence_inversion }
    );
  }

  // 2. Range checks
  const { magnitude, directional_bias, coherence, sfd } = axes;

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

  if (coherence.value < spec.ranges.coherence.min || coherence.value > spec.ranges.coherence.max) {
    throw new BalanceMeterInvariantViolation(
      `Coherence out of range: ${coherence.value} not in [${spec.ranges.coherence.min}, ${spec.ranges.coherence.max}]`,
      { value: coherence.value, range: spec.ranges.coherence, normalized: coherence.normalized }
    );
  }

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
  if (scaling.pipeline !== spec.pipeline) {
    throw new BalanceMeterInvariantViolation(
      `Pipeline mismatch: expected "${spec.pipeline}", got "${scaling.pipeline}"`,
      { expected: spec.pipeline, actual: scaling.pipeline }
    );
  }
}

function assertNotDoubleInverted(volDisplay, cohDisplay) {
  if (!Number.isFinite(volDisplay) || !Number.isFinite(cohDisplay)) {
    return;
  }

  if (Math.abs(volDisplay) <= 1) {
    return;
  }

  const sum = volDisplay + cohDisplay;
  if (Math.abs(sum - 5) < 0.05) {
    throw new BalanceMeterInvariantViolation(
      `Coherence double-inversion detected (vol=${volDisplay}, coh=${cohDisplay})`,
      { volatility_display: volDisplay, coherence_display: cohDisplay }
    );
  }
}

function assertDisplayRanges(params) {
  const { mag, bias, coh, sfd } = params;
  
  // Use spec.json as single source of truth for ranges
  const { magnitude: magRange, directional_bias: biasRange, coherence: cohRange, sfd: sfdRange } = spec.ranges;

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

  if (coh < cohRange.min || coh > cohRange.max) {
    throw new BalanceMeterInvariantViolation(
      `Coherence out of range: ${coh} not in [${cohRange.min}, ${cohRange.max}]`, 
      { value: coh, range: cohRange }
    );
  }

  if (sfd !== null && sfd !== 'n/a') {
    if (sfd < sfdRange.min || sfd > sfdRange.max) {
      throw new BalanceMeterInvariantViolation(
        `SFD out of range: ${sfd} not in [${sfdRange.min}, ${sfdRange.max}]`, 
        { value: sfd, range: sfdRange }
      );
    }
  }
}

function assertSfdDrivers(driversCount, sfd) {
  if (!Number.isFinite(driversCount)) {
    return;
  }

  if (driversCount <= 0 && sfd !== null && sfd !== 'n/a') {
    throw new BalanceMeterInvariantViolation(
      `SFD rendered without drivers (count=${driversCount}, sfd=${sfd})`,
      { driversCount, sfd }
    );
  }
}

module.exports = {
  BalanceMeterInvariantViolation,
  assertSeismographInvariants,
  assertBalanceMeterInvariants,
  assertNotDoubleInverted,
  assertDisplayRanges,
  assertSfdDrivers
};
