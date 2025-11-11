/**
 * Feature Flag Test: ENABLE_SRP Circuit Breaker
 * Verifies that SRP can be completely disabled via environment variable
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { clearLedgerCache } from '../lib/srp/loader';
import { mapAspectToSRP } from '../lib/srp/mapper';

describe('SRP Feature Flag (ENABLE_SRP)', () => {
  beforeEach(() => {
    clearLedgerCache(); // Ensure fresh state for each test
  });

  it('disables enrichment when ENABLE_SRP is false', () => {
    // Explicitly disable
    process.env.ENABLE_SRP = 'false';
    clearLedgerCache();

    const enrichment = mapAspectToSRP('Mars conjunction Mars (0.5°)', 'WB');
    expect(enrichment).toBeNull();
  });

  it('enables enrichment when ENABLE_SRP is undefined (default)', () => {
    // Default state: no env var set
    delete process.env.ENABLE_SRP;
    clearLedgerCache();

    const enrichment = mapAspectToSRP('Mars conjunction Mars (0.5°)', 'WB');
    expect(enrichment).not.toBeNull();
    expect(enrichment?.blendId).toBe(1);
  });

  it('enables enrichment when ENABLE_SRP is explicitly true', () => {
    // Explicit opt-in
    process.env.ENABLE_SRP = 'true';
    clearLedgerCache();

    const enrichment = mapAspectToSRP('Mars conjunction Mars (0.5°)', 'WB');
    expect(enrichment).not.toBeNull();
    expect(enrichment?.blendId).toBe(1);
    expect(enrichment?.hingePhrase).toContain('Initiating');
  });

  it('treats common truthy values as enabled', () => {
    const truthyValues = ['TRUE', '1', 'yes', 'enabled', 'on', 'auto'];

    truthyValues.forEach(value => {
      process.env.ENABLE_SRP = value;
      clearLedgerCache();

      const enrichment = mapAspectToSRP('Mars conjunction Mars (0.5°)', 'WB');
      expect(enrichment).not.toBeNull();
    });
  });

  it('treats common falsy values as disabled', () => {
    const falsyValues = ['FALSE', '0', 'no', 'off', 'disabled'];

    falsyValues.forEach(value => {
      process.env.ENABLE_SRP = value;
      clearLedgerCache();

      const enrichment = mapAspectToSRP('Mars conjunction Mars (0.5°)', 'WB');
      expect(enrichment).toBeNull();
    });
  });

  it('defaults to enabled when given an unrecognized value', () => {
    process.env.ENABLE_SRP = 'maybe';
    clearLedgerCache();

    const enrichment = mapAspectToSRP('Mars conjunction Mars (0.5°)', 'WB');
    expect(enrichment).not.toBeNull();
  });

  it('respects feature flag across multiple calls', () => {
    // Verify caching doesn't bypass flag
    process.env.ENABLE_SRP = 'false';
    clearLedgerCache();

    const call1 = mapAspectToSRP('Mars conjunction Mars (0.5°)', 'WB');
    const call2 = mapAspectToSRP('Venus trine Jupiter (0.3°)', 'WB');

    expect(call1).toBeNull();
    expect(call2).toBeNull();
  });

  it('allows runtime toggling (after cache clear)', () => {
    // Start disabled
    process.env.ENABLE_SRP = 'false';
    clearLedgerCache();
    const disabled = mapAspectToSRP('Mars conjunction Mars (0.5°)', 'WB');
    expect(disabled).toBeNull();

    // Enable and verify
    process.env.ENABLE_SRP = 'true';
    clearLedgerCache();
    const enabled = mapAspectToSRP('Mars conjunction Mars (0.5°)', 'WB');
    expect(enabled).not.toBeNull();

    // Disable again
    process.env.ENABLE_SRP = 'false';
    clearLedgerCache();
    const disabledAgain = mapAspectToSRP('Mars conjunction Mars (0.5°)', 'WB');
    expect(disabledAgain).toBeNull();
  });
});

describe('SRP Feature Flag - User Experience', () => {
  it('degrades gracefully when disabled (no crashes)', () => {
    process.env.ENABLE_SRP = 'false';
    clearLedgerCache();

    // Simulate full payload processing
    const hooks = [
      { label: 'Mars conjunction Mars (0.5°)', resonanceState: 'WB' as const },
      { label: 'Sun square Saturn (2.1°)', resonanceState: 'ABE' as const },
    ];

    // Should not throw, just return null enrichments
    expect(() => {
      hooks.forEach(h => mapAspectToSRP(h.label, h.resonanceState));
    }).not.toThrow();
  });

  it('produces clean output when disabled (no SRP fields)', () => {
    process.env.ENABLE_SRP = 'false';
    clearLedgerCache();

    const enrichment = mapAspectToSRP('Mars conjunction Mars (0.5°)', 'WB');

    // Hook object should have no SRP data
    const mockHook = {
      label: 'Mars conjunction Mars (0.5°)',
      resonanceState: 'WB' as const,
      srp: enrichment ? { blendId: enrichment.blendId } : undefined,
    };

    expect(mockHook.srp).toBeUndefined();
  });
});
