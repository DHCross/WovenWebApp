import { describe, it, expect } from 'vitest';
import { processMirrorDirective } from '../src/index';

describe('processMirrorDirective (solo mode inputs)', () => {
  it('does not produce solo_mirror_b when person_b is removed (solo mode)', () => {
    const content = {
      _format: 'mirror_directive_json',
      _version: '1.0',
      mirror_contract: { is_relational: false, report_kind: 'mirror', intimacy_tier: 'P2' },
      person_a: {
        name: 'Alice',
        chart: { planets: { sun: { deg: 1 } }, aspects: [] },
        aspects: [],
        summary: { magnitude: 2 }
      },
      // person_b intentionally removed to simulate sanitized input
      synastry_aspects: []
    } as any;

    const result = processMirrorDirective(content);

    expect(result.success).toBe(true);
    expect(result.narrative_sections).toBeDefined();
    expect(result.narrative_sections.solo_mirror_a).toBeTruthy();
    expect(result.narrative_sections.solo_mirror_b).toBe(undefined);
    // No relational engine since is_relational=false
    expect(result.narrative_sections.relational_engine).toBe(undefined);
  });
});
