/**
 * Pipeline Order Tests
 * Ensures amplification occurs before normalization.
 * Prevents premature division that flattens high-magnitude events.
 */

const { applyGeometryAmplification, normalizeAmplifiedBias } = require('../lib/balance/amplifiers');

describe('Pipeline Order Integrity', () => {
  test('Geometry amplification boosts before normalization', () => {
    const scoredAspect = {
      score: 1.0,
      aspect: {
        p1: 'Saturn',
        p2: 'Pluto',
        type: 'conjunction',
        orbDeg: 0.5
      }
    };

    // Apply geometry amp first (should boost outer planets + tight orb)
    const amplified = applyGeometryAmplification(scoredAspect.score, scoredAspect.aspect);
    expect(amplified).toBeGreaterThan(1.0);

    // Then normalize (should divide by 10, not 100)
    const normalized = normalizeAmplifiedBias(amplified);
    expect(normalized).toBeCloseTo(amplified / 10, 6);
  });

  test('Outer planet weighting applied', () => {
    const saturnPluto = {
      score: 1.0,
      aspect: {
        p1: 'Saturn',
        p2: 'Pluto',
        type: 'conjunction',
        orbDeg: 2.0
      }
    };

    const amplified = applyGeometryAmplification(saturnPluto.score, saturnPluto.aspect);
    expect(amplified).toBeCloseTo(1.5075, 4); // Tight + outer
  });

  test('Tightness boost for exact majors', () => {
    const tightConjunction = {
      score: 1.0,
      aspect: {
        p1: 'Mars',
        p2: 'Venus',
        type: 'conjunction',
        orbDeg: 0.1
      }
    };

    const amplified = applyGeometryAmplification(tightConjunction.score, tightConjunction.aspect);
    expect(amplified).toBeCloseTo(1.0 * 1.3383, 4); // Tightness boost
  });

  test('Catastrophe kicker for Pluto/Saturn tight', () => {
    const catastrophe = {
      score: 1.0,
      aspect: {
        p1: 'Saturn',
        p2: 'Pluto',
        type: 'square',
        orbDeg: 0.8
      }
    };

    const amplified = applyGeometryAmplification(catastrophe.score, catastrophe.aspect);
    expect(amplified).toBeCloseTo(1.0 * 1.256655 * 1.35 * 1.15, 4); // Tight + outer + catastrophe
  });
});