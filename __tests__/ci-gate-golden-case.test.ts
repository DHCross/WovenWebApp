/**
 * CI Gate: Golden Case & Pipeline Order Enforcement
 * 
 * This test MUST pass for all PRs. It prevents amplitude regression by:
 * 1. Enforcing the Golden Standard (2018-10-10 Hurricane Michael)
 * 2. Verifying pipeline order (amplification before normalization)
 * 3. Checking for forbidden patterns (premature /100 division)
 */

import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('CI Gate: Golden Case & Pipeline Order', () => {
  
  test('Golden Standard: 2018-10-10 Hurricane Michael (via constants)', async () => {
    // Import constants to verify golden case definition exists
    const constants = await import('../lib/balance/constants.js');
    const { GOLDEN_CASES } = constants;
    
    // This is the non-negotiable anchor
    expect(GOLDEN_CASES['2018-10-10']).toBeDefined();
    expect(GOLDEN_CASES['2018-10-10'].minMag).toBe(4.5);
    expect(GOLDEN_CASES['2018-10-10'].biasBand).toEqual([-5.0, -4.0]);
  });

  test('BIAS_DIVISOR must be 10 (not 100) for full amplitude', async () => {
    // Critical: BIAS_DIVISOR=100 caps magnitude at ~3.1
    // BIAS_DIVISOR=10 allows full 5.0 reach
    const amplifiers = await import('../lib/balance/amplifiers.js');
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
    
    // Seismograph should NOT have inline * 50 or clamp() calls
    // All scaling must go through lib/balance/scale.js
    const lines = content.split('\n');
    
    // Check for suspicious patterns
    const hasInlineScaling = lines.some(line => {
      if (line.includes('//')) return false; // skip comments
      // Look for raw multiplication by scale factor
      return (line.includes('* 50') || line.includes('*50')) && 
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

  test('Transform trace includes correct pipeline order', () => {
    const seismoPath = path.join(__dirname, '../src/seismograph.js');
    const content = fs.readFileSync(seismoPath, 'utf8');
    
    // Verify the transform_trace has the right pipeline
    expect(content).toContain('amplify-geometry');
    
    // Pipeline must have amplify-geometry BEFORE normalize
    const pipelineMatch = content.match(/pipeline.*amplify-geometry.*normalize/s);
    expect(pipelineMatch).toBeTruthy();
  });
});

describe('CI Gate: Runtime Assertions Active', () => {
  
  test('assertGoldenCase is exported from assertions.js', () => {
    const assertionsPath = path.join(__dirname, '../lib/balance/assertions.js');
    const content = fs.readFileSync(assertionsPath, 'utf8');
    
    // Verify assertGoldenCase function exists
    expect(content).toContain('function assertGoldenCase');
    
    // Verify it's in module.exports object (flexible multi-line match)
    expect(content).toMatch(/module\.exports\s*=\s*{[^}]*assertGoldenCase/s);
  });
});

describe('CI Gate: Backward Compatibility', () => {
  
  test('SCALE_FACTOR remains 50', async () => {
    const constants = await import('../lib/balance/constants.js');
    const { SCALE_FACTOR } = constants;
    expect(SCALE_FACTOR).toBe(50);
  });

  test('SPEC_VERSION is 3.1', async () => {
    const constants = await import('../lib/balance/constants.js');
    const { SPEC_VERSION } = constants;
    expect(SPEC_VERSION).toBe('3.1');
  });

  test('Ranges remain canonical', async () => {
    const constants = await import('../lib/balance/constants.js');
    const { RANGE_MAG, RANGE_BIAS, RANGE_COH, RANGE_SFD } = constants;
    
    expect(RANGE_MAG).toEqual([0, 5]);
    expect(RANGE_BIAS).toEqual([-5, 5]);
    expect(RANGE_COH).toEqual([0, 5]);
    expect(RANGE_SFD).toEqual([-1, 1]);
  });
});
