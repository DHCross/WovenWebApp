#!/usr/bin/env node
/**
 * Auth0 Setup Verification Script
 * Run this after updating your AUTH0_CLIENT_ID to verify everything is working
 */

console.log('🔐 Auth0 Setup Verification');
console.log('============================\n');

// Check if we're in the correct directory
const fs = require('fs');
const path = require('path');

if (!fs.existsSync('.env')) {
    console.log('❌ Error: .env file not found');
    console.log('   Make sure you\'re running this from the WovenWebApp root directory');
    process.exit(1);
}

// Simple .env parser
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

const domain = envVars.AUTH0_DOMAIN;
const clientId = envVars.AUTH0_CLIENT_ID;
const audience = envVars.AUTH0_AUDIENCE;

console.log('📋 Current Configuration:');
console.log(`   AUTH0_DOMAIN: ${domain || 'Not set'}`);
console.log(`   AUTH0_CLIENT_ID: ${clientId || 'Not set'}`);
console.log(`   AUTH0_AUDIENCE: ${audience || 'Not set'}\n`);

let hasIssues = false;

// Validation checks
if (!domain) {
    console.log('❌ AUTH0_DOMAIN is not set');
    hasIssues = true;
} else if (domain.includes('http://') || domain.includes('https://')) {
    console.log('⚠️  AUTH0_DOMAIN should not include protocol (http/https)');
    console.log('   Current: ' + domain);
    console.log('   Should be: ' + domain.replace(/^https?:\/\//, ''));
    hasIssues = true;
} else {
    console.log('✅ AUTH0_DOMAIN format is correct');
}

if (!clientId) {
    console.log('❌ AUTH0_CLIENT_ID is not set');
    hasIssues = true;
} else if (clientId === 'REPLACE_WITH_ACTUAL_AUTH0_SPA_CLIENT_ID') {
    console.log('⚠️  AUTH0_CLIENT_ID still contains placeholder');
    console.log('   You need to replace this with your actual Auth0 Client ID');
    console.log('   See auth0_config_setup.md for instructions');
    hasIssues = true;
} else if (clientId.length < 20) {
    console.log('⚠️  AUTH0_CLIENT_ID seems too short');
    console.log('   Auth0 Client IDs are typically 30+ characters');
    hasIssues = true;
} else {
    console.log('✅ AUTH0_CLIENT_ID appears to be properly configured');
}

// Check if auth-config function exists
if (!fs.existsSync('netlify/functions/auth-config.js')) {
    console.log('❌ auth-config.js function not found');
    hasIssues = true;
} else {
    console.log('✅ auth-config.js function exists');
}

console.log('\n🎯 Next Steps:');

if (hasIssues) {
    console.log('❌ Configuration needs attention:');
    if (clientId === 'REPLACE_WITH_ACTUAL_AUTH0_SPA_CLIENT_ID') {
        console.log('   1. Get your Auth0 Client ID from the Auth0 Dashboard');
        console.log('      → Go to Applications → [Your SPA] → Settings → Client ID');
        console.log('   2. Replace AUTH0_CLIENT_ID in .env with the actual value');
    }
    console.log('   3. Re-run this script: node verify-auth0-setup.js');
    console.log('   4. See auth0_config_setup.md for detailed instructions');
} else {
    console.log('✅ Configuration looks good! Next steps:');
    console.log('   1. Test the auth-config endpoint:');
    console.log('      → Start dev server: npm run dev');
    console.log('      → Test endpoint: curl http://localhost:8888/.netlify/functions/auth-config');
    console.log('   2. Verify Auth0 Dashboard settings match the guide');
    console.log('   3. Deploy to Netlify with the same environment variables');
    console.log('   4. Test the full authentication flow');
}

console.log('\n📚 Helpful Resources:');
console.log('   • auth0_config_setup.md - Step-by-step setup guide');
console.log('   • AUTH0_FIX_GUIDE.md - Troubleshooting guide');
console.log('   • npm run test:auth0 - Full Auth0 validation test');

if (hasIssues) {
    process.exit(1);
} else {
    console.log('\n🎉 Auth0 configuration is ready to test!');
    process.exit(0);
}