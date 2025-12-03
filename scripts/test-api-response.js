#!/usr/bin/env node
/**
 * Test script to verify the astrology-mathbrain API route works correctly
 * Run with: node scripts/test-api-response.js
 */

require('dotenv').config();

async function testMathBrainAPI() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Test payload matching what the frontend sends
  const payload = {
    personA: {
      name: "Dan Cross",
      year: 1973,
      month: 7,
      day: 24,
      hour: 14,
      minute: 30,
      latitude: 40.016666666666666,
      longitude: -75.3,
      timezone: "US/Eastern",
      city: "Bryn Mawr",
      nation: "US"
    },
    personB: {
      name: "Stephie",
      year: 1968,
      month: 4,
      day: 16,
      hour: 18,
      minute: 37,
      latitude: 31.583333333333332,
      longitude: -84.15,
      timezone: "US/Eastern",
      city: "Albany",
      nation: "US"
    },
    window: {
      start: "2025-12-03",
      end: "2025-12-06"
    }
  };
  
  console.log('Testing /api/astrology-mathbrain endpoint...');
  console.log('Base URL:', baseUrl);
  
  try {
    const response = await fetch(`${baseUrl}/api/astrology-mathbrain`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Response status:', response.status);
    
    const json = await response.json();
    
    // Check critical fields
    console.log('\n=== Validation Results ===');
    
    // Person A positions
    const posA = json?.person_a?.chart?.positions;
    const posACount = posA ? Object.keys(posA).length : 0;
    console.log('✓ person_a.chart.positions:', posACount > 0 ? `${posACount} planets` : '❌ EMPTY');
    if (posACount > 0) {
      console.log('  Sample (Sun):', JSON.stringify(posA.Sun, null, 2));
    }
    
    // Person A angle_signs
    const anglesA = json?.person_a?.chart?.angle_signs;
    console.log('✓ person_a.chart.angle_signs:', anglesA ? JSON.stringify(anglesA) : '❌ EMPTY');
    
    // Person A cusps
    const cuspsA = json?.person_a?.chart?.cusps;
    console.log('✓ person_a.chart.cusps:', Array.isArray(cuspsA) ? `${cuspsA.length} houses` : '❌ MISSING');
    
    // Person B positions
    const posB = json?.person_b?.chart?.positions;
    const posBCount = posB ? Object.keys(posB).length : 0;
    console.log('✓ person_b.chart.positions:', posBCount > 0 ? `${posBCount} planets` : '❌ EMPTY');
    
    // Person B angle_signs
    const anglesB = json?.person_b?.chart?.angle_signs;
    console.log('✓ person_b.chart.angle_signs:', anglesB ? JSON.stringify(anglesB) : '❌ EMPTY');
    
    // Transits
    const transitsA = json?.person_a?.chart?.transitsByDate;
    const transitCount = transitsA ? Object.keys(transitsA).length : 0;
    console.log('✓ person_a.chart.transitsByDate:', transitCount > 0 ? `${transitCount} days` : '❌ EMPTY');
    
    // Overall success
    console.log('\n=== Summary ===');
    const success = posACount > 0 && posBCount > 0 && anglesA?.ascendant && anglesB?.ascendant;
    console.log(success ? '✅ All critical fields populated!' : '❌ Missing required data');
    
    if (!success) {
      console.log('\nFull response:');
      console.log(JSON.stringify(json, null, 2));
    }
    
  } catch (e) {
    console.error('Test failed:', e.message);
    console.log('Make sure the dev server is running: npm run dev');
  }
}

testMathBrainAPI();
