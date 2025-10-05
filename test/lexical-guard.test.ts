import { describe, expect, it } from 'vitest';
import { guardLexicon } from '@/lib/voice/guard';

describe('Lexicon guard', () => {
  it('accepts neutral copy', () => {
    const result = guardLexicon('Period pattern: inward contraction with variable coherence.');
    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('flags uncodified phrases', () => {
    const result = guardLexicon('Storm System: Surge Collapse');
    expect(result.allowed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.sanitized).toContain('Compression Field');
  });
});
