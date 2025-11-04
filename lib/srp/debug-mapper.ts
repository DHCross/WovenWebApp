/**
 * Debug: Why isn't aspect parsing working?
 */

import { parseAspectLabel, mapAspectToSRP } from './mapper';

console.log('Testing aspect pattern parsing:\n');

const tests = [
  'Sun conjunction Mars (0.5°)',
  'Sun square Saturn (2.1°)',
  'Sun square Mars (2.1°)',
  'Venus trine Jupiter (0.3°)',
  'Saturn opposition Uranus (5.0°)',
];

tests.forEach(label => {
  console.log(`Input: "${label}"`);
  const parsed = parseAspectLabel(label);
  console.log('Parsed:', JSON.stringify(parsed, null, 2));
  
  const enrichment = mapAspectToSRP(label, 'WB');
  console.log('Enrichment:', enrichment ? 'SUCCESS' : 'FAILED');
  console.log('---\n');
});
