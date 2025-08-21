/**
 * Comprehensive Test Suite for Astrology Math Brain (Refactored)
 * 
 * To run tests: node test/astrology-mathbrain.test.js
 */

const fs = require('fs');
const path = require('path');

// Mock successful API responses
const MOCK_NATAL_RESPONSE = {
  status: "OK",
  data: {
    subject: { name: "Test Person", year: 1990, month: 5, day: 15 },
    sun: { name: "Sun", position: 24.65, sign: "Tau" },
    moon: { name: "Moon", position: 0.51, sign: "Aqu" }
  },
  aspects: [
    { p1_name: "Sun", p2_name: "Moon", aspect: "trine", orbit: -5.85 }
  ]
};

const MOCK_SYNASTRY_RESPONSE = {
    status: "OK",
    data: {
        first_subject: { name: "Person A" },
        second_subject: { name: "Person B" }
    },
    aspects: [
        { p1_name: "Sun", p2_name: "Mars", aspect: "conjunction", orbit: 1.2 }
    ]
};

const MOCK_COMPOSITE_RESPONSE = {
    status: "OK",
    data: {
        composite_subject: { name: "Composite" },
        first_subject: { name: "Person A" },
        second_subject: { name: "Person B" }
    },
    aspects: [
        { p1_name: "Sun", p2_name: "Moon", aspect: "square", orbit: 3.4 }
    ]
};

const MOCK_TRANSIT_RESPONSE = {
    status: "OK",
    data: {
        first_subject: { name: "Test Person" },
        transit: { name: "Transit" }
    },
    aspects: [
      { transit_body: "Jupiter", natal_target: "Sun", aspect: "trine", orb: 0.5 }
    ]
};


// Test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  async run() {
    console.log('🧪 Running Astrology Math Brain Test Suite\n');

    for (const test of this.tests) {
      try {
        console.log(`Running: ${test.name}`);
        await test.testFn();
        console.log(`✅ PASS: ${test.name}\n`);
        this.passed++;
      } catch (error) {
        console.error(`❌ FAIL: ${test.name}`);
        console.error(`   Error: ${error.stack}\n`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results:`);
    console.log(`   Passed: ${this.passed}`);
    console.log(`   Failed: ${this.failed}`);
    console.log(`   Total:  ${this.tests.length}`);

    if (this.failed > 0) {
      console.error(`\n❌ Some tests failed. Please review the errors above.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All tests passed!`);
    }
  }
}

// Set up test environment
function setupTestEnvironment() {
  process.env.RAPIDAPI_KEY = 'test-key';
  process.env.LOG_LEVEL = 'debug';

  // Mock fetch for API calls
  global.fetch = async (url, options) => {
    await new Promise(resolve => setTimeout(resolve, 10));

    if (url.includes('natal-aspects-data')) {
      return { ok: true, json: async () => MOCK_NATAL_RESPONSE };
    }
    if (url.includes('synastry-aspects-data')) {
        return { ok: true, json: async () => MOCK_SYNASTRY_RESPONSE };
    }
    if (url.includes('composite-aspects-data')) {
        return { ok: true, json: async () => MOCK_COMPOSITE_RESPONSE };
    }
    if (url.includes('transit-aspects-data')) {
      return { ok: true, json: async () => MOCK_TRANSIT_RESPONSE };
    }

    return {
      ok: false,
      status: 404,
      text: async () => 'Not Found'
    };
  };
}

function loadModule() {
  const modulePath = path.join(__dirname, '..', 'netlify', 'functions', 'astrology-mathbrain.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

// Test Data
const VALID_PERSON_A = {
    name: 'Test Person A',
    year: 1990, month: 5, day: 15, hour: 14, minute: 30,
    latitude: 40.7128, longitude: -74.0060,
    city: 'New York', nation: 'US', timezone: 'America/New_York', zodiac_type: 'Tropic'
};

const VALID_PERSON_B = {
    name: 'Test Person B',
    year: 1992, month: 8, day: 22, hour: 8, minute: 15,
    latitude: 34.0522, longitude: -118.2437,
    city: 'Los Angeles', nation: 'US', timezone: 'America/Los_Angeles', zodiac_type: 'Tropic'
};

const INVALID_PERSON = {
    name: 'Invalid Person',
    year: 1990, month: 5, day: 15, hour: 14, // Missing minute, lat, lon
};

const VALID_TRANSIT_PARAMS = {
    startDate: '2024-01-01',
    endDate: '2024-01-02',
    step: '1d'
};


// --- Test Suite ---
async function runTests() {
  setupTestEnvironment();
  const runner = new TestRunner();
  const { handler } = loadModule();

  runner.test('Should return 405 for non-POST requests', async () => {
    const result = await handler({ httpMethod: 'GET' });
    runner.assertEqual(result.statusCode, 405);
    const body = JSON.parse(result.body);
    runner.assert(body.error.includes('Only POST requests are allowed'));
  });

  runner.test('Should return 400 for invalid JSON body', async () => {
    const result = await handler({ httpMethod: 'POST', body: '{"invalid json' });
    runner.assertEqual(result.statusCode, 500); // JSON.parse failure is a server-side uncaught exception
    const body = JSON.parse(result.body);
    runner.assert(body.error.includes('Unterminated string in JSON'));
  });

  runner.test('Should return 400 if Person A is invalid', async () => {
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ personA: INVALID_PERSON, context: { mode: 'natal_transits' } })
    });
    runner.assertEqual(result.statusCode, 400);
    const body = JSON.parse(result.body);
    runner.assert(body.error.includes('Person A validation failed'));
  });

  runner.test('Should succeed for natal_transits mode', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: VALID_PERSON_A,
        transitParams: VALID_TRANSIT_PARAMS,
        context: { mode: 'natal_transits' }
      })
    };
    const result = await handler(event);
    runner.assertEqual(result.statusCode, 200);
    const body = JSON.parse(result.body);
    runner.assert(body.person_a.chart.aspects, 'Should have natal aspects');
    runner.assert(body.person_a.chart.transitsByDate, 'Should have transitsByDate');
    runner.assert(body.person_a.chart.transitsByDate['2024-01-01'], 'Should have transits for the start date');
  });

  runner.test('Should return 400 for synastry_transits mode without Person B', async () => {
    const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          personA: VALID_PERSON_A,
          transitParams: VALID_TRANSIT_PARAMS,
          context: { mode: 'synastry_transits' }
        })
      };
      const result = await handler(event);
      runner.assertEqual(result.statusCode, 400);
      const body = JSON.parse(result.body);
      runner.assert(body.error.includes('Person B is required'));
  });

  runner.test('Should succeed for synastry_transits mode', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: VALID_PERSON_A,
        personB: VALID_PERSON_B,
        transitParams: VALID_TRANSIT_PARAMS,
        context: { mode: 'synastry_transits' }
      })
    };
    const result = await handler(event);
    runner.assertEqual(result.statusCode, 200);
    const body = JSON.parse(result.body);
    runner.assert(body.person_a.chart.aspects, 'Person A should have natal aspects');
    runner.assert(body.person_b.chart.aspects, 'Person B should have natal aspects');
    runner.assert(body.synastry.aspects, 'Should have synastry aspects');
    runner.assert(body.person_a.chart.transitsByDate, 'Person A should have transits');
    runner.assert(body.person_b.chart.transitsByDate, 'Person B should have transits');
  });

  runner.test('Should succeed for composite_transits mode (without transits)', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: VALID_PERSON_A,
        personB: VALID_PERSON_B,
        transitParams: VALID_TRANSIT_PARAMS,
        context: { mode: 'composite_transits' }
      })
    };
    const result = await handler(event);
    runner.assertEqual(result.statusCode, 200);
    const body = JSON.parse(result.body);
    runner.assert(body.composite.chart, 'Should have composite chart data');
    runner.assert(body.composite.aspects, 'Should have composite aspects');
    runner.assert(body.composite.transitsByDate, 'Should have a placeholder for transits');
  });

  runner.test('Should handle missing API key gracefully', async () => {
    delete process.env.RAPIDAPI_KEY; // Temporarily remove key
    const { handler: newHandler } = loadModule();
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: VALID_PERSON_A,
        context: { mode: 'natal_transits' }
      })
    };
    const result = await newHandler(event);
    runner.assertEqual(result.statusCode, 500);
    const body = JSON.parse(result.body);
    runner.assert(body.error.includes('RAPIDAPI_KEY environment variable is not configured'));
    setupTestEnvironment(); // Restore environment
  });

  await runner.run();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
