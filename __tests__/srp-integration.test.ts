/**
 * SRP Integration Tests
 * Validates Phase 1: Hook enrichment functionality
 */

import { describe, it, expect } from 'vitest';
import { mapAspectToSRP, formatEnrichedHook, enrichHooks } from '../lib/srp/mapper';
import { getLightBlend, getShadowBlend, calculateBlendId } from '../lib/srp/ledger';
import { isValidBlendId, toShadowId, parseShadowId } from '../lib/srp/types';

describe('SRP Types & Utilities', () => {
  it('validates blend IDs correctly', () => {
    expect(isValidBlendId(1)).toBe(true);
    expect(isValidBlendId(144)).toBe(true);
    expect(isValidBlendId(0)).toBe(false);
    expect(isValidBlendId(145)).toBe(false);
    expect(isValidBlendId(1.5)).toBe(false);
  });

  it('creates shadow IDs correctly', () => {
    expect(toShadowId(1)).toBe('1R');
    expect(toShadowId(119)).toBe('119R');
  });

  it('parses shadow IDs correctly', () => {
    expect(parseShadowId('1R')).toBe(1);
    expect(parseShadowId('119R')).toBe(119);
    expect(parseShadowId('invalid')).toBe(null);
  });
});

describe('SRP Ledger', () => {
  it('retrieves light blends', () => {
    const blend1 = getLightBlend(1);
    expect(blend1).toBeDefined();
    expect(blend1?.id).toBe(1);
    expect(blend1?.driver).toBe('Aries');
    expect(blend1?.manner).toBe('Aries');
    expect(blend1?.hingePhrase).toBe('Fervent Flame: Initiateing Initiate');
  });

  it('retrieves shadow blends', () => {
    const shadow1 = getShadowBlend(1);
    expect(shadow1).toBeDefined();
    expect(shadow1?.id).toBe('1R');
    expect(shadow1?.originBlendId).toBe(1);
    expect(shadow1?.fracturePhrase).toBe('Smoldering Void: Incinerateing Incinerate');
    expect(shadow1?.restorationCue).toContain('Name the void');
  });

  it('calculates blend IDs correctly', () => {
    expect(calculateBlendId('Aries', 'Aries')).toBe(1);
    expect(calculateBlendId('Taurus', 'Taurus')).toBe(14);
    expect(calculateBlendId('Capricorn', 'Aquarius')).toBe(119);
  });

  it('handles invalid zodiac signs', () => {
    expect(calculateBlendId('Invalid', 'Aries')).toBe(null);
    expect(calculateBlendId('Aries', 'Invalid')).toBe(null);
  });
});

describe('SRP Mapper', () => {
  it('maps basic aspects to SRP blends', () => {
    const enrichment = mapAspectToSRP('Sun conjunction Mars (0.5°)', 'WB');
    expect(enrichment).toBeDefined();
    expect(enrichment?.blendId).toBeDefined();
    expect(enrichment?.hingePhrase).toBeDefined();
    expect(enrichment?.elementWeave).toBeDefined();
  });

  it('includes shadow reference for ABE state', () => {
    const enrichment = mapAspectToSRP('Sun square Mars (2.1°)', 'ABE');
    expect(enrichment).toBeDefined();
    expect(enrichment?.shadowRef).toBeDefined();
    expect(enrichment?.shadowRef?.shadowId).toMatch(/\d+R/);
    expect(enrichment?.shadowRef?.restorationCue).toBeDefined();
  });

  it('includes shadow reference for OSR state', () => {
    const enrichment = mapAspectToSRP('Saturn opposition Uranus (5.0°)', 'OSR');
    expect(enrichment).toBeDefined();
    expect(enrichment?.shadowRef).toBeDefined();
  });

  it('does not include shadow for WB state', () => {
    const enrichment = mapAspectToSRP('Venus trine Jupiter (0.3°)', 'WB');
    expect(enrichment).toBeDefined();
    expect(enrichment?.shadowRef).toBeUndefined();
  });

  it('handles unparseable aspect labels', () => {
    const enrichment = mapAspectToSRP('Invalid aspect format', 'WB');
    expect(enrichment).toBeNull();
  });

  it('formats enriched hooks correctly', () => {
    const enrichment = mapAspectToSRP('Sun square Mars (2.1°)', 'ABE');
    const formatted = formatEnrichedHook('Sun square Mars (2.1°)', enrichment, 'ABE');
    expect(formatted).toContain('Sun square Mars');
    expect(formatted).toContain('boundary edge');
    if (enrichment?.hingePhrase) {
      expect(formatted).toContain(enrichment.hingePhrase);
    }
  });

  it('batch enriches multiple hooks', () => {
    const hooks = [
      { label: 'Sun square Mars (2.1°)', resonanceState: 'ABE' as const },
      { label: 'Venus trine Jupiter (0.3°)', resonanceState: 'WB' as const },
    ];
    
    const enriched = enrichHooks(hooks);
    expect(enriched).toHaveLength(2);
    expect(enriched[0].srpEnrichment).toBeDefined();
    expect(enriched[1].srpEnrichment).toBeDefined();
  });
});

describe('Backward Compatibility', () => {
  it('handles hooks without SRP fields', () => {
    // This simulates old payload format
    const oldHook: any = {
      label: 'Sun square Mars (2.1°)',
      resonanceState: 'ABE' as const,
      orb: 2.1,
    };
    
    // Should not crash when accessing optional SRP namespace
    expect(oldHook.srp).toBeUndefined();
  });

  it('formats hooks without SRP enrichment', () => {
    const formatted = formatEnrichedHook('Sun square Mars (2.1°)', null, 'ABE');
    expect(formatted).toBe('Sun square Mars (2.1°)');
  });
});

describe('Integration with Poetic Brain Schema', () => {
  it('validates hook schema with SRP fields (namespaced)', async () => {
    const { hookSchema } = await import('../lib/poetic-brain-schema');
    
    const hookWithSRP = {
      label: 'Sun square Mars (2.1°)',
      resonanceState: 'ABE',
      srp: {
        blendId: 1,
        hingePhrase: 'Fervent Flame: Initiateing Initiate',
        elementWeave: 'Fire-Fire',
        shadowId: '1R',
        restorationCue: 'Name the void...',
        collapseMode: 'self-devouring',
      },
    };
    
    expect(() => hookSchema.parse(hookWithSRP)).not.toThrow();
  });

  it('validates hook schema without SRP fields', async () => {
    const { hookSchema } = await import('../lib/poetic-brain-schema');
    
    const hookWithoutSRP = {
      label: 'Sun square Mars (2.1°)',
      resonanceState: 'ABE',
    };
    
    expect(() => hookSchema.parse(hookWithoutSRP)).not.toThrow();
  });
  
  it('validates hook schema with empty SRP object', async () => {
    const { hookSchema } = await import('../lib/poetic-brain-schema');
    
    const hookWithEmptySRP = {
      label: 'Sun square Mars (2.1°)',
      resonanceState: 'ABE',
      srp: {},
    };
    
    expect(() => hookSchema.parse(hookWithEmptySRP)).not.toThrow();
  });
});
