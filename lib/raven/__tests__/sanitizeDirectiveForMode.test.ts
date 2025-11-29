import { describe, it, expect } from 'vitest';
import { sanitizeDirectiveForMode } from '../sanitizeDirectiveForMode';

describe('sanitizeDirectiveForMode', () => {
  it('removes person_b and adds backstage copy when mode is solo', () => {
    const content = {
      person_a: { name: 'Alice' },
      person_b: { name: 'Bob' },
      mirror_contract: { is_relational: true },
    } as any;
    const opts = { mode: 'solo' } as any;
    const { content: sanitized, removed } = sanitizeDirectiveForMode(content, opts);
    expect(removed).toBe(true);
    expect(sanitized._backstage_person_b).toBeDefined();
    expect(sanitized.person_b).toBeUndefined();
    expect(sanitized.mirror_contract?.is_relational).toBe(false);
    expect(sanitized._template_hint).toBe('solo_mirror');
  });

  it('does nothing if not solo mode', () => {
    const content = {
      person_a: { name: 'Alice' },
      person_b: { name: 'Bob' },
      mirror_contract: { is_relational: true },
    } as any;
    const opts = { mode: 'relational' } as any;
    const { content: sanitized, removed } = sanitizeDirectiveForMode(content, opts);
    expect(removed).toBe(false);
    expect(sanitized.person_b).toBeDefined();
    expect(sanitized._backstage_person_b).toBeUndefined();
    expect(sanitized.mirror_contract?.is_relational).toBe(true);
  });
});
