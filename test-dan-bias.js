#!/usr/bin/env node

/**
 * Test script to run Dan's Directional Bias test (v2 API)
 * with relocation to Panama City, FL
 */

const http = require('http');

//
// PAYLOAD UPDATED TO V2/V5 API SPEC
//
const payload = {
  // Use 'context' and 'window' objects per v2 spec
  context: {
    mode: 'balance_meter',
  },
  transit_start_date: '2018-10-10',
  transit_end_date: '2018-10-10',
  translocation: {
    applies: true,
    method: 'A_local',
    coords: {
      latitude: 30.1667,  // Panama City, FL: 30°10'N
      longitude: -85.6667, // 85°40'W
      timezone: 'America/Chicago', // Use IANA timezone
    }
  },
  person_a: {
    name: 'Dan',
    // Use v2 keys (year, month, day, etc.)
    year: 1973,
    month: 7,
    day: 24,
    hour: 14,
    minute: 30,
    timezone: 'America/New_York', // Use IANA timezone
    latitude: 40.0196,
    longitude: -75.3167,
    city: 'Bryn Mawr',
    nation: 'US',
  },
  house_system: 'placidus',
};

const postData = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 8888,
  path: '/api/astrology-mathbrain',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length,
    // Add v2 header to be explicit
    'X-Math-Brain-Version': 'v2',
  },
};

console.log('🧪 Testing Dan\'s Directional Bias (Relocated to Panama City, FL)');
console.log('📍 Birth: July 24, 1973, 2:30 PM ET, Bryn Mawr, PA');
console.log('📍 Relocation: Panama City, FL (30°10\'N, 85°40\'W)');
console.log('📅 Transit Window: Oct 10, 2018 (Hurricane Michael Landfall)');
console.log('---');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.success === false) {
        console.error('❌ API returned error:', response.error);
        process.exit(1);
      }

      console.log('\n✅ SUCCESS!');
      console.log('');

      // Extract seismograph summary directly
      const summary = response.person_a?.derived?.seismograph_summary;
      
      if (!summary) {
        console.log('⚠️  No seismograph summary returned');
        process.exit(0);
      }

      console.log('📊 Seismograph Summary:');
      console.log('---');
      console.log(`Magnitude:       ${summary.magnitude?.toFixed(2) ?? '—'} (${summary.magnitude_label ?? '?'})`);
      console.log(`Directional Bias: ${summary.directional_bias?.value?.toFixed(2) ?? '—'} (${summary.directional_bias?.label ?? '?'})`);
      console.log(`Volatility:      ${summary.volatility?.toFixed(2) ?? '—'} (${summary.volatility_label ?? '?'})`);
      console.log('');

      // Provenance
      const prov = response.provenance;
      if (prov) {
        console.log('');
        console.log('🔍 Provenance:');
        console.log(`  Math Brain Version: ${prov.math_brain_version ?? 'N/A'}`);
        console.log(`  House System: ${prov.house_system ?? 'N/A'}`);
        console.log(`  Orbs Profile: ${prov.orbs_profile ?? 'N/A'}`);
        console.log(`  Chart Basis: ${prov.chart_basis ?? 'N/A'}`);
        console.log(`  Seismograph Chart: ${prov.seismograph_chart ?? 'N/A'}`);
        console.log(`  Translocation Applied: ${prov.translocation_applied ? 'Yes' : 'No'}`);
      }

      console.log('');
      console.log('✨ Test completed successfully!');
    } catch (err) {
      console.error('❌ Failed to parse response:', err.message);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ API request failed:', err.message);
  process.exit(1);
});

req.write(postData);
req.end();
