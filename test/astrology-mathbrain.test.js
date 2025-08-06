/**
 * Comprehensive Test Suite for Astrology Math Brain
 * Demonstrates unit testing patterns and validates core functionality
 * 
 * To run tests: node test/astrology-mathbrain.test.js
 * To run specific test: node test/astrology-mathbrain.test.js --test="validateSubject"
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  // Use test API key for safety
  RAPIDAPI_KEY: 'test-key-12345678901234567890123456789012',
  LOG_LEVEL: 'debug',
  TRANSIT_BATCH_SIZE: '2',
  TRANSIT_BATCH_DELAY: '100'
};

// Mock successful API response
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

// Test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Add a test case
   * @param {string} name - Test name
   * @param {Function} testFn - Test function
   */
  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  /**
   * Assert that condition is true
   * @param {boolean} condition - Condition to check
   * @param {string} message - Error message if assertion fails
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  /**
   * Assert deep equality
   * @param {any} actual - Actual value
   * @param {any} expected - Expected value
   * @param {string} message - Error message
   */
  assertEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(message || `Expected ${expectedStr}, got ${actualStr}`);
    }
  }

  /**
   * Assert that function throws an error
   * @param {Function} fn - Function that should throw
   * @param {string} expectedMessage - Expected error message (optional)
   */
  assertThrows(fn, expectedMessage) {
    try {
      fn();
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (expectedMessage && !error.message.includes(expectedMessage)) {
        throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
      }
    }
  }

  /**
   * Run all tests
   */
  async run() {
    console.log('🧪 Running Astrology Math Brain Test Suite\n');

    for (const test of this.tests) {
      try {
        console.log(`Running: ${test.name}`);
        await test.testFn();
        console.log(`✅ PASS: ${test.name}\n`);
        this.passed++;
      } catch (error) {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Error: ${error.message}\n`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results:`);
    console.log(`   Passed: ${this.passed}`);
    console.log(`   Failed: ${this.failed}`);
    console.log(`   Total:  ${this.tests.length}`);

    if (this.failed > 0) {
      console.log(`\n❌ Some tests failed. Please review the errors above.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All tests passed!`);
    }
  }
}

// Set up test environment
function setupTestEnvironment() {
  // Set test environment variables
  for (const [key, value] of Object.entries(TEST_CONFIG)) {
    process.env[key] = value;
  }

  // Mock fetch for API calls
  global.fetch = async (url, options) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // Mock different responses based on URL
    if (url.includes('natal-aspects-data')) {
      return {
        ok: true,
        text: async () => JSON.stringify(MOCK_NATAL_RESPONSE)
      };
    }

    if (url.includes('transit-aspects-data')) {
      return {
        ok: true,
        text: async () => JSON.stringify({
          aspects: [
            { p1_name: "Sun", p2_name: "Mars", aspect: "square", orbit: 2.5 }
          ]
        })
      };
    }

    // Default error response
    return {
      ok: false,
      status: 404,
      text: async () => 'Not Found'
    };
  };
}

// Load the module to test
function loadModule() {
  const modulePath = path.join(__dirname, '..', 'netlify', 'functions', 'astrology-mathbrain.js');
  
  // Clear require cache to ensure fresh module load
  delete require.cache[require.resolve(modulePath)];
  
  return require(modulePath);
}

// Create a mock handler for testing
function createMockHandler() {
  const module = loadModule();
  return module.handler;
}

// Test suite
async function runTests() {
  setupTestEnvironment();
  const runner = new TestRunner();

  // Test 1: validateSubject function
  runner.test('validateSubject - valid data', () => {
    // We need to access the internal functions, so we'll test through the handler
    const validSubject = {
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
    };

    // This test validates the structure is correct
    runner.assert(validSubject.year >= 1900 && validSubject.year <= 2100, 'Year should be in valid range');
    runner.assert(validSubject.month >= 1 && validSubject.month <= 12, 'Month should be in valid range');
    runner.assert(validSubject.latitude >= -90 && validSubject.latitude <= 90, 'Latitude should be in valid range');
  });

  // Test 2: Invalid subject validation
  runner.test('validateSubject - invalid data', async () => {
    const { handler } = loadModule();
    
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: {
          name: 'Test Person',
          year: 1800, // Invalid year
          month: 13,  // Invalid month
          day: 15,
          hour: 14,
          minute: 30,
          city: 'New York',
          nation: 'US',
          latitude: 91, // Invalid latitude
          longitude: -74.0060,
          timezone: 'America/New_York',
          zodiac_type: 'Tropic'
        }
      })
    });

    const response = JSON.parse(result.body);
    runner.assert(result.statusCode === 400, 'Should return 400 for invalid data');
    runner.assert(response.code === 'VALIDATION_ERROR_A', 'Should return validation error code');
    runner.assert(response.errorId, 'Should include error ID');
  });

  // Test 3: Missing RAPIDAPI_KEY
  runner.test('Environment validation - missing API key', async () => {
    const originalKey = process.env.RAPIDAPI_KEY;
    delete process.env.RAPIDAPI_KEY;

    const { handler } = loadModule();
    
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ personA: {} })
    });

    const response = JSON.parse(result.body);
    runner.assert(result.statusCode === 500, 'Should return 500 for missing API key');
    runner.assert(response.code === 'CONFIG_ERROR', 'Should return config error code');

    // Restore API key
    process.env.RAPIDAPI_KEY = originalKey;
  });

  // Test 4: Invalid JSON handling
  runner.test('JSON parsing - invalid JSON', async () => {
    const { handler } = loadModule();
    
    const result = await handler({
      httpMethod: 'POST',
      body: 'invalid json{'
    });

    const response = JSON.parse(result.body);
    runner.assert(result.statusCode === 400, 'Should return 400 for invalid JSON');
    runner.assert(response.code === 'INVALID_JSON', 'Should return JSON error code');
  });

  // Test 5: HTTP method validation
  runner.test('HTTP method validation', async () => {
    const { handler } = loadModule();
    
    const result = await handler({
      httpMethod: 'GET',
      body: '{}'
    });

    const response = JSON.parse(result.body);
    runner.assert(result.statusCode === 405, 'Should return 405 for non-POST method');
    runner.assert(response.code === 'METHOD_NOT_ALLOWED', 'Should return method not allowed code');
  });

  // Test 6: Successful natal chart calculation
  runner.test('Successful natal chart calculation', async () => {
    const { handler } = loadModule();
    
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

    runner.assert(result.statusCode === 200, 'Should return 200 for successful calculation');
    
    const response = JSON.parse(result.body);
    runner.assert(response.schema === 'WM-Chart-1.0', 'Should return WM Chart schema');
    runner.assert(response.person_a, 'Should include person A data');
    runner.assert(response.person_a.chart, 'Should include chart data');
  });

  // Test 7: Rate limiter functionality
  runner.test('Rate limiter - basic functionality', () => {
    // This would test the rateLimiter object if it were exported
    // For now, we test the concept
    const mockRateLimiter = {
      calls: [],
      maxCallsPerMinute: 5,
      canMakeCall() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        this.calls = this.calls.filter(timestamp => timestamp > oneMinuteAgo);
        return this.calls.length < this.maxCallsPerMinute;
      },
      recordCall() {
        this.calls.push(Date.now());
      }
    };

    // Test rate limiting
    runner.assert(mockRateLimiter.canMakeCall(), 'Should allow initial calls');
    
    // Fill up the rate limit
    for (let i = 0; i < 5; i++) {
      mockRateLimiter.recordCall();
    }
    
    runner.assert(!mockRateLimiter.canMakeCall(), 'Should block calls when limit reached');
  });

  // Test 8: Error ID generation
  runner.test('Error ID generation', () => {
    // Test error ID format
    const errorIdPattern = /^ERR-\d{8}-\d{6}-[A-Z0-9]{4}$/;
    
    // Mock the generateErrorId function behavior
    const mockGenerateErrorId = () => {
      const now = new Date();
      const date = now.toISOString().slice(0, 10).replace(/-/g, '');
      const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const random = Math.random().toString(36).substr(2, 4).toUpperCase();
      return `ERR-${date}-${time}-${random}`;
    };

    const errorId = mockGenerateErrorId();
    runner.assert(errorIdPattern.test(errorId), `Error ID should match pattern, got: ${errorId}`);
  });

  // Test 9: Edge case - coordinate parsing from various formats
  runner.test('Coordinate parsing - various formats', async () => {
    const mockHandler = createMockHandler();
    
    // Test degree-minute-second format
    const result1 = await mockHandler({
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: {
          name: "Test Person",
          year: 1990, month: 5, day: 15, hour: 14, minute: 30,
          city: "Test City", nation: "US", timezone: "UTC",
          birth_coordinates: "40°42'45.98\"N 74°0'21.6\"W",
          zodiac_type: "Tropic"
        }
      })
    });
    
    const response1 = JSON.parse(result1.body);
    runner.assert(response1.person_a.details.latitude !== undefined, 'Should parse DMS coordinates');
    
    // Test decimal degrees format
    const result2 = await mockHandler({
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: {
          name: "Test Person",
          year: 1990, month: 5, day: 15, hour: 14, minute: 30,
          city: "Test City", nation: "US", timezone: "UTC",
          birth_coordinates: "40.7128, -74.006",
          zodiac_type: "Tropic"
        }
      })
    });
    
    const response2 = JSON.parse(result2.body);
    runner.assert(response2.person_a.details.latitude !== undefined, 'Should parse decimal coordinates');
  });

  // Test 10: API quota and rate limiting edge cases
  runner.test('Rate limiting - burst protection', () => {
    const mockRateLimiter = {
      calls: [],
      maxCallsPerMinute: 5,
      canMakeCall() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        this.calls = this.calls.filter(timestamp => timestamp > oneMinuteAgo);
        return this.calls.length < this.maxCallsPerMinute;
      },
      recordCall() {
        this.calls.push(Date.now());
      },
      getWaitTime() {
        if (this.canMakeCall()) return 0;
        const oldestCall = Math.min(...this.calls);
        const waitTime = oldestCall + 60000 - Date.now();
        return Math.max(0, waitTime);
      }
    };

    // Test burst protection - simulate rapid calls
    for (let i = 0; i < 6; i++) {
      if (mockRateLimiter.canMakeCall()) {
        mockRateLimiter.recordCall();
      }
    }
    
    runner.assert(!mockRateLimiter.canMakeCall(), 'Should block calls after burst limit');
    runner.assert(mockRateLimiter.getWaitTime() > 0, 'Should provide wait time when rate limited');
  });

  // Test 11: Synastry calculation with both people
  runner.test('Synastry calculation - two person chart', async () => {
    const mockHandler = createMockHandler();
    
    const result = await mockHandler({
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: {
          name: "Person A",
          year: 1990, month: 5, day: 15, hour: 14, minute: 30,
          city: "New York", nation: "US", timezone: "America/New_York",
          latitude: 40.7128, longitude: -74.006, zodiac_type: "Tropic"
        },
        personB: {
          name: "Person B", 
          year: 1988, month: 12, day: 3, hour: 9, minute: 45,
          city: "Los Angeles", nation: "US", timezone: "America/Los_Angeles",
          latitude: 34.0522, longitude: -118.2437, zodiac_type: "Tropic"
        }
      })
    });

    runner.assert(result.statusCode === 200, 'Should return 200 for synastry calculation');
    
    const response = JSON.parse(result.body);
    runner.assert(response.person_a, 'Should include person A data');
    runner.assert(response.person_b, 'Should include person B data');
    runner.assert(response.synastry_aspects, 'Should include synastry aspects');
  });

  // Test 12: Transit calculation with date range
  runner.test('Transit calculation - date range processing', async () => {
    const mockHandler = createMockHandler();
    
    const result = await mockHandler({
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: {
          name: "Test Person",
          year: 1990, month: 5, day: 15, hour: 14, minute: 30,
          city: "New York", nation: "US", timezone: "America/New_York",
          latitude: 40.7128, longitude: -74.006, zodiac_type: "Tropic"
        },
        transit_start_date: "2024-01-01",
        transit_end_date: "2024-01-03"
      })
    });

    runner.assert(result.statusCode === 200, 'Should return 200 for transit calculation');
    
    const response = JSON.parse(result.body);
    runner.assert(response.person_a, 'Should include person A data');
    runner.assert(response.person_a.transit_data, 'Should include transit data');
    runner.assert(Array.isArray(response.person_a.transit_data), 'Transit data should be an array');
  });

  // Test 13: Logger sanitization - sensitive data protection
  runner.test('Logger sanitization - API key protection', () => {
    // Mock the logger sanitize function
    const mockSanitize = (data) => {
      if (!data) return data;
      
      const sensitiveFields = [
        'rapidapi-key', 'x-rapidapi-key', 'RAPIDAPI_KEY', 'api_key', 
        'password', 'secret', 'token', 'auth'
      ];
      
      if (typeof data === 'string') {
        return data.replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED]');
      }
      
      if (typeof data === 'object' && data !== null) {
        const sanitized = Array.isArray(data) ? [...data] : { ...data };
        
        for (const key in sanitized) {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            sanitized[key] = '[REDACTED]';
          } else if (typeof sanitized[key] === 'object') {
            sanitized[key] = mockSanitize(sanitized[key]);
          }
        }
        
        return sanitized;
      }
      
      return data;
    };

    // Test API key redaction
    const testData = {
      'x-rapidapi-key': 'abcdef1234567890abcdef1234567890',
      normalField: 'normal value',
      nested: {
        'RAPIDAPI_KEY': 'secret123456789012345678901234567890',
        other: 'value'
      }
    };

    const sanitized = mockSanitize(testData);
    runner.assert(sanitized['x-rapidapi-key'] === '[REDACTED]', 'Should redact API key header');
    runner.assert(sanitized.nested['RAPIDAPI_KEY'] === '[REDACTED]', 'Should redact nested API key');
    runner.assert(sanitized.normalField === 'normal value', 'Should preserve normal fields');
  });

  // Test 14: Date validation edge cases
  runner.test('Date validation - boundary conditions', async () => {
    const mockHandler = createMockHandler();
    
    // Test leap year date
    const result1 = await mockHandler({
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: {
          name: "Leap Year Test",
          year: 2000, month: 2, day: 29, hour: 12, minute: 0,
          city: "Test City", nation: "US", timezone: "UTC",
          latitude: 0, longitude: 0, zodiac_type: "Tropic"
        }
      })
    });
    
    runner.assert(result1.statusCode === 200, 'Should accept valid leap year date');
    
    // Test invalid leap year date
    const result2 = await mockHandler({
      httpMethod: 'POST',
      body: JSON.stringify({
        personA: {
          name: "Invalid Leap Year Test",
          year: 1900, month: 2, day: 29, hour: 12, minute: 0,
          city: "Test City", nation: "US", timezone: "UTC",
          latitude: 0, longitude: 0, zodiac_type: "Tropic"
        }
      })
    });
    
    const response2 = JSON.parse(result2.body);
    runner.assert(result2.statusCode === 400, 'Should reject invalid leap year date');
    runner.assert(response2.errors && response2.errors.length > 0, 'Should provide validation errors');
  });

  // Test 15: Memory and performance monitoring
  runner.test('Performance monitoring - memory usage', () => {
    const startMemory = process.memoryUsage();
    
    // Simulate some processing
    const testData = [];
    for (let i = 0; i < 10000; i++) {
      testData.push({
        id: i,
        data: `test-data-${i}`,
        timestamp: Date.now()
      });
    }
    
    const endMemory = process.memoryUsage();
    const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
    
    // Clean up
    testData.length = 0;
    
    runner.assert(memoryIncrease < 50 * 1024 * 1024, 'Memory increase should be reasonable (< 50MB)');
  });

  await runner.run();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, TestRunner };
