const fs = require('fs');
const path = require('path');
const { createProvenanceBlock } = require('./provenance');
const { generateDateArray } = require('./date_utils');
const {
  computeSymbolicWeatherWithContext,
  computeMirrorData,
  computePoeticHooks,
} = require('./computation');
const {
  getRealAspectData,
  getMockAspectData,
} = require('./data_extraction');
const {
  generateMapFile,
  generateFieldFile,
} = require('./file_generation');
const { sanitizeForFilename } = require('../utils/sanitizeFilename.js');
const { classifyDirectionalBias } = require('../../lib/reporting/metric-labels');

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

// Export the main function (CommonJS for Node.js execution)
module.exports = { runMathBrain };
