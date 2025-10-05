import { expect, it } from 'vitest';
import { buildDayExport } from '@/lib/export/weatherLog';
import { buildRelationalDayExport } from '@/lib/reporting/relational';

it('solo vs relational use the same scaler output', () => {
  const normalized = {
    magnitude: 0.05,
    directional_bias: -0.05,
    volatility: 0.04,
    sfd: null,
  };

  const solo = buildDayExport(normalized);
  const relational = buildRelationalDayExport(normalized);

  expect(relational.display).toEqual(solo.display);
  expect(relational.scaling).toEqual(solo.scaling);
  expect(relational.display.directional_bias.flags).toEqual(
    solo.display.directional_bias.flags,
  );
});
