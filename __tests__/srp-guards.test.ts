/**
 * SRP Guards Tests
 * Validates runtime null-safety utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getSafeHingePhrase,
  getSafeRestorationCue,
  getSafeCollapseMode,
  getSafeElementWeave,
  hasSRPEnrichment,
  hasShadowReference,
  extractRestorationCues,
  extractHingePhrases,
  formatHookWithSRP,
} from '../lib/srp/guards';
import type { HookObject } from '../poetic-brain/src/index';

describe('SRP Guards - Safe Accessors', () => {
  it('safely gets hinge phrase when present', () => {
    const hook: HookObject = {
      label: 'Sun square Mars',
      srp: { hingePhrase: 'Fervent Flame' },
    };
    expect(getSafeHingePhrase(hook)).toBe('Fervent Flame');
  });

  it('returns null for missing hinge phrase', () => {
    const hook: HookObject = { label: 'Sun square Mars' };
    expect(getSafeHingePhrase(hook)).toBeNull();
  });

  it('safely gets restoration cue when present', () => {
    const hook: HookObject = {
      label: 'Sun square Mars',
      srp: { restorationCue: 'Name the void' },
    };
    expect(getSafeRestorationCue(hook)).toBe('Name the void');
  });

  it('returns null for missing restoration cue', () => {
    const hook: HookObject = { label: 'Sun square Mars' };
    expect(getSafeRestorationCue(hook)).toBeNull();
  });

  it('safely gets collapse mode when present', () => {
    const hook: HookObject = {
      label: 'Sun square Mars',
      srp: { collapseMode: 'self-devouring' },
    };
    expect(getSafeCollapseMode(hook)).toBe('self-devouring');
  });

  it('safely gets element weave when present', () => {
    const hook: HookObject = {
      label: 'Sun square Mars',
      srp: { elementWeave: 'Fire-Fire' },
    };
    expect(getSafeElementWeave(hook)).toBe('Fire-Fire');
  });
});

describe('SRP Guards - Validation', () => {
  it('detects valid SRP enrichment', () => {
    const hook: HookObject = {
      label: 'Sun square Mars',
      srp: {
        blendId: 1,
        hingePhrase: 'Fervent Flame',
      },
    };
    expect(hasSRPEnrichment(hook)).toBe(true);
  });

  it('rejects incomplete SRP enrichment', () => {
    const hook1: HookObject = {
      label: 'Sun square Mars',
      srp: { blendId: 1 }, // Missing hinge phrase
    };
    expect(hasSRPEnrichment(hook1)).toBe(false);

    const hook2: HookObject = {
      label: 'Sun square Mars',
      srp: { hingePhrase: 'Fervent Flame' }, // Missing blend ID
    };
    expect(hasSRPEnrichment(hook2)).toBe(false);
  });

  it('rejects missing SRP data', () => {
    const hook: HookObject = { label: 'Sun square Mars' };
    expect(hasSRPEnrichment(hook)).toBe(false);
  });

  it('detects valid shadow reference', () => {
    const hook: HookObject = {
      label: 'Sun square Mars',
      srp: {
        shadowId: '1R',
        restorationCue: 'Name the void',
      },
    };
    expect(hasShadowReference(hook)).toBe(true);
  });

  it('rejects incomplete shadow reference', () => {
    const hook: HookObject = {
      label: 'Sun square Mars',
      srp: { shadowId: '1R' }, // Missing restoration cue
    };
    expect(hasShadowReference(hook)).toBe(false);
  });
});

describe('SRP Guards - Batch Extraction', () => {
  it('extracts restoration cues from hooks', () => {
    const hooks: HookObject[] = [
      { label: 'Sun square Mars', srp: { restorationCue: 'Cue 1' } },
      { label: 'Moon opposition Saturn' }, // No SRP
      { label: 'Venus trine Jupiter', srp: { restorationCue: 'Cue 2' } },
    ];

    const cues = extractRestorationCues(hooks);
    expect(cues).toEqual(['Cue 1', 'Cue 2']);
  });

  it('filters out empty restoration cues', () => {
    const hooks: HookObject[] = [
      { label: 'Sun square Mars', srp: { restorationCue: '' } },
      { label: 'Moon opposition Saturn', srp: { restorationCue: 'Valid cue' } },
    ];

    const cues = extractRestorationCues(hooks);
    expect(cues).toEqual(['Valid cue']);
  });

  it('extracts hinge phrases from hooks', () => {
    const hooks: HookObject[] = [
      { label: 'Sun square Mars', srp: { hingePhrase: 'Phrase 1' } },
      { label: 'Moon opposition Saturn' }, // No SRP
      { label: 'Venus trine Jupiter', srp: { hingePhrase: 'Phrase 2' } },
    ];

    const phrases = extractHingePhrases(hooks);
    expect(phrases).toEqual(['Phrase 1', 'Phrase 2']);
  });
});

describe('SRP Guards - Formatting', () => {
  it('formats hook with SRP hinge phrase', () => {
    const hook: HookObject = {
      label: 'Sun square Mars (2.1°)',
      srp: { hingePhrase: 'Fervent Flame: Initiateing Initiate' },
    };

    const formatted = formatHookWithSRP(hook);
    expect(formatted).toBe('Sun square Mars (2.1°) – Fervent Flame: Initiateing Initiate');
  });

  it('formats hook without SRP data (label only)', () => {
    const hook: HookObject = { label: 'Sun square Mars (2.1°)' };
    const formatted = formatHookWithSRP(hook);
    expect(formatted).toBe('Sun square Mars (2.1°)');
  });

  it('handles missing label gracefully', () => {
    const hook: HookObject = {
      label: '',
      srp: { hingePhrase: 'Fervent Flame' },
    };
    const formatted = formatHookWithSRP(hook);
    expect(formatted).toBe('Unknown aspect – Fervent Flame');
  });
});

describe('SRP Guards - Edge Cases', () => {
  it('handles empty SRP object', () => {
    const hook: HookObject = {
      label: 'Sun square Mars',
      srp: {},
    };

    expect(getSafeHingePhrase(hook)).toBeNull();
    expect(hasSRPEnrichment(hook)).toBe(false);
    expect(hasShadowReference(hook)).toBe(false);
  });

  it('handles undefined SRP namespace', () => {
    const hook: HookObject = { label: 'Sun square Mars' };

    expect(getSafeHingePhrase(hook)).toBeNull();
    expect(getSafeRestorationCue(hook)).toBeNull();
    expect(getSafeCollapseMode(hook)).toBeNull();
    expect(getSafeElementWeave(hook)).toBeNull();
  });

  it('handles empty hooks array', () => {
    expect(extractRestorationCues([])).toEqual([]);
    expect(extractHingePhrases([])).toEqual([]);
  });
});
