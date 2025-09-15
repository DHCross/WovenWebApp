#!/usr/bin/env node

// Test script for enhanced transit fallback system
// Tests the Sep 13-16 date range that was previously problematic

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8888';

// Test payload using the format from your spec
const testPayload = {
  "personA": {
    "name": "DH Cross",
    "city": "Bryn Mawr",
    "state": "PA", 
    "nation": "US",
    "year": 1973,
    "month": 7,
    "day": 24,
    "hour": 14,
    "minute": 30,
    "latitude": 40.0167,
    "longitude": -75.3000,
    "zodiac_type": "Tropic",
    "timezone": "America/New_York"
  },
  "context": {
    "mode": "transit_window",
    "relocation_mode": "A_local"
  },
  "transitParams": {
    "startDate": "2025-09-13",
    "endDate": "2025-09-16", 
    "step": "daily"
  },
  "A_local": {
    "lat": 30.1588,
    "lon": -85.6602,
    "tz": "America/Chicago",
    "city": "Panama City",
    "state": "FL",
    "nation": "US"
  }
};

async function testTransitFallback() {
  console.log('🧪 Testing Enhanced Transit Fallback System');
  console.log('📅 Date Range: Sep 13-16, 2025 (previously problematic)');
  console.log('🏠 Relocation: A_local to Panama City, FL');
  console.log('');

  try {
    const response = await fetch(`${API_BASE}/api/astrology-mathbrain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error Response:', errorText);
      return;
    }

    const result = await response.json();
    
    console.log('✅ API Request Successful');
    console.log('');

    // Check transit data
    const transitsByDate = result.person_a?.chart?.transitsByDate || {};
    const dates = Object.keys(transitsByDate).sort();
    
    console.log('📊 Transit Data Results:');
    console.log(`Total dates with data: ${dates.length}/4 requested`);
    console.log('');

    let totalAspects = 0;
    for (const date of dates) {
      const aspects = transitsByDate[date] || [];
      totalAspects += aspects.length;
      console.log(`📅 ${date}: ${aspects.length} aspects`);
      
      // Show first 3 aspects as sample
      if (aspects.length > 0) {
        const sample = aspects.slice(0, 3);
        for (const aspect of sample) {
          const orb = aspect.orbit || aspect._orb || 'N/A';
          console.log(`   → ${aspect.p1_name} ${aspect.aspect} ${aspect.p2_name} (orb: ${orb}°)`);
        }
        if (aspects.length > 3) {
          console.log(`   ... and ${aspects.length - 3} more`);
        }
      }
      console.log('');
    }

    // Check seismograph data
    const seismo = result.person_a?.seismograph;
    if (seismo) {
      console.log('📈 Seismograph Data:');
      console.log(`Magnitude: ${seismo.magnitude}`);
      console.log(`Valence: ${seismo.valence}`); 
      console.log(`Volatility: ${seismo.volatility}`);
      console.log('');
    }

    // Check drivers (Balance Meter data)
    const drivers = result.person_a?.drivers;
    if (drivers && drivers.length > 0) {
      console.log('🎯 Top 3 Drivers:');
      drivers.slice(0, 3).forEach((driver, i) => {
        console.log(`${i + 1}. ${driver.a} ${driver.type} ${driver.b} (orb: ${driver.orbDeg}°, weight: ${driver.weight})`);
      });
      console.log('');
    }

    // Check provenance
    const provenance = result.provenance;
    if (provenance) {
      console.log('🔍 Provenance:');
      console.log(`Math Brain Version: ${provenance.math_brain_version}`);
      console.log(`Ephemeris Source: ${provenance.ephemeris_source}`);
      console.log(`House System: ${provenance.house_system}`);
      console.log(`Relocation Mode: ${provenance.relocation_mode}`);
      if (provenance.relocation_coords) {
        console.log(`Relocation Coords: ${provenance.relocation_coords.lat}, ${provenance.relocation_coords.lon}`);
      }
      console.log('');
    }

    // Summary
    console.log('📋 Summary:');
    console.log(`• Total aspects found: ${totalAspects}`);
    console.log(`• Dates with data: ${dates.length}/4`);
    console.log(`• Seismograph computed: ${!!seismo}`);
    console.log(`• Drivers populated: ${!!(drivers && drivers.length > 0)}`);
    console.log(`• Provenance complete: ${!!provenance}`);

    if (totalAspects > 0) {
      console.log('');
      console.log('🎉 SUCCESS: Enhanced fallback system found transit aspects!');
      console.log('✅ The endpoint fallback strategy is working');
    } else {
      console.log('');
      console.log('⚠️  Still no aspects found - may need deeper debugging');
      console.log('📝 Raw response structure:', Object.keys(result));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testTransitFallback();