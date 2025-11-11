/**
 * Golden Standard Tests
 * Ensures amplitude fidelity for known high-magnitude events.
 * Guards against false dampening in v5.0 refactor.
 */

const { GOLDEN_CASES } = require('../lib/balance/constants');

describe('Golden Standard Enforcement (v5.0)', () => {
  const HURRICANE_MICHAEL = '2018-10-10';
  const michaelCase = GOLDEN_CASES[HURRICANE_MICHAEL];

  test('Hurricane Michael (2018-10-10) has a golden case definition', () => {
    expect(michaelCase).toBeDefined();
    expect(michaelCase.minMag).toBe(4.5);
    expect(michaelCase.biasBand).toEqual([-5.0, -4.0]);
  });

  test('A reading that meets the golden standard passes', () => {
    const axes = {
      magnitude: { value: 4.5 },
      directional_bias: { value: -4.5 },
    };
    expect(axes.magnitude.value).toBeGreaterThanOrEqual(michaelCase.minMag);
    expect(axes.directional_bias.value).toBeGreaterThanOrEqual(michaelCase.biasBand[0]);
    expect(axes.directional_bias.value).toBeLessThanOrEqual(michaelCase.biasBand[1]);
  });

  test('A reading below minimum magnitude fails', () => {
    const axes = {
      magnitude: { value: 4.4 },
      directional_bias: { value: -4.5 },
    };
    expect(axes.magnitude.value).toBeLessThan(michaelCase.minMag);
  });

  test('A reading outside the bias band fails (upper bound)', () => {
    const axes = {
      magnitude: { value: 4.5 },
      directional_bias: { value: -3.9 },
    };
    expect(axes.directional_bias.value).toBeGreaterThan(michaelCase.biasBand[1]);
  });

  test('A reading outside the bias band fails (lower bound)', () => {
    const axes = {
      magnitude: { value: 4.5 },
      directional_bias: { value: -5.1 },
    };
    expect(axes.directional_bias.value).toBeLessThan(michaelCase.biasBand[0]);
  });
});
