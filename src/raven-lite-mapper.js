// Raven-lite AspectModel → t2n_aspects mapper
// This function normalizes API AspectModel[] into Raven-lite t2n_aspects with flags for Hook/Seismograph logic

/**
 * Find house placement for a planet/point in natal chart data
 * @param {string} planetName - Name of planet/point to find
 * @param {Object} natalChart - Natal chart data with planets array
 * @returns {number|null} House number (1-12) or null if not found
 */
function findNatalHouse(planetName, natalChart) {
  if (!natalChart || !Array.isArray(natalChart.planets)) return null;

  const planet = natalChart.planets.find(p => p.name === planetName);
  if (planet && typeof planet.house === 'number' && planet.house >= 1 && planet.house <= 12) {
    return planet.house;
  }

  // Check angles if not found in planets
  if (natalChart.angles) {
    const angleMap = {
      'Ascendant': 1,
      'Medium_Coeli': 10,
      'Descendant': 7,
      'Imum_Coeli': 4
    };

    if (angleMap[planetName]) {
      return angleMap[planetName];
    }
  }

  return null;
}

/**
 * Calculate approximate house for transiting planet based on current position
 * @param {number} absPos - Absolute position in degrees (0-360)
 * @param {Object} natalChart - Natal chart with house cusp data
 * @returns {number|null} House number (1-12) or null if can't determine
 */
function calculateTransitHouse(absPos, natalChart) {
  // Simplified house calculation - in a real implementation, you'd use
  // the house system (Placidus, etc.) and house cusps from the natal chart
  // For now, use a basic equal house approximation based on Ascendant

  if (!natalChart || !natalChart.angles) return null;

  try {
    // Find Ascendant position (1st house cusp)
    const ascendant = natalChart.angles.Ascendant ||
                     natalChart.planets?.find(p => p.name === 'Ascendant');

    if (!ascendant || typeof ascendant.abs_pos !== 'number') return null;

    // Calculate house using equal house system (30° per house)
    const ascPos = ascendant.abs_pos;
    let houseDiff = ((absPos - ascPos + 360) % 360) / 30;
    let houseNum = Math.floor(houseDiff) + 1;

    // Ensure house number is 1-12
    if (houseNum > 12) houseNum -= 12;
    if (houseNum < 1) houseNum += 12;

    return Math.round(houseNum);
  } catch (error) {
    console.warn('Error calculating transit house:', error);
    return null;
  }
}

/**
 * Apply Raven Calder relocation directive: perform internal house calculations
 * when API cannot provide relocated houses
 *
 * @param {Object} natalChart - Original natal chart
 * @param {Object} relocationContext - Relocation parameters
 * @returns {Object} Chart with corrected houses (natal or relocated)
 */
function applyRelocationDirective(natalChart, relocationContext) {
  if (!relocationContext || !natalChart) return natalChart;

  const isRelocated = relocationContext.relocation_applied ||
                     (relocationContext.relocation_mode &&
                      !['none', 'A_natal', 'B_natal'].includes(relocationContext.relocation_mode));

  if (!isRelocated || !relocationContext.coordinates || !relocationContext.birth_datetime) {
    return natalChart;
  }

  // Note: Relocation is now handled natively by AstrologerAPI
  // When fetchNatalChartComplete is called with relocated coordinates,
  // the API returns a chart with relocated houses. This function is
  // kept for backward compatibility but just returns the chart as-is.
  // The real relocation happens at the API level in astrology-mathbrain.js
  return natalChart;
}

/**
 * Normalize API AspectModel[] into Raven-lite t2n_aspects with house data
 * @param {Array} aspects - Array of AspectModel objects from API
 * @param {Object} natalChart - Natal chart data for house lookups
 * @param {Object} relocationContext - Context about relocation/translocation
 * @returns {Array} Array of normalized t2n_aspects with house placements
 */
function mapT2NAspects(aspects, natalChart = null, relocationContext = null) {
  if (!Array.isArray(aspects)) return [];

  // Apply Raven Calder relocation directive to get correct house chart
  const houseChart = applyRelocationDirective(natalChart, relocationContext);

  return aspects.map(a => ({
    p1_name: a.p1_name, // natal planet/point name
    p2_name: a.p2_name, // transiting planet/point name
    p1: a.p1_name, // natal planet/point (legacy field)
    p2: a.p2_name, // transiting planet/point (legacy field)
    aspect: a.aspect, // aspect type (conjunction, square, etc)
    orb: a.orbit, // aspect orb
    orbit: a.orbit, // aspect orb (legacy field)
    retrograde: !!(a.p2_retrograde || a.retrograde), // flag if transiting planet is retrograde
    isOuter: ["Saturn","Uranus","Neptune","Pluto"].includes(a.p2_name), // flag for outer planet
    isPersonal: ["Sun","Moon","Mercury","Venus","Mars","ASC","MC"].includes(a.p1_name), // flag for personal point
    hard: ["square","opposition","conjunction"].includes(a.aspect), // flag for hard aspect

    // HOUSE ENRICHMENT - Add house placement data using Raven Calder directive
    p1_house: findNatalHouse(a.p1_name, houseChart), // house of natal planet (relocated if applicable)
    p2_house: a.p2_abs_pos ? calculateTransitHouse(a.p2_abs_pos, houseChart) : null, // house of transiting planet

    // Add raw API data for debugging
    p1_abs_pos: a.p1_abs_pos,
    p2_abs_pos: a.p2_abs_pos,

    // Add relocation information for transparency
    using_relocated_houses: houseChart.relocation_applied || false,
    relocation_mode: relocationContext?.relocation_mode || null,
    house_calculation_method: houseChart.calculation_method || 'natal_chart_api',

    // Add more flags as needed for Hook/Seismograph logic
  }));
}

module.exports = { mapT2NAspects };
