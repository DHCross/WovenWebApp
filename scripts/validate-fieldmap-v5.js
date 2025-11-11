#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Validate a FieldMap JSON file against the v5 checklist
 * Usage: node scripts/validate-fieldmap-v5.js <path-to-json>
 */
const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error(`FAIL: ${msg}`);
}
function pass(msg) {
  console.log(`PASS: ${msg}`);
}

function get(obj, pathStr) {
  return pathStr.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function hasIanaTz(tz) {
  return typeof tz === 'string' && tz.includes('/') && !tz.startsWith('US/');
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/validate-fieldmap-v5.js <path-to-json>');
    process.exit(2);
  }
  const raw = fs.readFileSync(path.resolve(file), 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.error('Could not parse JSON:', e.message);
    process.exit(2);
  }

  let errors = 0;

  // 1) orbs_profile
  const orbsCandidates = [
    get(json, 'map._meta.orbs_profile'),
    get(json, 'field._meta.orbs_profile'),
    get(json, '_meta.orbs_profile'),
  ].filter(Boolean);
  const orbs = orbsCandidates[0];
  if (orbs === 'wm-tight-2025-11-v5') pass('orbs_profile is wm-tight-2025-11-v5');
  else {
    errors++; fail(`orbs_profile is '${orbs}' (expected wm-tight-2025-11-v5)`);
  }

  // 2) balance_meter_version
  const bmv = get(json, 'field._meta.balance_meter_version') || get(json, '_meta.balance_meter_version');
  if (bmv === '5.0') pass('balance_meter_version is 5.0');
  else { errors++; fail(`balance_meter_version is '${bmv}' (expected 5.0)`); }

  // 3) timezone IANA
  const tz = get(json, 'map._meta.relocation_mode.timezone') || get(json, 'field._meta.relocation_mode.timezone') || get(json, '_meta.timezone');
  if (hasIanaTz(tz)) pass(`timezone is IANA (${tz})`);
  else { errors++; fail(`timezone '${tz}' is not IANA (e.g., America/Chicago)`); }

  // 4) relational artifacts
  if (json.relational_summary) { errors++; fail('Found relational_summary (should be absent for solo FieldMap)'); } else pass('No relational_summary');
  const people = get(json, 'map.people');
  if (Array.isArray(people) && people.length > 0 && Array.isArray(people[0].planets) && people[0].planets.length === 0) {
    errors++; fail('people[0].planets is empty (legacy artifact)');
  } else {
    pass('No empty people[].planets array');
  }

  // 5) provenance
  const prov = json.provenance || get(json, 'field.provenance') || get(json, 'map.provenance');
  if (!prov) { errors++; fail('provenance block missing'); }
  else {
    let ok = true;
    if (prov.chart_basis !== 'felt_weather_relocated') { ok = false; fail(`provenance.chart_basis='${prov.chart_basis}' (expected felt_weather_relocated)`); }
    if (prov.seismograph_chart !== 'relocated') { ok = false; fail(`provenance.seismograph_chart='${prov.seismograph_chart}' (expected relocated)`); }
    if (prov.translocation_applied !== true) { ok = false; fail(`provenance.translocation_applied='${prov.translocation_applied}' (expected true)`); }
    if (ok) pass('provenance block present and valid');
  }

  // 6) volatility: must NOT be present in raw
  const hasRawVol = json.volatility !== undefined || get(json, 'field.volatility') !== undefined || get(json, 'map.volatility') !== undefined;
  if (hasRawVol) { errors++; fail('Found raw volatility field (should be computed downstream)'); } else pass('No raw volatility field present');

  // 7) schema/version tag
  const schemaVersion = get(json, '_meta.schema_version') || get(json, '_meta.schema');
  if (schemaVersion === 'wm-fieldmap-v5') pass('schema_version is wm-fieldmap-v5');
  else { errors++; fail(`schema_version is '${schemaVersion}' (expected wm-fieldmap-v5)`); }

  // 8) summary
  if (errors === 0) {
    console.log('RESULT: PASS (v5-compliant fieldmap)');
    process.exit(0);
  } else {
    console.error(`RESULT: FAIL (${errors} issue${errors===1?'':'s'})`);
    process.exit(1);
  }
}

main();
