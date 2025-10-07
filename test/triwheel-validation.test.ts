import { describe, it, expect } from 'vitest';
import { calculateSeismograph } from '../src/seismograph';
import { getMagnitudeLabel, getDirectionalBiasLabel, getCoherenceLabel } from '../lib/balance/scale';

// Helper to round to one decimal place, matching the spec
const round1 = (n: number) => Math.round(n * 10) / 10;

describe('Balance Meter v4 - Triwheel Validation', () => {

  // Expected values from the user-provided summary table
  const expectations = {
    '2025-10-06': {
      magnitude: 2.0,
      bias: -1.8,
      coherence: 4.2,
      magLabel: 'Wave',
      biasLabel: 'Mild Inward',
    },
    '2025-10-07': {
      magnitude: 2.3,
      bias: -0.4,
      coherence: 4.1,
      magLabel: 'Wave',
      biasLabel: 'Equilibrium', // Note: -0.4 is within the Equilibrium band
    },
    '2018-10-10': {
      magnitude: 4.9,
      bias: -3.3,
      coherence: 3.2,
      magLabel: 'Surge', // Peak badge is a UI concern, not a label concern
      biasLabel: 'Mild Inward',
    },
  };

  // Input data derived from the user-provided charts
  // This is a simplified representation focusing on the key drivers for each date
  const chartData = {
    '2025-10-06': [ // Pre-Full Moon buildup
      { a: 'Moon', b: 'Sun', type: 'opposition', orb: '2.5°' },
      { a: 'Saturn', b: 'ASC', type: 'conjunction', orb: '1.2°' },
      { a: 'Mars', b: 'Lilith', type: 'conjunction', orb: '0.5°' },
      { a: 'Uranus', b: 'Pluto', type: 'trine', orb: '0.2°' },
    ],
    '2025-10-07': [ // Full Moon exact opposition
      { a: 'Moon', b: 'Sun', type: 'opposition', orb: '0.1°' },
      { a: 'Chiron', b: 'Moon', type: 'conjunction', orb: '0.1°' },
      { a: 'Saturn', b: 'ASC', type: 'conjunction', orb: '1.0°' },
      { a: 'Neptune', b: 'Uranus', type: 'square', orb: '0.8°' },
      { a: 'Pluto', b: 'Mercury', type: 'square', orb: '0.5°' },
    ],
    '2018-10-10': [ // Hurricane Michael benchmark
      { a: 'Venus', b: 'Mars', type: 'square', orb: '0.1°' },
      { a: 'Uranus', b: 'North Node', type: 'square', orb: '0.9°' },
      { a: 'Sun', b: 'Pluto', type: 'square', orb: '1.3°' },
      { a: 'Moon', b: 'Venus', type: 'conjunction', orb: '1.0°' },
      { a: 'Mercury', b: 'Uranus', type: 'opposition', orb: '0.1°' },
      { a: 'Saturn', b: 'Neptune', type: 'sextile', orb: '2.0°' },
    ],
  };

  it('should match the summary for the Outer Wheel (Oct 6, 2025)', () => {
    const result = calculateSeismograph(chartData['2025-10-06']);
    const expected = expectations['2025-10-06'];

    expect(round1(result.magnitude)).toBe(expected.magnitude);
    expect(round1(result.directional_bias)).toBe(expected.bias);
    expect(round1(result.coherence)).toBe(expected.coherence);
    
    expect(getMagnitudeLabel(result.magnitude)).toBe(expected.magLabel);
    expect(getDirectionalBiasLabel(result.directional_bias)).toBe(expected.biasLabel);
  });

  it('should match the summary for the Inner Wheel (Oct 7, 2025)', () => {
    const result = calculateSeismograph(chartData['2025-10-07']);
    const expected = expectations['2025-10-07'];

    expect(round1(result.magnitude)).toBe(expected.magnitude);
    expect(round1(result.directional_bias)).toBe(expected.bias);
    expect(round1(result.coherence)).toBe(expected.coherence);

    expect(getMagnitudeLabel(result.magnitude)).toBe(expected.magLabel);
    expect(getDirectionalBiasLabel(result.directional_bias)).toBe(expected.biasLabel);
  });

  it('should match the summary for the Middle Wheel (Oct 10, 2018)', () => {
    const result = calculateSeismograph(chartData['2018-10-10']);
    const expected = expectations['2018-10-10'];

    expect(round1(result.magnitude)).toBe(expected.magnitude);
    expect(round1(result.directional_bias)).toBe(expected.bias);
    expect(round1(result.coherence)).toBe(expected.coherence);

    expect(getMagnitudeLabel(result.magnitude)).toBe(expected.magLabel);
    expect(getDirectionalBiasLabel(result.directional_bias)).toBe(expected.biasLabel);
  });
});
