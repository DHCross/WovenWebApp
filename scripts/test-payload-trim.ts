#!/usr/bin/env npx ts-node
/* eslint-disable no-console */
/**
 * Test script for payload trimming with real data
 * Run: npx ts-node scripts/test-payload-trim.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { trimPayloadForPoeticBrain, estimatePayloadReduction } from '../lib/export/trimPayloadForPoeticBrain';

const reportsDir = path.join(__dirname, '..', 'reports');

// Find JSON files
let files: string[] = [];
try {
  files = fs.readdirSync(reportsDir).filter((f: string) => f.endsWith('.json'));
} catch {
  console.log('Reports directory not found');
  process.exit(0);
}

if (files.length === 0) {
  console.log('No JSON files in reports/');
  process.exit(0);
}

const file = files[0];
console.log('Testing with:', file);
console.log('');

const filePath = path.join(reportsDir, file);
const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const trimmed = trimPayloadForPoeticBrain(payload);
const stats = estimatePayloadReduction(payload, trimmed);

console.log('Payload Reduction Results:');
console.log('==========================');
console.log(`Original size: ${(stats.originalSize / 1024).toFixed(1)} KB`);
console.log(`Trimmed size:  ${(stats.trimmedSize / 1024).toFixed(1)} KB`);
console.log(`Reduction:     ${stats.reductionPercent}`);
console.log(`Bytes saved:   ${(stats.reduction / 1024).toFixed(1)} KB`);
console.log('');

console.log('Trimmed payload structure:');
console.log(`- _format:                    ${trimmed._format}`);
console.log(`- _version:                   ${trimmed._version}`);
console.log(`- _range_dates:               ${JSON.stringify(trimmed._range_dates)}`);
console.log(`- _transit_days:              ${trimmed._transit_days}`);
console.log(`- person_a exists:            ${!!trimmed.person_a}`);
console.log(`- person_a.birth_data:        ${!!trimmed.person_a?.birth_data}`);
console.log(`- person_a.chart:             ${!!trimmed.person_a?.chart}`);
console.log(`- person_a.chart.positions:   ${Object.keys(trimmed.person_a?.chart?.positions || {}).length} planets`);
console.log(`- person_a.chart.house_cusps: ${trimmed.person_a?.chart?.house_cusps?.length || 0} cusps`);
console.log(`- transitsByDate dates:       ${Object.keys(trimmed.person_a?.chart?.transitsByDate || {}).length} days`);
console.log(`- person_b exists:            ${!!trimmed.person_b}`);
console.log(`- provenance exists:          ${!!trimmed.provenance}`);
console.log(`- provenance.persona_excerpt: ${!!trimmed.provenance?.persona_excerpt} (should be false)`);
console.log(`- daily_readings count:       ${trimmed.daily_readings?.length || 0}`);
console.log('');

// Verify critical data is preserved
console.log('Verification:');
if (!trimmed.person_a?.chart?.positions?.sun?.abs_pos) {
  console.log('❌ MISSING: sun.abs_pos');
} else {
  console.log(`✅ sun.abs_pos: ${trimmed.person_a.chart.positions.sun.abs_pos}`);
}

if (!trimmed.person_a?.chart?.house_cusps || trimmed.person_a.chart.house_cusps.length !== 12) {
  console.log('❌ MISSING: house_cusps (need 12)');
} else {
  console.log(`✅ house_cusps: 12 cusps present`);
}

if (trimmed.provenance?.persona_excerpt) {
  console.log('❌ FAIL: persona_excerpt should be removed');
} else {
  console.log('✅ persona_excerpt removed');
}

// Save trimmed output for inspection
const outputPath = path.join(__dirname, '..', 'trimmed-output-sample.json');
fs.writeFileSync(outputPath, JSON.stringify(trimmed, null, 2));
console.log('');
console.log(`Trimmed output saved to: ${outputPath}`);
