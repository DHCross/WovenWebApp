// Shared astronomical constants used across relocation and balance calculations.

const MS_PER_DAY = 86400000;
const HOURS_PER_DAY = 24;
const DEGREES_PER_HOUR = 15;
const JULIAN_DAY_UNIX_EPOCH = 2440587.5; // JD for 1970-01-01T00:00:00Z
const JULIAN_DAY_J2000 = 2451545.0; // JD for 2000-01-01T12:00:00Z

// Mean obliquity polynomial coefficients (arcseconds) converted to degrees
// Source: IAU 2006 reduction (Meeus, Astronomical Algorithms, ch. 21)
const MEAN_OBLIQUITY_COEFFICIENTS = {
  c0: 23.43929111,
  c1: -0.0130041666667,
  c2: -0.0000001666667,
  c3: 0.0000005027778,
};

module.exports = {
  MS_PER_DAY,
  HOURS_PER_DAY,
  DEGREES_PER_HOUR,
  JULIAN_DAY_UNIX_EPOCH,
  JULIAN_DAY_J2000,
  MEAN_OBLIQUITY_COEFFICIENTS,
};
