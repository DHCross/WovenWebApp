import { describe, it, expect } from 'vitest';
import { processMirrorDirective } from '../../poetic-brain/src/index';

describe('processMirrorDirective', () => {
  it('generates solo_mirror_b when person_b is present and is_relational=true', () => {
    const payload = {
      _format: 'mirror_directive_json',
      _version: '1.0',
      mirror_contract: { is_relational: true, report_kind: 'mirror', intimacy_tier: 'P2' },
      person_a: {
        name: 'Alice',
        chart: { planets: { sun: { deg: 1 } }, aspects: [] },
        aspects: [],
        summary: { magnitude: 2 }
      },
      person_b: {
        name: 'Bob',
        chart: { planets: { moon: { deg: 2 } }, aspects: [] },
        aspects: [],
        summary: { magnitude: 1 }
      },
      // minimal synastry array
      synastry_aspects: [],
    } as any;

    const result = processMirrorDirective(payload);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.narrative_sections).toBeDefined();
    // Person B's solo mirror must be present for relational reports
    expect(result.narrative_sections.solo_mirror_b).toBeTruthy();
    // Also ensure we still produce Person A's mirror and relational engine
    expect(result.narrative_sections.solo_mirror_a).toBeTruthy();
    expect(result.narrative_sections.relational_engine).toBeTruthy();
  });
});
