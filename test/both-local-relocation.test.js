/**
 * Test for Both_local relocation mode with translocationBlock.current_location coordinates
 * Tests the fix for: "Both_local relocation requires shared coordinates" error
 * 
 * To run: node test/both-local-relocation.test.js
 */

const { handler } = require('../lib/server/astrology-mathbrain.js');

// Mock API responses
const MOCK_NATAL_RESPONSE = {
  status: "OK",
  data: {
    subject: { name: "Test Person" },
    first_house: { abs_pos: 0 }, second_house: { abs_pos: 30 }, third_house: { abs_pos: 60 },
    fourth_house: { abs_pos: 90 }, fifth_house: { abs_pos: 120 }, sixth_house: { abs_pos: 150 },
    seventh_house: { abs_pos: 180 }, eighth_house: { abs_pos: 210 }, ninth_house: { abs_pos: 240 },
    tenth_house: { abs_pos: 270 }, eleventh_house: { abs_pos: 300 }, twelfth_house: { abs_pos: 330 }
  },
  aspects: [{ p1_name: "Sun", p2_name: "Moon", aspect: "trine", orbit: 1.2 }]
};

const MOCK_SYNASTRY_RESPONSE = {
  status: "OK",
  data: { first_subject: { name: "Person A" }, second_subject: { name: "Person B" } },
  aspects: [{ p1_name: "Sun", p2_name: "Mars", aspect: "conjunction", orbit: 0.5 }]
};

const MOCK_COMPOSITE_RESPONSE = {
  status: "OK",
  data: {
    composite_subject: { name: "Composite" },
    aspects: [{ p1_name: "Sun", p2_name: "Moon", aspect: "square", orbit: 2.1 }]
  }
};

const MOCK_TRANSIT_RESPONSE = {
  status: "OK",
  data: {
    transitsByDate: {
      "2025-10-18": [
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

// Setup test environment
function setupTestEnvironment() {
  process.env.RAPIDAPI_KEY = 'test-key-both-local';
  process.env.LOG_LEVEL = 'error';

  global.fetch = async (url, options) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    if (url.includes('natal-aspects-data') || url.includes('birth-chart') || url.includes('birth-data')) {
      return { ok: true, json: async () => MOCK_NATAL_RESPONSE };
    }
    if (url.includes('synastry-aspects-data') || url.includes('synastry-chart')) {
      return { ok: true, json: async () => MOCK_SYNASTRY_RESPONSE };
    }
    if (url.includes('composite-aspects-data') || url.includes('composite-chart')) {
      return { ok: true, json: async () => MOCK_COMPOSITE_RESPONSE };
    }
    if (url.includes('transit-aspects-data') || url.includes('transit-chart')) {
      return { ok: true, json: async () => MOCK_TRANSIT_RESPONSE };
    }
    return { ok: false, status: 404, text: async () => 'Not Found' };
  };
}

async function testBothLocalWithCurrentLocation() {
  console.log('\n🧪 Test: Both_local with translocationBlock.current_location coordinates');
  
  // This is the exact request structure from the bug report
  const requestPayload = {
    mode: "SYNASTRY_TRANSITS",
    personA: {
      name: "Dan",
      year: 1973,
      month: 7,
      day: 24,
      hour: 14,
      minute: 30,
      city: "Bryn Mawr",
      state: "PA",
      latitude: 30.202741997200352,
      longitude: -85.6578987660695,
      timezone: "America/Chicago",
      zodiac_type: "Tropic",
      nation: "US"
    },
    personB: {
      name: "Stephie",
      year: 1968,
      month: 4,
      day: 16,
      hour: 18,
      minute: 37,
      city: "Albany",
      state: "GA",
      latitude: 30.202741997200352,
      longitude: -85.6578987660695,
      timezone: "America/Chicago",
      zodiac_type: "Tropic",
      nation: "US"
    },
    window: {
      start: "2025-10-18",
      end: "2025-10-18",
      step: "daily"
    },
    transitStartDate: "2025-10-18",
    transitEndDate: "2025-10-18",
    transitStep: "daily",
    report_type: "relational_balance_meter",
    relocation_mode: "BOTH_LOCAL",
    translocation: {
      applies: true,
      method: "BOTH_LOCAL",
      current_location: {
        latitude: 30.202741997200352,
        longitude: -85.6578987660695,
        timezone: "America/Chicago",
        label: "30.20°N, 85.66°W"
      }
    },
    relationship_context: {
      type: "PARTNER",
      intimacy_tier: "P2",
      contact_state: "ACTIVE"
    }
  };

  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(requestPayload)
  };

  try {
    const response = await handler(event);
    
    if (response.statusCode !== 200) {
      const body = JSON.parse(response.body);
      console.error('❌ FAIL: Expected 200, got', response.statusCode);
      console.error('   Error:', body.error || body.detail);
      console.error('   Code:', body.code);
      throw new Error(`Request failed with status ${response.statusCode}: ${body.error || body.detail}`);
    }

    const result = JSON.parse(response.body);
    
    // Verify relocation was applied
    if (!result.relocation_summary?.active) {
      console.error('❌ FAIL: Relocation was not applied');
      throw new Error('Relocation should be active for Both_local mode');
    }

    if (result.relocation_summary.mode !== 'both_local' && result.relocation_summary.mode !== 'Both_local') {
      console.error('❌ FAIL: Relocation mode mismatch');
      console.error('   Expected: both_local or Both_local');
      console.error('   Got:', result.relocation_summary.mode);
      throw new Error('Relocation mode should be both_local');
    }

    console.log('✅ PASS: Both_local relocation with current_location coordinates works');
    console.log('   Status:', response.statusCode);
    console.log('   Relocation mode:', result.relocation_summary.mode);
    console.log('   Relocation active:', result.relocation_summary.active);
    console.log('   Location label:', result.relocation_summary.label);
    
    return true;
  } catch (error) {
    console.error('❌ FAIL: Test threw error');
    console.error('   Error:', error.message);
    throw error;
  }
}

async function testBothLocalWithCoords() {
  console.log('\n🧪 Test: Both_local with translocationBlock.coords (legacy format)');
  
  const requestPayload = {
    mode: "SYNASTRY_TRANSITS",
    personA: {
      name: "Dan",
      year: 1973,
      month: 7,
      day: 24,
      hour: 14,
      minute: 30,
      city: "Bryn Mawr",
      state: "PA",
      latitude: 40.0259,
      longitude: -75.3138,
      timezone: "America/New_York",
      zodiac_type: "Tropic",
      nation: "US"
    },
    personB: {
      name: "Stephie",
      year: 1968,
      month: 4,
      day: 16,
      hour: 18,
      minute: 37,
      city: "Albany",
      state: "GA",
      latitude: 31.5785,
      longitude: -84.1557,
      timezone: "America/New_York",
      zodiac_type: "Tropic",
      nation: "US"
    },
    window: {
      start: "2025-10-18",
      end: "2025-10-18",
      step: "daily"
    },
    relocation_mode: "BOTH_LOCAL",
    translocation: {
      applies: true,
      method: "BOTH_LOCAL",
      coords: {
        latitude: 30.202741997200352,
        longitude: -85.6578987660695
      },
      tz: "America/Chicago"
    },
    relationship_context: {
      type: "PARTNER",
      intimacy_tier: "P2",
      contact_state: "ACTIVE"
    }
  };

  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(requestPayload)
  };

  try {
    const response = await handler(event);
    
    if (response.statusCode !== 200) {
      const body = JSON.parse(response.body);
      console.error('❌ FAIL: Expected 200, got', response.statusCode);
      console.error('   Error:', body.error || body.detail);
      throw new Error(`Request failed with status ${response.statusCode}`);
    }

    const result = JSON.parse(response.body);
    
    if (!result.relocation_summary?.active) {
      console.error('❌ FAIL: Relocation was not applied');
      throw new Error('Relocation should be active for Both_local mode');
    }

    console.log('✅ PASS: Both_local relocation with coords format works');
    console.log('   Status:', response.statusCode);
    console.log('   Relocation active:', result.relocation_summary.active);
    
    return true;
  } catch (error) {
    console.error('❌ FAIL: Test threw error');
    console.error('   Error:', error.message);
    throw error;
  }
}

async function testALocalWithCurrentLocation() {
  console.log('\n🧪 Test: A_local with translocationBlock.current_location coordinates');
  
  const requestPayload = {
    mode: "NATAL_TRANSITS",
    personA: {
      name: "Dan",
      year: 1973,
      month: 7,
      day: 24,
      hour: 14,
      minute: 30,
      city: "Bryn Mawr",
      state: "PA",
      latitude: 40.0259,
      longitude: -75.3138,
      timezone: "America/New_York",
      zodiac_type: "Tropic",
      nation: "US"
    },
    window: {
      start: "2025-10-18",
      end: "2025-10-18",
      step: "daily"
    },
    relocation_mode: "A_LOCAL",
    translocation: {
      applies: true,
      method: "A_LOCAL",
      current_location: {
        latitude: 30.202741997200352,
        longitude: -85.6578987660695,
        timezone: "America/Chicago",
        label: "Current Location"
      }
    }
  };

  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(requestPayload)
  };

  try {
    const response = await handler(event);
    
    if (response.statusCode !== 200) {
      const body = JSON.parse(response.body);
      console.error('❌ FAIL: Expected 200, got', response.statusCode);
      console.error('   Error:', body.error || body.detail);
      throw new Error(`Request failed with status ${response.statusCode}`);
    }

    const result = JSON.parse(response.body);
    
    if (!result.relocation_summary?.active) {
      console.error('❌ FAIL: Relocation was not applied');
      throw new Error('Relocation should be active for A_local mode');
    }

    console.log('✅ PASS: A_local relocation with current_location coordinates works');
    console.log('   Status:', response.statusCode);
    console.log('   Relocation active:', result.relocation_summary.active);
    
    return true;
  } catch (error) {
    console.error('❌ FAIL: Test threw error');
    console.error('   Error:', error.message);
    throw error;
  }
}

async function runTests() {
  setupTestEnvironment();
  
  let passed = 0;
  let failed = 0;
  
  const tests = [
    testBothLocalWithCurrentLocation,
    testBothLocalWithCoords,
    testALocalWithCurrentLocation
  ];
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed, ${tests.length} total`);
  console.log('='.repeat(60));
  
  if (failed > 0) {
    console.error('\n❌ Some tests failed.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
