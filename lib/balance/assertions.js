/**
 * Runtime invariant checks for Balance Meter outputs.
 * Mirrors the TypeScript declarations in `assertions.ts` so that CommonJS
 * consumers (e.g., Netlify functions) can enforce the same guarantees.
 */

const {
  GOLDEN_CASES,
  SPEC_VERSION,
  SCALE_FACTOR,
  RANGE_MAG,
  RANGE_BIAS,
  RANGE_COH,
} = require('./constants');

// Spec object for backward compatibility
const spec = {
  version: SPEC_VERSION,
  scaling_mode: 'absolute',
  scale_factor: SCALE_FACTOR,
  coherence_inversion: true,
  pipeline: 'normalize→scale→clamp→round',
  ranges: {
    magnitude: { min: RANGE_MAG[0], max: RANGE_MAG[1] },
    directional_bias: { min: RANGE_BIAS[0], max: RANGE_BIAS[1] },
    coherence: { min: RANGE_COH[0], max: RANGE_COH[1] },
  },
};

class BalanceMeterInvariantViolation extends Error {
  constructor(message, context = undefined) {
    super(message);
    this.name = 'BalanceMeterInvariantViolation';
    if (context && typeof context === 'object') {
      this.context = context;
    }
  }
}

function assertBalanceMeterInvariants(result) {
  if (!result || typeof result !== 'object') {
    throw new BalanceMeterInvariantViolation('Balance Meter result must be an object', { result });
  }

  const { axes = {}, scaling = {} } = result;
  const { magnitude = {}, directional_bias: directionalBias = {}, coherence = {} } = axes;

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

  if (!scaling.pipeline || scaling.pipeline !== spec.pipeline) {
    throw new BalanceMeterInvariantViolation(
      `Pipeline mismatch: expected "${spec.pipeline}", got "${scaling.pipeline}"`,
      { expected: spec.pipeline, actual: scaling.pipeline }
    );
  }

  const magnitudeValue = Number(magnitude.value ?? NaN);
  if (magnitudeValue < spec.ranges.magnitude.min || magnitudeValue > spec.ranges.magnitude.max) {
    throw new BalanceMeterInvariantViolation(
      `Magnitude out of range: ${magnitudeValue} not in [${spec.ranges.magnitude.min}, ${spec.ranges.magnitude.max}]`,
      { value: magnitudeValue, range: spec.ranges.magnitude, normalized: magnitude.normalized }
    );
  }

  const directionalValue = Number(directionalBias.value ?? NaN);
  if (directionalValue < spec.ranges.directional_bias.min || directionalValue > spec.ranges.directional_bias.max) {
    throw new BalanceMeterInvariantViolation(
      `Directional bias out of range: ${directionalValue} not in [${spec.ranges.directional_bias.min}, ${spec.ranges.directional_bias.max}]`,
      { value: directionalValue, range: spec.ranges.directional_bias, normalized: directionalBias.normalized }
    );
  }

  const coherenceValue = Number(coherence.value ?? NaN);
  if (coherenceValue < spec.ranges.coherence.min || coherenceValue > spec.ranges.coherence.max) {
    throw new BalanceMeterInvariantViolation(
      `Coherence out of range: ${coherenceValue} not in [${spec.ranges.coherence.min}, ${spec.ranges.coherence.max}]`,
      { value: coherenceValue, range: spec.ranges.coherence, normalized: coherence.normalized }
    );
  }


  if (!Number.isFinite(magnitudeValue) || !Number.isFinite(directionalValue) || !Number.isFinite(coherenceValue)) {
    throw new BalanceMeterInvariantViolation(
      'Non-finite axis value detected',
      { magnitude: magnitudeValue, directional_bias: directionalValue, coherence: coherenceValue }
    );
  }
}

function assertGoldenCase(dateISO, axes) {
  const cfg = GOLDEN_CASES[dateISO];
  if (!cfg) return;
  const { minMag, biasBand } = cfg;
  if (axes.magnitude.value < minMag) {
    throw new BalanceMeterInvariantViolation(`[GoldenCase] ${dateISO}: magnitude ${axes.magnitude.value} < ${minMag}`);
  }
  if (axes.directional_bias.value < Math.min(...biasBand) ||
      axes.directional_bias.value > Math.max(...biasBand)) {
    throw new BalanceMeterInvariantViolation(`[GoldenCase] ${dateISO}: bias ${axes.directional_bias.value} not in [${biasBand.join(', ')}]`);
  }
}

function assertSeismographInvariants(seismo) {
  if (!seismo || typeof seismo !== 'object') {
    throw new BalanceMeterInvariantViolation('Seismograph output must be an object', { seismo });
  }

  const magnitude = Number(seismo.magnitude ?? NaN);
  const directional = Number(seismo.directional_bias ?? NaN);
  const coherence = Number(seismo.coherence ?? NaN);

  if (magnitude < 0 || magnitude > 5) {
    throw new BalanceMeterInvariantViolation('Magnitude out of range', { value: magnitude });
  }
  if (directional < -5 || directional > 5) {
    throw new BalanceMeterInvariantViolation('Directional bias out of range', { value: directional });
  }
  if (coherence < 0 || coherence > 5) {
    throw new BalanceMeterInvariantViolation('Coherence out of range', { value: coherence });
  }

  if (!Number.isFinite(magnitude) || !Number.isFinite(directional) || !Number.isFinite(coherence)) {
    throw new BalanceMeterInvariantViolation(
      'Non-finite value in seismograph output',
      { magnitude, directional_bias: directional, coherence }
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
  const { mag, bias, coh } = params;

  if (mag < 0 || mag > 5) {
    throw new BalanceMeterInvariantViolation(`Magnitude out of range: ${mag}`, { value: mag });
  }

  if (bias < -5 || bias > 5) {
    throw new BalanceMeterInvariantViolation(`Directional bias out of range: ${bias}`, { value: bias });
  }

  if (coh < 0 || coh > 5) {
    throw new BalanceMeterInvariantViolation(`Coherence out of range: ${coh}`, { value: coh });
  }
}

module.exports = {
  BalanceMeterInvariantViolation,
  assertBalanceMeterInvariants,
  assertSeismographInvariants,
  assertGoldenCase,
  assertNotDoubleInverted,
  assertDisplayRanges,
};
