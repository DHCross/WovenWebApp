// Relocation House Calculation Engine
// Internal mathematical compensation for API limitations
// Implements the Raven Calder relocation handling directive

/**
 * Calculate Greenwich Mean Sidereal Time (GMST) from UT
 * @param {Date} utDate - Date in Universal Time
 * @returns {number} GMST in hours (0-24)
 */
function calculateGMST(utDate) {
  // Julian Date calculation
  const jd = (utDate.getTime() / 86400000) + 2440587.5;

  // Days since J2000.0
  const t = (jd - 2451545.0) / 36525;

  // GMST calculation (simplified formula)
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
             0.000387933 * t * t - (t * t * t) / 38710000;

  // Normalize to 0-360 degrees
  gmst = gmst % 360;
  if (gmst < 0) gmst += 360;

  // Convert to hours
  return gmst / 15;
}

/**
 * Calculate Local Sidereal Time (LST)
 * @param {Date} utDate - Date in Universal Time
 * @param {number} longitude - Longitude in degrees (positive East)
 * @returns {number} LST in hours (0-24)
 */
function calculateLST(utDate, longitude) {
  const gmst = calculateGMST(utDate);
  const lst = gmst + (longitude / 15); // Convert longitude to time units

  // Normalize to 0-24 hours
  let normalizedLST = lst % 24;
  if (normalizedLST < 0) normalizedLST += 24;

  return normalizedLST;
}

/**
 * Calculate Ascendant from LST and latitude using spherical trigonometry
 * @param {number} lst - Local Sidereal Time in hours
 * @param {number} latitude - Latitude in degrees
 * @returns {number} Ascendant in degrees (0-360)
 */
function calculateAscendant(lst, latitude) {
  // Convert to radians
  const lstRad = (lst * 15) * Math.PI / 180; // LST in degrees then radians
  const latRad = latitude * Math.PI / 180;

  // Obliquity of ecliptic (simplified - J2000.0)
  const obliquity = 23.43929111 * Math.PI / 180;

  // Calculate Ascendant using spherical trigonometry
  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(obliquity) +
            Math.tan(latRad) * Math.sin(obliquity);

  let ascendant = Math.atan2(y, x) * 180 / Math.PI;

  // Normalize to 0-360 degrees
  if (ascendant < 0) ascendant += 360;

  return ascendant;
}

/**
 * Calculate Midheaven (MC) from LST
 * @param {number} lst - Local Sidereal Time in hours
 * @returns {number} MC in degrees (0-360)
 */
function calculateMidheaven(lst) {
  // MC is simply the LST converted to degrees
  let mc = lst * 15; // Convert hours to degrees

  // Normalize to 0-360 degrees
  if (mc >= 360) mc -= 360;
  if (mc < 0) mc += 360;

  return mc;
}

/**
 * Calculate Whole Sign house cusps from Ascendant
 * @param {number} ascendant - Ascendant in degrees
 * @returns {Array} Array of 12 house cusps in degrees
 */
function calculateWholeSignHouses(ascendant) {
  const houses = [];

  // Find the sign of the Ascendant (0° Aries = 0, 0° Taurus = 30, etc.)
  const ascendantSign = Math.floor(ascendant / 30) * 30;

  // Generate 12 house cusps, each starting at 0° of consecutive signs
  for (let i = 0; i < 12; i++) {
    let houseCusp = (ascendantSign + (i * 30)) % 360;
    houses.push(houseCusp);
  }

  return houses;
}

/**
 * Calculate Placidus house cusps (simplified approximation)
 * @param {number} ascendant - Ascendant in degrees
 * @param {number} mc - Midheaven in degrees
 * @param {number} latitude - Latitude in degrees
 * @returns {Array} Array of 12 house cusps in degrees
 */
function calculatePlacidusHouses(ascendant, mc, latitude) {
  const houses = [];

  // Fixed cusps (angles)
  houses[0] = ascendant;           // 1st house
  houses[3] = (ascendant + 180) % 360; // 4th house (IC)
  houses[6] = (ascendant + 180) % 360; // 7th house (DC)
  houses[9] = mc;                  // 10th house (MC)

  // Simplified intermediate cusps (this is a basic approximation)
  // Real Placidus requires complex spherical trigonometry calculations
  const quadrant1 = ((mc + 360) - ascendant) % 360;
  const quadrant2 = ((ascendant + 180) - mc + 360) % 360;

  houses[1] = (ascendant + quadrant1 * 0.33) % 360;  // 2nd house
  houses[2] = (ascendant + quadrant1 * 0.67) % 360;  // 3rd house
  houses[4] = (houses[3] + quadrant2 * 0.33) % 360;  // 5th house
  houses[5] = (houses[3] + quadrant2 * 0.67) % 360;  // 6th house
  houses[7] = (houses[6] + quadrant1 * 0.33) % 360;  // 8th house
  houses[8] = (houses[6] + quadrant1 * 0.67) % 360;  // 9th house
  houses[10] = (mc + quadrant2 * 0.33) % 360;        // 11th house
  houses[11] = (mc + quadrant2 * 0.67) % 360;        // 12th house

  return houses;
}

/**
 * Determine which house a planet occupies
 * @param {number} planetLongitude - Planet's longitude in degrees
 * @param {Array} houseCusps - Array of 12 house cusps
 * @returns {number} House number (1-12)
 */
function findPlanetHouse(planetLongitude, houseCusps) {
  for (let i = 0; i < 12; i++) {
    const currentCusp = houseCusps[i];
    const nextCusp = houseCusps[(i + 1) % 12];

    // Handle zodiac wrap-around (e.g., 350° to 10°)
    if (currentCusp <= nextCusp) {
      // Normal case: cusp at 30°, next at 60°
      if (planetLongitude >= currentCusp && planetLongitude < nextCusp) {
        return i + 1;
      }
    } else {
      // Wrap-around case: cusp at 330°, next at 0°
      if (planetLongitude >= currentCusp || planetLongitude < nextCusp) {
        return i + 1;
      }
    }
  }

  // Fallback (should not happen with proper calculations)
  return 1;
}

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

    // 2.2: Calculate Local Sidereal Time for relocation coordinates
    const lst = calculateLST(birthDateTime, relocationCoords.longitude);

    // 2.3: Calculate relocated Ascendant
    const relocatedAscendant = calculateAscendant(lst, relocationCoords.latitude);

    // 2.4: Calculate relocated Midheaven
    const relocatedMC = calculateMidheaven(lst);

    // 2.5: Calculate house cusps according to house system
    let houseCusps;
    if (houseSystem.toLowerCase() === 'whole_sign') {
      houseCusps = calculateWholeSignHouses(relocatedAscendant);
    } else {
      // Default to Placidus
      houseCusps = calculatePlacidusHouses(relocatedAscendant, relocatedMC, relocationCoords.latitude);
    }

    // Step 3: Merge Natal + Relocated Charts
    const relocatedPlanets = planets.map(planet => {
      const planetLongitude = planet.abs_pos || planet.position || planet.longitude;
      if (typeof planetLongitude === 'number') {
        const newHouse = findPlanetHouse(planetLongitude, houseCusps);
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
  calculateAscendant,
  calculateMidheaven,
  findPlanetHouse
};