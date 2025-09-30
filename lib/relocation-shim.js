// Relocation Shim for Balance Meter Pipeline
// Intercepts relocation requests and performs house calculations upstream of PDF generation
// Implements the injected prompt directive for A_local/B_local processing

const { calculateRelocatedChart } = require('./relocation-houses');

/**
 * Extract birth datetime from subject data
 * @param {Object} subject - Subject with birth data
 * @returns {Date|null} Birth datetime in UTC
 */
function extractBirthDateTime(subject) {
  if (!subject) return null;

  try {
    const year = parseInt(subject.year);
    const month = parseInt(subject.month) - 1; // JS months are 0-indexed
    const day = parseInt(subject.day);
    const hour = parseInt(subject.hour) || 0;
    const minute = parseInt(subject.minute) || 0;

    // Create date in UTC (we'll handle timezone adjustments separately if needed)
    return new Date(Date.UTC(year, month, day, hour, minute));
  } catch (error) {
    console.warn('Failed to extract birth datetime:', error);
    return null;
  }
}

/**
 * Balance Meter Relocation Shim
 * Intercepts Balance Meter generation and performs house recalculation when needed
 *
 * @param {Object} mathBrainResult - Original Math Brain result
 * @param {Object} relocationContext - Relocation parameters
 * @returns {Object} Math Brain result with corrected house data
 */
function applyBalanceMeterRelocationShim(mathBrainResult, relocationContext) {
  // Only proceed if relocation is requested and we have the necessary data
  if (!relocationContext || !mathBrainResult) {
    return mathBrainResult;
  }

  const relocationMode = relocationContext.relocation_mode;
  const isRelocationMode = ['A_local', 'B_local', 'Both_local', 'Custom'].includes(relocationMode);

  if (!isRelocationMode || !relocationContext.relocation_applied) {
    return mathBrainResult;
  }

  console.log(`[Relocation Shim] Applying ${relocationMode} house recalculation`);

  try {
    const result = { ...mathBrainResult };

    // Process Person A if A_local, Both_local, or Custom
    if (['A_local', 'Both_local', 'Custom'].includes(relocationMode) && result.person_a?.chart) {
      result.person_a = applyRelocationToPersonChart(
        result.person_a,
        relocationContext,
        'person_a'
      );
    }

    // Process Person B if B_local, Both_local, or Custom
    if (['B_local', 'Both_local', 'Custom'].includes(relocationMode) && result.person_b?.chart) {
      result.person_b = applyRelocationToPersonChart(
        result.person_b,
        relocationContext,
        'person_b'
      );
    }

    // Update provenance to indicate shim was applied
    if (result.provenance) {
      result.provenance.relocation_shim_applied = true;
      result.provenance.relocation_calculation_method = 'internal_math_engine';
      result.provenance.houses_disclosure = `Houses recalculated via ${relocationMode} using internal engine`;
    }

    console.log(`[Relocation Shim] Successfully applied ${relocationMode} corrections`);
    return result;

  } catch (error) {
    console.error('[Relocation Shim] Failed to apply relocation corrections:', error);

    // Add error disclosure but don't break the pipeline
    if (mathBrainResult.provenance) {
      mathBrainResult.provenance.relocation_shim_error = error.message;
      mathBrainResult.provenance.houses_disclosure = 'Relocation attempted but failed; houses shown are natal';
    }

    return mathBrainResult;
  }
}

/**
 * Apply relocation to a single person's chart data
 * @param {Object} personData - Person A or B data
 * @param {Object} relocationContext - Relocation parameters
 * @param {string} personKey - 'person_a' or 'person_b'
 * @returns {Object} Person data with relocated houses
 */
function applyRelocationToPersonChart(personData, relocationContext, personKey) {
  const birthDateTime = extractBirthDateTime(personData.details);

  if (!birthDateTime) {
    console.warn(`[Relocation Shim] Could not extract birth datetime for ${personKey}`);
    return personData;
  }

  // Get relocation coordinates
  const coordinates = relocationContext.coordinates || {
    latitude: relocationContext.latitude,
    longitude: relocationContext.longitude,
    timezone: relocationContext.timezone
  };

  if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
    console.warn(`[Relocation Shim] Missing coordinates for ${personKey}`);
    return personData;
  }

  // Apply relocation directive
  const relocatedChart = calculateRelocatedChart(
    personData.chart,
    coordinates,
    birthDateTime,
    relocationContext.house_system || 'placidus'
  );

  // Update the person's chart with relocated data
  const updatedPersonData = {
    ...personData,
    chart: {
      ...personData.chart,
      planets: relocatedChart.planets,
      angles: relocatedChart.angles,
      house_cusps: relocatedChart.house_cusps,
      relocation_applied: true,
      relocation_disclosure: relocatedChart.disclosure
    }
  };

  // Update any derived data that might reference house placements
  if (personData.derived?.t2n_aspects) {
    // Re-enrich transit aspects with new house data
    const { mapT2NAspects } = require('../src/raven-lite-mapper');

    // Create relocation context for mapT2NAspects
    const mapRelocationContext = {
      relocation_applied: true,
      relocation_mode: relocationContext.relocation_mode,
      coordinates: coordinates,
      birth_datetime: birthDateTime,
      house_system: relocationContext.house_system || 'placidus'
    };

    // Re-map aspects with relocated house data
    const aspectsRaw = personData.derived.t2n_aspects_raw || [];
    updatedPersonData.derived = {
      ...personData.derived,
      t2n_aspects: mapT2NAspects(aspectsRaw, relocatedChart, mapRelocationContext)
    };
  }

  console.log(`[Relocation Shim] Applied relocation to ${personKey}:`, {
    coordinates,
    house_system: relocationContext.house_system || 'placidus',
    relocated_asc: relocatedChart.angles?.Ascendant?.abs_pos,
    relocated_mc: relocatedChart.angles?.Medium_Coeli?.abs_pos
  });

  return updatedPersonData;
}

/**
 * Extract relocation context from Math Brain request body
 * @param {Object} requestBody - Original request body
 * @returns {Object} Relocation context
 */
function extractRelocationContext(requestBody) {
  const translocation = requestBody.translocation || requestBody.context?.translocation;
  const relocationMode = requestBody.relocation_mode || requestBody.context?.relocation_mode;

  if (!translocation && !relocationMode) {
    return null;
  }

  return {
    relocation_mode: relocationMode || translocation?.method,
    relocation_applied: translocation?.applies || false,
    coordinates: translocation?.coords || translocation?.coordinates,
    latitude: translocation?.latitude,
    longitude: translocation?.longitude,
    timezone: translocation?.tz || translocation?.timezone,
    house_system: translocation?.house_system || requestBody.houses_system_identifier
  };
}

module.exports = {
  applyBalanceMeterRelocationShim,
  extractRelocationContext,
  extractBirthDateTime
};