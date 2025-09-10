#!/usr/bin/env node

/**
 * Test script to verify the authorizationParams fix
 * This simulates the auth flow to ensure the fix prevents the [object Object] error
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Auth0 authorizationParams Fix Verification');
console.log('='.repeat(50));

// Check if the fix is applied
const indexPath = path.join(__dirname, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Look for the problematic pattern
const oldPattern = /authorizationParams:\s*{\s*audience\s*}/g;
const correctPattern = /getTokenSilently\s*\(\s*{\s*\.\.\..*audience.*?\s*}\s*\)/g;

const hasOldPattern = oldPattern.test(indexContent);
const hasCorrectPattern = correctPattern.test(indexContent);

console.log('\n📋 Fix Verification Results:');
console.log('-'.repeat(30));

if (hasOldPattern) {
    console.log('❌ FOUND OLD PATTERN: authorizationParams: { audience }');
    console.log('   This will cause [object Object] errors');
} else {
    console.log('✅ OLD PATTERN NOT FOUND: Good!');
}

if (hasCorrectPattern) {
    console.log('✅ CORRECT PATTERN FOUND: audience directly in options');
} else {
    console.log('⚠️  CORRECT PATTERN NOT DETECTED');
}

// Simulate the fix behavior
console.log('\n🧪 Simulating Auth Flow:');
console.log('-'.repeat(30));

function simulateGetTokenSilently(options) {
    // This simulates what happens when we pass the options to Auth0
    console.log('Options passed to getTokenSilently:', JSON.stringify(options, null, 2));
    
    // Check if authorizationParams is incorrectly nested
    if (options.authorizationParams && typeof options.authorizationParams === 'object') {
        console.log('❌ ERROR: Would result in [object Object] in URL');
        return false;
    }
    
    // Check if audience is correctly provided
    if (options.audience) {
        console.log('✅ SUCCESS: Audience parameter correctly provided');
        return true;
    }
    
    console.log('✅ SUCCESS: No audience parameter (valid for basic auth)');
    return true;
}

// Test the old (broken) pattern
console.log('\n1. Testing OLD (broken) pattern:');
const audience = 'https://api.example.com';
const oldOptions = {
    ...(audience ? { authorizationParams: { audience } } : {})
};
simulateGetTokenSilently(oldOptions);

// Test the new (fixed) pattern
console.log('\n2. Testing NEW (fixed) pattern:');
const newOptions = {
    ...(audience ? { audience } : {})
};
simulateGetTokenSilently(newOptions);

console.log('\n🎯 Summary:');
console.log('-'.repeat(30));
if (!hasOldPattern && hasCorrectPattern) {
    console.log('✅ VERIFICATION PASSED: Fix is correctly applied');
    console.log('   The authorizationParams issue has been resolved');
    process.exit(0);
} else {
    console.log('❌ VERIFICATION FAILED: Fix may not be complete');
    process.exit(1);
}