import { describe, it, expect } from 'vitest';
import { personaExcerptSnippet } from '../lib/raven/provenance';

describe('personaExcerptSnippet', () => {
  it('returns null for empty or missing excerpt', () => {
    expect(personaExcerptSnippet(null as any)).toBeNull();
    expect(personaExcerptSnippet(undefined as any)).toBeNull();
    expect(personaExcerptSnippet('   ')).toBeNull();
  });

  it('truncates and appends ellipsis when too long', () => {
    const long = 'a'.repeat(500);
    const s = personaExcerptSnippet(long, 100);
    expect(s).toBeTruthy();
    expect(s!.length).toBeLessThanOrEqual(100);
    expect(s!.endsWith('…')).toBe(true);
  });

  it('preserves short excerpts', () => {
    const short = 'Short persona excerpt.';
    const s = personaExcerptSnippet(short, 280);
    expect(s).toBe(short);
  });
});
