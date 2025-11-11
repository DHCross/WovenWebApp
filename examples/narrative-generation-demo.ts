/**
 * Demo: Phase 1, Task 1.2 - Mirror Directive & Solo Narrative Generation
 *
 * This example demonstrates the complete flow:
 * 1. Build mandates from chart aspects
 * 2. Generate solo mirror narrative
 * 3. Display structured output
 */

import { buildMandatesForChart, generateSoloMirrorNarrative } from '../lib/poetics';

// Sample chart data with multiple aspects
const sampleChart = {
  aspects: [
    {
      planet_a: 'Sun',
      planet_b: 'Moon',
      type: 'conjunction',
      orb: 0.8,
      applying: true,
    },
    {
      planet_a: 'Venus',
      planet_b: 'Mars',
      type: 'opposition',
      orb: 1.5,
      applying: true,
    },
    {
      planet_a: 'Mercury',
      planet_b: 'Neptune',
      type: 'square',
      orb: 2.1,
      applying: true,
    },
    {
      planet_a: 'Saturn',
      planet_b: 'Pluto',
      type: 'conjunction',
      orb: 0.5,
      applying: true,
    },
    {
      planet_a: 'Sun',
      planet_b: 'Saturn',
      type: 'square',
      orb: 2.5,
      applying: true,
    },
  ],
  index: {
    Sun: 0,
    Moon: 1,
    Mercury: 2,
    Venus: 3,
    Mars: 4,
    Jupiter: 5,
    Saturn: 6,
    Uranus: 7,
    Neptune: 8,
    Pluto: 9,
  },
};

console.log('='.repeat(80));
console.log('Phase 1, Task 1.2: Solo Mirror Narrative Generation Demo');
console.log('='.repeat(80));
console.log();

// Step 1: Extract mandates from chart
console.log('Step 1: Extracting mandates from chart aspects...');
const mandates = buildMandatesForChart('Sample Person', sampleChart, { limit: 5 });

console.log(`✓ Extracted ${mandates.mandates.length} mandates for ${mandates.personName}`);
console.log();

// Display mandate summary
console.log('Mandate Summary:');
console.log('-'.repeat(80));
mandates.mandates.forEach((mandate, index) => {
  const { archetypes, geometry, diagnostic } = mandate;
  console.log(`${index + 1}. ${archetypes.a.name} ${geometry.aspectType} ${archetypes.b.name}`);
  console.log(`   Orb: ${geometry.orbDegrees.toFixed(1)}° | Weight: ${geometry.weight.toFixed(2)} | Diagnostic: ${diagnostic}`);
});
console.log();

// Step 2: Generate narrative from mandates
console.log('Step 2: Generating solo mirror narrative...');
const narrative = generateSoloMirrorNarrative(mandates);
console.log('✓ Narrative generated successfully');
console.log();

// Display structured components
console.log('='.repeat(80));
console.log('NARRATIVE COMPONENTS');
console.log('='.repeat(80));
console.log();

console.log('Hook Stack:');
console.log('-'.repeat(80));
console.log(`Polarity 1: ${narrative.hookStack.polarity1.title}`);
console.log(`  ${narrative.hookStack.polarity1.description}`);
console.log();
console.log(`Polarity 2: ${narrative.hookStack.polarity2.title}`);
console.log(`  ${narrative.hookStack.polarity2.description}`);
console.log();

console.log('Polarity Cards:');
console.log('-'.repeat(80));
narrative.polarityCards.forEach((card, index) => {
  console.log(`${index + 1}. ${card.name}`);
  console.log(`   Active: ${card.activeSide.substring(0, 60)}...`);
  console.log(`   Both: ${card.bothSides.substring(0, 60)}...`);
  console.log();
});

console.log('='.repeat(80));
console.log('FULL NARRATIVE OUTPUT');
console.log('='.repeat(80));
console.log();
console.log(narrative.fullNarrative);
console.log();

console.log('='.repeat(80));
console.log('Demo Complete!');
console.log('='.repeat(80));

export { sampleChart, mandates, narrative };
