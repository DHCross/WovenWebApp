import { describe, expect, it } from 'vitest';
import {
  scaleBipolar,
  scaleUnipolar,
} from '@/lib/balance/scale';

describe('Absolute scaling invariants (v5.0)', () => {
  it('magnitude: 0.5 → 2.5 (×5, clamp after)', () => {
    const result = scaleUnipolar(0.5);
    expect(result.value).toBe(2.5);
    expect(result.flags.hitMax).toBe(false);
  });

  it('bias: −0.5 → −2.5', () => {
    const result = scaleBipolar(-0.5);
    expect(result.value).toBe(-2.5);
    expect(result.flags.hitMin).toBe(false);
  });
});
