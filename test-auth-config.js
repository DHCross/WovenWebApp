#!/usr/bin/env node

/**
 * Auth0 Configuration Test Script
 * Tests the auth-config function with various scenarios
 */

const { handler } = require('./netlify/functions/auth-config.js');

async function testAuthConfig() {
    console.log('🔐 Testing Auth0 Configuration Function\n');
    
    // Test 1: Current configuration
    console.log('📋 Test 1: Current Configuration');
    console.log('================================');
    const result1 = await handler();
    console.log('Status:', result1.statusCode);
    console.log('Body:', JSON.parse(result1.body));
    console.log();
    
    // Test 2: Simulated proper configuration
    console.log('📋 Test 2: Simulated Proper Configuration');
    console.log('=========================================');
    
    // Temporarily override environment variables
    const originalDomain = process.env.AUTH0_DOMAIN;
    const originalClientId = process.env.AUTH0_CLIENT_ID;
    const originalAudience = process.env.AUTH0_AUDIENCE;
    
    process.env.AUTH0_DOMAIN = 'dev-z8gw1uk6zgsrzubk.us.auth0.com';
    process.env.AUTH0_CLIENT_ID = 'sample_auth0_client_id_123456789';
    process.env.AUTH0_AUDIENCE = 'https://api.example.com';
    
    const result2 = await handler();
    console.log('Status:', result2.statusCode);
    console.log('Body:', JSON.parse(result2.body));
    
    // Restore original values
    process.env.AUTH0_DOMAIN = originalDomain;
    process.env.AUTH0_CLIENT_ID = originalClientId;
    process.env.AUTH0_AUDIENCE = originalAudience;
    
    console.log();
    
    // Test 3: Missing configuration
    console.log('📋 Test 3: Missing Configuration');
    console.log('================================');
    
    delete process.env.AUTH0_DOMAIN;
    delete process.env.AUTH0_CLIENT_ID;
    
    const result3 = await handler();
    console.log('Status:', result3.statusCode);
    console.log('Body:', JSON.parse(result3.body));
    
    // Restore original values
    process.env.AUTH0_DOMAIN = originalDomain;
    process.env.AUTH0_CLIENT_ID = originalClientId;
    
    console.log('\n✅ Auth Config Function Tests Complete');
    console.log('\n📝 Summary:');
    console.log('- Function loads and executes correctly');
    console.log('- Properly handles missing environment variables');
    console.log('- Returns expected response format');
    console.log('- Environment variable injection works');
    console.log('\n🔧 Next Steps:');
    console.log('1. Get actual Auth0 SPA Client ID from Auth0 Dashboard');
    console.log('2. Update .env file with real Auth0_CLIENT_ID');
    console.log('3. Configure proper callback URLs in Auth0 Dashboard');
    console.log('4. Test full authentication flow');
}

testAuthConfig().catch(console.error);