/* eslint-disable no-console */
/**
 * Compression & Delta Calculation Utilities
 * 
 * Handles aspect compression for efficient transit window storage and
 * calculation of day-to-day aspect deltas for transit analysis.
 * 
 * Extracted from lib/server/astrology-mathbrain.js
 */

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

module.exports = {
  compressAspects,
  computeDayDeltas,
};
