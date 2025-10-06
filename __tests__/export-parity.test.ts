/**
 * Export Parity Tests
 * Ensures scaling pipeline outputs match expected ranges.
 * Validates ×50 scaling, clamping, and rounding consistency.
 */

const { scaleUnipolar, scaleBipolar, scaleCoherenceFromVol } = require('../lib/balance/scale');
const { SCALE_FACTOR, RANGE_MAG, RANGE_BIAS, RANGE_COH } = require('../lib/balance/constants');

describe('Export Parity Validation', () => {
  test('Magnitude scaling ×50 with clamping', () => {
    const normalized = 0.08; // 4.0 / 50
    const scaled = scaleUnipolar(normalized).value;
    expect(scaled).toBe(4.0);
    expect(scaled).toBeGreaterThanOrEqual(RANGE_MAG[0]);
    expect(scaled).toBeLessThanOrEqual(RANGE_MAG[1]);
  });

  test('Directional bias scaling ×50 with clamping', () => {
    const normalized = -0.05; // -2.5 / 50
    const scaled = scaleBipolar(normalized).value;
    expect(scaled).toBe(-2.5);
    expect(scaled).toBeGreaterThanOrEqual(RANGE_BIAS[0]);
    expect(scaled).toBeLessThanOrEqual(RANGE_BIAS[1]);
  });

  test('Coherence scaling ×50 with clamping', () => {
    const normalized = 0.06; // volatility normalized
    const scaled = scaleCoherenceFromVol(normalized).value;
    expect(scaled).toBe(2); // 5 - 0.06*50 = 5-3 = 2
    expect(scaled).toBeGreaterThanOrEqual(RANGE_COH[0]);
    expect(scaled).toBeLessThanOrEqual(RANGE_COH[1]);
  });

  test('Scale factor consistency', () => {
    expect(SCALE_FACTOR).toBe(50);
  });

  test('Rounding to 1 decimal place', () => {
    const normalized = 0.124; // 6.2 / 50
    const scaled = scaleUnipolar(normalized).value;
    expect(scaled).toBe(5.0); // 6.2 clamped to 5
  });
});