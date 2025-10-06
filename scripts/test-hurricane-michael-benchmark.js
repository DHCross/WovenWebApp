#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Hurricane Michael Benchmark Test
 * October 10, 2018 - 17:30 CST (landfall in Panama City, FL)
 * 
 * Expected:
 * - Magnitude: 5.0 (peak structural intensity)
 * - Valence: -4.96 to -5.0 (severe compression)
 * - Driver: Transiting Pluto in Capricorn → 2nd House (relocated)
 */

const http = require('http');

const payload = {v node

/**
 * Hurricane Michael Benchmark Test
 * October 10, 2018 - 17:30 CST (landfall in Panama City, FL)
 * 
 * Expected:
 * - Magnitude: 5.0 (peak structural intensity)
 * - Valence: -4.96 to -5.0 (severe compression/crisis)
 * - Driver: Transiting Pluto in Capricorn → 2nd House (relocated)
 */

const payload = {
  mode: 'balance_meter',
  personA: {
    name: 'Dan',
    year: 1973,
    month: 7,
    day: 24,
    hour: 14,
    minute: 30,
    latitude: 40.016700,
    longitude: -75.300000,
    timezone: 'America/New_York',
    city: 'Bryn Mawr',
    nation: 'US',
    zodiac_type: 'Tropic',
  },
  // Hurricane Michael landfall: Oct 10, 2018, 17:30 CST
  window: {
    start: '2018-10-10',
    end: '2018-10-10',
    step: 'daily',
  },
  // Relocation to Panama City, FL (where the hurricane hit)
  relocation_mode: 'A_local',
  translocation: {
    applies: true,
    method: 'A_local',
    mode: 'A_local',
    label: 'Panama City, FL',
    coords: {
      latitude: 30.166667,
      longitude: -85.666667,
      timezone: 'America/Chicago', // CST
    },
    tz: 'America/Chicago',
  },
  // Balance Meter configuration
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
};

const API_URL = 'http://localhost:8888/.netlify/functions/astrology-mathbrain';

console.log('🌀 Hurricane Michael Benchmark Test');
console.log('📅 Date: October 10, 2018, 17:30 CST');
console.log('📍 Location: Panama City, FL (30.17°N, 85.67°W)');
console.log('');
console.log('Expected Results:');
console.log('  • Magnitude: 5.0 (peak structural intensity)');
console.log('  • Valence: -4.96 to -5.0 (severe compression)');
console.log('  • Driver: Transiting Pluto → Natal positions (relocated to 2nd House)');
console.log('');
console.log('Making API request...\n');

fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
  .then((res) => {
    console.log(`Response status: ${res.status}`);
    return res.json();
  })
  .then((result) => {
    console.log('\n📊 Results:\n');

    // Extract Balance Meter data
    const personA = result?.person_a || result;
    const summary = personA?.summary || personA?.derived?.seismograph_summary || {};
    const transitsByDate = personA?.chart?.transitsByDate || {};
    const dayData = transitsByDate['2018-10-10'] || {};
    const seismograph = dayData?.seismograph || summary;

    console.log('Balance Meter Axes:');
    console.log(`  Magnitude:         ${seismograph?.magnitude ?? 'N/A'}`);
    console.log(`  Directional Bias:  ${seismograph?.bias_signed ?? seismograph?.valence ?? 'N/A'}`);
    console.log(`  Volatility:        ${seismograph?.volatility ?? 'N/A'}`);
    console.log(`  Coherence:         ${seismograph?.coherence ?? 'N/A'}`);
    console.log(`  SFD:               ${seismograph?.sfd ?? seismograph?.sfd_cont ?? 'N/A'}`);
    console.log('');

    // Check if magnitude is close to 5.0
    const magnitude = seismograph?.magnitude;
    const valence = seismograph?.bias_signed ?? seismograph?.valence;

    if (magnitude !== null && magnitude !== undefined) {
      const magnitudeMatch = Math.abs(magnitude - 5.0) < 0.5;
      const valenceMatch = valence !== null && valence < -4.0;

      console.log('Benchmark Validation:');
      console.log(`  ✓ Magnitude close to 5.0: ${magnitudeMatch ? '✅ PASS' : '❌ FAIL'} (actual: ${magnitude})`);
      console.log(`  ✓ Valence strongly negative: ${valenceMatch ? '✅ PASS' : '❌ FAIL'} (actual: ${valence})`);
      console.log('');
    }

    // Show transit aspects
    const aspects = dayData?.aspects || personA?.derived?.t2n_aspects || [];
    if (aspects.length > 0) {
      console.log('Transit Aspects (showing top 10 by potency):');
      aspects
        .sort((a, b) => (b.weight || 0) - (a.weight || 0))
        .slice(0, 10)
        .forEach((aspect) => {
          const transit = aspect.transit || aspect.p1_name || '?';
          const aspectName = aspect.aspect || '?';
          const natal = aspect.target || aspect.p2_name || '?';
          const orb = aspect.orb?.toFixed(2) || '?';
          const weight = aspect.weight?.toFixed(2) || '?';
          console.log(`    ${transit} ${aspectName} ${natal} (orb: ${orb}°, weight: ${weight})`);
        });
      console.log('');
    }

    // Show relocation summary
    const relocationSummary = result?.relocation_summary || personA?.relocation_summary;
    if (relocationSummary) {
      console.log('Relocation:');
      console.log(`  Mode: ${relocationSummary.mode}`);
      console.log(`  Label: ${relocationSummary.label || 'N/A'}`);
      console.log(`  Status: ${relocationSummary.status || 'N/A'}`);
      console.log('');
    }

    // Show provenance
    const provenance = result?.provenance || personA?.provenance;
    if (provenance) {
      console.log('Provenance:');
      console.log(`  House System: ${provenance.house_system || 'N/A'}`);
      console.log(`  Zodiac: ${provenance.zodiac_type || 'N/A'}`);
      console.log(`  Relocation TZ: ${provenance.tz || 'N/A'}`);
      console.log('');
    }

    // Write full result to file for inspection
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, 'hurricane-michael-benchmark-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`📁 Full result saved to: ${outputPath}`);
  })
  .catch((err) => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });
