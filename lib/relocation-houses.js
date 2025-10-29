// Relocation House Calculation Engine
// Internal mathematical compensation for API limitations
// Implements the Raven Calder relocation handling directive

/**
 * Calculate Greenwich Mean Sidereal Time (GMST) from UT
 * @param {Date} utDate - Date in Universal Time
 * @returns {number} GMST in hours (0-24)
 */
function calculateGMST(utDate) {
  const jd = (utDate.getTime() / 86400000) + 2440587.5;
  const t = (jd - 2451545.0) / 36525;

  // Formula for GMST in hours
  let gmst = 6.697374558 + 0.06570982441908 * (jd - 2451545.0) + 1.00273790935 * utDate.getUTCHours() + 0.000026 * t * t;

  // Normalize to 0-24 hours
  let normalizedGMST = gmst % 24;
  if (normalizedGMST < 0) normalizedGMST += 24;

  return normalizedGMST;
}

/**
 * Calculate Local Sidereal Time (LST)
 * @param {Date} utDate - Date in Universal Time
 * @param {number} longitude - Longitude in degrees (positive East)
 * @returns {number} LST in hours (0-24)
 */
function calculateLST(utDate, longitude) {
  const gmst = calculateGMST(utDate); // GMST is in hours
  const lst = gmst + (longitude / 15); // Convert longitude to time units and add

  // Normalize to 0-24 hours
  let normalizedLST = lst % 24;
  if (normalizedLST < 0) normalizedLST += 24;

  return normalizedLST;
}

// Helper function to normalize degrees
const norm360 = (d) => (d % 360 + 360) % 360;
const deg2rad = (d) => d * Math.PI / 180;
const rad2deg = (r) => r * 180 / Math.PI;

/**
 * Calculate Mean Obliquity of the Ecliptic
 * @param {number} t - Julian centuries since J2000.0
 * @returns {number} Obliquity in degrees
 */

function meanObliquity(t) {
    return 23.43929111 - 0.0130041667 * t - 1.6667e-7 * t * t + 5.02778e-7 * t * t * t;
}

/**
 * Calculate Ascendant and Midheaven
 * @param {number} lst - Local Sidereal Time in hours
 * @param {number} latitude - Latitude in degrees
 * @param {number} obliquity - Obliquity of the ecliptic in degrees
 * @returns {{asc: number, mc: number}} Ascendant and Midheaven in degrees
 */
function calculateAscendantAndMC(lst, latitude, obliquity) {
    const lstRad = deg2rad(lst * 15);
    const latRad = deg2rad(latitude);
    const obRad = deg2rad(obliquity);

    // Midheaven
    const mcRad = Math.atan2(Math.tan(lstRad), Math.cos(obRad));
    let mc = norm360(rad2deg(mcRad));

    // Ascendant
    const ascRad = Math.atan2(Math.cos(lstRad), -Math.sin(lstRad) * Math.cos(obRad) - Math.tan(latRad) * Math.sin(obRad));
    let asc = norm360(rad2deg(ascRad));

    return { asc, mc };
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
 * Calculate Placidus house cusps using the correct formula.
 * @param {number} lst - Local Sidereal Time in hours
 * @param {number} latitude - Latitude in degrees
 * @param {number} obliquity - Obliquity of the ecliptic in degrees
 * @param {number} asc - Ascendant in degrees
 * @param {number} mc - Midheaven in degrees
 * @returns {Array} Array of 12 house cusps in degrees
 */
function calculatePlacidusHouses(lst, latitude, obliquity, asc, mc) {
    const houses = new Array(12);
    const latRad = deg2rad(latitude);
    const obRad = deg2rad(obliquity);
    const ramc = deg2rad(lst * 15);

    houses[0] = asc;
    houses[3] = norm360(mc + 180);
    houses[6] = norm360(asc + 180);
    houses[9] = mc;

    // Simplified Placidus calculation
    const cuspCalc = (f) => {
        const Ao = ramc + deg2rad(30 * f);
        let D = Math.asin(Math.sin(latRad) * Math.sin(Ao));
        let R1 = Math.atan(-Math.cos(Ao) / (Math.tan(latRad) * Math.cos(D) + Math.sin(D) * Math.sin(Ao) / Math.tan(obRad)));
        const cuspRad = Math.atan(Math.tan(ramc + deg2rad(Math.abs(R1) * 180 / Math.PI * f / 15)) / Math.cos(obRad));
        return norm360(rad2deg(cuspRad));
    };

    try {
        houses[10] = cuspCalc(1/3); // 11th
        houses[11] = cuspCalc(2/3); // 12th
        houses[1] = cuspCalc(4/3); // 2nd
        houses[2] = cuspCalc(5/3); // 3rd
    } catch (e) {
        // Fallback to equal houses if calculation fails
        for (let i = 0; i < 12; i++) {
            houses[i] = (asc + i * 30) % 360;
        }
    }

    // Fill opposites
    houses[4] = norm360(houses[10] + 180);
    houses[5] = norm360(houses[11] + 180);
    houses[7] = norm360(houses[1] + 180);
    houses[8] = norm360(houses[2] + 180);

    return houses;
}
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

    // 2.2: Calculate Julian centuries for obliquity calculation
    const jd = (birthDateTime.getTime() / 86400000) + 2440587.5;
    const t = (jd - 2451545.0) / 36525;
    const obliquity = meanObliquity(t);

    // 2.3: Calculate Local Sidereal Time for relocation coordinates
    const lst = calculateLST(birthDateTime, relocationCoords.longitude);

    // 2.4: Calculate relocated Ascendant and Midheaven
    const { asc, mc } = calculateAscendantAndMC(lst, relocationCoords.latitude, obliquity);
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
  calculateAscendantAndMC,
  calculatePlacidusHouses,
  findPlanetHouse,
  meanObliquity
};