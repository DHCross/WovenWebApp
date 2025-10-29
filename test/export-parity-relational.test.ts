import { expect, it, describe } from 'vitest';
import { buildDayExport } from '../lib/export/weatherLog';
import { buildRelationalDayExport } from '../lib/reporting/relational';
import { assertNotDoubleInverted } from '../lib/balance/assertions';

describe('Export parity: solo vs relational (v5.0)', () => {
  it('magnitude normalized=1.0 displays as 5.0 in both paths', () => {
    const norm = { magnitude: 1, directional_bias: 0, volatility: 0 };
    const solo = buildDayExport(norm);
    const rel = buildRelationalDayExport(norm);
    expect(solo.display.magnitude.value).toBe(5.0);
    expect(rel.display.magnitude.value).toBe(5.0);
  });

  it('directional_bias normalized=-1.0 displays as -5.0 in both paths', () => {
    const norm = { magnitude: 0, directional_bias: -1, volatility: 0 };
    const solo = buildDayExport(norm);
    const rel = buildRelationalDayExport(norm);
    expect(solo.display.directional_bias.value).toBe(-5.0);
    expect(rel.display.directional_bias.value).toBe(-5.0);
  });

  it('parity: normalized inputs yield identical displays', () => {
    const norm = { magnitude: 0.6, directional_bias: -0.4, volatility: 0.3 };
    const solo = buildDayExport(norm);
    const rel = buildRelationalDayExport(norm);
    expect(solo.display.magnitude.value).toBeCloseTo(rel.display.magnitude.value, 5);
    expect(solo.display.directional_bias.value).toBeCloseTo(rel.display.directional_bias.value, 5);
    expect(Object.keys(rel.display).sort()).toEqual(['directional_bias', 'magnitude']);
  });

  it('coherence is not inverted twice', () => {
    const volDisplay = 3.2;
    const cohDisplay = 5 - volDisplay;
    expect(() => assertNotDoubleInverted(volDisplay, cohDisplay)).toThrow();
  });
});
