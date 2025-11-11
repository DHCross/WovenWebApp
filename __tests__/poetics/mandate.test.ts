import { describe, it, expect } from 'vitest';

import { buildMandatesForChart, translateAspectToMandate } from '../../lib/poetics/mandate';
import type { MandateAspect } from '../../lib/poetics/types';

describe('Aspect Mandate Engine', () => {
  type TestAspect = {
    planet_a: string;
    planet_b: string;
    type: string;
    orb: number;
    applying?: boolean;
    [key: string]: unknown;
  };

  const baseAspect: TestAspect = {
    planet_a: 'Sun',
    planet_b: 'Moon',
    type: 'conjunction',
    orb: 1.5,
    applying: true,
  };

  const buildAspect = (overrides: Partial<TestAspect>): TestAspect => ({
    ...baseAspect,
    ...overrides,
  });

  describe('diagnostic classification', () => {
    it('classifies tight opposition as Paradox Lock', () => {
      const aspect = buildAspect({ type: 'opposition', orb: 0.5 });
      const mandate = translateAspectToMandate(aspect, [aspect]);
      expect(mandate?.diagnostic).toBe('Paradox Lock');
    });

    it('classifies separating aspect under 3° as Hook', () => {
      const aspect = buildAspect({ type: 'square', orb: 2.5, applying: false });
      const mandate = translateAspectToMandate(aspect, [aspect]);
      expect(mandate?.diagnostic).toBe('Hook');
    });

    it('classifies tight conjunction as Current', () => {
      const aspect = buildAspect({ type: 'conjunction', orb: 1.2, applying: true });
      const mandate = translateAspectToMandate(aspect, [aspect]);
      expect(mandate?.diagnostic).toBe('Current');
    });

    it('flags compression when planet participates in multiple aspects', () => {
      const primary = buildAspect({ type: 'square', planet_b: 'Mars', orb: 2.1 });
      const secondary = buildAspect({ type: 'trine', planet_b: 'Saturn', orb: 2.0 });
      const mandate = translateAspectToMandate(primary, [primary, secondary]);
      expect(mandate?.diagnostic).toBe('Compression');
    });
  });

  describe('archetype fallback handling', () => {
    it('provides generic archetype metadata when planet is unknown', () => {
      const aspect = buildAspect({ planet_a: 'Juno', planet_b: 'Moon' });
      const mandate = translateAspectToMandate(aspect, [aspect]);
      expect(mandate?.archetypes.a).toMatchObject({
        planet: 'Juno',
        name: 'Undocumented Archetype',
      });
    });
  });

  describe('chart-level mandate assembly', () => {
    const chartAspects = [
      buildAspect({ planet_b: 'Mars', type: 'square', orb: 1.0 }), // weight ~1.0
      buildAspect({ planet_b: 'Saturn', type: 'trine', orb: 2.0 }), // weight ~0.5
      buildAspect({ planet_b: 'Venus', type: 'sextile', orb: 3.5 }),
      buildAspect({ planet_b: 'Mercury', type: 'conjunction', orb: 0.8 }),
      buildAspect({ planet_b: 'Jupiter', type: 'opposition', orb: 4.0 }),
      buildAspect({ planet_b: 'Neptune', type: 'trine', orb: 1.8 }),
    ];

    it('sorts mandates by computed weight (tightest first)', () => {
      const result = buildMandatesForChart('Test', { aspects: chartAspects });
      const weights = result.mandates.map(m => m.geometry.weight);
      const sorted = [...weights].sort((a, b) => b - a);
      expect(weights).toStrictEqual(sorted);
      expect(result.mandates[0].id).toContain('Mercury'); // orb 0.8 -> highest weight
    });

    it('respects limit option when selecting mandates', () => {
      const result = buildMandatesForChart('Test', { aspects: chartAspects }, { limit: 3 });
      expect(result.mandates).toHaveLength(3);
    });
  });
});
