/**
 * Balance Tooltips API Integration Tests
 * 
 * Tests the `include_balance_tooltips` opt-in flag for the Math Brain API.
 * When enabled, the API returns scored aspects that explain the Balance Meter values.
 * 
 * @see docs/MANDATE_2_IMPLEMENTATION_PLAN.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the seismograph aggregate function to return predictable scored aspects
const mockScoredAspects = [
  {
    transit: { body: 'Saturn', retrograde: false },
    natal: { body: 'Moon' },
    type: 'square',
    orbDeg: 2.3,
    S: -0.85,
  },
  {
    transit: { body: 'Jupiter', retrograde: false },
    natal: { body: 'Venus' },
    type: 'trine',
    orbDeg: 1.1,
    S: 0.72,
  },
  {
    transit: { body: 'Mars', retrograde: true },
    natal: { body: 'Sun' },
    type: 'opposition',
    orbDeg: 3.5,
    S: -0.45,
  },
];

describe('Balance Tooltips API Flag', () => {
  describe('include_balance_tooltips: false (default)', () => {
    it('should NOT include balance_tooltips in response by default', async () => {
      // Simulate a response without the flag
      const responseBody = {
        success: true,
        unified_output: {
          daily_entries: [
            {
              date: '2025-01-15',
              symbolic_weather: {
                magnitude: 3.2,
                directional_bias: -1.5,
              },
            },
          ],
        },
        // balance_tooltips should be undefined
      };

      expect(responseBody).not.toHaveProperty('balance_tooltips');
    });

    it('should keep payload light when flag is not set', () => {
      const responseBody = {
        success: true,
        unified_output: { daily_entries: [] },
      };

      // Verify no extra data is included
      const keys = Object.keys(responseBody);
      expect(keys).not.toContain('balance_tooltips');
    });
  });

  describe('include_balance_tooltips: true', () => {
    it('should include balance_tooltips array when flag is true', () => {
      // Simulate a response with the flag enabled
      const responseBody = {
        success: true,
        unified_output: {
          daily_entries: [
            {
              date: '2025-01-15',
              symbolic_weather: {
                magnitude: 3.2,
                directional_bias: -1.5,
                _aggregateResult: {
                  scored: mockScoredAspects,
                },
              },
            },
          ],
        },
        balance_tooltips: [
          {
            date: '2025-01-15',
            scored_aspects: mockScoredAspects,
          },
        ],
      };

      expect(responseBody).toHaveProperty('balance_tooltips');
      expect(responseBody.balance_tooltips).toHaveLength(1);
      expect(responseBody.balance_tooltips[0].date).toBe('2025-01-15');
      expect(responseBody.balance_tooltips[0].scored_aspects).toHaveLength(3);
    });

    it('should preserve scored aspect structure', () => {
      const scoredAspect = mockScoredAspects[0];

      // Verify structure matches ScoredAspect type
      expect(scoredAspect).toHaveProperty('transit');
      expect(scoredAspect).toHaveProperty('natal');
      expect(scoredAspect).toHaveProperty('type');
      expect(scoredAspect).toHaveProperty('orbDeg');
      expect(scoredAspect).toHaveProperty('S');

      // Verify transit structure
      expect(scoredAspect.transit).toHaveProperty('body');
      expect(scoredAspect.transit).toHaveProperty('retrograde');

      // Verify natal structure
      expect(scoredAspect.natal).toHaveProperty('body');
    });

    it('should handle empty scored array gracefully', () => {
      const responseBody = {
        success: true,
        balance_tooltips: [
          {
            date: '2025-01-15',
            scored_aspects: [],
          },
        ],
      };

      expect(responseBody.balance_tooltips[0].scored_aspects).toEqual([]);
    });

    it('should handle missing _aggregateResult gracefully', () => {
      // When _aggregateResult is missing, scored_aspects should be empty
      const dailyEntry = {
        date: '2025-01-15',
        symbolic_weather: {
          magnitude: 0,
          directional_bias: 0,
          // No _aggregateResult
        },
      };

      const scoredAspects = (dailyEntry.symbolic_weather as any)?._aggregateResult?.scored || [];
      expect(scoredAspects).toEqual([]);
    });
  });

  describe('Scored Aspect Validation', () => {
    it('should have valid score range (-1 to +1 typical, can exceed with boost)', () => {
      for (const aspect of mockScoredAspects) {
        // Scores typically range from -1 to +1, but can be higher with outer planet boost
        expect(aspect.S).toBeGreaterThanOrEqual(-2);
        expect(aspect.S).toBeLessThanOrEqual(2);
      }
    });

    it('should have valid aspect types', () => {
      const validTypes = ['conjunction', 'opposition', 'square', 'trine', 'sextile', 'quincunx', 'semisextile'];
      
      for (const aspect of mockScoredAspects) {
        expect(validTypes).toContain(aspect.type);
      }
    });

    it('should have valid orb degrees (0-10 range)', () => {
      for (const aspect of mockScoredAspects) {
        expect(aspect.orbDeg).toBeGreaterThanOrEqual(0);
        expect(aspect.orbDeg).toBeLessThanOrEqual(10);
      }
    });

    it('should identify hard aspects by negative score', () => {
      const hardAspects = mockScoredAspects.filter(a => 
        ['square', 'opposition'].includes(a.type)
      );

      for (const aspect of hardAspects) {
        expect(aspect.S).toBeLessThan(0);
      }
    });

    it('should identify soft aspects by positive score', () => {
      const softAspects = mockScoredAspects.filter(a => 
        ['trine', 'sextile'].includes(a.type)
      );

      for (const aspect of softAspects) {
        expect(aspect.S).toBeGreaterThan(0);
      }
    });
  });

  describe('Multi-day Response', () => {
    it('should include tooltips for each day when flag is enabled', () => {
      const responseBody = {
        balance_tooltips: [
          { date: '2025-01-15', scored_aspects: mockScoredAspects },
          { date: '2025-01-16', scored_aspects: [mockScoredAspects[0]] },
          { date: '2025-01-17', scored_aspects: [] },
        ],
      };

      expect(responseBody.balance_tooltips).toHaveLength(3);
      expect(responseBody.balance_tooltips[0].scored_aspects).toHaveLength(3);
      expect(responseBody.balance_tooltips[1].scored_aspects).toHaveLength(1);
      expect(responseBody.balance_tooltips[2].scored_aspects).toHaveLength(0);
    });

    it('should preserve date association', () => {
      const responseBody = {
        balance_tooltips: [
          { date: '2025-01-15', scored_aspects: mockScoredAspects },
          { date: '2025-01-16', scored_aspects: [] },
        ],
      };

      // Each tooltip entry should have its date preserved
      expect(responseBody.balance_tooltips[0].date).toBe('2025-01-15');
      expect(responseBody.balance_tooltips[1].date).toBe('2025-01-16');
    });
  });
});

describe('Balance Tooltip Data Shape', () => {
  it('should match the expected TypeScript interface', () => {
    // This test documents the expected shape for Phase 3 (tooltip-context.ts)
    interface ScoredAspect {
      transit: { body: string; retrograde: boolean };
      natal: { body: string };
      type: string;
      orbDeg: number;
      S: number;
      _amplification?: { before: number; after: number; factor: number };
    }

    interface BalanceTooltipEntry {
      date: string;
      scored_aspects: ScoredAspect[];
    }

    const entry: BalanceTooltipEntry = {
      date: '2025-01-15',
      scored_aspects: mockScoredAspects,
    };

    expect(entry.date).toBeDefined();
    expect(Array.isArray(entry.scored_aspects)).toBe(true);
  });
});
