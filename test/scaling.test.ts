import { describe, expect, it } from 'vitest';
import {
  scaleBipolar,
  scaleCoherenceFromVol,
  scaleSFD,
  scaleUnipolar,
} from '@/lib/balance/scale';

describe('Absolute scaling invariants', () => {
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

  it('coherence inversion: vol 0.02 → 4.0', () => {
    const result = scaleCoherenceFromVol(0.2);
    expect(result.value).toBe(4.0);
  });

  it('SFD null → "n/a"', () => {
    const result = scaleSFD(null);
    expect(result.display).toBe('n/a');
    expect(result.value).toBeNull();
  });

  it('SFD guard respects pre-scaled values', () => {
    const result = scaleSFD(0.8, true);
    expect(result.value).toBe(0.8);
    expect(result.display).toBe('0.80');
  });
});
