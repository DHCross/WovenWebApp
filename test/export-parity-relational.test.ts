import { expect, it, describe } from 'vitest';
import { buildDayExport } from '../lib/export/weatherLog';
import { buildRelationalDayExport } from '../lib/reporting/relational';

describe('Export parity: solo vs relational', () => {
  it('magnitude normalized=0.10 displays as 5.0 in both paths', () => {
    const norm = { magnitude: 0.10, directional_bias: 0, volatility: 0, sfd: null };
    const solo = buildDayExport(norm);
    const rel = buildRelationalDayExport(norm);
    expect(solo.display.magnitude.value).toBe(5.0);
    expect(rel.display.magnitude.value).toBe(5.0);
  });

  it('directional_bias normalized=-0.10 displays as -5.0 in both paths', () => {
    const norm = { magnitude: 0, directional_bias: -0.10, volatility: 0, sfd: null };
    const solo = buildDayExport(norm);
    const rel = buildRelationalDayExport(norm);
    expect(solo.display.directional_bias.value).toBe(-5.0);
    expect(rel.display.directional_bias.value).toBe(-5.0);
  });

  it('coherence from volatility normalized=0.04 displays as 3.0 in both paths (5 - 0.04*50 = 3.0)', () => {
    const norm = { magnitude: 0, directional_bias: 0, volatility: 0.04, sfd: null };
    const solo = buildDayExport(norm);
    const rel = buildRelationalDayExport(norm);
    expect(solo.display.coherence.value).toBe(3.0);
    expect(rel.display.coherence.value).toBe(3.0);
  });
});
