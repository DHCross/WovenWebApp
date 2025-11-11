import { describe, it, expect } from 'vitest';

import { buildSynastryMandates } from '../../lib/poetics/mandate';

const baseAspects = [
  {
    person_a_planet: 'Sun',
    person_b_planet: 'Moon',
    type: 'conjunction',
    orb: 1.2,
    person_a_name: 'Alex',
    person_b_name: 'Riley',
  },
  {
    p1_name: 'Mars',
    p2_name: 'Venus',
    aspect: 'square',
    orbit: 2.6,
    person_a_label: 'Riley',
    person_b_label: 'Alex',
    direction: 'b_to_a',
  },
  {
    person_a: { planet: 'Mercury', name: 'Alex' },
    person_b: { planet: 'Saturn', name: 'Riley' },
    aspect_type: 'trine',
    orb_degrees: 3.1,
    flow: 'a_to_b',
    weight: 0.45,
  },
];

describe('buildSynastryMandates', () => {
  it('normalizes mixed schemas and preserves owner-aware labels', () => {
    const result = buildSynastryMandates('Alex', 'Riley', baseAspects, { limit: 5 });

    expect(result.personA).toBe('Alex');
    expect(result.personB).toBe('Riley');
    expect(result.mandates).toHaveLength(3);

    const findMandate = (planetA: string, planetB: string) =>
      result.mandates.find(m => m.archetypes.a.planet === planetA && m.archetypes.b.planet === planetB);

    const sunMoon = findMandate('Sun', 'Moon');
    expect(sunMoon).toBeDefined();
    expect(sunMoon?.archetypes.a.owner).toBe('Alex');
    expect(sunMoon?.archetypes.b.owner).toBe('Riley');
    expect(sunMoon?.geometry.aspectType).toBe('conjunction');
    expect(sunMoon?.geometry.orbDegrees).toBeCloseTo(1.2, 1);

    const venusMars = findMandate('Venus', 'Mars');
    expect(venusMars).toBeDefined();
    expect(venusMars?.archetypes.a.owner).toBe('Alex');
    expect(venusMars?.archetypes.b.owner).toBe('Riley');
    expect(venusMars?.geometry.aspectType).toBe('square');
    expect(venusMars?.geometry.orbDegrees).toBeCloseTo(2.6, 1);

    const mercurySaturn = findMandate('Mercury', 'Saturn');
    expect(mercurySaturn).toBeDefined();
    expect(mercurySaturn?.archetypes.a.owner).toBe('Alex');
    expect(mercurySaturn?.archetypes.b.owner).toBe('Riley');
    expect(mercurySaturn?.geometry.aspectType).toBe('trine');
    expect(mercurySaturn?.geometry.orbDegrees).toBeCloseTo(3.1, 1);
    expect(mercurySaturn?.geometry.weight).toBeCloseTo(0.45, 2);
  });

  it('falls back to Person A / Person B labels when owner metadata missing', () => {
    const data = [
      { planet_a: 'Jupiter', planet_b: 'Pluto', type: 'sextile', orb: 2.0 },
    ];

    const result = buildSynastryMandates('   ', '', data, { limit: 5 });

    expect(result.personA).toBe('Person A');
    expect(result.personB).toBe('Person B');
    expect(result.mandates).toHaveLength(1);

    const [mandate] = result.mandates;
    expect(mandate.archetypes.a.owner).toBe('Person A');
    expect(mandate.archetypes.b.owner).toBe('Person B');
    expect(mandate.archetypes.a.planet).toBe('Jupiter');
    expect(mandate.archetypes.b.planet).toBe('Pluto');
  });

  it('enforces limit after sorting by weight and orb', () => {
    const aspects = Array.from({ length: 6 }, (_, idx) => ({
      person_a_planet: `Planet${idx}`,
      person_b_planet: `Other${idx}`,
      type: idx % 2 === 0 ? 'conjunction' : 'square',
      orb: 0.5 + idx,
    }));

    const result = buildSynastryMandates('Alex', 'Riley', aspects, { limit: 4 });

    expect(result.mandates).toHaveLength(4);
    const orbs = result.mandates.map(m => m.geometry.orbDegrees);
    expect(orbs).toEqual(orbs.slice().sort((a, b) => a - b));
  });
});
