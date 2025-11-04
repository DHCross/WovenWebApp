/**
 * SRP Integration Example
 * Demonstrates Phase 1: Hook enrichment with Light/Shadow ledger
 */

import { mapAspectToSRP, formatEnrichedHook, formatShadowRestoration } from './mapper';
import type { SRPEnrichment } from './types';

console.log('=== SRP × Poetic Brain Integration Demo ===\n');

// Example 1: Pure Fire aspect (WB state)
console.log('Example 1: Sun conjunct Mars (0.5°) - Within Boundary');
const ex1Enrichment = mapAspectToSRP('Sun conjunction Mars (0.5°)', 'WB');
if (ex1Enrichment) {
  console.log('Blend ID:', ex1Enrichment.blendId);
  console.log('Hinge Phrase:', ex1Enrichment.hingePhrase);
  console.log('Element Weave:', ex1Enrichment.elementWeave);
  console.log('Formatted:', formatEnrichedHook('Sun conjunction Mars (0.5°)', ex1Enrichment, 'WB'));
} else {
  console.log('No SRP mapping available');
}
console.log();

// Example 2: Fire-Earth square (ABE state with shadow)
console.log('Example 2: Sun square Saturn (2.1°) - At Boundary Edge');
const ex2Enrichment = mapAspectToSRP('Sun square Saturn (2.1°)', 'ABE');
if (ex2Enrichment) {
  console.log('Blend ID:', ex2Enrichment.blendId);
  console.log('Hinge Phrase:', ex2Enrichment.hingePhrase);
  console.log('Element Weave:', ex2Enrichment.elementWeave);
  if (ex2Enrichment.shadowRef) {
    console.log('Shadow ID:', ex2Enrichment.shadowRef.shadowId);
    console.log('Fracture Phrase:', ex2Enrichment.shadowRef.fracturePhrase);
    console.log('Collapse Mode:', ex2Enrichment.shadowRef.collapseMode);
  }
  console.log('Formatted:', formatEnrichedHook('Sun square Saturn (2.1°)', ex2Enrichment, 'ABE'));
  console.log('\nShadow Restoration:');
  console.log(formatShadowRestoration(ex2Enrichment));
} else {
  console.log('No SRP mapping available');
}
console.log();

// Example 3: Earth-Air aspect (OSR state)
console.log('Example 3: Saturn opposition Uranus (5.0°) - Outside Symbolic Range');
const ex3Enrichment = mapAspectToSRP('Saturn opposition Uranus (5.0°)', 'OSR');
if (ex3Enrichment) {
  console.log('Blend ID:', ex3Enrichment.blendId);
  console.log('Hinge Phrase:', ex3Enrichment.hingePhrase);
  console.log('Element Weave:', ex3Enrichment.elementWeave);
  if (ex3Enrichment.shadowRef) {
    console.log('Shadow ID:', ex3Enrichment.shadowRef.shadowId);
    console.log('Restoration Cue:', ex3Enrichment.shadowRef.restorationCue);
  }
  console.log('Formatted:', formatEnrichedHook('Saturn opposition Uranus (5.0°)', ex3Enrichment, 'OSR'));
} else {
  console.log('No SRP mapping available');
}
console.log();

// Example 4: Demonstrating batch enrichment
console.log('Example 4: Batch Hook Enrichment');
import { enrichHooks } from './mapper';

const sampleHooks = [
  { label: 'Sun square Mars (2.1°)', resonanceState: 'ABE' as const },
  { label: 'Venus trine Jupiter (0.3°)', resonanceState: 'WB' as const },
  { label: 'Moon opposition Saturn (4.5°)', resonanceState: 'OSR' as const },
];

const enriched = enrichHooks(sampleHooks);
enriched.forEach((hook, i) => {
  console.log(`\nHook ${i + 1}: ${hook.label}`);
  if (hook.srpEnrichment) {
    console.log(`  → ${hook.srpEnrichment.hingePhrase}`);
    console.log(`  → ${hook.srpEnrichment.elementWeave}`);
    if (hook.srpEnrichment.shadowRef) {
      console.log(`  → Shadow: ${hook.srpEnrichment.shadowRef.fracturePhrase}`);
    }
  } else {
    console.log('  → No SRP mapping');
  }
});

console.log('\n=== Integration Complete ===');
console.log('Phase 1: Hook enrichment with optional SRP data');
console.log('Backward compatible: old payloads still work');
console.log('Stateless: all data comes from Math Brain payload');
