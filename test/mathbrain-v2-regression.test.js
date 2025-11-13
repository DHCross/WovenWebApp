/**
 * Test suite for Math Brain v2 pipeline
 * Tests the runMathBrain function directly to catch regressions
 */
const assert = require('assert');
const { runMathBrain } = require('../src/math_brain/main.js');

console.log('🧪 Math Brain v2 Test Suite\n');

// Test 1: Basic transit report (solo)
async function testBasicTransitReport() {
  console.log('Test 1: Basic transit report (solo person)');
  
  const config = {
    schema: 'mb-1',
    mode: 'balance_meter',
    step: 'daily',
    startDate: '2025-10-11',
    endDate: '2025-10-12',
    personA: {
      name: 'Test Person',
      year: 1990,
      month: 6,
      day: 15,
      hour: 14,
      minute: 30,
      city: 'New York',
      state: 'NY',
      nation: 'US',
      latitude: 40.7128,
      longitude: -74.0060,
      timezone: 'America/New_York',
      zodiac_type: 'tropical'
    },
    reportStructure: 'solo'
  };

  const mockChartData = {
    person_a: {
      chart: {
        planets: [],
        aspects: [],
        houses: []
      },
      details: {
        name: 'Test Person',
        location: 'New York, NY'
      }
    }
  };

  try {
    const result = await runMathBrain(config, mockChartData);
    
    // Assertions
    assert(result, 'Result should not be null');
    assert(result.run_metadata, 'Result should have run_metadata');
    assert(result.provenance, 'Result should have provenance for backward compatibility');
    assert(result.balance_meter, 'Result should have balance_meter');
    assert(Array.isArray(result.transits), 'Result should have transits array');
    assert(result.transits.length === 2, `Expected 2 days, got ${result.transits.length}`);
    
    // Check each daily entry has required fields
    result.transits.forEach((day, idx) => {
      assert(day.date, `Day ${idx} should have date`);
      assert(day.symbolic_weather, `Day ${idx} should have symbolic_weather`);
      assert(day.mirror_data, `Day ${idx} should have mirror_data`);
      assert(day.poetic_hooks, `Day ${idx} should have poetic_hooks`);
    });
    
    // Check run_metadata structure
    assert(result.run_metadata.generated_at, 'run_metadata should have generated_at');
    assert(result.run_metadata.mode === 'balance_meter', 'run_metadata mode should match');
    assert(result.run_metadata.person_a === 'Test Person', 'run_metadata should have person_a name');
    assert(result.run_metadata.person_b === null, 'run_metadata should have null person_b for solo');
    
    console.log('✅ Test 1 passed\n');
    return true;
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Test 2: Foundation report (no transits)
async function testFoundationReport() {
  console.log('Test 2: Foundation report (no transit dates)');
  
  const config = {
    schema: 'mb-1',
    mode: 'natal',
    personA: {
      name: 'Test Person',
      year: 1990,
      month: 6,
      day: 15,
      hour: 14,
      minute: 30,
      city: 'New York',
      state: 'NY',
      nation: 'US',
      latitude: 40.7128,
      longitude: -74.0060,
      timezone: 'America/New_York',
      zodiac_type: 'tropical'
    },
    reportStructure: 'solo'
  };

  const mockChartData = {
    person_a: {
      chart: {
        aspects: [
          { p1_name: 'Sun', p2_name: 'Moon', aspect: 'trine', orbit: 2.5 }
        ]
      }
    }
  };

  try {
    const result = await runMathBrain(config, mockChartData);
    
    // Assertions
    assert(result, 'Result should not be null');
    assert(result.run_metadata, 'Result should have run_metadata');
    assert(result.foundation_blueprint, 'Result should have foundation_blueprint');
    assert(!result.transits, 'Foundation report should not have transits');
    
    console.log('✅ Test 2 passed\n');
    return true;
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Test 3: Relationship context handling
async function testRelationshipContext() {
  console.log('Test 3: Relationship context handling');
  
  const config = {
    schema: 'mb-1',
    mode: 'balance_meter',
    step: 'daily',
    startDate: '2025-10-11',
    endDate: '2025-10-11',
    personA: {
      name: 'Person A',
      year: 1990,
      month: 6,
      day: 15,
      hour: 14,
      minute: 30,
      city: 'New York',
      state: 'NY',
      nation: 'US',
      latitude: 40.7128,
      longitude: -74.0060,
      timezone: 'America/New_York',
      zodiac_type: 'tropical'
    },
    personB: {
      name: 'Person B',
      year: 1985,
      month: 3,
      day: 20,
      hour: 10,
      minute: 15,
      city: 'Los Angeles',
      state: 'CA',
      nation: 'US',
      latitude: 34.0522,
      longitude: -118.2437,
      timezone: 'America/Los_Angeles',
      zodiac_type: 'tropical'
    },
    reportStructure: 'synastry',
    relationshipContext: {
      type: 'PARTNER',
      scope: 'PARTNER',
      contact_state: 'ACTIVE'
    }
  };

  const mockChartData = {
    person_a: {
      chart: { planets: [], aspects: [], houses: [] }
    },
    person_b: {
      chart: { planets: [], aspects: [], houses: [] }
    }
  };

  try {
    const result = await runMathBrain(config, mockChartData);
    
    // Assertions
    assert(result, 'Result should not be null');
    assert(result.run_metadata, 'Result should have run_metadata');
    assert(result.run_metadata.relationship_context, 'run_metadata should have relationship_context');
    assert(result.run_metadata.relationship_context.type === 'PARTNER', 'relationship context should be preserved');
    assert(result.relationship_context, 'Result should have top-level relationship_context');
    
    console.log('✅ Test 3 passed\n');
    return true;
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting Math Brain v2 regression tests...\n');
  
  const results = [
    await testBasicTransitReport(),
    await testFoundationReport(),
    await testRelationshipContext()
  ];
  
  const passed = results.filter(r => r).length;
  const failed = results.length - passed;
  
  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${results.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

runAllTests();
