#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Math Brain Version Comparison Test
 * 
 * Runs identical payloads through both the original and refactored
 * versions of astrology-mathbrain.js to verify behavioral equivalence.
 * 
 * Usage:
 *   node scripts/compare-mathbrain-versions.js [--payload path/to/payload.json]
 *   node scripts/compare-mathbrain-versions.js --all
 * 
 * Exit codes:
 *   0 = All tests passed (outputs identical)
 *   1 = Differences found (outputs diverged)
 *   2 = Execution error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`),
  diff: (msg) => console.log(`  ${colors.yellow}${msg}${colors.reset}`),
};

// Configuration
const CONFIG = {
  originalPath: './lib/server/astrology-mathbrain.original.js',
  refactoredPath: './lib/server/astrology-mathbrain.js',
  testPayloadsDir: './test/payloads',
  outputDir: './test/comparison-results',
};

/**
 * Test payload definitions
 */
const TEST_PAYLOADS = {
  'natal-solo': {
    mode: 'NATAL_CHART',
    subjects: [{
      name: 'Dan',
      birth_date: '1973-07-24',
      birth_time: '14:30',
      birth_city: 'Bryn Mawr',
      birth_nation: 'US',
    }],
  },
  'natal-with-transits': {
    mode: 'TRANSITS',
    subjects: [{
      name: 'Dan',
      birth_date: '1973-07-24',
      birth_time: '14:30',
      birth_city: 'Bryn Mawr',
      birth_nation: 'US',
    }],
    date_range: {
      start: '2025-10-17',
      end: '2025-10-25',
    },
  },
  'synastry': {
    mode: 'SYNASTRY',
    subjects: [
      {
        name: 'Dan',
        birth_date: '1973-07-24',
        birth_time: '14:30',
        birth_city: 'Bryn Mawr',
        birth_nation: 'US',
      },
      {
        name: 'Partner',
        birth_date: '1980-05-15',
        birth_time: '10:00',
        birth_city: 'Los Angeles',
        birth_nation: 'US',
      },
    ],
  },
  'composite': {
    mode: 'COMPOSITE',
    subjects: [
      {
        name: 'Dan',
        birth_date: '1973-07-24',
        birth_time: '14:30',
        birth_city: 'Bryn Mawr',
        birth_nation: 'US',
      },
      {
        name: 'Partner',
        birth_date: '1980-05-15',
        birth_time: '10:00',
        birth_city: 'Los Angeles',
        birth_nation: 'US',
      },
    ],
  },
};

/**
 * Deep object comparison with detailed diff reporting
 */
function deepCompare(obj1, obj2, path = '') {
  const diffs = [];

  // Type check
  if (typeof obj1 !== typeof obj2) {
    diffs.push({
      path,
      original: typeof obj1,
      refactored: typeof obj2,
      message: `Type mismatch`,
    });
    return diffs;
  }

  // Null check
  if (obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      diffs.push({ path, original: obj1, refactored: obj2, message: 'Null mismatch' });
    }
    return diffs;
  }

  // Primitive comparison
  if (typeof obj1 !== 'object') {
    if (obj1 !== obj2) {
      diffs.push({ path, original: obj1, refactored: obj2, message: 'Value mismatch' });
    }
    return diffs;
  }

  // Array comparison
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      diffs.push({
        path,
        original: `Array[${obj1.length}]`,
        refactored: `Array[${obj2.length}]`,
        message: 'Array length mismatch',
      });
    }
    const maxLen = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLen; i++) {
      diffs.push(...deepCompare(obj1[i], obj2[i], `${path}[${i}]`));
    }
    return diffs;
  }

  // Object comparison
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  const allKeys = new Set([...keys1, ...keys2]);

  allKeys.forEach((key) => {
    const newPath = path ? `${path}.${key}` : key;
    if (!(key in obj1)) {
      diffs.push({ path: newPath, original: undefined, refactored: obj2[key], message: 'Key missing in original' });
    } else if (!(key in obj2)) {
      diffs.push({ path: newPath, original: obj1[key], refactored: undefined, message: 'Key missing in refactored' });
    } else {
      diffs.push(...deepCompare(obj1[key], obj2[key], newPath));
    }
  });

  return diffs;
}

/**
 * Execute handler function with payload
 */
async function executeHandler(handlerPath, payload) {
  try {
    // Clear require cache to ensure fresh load
    delete require.cache[require.resolve(path.resolve(handlerPath))];
    
    const handler = require(path.resolve(handlerPath));
    
    // Build mock event object
    const event = {
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
    };

    // Execute handler
    const result = await handler.handler(event, {});
    
    // Parse response
    const response = {
      statusCode: result.statusCode,
      body: JSON.parse(result.body),
    };

    return { success: true, response };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
  }
}

/**
 * Run comparison test for a single payload
 */
async function runComparisonTest(testName, payload) {
  log.header(`Testing: ${testName}`);
  
  // Check if original exists
  if (!fs.existsSync(CONFIG.originalPath)) {
    log.error(`Original file not found: ${CONFIG.originalPath}`);
    log.warn('Skipping comparison (no baseline)');
    return { skipped: true, reason: 'No original file' };
  }

  log.info('Executing original version...');
  const originalResult = await executeHandler(CONFIG.originalPath, payload);

  log.info('Executing refactored version...');
  const refactoredResult = await executeHandler(CONFIG.refactoredPath, payload);

  // Check for execution errors
  if (!originalResult.success) {
    log.error('Original version failed to execute');
    console.error(originalResult.error);
    return { passed: false, error: 'Original execution failed' };
  }

  if (!refactoredResult.success) {
    log.error('Refactored version failed to execute');
    console.error(refactoredResult.error);
    return { passed: false, error: 'Refactored execution failed' };
  }

  // Compare responses
  const diffs = deepCompare(originalResult.response, refactoredResult.response);

  // Save results
  const outputPath = path.join(CONFIG.outputDir, `${testName}-comparison.json`);
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        testName,
        payload,
        original: originalResult.response,
        refactored: refactoredResult.response,
        diffs: diffs.length > 0 ? diffs : null,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );

  // Report results
  if (diffs.length === 0) {
    log.success(`${testName}: PASSED (outputs identical)`);
    return { passed: true };
  } else {
    log.error(`${testName}: FAILED (${diffs.length} differences found)`);
    diffs.slice(0, 10).forEach((diff) => {
      log.diff(`${diff.path}: ${diff.message}`);
      log.diff(`  Original:    ${JSON.stringify(diff.original)}`);
      log.diff(`  Refactored:  ${JSON.stringify(diff.refactored)}`);
    });
    if (diffs.length > 10) {
      log.diff(`... and ${diffs.length - 10} more differences`);
    }
    log.info(`Full comparison saved to: ${outputPath}`);
    return { passed: false, diffsCount: diffs.length };
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  log.header('Math Brain Version Comparison Test');
  log.info(`Original:    ${CONFIG.originalPath}`);
  log.info(`Refactored:  ${CONFIG.refactoredPath}`);
  log.info(`Output dir:  ${CONFIG.outputDir}`);

  let testsToRun = Object.keys(TEST_PAYLOADS);

  // Parse arguments
  if (args.includes('--payload')) {
    const payloadPath = args[args.indexOf('--payload') + 1];
    if (!payloadPath) {
      log.error('--payload requires a file path');
      process.exit(2);
    }
    const customPayload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    testsToRun = [path.basename(payloadPath, '.json')];
    TEST_PAYLOADS[testsToRun[0]] = customPayload;
  } else if (!args.includes('--all')) {
    // Default: run first test only
    testsToRun = [testsToRun[0]];
  }

  // Run tests
  const results = [];
  for (const testName of testsToRun) {
    const payload = TEST_PAYLOADS[testName];
    const result = await runComparisonTest(testName, payload);
    results.push({ testName, ...result });
  }

  // Summary
  log.header('Summary');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;

  console.log(`Total:   ${results.length}`);
  console.log(`${colors.green}Passed:  ${passed}${colors.reset}`);
  if (failed > 0) console.log(`${colors.red}Failed:  ${failed}${colors.reset}`);
  if (skipped > 0) console.log(`${colors.yellow}Skipped: ${skipped}${colors.reset}`);

  // Exit with appropriate code
  if (failed > 0) {
    process.exit(1);
  } else if (passed === 0 && skipped > 0) {
    log.warn('All tests skipped (no baseline to compare against)');
    process.exit(0);
  } else {
    log.success('All tests passed!');
    process.exit(0);
  }
}

// Execute
main().catch((err) => {
  log.error('Fatal error:');
  console.error(err);
  process.exit(2);
});
