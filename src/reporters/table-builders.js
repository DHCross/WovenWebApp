// Table builders for comprehensive PDF export
// Generates structured data tables from Math Brain results

const { safeNum } = require('../normalizers/data-normalizer');

/**
 * Resolves day aspects from various possible structures
 */
function resolveDayAspects(dayEntry) {
  if (!dayEntry) return [];
  if (Array.isArray(dayEntry)) return dayEntry;
  if (typeof dayEntry === 'object') {
    if (Array.isArray(dayEntry.filtered_aspects)) return dayEntry.filtered_aspects;
    if (Array.isArray(dayEntry.aspects)) return dayEntry.aspects;
    if (Array.isArray(dayEntry.hooks)) return dayEntry.hooks;
    if (Array.isArray(dayEntry.drivers)) return dayEntry.drivers;
  }
  return [];
}

/**
 * Formats degree position as degree°minute'
 */
function formatDegree(absPos) {
  if (typeof absPos !== 'number') return 'N/A';
  const degrees = Math.floor(absPos);
  const minutes = Math.floor((absPos % 1) * 60);
  return `${degrees}°${String(minutes).padStart(2, '0')}'`;
}

/**
 * Calculate aspect intensity based on orb, planet, and aspect type
 */
function calculateIntensity(aspect) {
  if (!aspect) return 0;

  const orbWeight = aspect.orbit < 1 ? 3 : aspect.orbit < 3 ? 2 : 1;
  const aspectWeight = {
    'conjunction': 3, 'opposition': 3, 'square': 2,
    'trine': 2, 'sextile': 1, 'quincunx': 1
  }[aspect.aspect] || 1;

  const planetWeight = {
    'Sun': 3, 'Moon': 3, 'Mercury': 2, 'Venus': 2, 'Mars': 2,
    'Jupiter': 2, 'Saturn': 2, 'Uranus': 1, 'Neptune': 1, 'Pluto': 1
  };

  const p1Weight = planetWeight[aspect.p1_name] || 1;
  const p2Weight = planetWeight[aspect.p2_name] || 1;

  return orbWeight * aspectWeight * Math.max(p1Weight, p2Weight);
}

/**
 * Build natal positions table for PDF export
 */
function buildNatalPositionsTable(personA) {
  const positions = [];
  const chart = personA?.chart?.natal;
  if (!chart?.data) return positions;

  // Planets
  const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  planets.forEach(planet => {
    const key = planet.toLowerCase();
    const data = chart.data[key];
    if (data) {
      positions.push({
        body: planet,
        sign: data.sign || 'N/A',
        degree: formatDegree(data.abs_pos),
        house: data.house ? `${data.house}` : 'N/A',
        quality: data.quality || '',
        element: data.element || '',
        retrograde: data.retrograde ? 'R' : '',
        speed: data.speed_deg_per_day ? `${data.speed_deg_per_day.toFixed(4)}°/day` : ''
      });
    }
  });

  // Additional Points (Chiron, Nodes, Lilith)
  const additionalPoints = [
    { key: 'chiron', name: 'Chiron' },
    { key: 'mean_node', name: 'North Node' },
    { key: 'mean_south_node', name: 'South Node' },
    { key: 'mean_lilith', name: 'Lilith' }
  ];

  additionalPoints.forEach(({ key, name }) => {
    const data = chart.data[key];
    if (data) {
      positions.push({
        body: name,
        sign: data.sign || 'N/A',
        degree: formatDegree(data.abs_pos),
        house: data.house ? `${data.house}` : 'N/A',
        quality: data.quality || '',
        element: data.element || '',
        retrograde: data.retrograde ? 'R' : (data.stationary ? 'S' : ''),
        speed: data.speed_deg_per_day ? `${data.speed_deg_per_day.toFixed(4)}°/day` : ''
      });
    }
  });

  // Angles
  const angles = [
    { key: 'ascendant', name: 'Ascendant', house: '1st Cusp' },
    { key: 'medium_coeli', name: 'Midheaven', house: '10th Cusp' },
    { key: 'descendant', name: 'Descendant', house: '7th Cusp' },
    { key: 'imum_coeli', name: 'IC', house: '4th Cusp' }
  ];

  angles.forEach(({ key, name, house }) => {
    const data = chart.data[key];
    if (data) {
      positions.push({
        body: name,
        sign: data.sign || 'N/A',
        degree: formatDegree(data.abs_pos),
        house: house,
        quality: data.quality || '',
        element: data.element || '',
        retrograde: '',
        speed: ''
      });
    }
  });

  return positions;
}

/**
 * Build house cusps table for PDF export
 */
function buildHouseCuspsTable(personA) {
  const cusps = [];
  const chart = personA?.chart?.natal;
  if (!chart?.data) return cusps;

  // All 12 house cusps
  const houseKeys = [
    { key: 'ascendant', house: 1, name: '1st House (Ascendant)' },
    { key: 'house_2', house: 2, name: '2nd House' },
    { key: 'house_3', house: 3, name: '3rd House' },
    { key: 'imum_coeli', house: 4, name: '4th House (IC)' },
    { key: 'house_5', house: 5, name: '5th House' },
    { key: 'house_6', house: 6, name: '6th House' },
    { key: 'descendant', house: 7, name: '7th House (Descendant)' },
    { key: 'house_8', house: 8, name: '8th House' },
    { key: 'house_9', house: 9, name: '9th House' },
    { key: 'medium_coeli', house: 10, name: '10th House (MC)' },
    { key: 'house_11', house: 11, name: '11th House' },
    { key: 'house_12', house: 12, name: '12th House' }
  ];

  houseKeys.forEach(({ key, house, name }) => {
    const data = chart.data[key];
    if (data) {
      cusps.push({
        house: name,
        sign: data.sign || 'N/A',
        degree: formatDegree(data.abs_pos),
        quality: data.quality || '',
        element: data.element || ''
      });
    }
  });

  return cusps;
}

/**
 * Build natal aspects table for PDF export
 */
function buildNatalAspectsTable(personA) {
  const aspects = personA?.chart?.natal?.aspects || [];
  return aspects.map(asp => ({
    planet1: asp.p1_name || 'N/A',
    aspect: asp.aspect || 'N/A',
    planet2: asp.p2_name || 'N/A',
    orb: asp.orbit ? `${asp.orbit.toFixed(2)}°` : 'N/A',
    applying: asp.phase === 'applying' ? 'A' : asp.phase === 'separating' ? 'S' : 'N/A',
    strength: !asp.orbit ? 'N/A' :
              asp.orbit < 1 ? 'Exact' :
              asp.orbit < 3 ? 'Close' : 'Wide',
    type: getAspectType(asp.aspect)
  })).sort((a, b) => {
    const orbA = parseFloat(a.orb) || 999;
    const orbB = parseFloat(b.orb) || 999;
    return orbA - orbB;
  });
}

/**
 * Build transit aspects table for PDF export
 */
function buildTransitAspectsTable(result) {
  const transits = [];
  const transitsByDate = result?.person_a?.chart?.transitsByDate || {};

  Object.entries(transitsByDate).forEach(([date, dayData]) => {
    const aspects = resolveDayAspects(dayData);
    aspects.forEach(asp => {
      if (asp.p1_name && asp.p2_name && asp.aspect) {
        transits.push({
          date: date,
          transit_planet: asp.p1_name,
          aspect: asp.aspect,
          natal_planet: asp.p2_name,
          orb: asp.orbit ? `${asp.orbit.toFixed(2)}°` : 'N/A',
          applying: asp.phase === 'applying' ? 'A' : asp.phase === 'separating' ? 'S' : 'N/A',
          intensity: asp.intensity || calculateIntensity(asp),
          type: getAspectType(asp.aspect)
        });
      }
    });
  });

  return transits.sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    return (b.intensity || 0) - (a.intensity || 0);
  });
}

/**
 * Build daily balance readings table for PDF export
 */
function buildDailyReadingsTable(timeSeries) {
  if (!timeSeries?.daily) return [];

  return Object.entries(timeSeries.daily).map(([date, reading]) => ({
    date: date,
    magnitude: reading.magnitude ? reading.magnitude.toFixed(2) : 'N/A',
    magnitude_label: reading.magnitude_label || '',
    valence: reading.valence ? reading.valence.toFixed(2) : 'N/A',
    valence_label: reading.valence_label || '',
    volatility: reading.volatility ? reading.volatility.toFixed(2) : 'N/A',
    volatility_label: reading.volatility_label || '',
    primary_transit: reading.primary_transit || reading.strongest_aspect || '',
    notes: reading.notes || ''
  })).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Build synastry aspects table for relational reports
 */
function buildSynastryAspectsTable(result) {
  const synastryAspects = result?.synastry?.aspects || [];
  return synastryAspects.map(asp => ({
    person_a_planet: asp.p1_name || 'N/A',
    aspect: asp.aspect || 'N/A',
    person_b_planet: asp.p2_name || 'N/A',
    orb: asp.orbit ? `${asp.orbit.toFixed(2)}°` : 'N/A',
    type: getAspectType(asp.aspect),
    strength: !asp.orbit ? 'N/A' :
              asp.orbit < 1 ? 'Exact' :
              asp.orbit < 3 ? 'Close' : 'Wide',
    dynamic: getSynastryDynamic(asp),
    intensity: calculateIntensity(asp)
  })).sort((a, b) => {
    const orbA = parseFloat(a.orb) || 999;
    const orbB = parseFloat(b.orb) || 999;
    return orbA - orbB;
  });
}

/**
 * Build composite positions table for composite reports
 */
function buildCompositePositionsTable(result) {
  const positions = [];
  const composite = result?.composite?.data;
  if (!composite) return positions;

  // Composite planets
  const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  planets.forEach(planet => {
    const key = planet.toLowerCase();
    const data = composite[key];
    if (data) {
      positions.push({
        body: `Composite ${planet}`,
        sign: data.sign || 'N/A',
        degree: formatDegree(data.abs_pos),
        house: data.house ? `${data.house}` : 'N/A',
        quality: data.quality || '',
        element: data.element || ''
      });
    }
  });

  // Composite angles
  const angles = [
    { key: 'ascendant', name: 'Composite Ascendant' },
    { key: 'medium_coeli', name: 'Composite Midheaven' }
  ];

  angles.forEach(({ key, name }) => {
    const data = composite[key];
    if (data) {
      positions.push({
        body: name,
        sign: data.sign || 'N/A',
        degree: formatDegree(data.abs_pos),
        house: key === 'ascendant' ? '1st Cusp' : '10th Cusp',
        quality: data.quality || '',
        element: data.element || ''
      });
    }
  });

  return positions;
}

/**
 * Get aspect type classification
 */
function getAspectType(aspectName) {
  const hardAspects = ['conjunction', 'square', 'opposition'];
  const softAspects = ['trine', 'sextile'];
  const minorAspects = ['quincunx', 'quintile', 'biquintile', 'semi-square', 'sesquiquadrate'];

  if (hardAspects.includes(aspectName)) return 'Hard';
  if (softAspects.includes(aspectName)) return 'Soft';
  if (minorAspects.includes(aspectName)) return 'Minor';
  return 'Other';
}

/**
 * Get synastry dynamic description
 */
function getSynastryDynamic(aspect) {
  const aspectType = getAspectType(aspect.aspect);
  const planet1 = aspect.p1_name;
  const planet2 = aspect.p2_name;

  // Simplified dynamic classification
  if (aspectType === 'Hard') {
    return 'Tension/Growth';
  } else if (aspectType === 'Soft') {
    return 'Flow/Support';
  } else {
    return 'Complex/Variable';
  }
}

/**
 * Build comprehensive summary statistics
 */
function buildSummaryStats(result) {
  const stats = {
    natal: { planets: 0, aspects: 0, hard_aspects: 0, soft_aspects: 0 },
    transits: { total_aspects: 0, exact_transits: 0, days_covered: 0 },
    balance: { avg_magnitude: 0, avg_valence: 0, avg_volatility: 0 }
  };

  // Count natal elements
  const natalAspects = result?.person_a?.chart?.natal?.aspects || [];
  stats.natal.aspects = natalAspects.length;
  stats.natal.hard_aspects = natalAspects.filter(asp => getAspectType(asp.aspect) === 'Hard').length;
  stats.natal.soft_aspects = natalAspects.filter(asp => getAspectType(asp.aspect) === 'Soft').length;

  // Count transit elements
  const transitsByDate = result?.person_a?.chart?.transitsByDate || {};
  stats.transits.days_covered = Object.keys(transitsByDate).length;

  let totalTransitAspects = 0;
  let exactTransits = 0;
  Object.values(transitsByDate).forEach(dayData => {
    const aspects = resolveDayAspects(dayData);
    totalTransitAspects += aspects.length;
    exactTransits += aspects.filter(asp => asp.orbit < 1).length;
  });
  stats.transits.total_aspects = totalTransitAspects;
  stats.transits.exact_transits = exactTransits;

  return stats;
}

module.exports = {
  buildNatalPositionsTable,
  buildHouseCuspsTable,
  buildNatalAspectsTable,
  buildTransitAspectsTable,
  buildDailyReadingsTable,
  buildSynastryAspectsTable,
  buildCompositePositionsTable,
  buildSummaryStats,
  resolveDayAspects,
  formatDegree,
  calculateIntensity,
  getAspectType,
  getSynastryDynamic
};