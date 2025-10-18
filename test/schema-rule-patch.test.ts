/* Test Suite for Schema Rule-Patch Implementation */
import { vi } from 'vitest';
import { ContractLinter } from '../src/contract-linter';
import { renderFrontstage } from '../src/frontstage-renderer';
import { enforceNatalOnlyMode, stripBalancePayload, ReportMode } from '../src/schema-rule-patch';

vi.mock('../lib/llm', () => ({
  callPerplexity: vi.fn(async (prompt: string) => {
    if (prompt.includes('narrateSymbolicWeather')) {
      return '3-day window of symbolic weather';
    }
    if (prompt.includes('narrateBlueprintClimate')) {
      return 'The climate is one of resilience and watchfulness. You have a Leo Sun and a Scorpio Moon.';
    }
    if (prompt.includes('narrateStitchedReflection')) {
      return 'The lighthouse stands alone, a beacon in the weather.';
    }
    return 'Default mock response';
  }),
}));

describe('Schema Rule-Patch System', () => {
  describe('Natal-Only Mode', () => {
    test('should strip balance payload and enforce policies', () => {
      const payload = {
        mode: 'natal-only' as ReportMode,
        person_a: {
          chart: {
            planets: [
              { name: 'Sun', sign: 'Leo', degree: 15 },
              { name: 'Moon', sign: 'Scorpio', degree: 22 }
            ]
          }
        },
        // These should be stripped in natal-only mode
        indices: {
          window: { start: '2025-09-14', end: '2025-10-03' },
          days: [
            { date: '2025-09-15', sf_diff: -2.1, magnitude: 4.0, volatility: 5.0 }
          ]
        },
        transitsByDate: {
          '2025-09-15': {
            aspects: [{ transit_body: 'Mars', natal_target: 'Sun', aspect: 'Square' }]
          }
        },
        uncanny: { some: 'data' },
        seismograph: { magnitude: 3.2 }
      };

      const result = enforceNatalOnlyMode(payload);

      // Should strip balance fields
      expect(result.indices).toBeUndefined();
      expect(result.transitsByDate).toBeUndefined();
      expect(result.uncanny).toBeUndefined();
      expect(result.seismograph).toBeUndefined();

      // Should enforce frontstage policy
      expect(result.frontstage_policy.allow_symbolic_weather).toBe(false);
      expect(result.frontstage_policy.autogenerate).toBe(true);

      // Should set backstage flags
      expect(result.backstage.natal_mode).toBe(true);
      expect(result.backstage.stripped_balance_payload).toBe(true);

      // Should preserve valid natal data
      expect(result.person_a.chart.planets).toHaveLength(2);
      expect(result.mode).toBe('natal-only');
    });

    test('should generate only blueprint and stitched reflection', async () => {
      const payload = {
        mode: 'natal-only' as ReportMode,
        frontstage_policy: {
          autogenerate: true,
          allow_symbolic_weather: false
        },
        frontstage: {
          directive: {
            status: 'generate',
            voice: 'FIELD→MAP→VOICE',
            include: ['blueprint', 'symbolic_weather', 'stitched_reflection']
          }
        },
        person_a: {
          chart: {
            planets: [
              { name: 'Sun', sign: 'Leo', degree: 15 },
              { name: 'Moon', sign: 'Scorpio', degree: 22 },
              { name: 'Ascendant', sign: 'Virgo', degree: 5 }
            ]
          }
        },
        constitutional_modes: {
          primary_mode: { function: 'Explore', signature: 'Cardinal' },
          secondary_mode: { function: 'Stabilize', signature: 'Fixed' },
          shadow_mode: { function: 'Innovate', signature: 'Mutable' }
        }
      };

      const result = await renderFrontstage(payload);

      // Should generate blueprint
      expect(result.blueprint).toBeDefined();
      expect(result.blueprint).toContain('Leo');
      expect(result.blueprint).toContain('Scorpio');

      // Should NOT generate symbolic weather (natal-only mode)
      expect(result.symbolic_weather).toBeNull();

      // Should generate stitched reflection
      expect(result.stitched_reflection).toBeDefined();
      expect(result.stitched_reflection).toContain('stands alone');
    });
  });

  describe('Balance Mode', () => {
    test('should require window and location', () => {
      const payload = {
        mode: 'balance' as ReportMode,
        person_a: {
          chart: { planets: [] }
        }
        // Missing window and location
      };

      const lintResult = ContractLinter.lint(payload);

      expect(lintResult.valid).toBe(false);
      expect(lintResult.errors.some(e => e.includes('date window'))).toBe(true);
      expect(lintResult.errors.some(e => e.includes('location data'))).toBe(true);
    });

    test('should generate symbolic weather when indices are present', async () => {
      const payload = {
        mode: 'balance' as ReportMode,
        frontstage_policy: {
          autogenerate: true,
          allow_symbolic_weather: true
        },
        window: { start: '2025-09-14', end: '2025-10-03' },
        location: { lat: 40.7128, lon: -74.0060 },
        indices: {
          window: { start: '2025-09-14', end: '2025-10-03' },
          days: [
            { date: '2025-09-15', sf_diff: -2.1, magnitude: 4.0, volatility: 5.0 },
            { date: '2025-09-16', sf_diff: 1.2, magnitude: 3.5, volatility: 2.8 },
            { date: '2025-09-17', sf_diff: 0.5, magnitude: 2.8, volatility: 4.2 }
          ]
        },
        person_a: {
          chart: {
            planets: [
              { name: 'Sun', sign: 'Virgo', degree: 22 },
              { name: 'Moon', sign: 'Pisces', degree: 8 }
            ]
          }
        },
        frontstage: {
          directive: {
            status: 'generate',
            voice: 'FIELD→MAP→VOICE',
            include: ['blueprint', 'symbolic_weather', 'stitched_reflection']
          }
        },
        constitutional_modes: {
          primary_mode: { function: 'Explore', signature: 'Cardinal' },
          secondary_mode: { function: 'Stabilize', signature: 'Fixed' },
          shadow_mode: { function: 'Innovate', signature: 'Mutable' }
        }
      };

      const result = await renderFrontstage(payload);

      // Should generate all components
      expect(result.blueprint).toBeDefined();
      expect(result.symbolic_weather).toBeDefined();
      expect(result.symbolic_weather).not.toBeNull();
      expect(result.stitched_reflection).toBeDefined();

      // Weather should reference the daily data from the mock
      expect(result.symbolic_weather).toContain('3-day window');
    });
  });

  describe('Contract Linter', () => {
    test('should catch natal-only violations', () => {
      const payload = {
        mode: 'natal-only' as ReportMode,
        indices: {
          days: [{ date: '2025-09-15', magnitude: 4.0 }]
        },
        transitsByDate: {},
        seismograph: { magnitude: 3.2 }
      };

      const lintResult = ContractLinter.lint(payload);

      expect(lintResult.severity).toBe('errors');
      expect(lintResult.errors.some(e => e.includes('CRITICAL'))).toBe(true);
      expect(lintResult.warnings.some(w => w.includes('NATAL-ONLY VIOLATION'))).toBe(true);
    });

    test('should auto-fix common issues', () => {
      const payload = {
        mode: 'balance' as ReportMode,
        window: { start: '2025-09-14', end: '2025-10-03' },
        location: { lat: 40.7128, lon: -74.0060 },
        // Missing frontstage_policy and contract version
      };

      const { payload: fixed, result } = ContractLinter.lintAndFix(payload);

      // The payload should have been auto-fixed during processing
      expect(fixed.frontstage_policy).toBeDefined();
      expect(fixed.frontstage_policy.autogenerate).toBe(true);
      expect(fixed.frontstage_policy.allow_symbolic_weather).toBe(true); // default for balance mode
      expect(fixed.contract).toBe('clear-mirror/1.3');

      // Should be valid after auto-fixes
      expect(result.valid).toBe(true);
    });

    test('should generate readable lint reports', () => {
      const payload = {
        mode: 'natal-only' as ReportMode,
        indices: { days: [] },
        transitsByDate: {}
      };

      const lintResult = ContractLinter.lint(payload);
      const report = ContractLinter.generateReport(lintResult);

      expect(report).toContain('Contract Lint Report');
      expect(report).toContain('NATAL-ONLY VIOLATION');
      expect(report).toContain('Severity:');
    });
  });

  describe('Integration Tests', () => {
    test('should handle the example natal-only payload from Raven Calder', () => {
      const payload = {
        mode: 'natal-only' as ReportMode,
        frontstage_policy: { autogenerate: true, allow_symbolic_weather: false },
        frontstage: {
          directive: {
            status: 'generate',
            voice: 'FIELD→MAP→VOICE',
            include: ['blueprint', 'symbolic_weather', 'stitched_reflection']
          },
          mirror: { blueprint: null, symbolic_weather: null, stitched_reflection: null }
        },
        backstage: { natal_mode: true },
        person_a: {
          chart: {
            planets: [
              { name: 'Sun', sign: 'Virgo', degree: 15 },
              { name: 'Moon', sign: 'Cancer', degree: 28 },
              { name: 'Mercury', sign: 'Virgo', degree: 3 },
              { name: 'Venus', sign: 'Leo', degree: 12 },
              { name: 'Mars', sign: 'Libra', degree: 7 }
            ]
          }
        }
      };

      const { payload: processed, result } = ContractLinter.lintAndFix(payload);

      expect(result.valid).toBe(true);
      expect(processed.mode).toBe('natal-only');
      expect(processed.frontstage_policy.allow_symbolic_weather).toBe(false);
      expect(processed.backstage.natal_mode).toBe(true);
    });

    test('should handle the example balance payload from Raven Calder', () => {
      const payload = {
        mode: 'balance' as ReportMode,
        frontstage_policy: { autogenerate: true, allow_symbolic_weather: true },
        window: { start: '2025-09-14', end: '2025-10-03' },
        location: { lat: 40.7128, lon: -74.0060 },
        indices: {
          window: { start: '2025-09-14', end: '2025-10-03' },
          days: [
            { date: '2025-09-15', sf_diff: -2.1, magnitude: 4.0, volatility: 5.0 },
            { date: '2025-09-16', sf_diff: 1.8, magnitude: 3.2, volatility: 4.1 }
          ]
        },
        frontstage: {
          directive: {
            status: 'generate',
            voice: 'FIELD→MAP→VOICE',
            include: ['blueprint', 'symbolic_weather', 'stitched_reflection']
          },
          mirror: { blueprint: null, symbolic_weather: null, stitched_reflection: null }
        }
      };

      const { payload: processed, result } = ContractLinter.lintAndFix(payload);

      expect(result.valid).toBe(true);
      expect(processed.mode).toBe('balance');
      expect(processed.frontstage_policy.allow_symbolic_weather).toBe(true);
      expect(processed.indices.days).toHaveLength(2);
    });
  });
});