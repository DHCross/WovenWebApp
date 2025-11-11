// SRP Hook Stack Diagnostic Tool
// =============================
// Tests the integration between Math Brain (quantitative) and Poetic Brain (symbolic)
const { buildHookStack } = require('../src/feedback/hook-stack-composer');

// Test Configuration
// -----------------
process.env.ENABLE_SRP = 'true';  // Enable SRP enrichment
const TEST_CONFIG = {
  minIntensity: 7,    // Lowered to capture more aspects (default: 10)
  maxOrb: 3.0,        // Moderate tolerance for testing
  maxHooks: 5,        // Increased to show more hooks
  debug: true         // Show detailed diagnostic info
};

// Test Aspects
// -----------
// Each aspect tests different SRP templates and resonance states
const testAspects = [
  // Sun-Uranus: Tests innovation/chaos archetype with Well-Balanced resonance
  {
    planet1: 'Sun',
    planet2: 'Uranus',
    name: 'conjunction',
    orb: 1.2,          // Tight orb, high intensity
    resonanceState: 'WB',
    source: 'test'
  },
  // Moon-Saturn: Tests emotional maturity/restriction with Over-Saturated resonance
  {
    planet1: 'Moon',
    planet2: 'Saturn',
    name: 'square',
    orb: 2.8,          // Medium orb
    resonanceState: 'OSR',
    source: 'test'
  },
  // Venus-Mars: Tests passion/conflict with Attenuated resonance
  {
    planet1: 'Venus',
    planet2: 'Mars',
    name: 'trine',
    orb: 1.5,          // Tight orb
    resonanceState: 'ABE',
    source: 'test'
  },
  // North Node: Tests multi-word body handling
  {
    planet1: 'Sun',
    planet2: 'North Node',
    name: 'sextile',
    orb: 2.1,
    resonanceState: 'WB',
    source: 'test'
  },
  // Chiron: Tests non-classical body integration
  {
    planet1: 'Moon',
    planet2: 'Chiron',
    name: 'opposition',
    orb: 2.5,
    resonanceState: 'ABE',
    source: 'test'
  }
];

console.log('=== SRP Hook Stack Diagnostic Run ===\n');
console.log(`Configuration: minIntensity=${TEST_CONFIG.minIntensity}, maxOrb=${TEST_CONFIG.maxOrb}°\n`);

// Build hook stack with diagnostic settings
const result = buildHookStack(testAspects, {
  maxHooks: TEST_CONFIG.maxHooks,
  minIntensity: TEST_CONFIG.minIntensity,
  orbCaps: {
    conjunction: TEST_CONFIG.maxOrb,
    square: TEST_CONFIG.maxOrb,
    trine: TEST_CONFIG.maxOrb,
    opposition: TEST_CONFIG.maxOrb,
    sextile: TEST_CONFIG.maxOrb * 0.8,  // Slightly tighter for minor aspects
    quincunx: TEST_CONFIG.maxOrb * 0.8,
    semisextile: TEST_CONFIG.maxOrb * 0.5
  }
});

// Diagnostic Output
console.log('=== Aspect Analysis ===');
console.log(`Total aspects tested: ${testAspects.length}`);
console.log(`Hooks generated: ${result.hooks.length} (${result.coverage} coverage)\n`);

// Detailed hook output
console.log('=== Generated Hooks ===');
result.hooks.forEach((hook, i) => {
  const srpInfo = hook.srp
    ? `\n  SRP: ${hook.srp.hingePhrase || 'No hinge phrase'}` +
      (hook.srp.restorationCue ? `\n  Shadow: ${hook.srp.restorationCue}` : '')
    : '\n  [No SRP data]';

  console.log(`
${i+1}. ${hook.title}
  Planets: ${hook.planets.join(' - ')}
  Type: ${hook.aspect_type} (${hook.orb.toFixed(1)}°)
  Resonance: ${hook.resonanceState}
  Intensity: ${hook.intensity.toFixed(1)}${srpInfo}`);
});

// Summary
console.log('\n=== Diagnostic Summary ===');
console.log(`Coverage: ${result.coverage.toUpperCase()}`);
console.log(`Tier 1 Orbs: ${result.tier_1_orbs}`);
console.log(`Total Intensity: ${result.total_intensity.toFixed(1)}`);
console.log('\n=== Test Complete ===');
console.log('Check the SRP enrichment in the hook details above.');
