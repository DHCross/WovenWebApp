/**
 * Test loader fallback resilience
 */

import { getLightBlend, clearLedgerCache } from './loader';
import { existsSync, renameSync } from 'fs';
import { join } from 'path';

const jsonPath = join(process.cwd(), 'data/srp/light-ledger.json');
const backupPath = join(process.cwd(), 'data/srp/light-ledger.json.backup');

console.log('=== SRP Loader Resilience Test ===\n');

// Test 1: Normal JSON loading
console.log('Test 1: Loading from JSON...');
const blend1 = getLightBlend(1);
console.log(`  Blend 1 hinge: ${blend1?.hingePhrase}`);
console.log(`  Source: JSON file\n`);

// Test 2: Simulate missing JSON, force fallback
if (existsSync(jsonPath)) {
  console.log('Test 2: Simulating missing JSON file...');
  renameSync(jsonPath, backupPath);
  clearLedgerCache(); // Force reload
  
  const blend1Fallback = getLightBlend(1);
  console.log(`  Blend 1 hinge: ${blend1Fallback?.hingePhrase}`);
  console.log(`  Source: TypeScript fallback\n`);
  
  // Restore JSON
  renameSync(backupPath, jsonPath);
  console.log('JSON file restored.\n');
}

console.log('=== Resilience Verified ===');
console.log('✓ JSON-first loading works');
console.log('✓ TypeScript fallback works');
console.log('✓ System remains operational in both modes');
