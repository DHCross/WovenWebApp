#!/usr/bin/env node
/**
 * Auth0 Quick Fix Diagnostic
 * Shows exactly what's wrong and how to fix it
 */

console.log('🔥 Auth0 Quick Fix Diagnostic');
console.log('=============================\n');

// Load environment
const fs = require('fs');
if (!fs.existsSync('.env')) {
    console.log('❌ Error: .env file not found');
    console.log('   Run: cp .env.example .env');
    process.exit(1);
}

// Parse .env file
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.trim();
        }
    }
});

console.log('🔍 Current Configuration:');
console.log(`   AUTH0_DOMAIN: ${env.AUTH0_DOMAIN || 'NOT SET'}`);
console.log(`   AUTH0_CLIENT_ID: ${env.AUTH0_CLIENT_ID || 'NOT SET'}`);
console.log('');

// Test auth-config function
console.log('⚡ Testing Auth Config Function:');
try {
    // Use environment variable first, then .env file
    const testDomain = process.env.AUTH0_DOMAIN || env.AUTH0_DOMAIN;
    const testClientId = process.env.AUTH0_CLIENT_ID || env.AUTH0_CLIENT_ID;
    
    process.env.AUTH0_DOMAIN = testDomain;
    process.env.AUTH0_CLIENT_ID = testClientId;
    
    const authConfig = require('./netlify/functions/auth-config.js');
    authConfig.handler({}, {}).then(result => {
        const response = JSON.parse(result.body);
        
        if (result.statusCode === 200) {
            // Check if client ID is still a placeholder
            if (response.clientId === 'REPLACE_WITH_ACTUAL_AUTH0_SPA_CLIENT_ID') {
                console.log('⚠️  Auth config function loads but CLIENT_ID is placeholder!');
                console.log(`   Domain: ${response.domain} ✅`);
                console.log(`   Client ID: ${response.clientId} ❌`);
                console.log('');
                console.log('🔧 FIX REQUIRED:');
                console.log('   1. Go to Auth0 Dashboard → Applications');
                console.log('   2. Find your Single Page Application');
                console.log('   3. Copy the Client ID');
                console.log('   4. Update .env file:');
                console.log('      AUTH0_CLIENT_ID=your_actual_client_id_here');
                console.log('');
                console.log('📖 See auth0_request_issue.md for detailed instructions');
            } else {
                console.log('✅ Auth config function working!');
                console.log(`   Domain: ${response.domain}`);
                console.log(`   Client ID: ${response.clientId}`);
                console.log('');
                console.log('🎉 Auth0 is properly configured!');
                console.log('   You can now use login functionality.');
            }
        } else {
            console.log('❌ Auth config function failed:');
            console.log(`   Status: ${result.statusCode}`);
            console.log(`   Error: ${response.error}`);
            console.log('');
            console.log('🔧 FIX REQUIRED:');
            console.log('   1. Go to Auth0 Dashboard → Applications');
            console.log('   2. Find your Single Page Application');
            console.log('   3. Copy the Client ID');
            console.log('   4. Update .env file:');
            console.log('      AUTH0_CLIENT_ID=your_actual_client_id_here');
            console.log('');
            console.log('📖 See auth0_request_issue.md for detailed instructions');
        }
    });
} catch (error) {
    console.log('❌ Error testing auth config:', error.message);
}