/**
 * Golden Standard Tests
 * Ensures amplitude fidelity for known high-magnitude events.
 * Guards against false dampening in v3.1 refactor.
 */

const { assertGoldenCase } = require('../lib/balance/assertions');

describe('Golden Standard Enforcement', () => {
  test('Hurricane Michael (2018-10-10) meets minimum magnitude', () => {
    const axes = {
      magnitude: { value: 4.5 },
      directional_bias: { value: -4.5 }
    };
    expect(() => assertGoldenCase('2018-10-10', axes)).not.toThrow();
  });

  test('Hurricane Michael rejects below minimum magnitude', () => {
    const axes = {
      magnitude: { value: 4.4 },
      directional_bias: { value: -4.5 }
    };
    expect(() => assertGoldenCase('2018-10-10', axes)).toThrow(
      '[GoldenCase] 2018-10-10: magnitude 4.4 < 4.5'
    );
  });

  test('Hurricane Michael enforces bias band', () => {
    const axes = {
      magnitude: { value: 4.5 },
      directional_bias: { value: -3.9 }
    };
    expect(() => assertGoldenCase('2018-10-10', axes)).toThrow(
      '[GoldenCase] 2018-10-10: bias -3.9 not in [-5, -4]'
    );
  });

  test('Non-golden dates pass through', () => {
    const axes = {
      magnitude: { value: 1.0 },
      directional_bias: { value: 0.0 }
    };
    expect(() => assertGoldenCase('2023-01-01', axes)).not.toThrow();
  });
});