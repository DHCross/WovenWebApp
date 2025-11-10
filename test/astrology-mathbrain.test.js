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
    data: {
      transitsByDate: {
        "2024-01-01": [
          { p1_name: "Saturn", p2_name: "Sun", aspect: "square", orbit: 0.4 },
          { p1_name: "Mars", p2_name: "Moon", aspect: "opposition", orbit: 0.6 }
        ]
      }
    },
    aspects: [
      { p1_name: "Saturn", p2_name: "Sun", aspect: "square", orbit: 0.4 },
      { p1_name: "Mars", p2_name: "Moon", aspect: "opposition", orbit: 0.6 }
    ]
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
  // setupTestEnvironment(); // This mocks fetch, which we don't want for integration tests
  const runner = new TestRunner();
  const API_URL = 'http://localhost:3006/api/astrology-mathbrain';

  runner.test('Should handle transits and Seismograph for a single person', async () => {
    const payload = {
      personA: VALID_PERSON_A,
      window: VALID_TRANSIT_PARAMS,
      mode: 'NATAL_TRANSITS'
    };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    runner.assertEqual(response.status, 200);
    const body = await response.json();
    runner.assert(body.person_a?.chart?.transitsByDate, 'Should have transitsByDate');
    const dayData = Object.values(body.person_a.chart.transitsByDate)[0];
    runner.assert(dayData.seismograph, 'Daily transit should have seismograph data');
    runner.assert(body.person_a.derived.seismograph_summary, 'Should have seismograph summary');
  });

  await runner.run();
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
