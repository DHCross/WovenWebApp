#!/usr/bin/env node
/**
 * Regression Smoke Test (1 minute)
 * 
 * Quick check to verify amplitude restoration is intact.
 * Run this before committing changes to seismograph, amplifiers, or scale logic.
 * 
 * Usage:
 *   npm run dev & sleep 5
 *   node scripts/smoke-golden-case.js
 * 
 * Expected:
 *   ✅ 2018-10-10: Mag 5.0 (clamped), Bias -5.0 (clamped)
 *   ✅ Current date: Mag ~3-4, Bias mild, no clamps
 */

const http = require('http');

const GOLDEN_DATE = '2018-10-10';
const PORT = 3001;
const HOST = 'localhost';

console.log('\n🔬 Regression Smoke Test: Golden Case\n');

function testDate(date, label, expectations) {
  return new Promise((resolve, reject) => {
    const payload = {
      mode: 'balance_meter',
      personA: {
        name: 'Dan',
        year: 1973,
        month: 7,
        day: 24,
        hour: 14,
        minute: 30,
        latitude: 40.0167,
        longitude: -75.3,
        timezone: 'America/New_York',
        city: 'Bryn Mawr',
        nation: 'US',
        zodiac_type: 'Tropic'
      },
      window: {
        start: date,
        end: date,
        step: 'daily'
      },
      relocation_mode: 'A_local',
      translocation: {
        applies: true,
        method: 'A_local',
        current_location: {
          latitude: 30.166667,
          longitude: -85.666667,
          timezone: 'America/Chicago',
          label: 'Panama City, FL'
        }
      },
      indices: {
        window: {
          start: date,
          end: date,
          step: 'daily'
        },
        request_daily: true
      },
      frontstage_policy: {
        autogenerate: true,
        allow_symbolic_weather: true
      }
    };

    const data = JSON.stringify(payload);
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/api/astrology-mathbrain',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    console.log(`Testing ${label} (${date})...`);

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          const summary = result?.person_a?.summary || result?.summary || {};
          const transitsByDate = result?.person_a?.chart?.transitsByDate || {};
          const dayData = transitsByDate[date];

          const magnitude = summary.magnitude ?? dayData?.seismograph?.magnitude;
          const bias = summary.bias_signed ?? summary.valence ?? dayData?.seismograph?.bias_signed;

          console.log(`  Magnitude: ${magnitude}`);
          console.log(`  Bias: ${bias}`);

          let passed = true;
          const errors = [];

          if (expectations.minMag && magnitude < expectations.minMag) {
            passed = false;
            errors.push(`Magnitude ${magnitude} < expected ${expectations.minMag}`);
          }

          if (expectations.maxMag && magnitude > expectations.maxMag) {
            passed = false;
            errors.push(`Magnitude ${magnitude} > expected ${expectations.maxMag}`);
          }

          if (expectations.minBias && bias < expectations.minBias) {
            passed = false;
            errors.push(`Bias ${bias} < expected ${expectations.minBias}`);
          }

          if (expectations.maxBias && bias > expectations.maxBias) {
            passed = false;
            errors.push(`Bias ${bias} > expected ${expectations.maxBias}`);
          }

          if (passed) {
            console.log(`  ✅ ${label} PASS\n`);
            resolve({ date, label, magnitude, bias, passed: true });
          } else {
            console.log(`  ❌ ${label} FAIL:`);
            errors.forEach(err => console.log(`     ${err}`));
            console.log('');
            resolve({ date, label, magnitude, bias, passed: false, errors });
          }

        } catch (err) {
          console.log(`  ❌ ${label} ERROR: ${err.message}\n`);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`  ❌ ${label} CONNECTION ERROR: ${err.message}\n`);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

async function runSmokeTest() {
  console.log('Expected Results:');
  console.log('  • Golden Case (2018-10-10): Mag ≥4.5, Bias ≤-4.0');
  console.log('  • Current Date: Mag 3-4, Bias mild\n');

  try {
    // Test golden case
    const goldenResult = await testDate(
      GOLDEN_DATE,
      'Golden Case (Hurricane Michael)',
      { minMag: 4.5, maxBias: -4.0 }
    );

    // Test current date
    const today = new Date().toISOString().split('T')[0];
    const currentResult = await testDate(
      today,
      'Current Date',
      { minMag: 0, maxMag: 5, minBias: -5, maxBias: 5 }
    );

    console.log('═══════════════════════════════════════');
    console.log('📊 SMOKE TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Golden Case: ${goldenResult.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Current Date: ${currentResult.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('═══════════════════════════════════════\n');

    if (!goldenResult.passed) {
      console.error('⚠️  REGRESSION DETECTED: Golden case failed!');
      console.error('   This indicates amplitude has been flattened.');
      console.error('   Check: BIAS_DIVISOR, pipeline order, geometry amplification\n');
      process.exit(1);
    }

    if (!currentResult.passed) {
      console.warn('⚠️  WARNING: Current date produced unexpected values.');
      console.warn('   This may be expected depending on transits.\n');
    }

    console.log('✨ Smoke test complete. Amplitude restoration intact.\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ SMOKE TEST FAILED:', err.message);
    console.error('\n💡 Make sure the dev server is running:');
    console.error('   npm run dev\n');
    process.exit(1);
  }
}

runSmokeTest();
