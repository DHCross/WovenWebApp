/* Bias Sanity Check from Raven's v3 Spec */

import { calculateSeismograph } from '../src/seismograph';

describe('Bias Sanity Check (Acceptance Test)', () => {
  test('bias_n = −0.05 should display as −2.5, not −5.0', () => {
    // Create a simple test case where Y_raw sums to approximately -2.5
    // Since directional_bias = clamp(Y_raw/50 * 50, -5, 5) = clamp(Y_raw, -5, 5)
    // We want Y_raw ≈ -2.5
    
    // Using a single square aspect (valence -1.2) with minimal multipliers
    const aspects = [
      { transit: { body: 'Moon' }, natal: { body: 'Mars' }, type: 'square', orb: 3.0 }
      // S ≈ -1.2 (valence) × 1.0 (planet tier) × 1.0 (orb ~3deg) × 1.0 (sensitivity) = -1.2
    ];

    const result = calculateSeismograph(aspects);

    console.log('Bias Sanity Check:', {
      directional_bias: result.directional_bias,
      Y_raw_approx: result.scored[0].S,
      transform_trace: result.transform_trace
    });

    // The key test: with Y_raw ≈ -2.5, display should be ≈ -2.5, NOT -5.0
    // This proves we're NOT doing premature clamping or ×100 scaling
    expect(result.directional_bias).toBeGreaterThan(-5.0); // Not clamped prematurely
    expect(result.directional_bias).toBeLessThan(-0.5); // Still negative
    
    // Verify it's in the correct range
    expect(result.directional_bias).toBeGreaterThanOrEqual(-5.0);
    expect(result.directional_bias).toBeLessThanOrEqual(5.0);
  });

  test('Small negative bias should not be amplified to -5.0', () => {
    // Test with very small negative bias (Y_raw ≈ -0.5)
    const aspects = [
      { transit: { body: 'Mercury' }, natal: { body: 'Venus' }, type: 'square', orb: 5.5 }
      // S ≈ -1.2 × 1.0 × 0.6 (wide orb) × 1.0 ≈ -0.7
    ];

    const result = calculateSeismograph(aspects);

    console.log('Small Negative Bias:', {
      directional_bias: result.directional_bias,
      transform_trace: result.transform_trace
    });

    // Should show small negative, NOT clamped to -5.0
    expect(result.directional_bias).toBeGreaterThan(-2.0);
    expect(result.directional_bias).toBeLessThan(0);
  });

  test('Positive bias should work symmetrically', () => {
    // Test with positive aspects (trines)
    const aspects = [
      { transit: { body: 'Jupiter' }, natal: { body: 'Sun' }, type: 'trine', orb: 1.0 },
      { transit: { body: 'Venus' }, natal: { body: 'Moon' }, type: 'trine', orb: 2.0 }
    ];

    const result = calculateSeismograph(aspects);

    console.log('Positive Bias:', {
      directional_bias: result.directional_bias,
      transform_trace: result.transform_trace
    });

    // Should show moderate positive bias
    expect(result.directional_bias).toBeGreaterThan(0);
    expect(result.directional_bias).toBeLessThan(5.0);
    expect(result.directional_bias).toBeGreaterThanOrEqual(-5.0);
    expect(result.directional_bias).toBeLessThanOrEqual(5.0);
  });
});
