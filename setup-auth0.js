#!/usr/bin/env node
/**
 * Auth0 Setup Assistant
 * Helps users get started with Auth0 configuration quickly
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 Auth0 Setup Assistant');
console.log('==========================\n');

// Check if .env already exists
if (fs.existsSync('.env')) {
    console.log('✅ .env file already exists');
    console.log('   To reconfigure, delete .env and run this script again\n');
    
    console.log('🎯 Next Step: Verify your configuration');
    console.log('   Run: node verify-auth0-setup.js\n');
    
    console.log('📚 Or see the complete guide:');
    console.log('   • auth0_config_setup.md - Step-by-step setup');
    console.log('   • AUTH0_FIX_GUIDE.md - Troubleshooting guide');
    process.exit(0);
}

try {
    // Copy .env.example to .env
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ Created .env file from .env.example');
    console.log('   This file contains your Auth0 configuration\n');
    
    console.log('🎯 NEXT STEPS TO COMPLETE SETUP:');
    console.log('==================================\n');
    
    console.log('1. 🔑 Get your Auth0 Client ID:');
    console.log('   → Go to Auth0 Dashboard: https://manage.auth0.com/');
    console.log('   → Navigate to Applications → [Your Single Page App]');
    console.log('   → Copy the Client ID from the Settings tab\n');
    
    console.log('2. ✏️  Update your .env file:');
    console.log('   → Open .env in your editor');
    console.log('   → Replace "REPLACE_WITH_ACTUAL_AUTH0_SPA_CLIENT_ID"');
    console.log('   → With your actual Auth0 Client ID\n');
    
    console.log('3. ✅ Verify your setup:');
    console.log('   → Run: node verify-auth0-setup.js');
    console.log('   → This will check if everything is configured correctly\n');
    
    console.log('4. 🌐 Configure Auth0 Dashboard URLs:');
    console.log('   → In your Auth0 app settings, add these URLs:');
    console.log('   → Callback URLs: http://localhost:8888, https://your-site.netlify.app');
    console.log('   → Logout URLs: http://localhost:8888, https://your-site.netlify.app');
    console.log('   → Web Origins: http://localhost:8888, https://your-site.netlify.app\n');
    
    console.log('📚 HELPFUL RESOURCES:');
    console.log('   • auth0_config_setup.md - Complete setup guide');
    console.log('   • AUTH0_FIX_GUIDE.md - Troubleshooting common issues');
    console.log('   • npm run test:auth0 - Comprehensive validation test\n');
    
    console.log('🚀 Ready to start! Run your next command:');
    console.log('   node verify-auth0-setup.js');
    
} catch (error) {
    console.error('❌ Error setting up .env file:', error.message);
    console.log('\n📚 Manual setup:');
    console.log('   1. Copy .env.example to .env');
    console.log('   2. Update AUTH0_CLIENT_ID with your actual Client ID');
    console.log('   3. See auth0_config_setup.md for details');
    process.exit(1);
}