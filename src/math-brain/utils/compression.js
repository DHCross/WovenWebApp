/* eslint-disable no-console */
/**
 * Compression & Delta Calculation Utilities
 * 
 * Handles aspect compression for efficient transit window storage and
 * calculation of day-to-day aspect deltas for transit analysis.
 * 
 * Extracted from lib/server/astrology-mathbrain.js
 */

// Standard bodies and aspects for codebook
const STANDARD_BODIES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Asc','Dsc','MC','IC'];
const STANDARD_ASPECTS = ['conjunction','sextile','square','trine','opposition','quincunx','quintile','biquintile','semi-square','sesquiquadrate'];

/**
 * Compresses an aspect list into indices based on a codebook
 * Keeps only the tightest aspects (by orb) for efficiency
 * 
 * @param {Array} aspects - Array of aspect objects with planet1, planet2, aspect, orbit
 * @param {Object} codebook - Codebook with bodies, aspects, pairs, and patternMap
 * @param {Object} options - Configuration options
 * @param {number} options.maxAspectsPerDay - Maximum aspects to keep per day (default 40)
 * @returns {Array} Compressed aspects as [patternIndex, orb*100] pairs
 */
function compressAspects(aspects, codebook, options = {}) {
  const { maxAspectsPerDay = 40 } = options;

  // Sort by orb tightness and take top aspects
  const sortedAspects = aspects
    .filter(a => a.planet1 && a.planet2 && a.aspect && typeof a.orbit === 'number')
    .sort((a, b) => Math.abs(a.orbit) - Math.abs(b.orbit))
    .slice(0, maxAspectsPerDay);

  const compressedAspects = [];

  sortedAspects.forEach(aspect => {
    const pairKey = [aspect.planet1, aspect.planet2].sort().join('|');
    const pairIndex = codebook.pairs.findIndex(pair => {
      const [p1, p2] = pair;
      return codebook.bodies[p1] + '|' + codebook.bodies[p2] === pairKey;
    });
    const aspectIndex = codebook.aspects.indexOf(aspect.aspect);

    if (pairIndex >= 0 && aspectIndex >= 0) {
      const patternKey = `${pairIndex}:${aspectIndex}`;
      const patternIndex = codebook.patternMap.get(patternKey);

      if (patternIndex !== undefined) {
        // Store orb as fixed-point integer (*100)
        const orb = Math.round(aspect.orbit * 100);
        compressedAspects.push([patternIndex, orb]);
      }
    }
  });

  return compressedAspects;
}

/**
 * Computes delta between two compressed aspect sets
 * Returns additions, updates, and removals for efficient storage
 * 
 * @param {Array} prevCompressed - Previous day's compressed aspects
 * @param {Array} currentCompressed - Current day's compressed aspects
 * @returns {Object} Object with add, upd (update), rem (remove) arrays
 */
function computeDayDeltas(prevCompressed, currentCompressed) {
  const add = [];
  const upd = [];
  const rem = [];

  const prevMap = new Map(prevCompressed);
  const currentMap = new Map(currentCompressed);

  // Find additions and updates
  currentMap.forEach((orb, patternIndex) => {
    if (!prevMap.has(patternIndex)) {
      add.push([patternIndex, orb]);
    } else if (prevMap.get(patternIndex) !== orb) {
      const delta = orb - prevMap.get(patternIndex);
      upd.push([patternIndex, delta]);
    }
  });

  // Find removals
  prevMap.forEach((_, patternIndex) => {
    if (!currentMap.has(patternIndex)) {
      rem.push([patternIndex]);
    }
  });

  return { add, upd, rem };
}

// Standard bodies and aspects for codebook
const NATAL_BODIES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const NATAL_ASPECTS = ['conjunction','square','opposition'];

/**
 * Calculate which natal house a transit position occupies
 * @param {number} transitLongitude - Transit planet's ecliptic longitude (0-360)
 * @param {number[]} houseCusps - Array of 12 house cusp longitudes
 * @returns {number|null} House number (1-12) or null if invalid
 */
function calculateNatalHouse(transitLongitude, houseCusps) {
  const cuspValues = Array.isArray(houseCusps)
    ? houseCusps
    : (houseCusps && typeof houseCusps === 'object'
        ? Object.values(houseCusps).map(c => c.abs_pos)
        : null);

  if (!cuspValues || cuspValues.length < 12 || typeof transitLongitude !== 'number') {
    return null;
  }
  
  // Normalize longitude to 0-360
  const normalizeLon = (lon) => ((lon % 360) + 360) % 360;
  const tLon = normalizeLon(transitLongitude);
  
  // Check each house
  for (let i = 0; i < 12; i++) {
    const currentCusp = normalizeLon(cuspValues[i]);
    const nextCusp = normalizeLon(cuspValues[(i + 1) % 12]);
    
    // Handle zodiac wrap-around (e.g., house 12 ending at 0° Aries)
    if (currentCusp < nextCusp) {
      // Normal case: both cusps in same zodiac cycle
      if (tLon >= currentCusp && tLon < nextCusp) {
        return i + 1; // Houses are 1-indexed
      }
    } else {
      // Wrap case: cusp crosses 0° Aries
      if (tLon >= currentCusp || tLon < nextCusp) {
        return i + 1;
      }
    }
  }
  
  // Fallback: return house 1 if no match found
  return 1;
}

/**
 * Extract house cusp longitudes from birth chart API response
 * @param {object} chartData - Birth chart data from API
 * @returns {number[]|null} Array of 12 house cusp longitudes (degrees) or null
 */
function extractHouseCusps(chartData) {
  if (!chartData || typeof chartData !== 'object') {
    return null;
  }

  const cusps = {};
  const missing = [];
  for (let i = 1; i <= 12; i++) {
    const cuspName = `house_${i}`;
    if (chartData[cuspName] && typeof chartData[cuspName] === 'object') {
      cusps[i] = {
        sign: chartData[cuspName].sign,
        abs_pos: chartData[cuspName].abs_pos,
        norm_pos: chartData[cuspName].norm_pos,
      };
    } else {
      missing.push(cuspName);
    }
  }
  return { cusps, missing };
}

function resolveDayAspects(dayEntry) {
  if (!dayEntry) return [];
  if (Array.isArray(dayEntry)) return dayEntry;
  if (typeof dayEntry === 'object') {
    if (Array.isArray(dayEntry.filtered_aspects)) return dayEntry.filtered_aspects;
    if (Array.isArray(dayEntry.aspects)) return dayEntry.aspects;
    if (Array.isArray(dayEntry.hooks)) return dayEntry.hooks;
  }
  return [];
}

function buildCodebook(transitsByDate, options = {}) {
  const { includeMinors = false, includeAngles = true, maxAspectsPerDay = 40 } = options;

  const bodySet = new Set();
  const aspectSet = new Set();
  const pairSet = new Set();

  // Collect all unique bodies, aspects, and pairs
  Object.values(transitsByDate).forEach(dayEntry => {
    const aspects = resolveDayAspects(dayEntry);
    aspects.forEach(aspect => {
      if (aspect.planet1) bodySet.add(aspect.planet1);
      if (aspect.planet2) bodySet.add(aspect.planet2);
      if (aspect.aspect) aspectSet.add(aspect.aspect);

      // Create standardized pair key (alphabetical order for consistency)
      if (aspect.planet1 && aspect.planet2) {
        const pair = [aspect.planet1, aspect.planet2].sort().join('|');
        pairSet.add(pair);
      }
    });
  });

  const bodies = Array.from(bodySet).sort();
  const aspects = Array.from(aspectSet).sort();
  const pairs = Array.from(pairSet).map(pair => {
    const [p1, p2] = pair.split('|');
    return [bodies.indexOf(p1), bodies.indexOf(p2)];
  });

  // Build pattern index
  const patterns = [];
  const patternMap = new Map();

  Object.values(transitsByDate).forEach(dayEntry => {
    const aspectList = resolveDayAspects(dayEntry);
    aspectList.forEach(aspect => {
      if (!aspect.planet1 || !aspect.planet2 || !aspect.aspect) return;

      const pairKey = [aspect.planet1, aspect.planet2].sort().join('|');
      const pairIndex = Array.from(pairSet).indexOf(pairKey);
      const aspectIndex = aspects.indexOf(aspect.aspect);

      if (pairIndex >= 0 && aspectIndex >= 0) {
        const patternKey = `${pairIndex}:${aspectIndex}`;
        if (!patternMap.has(patternKey)) {
          const patternIndex = patterns.length;
          patterns.push({ pair: pairIndex, aspect: aspectIndex });
          patternMap.set(patternKey, patternIndex);
        }
      }
    });
  });

  return {
    bodies,
    aspects,
    pairs,
    patterns,
    patternMap
  };
}

module.exports = {
  compressAspects,
  computeDayDeltas,
  buildCodebook,
  resolveDayAspects,
  calculateNatalHouse,
  extractHouseCusps,
};
