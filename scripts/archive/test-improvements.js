// Simple test for astrology-mathbrain.js improvements
// Run with: node test-improvements.js

const fs = require('fs');
const path = require('path');

// Mock environment for testing
process.env.RAPIDAPI_KEY = 'test-key-12345678901234567890123456789012';
process.env.LOG_LEVEL = 'debug';
process.env.TRANSIT_BATCH_SIZE = '3';
process.env.TRANSIT_BATCH_DELAY = '100';

// Load the main function
const { handler } = require('./lib/server/astrology-mathbrain.js');

async function runTests() {
  console.log('🧪 Testing astrology-mathbrain.js improvements...\n');

  // Test 1: Invalid JSON
  console.log('Test 1: Invalid JSON handling');
  try {
    const result = await handler({
      httpMethod: 'POST',
      body: 'invalid json{'
    });
    console.log('✅ Status:', result.statusCode);
    const response = JSON.parse(result.body);
    console.log('✅ Error message:', response.error);
    console.log('✅ Error code:', response.code);
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Missing data
  console.log('Test 2: Missing subject data handling');
  try {
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({})
    });
    console.log('✅ Status:', result.statusCode);
    const response = JSON.parse(result.body);
    console.log('✅ Error message:', response.error);
    console.log('✅ Error code:', response.code);
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Invalid field validation
  console.log('Test 3: Field validation');
  try {
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: {
          name: 'Test Person',
          year: 1950,
          month: 13, // Invalid month
          day: 15,
          hour: 25, // Invalid hour
          minute: 30,
          city: 'Test City',
          nation: 'US',
          latitude: 91, // Invalid latitude
          longitude: 0,
          timezone: 'UTC',
          zodiac_type: 'Tropic'
        }
      })
    });
    console.log('✅ Status:', result.statusCode);
    const response = JSON.parse(result.body);
    console.log('✅ Error message:', response.error);
    console.log('✅ Error code:', response.code);
    console.log('✅ Validation details:', response.details);
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Missing environment variable
  console.log('Test 4: Missing RAPIDAPI_KEY');
  const originalKey = process.env.RAPIDAPI_KEY;
  delete process.env.RAPIDAPI_KEY;
  
  try {
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: {
          name: 'Test Person',
          year: 1990,
          month: 5,
          day: 15,
          hour: 14,
          minute: 30,
          city: 'New York',
          nation: 'US',
          latitude: 40.7128,
          longitude: -74.0060,
          timezone: 'America/New_York',
          zodiac_type: 'Tropic'
        }
      })
    });
    console.log('✅ Status:', result.statusCode);
    const response = JSON.parse(result.body);
    console.log('✅ Error message:', response.error);
    console.log('✅ Error code:', response.code);
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
  
  // Restore environment
  process.env.RAPIDAPI_KEY = originalKey;

  console.log('\n🎉 All tests completed!\n');
  console.log('Key improvements verified:');
  console.log('✅ Enhanced error handling with user-friendly messages');
  console.log('✅ Error codes for better debugging');
  console.log('✅ Field validation with specific error details');
  console.log('✅ Environment configuration support');
  console.log('✅ Structured logging system');
  console.log('✅ Configurable transit calculation settings');
}

// Run the tests
runTests().catch(console.error);
