import { expect, it, describe } from 'vitest';
import { buildDayExport } from '../lib/export/weatherLog';
import { buildRelationalDayExport } from '../lib/reporting/relational';
import { assertNotDoubleInverted } from '../lib/balance/assertions';

describe('Export parity: solo vs relational', () => {
  it('magnitude normalized=1.0 displays as 5.0 in both paths', () => {
    const norm = { magnitude: 1, directional_bias: 0, volatility: 0, sfd: null };
    const solo = buildDayExport(norm);
    const rel = buildRelationalDayExport(norm);
    expect(solo.display.magnitude.value).toBe(5.0);
    expect(rel.display.magnitude.value).toBe(5.0);
  });

  it('directional_bias normalized=-1.0 displays as -5.0 in both paths', () => {
    const norm = { magnitude: 0, directional_bias: -1, volatility: 0, sfd: null };
    const solo = buildDayExport(norm);
    const rel = buildRelationalDayExport(norm);
    expect(solo.display.directional_bias.value).toBe(-5.0);
    expect(rel.display.directional_bias.value).toBe(-5.0);
  });

  it('coherence from volatility normalized=0.6 displays as 2.0 in both paths (5 - 0.6×5 = 2.0)', () => {
    const norm = { magnitude: 0, directional_bias: 0, volatility: 0.6, sfd: null };
    const solo = buildDayExport(norm);
    const rel = buildRelationalDayExport(norm);
    expect(solo.display.coherence.value).toBe(2.0);
    expect(rel.display.coherence.value).toBe(2.0);
  });

  it('parity: normalized inputs yield identical displays', () => {
    const norm = { magnitude: 0.6, directional_bias: -0.4, volatility: 0.3, sfd: -0.22 };
    const solo = buildDayExport(norm);
    const rel = buildRelationalDayExport(norm);
    expect(solo.display.magnitude.value).toBeCloseTo(rel.display.magnitude.value, 5);
    expect(solo.display.directional_bias.value).toBeCloseTo(rel.display.directional_bias.value, 5);
    expect(solo.display.coherence.value).toBeCloseTo(rel.display.coherence.value, 5);
    expect(solo.display.sfd.value).toBeCloseTo(rel.display.sfd.value ?? 0, 5);
  });

  it('coherence is not inverted twice', () => {
    const volDisplay = 3.2;
    const cohDisplay = 5 - volDisplay;
    expect(() => assertNotDoubleInverted(volDisplay, cohDisplay)).toThrow();
  });
});
