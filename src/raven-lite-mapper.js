// Raven-lite AspectModel → t2n_aspects mapper
// This function normalizes API AspectModel[] into Raven-lite t2n_aspects with flags for Hook/Seismograph logic

/**
 * Normalize API AspectModel[] into Raven-lite t2n_aspects
 * @param {Array} aspects - Array of AspectModel objects from API
 * @returns {Array} Array of normalized t2n_aspects
 */
function mapT2NAspects(aspects) {
  if (!Array.isArray(aspects)) return [];
  return aspects.map(a => ({
    p1: a.p1_name, // natal planet/point
    p2: a.p2_name, // transiting planet/point
    aspect: a.aspect, // aspect type (conjunction, square, etc)
    orb: a.orbit, // aspect orb
    retrograde: !!(a.p2_retrograde || a.retrograde), // flag if transiting planet is retrograde
    isOuter: ["Saturn","Uranus","Neptune","Pluto"].includes(a.p2_name), // flag for outer planet
    isPersonal: ["Sun","Moon","Mercury","Venus","Mars","ASC","MC"].includes(a.p1_name), // flag for personal point
    hard: ["square","opposition","conjunction"].includes(a.aspect), // flag for hard aspect
    // Add more flags as needed for Hook/Seismograph logic
  }));
}

module.exports = { mapT2NAspects };
