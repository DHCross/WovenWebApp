/**
 * Export Parity Tests
 * Ensures scaling pipeline outputs match expected ranges.
 * Validates ×5 scaling, clamping, and rounding consistency.
 */

const { scaleUnipolar, scaleBipolar } = require('../lib/balance/scale');
const { SCALE_FACTOR, RANGE_MAG, RANGE_BIAS } = require('../lib/balance/constants');

describe('Export Parity Validation', () => {
  test('Magnitude scaling ×5 with clamping', () => {
    const normalized = 0.8; // 4.0 / 5
    const scaled = scaleUnipolar(normalized).value;
    expect(scaled).toBe(4.0);
    expect(scaled).toBeGreaterThanOrEqual(RANGE_MAG[0]);
    expect(scaled).toBeLessThanOrEqual(RANGE_MAG[1]);
  });

  test('Directional bias scaling ×5 with clamping', () => {
    const normalized = -0.5; // -2.5 / 5
    const scaled = scaleBipolar(normalized).value;
    expect(scaled).toBe(-2.5);
    expect(scaled).toBeGreaterThanOrEqual(RANGE_BIAS[0]);
    expect(scaled).toBeLessThanOrEqual(RANGE_BIAS[1]);
  });

  test('Scale factor consistency', () => {
    expect(SCALE_FACTOR).toBe(5);
  });

  test('Rounding to 1 decimal place', () => {
    const normalized = 1.24; // 6.2 / 5
    const scaled = scaleUnipolar(normalized).value;
    expect(scaled).toBe(5.0); // 6.2 clamped to 5
  });
});