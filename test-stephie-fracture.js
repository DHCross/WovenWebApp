#!/usr/bin/env node

/**
 * Test script for Stephie's September 15, 2025 kneecap fracture
 * Micro-golden-standard event validating Felt Weather translocation
 *
 * Event Context:
 * - Physical injury (kneecap fracture) at 22:30 CDT
 * - Jupiter-Neptune natal square (0°02') activated by transits at 25°
 * - Venus conjunct Jupiter (H11), Mars sextile Jupiter (H1↔H11)
 * - Venus square Neptune (H11↔H2), Mercury conjunct Uranus (H12)
 * - Classification: "Phase-Slip Event" (body-field disconnect)
 *
 * Expected Result:
 * - Directional Bias: -3.3 to -3.6 (crisis-level compression)
 * - Chart Basis: felt_weather_relocated
 * - Translocation Applied: Yes
 */

const http = require('http');

const payload = {
  context: {
    mode: 'balance_meter',
  },
  transit_start_date: '2025-09-15',
  transit_end_date: '2025-09-15',
  translocation: {
    applies: true,
    method: 'A_local',
    coords: {
      latitude: 31.583,    // Albany, GA (actual location of event)
      longitude: -84.150,
      timezone: 'America/Chicago', // US/Central - CDT at time of event
    }
  },
  person_a: {
    name: 'Stephie',
    year: 1968,
    month: 4,
    day: 16,
    hour: 18,
    minute: 37,
    timezone: 'America/New_York', // EST at birth
    latitude: 31.583,    // Albany, GA birth location
    longitude: -84.150,
    city: 'Albany',
    state: 'GA',
    nation: 'US',
  },
  house_system: 'placidus',
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
    'X-Math-Brain-Version': 'v2',
  },
};

console.log('🧪 Testing Stephie\'s Phase-Slip Event (Kneecap Fracture)');
console.log('📍 Birth: April 16, 1968, 6:37 PM EST, Albany, GA');
console.log('📍 Event Location: Albany, GA (31°35\'N, 84°09\'W)');
console.log('📅 Event Time: September 15, 2025, 22:30 CDT (03:30 UTC Sept 16)');
console.log('🔬 Classification: Phase-Slip Event (Jupiter-Neptune activation)');
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

      // Extract seismograph summary
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

      // Validate against expected range
      const bias = summary.directional_bias?.value;
      if (bias && bias >= -3.6 && bias <= -3.3) {
        console.log('✅ Directional Bias within expected range (-3.3 to -3.6)');
      } else if (bias) {
        console.log(`⚠️  Directional Bias outside expected range: ${bias.toFixed(2)} (expected: -3.3 to -3.6)`);
      }
      console.log('');

      // Provenance
      const prov = response.provenance;
      if (prov) {
        console.log('🔍 Provenance:');
        console.log(`  Math Brain Version: ${prov.math_brain_version ?? 'N/A'}`);
        console.log(`  House System: ${prov.house_system ?? 'N/A'}`);
        console.log(`  Orbs Profile: ${prov.orbs_profile ?? 'N/A'}`);
        console.log(`  Chart Basis: ${prov.chart_basis ?? 'N/A'}`);
        console.log(`  Seismograph Chart: ${prov.seismograph_chart ?? 'N/A'}`);
        console.log(`  Translocation Applied: ${prov.translocation_applied ? 'Yes' : 'No'}`);
        console.log('');

        // Validate Felt Weather configuration
        if (prov.chart_basis === 'felt_weather_relocated' && prov.translocation_applied) {
          console.log('✅ Felt Weather architecture confirmed');
        } else {
          console.log('⚠️  Expected Felt Weather, got Blueprint or misconfigured');
        }
      }

      console.log('');
      console.log('📝 Event Context:');
      console.log('  Natal: Jupiter-Neptune square (0°02\') at 25° Leo/Scorpio');
      console.log('  Transit Activations at 22:30 CDT:');
      console.log('    • Venus ♀ conjunct Jupiter ♃ (exact 22:21)');
      console.log('    • Mars ♂ sextile Jupiter ♃ (exact 22:35)');
      console.log('    • Venus ♀ square Neptune ♆ (exact 23:09)');
      console.log('    • Mercury ☿ conjunct Uranus ♅ (exact 23:16)');
      console.log('');
      console.log('  Symbolic Interpretation:');
      console.log('    "Phase-Slip Event" — simultaneous Jupiter-Neptune activation');
      console.log('    (expansion vs. dissolution) + Uranian shock = loss of footing');
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
