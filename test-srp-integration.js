// Test SRP integration through hook-stack-composer
const {
  composeHookStack,
  buildHookStack,
  calculateAspectIntensity,
  normAspectType,
  capFor
} = require('./src/feedback/hook-stack-composer');

// Enable debug logging
process.env.DEBUG = 'true';

// Log the version of the hook stack composer
console.log('Hook Stack Composer Test');
console.log('========================');
console.log(`Current time: ${new Date().toISOString()}`);
console.log('Node version:', process.version);
console.log('');

// Aspect type to cap mapping - using the same as in hook-stack-composer
const DEFAULT_V5_CAPS = {
  // majors: 4° for general, but engine may tighten for points
  conjunction: 3.5,
  square: 4.0,
  trine: 4.0,
  opposition: 4.0,
  sextile: 3.0,
  quincunx: 1.5,
  semisquare: 1.5,
  semisextile: 1.0,
  'semi-square': 1.5,
  'semi-sextile': 1.0
};

// Helper function to extract aspects from our test data structure
function extractAspects(result) {
  if (!result || !result.aspects) return [];

  return result.aspects.map(asp => {
    // Create a properly formatted aspect object
    const aspect = {
      planet1: asp.planet1,
      planet2: asp.planet2,
      first_planet: asp.planet1,
      second_planet: asp.planet2,
      name: asp.name,
      type: asp.type || asp.name.toLowerCase(),
      orb: asp.orb,
      resonanceState: asp.resonanceState,
      is_transit: asp.is_transit || false,
      source: asp.source || 'natal',
      _orbCaps: DEFAULT_V5_CAPS
    };

    // Calculate additional properties
    const aspectType = normAspectType(aspect.type);
    const p1 = aspect.planet1.toLowerCase();
    const p2 = aspect.planet2.toLowerCase();
    const cap = capFor(aspectType, p1, p2, DEFAULT_V5_CAPS);

    // Add calculated properties
    aspect.cap = cap;
    aspect.withinOrb = aspect.orb <= cap;
    aspect.orbFraction = aspect.withinOrb ? (cap - aspect.orb) / cap : 0;

    // Calculate intensity
    const intensity = calculateAspectIntensity(aspect);
    aspect.intensity = intensity;

    return aspect;
  });
}

// Enable SRP for this test
process.env.ENABLE_SRP = 'true';

// Define planet types for weighting
const PERSONAL = new Set(['sun', 'moon', 'mercury', 'venus', 'mars']);
const OUTER = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);

// Mock result data - using the format expected by the hook stack composer
const mockResult = {
  aspects: [
    {
      planet1: 'Sun',
      planet2: 'Moon',
      name: 'square',
      type: 'square',
      orb: 3.2,
      resonanceState: 'WB',
      is_transit: false,
      first_planet: 'Sun',
      second_planet: 'Moon'
    },
    {
      planet1: 'Mars',
      planet2: 'Jupiter',
      name: 'trine',
      type: 'trine',
      orb: 1.8,
      resonanceState: 'OSR',
      is_transit: false,
      first_planet: 'Mars',
      second_planet: 'Jupiter'
    },
    {
      planet1: 'Venus',
      planet2: 'Saturn',
      name: 'opposition',
      type: 'opposition',
      orb: 0.9,
      resonanceState: 'ABE',
      is_transit: false,
      first_planet: 'Venus',
      second_planet: 'Saturn'
    },
    {
      planet1: 'Mercury',
      planet2: 'Pluto',
      name: 'square',
      type: 'square',
      orb: 2.5,
      resonanceState: 'WB',
      is_transit: false,
      first_planet: 'Mercury',
      second_planet: 'Pluto'
    },
    {
      planet1: 'Jupiter',
      planet2: 'Sun',
      name: 'sextile',
      type: 'sextile',
      orb: 1.2,
      resonanceState: 'OSR',
      is_transit: false,
      first_planet: 'Jupiter',
      second_planet: 'Sun'
    }
  ]
};

console.log('Testing Hook Stack Composer...\n');
console.log('Input aspects:');
console.log(JSON.stringify(mockResult.aspects, null, 2));

// Test aspect extraction and intensity calculation
console.log('\n=== Testing Aspect Extraction and Intensity ===');
const extractedAspects = extractAspects(mockResult);

// Log each aspect with detailed information
extractedAspects.forEach((asp, i) => {
  const p1 = asp.planet1.padEnd(8);
  const p2 = asp.planet2.padEnd(8);
  const aspectType = (asp.type || '').padEnd(10);
  const orb = asp.orb.toFixed(2).padStart(5);
  const cap = asp.cap.toFixed(2).padStart(5);
  const withinOrb = asp.withinOrb ? 'YES'.green : 'NO '.red;
  const intensity = asp.intensity.toFixed(2).padStart(6);
  const resonance = (asp.resonanceState || 'NONE').padEnd(4);

  console.log(`[${i}] ${p1} ${aspectType} ${p2}  Orb: ${orb}° / ${cap}°  Within: ${withinOrb}  Intensity: ${intensity}  Resonance: ${resonance}`);

  // Log detailed calculation for one aspect
  if (i === 0) {
    console.log('\n  Example calculation for above aspect:');
    console.log('  ---------------------------------');
    console.log(`  Aspect type: ${asp.type}`);
    console.log(`  Planets: ${asp.planet1} - ${asp.planet2}`);
    console.log(`  Orb: ${asp.orb}° (cap: ${asp.cap}°)`);
    console.log(`  Within orb: ${asp.withinOrb}`);
    console.log(`  Orb fraction: ${asp.orbFraction.toFixed(2)}`);

    // Calculate components of intensity
    const aspectType = normAspectType(asp.type);
    const p1 = asp.planet1.toLowerCase();
    const p2 = asp.planet2.toLowerCase();
    const orb = asp.orb;
    const cap = asp.cap;

    // Calculate orb weight (10 at exact, 4 at cap)
    const tightness = Math.max(0, Math.min(1, (cap - Math.abs(orb)) / cap));
    const orbWeight = Math.max(4, 4 + 6 * tightness);

    // Aspect weights from the code
    const aspectWeights = {
      'conjunction': 1.0,
      'opposition': 1.0,
      'square': 0.9,
      'trine': 0.8,
      'sextile': 0.55,
      'quincunx': 0.35,
      'sesquiquadrate': 0.45,
      'semisquare': 0.45,
      'semisextile': 0.2,
      'quintile': 0.3,
      'biquintile': 0.3
    };

    const aspectWeight = aspectWeights[aspectType] || 0.2;

    // Planet weighting
    let planetWeight = 1;
    const personalTouch = PERSONAL.has(p1) || PERSONAL.has(p2);
    const outerTouch = OUTER.has(p1) || OUTER.has(p2);
    if (personalTouch) planetWeight *= 1.4;
    if (outerTouch)    planetWeight *= 1.25;
    if (isPointish(p1) || isPointish(p2)) planetWeight *= 0.9;

    console.log('\n  Intensity calculation:');
    console.log('  -----------------');
    console.log(`  Orb weight: ${orbWeight.toFixed(2)} (based on tightness: ${tightness.toFixed(2)})`);
    console.log(`  Aspect weight (${aspectType}): ${aspectWeight}`);
    console.log(`  Planet weight: ${planetWeight.toFixed(2)} (personal: ${personalTouch}, outer: ${outerTouch})`);
    console.log(`  Final intensity: ${orbWeight.toFixed(2)} * ${aspectWeight} * ${planetWeight.toFixed(2)} = ${asp.intensity.toFixed(2)}`);
    console.log('  ---------------------------------\n');
  }
});

// Test hook building with more detailed logging
console.log('\n=== Testing Hook Building ===');
const hookOptions = {
  maxHooks: 5, // Increased to see more hooks
  minIntensity: 0, // Start with 0 to see all hooks, then adjust
  orbCaps: DEFAULT_V5_CAPS,
  orbProfile: 'wm-tight-2025-11-v5'
};

console.log('Hook building options:');
console.log(JSON.stringify(hookOptions, null, 2));

// Log each aspect's intensity and cap info
console.log('\nAspect Intensities and Caps:');
extractedAspects.forEach((asp, i) => {
  const p1 = asp.planet1.padEnd(8);
  const p2 = asp.planet2.padEnd(8);
  const aspectType = (asp.type || '').padEnd(10);
  const orb = asp.orb.toFixed(2).padStart(5);
  const cap = asp.cap.toFixed(2).padStart(5);
  const withinOrb = asp.withinOrb ? 'YES'.green : 'NO '.red;
  const intensity = asp.intensity.toFixed(2).padStart(6);
  const resonance = (asp.resonanceState || 'NONE').padEnd(4);

  console.log(`[${i}] ${p1} ${aspectType} ${p2}  Orb: ${orb}° / ${cap}°  Within: ${withinOrb}  Intensity: ${intensity}  Resonance: ${resonance}`);
});

console.log('\nBuilding hooks...');
const builtHooks = buildHookStack(extractedAspects, hookOptions);

console.log('\nHook Building Results:');
console.log('====================');

if (builtHooks && builtHooks.hooks && builtHooks.hooks.length > 0) {
  console.log(`\n✅ Generated ${builtHooks.hooks.length} hooks:`);
  console.log('----------------------------------------');

  builtHooks.hooks.forEach((hook, i) => {
    console.log(`\n[${i}] ${hook.title}`);
    console.log('   ' + '-'.repeat(hook.title.length + 4));
    console.log(`   Description: ${hook.description}`);
    console.log(`   Intensity: ${hook.intensity?.toFixed(2) || 'N/A'}`);
    console.log(`   Orb: ${hook.orb?.toFixed(2) || 'N/A'}°`);
    console.log(`   Aspect Type: ${hook.aspect_type || 'N/A'}`);

    if (hook.planets && hook.planets.length > 0) {
      console.log(`   Planets: ${hook.planets.join(' - ')}`);
    }

    if (hook.srp) {
      console.log(`   SRP Data: ${JSON.stringify(hook.srp, null, 2).replace(/\n/g, '\n             ')}`);
    }

    if (hook.is_tier_1) {
      console.log('   🔥 Tier 1 Aspect (very tight orb)');
    }
  });

  console.log('\nMetadata:');
  console.log('---------');
  console.log(JSON.stringify({
    composer: builtHooks.metadata?.composer || 'unknown',
    version: builtHooks.metadata?.version || 'unknown',
    min_intensity_threshold: builtHooks.metadata?.min_intensity_threshold ?? hookOptions.minIntensity,
    tier_1_threshold: builtHooks.metadata?.tier_1_threshold || '1.0°',
    orb_profile: builtHooks.metadata?.orb_profile || 'default',
    diversity_rules: builtHooks.metadata?.diversity_rules || 'default'
  }, null, 2));

} else {
  console.log('\n❌ No hooks generated');
  console.log('-------------------');

  if (!builtHooks) {
    console.log('buildHookStack returned undefined or null');
  } else if (!builtHooks.hooks) {
    console.log('No hooks array in the result');
    console.log('Built hooks object:', JSON.stringify(builtHooks, null, 2));
  } else {
    console.log('hooks array is empty');
    console.log('All aspects were filtered out or did not meet the criteria');
  }

  // Log the builtHooks object for debugging
  console.log('\nFull buildHookStack result:');
  console.log(JSON.stringify(builtHooks || {}, null, 2));

  // Check if aspects are being filtered out by intensity
  const minIntensity = hookOptions.minIntensity || 0;
  const filteredAspects = extractedAspects.filter(asp => asp.intensity >= minIntensity);

  console.log(`\nAspects that should pass intensity filter (>= ${minIntensity}): ${filteredAspects.length}/${extractedAspects.length}`);

  if (filteredAspects.length > 0) {
    console.log('\nAspects that should generate hooks:');
    filteredAspects.forEach(asp => {
      console.log(`- ${asp.planet1} ${asp.type} ${asp.planet2} (${asp.orb.toFixed(2)}°): ${asp.intensity.toFixed(2)}`);
    });
  } else {
    console.log('\nNo aspects meet the minimum intensity threshold. Try lowering minIntensity in hookOptions.');
  }
}

// Add colors to console output for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Add color methods to String prototype for easier use
Object.entries(colors).forEach(([color, code]) => {
  String.prototype[color] = function() { return `${code}${this}${colors.reset}`; };
});

// Test with SRP enabled
console.log('\n=== Testing with SRP enabled ==='.blue.bold);
process.env.ENABLE_SRP = 'true';
console.log(`ENABLE_SRP: ${process.env.ENABLE_SRP.green}`);

const srpEnabledOptions = {
  maxHooks: 5,
  minIntensity: 0,
  orbCaps: DEFAULT_V5_CAPS,
  orbProfile: 'wm-tight-2025-11-v5'
};

console.log('\nOptions with SRP enabled:'.underline);
console.log(JSON.stringify(srpEnabledOptions, null, 2));

console.log('\nRunning composeHookStack with SRP enabled...'.dim);
const hooksWithSRP = composeHookStack(mockResult, srpEnabledOptions);

console.log('\nSRP-Enabled Hook Results:'.blue.bold);
console.log('======================'.blue);

if (hooksWithSRP?.hooks?.length > 0) {
  console.log(`\n✅ Generated ${hooksWithSRP.hooks.length} hooks with SRP enabled:`.green);
  console.log('----------------------------------------'.green);

  hooksWithSRP.hooks.forEach((hook, i) => {
    console.log(`\n[${i}] ${hook.title.cyan.bold}`);
    console.log('   ' + '-'.repeat(hook.title.length + 4).dim);
    console.log(`   ${hook.description}`);
    console.log(`   ${'Intensity:'.padEnd(15)} ${hook.intensity?.toFixed(2).yellow}`);
    console.log(`   ${'Orb:'.padEnd(15)} ${(hook.orb?.toFixed(2) + '°').yellow}`);
    console.log(`   ${'Aspect Type:'.padEnd(15)} ${hook.aspect_type.yellow}`);

    if (hook.planets?.length > 0) {
      console.log(`   ${'Planets:'.padEnd(15)} ${hook.planets.join(' - ').yellow}`);
    }

    if (hook.srp) {
      console.log(`\n   ${'SRP Data:'.bold}`);
      console.log(`   ${'-'.repeat(9)}`.dim);
      Object.entries(hook.srp).forEach(([key, value]) => {
        console.log(`   ${key.padEnd(15)}: ${String(value).yellow}`);
      });
    }

    if (hook.is_tier_1) {
      console.log('\n   🔥 Tier 1 Aspect (very tight orb)'.yellow);
    }
  });

  console.log('\nMetadata:'.underline);
  console.log(JSON.stringify({
    composer: hooksWithSRP.metadata?.composer || 'unknown',
    version: hooksWithSRP.metadata?.version || 'unknown',
    min_intensity_threshold: hooksWithSRP.metadata?.min_intensity_threshold ?? srpEnabledOptions.minIntensity,
    tier_1_threshold: hooksWithSRP.metadata?.tier_1_threshold || '1.0°',
    orb_profile: hooksWithSRP.metadata?.orb_profile || 'default',
    diversity_rules: hooksWithSRP.metadata?.diversity_rules || 'default'
  }, null, 2));

} else {
  console.log('\n❌ No hooks generated with SRP enabled'.red);
  console.log('----------------------------------'.red);

  console.log('\nDebugging SRP hook generation:'.yellow.bold);
  console.log('---------------------------'.yellow);

  // Check if SRP is actually enabled
  const isSRPEnabled = process.env.ENABLE_SRP === 'true';
  console.log(`- SRP Enabled in environment: ${isSRPEnabled ? '✅'.green : '❌'.red}`);

  // Check if we can load the SRP mapper
  try {
    const { tryLoadSRPMapper } = require('./src/feedback/hook-stack-composer');
    const mapper = tryLoadSRPMapper();
    console.log(`- SRP Mapper loaded: ${mapper ? '✅'.green : '❌'.red}`);

    if (!mapper) {
      console.log('  - Check if the SRP module is installed and accessible'.yellow);
      console.log('  - Make sure the ENABLE_SRP environment variable is set correctly'.yellow);
    }
  } catch (error) {
    console.log(`- ❌ Error loading SRP mapper: ${error.message}`.red);
  }

  // Log the full result for debugging
  console.log('\nFull composeHookStack result with SRP:'.yellow);
  console.log(JSON.stringify(hooksWithSRP || {}, null, 2));
}

// Test with SRP disabled
console.log('\n\n=== Testing with SRP disabled ==='.blue.bold);
process.env.ENABLE_SRP = 'false';
console.log(`ENABLE_SRP: ${process.env.ENABLE_SRP.red}`);

const srpDisabledOptions = {
  maxHooks: 5,
  minIntensity: 0,
  orbCaps: DEFAULT_V5_CAPS,
  orbProfile: 'wm-tight-2025-11-v5'
};

console.log('\nOptions with SRP disabled:'.underline);
console.log(JSON.stringify(srpDisabledOptions, null, 2));

console.log('\nRunning composeHookStack with SRP disabled...'.dim);
const hooksWithoutSRP = composeHookStack(mockResult, srpDisabledOptions);

console.log('\nSRP-Disabled Hook Results:'.blue.bold);
console.log('======================='.blue);

if (hooksWithoutSRP?.hooks?.length > 0) {
  console.log(`\n✅ Generated ${hooksWithoutSRP.hooks.length} hooks without SRP:`.green);
  console.log('-----------------------------------------'.green);

  hooksWithoutSRP.hooks.forEach((hook, i) => {
    console.log(`\n[${i}] ${hook.title.cyan.bold}`);
    console.log('   ' + '-'.repeat(hook.title.length + 4).dim);
    console.log(`   ${hook.description}`);
    console.log(`   ${'Intensity:'.padEnd(15)} ${hook.intensity?.toFixed(2).yellow}`);
    console.log(`   ${'Orb:'.padEnd(15)} ${(hook.orb?.toFixed(2) + '°').yellow}`);
    console.log(`   ${'Aspect Type:'.padEnd(15)} ${hook.aspect_type.yellow}`);

    if (hook.planets?.length > 0) {
      console.log(`   ${'Planets:'.padEnd(15)} ${hook.planets.join(' - ').yellow}`);
    }

    if (hook.srp) {
      console.log(`   ${'SRP Data:'.padEnd(15)} ${'Present but SRP is disabled!'.yellow}`);
    }

    if (hook.is_tier_1) {
      console.log('\n   🔥 Tier 1 Aspect (very tight orb)'.yellow);
    }
  });

  console.log('\nMetadata:'.underline);
  console.log(JSON.stringify({
    composer: hooksWithoutSRP.metadata?.composer || 'unknown',
    version: hooksWithoutSRP.metadata?.version || 'unknown',
    min_intensity_threshold: hooksWithoutSRP.metadata?.min_intensity_threshold ?? srpDisabledOptions.minIntensity,
    tier_1_threshold: hooksWithoutSRP.metadata?.tier_1_threshold || '1.0°',
    orb_profile: hooksWithoutSRP.metadata?.orb_profile || 'default',
    diversity_rules: hooksWithoutSRP.metadata?.diversity_rules || 'default'
  }, null, 2));

} else {
  console.log('\n❌ No hooks generated with SRP disabled'.red);
  console.log('-----------------------------------'.red);

  console.log('\nDebugging non-SRP hook generation:'.yellow.bold);
  console.log('-------------------------------'.yellow);

  // Check if aspects are being filtered out by intensity
  const minIntensity = srpDisabledOptions.minIntensity || 0;
  const filteredAspects = extractedAspects.filter(asp => asp.intensity >= minIntensity);

  console.log(`\nAspects that should pass intensity filter (>= ${minIntensity}): ${filteredAspects.length}/${extractedAspects.length}`);

  if (filteredAspects.length > 0) {
    console.log('\nAspects that should generate hooks:'.yellow);
    filteredAspects.forEach(asp => {
      console.log(`- ${asp.planet1} ${asp.type} ${asp.planet2} (${asp.orb.toFixed(2)}°): ${asp.intensity.toFixed(2).yellow}`);
    });

    console.log('\nPossible issues:'.red);
    console.log('- The aspects may not be matching any hook templates'.yellow);
    console.log('- The buildHookStack function might be filtering them out for other reasons'.yellow);
  } else {
    console.log('\nNo aspects meet the minimum intensity threshold. Try lowering minIntensity in options.'.red);
  }

  // Log the full result for debugging
  console.log('\nFull composeHookStack result without SRP:'.yellow);
  console.log(JSON.stringify(hooksWithoutSRP || {}, null, 2));
}
