import { expect, it } from 'vitest';
import { buildDayExport } from '@/lib/export/weatherLog';
import { buildRelationalDayExport } from '@/lib/reporting/relational';

it('solo vs relational use the same scaler output (v5.0)', () => {
  const normalized = {
    magnitude: 0.6,
    directional_bias: -0.4,
    volatility: 0.3,
  };

  const solo = buildDayExport(normalized);
  const relational = buildRelationalDayExport(normalized);

  expect(relational.display).toEqual(solo.display);
  expect(relational.scaling).toEqual(solo.scaling);
  expect(relational.display.directional_bias.flags).toEqual(
    solo.display.directional_bias.flags,
  );
});
