/**
 * Tooltip Context Builder Tests
 * 
 * Tests for the Balance Meter tooltip content generation.
 * Verifies FRONTSTAGE voice rules (no astrological jargon).
 */

import { describe, it, expect } from 'vitest';
import {
  buildTooltipContent,
  buildTooltipForDate,
  buildLatestTooltip,
  formatTooltipAsText,
  formatTooltipAsHTML,
  getCompactSummary,
  type TooltipContent,
} from '@/lib/raven/tooltip-context';
import type { ScoredAspect, BalanceTooltipEntry } from '@/lib/raven/balance-tooltip-types';

// Test fixtures
const mockRestrictiveAspect: ScoredAspect = {
  transit: { body: 'Saturn', retrograde: false },
  natal: { body: 'Moon' },
  type: 'square',
  orbDeg: 2.3,
  S: -0.85,
};

const mockHarmoniousAspect: ScoredAspect = {
  transit: { body: 'Jupiter', retrograde: false },
  natal: { body: 'Venus' },
  type: 'trine',
  orbDeg: 1.1,
  S: 0.72,
};

const mockRetrogradeAspect: ScoredAspect = {
  transit: { body: 'Mercury', retrograde: true },
  natal: { body: 'Sun' },
  type: 'opposition',
  orbDeg: 3.5,
  S: -0.45,
};

const mockNeutralAspect: ScoredAspect = {
  transit: { body: 'Venus', retrograde: false },
  natal: { body: 'Mars' },
  type: 'conjunction',
  orbDeg: 5.0,
  S: 0.05,
};

describe('buildTooltipContent', () => {
  describe('empty/quiet cases', () => {
    it('should handle empty aspects array', () => {
      const result = buildTooltipContent([]);
      
      expect(result.headline).toBe('A relatively quiet field today');
      expect(result.drivers).toHaveLength(0);
      expect(result.energyQuality).toBe('quiet');
      expect(result.intensity).toBe('quiet');
    });

    it('should handle null/undefined aspects', () => {
      const result = buildTooltipContent(null as any);
      
      expect(result.headline).toBe('A relatively quiet field today');
      expect(result.energyQuality).toBe('quiet');
    });
  });

  describe('friction-dominant field', () => {
    it('should detect friction energy quality', () => {
      const result = buildTooltipContent([mockRestrictiveAspect]);
      
      expect(result.energyQuality).toBe('friction');
      expect(result.drivers[0].direction).toBe('friction');
    });

    it('should generate appropriate headline for strong friction', () => {
      const result = buildTooltipContent([mockRestrictiveAspect]);
      
      expect(result.headline).toContain('friction');
      expect(result.intensity).toBe('strong');
    });
  });

  describe('flow-dominant field', () => {
    it('should detect flow energy quality', () => {
      const result = buildTooltipContent([mockHarmoniousAspect]);
      
      expect(result.energyQuality).toBe('flow');
      expect(result.drivers[0].direction).toBe('flow');
    });

    it('should generate appropriate headline for flow', () => {
      const result = buildTooltipContent([mockHarmoniousAspect]);
      
      expect(result.headline).toContain('flow');
    });
  });

  describe('mixed field', () => {
    it('should detect mixed energy quality', () => {
      const result = buildTooltipContent([
        mockRestrictiveAspect,
        mockHarmoniousAspect,
      ]);
      
      expect(result.energyQuality).toBe('mixed');
    });

    it('should include both friction and flow drivers', () => {
      const result = buildTooltipContent([
        mockRestrictiveAspect,
        mockHarmoniousAspect,
      ]);
      
      const directions = result.drivers.map(d => d.direction);
      expect(directions).toContain('friction');
      expect(directions).toContain('flow');
    });
  });

  describe('retrograde handling', () => {
    it('should add retrograde note when present', () => {
      const result = buildTooltipContent([mockRetrogradeAspect]);
      
      expect(result.retrogradeNote).toBeDefined();
      expect(result.retrogradeNote).toContain('inward');
      expect(result.retrogradeNote).toContain('reflective');
    });

    it('should include retrograde quality in driver description', () => {
      const result = buildTooltipContent([mockRetrogradeAspect]);
      
      expect(result.drivers[0].description).toContain('inward');
    });

    it('should not add retrograde note when none present', () => {
      const result = buildTooltipContent([mockRestrictiveAspect]);
      
      expect(result.retrogradeNote).toBeUndefined();
    });
  });

  describe('maxDrivers option', () => {
    it('should limit drivers to maxDrivers', () => {
      const manyAspects = [
        mockRestrictiveAspect,
        mockHarmoniousAspect,
        mockRetrogradeAspect,
        mockNeutralAspect,
      ];
      
      const result = buildTooltipContent(manyAspects, { maxDrivers: 2 });
      
      expect(result.drivers.length).toBeLessThanOrEqual(2);
    });

    it('should default to 3 drivers', () => {
      const manyAspects = [
        mockRestrictiveAspect,
        mockHarmoniousAspect,
        mockRetrogradeAspect,
        mockNeutralAspect,
        { ...mockRestrictiveAspect, S: -0.3 },
      ];
      
      const result = buildTooltipContent(manyAspects);
      
      expect(result.drivers.length).toBeLessThanOrEqual(3);
    });
  });

  describe('debug mode', () => {
    it('should include debug data when requested', () => {
      const result = buildTooltipContent([mockRestrictiveAspect], { includeDebug: true });
      
      expect(result._debug).toBeDefined();
      expect(result._debug?.totalAspects).toBe(1);
      expect(result._debug?.restrictiveCount).toBe(1);
      expect(result._debug?.harmoniousCount).toBe(0);
    });

    it('should include top driver info in debug', () => {
      const result = buildTooltipContent([mockRestrictiveAspect], { includeDebug: true });
      
      expect(result._debug?.topDriver).toBeDefined();
      expect(result._debug?.topDriver?.transit).toBe('Saturn');
      expect(result._debug?.topDriver?.natal).toBe('Moon');
      expect(result._debug?.topDriver?.aspect).toBe('square');
    });

    it('should not include debug data by default', () => {
      const result = buildTooltipContent([mockRestrictiveAspect]);
      
      expect(result._debug).toBeUndefined();
    });
  });

  describe('FRONTSTAGE VOICE RULES', () => {
    it('should NOT contain planet names in headline', () => {
      const result = buildTooltipContent([mockRestrictiveAspect]);
      
      const headline = result.headline.toLowerCase();
      expect(headline).not.toContain('saturn');
      expect(headline).not.toContain('moon');
      expect(headline).not.toContain('jupiter');
    });

    it('should NOT contain aspect names in driver descriptions', () => {
      const result = buildTooltipContent([
        mockRestrictiveAspect,
        mockHarmoniousAspect,
      ]);
      
      result.drivers.forEach(driver => {
        const desc = driver.description.toLowerCase();
        expect(desc).not.toContain('square');
        expect(desc).not.toContain('trine');
        expect(desc).not.toContain('opposition');
        expect(desc).not.toContain('sextile');
      });
    });

    it('should NOT contain degrees or angles', () => {
      const result = buildTooltipContent([mockRestrictiveAspect]);
      
      const text = formatTooltipAsText(result).toLowerCase();
      expect(text).not.toMatch(/\d+°/);
      expect(text).not.toContain('degree');
    });

    it('should use symbolic weather language', () => {
      const result = buildTooltipContent([mockRestrictiveAspect]);
      
      // Should use terms like friction, flow, field, etc.
      const text = formatTooltipAsText(result).toLowerCase();
      const hasSymbolicLanguage = 
        text.includes('friction') ||
        text.includes('flow') ||
        text.includes('field') ||
        text.includes('force') ||
        text.includes('tension') ||
        text.includes('ease');
      
      expect(hasSymbolicLanguage).toBe(true);
    });
  });
});

describe('buildTooltipForDate', () => {
  const mockTooltips: BalanceTooltipEntry[] = [
    { date: '2025-01-15', scored_aspects: [mockRestrictiveAspect] },
    { date: '2025-01-16', scored_aspects: [mockHarmoniousAspect] },
  ];

  it('should find tooltip for specific date', () => {
    const result = buildTooltipForDate(mockTooltips, '2025-01-15');
    
    expect(result).not.toBeNull();
    expect(result?.energyQuality).toBe('friction');
  });

  it('should return null for missing date', () => {
    const result = buildTooltipForDate(mockTooltips, '2025-01-20');
    
    expect(result).toBeNull();
  });
});

describe('buildLatestTooltip', () => {
  const mockTooltips: BalanceTooltipEntry[] = [
    { date: '2025-01-15', scored_aspects: [mockRestrictiveAspect] },
    { date: '2025-01-17', scored_aspects: [mockHarmoniousAspect] },
    { date: '2025-01-16', scored_aspects: [mockNeutralAspect] },
  ];

  it('should return tooltip for most recent date', () => {
    const result = buildLatestTooltip(mockTooltips);
    
    expect(result).not.toBeNull();
    // 2025-01-17 is the latest, which has harmoniousAspect
    expect(result?.energyQuality).toBe('flow');
  });

  it('should return null for empty array', () => {
    const result = buildLatestTooltip([]);
    
    expect(result).toBeNull();
  });
});

describe('formatTooltipAsText', () => {
  it('should format content as readable text', () => {
    const content = buildTooltipContent([mockRestrictiveAspect]);
    const text = formatTooltipAsText(content);
    
    expect(text).toContain(content.headline);
    expect(text).toContain(content.drivers[0].description);
  });

  it('should include retrograde note when present', () => {
    const content = buildTooltipContent([mockRetrogradeAspect]);
    const text = formatTooltipAsText(content);
    
    expect(text).toContain('Note:');
  });
});

describe('formatTooltipAsHTML', () => {
  it('should generate valid HTML structure', () => {
    const content = buildTooltipContent([mockRestrictiveAspect]);
    const html = formatTooltipAsHTML(content);
    
    expect(html).toContain('<p class="tooltip-headline">');
    expect(html).toContain('<ul class="tooltip-drivers">');
    expect(html).toContain('<li class="driver-friction">');
  });

  it('should add direction class to drivers', () => {
    const content = buildTooltipContent([mockHarmoniousAspect]);
    const html = formatTooltipAsHTML(content);
    
    expect(html).toContain('driver-flow');
  });
});

describe('getCompactSummary', () => {
  it('should return emoji + headline for friction', () => {
    const content = buildTooltipContent([mockRestrictiveAspect]);
    const summary = getCompactSummary(content);
    
    expect(summary).toContain('⚡');
  });

  it('should return emoji + headline for flow', () => {
    const content = buildTooltipContent([mockHarmoniousAspect]);
    const summary = getCompactSummary(content);
    
    expect(summary).toContain('✨');
  });

  it('should return "Quiet field" for quiet energy', () => {
    const content = buildTooltipContent([]);
    const summary = getCompactSummary(content);
    
    expect(summary).toBe('Quiet field');
  });
});
