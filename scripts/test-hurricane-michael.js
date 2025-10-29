/* eslint-disable no-console */
/**
 * Hurricane Michael Benchmark Test
 * October 10, 2018 - 17:30 CST (landfall in Panama City, FL)
 */

const http = require('http');

const payload = JSON.stringify({
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
    zodiac_type: 'Tropic',
  },
  window: {
    start: '2018-10-10',
    end: '2018-10-10',
    step: 'daily',
  },
  relocation_mode: 'A_local',
  translocation: {
    applies: true,
    method: 'A_local',
    mode: 'A_local',
    label: 'Panama City, FL',
    coords: {
      latitude: 30.166667,
      longitude: -85.666667,
      timezone: 'America/Chicago',
    },
    tz: 'America/Chicago',
  },
  indices: {
    window: { start: '2018-10-10', end: '2018-10-10', step: 'daily' },
    request_daily: true,
  },
  frontstage_policy: {
    autogenerate: true,
    allow_symbolic_weather: true,
  },
  report_type: 'solo_balance_meter',
  context: {
    mode: 'balance_meter',
  },
});

console.log('🌀 Hurricane Michael Benchmark Test');
console.log('📅 Date: October 10, 2018, 17:30 CST');
console.log('📍 Location: Panama City, FL\n');

const options = {
  hostname: 'localhost',
  port: 8888,
  path: '/.netlify/functions/astrology-mathbrain',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      const personA = result?.person_a || result;
      const summary = personA?.summary || personA?.derived?.seismograph_summary || {};
      const transitsByDate = personA?.chart?.transitsByDate || {};
      const dayData = transitsByDate['2018-10-10'] || {};
      const seismograph = dayData?.seismograph || summary;

      console.log('\n📊 Balance Meter Results:\n');
      console.log(`  Magnitude:         ${seismograph?.magnitude ?? 'N/A'}`);
      console.log(`  Directional Bias:  ${seismograph?.bias_signed ?? seismograph?.valence ?? 'N/A'}`);
      console.log(`  Volatility:        ${seismograph?.volatility ?? 'N/A'}`);
      console.log(`  Coherence:         ${seismograph?.coherence ?? 'N/A'}`);

      const magnitude = seismograph?.magnitude;
      const valence = seismograph?.bias_signed ?? seismograph?.valence;

      if (magnitude !== null && magnitude !== undefined) {
        const magnitudeMatch = Math.abs(magnitude - 5.0) < 0.5;
        const valenceMatch = valence !== null && valence < -4.0;

        console.log('\n✅ Benchmark Validation:');
        console.log(`  Magnitude ≈ 5.0: ${magnitudeMatch ? '✅ PASS' : '❌ FAIL'} (${magnitude})`);
        console.log(`  Valence < -4.0:  ${valenceMatch ? '✅ PASS' : '❌ FAIL'} (${valence})`);
      }

      const aspects = dayData?.aspects || personA?.derived?.t2n_aspects || [];
      if (aspects.length > 0) {
        console.log('\n📍 Top 5 Transit Aspects:');
        aspects
          .sort((a, b) => (b.weight || 0) - (a.weight || 0))
          .slice(0, 5)
          .forEach((aspect) => {
            const transit = aspect.transit || aspect.p1_name || '?';
            const aspectName = aspect.aspect || '?';
            const natal = aspect.target || aspect.p2_name || '?';
            const orb = aspect.orb?.toFixed(2) || '?';
            console.log(`  ${transit} ${aspectName} ${natal} (orb: ${orb}°)`);
          });
      }

      // Save full result
      require('fs').writeFileSync(
        require('path').join(__dirname, 'hurricane-michael-result.json'),
        JSON.stringify(result, null, 2)
      );
      console.log('\n📁 Full result saved to hurricane-michael-result.json\n');
    } catch (err) {
      console.error('Parse error:', err.message);
    }
  });
});

req.on('error', (err) => {
  console.error('\n❌ Request failed:', err.message);
  console.error('Make sure netlify dev is running on port 8888\n');
});

req.write(payload);
req.end();
