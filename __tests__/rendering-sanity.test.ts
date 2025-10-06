import { describe, it, expect } from 'vitest';

describe('Rendering Sanity', () => {
  it('fmtAxis avoids [object Object] bleed', async () => {
    const { fmtAxis } = await import('../lib/ui/format');
    expect(fmtAxis({ value: 3.9 })).toBe('3.9');
    expect(fmtAxis({ display: 'n/a' })).toBe('n/a');
    expect(fmtAxis({ value: null })).toBe('n/a');
    expect(fmtAxis(undefined)).toBe('n/a');
  });

  it('scrubInternalDirectives removes internal prompt text', async () => {
    const { scrubInternalDirectives, containsBannedTokens } = await import('../lib/ui/sanitize');
    const input = `# ANALYSIS DIRECTIVE (READ FIRST)\n\nYOU ARE RAVEN CALDER\n\n## Next Section\nContent.`;
    const sanitized = scrubInternalDirectives(input);
    expect(containsBannedTokens(sanitized)).toBe(false);
    expect(sanitized).toContain('## Next Section');
  });
});
