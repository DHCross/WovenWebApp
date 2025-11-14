const fs = require('fs');
const path = require('path');

// Import the seismograph aggregate core for symbolic weather calculations
const { aggregate } = require('../math-brain/seismograph-core');

// Import metric label classifiers
const { classifyMagnitude, classifyDirectionalBias } = require('../../lib/reporting/metric-labels');
const { sanitizeForFilename } = require('../utils/sanitizeFilename.js');

// Import required helper functions for seismograph
const {
  enrichDailyAspects,
  selectPoeticAspects,
  weightAspect,
  ASPECT_CLASS,
  BALANCE_CALIBRATION_VERSION,
  SEISMOGRAPH_VERSION,
  WEIGHTS_LEGEND
} = require('../../lib/server/astrology-mathbrain.js');

/**
 * Main orchestrator for the Math Brain v2 pipeline.
 * @param {string|object} configSource - Path to the JSON config file or a prebuilt config object.
 * @param {object} transitData - Optional pre-fetched transit data from API (for real data mode)
 * @returns {object} The final unified output object.
 */
async function runMathBrain(configSource, transitData = null) {
  console.log('[Math Brain] Starting...');

  // 1. Load Configuration (from file path or direct object)
  let configPath = null;
  let config;

  if (typeof configSource === 'string') {
    configPath = configSource;
    const configRaw = fs.readFileSync(configSource, 'utf-8');
    config = JSON.parse(configRaw);
  } else if (configSource && typeof configSource === 'object') {
    configPath = configSource.sourcePath || null;
    config = JSON.parse(JSON.stringify(configSource));
  } else {
    throw new Error('runMathBrain expected a config path or object');
  }

function computeRelationalSummary(dailyEntries, options = {}) {
  if (!Array.isArray(dailyEntries) || dailyEntries.length === 0) {
    return null;
  }

  const { weightByMagnitude = true, biasWeights = {} } = options;
  let weightedBiasASum = 0;
  let weightedBiasBSum = 0;
  let weightASum = 0;
  let weightBSum = 0;
  const combinedBiasSeries = [];

  for (const entry of dailyEntries) {
    const mirror = entry?.mirror_data;
    if (!mirror) continue;

    const aMagnitude = Number(mirror.person_a_contribution?.magnitude ?? 0);
    const bMagnitude = Number(mirror.person_b_contribution?.magnitude ?? 0);
    const aBias = Number(mirror.person_a_contribution?.bias ?? 0);
    const bBias = Number(mirror.person_b_contribution?.bias ?? 0);

    const magnitudeWeightA = weightByMagnitude ? Math.max(aMagnitude, 0) : 1;
    const magnitudeWeightB = weightByMagnitude ? Math.max(bMagnitude, 0) : 1;
    const configWeightA = Number(biasWeights.personA ?? 1);
    const configWeightB = Number(biasWeights.personB ?? 1);

    const weightA = magnitudeWeightA * configWeightA;
    const weightB = magnitudeWeightB * configWeightB;

    weightedBiasASum += aBias * weightA;
    weightedBiasBSum += bBias * weightB;
    weightASum += weightA;
    weightBSum += weightB;

    const combined = (aBias * weightA + bBias * weightB) / Math.max(weightA + weightB, 1e-6);
    combinedBiasSeries.push(combined);
  }

  if (weightASum === 0 && weightBSum === 0) {
    return null;
  }

  const personAToPersonBBias = weightASum ? weightedBiasASum / weightASum : 0;
  const personBToPersonABias = weightBSum ? weightedBiasBSum / weightBSum : 0;
  const combinedBias = (weightedBiasASum + weightedBiasBSum) / Math.max(weightASum + weightBSum, 1e-6);

  const volatilityIndex = combinedBiasSeries.length
    ? Math.sqrt(combinedBiasSeries.reduce((acc, val) => acc + val * val, 0) / combinedBiasSeries.length)
    : 0;

  const biasLabel = classifyDirectionalBias(combinedBias);
  let statusLabel = 'balanced';
  if (volatilityIndex >= 2) {
    statusLabel = 'high_volatility';
  } else if (combinedBias >= 1) {
    statusLabel = 'strong_flow';
  } else if (combinedBias <= -1) {
    statusLabel = 'strong_tension';
  } else if (combinedBias >= 0.5) {
    statusLabel = 'moderate_flow';
  } else if (combinedBias <= -0.5) {
    statusLabel = 'moderate_tension';
  }

  return {
    personA_to_personB_bias: Number(personAToPersonBBias.toFixed(2)),
    personB_to_personA_bias: Number(personBToPersonABias.toFixed(2)),
    combined_bias: Number(combinedBias.toFixed(2)),
    combined_bias_label: biasLabel,
    volatility_index: Number(volatilityIndex.toFixed(2)),
    status_label: statusLabel,
    summary_generated_at: new Date().toISOString(),
  };
}

  config.sourcePath = configPath;

  const { personA, personB, startDate, endDate, mode } = config;
  const isTransitReport = startDate && endDate;

  let finalOutput;

  if (isTransitReport) {
    // --- TRANSIT REPORT FLOW (Two-File Architecture: MAP + FIELD) ---
    console.log(`[Math Brain] Running TRANSIT report for mode: ${mode}`);
    const dailyEntries = [];
    const dateRange = generateDateArray(startDate, endDate);
    let symbolicWeather = null;

    console.log(`[Math Brain] Processing ${dateRange.length} days from ${startDate} to ${endDate}...`);
    
    // Initialize rolling context for adaptive normalization
    const rollingMagnitudes = [];
    let prev = null;
    
    for (const currentDate of dateRange) {
      const { transitsA, transitsB, synastryAspects } = transitData
        ? getRealAspectData(currentDate, personA, personB, transitData)
        : getMockAspectData(currentDate);

      // Compute symbolic weather with rolling context
      symbolicWeather = computeSymbolicWeatherWithContext(
        transitsA,
        transitsB,
        prev,
        rollingMagnitudes
      );
      
      // Update rolling context for next iteration
      if (Number.isFinite(symbolicWeather._rawMagnitude)) {
        rollingMagnitudes.push(symbolicWeather._rawMagnitude);
        if (rollingMagnitudes.length > 14) {
          rollingMagnitudes.shift();
        }
      }
      prev = symbolicWeather._aggregateResult;

      dailyEntries.push({
        date: currentDate,
        // Pass the full symbolicWeather result to be used by generateFieldFile
        symbolic_weather: symbolicWeather,
        mirror_data: computeMirrorData(transitsA, transitsB, synastryAspects),
        poetic_hooks: computePoeticHooks(transitsA, transitsB, synastryAspects),
      });
    }

    // --- TWO-FILE ARCHITECTURE IMPLEMENTATION ---
    const relationalSummary = computeRelationalSummary(dailyEntries, {
      weightByMagnitude: true,
      biasWeights: {
        personA: config?.relationalWeights?.personA ?? 1,
        personB: config?.relationalWeights?.personB ?? 1
      }
    });

    // Build final unified output
    const latestSymbolicWeather = symbolicWeather || {};
    finalOutput = {
      ...finalOutput,
      person_a: transitData?.person_a || {},
      person_b: transitData?.person_b || null,
      transit_window: {
        start_date: config.transitStartDate,
        end_date: config.transitEndDate,
        step: config.step || 'daily',
      },
      transits: dailyEntries || {},
      balance_meter: {
        magnitude: latestSymbolicWeather?.magnitude || 0,
        directional_bias: latestSymbolicWeather?.directional_bias || 0,
        volatility: latestSymbolicWeather?.volatility || 0,
      },
      symbolic_weather: latestSymbolicWeather,
      // Mirror data guardrail: derive from the most recent daily entry per WOVENWEB_CODEMAP.md 1.C
      mirror_data: dailyEntries.length > 0 ? dailyEntries[dailyEntries.length - 1].mirror_data || {} : {},
      // Daily entries guardrail: expose the array at the root level per API_REFERENCE.md ACC Spec v2
      daily_entries: dailyEntries,
      relational_summary: relationalSummary || null,
      provenance: {
        ...createProvenanceBlock(config),
        relocation_applied: !!(config.translocation && config.translocation.applies),
        relocation_details: config.translocation || null,
      },
    };

  } else {
    // --- FOUNDATION REPORT FLOW ---
    console.log(`[Math Brain] Running FOUNDATION report for mode: ${mode}`);
    
    const blueprint = {
      person_a: transitData?.person_a?.chart?.aspects || [],
      person_b: transitData?.person_b?.chart?.aspects || [],
      synastry: transitData?.synastry?.chart?.aspects || [],
      composite: transitData?.composite?.chart?.aspects || [],
    };

    finalOutput = {
      run_metadata: createProvenanceBlock(config),
      foundation_blueprint: blueprint,
    };
  }

  // Write to Disk (Unified Output Only)
  const safePersonA = sanitizeForFilename(personA?.name, 'PersonA');
  const safePersonB = personB ? sanitizeForFilename(personB.name, 'PersonB') : 'Solo';
  const runDate = new Date().toISOString().split('T')[0];
  
  // Write unified output (legacy format)
  const canWriteFiles = typeof configPath === 'string' && configPath.length > 0;
  if (canWriteFiles) {
    const targetDir = path.dirname(configPath);
    const outputFileName = `unified_output_${safePersonA}_${safePersonB}_${runDate}.json`;
    const outputPath = path.join(targetDir, outputFileName);
    fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
    console.log(`[Math Brain] Success! Unified output written to: ${outputPath}`);
    
    // MAP/FIELD files removed - unified output contains all data
    console.log(`[Math Brain] MAP/FIELD export deprecated - using unified output only`);
  } else {
    console.log('[Math Brain] No config path supplied—skipping disk writes.');
  }

  // Attach relationship context if provided
  if (config.relationshipContext) {
    const relCtx = { ...config.relationshipContext };
    finalOutput.run_metadata.relationship_context = relCtx;
    finalOutput.relationship_context = relCtx;
  } else {
    finalOutput.run_metadata.relationship_context = null;
  }

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
    config_source: path.basename(config.sourcePath || 'unknown'),
    math_brain_version: '1.0.0',
    mode: config.mode || 'unknown',
    person_a: config.personA?.name || 'Person A',
    person_b: config.personB ? config.personB.name : null,
    date_range: config.startDate && config.endDate ? [config.startDate, config.endDate] : null,
    house_system: 'Placidus',
    orbs_profile: 'default_v5',
    relocation_mode: config.translocation || 'NONE',
    relationship_context: config.relationshipContext ? { ...config.relationshipContext } : null,
    engine_versions: {
      kerykeion: '4.0.0',
    },
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

function computeSymbolicWeatherWithContext(transitsA, transitsB, prevContext, rollingMagnitudes) {
  // Ensure inputs are arrays
  const safeTransitsA = Array.isArray(transitsA) ? transitsA : [];
  const safeTransitsB = Array.isArray(transitsB) ? transitsB : [];

  // Combine all transits from both persons
  const allTransits = [...safeTransitsA, ...safeTransitsB];

  // If no transits, return zero values
  if (!allTransits || allTransits.length === 0) {
    return {
      magnitude: 0,
      directional_bias: 0,
      labels: { magnitude: 'Quiet', directional_bias: 'Neutral' },
      _rawMagnitude: 0,
      _aggregateResult: null
    };
  }

  // Prepare rolling context for adaptive normalization (14-day window)
  const rollingContext = rollingMagnitudes.length >= 1 ? { magnitudes: [...rollingMagnitudes] } : null;

  // Use the seismograph aggregate function with proper context
  const weather = aggregate(allTransits, prevContext, { 
    rollingContext, 
    enableDiagnostics: false,
    helpers: {
      enrichDailyAspects,
      selectPoeticAspects,
      weightAspect,
      ASPECT_CLASS,
      BALANCE_CALIBRATION_VERSION,
      SEISMOGRAPH_VERSION,
      WEIGHTS_LEGEND
    }
  });

  // Extract and label the metrics
  const magnitude = weather.magnitude || 0;
  const directionalBias = weather.directional_bias || 0;
  const rawMagnitude = weather.energyMagnitude || weather.rawMagnitude || magnitude;

  return {
    magnitude: Number(magnitude.toFixed(1)),
    directional_bias: Number(directionalBias.toFixed(1)),
    labels: {
      magnitude: classifyMagnitude(magnitude),
      directional_bias: classifyDirectionalBias(directionalBias)
    },
    _rawMagnitude: rawMagnitude,
    _aggregateResult: weather
  };
}

function computeMirrorData(transitsA, transitsB, synastryAspects) {
  // Ensure inputs are arrays
  const safeTransitsA = Array.isArray(transitsA) ? transitsA : [];
  const safeTransitsB = Array.isArray(transitsB) ? transitsB : [];
  const safeSynastry = Array.isArray(synastryAspects) ? synastryAspects : [];

  // Calculate individual contributions for each person
  const helpers = {
    enrichDailyAspects,
    selectPoeticAspects,
    weightAspect,
    ASPECT_CLASS,
    BALANCE_CALIBRATION_VERSION,
    SEISMOGRAPH_VERSION,
    WEIGHTS_LEGEND
  };
  const weatherA = safeTransitsA.length > 0 ? aggregate(safeTransitsA, null, { enableDiagnostics: false, helpers }) : { magnitude: 0, directional_bias: 0 };
  const weatherB = safeTransitsB.length > 0 ? aggregate(safeTransitsB, null, { enableDiagnostics: false, helpers }) : { magnitude: 0, directional_bias: 0 };

  // Determine relational dynamics from synastry aspects
  const hardAspects = safeSynastry.filter(a => ['square', 'opposition', 'conjunction'].includes(a.aspect));
  const softAspects = safeSynastry.filter(a => ['trine', 'sextile'].includes(a.aspect));
  
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
  // Ensure inputs are arrays
  const safeTransitsA = Array.isArray(transitsA) ? transitsA : [];
  const safeTransitsB = Array.isArray(transitsB) ? transitsB : [];
  const safeSynastry = Array.isArray(synastryAspects) ? synastryAspects : [];

  // Combine all aspects for ranking
  const allAspects = [
    ...safeTransitsA.map(a => ({ ...a, owner: 'Person A', type: categorizeAspect(a.aspect) })),
    ...safeTransitsB.map(a => ({ ...a, owner: 'Person B', type: categorizeAspect(a.aspect) })),
    ...safeSynastry.map(a => ({ ...a, owner: 'Synastry', type: categorizeAspect(a.aspect) }))
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
 * Fetches real astrological aspect data for a given date.
 * This function should be called with the astrology API client passed in.
 * @param {string} date - The date in YYYY-MM-DD format
 * @param {object} personA - Person A's birth data
 * @param {object} personB - Person B's birth data (optional)
 * @param {object} transitData - Pre-fetched transit data from the API
 * @returns {object} Object containing transitsA, transitsB, and synastryAspects arrays
 */
function extractAspectsForDay(day) {
  if (!day) return [];
  if (Array.isArray(day)) return day;
  if (Array.isArray(day.filtered_aspects) && day.filtered_aspects.length) {
    return day.filtered_aspects;
  }
  if (Array.isArray(day.aspects) && day.aspects.length) {
    return day.aspects;
  }
  if (Array.isArray(day.transit_table) && day.transit_table.length) {
    return day.transit_table;
  }
  return [];
}

function extractSynastryAspectsForDay(day) {
  if (!day) return [];
  if (Array.isArray(day)) return day;
  if (Array.isArray(day.aspects)) return day.aspects;
  return [];
}

function getRealAspectData(date, personA, personB, transitData = {}) {
  const transitsA = [];
  const transitsB = [];
  const synastryAspects = [];

  console.log('[getRealAspectData] Processing date:', date);
  console.log('[getRealAspectData] transitData keys:', Object.keys(transitData || {}));
  console.log('[getRealAspectData] person_a exists:', !!transitData?.person_a);
  console.log('[getRealAspectData] person_a.chart exists:', !!transitData?.person_a?.chart);
  console.log('[getRealAspectData] transitsByDate exists:', !!transitData?.person_a?.chart?.transitsByDate);

  const dayA = transitData?.person_a?.chart?.transitsByDate?.[date];
  if (dayA) {
    const extracted = extractAspectsForDay(dayA);
    if (Array.isArray(extracted) && extracted.length > 0) {
      transitsA.push(...extracted.map(a => ({ 
        ...a, 
        transit: { body: a?.p1_name || a?.transit?.body || 'Unknown' }, 
        natal: { body: a?.p2_name || a?.natal?.body || 'Unknown' },
        type: a?.aspect || a?.type || 'unknown',
        orb: a?.orbit || a?.orb || 0
      })));
    }
  }

  if (personB) {
    const dayB = transitData?.person_b?.chart?.transitsByDate?.[date];
    if (dayB) {
      const extracted = extractAspectsForDay(dayB);
      if (Array.isArray(extracted) && extracted.length > 0) {
        transitsB.push(...extracted.map(a => ({ 
          ...a, 
          transit: { body: a?.p1_name || a?.transit?.body || 'Unknown' }, 
          natal: { body: a?.p2_name || a?.natal?.body || 'Unknown' },
          type: a?.aspect || a?.type || 'unknown',
          orb: a?.orbit || a?.orb || 0
        })));
      }
    }

    const synDay = transitData?.synastry?.aspectsByDate?.[date] || transitData?.composite?.transitsByDate?.[date];
    if (synDay) {
      const extracted = extractSynastryAspectsForDay(synDay);
      if (Array.isArray(extracted) && extracted.length > 0) {
        synastryAspects.push(...extracted.map(a => ({ 
          ...a, 
          transit: { body: a?.p1_name || a?.transit?.body || 'Unknown' }, 
          natal: { body: a?.p2_name || a?.natal?.body || 'Unknown' },
          type: a?.aspect || a?.type || 'unknown',
          orb: a?.orbit || a?.orb || 0
        })));
      }
    }
  }

  return { transitsA, transitsB, synastryAspects };
}

/**
 * DEPRECATED: Mock function kept for standalone CLI testing only.
 * When called from API, use getRealAspectData() instead.
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

// MAP/FIELD generation functions removed - unified output contains all data
// The old MAP/FIELD specification has been deprecated in favor of unified output

// Helper functions for unified output
function extractPlanetaryCentidegrees(chart) {
  // Implementation kept for unified output
  if (!chart || !chart.person) return {};
  
  const planets = {};
  const planetFields = [
    'sun', 'moon', 'mercury', 'venus', 'mars', 
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
  ];
  
  planetFields.forEach(name => {
    if (chart.person[name]) {
      planets[name] = Math.round(chart.person[name].longitude * 100);
    }
  });
  
  return planets;
}

function extractHouseCentidegrees(chart) {
  // Implementation kept for unified output
  if (!chart || !chart.person) return {};
  
  const houses = {};
  const houseFields = [
    'first_house', 'second_house', 'third_house', 'fourth_house',
    'fifth_house', 'sixth_house', 'seventh_house', 'eighth_house',
    'ninth_house', 'tenth_house', 'eleventh_house', 'twelfth_house'
  ];
  
  houseFields.forEach(name => {
    if (chart.person[name]) {
      houses[name.replace('_house', '')] = Math.round(chart.person[name].longitude * 100);
    }
  });
  
  return houses;
}

/**
 * Extract natal aspects in compact format for unified output
 */
function extractNatalAspectsCompact(aspects, planetIndex) {
  if (!aspects || !Array.isArray(aspects)) return [];
  
  return aspects.map(aspect => {
    const p1Idx = planetIndex[aspect.p1_name] ?? 0;
    const p2Idx = planetIndex[aspect.p2_name] ?? 0;
    const aspKey = {
      'conjunction': 0, 'cnj': 0,
      'opposition': 1, 'opp': 1,
      'square': 2, 'sq': 2,
      'trine': 3, 'tri': 3,
      'sextile': 4, 'sex': 4
    }[aspect.aspect] ?? 0;
    
    return {
      a: p1Idx,
      b: p2Idx,
      t: aspKey,
      o: Math.round((aspect.orb || 0) * 100) // orb in centidegrees
    };
  }).filter(a => a !== null);
}

// Run Math Brain if called directly

// Export the main function (CommonJS for Node.js execution)
module.exports = { runMathBrain };
