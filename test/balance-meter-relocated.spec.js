/**
 * Minimal schema sanity check for Balance Meter payloads.
 * Run with: node test/balance-meter-relocated.spec.js
 */

const assert = (cond, msg) => { if (!cond) { throw new Error(msg); } };

(async function(){
  const fn = require('../lib/server/astrology-mathbrain.js');

  // Force real path if key exists to validate provenance stamping
  if (process.env.RAPIDAPI_KEY) process.env.MB_MOCK = 'false';
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  const body = {
    personA: {
      name: 'DH Cross',
      year: 1973, month: 7, day: 24, hour: 14, minute: 30,
      latitude: 40.0167, longitude: -75.3000, timezone: 'America/Chicago'
    },
    window: { start: '2025-09-01', end: '2025-09-01', step: 'daily' },
    context: { mode: 'balance_meter' },
    relocation_mode: 'A_local',
    orbs_profile: 'wm-spec-2025-09',
    custom_location: { latitude: 30.1588, longitude: -85.6602, timezone: 'America/Chicago' },
    houses_system_identifier: 'Placidus'
  };

  const event = { httpMethod: 'POST', body: JSON.stringify(body) };
  const res = await fn.handler(event);
  assert(res.statusCode === 200, `Unexpected status: ${res.statusCode}`);
  const json = JSON.parse(res.body);

  // If mock path, skip provenance assertions (networkless dev)
  if (json?.provenance && json.provenance.source === 'mock') {
    console.log('⚠️  Running in mock mode; skipping provenance/drivers assertions');
    console.log('✅ balance-meter-relocated.spec passed (mock)');
    process.exit(0);
  }

  // Provenance fields
  assert(json.provenance, 'Missing provenance');
  assert(json.provenance.house_system, 'Missing provenance.house_system');
  assert(json.provenance.orbs_profile, 'Missing provenance.orbs_profile');
  assert(json.provenance.timezone_db_version, 'Missing provenance.timezone_db_version');
  assert(json.provenance.relocation_mode, 'Missing provenance.relocation_mode');

  // Seismograph drivers presence (if daily data exists)
  const daily = json?.person_a?.chart?.transitsByDate;
  if (daily && typeof daily === 'object'){
    const firstKey = Object.keys(daily)[0];
    if (firstKey){
      const d = daily[firstKey];
      assert(Array.isArray(d.drivers), 'drivers[] missing on day');
    }
  }

  console.log('✅ balance-meter-relocated.spec passed');
})().catch(e=>{ console.error('❌ Test failed:', e.message); process.exit(1); });
