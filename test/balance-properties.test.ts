/**
 * Property-based tests for Balance Meter scaling functions.
 * 
 * These tests verify mathematical properties that must hold for ALL inputs:
 * - Monotonicity: larger input → larger output
 * - Range compliance: output always within spec bounds
 * - Scaling linearity: small inputs produce proportional outputs
 * - Symmetry: bipolar functions symmetric around zero
 */

import { describe, test, expect } from 'vitest';
import { 
  scaleBipolar, 
  scaleUnipolar, 
} from '../lib/balance/scale';
import spec from '../config/spec.json';

describe('Balance Meter Property Tests', () => {
  describe('scaleBipolar (Directional Bias)', () => {
    test('is monotonic: larger normalized → larger display', () => {
      const testCases = [
        [-0.1, -0.05, -0.01, 0, 0.01, 0.05, 0.1],
        [-0.08, -0.04, 0, 0.04, 0.08],
      ];

      testCases.forEach(cases => {
        for (let i = 0; i < cases.length - 1; i++) {
          const result1 = scaleBipolar(cases[i]);
          const result2 = scaleBipolar(cases[i + 1]);
          expect(result2.value).toBeGreaterThanOrEqual(result1.value);
        }
      });
    });

    test('stays in range [-5, +5] for all inputs', () => {
      const testInputs = [
        -1.0, -0.5, -0.1, -0.05, -0.01, 0, 0.01, 0.05, 0.1, 0.5, 1.0,
        -10, -5, 5, 10, // Extreme values
        Number.MIN_VALUE, Number.MAX_SAFE_INTEGER // Edge cases
      ];

      testInputs.forEach(input => {
        const result = scaleBipolar(input);
        expect(result.value).toBeGreaterThanOrEqual(spec.ranges.directional_bias.min);
        expect(result.value).toBeLessThanOrEqual(spec.ranges.directional_bias.max);
      });
    });

    test('small normalized inputs (±0.05) produce display ≈ ±0.3', () => {
      const testCases = [
        { input: -0.05, expected: -0.3, tolerance: 0.1 },
        { input: 0.05, expected: 0.3, tolerance: 0.1 },
        { input: -0.04, expected: -0.2, tolerance: 0.1 },
        { input: 0.04, expected: 0.2, tolerance: 0.1 },
      ];

      testCases.forEach(({ input, expected, tolerance }) => {
        const result = scaleBipolar(input);
        expect(Math.abs(result.value - expected)).toBeLessThan(tolerance);
      });
    });

    test('is symmetric around zero', () => {
      const testInputs = [0.01, 0.05, 0.1];

      testInputs.forEach(input => {
        const positive = scaleBipolar(input);
        const negative = scaleBipolar(-input);
        expect(Math.abs(positive.value + negative.value)).toBeLessThan(0.01); // Should cancel out
      });
    });

    test('clamp flags are set correctly', () => {
      // Should NOT clamp for small values
      const small = scaleBipolar(0.05);
      expect(small.flags.hitMin).toBe(false);
      expect(small.flags.hitMax).toBe(false);

      // SHOULD clamp for extreme values
      const large = scaleBipolar(1.2); // normalized 1.2 → raw 6 → clamped to 5
      expect(large.value).toBe(5);
      expect(large.flags.hitMax).toBe(true);

      const veryNegative = scaleBipolar(-1.2);
      expect(veryNegative.value).toBe(-5);
      expect(veryNegative.flags.hitMin).toBe(true);
    });
  });

  describe('scaleUnipolar (Magnitude)', () => {
    test('is monotonic: larger normalized → larger display', () => {
      const testInputs = [0, 0.01, 0.05, 0.1];

      for (let i = 0; i < testInputs.length - 1; i++) {
        const result1 = scaleUnipolar(testInputs[i]);
        const result2 = scaleUnipolar(testInputs[i + 1]);
        expect(result2.value).toBeGreaterThanOrEqual(result1.value);
      }
    });

    test('stays in range [0, 5] for all inputs', () => {
      const testInputs = [
        0, 0.01, 0.05, 0.1, 0.5, 1.0,
        -0.1, -1.0, // Negative (should clamp to 0)
        10, 100 // Extreme positive
      ];

      testInputs.forEach(input => {
        const result = scaleUnipolar(input);
        expect(result.value).toBeGreaterThanOrEqual(spec.ranges.magnitude.min);
        expect(result.value).toBeLessThanOrEqual(spec.ranges.magnitude.max);
      });
    });

    test('zero input → zero output', () => {
      const result = scaleUnipolar(0);
      expect(result.value).toBe(0);
    });

    test('negative inputs clamp to zero', () => {
      const testInputs = [-0.1, -1.0, -10];

      testInputs.forEach(input => {
        const result = scaleUnipolar(input);
        expect(result.value).toBe(0);
        expect(result.flags.hitMin).toBe(true);
      });
    });
  });


  describe('Cross-Function Properties', () => {
    test('scaleBipolar and scaleUnipolar agree on positive inputs', () => {
      const testInputs = [0, 0.01, 0.05, 0.1];

      testInputs.forEach(input => {
        const bipolar = scaleBipolar(input);
        const unipolar = scaleUnipolar(input);
        expect(bipolar.value).toBe(unipolar.value); // Should match for positive
      });
    });

    test('all scalers handle NaN/Infinity gracefully', () => {
      const invalidInputs = [NaN, Infinity, -Infinity];

      invalidInputs.forEach(input => {
        const bipolar = scaleBipolar(input);
        const unipolar = scaleUnipolar(input);

        // Should not crash and should return finite values
        expect(Number.isFinite(bipolar.value)).toBe(true);
        expect(Number.isFinite(unipolar.value)).toBe(true);
      });
    });
  });
});
