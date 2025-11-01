/**
 * Fetches real astrological aspect data for a given date.
 * This function should be called with the astrology API client passed in.
 * @param {string} date - The date in YYYY-MM-DD format
 * @param {object} personA - Person A's birth data
 * @param {object} personB - Person B's birth data (optional)
 * @param {object} transitData - Pre-fetched transit data from the API
 * @returns {object} Object containing transitsA, transitsB, and synastryAspects arrays
 */
function extractAspectsForDay(day) {
  if (!day) return [];
  if (Array.isArray(day)) return day;
  if (Array.isArray(day.filtered_aspects) && day.filtered_aspects.length) {
    return day.filtered_aspects;
  }
  if (Array.isArray(day.aspects) && day.aspects.length) {
    return day.aspects;
  }
  if (Array.isArray(day.transit_table) && day.transit_table.length) {
    return day.transit_table;
  }
  return [];
}

function extractSynastryAspectsForDay(day) {
  if (!day) return [];
  if (Array.isArray(day)) return day;
  if (Array.isArray(day.aspects)) return day.aspects;
  return [];
}

function getRealAspectData(date, personA, personB, transitData = {}) {
  const transitsA = [];
  const transitsB = [];
  const synastryAspects = [];

  const dayA = transitData?.person_a?.chart?.transitsByDate?.[date];
  if (dayA) {
    const extracted = extractAspectsForDay(dayA);
    if (Array.isArray(extracted)) {
      transitsA.push(...extracted.map(a => ({ ...a, transit: { body: a.p1_name }, natal: { body: a.p2_name } })));
    }
  }

  if (personB) {
    const dayB = transitData?.person_b?.chart?.transitsByDate?.[date];
    if (dayB) {
      const extracted = extractAspectsForDay(dayB);
      if (Array.isArray(extracted)) {
        transitsB.push(...extracted.map(a => ({ ...a, transit: { body: a.p1_name }, natal: { body: a.p2_name } })));
      }
    }

    const synDay = transitData?.synastry?.aspectsByDate?.[date] || transitData?.composite?.transitsByDate?.[date];
    if (synDay) {
      const extracted = extractSynastryAspectsForDay(synDay);
      if (Array.isArray(extracted)) {
        synastryAspects.push(...extracted.map(a => ({ ...a, transit: { body: a.p1_name }, natal: { body: a.p2_name } })));
      }
    }
  }

  return { transitsA, transitsB, synastryAspects };
}

/**
 * DEPRECATED: Mock function kept for standalone CLI testing only.
 * When called from API, use getRealAspectData() instead.
 */
function getMockAspectData(date) {
    return {
        transitsA: [{ p1_name: 'Sun', p2_name: 'Saturn', aspect: 'square', orbit: 0.5 }],
        transitsB: [{ p1_name: 'Venus', p2_name: 'Jupiter', aspect: 'trine', orbit: 1.1 }],
        synastryAspects: [{ p1_name: 'Mars', p2_name: 'Moon', aspect: 'conjunction', orbit: 2.3 }]
    };
}

module.exports = {
  getRealAspectData,
  extractAspectsForDay,
  extractSynastryAspectsForDay,
  getMockAspectData,
};
