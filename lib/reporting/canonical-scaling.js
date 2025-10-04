"use strict";

/**
 * Canonical scaling helpers for Balance Meter v3.
 *
 * Goals
 * - Preserve signed directional bias (FIELD → MAP alignment).
 * - Keep magnitude on an honest 0‒5 scale without leaking bias calibration.
 * - Provide repeatable metadata so downstream consumers (UI, contracts, tests) can audit the math.
 */

const DEFAULT_BIAS_RANGE = Object.freeze({ min: -5, max: 5 });
const DEFAULT_MAG_RANGE = Object.freeze({ min: 0, max: 5 });
const EPSILON_DEFAULT = 0.05;

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function roundTo(value, precision = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function normaliseRange(range, fallback) {
  if (!range || typeof range !== "object") return { ...fallback };
  const min = Number.isFinite(range.min) ? range.min : fallback.min;
  const max = Number.isFinite(range.max) ? range.max : fallback.max;
  return { min, max };
}

function resolveSignCandidate(value, epsilon) {
  if (!Number.isFinite(value)) return null;
  return Math.abs(value) >= epsilon ? Math.sign(value) : null;
}

/**
 * Scale the directional bias onto the canonical −5…+5 range while preserving sign provenance.
 *
 * @param {number} rawDirectional - Raw signed directional bias (typically the valence output of the seismograph aggregate).
 * @param {object} [options]
 * @param {number|null} [options.calibratedMagnitude=null] - Optional calibrated magnitude (e.g., balance solver) to borrow absolute intensity from.
 * @param {number|null} [options.fallbackDirection=null] - Optional fallback signal used when rawDirectional is ~0 (e.g., previous day trend).
 * @param {number} [options.epsilon=0.05] - Threshold under which a value is considered neutral for sign detection.
 * @param {{min:number,max:number}} [options.range] - Override output range (defaults to −5…+5).
 * @param {number} [options.precision=2] - Decimal precision for the returned value.
 * @param {string} [options.method] - Optional method label to surface in metadata (defaults to auto selection).
 * @param {number|null} [options.confidence=null] - Optional 0‒1 confidence score for downstream display.
 * @param {boolean} [options.allowOverflow=false] - When true, skips range clamping (caller is responsible).
 * @returns {{
 *   value:number,
 *   range:[number,number],
 *   sign:-1|0|1,
 *   direction:'inward'|'outward'|'neutral',
 *   polarity:'negative'|'positive'|'neutral',
 *   clamped:boolean,
 *   meta:object
 * }}
 */
function scaleDirectionalBias(rawDirectional, options = {}) {
  const {
    calibratedMagnitude = null,
    fallbackDirection = null,
    epsilon = EPSILON_DEFAULT,
    range: rangeOverride,
    precision = 2,
    method,
    confidence = null,
    allowOverflow = false
  } = options;

  const range = normaliseRange(rangeOverride, DEFAULT_BIAS_RANGE);
  const raw = Number.isFinite(rawDirectional) ? rawDirectional : 0;
  const calibrated = Number.isFinite(calibratedMagnitude) ? calibratedMagnitude : null;
  const fallback = Number.isFinite(fallbackDirection) ? fallbackDirection : null;

  const signFromRaw = resolveSignCandidate(raw, epsilon);
  const signFromCal = resolveSignCandidate(calibrated, epsilon);
  const signFromFallback = resolveSignCandidate(fallback, epsilon);

  const sign = (signFromRaw ?? signFromCal ?? signFromFallback ?? 0);
  const magnitudeSource = (calibrated != null && signFromCal != null)
    ? Math.abs(calibrated)
    : (signFromRaw != null ? Math.abs(raw) : (fallback != null ? Math.abs(fallback) : Math.abs(raw)));
  const unsignedMagnitude = allowOverflow ? magnitudeSource : clamp(magnitudeSource, 0, range.max);
  const signedBias = sign * unsignedMagnitude;
  const boundedValue = allowOverflow ? signedBias : clamp(signedBias, range.min, range.max);
  const value = roundTo(boundedValue, precision);

  const direction = sign === 0 ? "neutral" : sign > 0 ? "outward" : "inward";
  const polarity = sign === 0 ? "neutral" : sign > 0 ? "positive" : "negative";
  const clamped = !allowOverflow && (value !== roundTo(signedBias, precision));

  const meta = {
    method: method || (calibrated != null ? "balance_signed_v3" : "raw_directional_v3"),
    epsilon,
    sources: {
      raw,
      calibrated,
      fallback
    },
    magnitude_before_clamp: roundTo(sign * magnitudeSource, precision),
    used_calibrated: calibrated != null,
    used_fallback: signFromRaw == null && signFromFallback != null,
    confidence: Number.isFinite(confidence) ? clamp(confidence, 0, 1) : null,
    used_fallback_magnitude: calibrated == null && signFromRaw == null && fallback != null,
    // Provenance stamp for audit trail
    transform_pipeline: ['sign_resolution', 'magnitude_selection', clamped ? 'clamp' : 'no_clamp', 'round'],
    timestamp: new Date().toISOString()
  };

  return {
    value,
    range: [range.min, range.max],
    sign: sign === 0 ? 0 : (sign > 0 ? 1 : -1),
    direction,
    polarity,
    clamped,
    meta
  };
}

/**
 * Scale magnitude to an honest 0‒5 window with reference-aware blending.
 * This keeps magnitude independent from directional bias calibration yet allows
 * rolling-window smoothing when provided.
 *
 * @param {number} rawMagnitude - Magnitude after primary aggregation (post bonuses, pre-rolling normalisation).
 * @param {object} [options]
 * @param {number|null} [options.normalisedMagnitude=null] - Magnitude after any existing normalisation (if already applied upstream).
 * @param {object|null} [options.context=null] - Rolling context { median:number|null, prior:number|null, windowSize:number|null }.
 * @param {number} [options.cap=5] - Upper bound for magnitude.
 * @param {number} [options.precision=2] - Decimal precision for the returned value.
 * @param {string} [options.method] - Optional method label for metadata.
 * @param {number|null} [options.confidence=null] - Optional 0‒1 confidence score.
 * @param {boolean} [options.allowOverflow=false] - When true, skips clamping to the cap.
 * @returns {{
 *   value:number,
 *   range:[number,number],
 *   clamped:boolean,
 *   meta:object
 * }}
 */
function scaleMagnitude(rawMagnitude, options = {}) {
  const {
    normalisedMagnitude = null,
    context = null,
    cap = DEFAULT_MAG_RANGE.max,
    precision = 2,
    method = "magnitude_v3",
    confidence = null,
    allowOverflow = false
  } = options;

  const raw = Number.isFinite(rawMagnitude) ? Math.max(0, rawMagnitude) : 0;
  const normalised = Number.isFinite(normalisedMagnitude) ? Math.max(0, normalisedMagnitude) : null;

  const ctx = context && typeof context === "object" ? context : {};
  const hasContext = Object.keys(ctx).length > 0;
  const median = Number.isFinite(ctx.median) ? Math.max(0, ctx.median) : null;
  const prior = Number.isFinite(ctx.prior) ? Math.max(0, ctx.prior) : 4.0;
  const windowSize = Number.isFinite(ctx.windowSize) ? Math.max(0, ctx.windowSize) : null;
  const blendOverride = Number.isFinite(ctx.blendWeight) ? clamp(ctx.blendWeight, 0, 1) : null;

  const capSafe = Number.isFinite(cap) && cap > 0 ? cap : DEFAULT_MAG_RANGE.max;

  let reference = null;
  if (median != null) reference = median;
  if (reference == null && hasContext) reference = prior;
  if (reference != null && reference <= 0) reference = prior || DEFAULT_MAG_RANGE.max;

  let lambda = null;
  if (blendOverride != null) {
    lambda = blendOverride;
  } else if (windowSize != null) {
    lambda = clamp(windowSize / 14, 0, 1);
  }
  const blendedReference = reference != null && lambda != null
    ? lambda * reference + (1 - lambda) * (prior || reference)
    : reference;

  let scaled = normalised != null ? normalised : raw;
  if (blendedReference != null && blendedReference > 0 && normalised == null) {
    // Map raw magnitude into canonical cap using blended reference as baseline.
    scaled = (raw / blendedReference) * capSafe;
  }

  const bounded = allowOverflow ? scaled : clamp(scaled, DEFAULT_MAG_RANGE.min, capSafe);
  const value = roundTo(bounded, precision);
  const clamped = !allowOverflow && (value !== roundTo(scaled, precision));

  const meta = {
    method,
    sources: {
      raw,
      normalised,
      reference: blendedReference,
      prior,
      median,
      windowSize
    },
    cap: capSafe,
    lambda,
    confidence: Number.isFinite(confidence) ? clamp(confidence, 0, 1) : null,
    allowOverflow,
    // Provenance stamp for audit trail
    transform_pipeline: [
      normalised != null ? 'use_normalised' : 'use_raw',
      blendedReference != null ? 'reference_scaling' : 'direct',
      clamped ? 'clamp' : 'no_clamp',
      'round'
    ],
    timestamp: new Date().toISOString()
  };

  return {
    value,
    range: [DEFAULT_MAG_RANGE.min, capSafe],
    clamped,
    meta
  };
}

module.exports = {
  scaleDirectionalBias,
  scaleMagnitude,
  // Expose helpers for testing/extensibility
  _internals: {
    clamp,
    roundTo,
    normaliseRange,
    resolveSignCandidate
  }
};
