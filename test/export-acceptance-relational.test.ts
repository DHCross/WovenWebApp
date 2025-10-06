import { describe, it, expect } from 'vitest';
import { transformWeatherData } from '../lib/weatherDataTransforms';
import { buildDayExport } from '../lib/export/weatherLog';
import { buildRelationalDayExport } from '../lib/reporting/relational';

describe('Acceptance: relational export uses canonical scaler only', () => {
  it('raw 5 and -5 yield value 5.0 and -5.0 in both pipelines', () => {
    // Simulate upstream providing frontstage values
    const rawSeismo = {
      magnitude: 5,
      bias_signed: -5,
      volatility: 2.5,
      raw_magnitude: 5,
      raw_bias_signed: -5,
      raw_volatility: 2.5,
    };

    const t = transformWeatherData(rawSeismo);
    // Normalized per canonical guessing logic
    const n = {
      magnitude: t.axes.magnitude.normalized,
      directional_bias: t.axes.directional_bias.normalized,
      volatility: t.axes.coherence.normalized, // coherence normalized comes from volatility
      sfd: null as number | null,
    };

    const solo = buildDayExport(n);
    const rel = buildRelationalDayExport(n);

    expect(solo.display.magnitude.value).toBe(5.0);
    expect(rel.display.magnitude.value).toBe(5.0);
    expect(solo.display.directional_bias.value).toBe(-5.0);
    expect(rel.display.directional_bias.value).toBe(-5.0);

    // No divide-by-100 artifacts: raw should be 5 and -5 respectively
    expect(solo.display.magnitude.raw).toBe(5);
    expect(rel.display.magnitude.raw).toBe(5);
    expect(solo.display.directional_bias.raw).toBe(-5);
    expect(rel.display.directional_bias.raw).toBe(-5);
  });
});
