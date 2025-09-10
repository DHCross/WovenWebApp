#!/usr/bin/env node

/**
 * Test script for Auth0 Login Initiation functionality
 * Tests various scenarios for the /login endpoint
 */

const loginFunction = require('./netlify/functions/login-initiate.js');

// Test scenarios
const scenarios = [
  {
    name: 'Basic login initiation',
    event: {
      httpMethod: 'GET',
      path: '/login',
      queryStringParameters: {},
      headers: {
        host: 'sprightly-genie-998c07.netlify.app',
        'x-forwarded-proto': 'https'
      }
    },
    env: {
      AUTH0_DOMAIN: 'dev-z8gw1uk6zgsrzubk.us.auth0.com',
      AUTH0_CLIENT_ID: 'test_client_id'
    },
    expectedStatus: 302,
    checkRedirect: true
  },
  {
    name: 'Organization invitation flow',
    event: {
      httpMethod: 'GET',
      path: '/login',
      queryStringParameters: {
        invitation: 'inv_123',
        organization: 'org_456',
        organization_name: 'Test Company'
      },
      headers: {
        host: 'sprightly-genie-998c07.netlify.app',
        'x-forwarded-proto': 'https'
      }
    },
    env: {
      AUTH0_DOMAIN: 'dev-z8gw1uk6zgsrzubk.us.auth0.com',
      AUTH0_CLIENT_ID: 'test_client_id'
    },
    expectedStatus: 302,
    checkParams: ['invitation', 'organization', 'organization_name']
  },
  {
    name: 'OIDC third-party initiated login',
    event: {
      httpMethod: 'GET',
      path: '/login',
      queryStringParameters: {
        iss: 'https://dev-z8gw1uk6zgsrzubk.us.auth0.com'
      },
      headers: {
        host: 'sprightly-genie-998c07.netlify.app',
        'x-forwarded-proto': 'https'
      }
    },
    env: {
      AUTH0_DOMAIN: 'dev-z8gw1uk6zgsrzubk.us.auth0.com',
      AUTH0_CLIENT_ID: 'test_client_id',
      AUTH0_AUDIENCE: 'https://api.example.com'
    },
    expectedStatus: 302,
    checkAudience: true
  },
  {
    name: 'Missing Auth0 configuration',
    event: {
      httpMethod: 'GET',
      path: '/login',
      queryStringParameters: {},
      headers: { host: 'localhost:8888' }
    },
    env: {}, // No Auth0 env vars
    expectedStatus: 500,
    checkError: true
  }
];

async function runTests() {
  console.log('🧪 Testing Auth0 Login Initiation Endpoint\n');
  
  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    console.log(`🔍 Testing: ${scenario.name}`);
    
    try {
      // Set environment variables
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('AUTH0_')) {
          delete process.env[key];
        }
      });
      Object.assign(process.env, scenario.env);

      // Run the function
      const result = await loginFunction.handler(scenario.event, {});
      
      // Check status code
      if (result.statusCode !== scenario.expectedStatus) {
        console.log(`  ❌ Status code mismatch: expected ${scenario.expectedStatus}, got ${result.statusCode}`);
        failed++;
        continue;
      }

      // Check redirect URL
      if (scenario.checkRedirect && result.headers.Location) {
        const url = new URL(result.headers.Location);
        if (!url.hostname.includes('auth0.com')) {
          console.log(`  ❌ Redirect URL doesn't point to Auth0: ${url.hostname}`);
          failed++;
          continue;
        }
        if (!url.searchParams.get('client_id')) {
          console.log(`  ❌ Missing client_id parameter in redirect URL`);
          failed++;
          continue;
        }
      }

      // Check specific parameters are forwarded
      if (scenario.checkParams && result.headers.Location) {
        const url = new URL(result.headers.Location);
        const missingParams = scenario.checkParams.filter(param => 
          !url.searchParams.has(param)
        );
        if (missingParams.length > 0) {
          console.log(`  ❌ Missing parameters in redirect URL: ${missingParams.join(', ')}`);
          failed++;
          continue;
        }
      }

      // Check audience is included when configured
      if (scenario.checkAudience && result.headers.Location) {
        const url = new URL(result.headers.Location);
        if (!url.searchParams.has('audience')) {
          console.log(`  ❌ Audience parameter missing when AUTH0_AUDIENCE is set`);
          failed++;
          continue;
        }
      }

      // Check error handling
      if (scenario.checkError) {
        if (!result.body.includes('Authentication Configuration Error')) {
          console.log(`  ❌ Error page doesn't contain expected error message`);
          failed++;
          continue;
        }
      }

      console.log(`  ✅ Passed`);
      passed++;

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };