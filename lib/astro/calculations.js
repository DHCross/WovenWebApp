// Core astronomical utility functions shared across the app.
// Implements Julian Day conversions, sidereal time, and angle helpers.

const {
  MS_PER_DAY,
  HOURS_PER_DAY,
  DEGREES_PER_HOUR,
  JULIAN_DAY_UNIX_EPOCH,
  JULIAN_DAY_J2000,
  MEAN_OBLIQUITY_COEFFICIENTS,
} = require('./constants');

const TWO_PI = Math.PI * 2;

const normalizeDegrees = (value) => {
  if (!Number.isFinite(value)) return 0;
  const result = value % 360;
  return result < 0 ? result + 360 : result;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const toDegrees = (radians) => (radians * 180) / Math.PI;

const julianDay = (date) => {
  if (!(date instanceof Date)) {
    throw new TypeError('julianDay: expected Date instance');
  }
  return date.getTime() / MS_PER_DAY + JULIAN_DAY_UNIX_EPOCH;
};

const julianCenturiesSinceJ2000 = (input) => {
  const jd = input instanceof Date ? julianDay(input) : Number(input);
  return (jd - JULIAN_DAY_J2000) / 36525;
};

const meanObliquityOfEcliptic = (input) => {
  const T = typeof input === 'number' ? input : julianCenturiesSinceJ2000(input);
  const { c0, c1, c2, c3 } = MEAN_OBLIQUITY_COEFFICIENTS;
  return c0 + T * (c1 + T * (c2 + T * c3));
};

const greenwichMeanSiderealTimeDegrees = (date) => {
  const jd = julianDay(date);
  const T = (jd - JULIAN_DAY_J2000) / 36525;
  const gmst =
    280.46061837 +
    360.98564736629 * (jd - JULIAN_DAY_J2000) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return normalizeDegrees(gmst);
};

const greenwichMeanSiderealTimeHours = (date) =>
  greenwichMeanSiderealTimeDegrees(date) / DEGREES_PER_HOUR;

const localSiderealTimeDegrees = (date, longitudeDeg) =>
  normalizeDegrees(greenwichMeanSiderealTimeDegrees(date) + longitudeDeg);

const localSiderealTimeHours = (date, longitudeDeg) =>
  localSiderealTimeDegrees(date, longitudeDeg) / DEGREES_PER_HOUR;

const calculateMidheaven = (lstHours, obliquityDegrees) => {
  const lstRad = toRadians(lstHours * DEGREES_PER_HOUR);
  const obRad = toRadians(obliquityDegrees);
  const numerator = Math.sin(lstRad);
  const denominator = Math.cos(lstRad) * Math.cos(obRad);
  const longitude = toDegrees(Math.atan2(numerator, denominator));
  return normalizeDegrees(longitude);
};

const calculateAscendant = (lstHours, latitudeDegrees, obliquityDegrees) => {
  const lstRad = toRadians(lstHours * DEGREES_PER_HOUR);
  const latRad = toRadians(latitudeDegrees);
  const obRad = toRadians(obliquityDegrees);

  const numerator = Math.cos(lstRad);
  const denominator =
    -Math.sin(lstRad) * Math.cos(obRad) - Math.tan(latRad) * Math.sin(obRad);
  const longitude = toDegrees(Math.atan2(numerator, denominator));
  return normalizeDegrees(longitude);
};

const calculateAscendantAndMidheaven = (lstHours, latitudeDegrees, obliquityDegrees) => {
  const mc = calculateMidheaven(lstHours, obliquityDegrees);
  const asc = calculateAscendant(lstHours, latitudeDegrees, obliquityDegrees);
  return { asc, mc };
};

const calculateWholeSignHouses = (ascendantDegrees) => {
  const houses = new Array(12);
  const base = Math.floor(ascendantDegrees / 30) * 30;
  for (let i = 0; i < 12; i += 1) {
    houses[i] = normalizeDegrees(base + i * 30);
  }
  return houses;
};

const calculatePlacidusHouses = (lstHours, latitudeDegrees, obliquityDegrees, ascDegrees, mcDegrees) => {
  const houses = new Array(12);

  // Directly set the 4 cardinal cusps
  houses[0] = normalizeDegrees(ascDegrees); // 1st House Cusp (Ascendant)
  houses[3] = normalizeDegrees(mcDegrees + 180); // 4th House Cusp (Imum Coeli)
  houses[6] = normalizeDegrees(ascDegrees + 180); // 7th House Cusp (Descendant)
  houses[9] = normalizeDegrees(mcDegrees); // 10th House Cusp (Midheaven)

  const latRad = toRadians(latitudeDegrees);
  const obRad = toRadians(obliquityDegrees);
  const ramc = toRadians(lstHours * DEGREES_PER_HOUR); // Right Ascension of Midheaven in radians

  // Function to find the Right Ascension on the Ecliptic (RAMC) for a given cusp
  const findCuspRamc = (cuspRatio) => {
    let ra = ramc + toRadians(30 * cuspRatio); // Initial guess
    for (let i = 0; i < 5; i++) { // Iterate to refine
        const dec = Math.asin(Math.sin(ra) * Math.sin(obRad));
        const pole = Math.asin(Math.tan(latRad) * Math.tan(dec));
        ra = ramc + toRadians(30 * cuspRatio) + pole;
    }
    return ra;
  };

  // Cusp factors for Placidus
  const cuspFactors = {
    11: 1 / 3,
    12: 2 / 3,
    2: 4 / 3,
    3: 5 / 3,
  };

  // Ecliptic longitude from Right Ascension
  const eclipticLongitude = (ra) => {
    const y = Math.sin(ra) * Math.cos(obRad);
    const x = Math.cos(ra);
    let lon = Math.atan2(y, x);
    return normalizeDegrees(toDegrees(lon));
  };

  try {
    houses[10] = eclipticLongitude(findCuspRamc(cuspFactors[11])); // 11th Cusp
    houses[11] = eclipticLongitude(findCuspRamc(cuspFactors[12])); // 12th Cusp
    houses[1] = eclipticLongitude(findCuspRamc(cuspFactors[2]));   // 2nd Cusp
    houses[2] = eclipticLongitude(findCuspRamc(cuspFactors[3]));   // 3rd Cusp

    // Opposite houses
    houses[4] = normalizeDegrees(houses[10] + 180);
    houses[5] = normalizeDegrees(houses[11] + 180);
    houses[7] = normalizeDegrees(houses[1] + 180);
    houses[8] = normalizeDegrees(houses[2] + 180);
  } catch (e) {
      // Fallback to Equal houses on error
    for (let i = 0; i < 12; i += 1) {
        houses[i] = normalizeDegrees(ascDegrees + i * 30);
    }
  }

  return houses;
};

const findHouseIndex = (planetLongitude, houseCusps) => {
  const angle = normalizeDegrees(planetLongitude);
  for (let i = 0; i < 12; i += 1) {
    const start = houseCusps[i];
    const end = houseCusps[(i + 1) % 12];
    if (start <= end) {
      if (angle >= start && angle < end) return i + 1;
    } else if (angle >= start || angle < end) {
      return i + 1;
    }
  }
  return 1;
};

module.exports = {
  normalizeDegrees,
  toRadians,
  toDegrees,
  julianDay,
  julianCenturiesSinceJ2000,
  meanObliquityOfEcliptic,
  greenwichMeanSiderealTimeDegrees,
  greenwichMeanSiderealTimeHours,
  localSiderealTimeDegrees,
  localSiderealTimeHours,
  calculateMidheaven,
  calculateAscendant,
  calculateAscendantAndMidheaven,
  calculateWholeSignHouses,
  calculatePlacidusHouses,
  findHouseIndex,
};
