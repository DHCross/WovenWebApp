// Relocation House Calculation Engine
// Internal mathematical compensation for API limitations
// Implements the Raven Calder relocation handling directive

const {
  normalizeDegrees,
  julianDay,
  julianCenturiesSinceJ2000,
  meanObliquityOfEcliptic,
  greenwichMeanSiderealTimeHours,
  localSiderealTimeHours,
  calculateAscendant,
  calculateMidheaven,
  calculateAscendantAndMidheaven,
  calculateWholeSignHouses,
  calculatePlacidusHouses,
  findHouseIndex,
} = require('./astro/calculations');

/**
 * Calculate Greenwich Mean Sidereal Time (GMST) in hours.
 * @param {Date} utDate
 * @returns {number}
 */
function calculateGMST(utDate) {
  return greenwichMeanSiderealTimeHours(utDate);
}

/**
 * Calculate Local Sidereal Time (LST)
 * @param {Date} utDate - Date in Universal Time
 * @param {number} longitude - Longitude in degrees (positive East)
 * @returns {number} LST in hours (0-24)
 */
function calculateLST(utDate, longitude) {
  return localSiderealTimeHours(utDate, longitude);
}

/**
 * Calculate Ascendant and Midheaven
 * @param {number} lst - Local Sidereal Time in hours
 * @param {number} latitude - Latitude in degrees
 * @param {number} obliquity - Obliquity of the ecliptic in degrees
 * @returns {{asc: number, mc: number}} Ascendant and Midheaven in degrees
 */
const calculateAscendantDegrees = calculateAscendant;
const calculateMidheavenDegrees = calculateMidheaven;

/**
 * Calculate Whole Sign house cusps from Ascendant
 * @param {number} ascendant - Ascendant in degrees
 * @returns {Array} Array of 12 house cusps in degrees
 */
const findPlanetHouseIndex = findHouseIndex;

/**
 * Main relocation calculation function - UNIVERSAL GLOBAL COVERAGE
 * Step-by-step procedure as specified by Raven Calder directive
 * Works for ANY coordinates worldwide within habitable latitudes
 *
 * @param {Object} natalChart - Original natal chart data
 * @param {Object} relocationCoords - {latitude, longitude, timezone}
 * @param {Date} birthDateTime - Birth date/time in UTC
 * @param {string} houseSystem - 'placidus', 'whole_sign', 'equal', 'porphyry'
 * @returns {Object} Relocated chart with corrected houses
 */
function calculateRelocatedChart(natalChart, relocationCoords, birthDateTime, houseSystem = 'placidus') {
  try {
    // Global validation: ensure coordinates are within valid ranges
    if (Math.abs(relocationCoords.latitude) > 85) {
      console.warn(`Polar latitude detected (${relocationCoords.latitude}°); forcing Whole Sign houses for stability`);
      houseSystem = 'whole_sign';
    }

    // Normalize longitude to -180 to +180 range (handles International Date Line)
    let normalizedLongitude = relocationCoords.longitude;
    while (normalizedLongitude > 180) normalizedLongitude -= 360;
    while (normalizedLongitude < -180) normalizedLongitude += 360;
    // Step 1: Lock the Planetary Framework
    // Planetary positions and aspects remain from natal chart
    const planets = natalChart.planets || [];
    const aspects = natalChart.aspects || [];

    // Step 2: Recalculate Houses for Relocation

    // 2.1: Birth time is already in UT (birthDateTime parameter)

    // 2.2: Calculate Julian centuries for obliquity calculation
    const jd = julianDay(birthDateTime);
    const t = julianCenturiesSinceJ2000(jd);
    const obliquity = meanObliquityOfEcliptic(t);

    // 2.3: Calculate Local Sidereal Time for relocation coordinates
    const lst = calculateLST(birthDateTime, relocationCoords.longitude);

    // 2.4: Calculate relocated Ascendant and Midheaven
    const { asc, mc } = calculateAscendantAndMidheaven(lst, relocationCoords.latitude, obliquity);
    const relocatedAscendant = asc;
    const relocatedMC = mc;

    // 2.5: Calculate house cusps according to house system
    let houseCusps;
    if (houseSystem.toLowerCase() === 'whole_sign') {
      houseCusps = calculateWholeSignHouses(relocatedAscendant);
    } else {
      // Default to Placidus
      houseCusps = calculatePlacidusHouses(lst, relocationCoords.latitude, obliquity, relocatedAscendant, relocatedMC);
    }

    // Step 3: Merge Natal + Relocated Charts
    const relocatedPlanets = planets.map(planet => {
      const planetLongitude = planet.abs_pos || planet.position || planet.longitude;
      if (typeof planetLongitude === 'number') {
        const newHouse = findPlanetHouseIndex(planetLongitude, houseCusps);
        return {
          ...planet,
          house: newHouse,
          house_relocated: true
        };
      }
      return planet;
    });

    // Create relocated angles
    const relocatedAngles = {
      Ascendant: {
        abs_pos: relocatedAscendant,
        house: 1,
        name: 'Ascendant'
      },
      Medium_Coeli: {
        abs_pos: relocatedMC,
        house: 10,
        name: 'Medium_Coeli'
      },
      Descendant: {
        abs_pos: (relocatedAscendant + 180) % 360,
        house: 7,
        name: 'Descendant'
      },
      Imum_Coeli: {
        abs_pos: (relocatedMC + 180) % 360,
        house: 4,
        name: 'Imum_Coeli'
      }
    };

    return {
      planets: relocatedPlanets,
      angles: relocatedAngles,
      aspects: aspects, // Aspects don't change with relocation
      house_cusps: houseCusps,
      house_system: houseSystem,
      relocation_applied: true,
      relocation_coords: relocationCoords,
      calculation_method: 'internal_math_engine',
      disclosure: `Houses recalculated for ${relocationCoords.latitude}°N, ${relocationCoords.longitude}°E using ${houseSystem} system`
    };

  } catch (error) {
    // Step 5: Error Handling
    console.warn('Relocation calculation failed:', error);
    return {
      ...natalChart,
      relocation_applied: false,
      relocation_error: error.message,
      disclosure: 'Relocation attempted but could not be applied; houses shown are natal.'
    };
  }
}

module.exports = {
  calculateRelocatedChart,
  calculateGMST,
  calculateLST,
  calculateAscendant: calculateAscendantDegrees,
  calculateMidheaven: calculateMidheavenDegrees,
  calculateAscendantAndMC: calculateAscendantAndMidheaven,
  calculatePlacidusHouses,
  findPlanetHouse: findPlanetHouseIndex,
  meanObliquity: meanObliquityOfEcliptic,
};
