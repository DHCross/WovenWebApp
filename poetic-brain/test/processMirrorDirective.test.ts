import { describe, it, expect } from 'vitest';
import { processMirrorDirective } from '../src/index';

describe('processMirrorDirective', () => {
  it('generates solo_mirror_b when person_b is present and is_relational=true with valid synastry', () => {
    const payload = {
      _format: 'mirror_directive_json',
      _version: '1.0',
      mirror_contract: { is_relational: true, report_kind: 'mirror', intimacy_tier: 'P2' },
      person_a: {
        name: 'Alice',
        chart: {
          planets: { sun: { deg: 1 } },
          aspects: [{ planet1: 'Sun', planet2: 'Moon', aspectType: 'conjunction', orbDegrees: 2 }]
        },
        aspects: [{ planet1: 'Sun', planet2: 'Moon', aspectType: 'conjunction', orbDegrees: 2 }],
        summary: { magnitude: 2 }
      },
      person_b: {
        name: 'Bob',
        chart: {
          planets: { moon: { deg: 2 } },
          aspects: [{ planet1: 'Sun', planet2: 'Venus', aspectType: 'trine', orbDegrees: 3 }]
        },
        aspects: [{ planet1: 'Sun', planet2: 'Venus', aspectType: 'trine', orbDegrees: 3 }],
        summary: { magnitude: 1 }
      },
      synastry_aspects: [{ planet1: 'Sun', planet2: 'Moon', aspectType: 'square', orbDegrees: 1.5 }],
    } as any;

    const result = processMirrorDirective(payload);

    expect(result).toBeDefined();
    expect(result.geometry_validation.valid).toBe(true);
    expect(result.success).toBe(true);
    expect(result.narrative_sections).toBeDefined();
    expect(result.narrative_sections.solo_mirror_b).toBeTruthy();
    expect(result.narrative_sections.solo_mirror_a).toBeTruthy();
    expect(result.narrative_sections.relational_engine).toBeTruthy();
  });

  describe('Geometry Validation Gating', () => {
    it('returns geometry_validation.valid=false when relational requested but synastry is empty', () => {
      const payload = {
        _format: 'mirror_directive_json',
        mirror_contract: { is_relational: true },
        person_a: {
          name: 'Dan',
          chart: { aspects: [] }
        },
        person_b: {
          name: 'Stephie',
          chart: { aspects: [] }
        },
        synastry_aspects: [], // Empty - the critical failure case!
      } as any;

      const result = processMirrorDirective(payload);

      expect(result.geometry_validation.valid).toBe(false);
      expect((result.geometry_validation as any).reason).toBe('missing_synastry_for_relational');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Geometry validation failed');
    });

    it('returns geometry_validation.valid=false when person_a is missing', () => {
      const payload = {
        _format: 'mirror_directive_json',
        mirror_contract: { is_relational: false },
        person_a: null,
      } as any;

      const result = processMirrorDirective(payload);

      expect(result.geometry_validation.valid).toBe(false);
      // parseMirrorDirective defaults personA to {} if null, so check fails on name
      expect((result.geometry_validation as any).reason).toBe('missing_person_a_name');
    });

    it('returns geometry_validation.valid=false when person_a.name is missing', () => {
      const payload = {
        _format: 'mirror_directive_json',
        mirror_contract: { is_relational: false },
        person_a: { chart: { aspects: [] } }, // Missing name
      } as any;

      const result = processMirrorDirective(payload);

      expect(result.geometry_validation.valid).toBe(false);
      expect((result.geometry_validation as any).reason).toBe('missing_person_a_name');
    });

    it('returns geometry_validation.valid=false for solo reading with empty aspects', () => {
      const payload = {
        _format: 'mirror_directive_json',
        mirror_contract: { is_relational: false },
        person_a: {
          name: 'Dan',
          chart: { aspects: [] }
        },
      } as any;

      const result = processMirrorDirective(payload);

      // STRICT GATING: Even for solo readings, 0 aspects = no geometry = HALT.
      // This prevents "decorative language over empty coordinates".
      expect(result.geometry_validation.valid).toBe(false);
      expect((result.geometry_validation as any).reason).toBe('missing_both_aspects');
    });
  });
});
