const fs = require('fs');
const path = require('path');

// Import the seismograph aggregator for symbolic weather calculations
const { aggregate } = require('../seismograph');

// Import metric label classifiers
const { classifyMagnitude, classifyDirectionalBias } = require('../lib/reporting/metric-labels');

/**
 * Main orchestrator for the Math Brain pipeline.
 * Reads a setup configuration, calculates all required astrological geometry for a date range,
 * and outputs a single, unified JSON file (the "MAP").
 * 
 * @param {string} configPath - Absolute path to the setup JSON file (e.g., 'math_brain_setup_Dan_Stephie.json').
 * @returns {object} The final, unified data object.
 */
async function runMathBrain(configPath) {
  console.log(`[Math Brain] Starting run with config: ${configPath}`);

  // 1. Load and Validate Configuration
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found at: ${configPath}`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { personA, personB, startDate, endDate, mode } = config;

  // --- Compliance Check ---
  // As per MATH_BRAIN_COMPLIANCE.md, ensure a valid transit-inclusive mode is used.
  const compliantModes = ['SYNASTRY_TRANSITS', 'COMPOSITE_TRANSITS', 'NATAL_TRANSITS'];
  if (!compliantModes.includes(mode)) {
    throw new Error(`Mode "${mode}" is not compliant. Must include transits.`);
  }

  const dailyEntries = [];
  const dateRange = generateDateArray(startDate, endDate);

  // 2. Iterate Through Each Day in the Range
  console.log(`[Math Brain] Processing ${dateRange.length} days from ${startDate} to ${endDate}...`);
  for (const currentDate of dateRange) {
    console.log(`- Processing date: ${currentDate}`);

    // 3. Generate Raw Astrological Data
    // TODO: CRITICAL - Replace getMockAspectData with real data source
    // The real implementation should:
    //   1. Call lib/server/astrology-mathbrain.js to fetch natal charts for both persons
    //   2. Call getTransits() for each person for the current date
    //   3. Call getSynastry() if mode is SYNASTRY_TRANSITS
    //   4. Extract and return the aspect arrays in this format:
    //      - transitsA: Array of aspect objects for Person A
    //      - transitsB: Array of aspect objects for Person B
    //      - synastryAspects: Array of synastry aspect objects
    // Expected aspect object format: { p1_name, p2_name, aspect, orbit, ... }
    const { transitsA, transitsB, synastryAspects } = getMockAspectData(currentDate);

    // 4. Compute Data for Each "Brain"
    const symbolicWeather = computeSymbolicWeather(transitsA, transitsB);
    const mirrorData = computeMirrorData(transitsA, transitsB, synastryAspects);
    const poeticHooks = computePoeticHooks(transitsA, transitsB, synastryAspects);

    // 5. Assemble the Daily Entry
    dailyEntries.push({
      date: currentDate,
      symbolic_weather: symbolicWeather,
      mirror_data: mirrorData,
      poetic_hooks: poeticHooks
    });
  }

  // 6. Assemble the Final Output File
  const finalOutput = {
    run_metadata: createProvenanceBlock(config),
    daily_entries: dailyEntries
  };

  // 7. Write to Disk
  const outputFileName = `unified_output_${personA.name}_${personB.name}_${new Date().toISOString().split('T')[0]}.json`;
  const outputPath = path.join(path.dirname(configPath), outputFileName);
  fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
  console.log(`[Math Brain] Success! Unified output written to: ${outputPath}`);
  
  return finalOutput;
}

// --- Helper Functions & Stubs ---

/**
 * Creates the mandatory provenance block for the output file.
 * @param {object} config - The input configuration.
 * @returns {object} The populated metadata block.
 */
function createProvenanceBlock(config) {
  return {
    generated_at: new Date().toISOString(),
    config_source: path.basename(config.sourcePath || 'N/A'),
    math_brain_version: '1.0.0', // This script's version
    mode: config.mode,
    person_a: config.personA.name,
    person_b: config.personB.name,
    date_range: [config.startDate, config.endDate],
    // --- Fields required by API_REFERENCE.md ---
    house_system: 'Placidus', // Example, should be from config
    orbs_profile: 'default_v5',
    relocation_mode: config.translocation,
    engine_versions: { // Example
      'kerykeion': '4.0.0'
    }
  };
}

/**
 * Generates an array of date strings between a start and end date.
 * @param {string} start - YYYY-MM-DD
 * @param {string} end - YYYY-MM-DD
 * @returns {string[]} An array of date strings.
 */
function generateDateArray(start, end) {
    const dates = [];
    let currentDate = new Date(start + 'T00:00:00Z');
    const endDate = new Date(end + 'T00:00:00Z');
    while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

// --- Computational Functions ---

function computeSymbolicWeather(transitsA, transitsB) {
  // Combine all transits from both persons
  const allTransits = [...transitsA, ...transitsB];
  
  // If no transits, return zero values
  if (!allTransits || allTransits.length === 0) {
    return {
      magnitude: 0,
      directional_bias: 0,
      labels: { magnitude: 'Quiet', directional_bias: 'Neutral' }
    };
  }
  
  // Use the seismograph aggregate function to calculate the weather metrics
  const weather = aggregate(allTransits, null, { enableDiagnostics: false });
  
  // Extract and label the metrics
  const magnitude = weather.magnitude || 0;
  const directionalBias = weather.directional_bias || 0;
  
  return {
    magnitude: Number(magnitude.toFixed(1)),
    directional_bias: Number(directionalBias.toFixed(1)),
    labels: {
      magnitude: classifyMagnitude(magnitude),
      directional_bias: classifyDirectionalBias(directionalBias)
    }
  };
}

function computeMirrorData(transitsA, transitsB, synastryAspects) {
  // Calculate individual contributions for each person
  const weatherA = transitsA && transitsA.length > 0 ? aggregate(transitsA, null, { enableDiagnostics: false }) : { magnitude: 0, directional_bias: 0 };
  const weatherB = transitsB && transitsB.length > 0 ? aggregate(transitsB, null, { enableDiagnostics: false }) : { magnitude: 0, directional_bias: 0 };
  
  // Determine relational dynamics from synastry aspects
  const hardAspects = (synastryAspects || []).filter(a => ['square', 'opposition', 'conjunction'].includes(a.aspect));
  const softAspects = (synastryAspects || []).filter(a => ['trine', 'sextile'].includes(a.aspect));
  
  const relationalTension = hardAspects.length * 0.8 + (weatherA.magnitude + weatherB.magnitude) * 0.3;
  const relationalFlow = softAspects.length * 0.6 + Math.max(0, 5 - Math.abs(weatherA.directional_bias + weatherB.directional_bias)) * 0.2;
  
  // Find dominant planetary theme (simplified - look for most common planet in aspects)
  let dominantTheme = 'Mixed Dynamics';
  if (hardAspects.length > 0) {
    const planet = hardAspects[0].p1_name || hardAspects[0].p2_name || 'Unknown';
    dominantTheme = `Tension (${planet})`;
  } else if (softAspects.length > 0) {
    const planet = softAspects[0].p1_name || softAspects[0].p2_name || 'Unknown';
    dominantTheme = `Flow (${planet})`;
  }
  
  return {
    relational_tension: Number(relationalTension.toFixed(1)),
    relational_flow: Number(relationalFlow.toFixed(1)),
    dominant_theme: dominantTheme,
    person_a_contribution: { 
      magnitude: Number((weatherA.magnitude || 0).toFixed(1)), 
      bias: Number((weatherA.directional_bias || 0).toFixed(1))
    },
    person_b_contribution: { 
      magnitude: Number((weatherB.magnitude || 0).toFixed(1)), 
      bias: Number((weatherB.directional_bias || 0).toFixed(1))
    },
  };
}

function computePoeticHooks(transitsA, transitsB, synastryAspects) {
  // Combine all aspects for ranking
  const allAspects = [
    ...(transitsA || []).map(a => ({ ...a, owner: 'Person A', type: categorizeAspect(a.aspect) })),
    ...(transitsB || []).map(a => ({ ...a, owner: 'Person B', type: categorizeAspect(a.aspect) })),
    ...(synastryAspects || []).map(a => ({ ...a, owner: 'Synastry', type: categorizeAspect(a.aspect) }))
  ];
  
  // Sort aspects by significance (tighter orb = more significant)
  const sortedAspects = allAspects
    .filter(a => a.orbit !== undefined && a.orbit !== null)
    .sort((a, b) => Math.abs(a.orbit) - Math.abs(b.orbit))
    .slice(0, 5);
  
  // Identify peak aspect (tightest orb)
  const peakAspect = sortedAspects[0] || null;
  const peakAspectLabel = peakAspect 
    ? `Transit ${peakAspect.p1_name} ${peakAspect.aspect} Natal ${peakAspect.p2_name} (${peakAspect.owner})`
    : 'No significant aspects';
  
  // Extract key themes from top aspects
  const themes = sortedAspects
    .map(a => getThemeForPlanet(a.p1_name || a.p2_name))
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .slice(0, 3);
  
  // Format top contributing aspects
  const topAspects = sortedAspects.slice(0, 3).map(a => ({
    aspect: `Transit ${a.p1_name} ${a.aspect} Natal ${a.p2_name} (${a.owner})`,
    type: a.type,
    strength: Number((1 - Math.abs(a.orbit) / 10).toFixed(2))
  }));
  
  return {
    peak_aspect_of_the_day: peakAspectLabel,
    key_themes: themes.length > 0 ? themes : ['Mixed Energies'],
    significant_events: [], // Would require retrograde/station detection from real data
    top_contributing_aspects: topAspects
  };
}

function categorizeAspect(aspectName) {
  const hardAspects = ['square', 'opposition', 'conjunction'];
  const softAspects = ['trine', 'sextile'];
  if (hardAspects.includes(aspectName)) return 'Tension';
  if (softAspects.includes(aspectName)) return 'Flow';
  return 'Minor';
}

function getThemeForPlanet(planetName) {
  const themes = {
    'Saturn': 'Structure',
    'Jupiter': 'Expansion',
    'Mars': 'Action',
    'Venus': 'Values',
    'Mercury': 'Communication',
    'Sun': 'Identity',
    'Moon': 'Emotions',
    'Uranus': 'Change',
    'Neptune': 'Dissolution',
    'Pluto': 'Transformation'
  };
  return themes[planetName] || null;
}

/**
 * MOCK FUNCTION: Generates fake aspect data for testing purposes.
 * Replace with actual call to the astrology engine.
 */
function getMockAspectData(date) {
    return {
        transitsA: [{ p1_name: 'Sun', p2_name: 'Saturn', aspect: 'square', orbit: 0.5 }],
        transitsB: [{ p1_name: 'Venus', p2_name: 'Jupiter', aspect: 'trine', orbit: 1.1 }],
        synastryAspects: [{ p1_name: 'Mars', p2_name: 'Moon', aspect: 'conjunction', orbit: 2.3 }]
    };
}

// --- Main Execution Block ---
// Allows the script to be run directly from the command line.
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.error('Usage: node src/math_brain/main.js <path_to_config_file>');
        process.exit(1);
    }
    const configPath = path.resolve(args[0]);
    runMathBrain(configPath).catch(error => {
        console.error(`[Math Brain] An error occurred: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runMathBrain };
