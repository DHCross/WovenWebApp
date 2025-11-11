const fs = require('fs');
const path = require('path');

// Import the seismograph aggregator for symbolic weather calculations
const { aggregate } = require('../seismograph');

// Import metric label classifiers
const { classifyMagnitude, classifyDirectionalBias } = require('../../lib/reporting/metric-labels');
const { sanitizeForFilename } = require('../utils/sanitizeFilename.js');

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

    console.log(`[Math Brain] Processing ${dateRange.length} days from ${startDate} to ${endDate}...`);

    // Initialize rolling context for adaptive normalization
    const rollingMagnitudes = [];
    let prev = null;

    for (const currentDate of dateRange) {
      const { transitsA, transitsB, synastryAspects } = transitData
        ? getRealAspectData(currentDate, personA, personB, transitData)
        : getMockAspectData(currentDate);

      // Compute symbolic weather with rolling context
      const symbolicWeather = computeSymbolicWeatherWithContext(
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

    // Generate MAP file (natal geometry - permanent)
    const mapFile = generateMapFile(transitData, personA, personB, config);

    // Generate FIELD file (transit weather - temporal)
    const fieldFile = generateFieldFile(
      dailyEntries,
      startDate,
      endDate,
      config,
      mapFile._meta.map_id,
      transitData,
      relationalSummary
    );

    // Legacy unified output for backward compatibility
    finalOutput = {
      run_metadata: createProvenanceBlock(config),
      person_a: {
        name: personA?.name || 'Person A',
        details: personA,
        chart: transitData?.person_a?.chart || {},
        aspects: transitData?.person_a?.aspects || [],
      },
      person_b: personB ? {
        name: personB?.name || 'Person B',
        details: personB,
        chart: transitData?.person_b?.chart || {},
        aspects: transitData?.person_b?.aspects || [],
      } : null,
      daily_entries: dailyEntries,
      // NEW: Include MAP and FIELD as separate structures
      _map_file: mapFile,
      _field_file: fieldFile,
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

  // Write to Disk (Three Files: Unified + MAP + FIELD)
  const safePersonA = sanitizeForFilename(personA?.name, 'PersonA');
  const safePersonB = personB ? sanitizeForFilename(personB.name, 'PersonB') : 'Solo';
  const runDate = new Date().toISOString().split('T')[0];

  // 1. Write unified output (legacy format)
  const canWriteFiles = typeof configPath === 'string' && configPath.length > 0;
  if (canWriteFiles) {
    const targetDir = path.dirname(configPath);
    const outputFileName = `unified_output_${safePersonA}_${safePersonB}_${runDate}.json`;
    const outputPath = path.join(targetDir, outputFileName);
    fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
    console.log(`[Math Brain] Success! Unified output written to: ${outputPath}`);

    // 2. Write MAP file (wm-map-v1) if it exists
    if (finalOutput._map_file) {
      const mapFileName = `wm-map-v1_${safePersonA}_${safePersonB}_${runDate}.json`;
      const mapPath = path.join(targetDir, mapFileName);
      fs.writeFileSync(mapPath, JSON.stringify(finalOutput._map_file, null, 2));
      console.log(`[Math Brain] MAP file written to: ${mapPath}`);
    }

    // 3. Write FIELD file (wm-field-v1) if it exists
    if (finalOutput._field_file) {
      const fieldFileName = `wm-field-v1_${safePersonA}_${safePersonB}_${runDate}.json`;
      const fieldPath = path.join(targetDir, fieldFileName);
      fs.writeFileSync(fieldPath, JSON.stringify(finalOutput._field_file, null, 2));
      console.log(`[Math Brain] FIELD file written to: ${fieldPath}`);
    }
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
  const weather = aggregate(allTransits, prevContext, { rollingContext, enableDiagnostics: false });

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
  const weatherA = safeTransitsA.length > 0 ? aggregate(safeTransitsA, null, { enableDiagnostics: false }) : { magnitude: 0, directional_bias: 0 };
  const weatherB = safeTransitsB.length > 0 ? aggregate(safeTransitsB, null, { enableDiagnostics: false }) : { magnitude: 0, directional_bias: 0 };

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

  const dayA = transitData?.person_a?.chart?.transitsByDate?.[date];
  if (dayA) {
    const extracted = extractAspectsForDay(dayA);
    if (Array.isArray(extracted)) {
      transitsA.push(...extracted.map(a => ({ ...a, transit: { body: a.p1_name }, natal: { body: a.p2_name } })));
    }
  }

  if (personB) {
    const dayB = transitData?.person_b?.chart?.transitsByDate?.[date];
    if (dayB) {
      const extracted = extractAspectsForDay(dayB);
      if (Array.isArray(extracted)) {
        transitsB.push(...extracted.map(a => ({ ...a, transit: { body: a.p1_name }, natal: { body: a.p2_name } })));
      }
    }

    const synDay = transitData?.synastry?.aspectsByDate?.[date] || transitData?.composite?.transitsByDate?.[date];
    if (synDay) {
      const extracted = extractSynastryAspectsForDay(synDay);
      if (Array.isArray(extracted)) {
        synastryAspects.push(...extracted.map(a => ({ ...a, transit: { body: a.p1_name }, natal: { body: a.p2_name } })));
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

/**
 * Generate MAP file (wm-map-v1) - Constitutional Geometry
 * Contains natal planetary positions, aspects, houses - never changes
 */
function generateMapFile(transitData, personA, personB, config) {
  const mapId = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Planet index mapping per spec
  const PLANET_INDEX = {
    'Sun': 0, 'Moon': 1, 'Mercury': 2, 'Venus': 3, 'Mars': 4,
    'Jupiter': 5, 'Saturn': 6, 'Uranus': 7, 'Neptune': 8,
    'Pluto': 9, 'Node': 10, 'Mean_Node': 10, 'ASC': 11, 'Ascendant': 11, 'MC': 12, 'Medium_Coeli': 12
  };

  return {
    _meta: {
      kind: 'MAP',
      schema: 'wm-map-v1',
      map_id: mapId,
      math_brain_version: 'mb-2025.10.18',
      ephemeris_source: 'astrologer-api',
      house_system: config.house_system || 'Placidus',
      orbs_profile: config.orbs_profile || 'wm-spec-2025-09',
      timezone_db_version: 'IANA-2025a',
      relocation_mode: config.translocation || 'none',
      created_utc: new Date().toISOString(),
    },
    people: [
      {
        id: 'A',
        name: personA?.name || 'Person A',
        birth: {
          date: `${personA?.year}-${String(personA?.month).padStart(2, '0')}-${String(personA?.day).padStart(2, '0')}`,
          time: `${String(personA?.hour || 12).padStart(2, '0')}:${String(personA?.minute || 0).padStart(2, '0')}`,
          city: personA?.city || 'Unknown',
          state: personA?.state || '',
          nation: personA?.nation || 'US',
        },
        index: PLANET_INDEX,  // Required per spec
        planets: extractPlanetaryCentidegrees(transitData?.person_a?.chart),
        houses: extractHouseCentidegrees(transitData?.person_a?.chart),
        aspects: extractNatalAspectsCompact(transitData?.person_a?.aspects, PLANET_INDEX),
      },
      ...(personB ? [{
        id: 'B',
        name: personB?.name || 'Person B',
        birth: {
          date: `${personB?.year}-${String(personB?.month).padStart(2, '0')}-${String(personB?.day).padStart(2, '0')}`,
          time: `${String(personB?.hour || 12).padStart(2, '0')}:${String(personB?.minute || 0).padStart(2, '0')}`,
          city: personB?.city || 'Unknown',
          state: personB?.state || '',
          nation: personB?.nation || 'US',
        },
        index: PLANET_INDEX,  // Required per spec
        planets: extractPlanetaryCentidegrees(transitData?.person_b?.chart),
        houses: extractHouseCentidegrees(transitData?.person_b?.chart),
        aspects: extractNatalAspectsCompact(transitData?.person_b?.aspects, PLANET_INDEX),
      }] : []),
    ],
  };
}

/**
 * Generate FIELD file (wm-field-v1) - Symbolic Weather
 * Contains transit data, Balance Meter readings, references parent MAP
 */
function generateFieldFile(dailyEntries, startDate, endDate, config, mapId, transitData, relationalSummary = null) {
  const daily = {};

  const PLANET_INDEX = {
    'Sun': 0, 'Moon': 1, 'Mercury': 2, 'Venus': 3, 'Mars': 4,
    'Jupiter': 5, 'Saturn': 6, 'Uranus': 7, 'Neptune': 8,
    'Pluto': 9, 'Node': 10, 'Mean_Node': 10, 'ASC': 11, 'Ascendant': 11, 'MC': 12, 'Medium_Coeli': 12
  };

  // Aspect type keys per spec
  const ASP_KEYS = {'cnj': 0, 'opp': 1, 'sq': 2, 'tri': 3, 'sex': 4,
                    'conjunction': 0, 'opposition': 1, 'square': 2, 'trine': 3, 'sextile': 4};

  dailyEntries.forEach(entry => {
    const scoredAspects = entry.symbolic_weather?._aggregateResult?.scored || [];
    const compactAspects = scoredAspects
      .map(a => extractCompactAspect(a, PLANET_INDEX, ASP_KEYS))
      .filter(a => a !== null)
      .sort((a, b) => Math.abs(a[3]) - Math.abs(b[3])) // Sort by orb tightness
      .slice(0, 18); // Keep top 18 per spec

    const dayData = transitData?.person_a?.chart?.transitsByDate?.[entry.date];
    const tpos = (dayData?.tpos || []).map(p => Math.round(p * 100));
    const thouse = dayData?.thouse || [];

    daily[entry.date] = {
      tpos,
      thouse,
      as: compactAspects,
      meter: {
        mag_x10: Math.round(entry.symbolic_weather.magnitude * 10),
        bias_x10: Math.round(entry.symbolic_weather.directional_bias * 10),
      },
      status: {
        pending: compactAspects.length === 0,
        notes: compactAspects.length === 0 ? ['No significant aspects found for this day'] : [],
      },
    };
  });

  return {
    _meta: {
      kind: 'FIELD',
      schema: 'wm-field-v1',
      _natal_ref: mapId,
      math_brain_version: 'mb-2025.10.18',
      balance_meter_version: '5.0',
      ephemeris_source: 'astrologer-api',
      orbs_profile: config.orbs_profile || 'wm-spec-2025-09',
      house_system: config.house_system || 'Placidus',
      timezone_db_version: 'IANA-2025a',
      relocation_mode: config.translocation || 'none',
      angle_drift_alert: false,
      created_utc: new Date().toISOString(),
    },
    keys: {
      asp: ASP_KEYS  // Required per spec
    },
    period: {
      s: startDate,  // spec uses 's' not 'start'
      e: endDate,    // spec uses 'e' not 'end'
    },
    daily,
    relational_summary: relationalSummary,
  };
}

/**
 * Extract planetary positions as centidegrees (longitude × 100)
 */
function extractPlanetaryCentidegrees(chart) {
  if (!chart || !chart.planets) return [];

  const planetOrder = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter',
                       'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Node'];

  return planetOrder.map(name => {
    const planet = chart.planets.find(p => p.name === name);
    if (planet && typeof planet.abs_pos === 'number') {
      return Math.round(planet.abs_pos * 100); // Convert to centidegrees
    }
    return null;
  }).filter(v => v !== null);
}

/**
 * Extract house cusps as centidegrees
 */
function extractHouseCentidegrees(chart) {
  if (!chart || !chart.house_cusps) return [];

  return chart.house_cusps.map(cusp =>
    typeof cusp === 'number' ? Math.round(cusp * 100) : null
  ).filter(v => v !== null);
}

/**
 * Extract natal aspects in compact format per spec: {"a": 0, "b": 4, "t": "sq", "o": 210}
 */
function extractNatalAspectsCompact(aspects, planetIndex) {
  if (!Array.isArray(aspects)) return [];

  // Aspect type abbreviations per spec
  const ASP_ABBREV = {
    'conjunction': 'cnj', 'opposition': 'opp', 'square': 'sq',
    'trine': 'tri', 'sextile': 'sex', 'quincunx': 'qnx', 'semisextile': 'ssx',
    'semisquare': 'ssq', 'sesquisquare': 'ses', 'quintile': 'qui', 'biquintile': 'biq'
  };

  return aspects.map(asp => {
    const planet1Idx = planetIndex[asp.planet1] ?? planetIndex[asp.p1_name];
    const planet2Idx = planetIndex[asp.planet2] ?? planetIndex[asp.p2_name];
    const aspType = ASP_ABBREV[asp.aspect?.toLowerCase()] || asp.aspect;

    if (planet1Idx === undefined || planet2Idx === undefined) return null;

    return {
      a: planet1Idx,
      b: planet2Idx,
      t: aspType,
      o: asp.orb ? Math.round(asp.orb * 100) : 0, // centidegrees
    };
  }).filter(a => a !== null);
}

/**
 * Extract compact aspect for FIELD file: [tIdx, nIdx, aspKey, orb_cdeg, w*10]
 */
function extractCompactAspect(scoredAspect, planetIndex, aspectKeyIndex) {
  if (!scoredAspect || !scoredAspect.transit?.body || !scoredAspect.natal?.body || !scoredAspect.type) {
    return null;
  }

  const transitPlanetIndex = planetIndex[scoredAspect.transit.body];
  const natalPlanetIndex = planetIndex[scoredAspect.natal.body];
  const aspectTypeKey = aspectKeyIndex[scoredAspect.type.toLowerCase()];

  if (transitPlanetIndex === undefined || natalPlanetIndex === undefined || aspectTypeKey === undefined) {
    return null;
  }

  const orbCentidegrees = scoredAspect.orbDeg ? Math.round(scoredAspect.orbDeg * 100) : 0;
  // Use the 'S' score from the seismograph result for the weight, as specified.
  const weightX10 = scoredAspect.S ? Math.round(scoredAspect.S * 10) : 0;

  return [
    transitPlanetIndex,
    natalPlanetIndex,
    aspectTypeKey,
    orbCentidegrees,
    weightX10,
  ];
}

// Export the main function (CommonJS for Node.js execution)
module.exports = { runMathBrain };
