#!/usr/bin/env node
/**
 * Benchmark Test: October 10, 2018 Hurricane Michael Landfall
 * Expected: Magnitude 5.0, Valence -4.96 to -5.0
 * Time: 17:30 CST in Panama City, FL
 */

const https = require('https');
const http = require('http');

const payload = {
  mode: 'balance_meter',
  personA: {
    name: 'Dan',
    year: 1973,
    month: 7,
    day: 24,
    hour: 14,
    minute: 30,
    latitude: 40.0167,
    longitude: -75.3,
    timezone: 'America/New_York',
    city: 'Bryn Mawr',
    nation: 'US',
    zodiac_type: 'Tropic'
  },
  window: {
    start: '2018-10-10',
    end: '2018-10-10',
    step: 'daily'
  },
  relocation_mode: 'A_local',
  translocation: {
    applies: true,
    method: 'A_local',
    current_location: {
      latitude: 30.166667,
      longitude: -85.666667,
      timezone: 'America/Chicago',
      label: 'Panama City, FL'
    }
  },
  indices: {
    window: {
      start: '2018-10-10',
      end: '2018-10-10',
      step: 'daily'
    },
    request_daily: true
  },
  frontstage_policy: {
    autogenerate: true,
    allow_symbolic_weather: true
  },
  presentation_style: 'conversational',
  wheel_format: 'png',
  theme: 'classic'
};

const data = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/astrology-mathbrain',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('\n🔍 Testing October 10, 2018 Benchmark...\n');
console.log('Expected Results:');
console.log('  • Magnitude: 5.0 (Crisis/Peak Intensity)');
console.log('  • Valence: -4.96 to -5.0 (Severe Compression)');
console.log('  • Driver: Transiting Pluto in relocated H2\n');

const req = http.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(body);
      
      console.log('✅ API Response Received\n');
      
      // Extract balance meter data
      const summary = result?.person_a?.summary || result?.summary || {};
      const transitsByDate = result?.person_a?.chart?.transitsByDate || {};
      const date = '2018-10-10';
      const dayData = transitsByDate[date];
      
      console.log('📊 Balance Meter Results:');
      console.log(`  • Magnitude: ${summary.magnitude ?? dayData?.seismograph?.magnitude ?? 'N/A'}`);
      console.log(`  • Directional Bias: ${summary.bias_signed ?? summary.valence ?? dayData?.seismograph?.bias_signed ?? 'N/A'}`);
      console.log(`  • Volatility: ${summary.volatility ?? dayData?.seismograph?.volatility ?? 'N/A'}`);
      console.log(`  • SFD: ${summary.sfd ?? dayData?.seismograph?.sfd ?? 'N/A'}\n`);
      
      // Extract transit positions
      if (dayData?.aspects) {
        console.log('🌟 Transit Aspects Found:', dayData.aspects.length);
        const plutoAspects = dayData.aspects.filter(a => 
          a.transit?.toLowerCase().includes('pluto') || 
          a.p1_name?.toLowerCase().includes('pluto')
        );
        if (plutoAspects.length > 0) {
          console.log('  Pluto Aspects:');
          plutoAspects.forEach(a => {
            console.log(`    • ${a.transit || a.p1_name} ${a.aspect} ${a.target || a.p2_name} (orb: ${a.orb}°)`);
          });
        }
      }
      
      // Check for hooks
      const hooks = result?.person_a?.chart?.hooks || [];
      if (hooks.length > 0) {
        console.log('\n🎣 High-Charge Hooks:', hooks.length);
        hooks.slice(0, 3).forEach((h, i) => {
          console.log(`  ${i + 1}. ${h.label || h.aspect}`);
        });
      }
      
      // Verification
      const magnitude = summary.magnitude ?? dayData?.seismograph?.magnitude;
      const bias = summary.bias_signed ?? summary.valence ?? dayData?.seismograph?.bias_signed;
      
      console.log('\n✨ Benchmark Verification:');
      if (magnitude >= 4.5) {
        console.log('  ✅ Magnitude is >= 4.5 (approaching expected 5.0)');
      } else {
        console.log(`  ⚠️  Magnitude is ${magnitude} (expected ~5.0)`);
      }
      
      if (bias <= -4.0) {
        console.log('  ✅ Valence is <= -4.0 (approaching expected -4.96)');
      } else {
        console.log(`  ⚠️  Valence is ${bias} (expected ~-4.96)`);
      }
      
      // Write full result to file for inspection
      const fs = require('fs');
      fs.writeFileSync(
        'benchmark-result-2018-10-10.json',
        JSON.stringify(result, null, 2)
      );
      console.log('\n📄 Full result saved to: benchmark-result-2018-10-10.json\n');
      
    } catch (err) {
      console.error('❌ Error parsing response:', err.message);
      console.log('Raw response:', body.substring(0, 500));
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request failed:', err.message);
  console.log('\n💡 Make sure the dev server is running:');
  console.log('   npm run dev\n');
  process.exit(1);
});

req.write(data);
req.end();
