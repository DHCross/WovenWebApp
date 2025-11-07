const {
  normalizeDegrees,
  toRadians,
  toDegrees,
  julianDay,
  julianCenturiesSinceJ2000,
  meanObliquityOfEcliptic,
  greenwichMeanSiderealTimeHours,
  localSiderealTimeHours,
  calculateMidheaven,
  calculateAscendant,
  calculateWholeSignHouses,
  calculatePlacidusHouses,
} = require('./astro/calculations');
const { DateTime } = require('luxon');


function calculateRelocatedHouses(
  birthDetails,
  relocatedLatitude,
  relocatedLongitude,
  houseSystem
) {
  const { year, month, day, hour, minute, timezone } = birthDetails;

  const dt = DateTime.fromObject({ year, month, day, hour, minute }, { zone: timezone });
  if (!dt.isValid) {
    throw new Error(`Invalid birth date/time/timezone: ${dt.invalidReason}: ${dt.invalidExplanation}`);
  }
  const dateUTC = new Date(dt.toMillis());

  const lstHours = localSiderealTimeHours(dateUTC, relocatedLongitude);
  const obliquity = meanObliquityOfEcliptic(dateUTC);
  const asc = calculateAscendant(lstHours, relocatedLatitude, obliquity);
  const mc = calculateMidheaven(lstHours, obliquity);

  let houses;
  const system = houseSystem || 'placidus'; // Default to placidus

  if (system.toLowerCase() === 'whole_sign') {
    houses = calculateWholeSignHouses(asc);
  } else { // Default to Placidus for 'placidus' or any other value
    houses = calculatePlacidusHouses(lstHours, relocatedLatitude, obliquity, asc, mc);
  }

  return {
    asc: asc,
    mc: mc,
    houses: houses
  };
}

module.exports = {
  calculateRelocatedHouses,
};
