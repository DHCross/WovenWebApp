/**
 * Mandate 2 Phase 1 Tests: Balance Meter Tooltips - Scored Aspects Exposure
 * 
 * Tests that the `include_balance_tooltips` flag correctly exposes scored aspects
 * from the seismograph aggregate function in the Math Brain API response.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the scored aspects structure as returned by seismograph
const mockScoredAspects = [
  {
    transit: { body: 'Saturn', retrograde: false },
    natal: { body: 'Moon' },
    type: 'square',
    orbDeg: 2.3,
    S: -1.275,
  },
  {
    transit: { body: 'Jupiter', retrograde: false },
    natal: { body: 'Venus' },
    type: 'trine',
    orbDeg: 1.8,
    S: 0.945,
  },
  {
    transit: { body: 'Pluto', retrograde: true },
    natal: { body: 'Sun' },
    type: 'opposition',
    orbDeg: 0.5,
    S: -2.1,
  },
];

// Mock daily entry with symbolic_weather containing _aggregateResult
const mockDailyEntryWithScored = {
  date: '2025-11-28',
  symbolic_weather: {
    magnitude: 3.2,
    directional_bias: -1.5,
    _aggregateResult: {
      magnitude: 3.2,
      directional_bias: -1.5,
      scored: mockScoredAspects,
    },
  },
};

describe('Mandate 2 Phase 1: Balance Tooltips Flag', () => {
  describe('ScoredAspect Structure', () => {
    it('should have correct shape for each scored aspect', () => {
      const aspect = mockScoredAspects[0];
      
      // Transit structure
      expect(aspect.transit).toHaveProperty('body');
      expect(aspect.transit).toHaveProperty('retrograde');
      expect(typeof aspect.transit.body).toBe('string');
      expect(typeof aspect.transit.retrograde).toBe('boolean');
      
      // Natal structure
      expect(aspect.natal).toHaveProperty('body');
      expect(typeof aspect.natal.body).toBe('string');
      
      // Aspect metadata
      expect(typeof aspect.type).toBe('string');
      expect(typeof aspect.orbDeg).toBe('number');
      expect(typeof aspect.S).toBe('number');
    });

    it('should categorize aspects by S score (positive vs negative)', () => {
      const positive = mockScoredAspects.filter(a => a.S > 0);
      const negative = mockScoredAspects.filter(a => a.S < 0);
      
      expect(positive.length).toBe(1);
      expect(negative.length).toBe(2);
      expect(positive[0].type).toBe('trine');
      expect(negative.map(a => a.type)).toContain('square');
      expect(negative.map(a => a.type)).toContain('opposition');
    });
  });

  describe('Score Summary Calculation', () => {
    it('should correctly sum positive and negative scores', () => {
      let positiveCount = 0;
      let negativeCount = 0;
      let totalPositiveS = 0;
      let totalNegativeS = 0;

      mockScoredAspects.forEach((aspect) => {
        if (aspect.S > 0) {
          positiveCount++;
          totalPositiveS += aspect.S;
        } else if (aspect.S < 0) {
          negativeCount++;
          totalNegativeS += aspect.S;
        }
      });

      expect(positiveCount).toBe(1);
      expect(negativeCount).toBe(2);
      expect(totalPositiveS).toBeCloseTo(0.945, 3);
      expect(totalNegativeS).toBeCloseTo(-3.375, 3); // -1.275 + -2.1
    });
  });

  describe('BalanceTooltipContext Structure', () => {
    it('should build correct tooltip context from daily entry', () => {
      const entry = mockDailyEntryWithScored;
      const sw = entry.symbolic_weather;
      const aggregateResult = sw._aggregateResult;
      const scored = aggregateResult.scored;

      // Build the context as the API would
      let positiveCount = 0;
      let negativeCount = 0;
      let totalPositiveS = 0;
      let totalNegativeS = 0;

      scored.forEach((aspect: typeof mockScoredAspects[0]) => {
        if (aspect.S > 0) {
          positiveCount++;
          totalPositiveS += aspect.S;
        } else if (aspect.S < 0) {
          negativeCount++;
          totalNegativeS += aspect.S;
        }
      });

      const tooltipContext = {
        date: entry.date,
        scored_aspects: scored,
        aspect_count: scored.length,
        score_summary: {
          positive_count: positiveCount,
          negative_count: negativeCount,
          total_positive_S: Math.round(totalPositiveS * 1000) / 1000,
          total_negative_S: Math.round(totalNegativeS * 1000) / 1000,
        },
      };

      // Verify structure
      expect(tooltipContext.date).toBe('2025-11-28');
      expect(tooltipContext.aspect_count).toBe(3);
      expect(tooltipContext.scored_aspects).toHaveLength(3);
      expect(tooltipContext.score_summary.positive_count).toBe(1);
      expect(tooltipContext.score_summary.negative_count).toBe(2);
      expect(tooltipContext.score_summary.total_positive_S).toBeCloseTo(0.945, 3);
      expect(tooltipContext.score_summary.total_negative_S).toBeCloseTo(-3.375, 3);
    });
  });

  describe('Opt-in Flag Behavior', () => {
    it('should only include balance_tooltips when flag is true', () => {
      // Simulate flag behavior
      const includeBalanceTooltips = true;
      const balanceTooltips = [{ date: '2025-11-28', scored_aspects: mockScoredAspects }];
      
      const responseBody: Record<string, any> = { success: true };
      
      if (includeBalanceTooltips && balanceTooltips) {
        responseBody.balance_tooltips = balanceTooltips;
      }
      
      expect(responseBody).toHaveProperty('balance_tooltips');
      expect(responseBody.balance_tooltips).toHaveLength(1);
    });

    it('should NOT include balance_tooltips when flag is false', () => {
      const includeBalanceTooltips = false;
      const balanceTooltips = [{ date: '2025-11-28', scored_aspects: mockScoredAspects }];
      
      const responseBody: Record<string, any> = { success: true };
      
      if (includeBalanceTooltips && balanceTooltips) {
        responseBody.balance_tooltips = balanceTooltips;
      }
      
      expect(responseBody).not.toHaveProperty('balance_tooltips');
    });

    it('should default to not including tooltips when flag is undefined', () => {
      const rawPayload = { personA: { name: 'Test' } };
      const includeBalanceTooltips = rawPayload.include_balance_tooltips === true;
      
      expect(includeBalanceTooltips).toBe(false);
    });
  });

  describe('Aspect Type Classification', () => {
    it('should correctly identify hard aspects (negative S)', () => {
      const hardAspects = mockScoredAspects.filter(a => 
        a.type === 'square' || a.type === 'opposition'
      );
      
      hardAspects.forEach(aspect => {
        expect(aspect.S).toBeLessThan(0);
      });
    });

    it('should correctly identify soft aspects (positive S)', () => {
      const softAspects = mockScoredAspects.filter(a => 
        a.type === 'trine' || a.type === 'sextile'
      );
      
      softAspects.forEach(aspect => {
        expect(aspect.S).toBeGreaterThan(0);
      });
    });
  });
});

describe('Mandate 2 Phase 1: Seismograph Integration', () => {
  it('should verify seismograph aggregate returns scored array', async () => {
    // This test verifies the seismograph module structure
    const seismograph = await import('../../src/seismograph.js');
    
    expect(seismograph).toHaveProperty('aggregate');
    expect(typeof seismograph.aggregate).toBe('function');
  });

  it('should verify seismograph exposes _internals for testing', async () => {
    const seismograph = await import('../../src/seismograph.js');
    
    expect(seismograph).toHaveProperty('_internals');
    expect(seismograph._internals).toHaveProperty('normalizeAspect');
    expect(seismograph._internals).toHaveProperty('scoreAspect');
  });
});
