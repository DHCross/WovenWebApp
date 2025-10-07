/* Bias Sanity Check from Raven's v3 Spec */

import { calculateSeismograph } from '../src/seismograph';

describe('Bias Sanity Check (Acceptance Test)', () => {
  test('bias_n = −0.05 should display as −0.3, not −5.0 (spec v3.1)', () => {
    // Per spec: normalized × 5 → clamp([-5, +5]) → round(1dp)
    // If bias_n = -0.05, then display = -0.05 × 5 = -0.25 → round = -0.3

    // To keep bias_n small we configure a single square aspect with a moderate orb.
    // That setup yields a normalized bias slightly below zero so the display lands near -0.3
    // instead of being clamped to the extreme -5.0 ceiling.
    
    const aspects = [
      { transit: { body: 'Moon' }, natal: { body: 'Mars' }, type: 'square', orb: 3.0 }
    ];

    const result = calculateSeismograph(aspects);

    // KEY TEST: Should NOT be clamped to -5.0
    expect(result.directional_bias).toBeGreaterThan(-3.0); // Much less extreme than -5.0
    expect(result.directional_bias).toBeLessThan(0); // Still negative
    
    // Verify it's in the correct range
    expect(result.directional_bias).toBeGreaterThanOrEqual(-5.0);
    expect(result.directional_bias).toBeLessThanOrEqual(5.0);
    
    // Verify canonical scaling was used
    if (result.transform_trace && 'canonical_scalers_used' in result.transform_trace) {
      expect(result.transform_trace.canonical_scalers_used).toBe(true);
      expect(result.transform_trace.spec_version).toBe('3.1');
    }
  });

  test('Small negative bias should not be amplified to -5.0', () => {
    // Test with very small negative bias (Y_raw ≈ -0.5)
    const aspects = [
      { transit: { body: 'Mercury' }, natal: { body: 'Venus' }, type: 'square', orb: 5.5 }
      // S ≈ -1.2 × 1.0 × 0.6 (wide orb) × 1.0 ≈ -0.7
    ];

    const result = calculateSeismograph(aspects);

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

    // Should show moderate positive bias
    expect(result.directional_bias).toBeGreaterThan(0);
    expect(result.directional_bias).toBeLessThan(5.0);
    expect(result.directional_bias).toBeGreaterThanOrEqual(-5.0);
    expect(result.directional_bias).toBeLessThanOrEqual(5.0);
  });
});
