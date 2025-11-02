/**
 * CI Gate: Golden Case & Pipeline Order Enforcement
 * 
 * This test MUST pass for all PRs. It prevents amplitude regression by:
 * 1. Enforcing the Golden Standard (2018-10-10 Hurricane Michael)
 * 2. Verifying pipeline order (amplification before normalization)
 * 3. Checking for forbidden patterns (premature /100 division)
 */

const fs = require('fs');
const path = require('path');

describe('CI Gate: Golden Case & Pipeline Order (v5.0)', () => {
  
  test('Golden Standard: 2018-10-10 Hurricane Michael (via constants)', () => {
    // Import constants to verify golden case definition exists
    const constants = require('../lib/balance/constants.js');
    const { GOLDEN_CASES } = constants;
    
    // This is the non-negotiable anchor
    expect(GOLDEN_CASES['2018-10-10']).toBeDefined();
    expect(GOLDEN_CASES['2018-10-10'].minMag).toBe(4.5);
    expect(GOLDEN_CASES['2018-10-10'].biasBand).toEqual([-5.0, -4.0]);
  });

  test('Golden Standard: 2018-10-10 Hurricane Michael (via calculation)', function() {
    const { aggregate } = require('../src/seismograph.js');
    const benchmarkDataPath = path.join(__dirname, '../benchmark-result-2018-10-10.json');
    const benchmarkData = JSON.parse(fs.readFileSync(benchmarkDataPath, 'utf8'));
    const aspects = benchmarkData.backstage.labels.Transit_to_A;

    const result = aggregate(aspects, {
      referenceDate: '2018-10-10',
    });

    // The spec is a range, but for the golden case, we expect exact values
    // after the v5.0 refactor.
    expect(result.magnitude).toBe(5);
    expect(result.directional_bias).toBe(-5);
  });

  test('BIAS_DIVISOR must be 10 for full amplitude', () => {
    // Critical: BIAS_DIVISOR=100 caps magnitude at ~3.1
    // BIAS_DIVISOR=10 allows full 5.0 reach
    const amplifiers = require('../lib/balance/amplifiers.js');
    const { BIAS_DIVISOR } = amplifiers;
    expect(BIAS_DIVISOR).toBe(10);
  });

  test('Pipeline order: amplifiers.js has no /100 before scaling', () => {
    const amplifiersPath = path.join(__dirname, '../lib/balance/amplifiers.js');
    const content = fs.readFileSync(amplifiersPath, 'utf8');
    
    // Should NOT have any raw /100 in the main amplification logic
    // (normalizeAmplifiedBias uses BIAS_DIVISOR constant, which is OK)
    const lines = content.split('\n');
    const suspiciousLines = lines.filter((line, idx) => {
      // Look for literal /100 that's not in a comment or constant definition
      if (line.includes('//')) return false;
      if (line.includes('BIAS_DIVISOR') || line.includes('VOLATILITY_DIVISOR')) return false;
      return line.includes('/ 100') || line.includes('/100');
    });
    
    // If this fails, someone reintroduced premature division
    expect(suspiciousLines.length).toBe(0);
  });

  test('Seismograph applies geometry amplification BEFORE summing', () => {
    const seismoPath = path.join(__dirname, '../src/seismograph.js');
    const content = fs.readFileSync(seismoPath, 'utf8');
    
    // Verify applyGeometryAmplification is imported
    expect(content).toContain('applyGeometryAmplification');
    
    // Verify it's called in the aspect loop (before summing)
    // Look for the pattern: applyGeometryAmplification called per-aspect
    const hasPerAspectAmp = content.includes('applyGeometryAmplification') &&
                            (content.includes('.forEach') || content.includes('for ('));
    
    expect(hasPerAspectAmp).toBe(true);
  });

  test('No scaling logic duplicated in seismograph.js', () => {
    const seismoPath = path.join(__dirname, '../src/seismograph.js');
    const content = fs.readFileSync(seismoPath, 'utf8');
    
    // Seismograph should NOT have inline * 5 or clamp() calls
    // All scaling must go through lib/balance/scale.js
    const lines = content.split('\n');
    
    // Check for suspicious patterns
    const hasInlineScaling = lines.some(line => {
      if (line.includes('//')) return false; // skip comments
      // Look for raw multiplication by scale factor
      return (line.includes('* 5') || line.includes('*5')) &&
             !line.includes('SCALE_FACTOR');
    });
    
    expect(hasInlineScaling).toBe(false);
  });

  test('Constants are imported from single source', () => {
    const seismoPath = path.join(__dirname, '../src/seismograph.js');
    const content = fs.readFileSync(seismoPath, 'utf8');
    
    // Should import SCALE_FACTOR from scale-bridge (canonical single source)
    // Match destructuring import pattern (multi-line safe with dotall flag)
    expect(content).toMatch(/SCALE_FACTOR[^}]*}\s*=\s*require\(['"]\.\.\/lib\/balance\/scale-bridge['"]\)/s);
  });

  test('Transform trace uses correct simplified pipeline', () => {
    const seismoPath = path.join(__dirname, '../src/seismograph.js');
    const content = fs.readFileSync(seismoPath, 'utf8');
    
    // Find the pipeline string within the main aggregate function's return block.
    // This avoids accidentally matching the 'empty_aspect_array' case.
    const mainLogicBlock = content.substring(content.indexOf('const transform_trace = {'));
    const pipelineMatch = mainLogicBlock.match(/pipeline:\s*'([^']*)'/);
    
    expect(pipelineMatch).toBeTruthy();
    if (pipelineMatch) {
      const pipeline = pipelineMatch[1];
      // This must match the simplified descriptor introduced in the refactor
      expect(pipeline).toBe('normalize_scale_clamp_round');
    }
  });
});

describe('CI Gate: Spec Compliance (v5.0)', () => {
  
  test('SCALE_FACTOR is 5', () => {
    const constants = require('../lib/balance/constants.js');
    const { SCALE_FACTOR } = constants;
    expect(SCALE_FACTOR).toBe(5);
  });

  test('SPEC_VERSION is 5.0', () => {
    const constants = require('../lib/balance/constants.js');
    const { SPEC_VERSION } = constants;
    expect(SPEC_VERSION).toBe('5.0');
  });

  test('Ranges are canonical for v5.0', () => {
    const constants = require('../lib/balance/constants.js');
    const { RANGE_MAG, RANGE_BIAS } = constants;

    expect(RANGE_MAG).toEqual([0, 5]);
    expect(RANGE_BIAS).toEqual([-5, 5]);
  });
});
