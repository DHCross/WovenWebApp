// Ghost Exorcism Test
// Verifies that the server integration correctly uses seismograph.js
// and does NOT invert the directional_bias through balance-meter.js

const { scaleDirectionalBias } = require('../lib/reporting/canonical-scaling');

describe('Ghost Exorcism: Correct Engine Wiring', () => {
  test('scaleDirectionalBias preserves negative sign from calibratedMagnitude', () => {
    // Simulate the server flow:
    // valenceRaw = 0 (because agg.valence doesn't exist)
    // balanceVal = agg.directional_bias = -3.3 (from seismograph)

    const valenceRaw = 0;  // Server reads agg.valence which doesn't exist
    const balanceVal = -3.3;  // Server reads agg.directional_bias (correct negative value)

    const result = scaleDirectionalBias(valenceRaw, {
      calibratedMagnitude: balanceVal,
      method: 'balance_signed_v3'
    });

    console.log('Scaling result:', result);

    // The output should be negative (inward/compressive)
    expect(result.value).toBeLessThan(0);
    expect(result.direction).toBe('inward');
    expect(result.polarity).toBe('negative');

    // Should be approximately -3.3 (may be clamped/rounded)
    expect(result.value).toBeCloseTo(-3.3, 1);
  });

  test('seismograph correctly produces negative directional_bias for compressive forces', () => {
    const { aggregate } = require('../src/seismograph');

    // Hurricane Michael-style compressive aspects
    const aspects = [
      { transit: {body:'Saturn'}, natal: {body:'Sun'}, type: 'square', orbDeg: 0.5 },
      { transit: {body:'Pluto'}, natal: {body:'Moon'}, type: 'opposition', orbDeg: 1.0 },
      { transit: {body:'Mars'}, natal: {body:'Venus'}, type: 'square', orbDeg: 0.8 },
    ];

    const result = aggregate(aspects);

    console.log('Seismograph result:', {
      directional_bias: result.directional_bias,
      magnitude: result.magnitude,
      sfd: result.sfd
    });

    // Should be negative for compressive/hard aspects
    expect(result.directional_bias).toBeLessThan(0);
    expect(result.sfd).toBeLessThan(0);  // Support-Friction should also be negative
  });
});
