#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Hurricane Michael Benchmark Test — Consensus-Aligned
 * Event: 2018-10-10, ~17:30 CDT (Panama City, FL)
 *
 * Expected with moderated weights (2025-10-30):
 * - Magnitude: ~4.7–5.0 (peak structural intensity)
 * - Directional Bias: ~−3.0 to −4.0 (strong inward/compressive)
 * Notes:
 * - Use tight orbs for seismograph math to avoid wide trines inflating positivity.
 * - Prefer directional_bias over legacy valence.
 */

const fs = require('fs');
const path = require('path');

// Node 18+ has global fetch. If you're on older Node, uncomment:
// const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const API_URL = process.env.MATHBRAIN_URL
  || 'http://localhost:8888/.netlify/functions/astrology-mathbrain';

// Tight profile + weights identifier you expect the backend to honor.
// If backend ignores these, they’re harmless metadata you can still log.
const SEISMOGRAPH_CONFIG = {
  orbs_profile: 'wm-tight-2025-10',
  aspect_weights_version: '2025-10-30',
};

// ——— Payload ———
const payload = {
  mode: 'balance_meter',
  report_type: 'solo_balance_meter',
  context: { mode: 'balance_meter' },
  seismograph_config: SEISMOGRAPH_CONFIG,
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
  // Single-day window around landfall
  window: { start: '2018-10-10', end: '2018-10-10', step: 'daily' },
  indices: { window: { start: '2018-10-10', end: '2018-10-10', step: 'daily' }, request_daily: true },
  relocation_mode: 'A_local',
  translocation: {
    applies: true,
    method: 'A_local',
    mode: 'A_local',
    label: 'Panama City, FL',
    coords: { latitude: 30.166667, longitude: -85.666667, timezone: 'America/Chicago' },
    tz: 'America/Chicago',
  },
  frontstage_policy: { autogenerate: true, allow_symbolic_weather: true },
};

(async () => {
  console.log('🌀 Hurricane Michael Benchmark Test (Consensus-Aligned)');
  console.log('📅 Date: 2018-10-10');
  console.log('📍 Relocated: Panama City, FL (30.17°N, 85.67°W)');
  console.log('');
  console.log('Expected (moderated weights):');
  console.log('  • Magnitude: ~4.7–5.0');
  console.log('  • Directional Bias: ~−3.0 to −4.0');
  console.log('');

  console.log('POST', API_URL);
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  console.log(`Response status: ${res.status}`);
  const result = await res.json();

  // Flexible dig through likely shapes
  const personA = result?.person_a || result;
  const transitsByDate = personA?.chart?.transitsByDate || personA?.transitsByDate || {};
  const day = transitsByDate['2018-10-10'] || personA?.derived?.seismograph_day || {};
  const seismo = day?.seismograph
    || personA?.derived?.seismograph_summary
    || personA?.seismograph
    || {};

  // Prefer new field, then fallbacks
  const magnitude = seismo?.magnitude ?? null;
  const directionalBias =
    seismo?.directional_bias ??
    seismo?.bias_signed ??
    seismo?.valence ?? // last-resort legacy
    null;

  const coherence = seismo?.coherence ?? seismo?.narrative_coherence ?? seismo?.volatility ?? null;

  console.log('\n📊 Balance Meter Axes:');
  console.log(`  Magnitude:         ${magnitude ?? 'N/A'}`);
  console.log(`  Directional Bias:  ${directionalBias ?? 'N/A'}`);
  console.log(`  Coherence:         ${coherence ?? 'N/A'}`);
  console.log('');

  // Provenance / profiles (best-effort)
  const provenance = result?.provenance || personA?.provenance || {};
  const usedOrbsProfile =
    provenance?.orbs_profile || result?.orbs_profile || personA?.orbs_profile || '(unknown)';
  const weightsVersion =
    provenance?.aspect_weights_version || result?.aspect_weights_version || '(unknown)';

  console.log('🔎 Provenance:');
  if (provenance?.house_system) console.log(`  House System:       ${provenance.house_system}`);
  if (provenance?.zodiac_type) console.log(`  Zodiac:             ${provenance.zodiac_type}`);
  if (provenance?.tz)          console.log(`  Relocation TZ:      ${provenance.tz}`);
  console.log(`  Orbs Profile (req): ${SEISMOGRAPH_CONFIG.orbs_profile}`);
  console.log(`  Orbs Profile (res): ${usedOrbsProfile}`);
  console.log(`  Weights Version:    ${weightsVersion}`);
  console.log('');

  // Benchmark checks (moderated expectations)
  const magPass = (typeof magnitude === 'number') && (magnitude >= 4.5 && magnitude <= 5.1);
  const biasPass = (typeof directionalBias === 'number') && (directionalBias <= -3.0);

  console.log('✅ Benchmark Validation:');
  console.log(`  Magnitude ~5.0:           ${magPass ? '✅ PASS' : '❌ FAIL'} (actual: ${magnitude})`);
  console.log(`  Bias strong negative:      ${biasPass ? '✅ PASS' : '❌ FAIL'} (actual: ${directionalBias})`);
  console.log('');

  // Show aspects used (best-effort: prefer filtered/scoring list)
  const aspectsForDay =
    day?.aspects_for_scoring
    || day?.aspects
    || personA?.derived?.t2n_aspects
    || [];

  if (Array.isArray(aspectsForDay) && aspectsForDay.length) {
    console.log('🔩 Top transit aspects (by absolute weight):');
    const byPotency = (a) => {
      // prefer engine-provided potency if present, else |weight|
      const p = (typeof a.potency === 'number') ? Math.abs(a.potency)
        : (typeof a.weight === 'number') ? Math.abs(a.weight)
        : 0;
      return p;
    };

    aspectsForDay
      .slice()
      .sort((a, b) => byPotency(b) - byPotency(a))
      .slice(0, 12)
      .forEach((a) => {
        const p1 = a.transit || a.p1_name || '?';
        const p2 = a.target || a.p2_name || '?';
        const type = a.aspect || a.type || '?';
        const orb = (typeof a.orb === 'number') ? a.orb.toFixed(2) : '?';
        const w = (typeof a.weight === 'number') ? a.weight.toFixed(2) : '?';
        console.log(`  • ${p1} ${type} ${p2}  (orb: ${orb}°, weight: ${w})`);
      });
    console.log('');
  } else {
    console.log('⚠️  No aspect list available on this response shape.');
    console.log('');
  }

  // Persist full JSON for inspection
  const out = path.join(process.cwd(), 'hurricane-michael-benchmark-result.json');
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`📁 Full result saved to: ${out}\n`);

  // Exit code for CI
  if (magPass && biasPass) process.exit(0);
  process.exit(2);
})().catch((err) => {
  console.error('\n❌ Error:', err?.stack || err?.message || String(err));
  process.exit(1);
});
