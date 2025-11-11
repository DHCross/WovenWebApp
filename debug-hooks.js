const { composeHookStack, calculateAspectIntensity } = require('./src/feedback/hook-stack-composer');

// Enable debug logging
process.env.DEBUG = 'true';

// Aspect type to cap mapping
const ASPECT_CAPS = {
  'conjunction': 4.0,
  'square': 4.0,
  'trine': 4.0,
  'opposition': 4.0,
  'sextile': 3.0,
  'quincunx': 1.5,
  'semisquare': 1.5,
  'semisextile': 1.0
};

// Mock result with the structure expected by extractAspectsFromResult
const mockResult = {
  person_a: {
    aspects: [
      // This aspect matches the sun_mars pattern in HOOK_TEMPLATES
      {
        planet1: 'Sun',
        planet2: 'Mars',
        name: 'square',
        type: 'square',
        orb: 2.5,  // Tighter orb for higher intensity
        resonanceState: 'WB',
        source: 'natal_a'
      },
      // This aspect matches the moon_saturn pattern in HOOK_TEMPLATES
      {
        planet1: 'Moon',
        planet2: 'Saturn',
        name: 'conjunction',
        type: 'conjunction',
        orb: 1.8,  // Tighter orb for higher intensity
        resonanceState: 'OSR',
        source: 'natal_a'
      },
      // This aspect matches the venus_mars pattern in HOOK_TEMPLATES
      {
        planet1: 'Venus',
        planet2: 'Mars',
        name: 'trine',
        type: 'trine',
        orb: 1.2,  // Very tight orb for high intensity
        resonanceState: 'WB',
        source: 'natal_a'
      }
    ],
    chart: {
      transitsByDate: {}
    }
  }
};

// Test aspect intensity calculation
console.log('Testing aspect intensity...');
mockResult.person_a.aspects.forEach((aspect, i) => {
  const intensity = calculateAspectIntensity({
    ...aspect,
    _orbCaps: ASPECT_CAPS,
    first_planet: aspect.planet1,
    second_planet: aspect.planet2
  });
  console.log(`Aspect ${i + 1}: ${aspect.planet1} ${aspect.type} ${aspect.planet2} (${aspect.orb}°)`);
  console.log(`  Intensity: ${intensity}`);
});

// Test hook stack composition with lower threshold
console.log('\nTesting hook stack composition with minIntensity=5...');

// Add more detailed logging for the input data
console.log('\nInput Data Structure:');
console.log(JSON.stringify({
  person_a: {
    aspects_count: mockResult.person_a.aspects.length,
    has_chart: !!mockResult.person_a.chart
  }
}, null, 2));

// Run the hook stack composition
const hooks = composeHookStack(mockResult, {
  maxHooks: 3,
  minIntensity: 5,  // Lower threshold to test if hooks are generated
  orbCaps: ASPECT_CAPS,
  debug: true  // Enable debug output if supported
});

// Add more detailed logging for the output
console.log('\nHook Stack Result:');
console.log(JSON.stringify({
  ...hooks,
  // Add a summary of the hooks for easier reading
  hooks_summary: hooks.hooks.map(hook => ({
    title: hook.title,
    intensity: hook.intensity,
    planets: hook.planets,
    aspect_type: hook.aspect_type
  }))
}, null, 2));

// Add a final summary
console.log('\nSummary:');
console.log(`- Total aspects processed: ${hooks.source_aspects_count || 0}`);
console.log(`- Hooks generated: ${hooks.hooks ? hooks.hooks.length : 0}`);
console.log(`- Coverage: ${hooks.coverage || 'unknown'}`);
console.log(`- Min intensity threshold: ${hooks.provenance?.min_intensity_threshold || 'unknown'}`);
