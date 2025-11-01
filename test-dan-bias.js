#!/usr/bin/env node

/**
 * Test script to run Dan's Directional Bias test with relocation to Panama City, FL
 */

const http = require('http');

const payload = {
  person_a: {
    name: 'Dan',
    birth_date: '1973-07-24',
    birth_time: '14:30',
    timezone: 'US/Eastern',
    latitude: 40.0196,   // Bryn Mawr, PA
    longitude: -75.3167,
    city: 'Bryn Mawr',
    nation: 'USA',
  },
  report_type: 'balance',
  transit_start_date: '2025-10-31',
  transit_end_date: '2025-11-01',
  house_system: 'placidus',
  relocation: {
    latitude: 30.1667,  // Panama City, FL: 30°10'N
    longitude: -85.6667, // 85°40'W
    city: 'Panama City',
    state: 'FL',
    timezone: 'US/Central',
  },
};

const postData = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/astrology-mathbrain',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length,
  },
};

console.log('🧪 Testing Dan\'s Directional Bias (Relocated to Panama City, FL)');
console.log('📍 Birth: July 24, 1973, 2:30 PM ET, Bryn Mawr, PA');
console.log('📍 Relocation: Panama City, FL (30°10\'N, 85°40\'W)');
console.log('📅 Transit Window: Oct 31 – Nov 1, 2025');
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

      // Extract daily readings
      const dailyReadings = response.unified_output?.person_a?.chart?.transitsByDate?.daily_readings || [];
      
      if (dailyReadings.length === 0) {
        console.log('⚠️  No daily readings returned');
        process.exit(0);
      }

      console.log('📊 Daily Directional Bias Readings:');
      console.log('---');
      
      console.log('| Date       | Magnitude | Directional Bias | Volatility | Aspects |');
      console.log('|:-----------|----------:|----------------:|----------:|----------|');
      
      dailyReadings.forEach((day) => {
        const mag = day.seismograph?.magnitude?.value_calibrated ?? day.seismograph?.magnitude?.value ?? '—';
        const bias = day.seismograph?.directional_bias?.value_calibrated ?? day.seismograph?.directional_bias?.value ?? '—';
        const vol = day.seismograph?.volatility?.value_calibrated ?? day.seismograph?.volatility?.value ?? '—';
        const aspects = day.seismograph?.aspect_count ?? '—';
        
        const biasStr = bias !== '—' ? `${bias > 0 ? '+' : ''}${bias.toFixed(2)}` : '—';
        const magStr = mag !== '—' ? mag.toFixed(2) : '—';
        const volStr = vol !== '—' ? vol.toFixed(2) : '—';
        
        console.log(`| ${day.date} | ${magStr.padStart(9)} | ${biasStr.padStart(16)} | ${volStr.padStart(10)} | ${String(aspects).padStart(7)} |`);
      });

      // Overall summary
      const summary = response.unified_output?.person_a?.chart?.transitsByDate?.summary;
      if (summary) {
        console.log('');
        console.log('📈 Overall Summary:');
        console.log(`  Avg. Magnitude: ${summary.magnitude?.value_calibrated?.toFixed(2) ?? 'N/A'} (${summary.magnitude?.label ?? '?'})`);
        console.log(`  Avg. Bias: ${summary.directional_bias?.value_calibrated?.toFixed(2) ?? 'N/A'} (${summary.directional_bias?.label ?? '?'})`);
        console.log(`  Avg. Volatility: ${summary.volatility?.value_calibrated?.toFixed(2) ?? 'N/A'}`);
      }

      // Provenance
      const prov = response.provenance;
      if (prov) {
        console.log('');
        console.log('🔍 Provenance:');
        console.log(`  Math Brain Version: ${prov.math_brain_version ?? 'N/A'}`);
        console.log(`  House System: ${prov.house_system ?? 'N/A'}`);
        console.log(`  Orbs Profile: ${prov.orbs_profile ?? 'N/A'}`);
        console.log(`  Relocated: ${prov.relocated ? 'Yes' : 'No'}`);
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
