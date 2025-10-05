import { describe, expect, it } from 'vitest';
import { APPROVED } from '@/lib/voice/labels';
import { assertApprovedLabel, guardLexicon } from '@/lib/voice/guard';

describe('VOICE lexicon guard', () => {
  it('passes approved labels unchanged', () => {
    for (const label of APPROVED) {
      expect(assertApprovedLabel(label)).toBe(label);
    }
  });

  it('blocks uncodified phrases', () => {
    expect(assertApprovedLabel('Surge Collapse')).toBe('Diagnostic Surge');
  });

  it('detects forbidden composite phrases', () => {
    const result = guardLexicon('Storm System: Surge Collapse');
    expect(result.allowed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.sanitized).toContain('Compression Field');
  });
});
