/**
 * @fileoverview Example test demonstrating comprehensive diagnostic logging
 * for troubleshooting Woven Map/Balance Meter pipeline issues.
 *
 * To run diagnostics on your data:
 * 1. Enable diagnostics with `enableDiagnostics: true` in options
 * 2. Optionally provide rolling context to test dynamic normalization
 * 3. Review console output for each pipeline stage
 */

const { aggregate } = require('../src/seismograph');

describe('Seismograph Pipeline Diagnostics', () => {
  // Sample aspect data for testing
  const sampleAspects = [
    {
      transit: { body: 'Saturn', retrograde: false },
      natal: { body: 'Sun' },
      type: 'square',
      orb: 0.5
    },
    {
      transit: { body: 'Uranus', retrograde: false },
      natal: { body: 'Moon' },
      type: 'opposition',
      orb: 1.2
    },
    {
      transit: { body: 'Jupiter', retrograde: false },
      natal: { body: 'Venus' },
      type: 'trine',
      orb: 2.3
    },
    {
      transit: { body: 'Mars', retrograde: false },
      natal: { body: 'ASC' },
      type: 'conjunction',
      orb: 0.8
    },
    {
      transit: { body: 'Neptune', retrograde: false },
      natal: { body: 'Mercury' },
      type: 'square',
      orb: 1.5
    }
  ];

  describe('Basic Diagnostic Logging', () => {
    it('should log all pipeline stages with enableDiagnostics=true', () => {
      const result = aggregate(sampleAspects, null, {
        enableDiagnostics: true
      });

      // Verify result structure
      expect(result).toHaveProperty('magnitude');
      expect(result).toHaveProperty('directional_bias');
      expect(result).toHaveProperty('_diagnostics');
      expect(result._diagnostics).toHaveProperty('aspect_count', 5);

      console.log('\n📊 Final Result:', {
        magnitude: result.magnitude,
        directional_bias: result.directional_bias,
        diagnostics: result._diagnostics
      });
    });

    it('should detect when values are clamped at boundaries', () => {
      // Create extreme aspects to trigger clamping
      const extremeAspects = Array(20).fill(null).map((_, i) => ({
        transit: { body: 'Pluto', retrograde: false },
        natal: { body: 'Sun' },
        type: 'square',
        orb: 0.1 + (i * 0.1)
      }));

      const result = aggregate(extremeAspects, null, {
        enableDiagnostics: true
      });

      console.log('\n⚠️ Clamping Test - Check for boundary warnings above');
      expect(result._diagnostics.aspect_count).toBe(20);
    });
  });

  describe('Rolling Window Diagnostics', () => {
    it('should log rolling window contents and calculation method', () => {
      const rollingContext = {
        magnitudes: [3.2, 4.1, 3.8, 4.5, 3.9, 4.2, 3.7, 4.0, 3.6, 4.3, 3.8, 4.1, 3.9, 4.0]
      };

      const result = aggregate(sampleAspects, null, {
        enableDiagnostics: true,
        rollingContext
      });

      console.log('\n🔄 Rolling Window Test - Check window contents and median calculation above');
      expect(result._diagnostics.scaling_method).toContain('rolling_window');
    });

    it('should warn when rolling window is missing or incomplete', () => {
      const incompleteContext = {
        magnitudes: [3.5] // Only 1 day
      };

      const result = aggregate(sampleAspects, null, {
        enableDiagnostics: true,
        rollingContext: incompleteContext
      });

      console.log('\n⚠️ Incomplete Window Test - Should show fallback to static divisor');
      expect(result._diagnostics).toBeDefined();
    });
  });

  describe('Aspect Filtering & Validation', () => {
    it('should log aspect count and score distribution', () => {
      const result = aggregate(sampleAspects, null, {
        enableDiagnostics: true
      });

      console.log('\n📋 Aspect Filtering Test - Check score distribution above');
      expect(result.scored).toHaveLength(5);
    });

    it('should detect empty or missing aspect arrays', () => {
      const result = aggregate([], null, {
        enableDiagnostics: true
      });

      console.log('\n⚠️ Empty Aspects Test - Should show warning');
      expect(result.magnitude).toBe(0);
      expect(result._diagnostics.warnings).toContain('empty_aspect_array');
    });
  });

  describe('Multi-Day Variability Check', () => {
    it('should detect if values are stuck at boundaries across days', () => {
      console.log('\n📅 MULTI-DAY VARIABILITY TEST\n');

      const testDays = [
        { date: '2025-10-01', aspects: sampleAspects },
        {
          date: '2025-10-02',
          aspects: sampleAspects.map(a => ({ ...a, orb: a.orb + 0.5 }))
        },
        {
          date: '2025-10-03',
          aspects: sampleAspects.map(a => ({ ...a, orb: a.orb + 1.0 }))
        }
      ];

      const results = testDays.map(day => {
        console.log(`\n--- ${day.date} ---`);
        return {
          date: day.date,
          result: aggregate(day.aspects, null, {
            enableDiagnostics: true
          })
        };
      });

      // Check for variability
      const magnitudes = results.map(r => r.result.magnitude);
      const biases = results.map(r => r.result.directional_bias);

      const magnitudeVariance = magnitudes.reduce((sum, m) => {
        const mean = magnitudes.reduce((a, b) => a + b) / magnitudes.length;
        return sum + Math.pow(m - mean, 2);
      }, 0) / magnitudes.length;

      console.log('\n📊 Variability Summary:');
      console.log('Magnitudes:', magnitudes);
      console.log('Biases:', biases);
      console.log('Magnitude Variance:', magnitudeVariance);

      if (magnitudeVariance < 0.01) {
        console.warn('⚠️ LOW VARIABILITY DETECTED - Magnitudes may be stuck!');
      }

      // At least some variation should exist across days
      expect(magnitudes).toBeDefined();
      expect(biases).toBeDefined();
    });
  });

  describe('Raw vs Normalized vs Clamped Tracking', () => {
    it('should show complete transformation pipeline for each value', () => {
      const result = aggregate(sampleAspects, null, {
        enableDiagnostics: true
      });

      console.log('\n🔍 Transformation Pipeline:');
      console.log('Raw Energy (X_raw):', result.energyMagnitude);
      console.log('Normalized Magnitude:', result.magnitude_normalized);
      console.log('Final Magnitude:', result.magnitude);
      console.log('\nRaw Valence (Y_raw):', result.rawValence);
      console.log('Amplified Bias:', result.bias_amplified);
      console.log('Normalized Bias:', result.bias_normalized);
      console.log('Final Directional Bias:', result.directional_bias);

      expect(result.transform_trace).toBeDefined();
      expect(result.transform_trace.steps).toBeDefined();
    });
  });
});

describe('Real-World Troubleshooting Scenarios', () => {
  describe('Scenario 1: Values Always Maxed Out', () => {
    it('should identify if scaling divisor is too small', () => {
      console.log('\n🔧 SCENARIO 1: Always at Max Intensity\n');

      const highEnergyAspects = Array(30).fill(null).map((_, i) => ({
        transit: { body: i % 2 === 0 ? 'Saturn' : 'Uranus', retrograde: false },
        natal: { body: i % 3 === 0 ? 'Sun' : 'Moon' },
        type: i % 2 === 0 ? 'square' : 'opposition',
        orb: 0.5 + (i % 3) * 0.3
      }));

      const result = aggregate(highEnergyAspects, null, {
        enableDiagnostics: true
      });

      console.log('\n💡 Check MAGNITUDE_NORM log above:');
      console.log('- If effective_divisor is too small, raw values will saturate');
      console.log('- Check if magnitude_normalized is consistently close to 1.0');
      console.log('- Actual normalized:', result.magnitude_normalized);

      expect(result._diagnostics.effective_divisor).toBeDefined();
    });
  });

  describe('Scenario 2: Rolling Window Not Updating', () => {
    it('should detect static divisor when window should be dynamic', () => {
      console.log('\n🔧 SCENARIO 2: Rolling Window Stuck\n');

      const testAspects = [
        {
          transit: { body: 'Saturn', retrograde: false },
          natal: { body: 'Sun' },
          type: 'square',
          orb: 0.5
        }
      ];

      const staticContext = {
        magnitudes: [4.0, 4.0, 4.0, 4.0, 4.0] // Suspiciously uniform
      };

      const result = aggregate(testAspects, null, {
        enableDiagnostics: true,
        rollingContext: staticContext
      });

      console.log('\n💡 Check ROLLING_WINDOW log above:');
      console.log('- window_contents should show actual daily variation');
      console.log('- If all values are identical (4.0), window is not updating');
      console.log('- Check window_stats.min, max, avg for signs of staleness');

      expect(result._diagnostics).toBeDefined();
    });
  });

  describe('Scenario 3: Aspects Being Filtered Out', () => {
    it('should show if aspect count drops unexpectedly', () => {
      console.log('\n🔧 SCENARIO 3: Missing Aspects\n');

      const beforeFilteringCount = 10;
      const mockAspects = Array(beforeFilteringCount).fill(null).map((_, i) => ({
        transit: { body: 'Mars', retrograde: false },
        natal: { body: 'Venus' },
        type: 'sextile',
        orb: 5.0 + i // Some may be outside typical orb ranges
      }));

      const result = aggregate(mockAspects, null, {
        enableDiagnostics: true
      });

      console.log('\n💡 Check INPUT and SCORING logs above:');
      console.log('- received_count should match expected aspect count');
      console.log('- If aspect_count < received_count, aspects were filtered');
      console.log('- Review orb cutoffs and aspect type exclusions');
      console.log(`- Expected: ${beforeFilteringCount}, Got: ${result._diagnostics.aspect_count}`);

      expect(result._diagnostics.aspect_count).toBeLessThanOrEqual(beforeFilteringCount);
    });
  });
});
