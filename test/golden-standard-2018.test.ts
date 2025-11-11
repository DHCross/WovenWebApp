/* Golden Standard Test Case: Hurricane Michael, October 10, 2018 */

import { calculateSeismograph } from '../src/seismograph';

describe('Golden Standard: Hurricane Michael (2018-10-10)', () => {
  test('should correctly identify the high-magnitude, negative-valence signature of Hurricane Michael', () => {
    const aspects = [
      // The core crisis aspects identified from the provided chart data
      // Using transit-natal format expected by the seismograph
      { transit: { body: 'Sun' }, natal: { body: 'Pluto' }, type: 'square', orb: 1.03 },
      { transit: { body: 'Venus' }, natal: { body: 'Mars' }, type: 'square', orb: 0.01 },
      { transit: { body: 'Uranus' }, natal: { body: 'Mercury' }, type: 'opposition', orb: 0.61 },
      
      // Adding other relevant aspects for a complete simulation
      { transit: { body: 'Moon' }, natal: { body: 'Venus' }, type: 'conjunction', orb: 2.68 },
      { transit: { body: 'Moon' }, natal: { body: 'Jupiter' }, type: 'conjunction', orb: 2.5 },
      { transit: { body: 'Saturn' }, natal: { body: 'Uranus' }, type: 'trine', orb: 2.43 },
      { transit: { body: 'Neptune' }, natal: { body: 'Mars' }, type: 'sextile', orb: 3.93 },
    ];

    const result = calculateSeismograph(aspects);

    // I. Magnitude: Should register high activity (≥3.0) under canonical scaling
    expect(result.magnitude).toBeGreaterThanOrEqual(3.0);
    expect(result.magnitude).toBeLessThanOrEqual(5.0);

    // II. Directional Bias: Should be strongly negative due to overwhelming hard aspects
    // Per v5 spec: display range is [-5, +5]
    // Hurricane Michael should show strong inward contraction (v5 scaling)
    expect(result.directional_bias).toBeLessThanOrEqual(-2.0);
    expect(result.directional_bias).toBeGreaterThanOrEqual(-5.0); // Spec minimum

    // III. Volatility: Should be moderate to high
    expect(result.volatility).toBeGreaterThan(0);

    // IV. Transform trace should be present (observability)
    expect(result.transform_trace).toBeDefined();
    expect(result.transform_trace.pipeline).toBe('normalize_scale_clamp_round');
  });
});
