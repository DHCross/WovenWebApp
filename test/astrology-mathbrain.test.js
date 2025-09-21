/**
 * Comprehensive Test Suite for the final merged Astrology Math Brain
 * 
 * To run tests: node test/astrology-mathbrain.test.js
 */

const fs = require('fs');
const path = require('path');

// Mock successful API responses
const MOCK_NATAL_RESPONSE = {
  status: "OK",
  data: { subject: { name: "Test Person" }, aspects: [{ p1_name: "Sun", p2_name: "Moon", aspect: "trine" }] }
};

const MOCK_SYNASTRY_RESPONSE = {
    status: "OK",
    data: { first_subject: { name: "Person A" }, second_subject: { name: "Person B" } },
    aspects: [{ p1_name: "Sun", p2_name: "Mars", aspect: "conjunction" }]
};

const MOCK_COMPOSITE_RESPONSE = {
    status: "OK",
    data: {
        composite_subject: { name: "Composite" },
        aspects: [{ p1_name: "Sun", p2_name: "Moon", aspect: "square" }]
    }
};

const MOCK_TRANSIT_RESPONSE = {
    status: "OK",
    data: { transitsByDate: { "2024-01-01": [{ p1_name: "Jupiter", p2_name: "Sun", aspect: "trine", orbit: 0.5 }] } },
    aspects: [{ p1_name: "Jupiter", p2_name: "Sun", aspect: "trine", orbit: 0.5 }]
};

// Test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) { this.tests.push({ name, testFn }); }
  assert(condition, message) { if (!condition) throw new Error(message || 'Assertion failed'); }
  assertEqual(actual, expected, message) { if (actual !== expected) throw new Error(message || `Expected ${expected}, got ${actual}`); }

  async run() {
    console.log('🧪 Running Final Woven Map Test Suite\n');
    for (const { name, testFn } of this.tests) {
      try {
        console.log(`Running: ${name}`);
        await testFn();
        console.log(`✅ PASS: ${name}\n`);
        this.passed++;
      } catch (error) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Error: ${error.stack}\n`);
        this.failed++;
      }
    }
    console.log(`\n📊 Test Results: Passed: ${this.passed}, Failed: ${this.failed}, Total: ${this.tests.length}`);
    if (this.failed > 0) {
      console.error(`\n❌ Some tests failed.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All tests passed!`);
    }
  }
}

function setupTestEnvironment() {
  process.env.RAPIDAPI_KEY = 'test-key';
  process.env.LOG_LEVEL = 'debug';

  global.fetch = async (url, options) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    if (url.includes('natal-aspects-data') || url.includes('birth-chart')) {
      return { ok: true, json: async () => MOCK_NATAL_RESPONSE };
    }
    if (url.includes('synastry-aspects-data') || url.includes('synastry-chart')) {
        return { ok: true, json: async () => MOCK_SYNASTRY_RESPONSE };
    }
    if (url.includes('composite-aspects-data')) {
        return { ok: true, json: async () => ({ data: MOCK_COMPOSITE_RESPONSE.data }) };
    }
    if (url.includes('transit-aspects-data')) {
      return { ok: true, json: async () => MOCK_TRANSIT_RESPONSE };
    }
    return { ok: false, status: 404, text: async () => 'Not Found' };
  };
}

function loadModule() {
  const modulePath = path.join(__dirname, '..', 'lib', 'server', 'astrology-mathbrain.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

const VALID_PERSON_A = {
    name: 'Test Person A', year: 1990, month: 5, day: 15, hour: 14, minute: 30,
    latitude: 40.7128, longitude: -74.0060, city: 'New York', nation: 'US',
    timezone: 'America/New_York', zodiac_type: 'Tropic'
};
const VALID_PERSON_B = {
    name: 'Test Person B', year: 1992, month: 8, day: 22, hour: 8, minute: 15,
    latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles', nation: 'US',
    timezone: 'America/Los_Angeles', zodiac_type: 'Tropic'
};
const INVALID_PERSON = { name: 'Invalid' }; // Missing most fields
const VALID_TRANSIT_PARAMS = { startDate: '2024-01-01', endDate: '2024-01-01' };


async function runTests() {
  setupTestEnvironment();
  const runner = new TestRunner();
  const { handler } = loadModule();

  runner.test('Should return 405 for non-POST requests', async () => {
    const result = await handler({ httpMethod: 'GET' });
    runner.assertEqual(result.statusCode, 405);
  });

  runner.test('Should return 400 if Person A is invalid', async () => {
    const result = await handler({ httpMethod: 'POST', body: JSON.stringify({ personA: INVALID_PERSON }) });
    runner.assertEqual(result.statusCode, 400);
    runner.assert(JSON.parse(result.body).error.includes('Primary subject validation failed'));
  });

  runner.test('Should handle natal chart mode', async () => {
      const event = { httpMethod: 'POST', body: JSON.stringify({ personA: VALID_PERSON_A, context: { mode: 'BIRTH_CHART' } }) };
      const result = await handler(event);
      runner.assertEqual(result.statusCode, 200);
      const body = JSON.parse(result.body);
      runner.assert(body.person_a.chart.aspects, 'Should have natal aspects');
  });

  runner.test('Should handle transits and Seismograph for a single person', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({ personA: VALID_PERSON_A, transitParams: VALID_TRANSIT_PARAMS, context: { mode: 'NATAL_TRANSITS' } }) };
    const result = await handler(event);
    runner.assertEqual(result.statusCode, 200);
    const body = JSON.parse(result.body);
    runner.assert(body.person_a.chart.transitsByDate, 'Should have transitsByDate');
    runner.assert(body.person_a.chart.transitsByDate['2024-01-01'].seismograph, 'Daily transit should have seismograph data');
    runner.assert(body.person_a.derived.seismograph_summary, 'Should have seismograph summary');
  });

  runner.test('Should handle synastry mode', async () => {
      const event = { httpMethod: 'POST', body: JSON.stringify({
        personA: VALID_PERSON_A,
        personB: VALID_PERSON_B,
        context: { mode: 'SYNASTRY' },
        // Relationship context required by handler after recent merge
        relationship_context: { type: 'FRIEND', role: 'Acquaintance' }
      }) };
      const result = await handler(event);
      runner.assertEqual(result.statusCode, 200);
      const body = JSON.parse(result.body);
      runner.assert(Array.isArray(body.synastry_aspects), 'Should have synastry aspects');
  });

  runner.test('Should handle synastry with transits and Seismograph for BOTH people', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({
      personA: VALID_PERSON_A,
      personB: VALID_PERSON_B,
      transitParams: VALID_TRANSIT_PARAMS,
      context: { mode: 'SYNASTRY_TRANSITS' },
      relationship_context: { type: 'FRIEND', role: 'Acquaintance' }
    }) };
    const result = await handler(event);
    const body = JSON.parse(result.body);

    runner.assertEqual(result.statusCode, 200);
    runner.assert(body.person_a.chart.transitsByDate, 'Person A should have transits');
    runner.assert(body.person_b.chart.transitsByDate, 'Person B should have transits');
    runner.assert(Array.isArray(body.synastry_aspects), 'Should have synastry aspects');
    runner.assert(body.person_a.derived.seismograph_summary, 'Person A should have seismograph summary');
    runner.assert(body.person_b.derived.seismograph_summary, 'Person B should have seismograph summary');
  });

  runner.test('Should handle composite with transits and Seismograph', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({
      personA: VALID_PERSON_A,
      personB: VALID_PERSON_B,
      transitParams: VALID_TRANSIT_PARAMS,
      context: { mode: 'COMPOSITE_TRANSITS' },
      relationship_context: { type: 'PARTNER', intimacy_tier: 'P3' }
    }) };
    const result = await handler(event);
    runner.assertEqual(result.statusCode, 200);
    const body = JSON.parse(result.body);
    runner.assert(body.composite.aspects, 'Should have composite aspects');
    runner.assert(body.composite.transitsByDate, 'Should have composite transits');
    runner.assert(body.composite.transitsByDate['2024-01-01'].seismograph, 'Should have composite seismograph data');
    runner.assert(body.composite.derived.seismograph_summary, 'Composite should have seismograph summary');
  });

  // Composite transits (explicit) – additional coverage
  runner.test('Composite transits - explicit COMPOSITE_TRANSITS mode', async () => {
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: VALID_PERSON_A,
        personB: VALID_PERSON_B,
        context: { mode: 'COMPOSITE_TRANSITS' },
        relationship_context: { type: 'PARTNER', intimacy_tier: 'P3' },
        transitParams: { startDate: '2024-12-01', endDate: '2024-12-02' }
      })
    });

    runner.assertEqual(result.statusCode, 200, 'Should return 200 for composite transits');
    const response = JSON.parse(result.body);
    runner.assert(response.composite, 'Should include composite data');
    runner.assert(response.composite.transitsByDate, 'Should include transitsByDate');
    runner.assert(response.composite.derived, 'Should include derived seismograph data');
    runner.assert(response.composite.derived.seismograph_summary, 'Should include seismograph summary');
  });

  // Time policy tests for unknown birth time handling
  runner.test('Time policy: planetary_only suppresses houses when birth time unknown', async () => {
    const { handler } = loadModule();
    const A = { ...VALID_PERSON_A };
    delete A.hour; delete A.minute; // simulate unknown birth time
    const event = { httpMethod: 'POST', body: JSON.stringify({
      personA: A,
      context: { mode: 'NATAL_ASPECTS' }, // lean validation to allow missing time
      time_policy: 'planetary_only',
      transitParams: { startDate: '2024-01-01', endDate: '2024-01-01' }
    }) };
    const res = await handler(event);
    runner.assertEqual(res.statusCode, 200, 'Response should be 200');
    const body = JSON.parse(res.body);
    runner.assert(body.person_a, 'person_a present');
    runner.assert(body.person_a.meta, 'meta present');
    runner.assertEqual(body.person_a.meta.time_precision, 'unknown', 'time_precision should be unknown');
    runner.assert(body.person_a.houses_suppressed === true, 'houses should be suppressed under planetary_only');
  });

  runner.test('Time policy: whole_sign allows houses with noon_fallback when birth time unknown', async () => {
    const { handler } = loadModule();
    const A = { ...VALID_PERSON_A };
    delete A.hour; delete A.minute; // simulate unknown birth time
    const event = { httpMethod: 'POST', body: JSON.stringify({
      personA: A,
      context: { mode: 'NATAL_ASPECTS' }, // lean validation to allow missing time
      time_policy: 'whole_sign',
      transitParams: { startDate: '2024-01-01', endDate: '2024-01-01' }
    }) };
    const res = await handler(event);
    runner.assertEqual(res.statusCode, 200, 'Response should be 200');
    const body = JSON.parse(res.body);
    runner.assert(body.person_a, 'person_a present');
    runner.assert(body.person_a.meta, 'meta present');
    runner.assertEqual(body.person_a.meta.time_precision, 'noon_fallback', 'time_precision should be noon_fallback');
    runner.assertEqual(body.person_a.meta.effective_time_used, '12:00', 'effective_time_used should be 12:00');
    runner.assert(body.person_a.houses_suppressed !== true, 'houses should not be suppressed under whole_sign');
  });

  runner.test('Translocation tz null when relocation not applied', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: VALID_PERSON_A,
        context: { mode: 'NATAL_ASPECTS' },
        translocation: {
          applies: false,
          method: 'Custom',
          tz: 'US/Central',
          coords: { latitude: 41.8781, longitude: -87.6298 }
        }
      })
    };
    const res = await handler(event);
    runner.assertEqual(res.statusCode, 200, 'Response should be 200');
    const body = JSON.parse(res.body);
    runner.assert(body.provenance, 'provenance present');
    runner.assertEqual(body.provenance.tz_authority, 'natal_record', 'tz_authority should stay natal when relocation is off');
    runner.assert(body.provenance.relocation_applied === false, 'relocation_applied should be false');
    runner.assert(body.context.translocation, 'translocation context present');
    runner.assert(body.context.translocation.tz === null, 'translocation tz should be null when relocation not applied');
    runner.assert(body.provenance.tz_conflict === false, 'tz_conflict should be false');
    runner.assert(body.provenance.geometry_ready === true, 'geometry should stay ready');
    runner.assertEqual(body.provenance.timezone, 'America/New_York', 'provenance timezone should remain natal');
    runner.assert(body.context.translocation.requested_tz === 'America/Chicago', 'requested tz should be normalized');
  });

  runner.test('Relocation applied aligns tz authority and provenance tz', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: VALID_PERSON_A,
        context: { mode: 'NATAL_ASPECTS' },
        custom_location: {
          latitude: 41.8781,
          longitude: -87.6298,
          timezone: 'US/Central'
        },
        translocation: {
          applies: true,
          method: 'Custom',
          tz: 'US/Central',
          coords: { latitude: 41.8781, longitude: -87.6298 }
        }
      })
    };
    const res = await handler(event);
    runner.assertEqual(res.statusCode, 200, 'Response should be 200');
    const body = JSON.parse(res.body);
    runner.assert(body.provenance.relocation_applied === true, 'relocation_applied should be true');
    runner.assertEqual(body.provenance.tz_authority, 'relocation_block', 'tz_authority should reflect relocation');
    runner.assert(body.context.translocation, 'translocation context present');
    runner.assert(body.context.translocation.tz, 'translocation tz should be present');
    runner.assertEqual(body.context.translocation.tz, body.provenance.timezone, 'translocation tz should match provenance');
    runner.assertEqual(body.provenance.timezone, 'America/Chicago', 'provenance timezone should use relocation tz');
    runner.assert(body.provenance.tz_conflict === false, 'tz_conflict should remain false');
    runner.assert(body.provenance.geometry_ready === true, 'geometry should remain ready');
  });

  runner.test('Mirror report rejects midpoint relocation mode', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: VALID_PERSON_A,
        context: { mode: 'mirror' },
        translocation: { applies: true, method: 'Midpoint' }
      })
    };
    const res = await handler(event);
    runner.assertEqual(res.statusCode, 400, 'should reject midpoint for mirror');
    const body = JSON.parse(res.body);
    runner.assertEqual(body.code, 'invalid_relocation_mode_for_report', 'mirror midpoint error code');
    runner.assert(body.error.includes('Midpoint relocation'), 'mirror midpoint message');
  });

  runner.test('Mirror report requires Person B for B_local relocation', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: VALID_PERSON_A,
        context: { mode: 'mirror' },
        translocation: { applies: true, method: 'B_local' }
      })
    };
    const res = await handler(event);
    runner.assertEqual(res.statusCode, 400, 'should reject B_local without Person B');
    const body = JSON.parse(res.body);
    runner.assertEqual(body.code, 'invalid_relocation_mode_for_report', 'mirror B_local error code');
  });

  runner.test('Balance report blocks midpoint without Person B', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: VALID_PERSON_A,
        context: { mode: 'balance_meter' },
        transitParams: VALID_TRANSIT_PARAMS,
        translocation: { applies: true, method: 'Midpoint' }
      })
    };
    const res = await handler(event);
    runner.assertEqual(res.statusCode, 400, 'should reject midpoint without dyad');
    const body = JSON.parse(res.body);
    runner.assertEqual(body.code, 'invalid_relocation_mode_for_report', 'balance midpoint error code');
  });

  await runner.run();
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
