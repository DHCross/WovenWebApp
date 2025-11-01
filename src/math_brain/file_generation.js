/**
 * Generate MAP file (wm-map-v1) - Constitutional Geometry
 * Contains natal planetary positions, aspects, houses - never changes
 */
function generateMapFile(transitData, personA, personB, config) {
  const mapId = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Planet index mapping per spec
  const PLANET_INDEX = {
    'Sun': 0, 'Moon': 1, 'Mercury': 2, 'Venus': 3, 'Mars': 4,
    'Jupiter': 5, 'Saturn': 6, 'Uranus': 7, 'Neptune': 8,
    'Pluto': 9, 'Node': 10, 'Mean_Node': 10, 'ASC': 11, 'Ascendant': 11, 'MC': 12, 'Medium_Coeli': 12
  };

  return {
    _meta: {
      kind: 'MAP',
      schema: 'wm-map-v1',
      map_id: mapId,
      math_brain_version: 'mb-2025.10.18',
      ephemeris_source: 'astrologer-api',
      house_system: config.house_system || 'Placidus',
      orbs_profile: config.orbs_profile || 'wm-spec-2025-09',
      timezone_db_version: 'IANA-2025a',
      relocation_mode: config.translocation || 'none',
      created_utc: new Date().toISOString(),
    },
    people: [
      {
        id: 'A',
        name: personA?.name || 'Person A',
        birth: {
          date: `${personA?.year}-${String(personA?.month).padStart(2, '0')}-${String(personA?.day).padStart(2, '0')}`,
          time: `${String(personA?.hour || 12).padStart(2, '0')}:${String(personA?.minute || 0).padStart(2, '0')}`,
          city: personA?.city || 'Unknown',
          state: personA?.state || '',
          nation: personA?.nation || 'US',
        },
        index: PLANET_INDEX,  // Required per spec
        planets: extractPlanetaryCentidegrees(transitData?.person_a?.chart),
        houses: extractHouseCentidegrees(transitData?.person_a?.chart),
        aspects: extractNatalAspectsCompact(transitData?.person_a?.aspects, PLANET_INDEX),
      },
      ...(personB ? [{
        id: 'B',
        name: personB?.name || 'Person B',
        birth: {
          date: `${personB?.year}-${String(personB?.month).padStart(2, '0')}-${String(personB?.day).padStart(2, '0')}`,
          time: `${String(personB?.hour || 12).padStart(2, '0')}:${String(personB?.minute || 0).padStart(2, '0')}`,
          city: personB?.city || 'Unknown',
          state: personB?.state || '',
          nation: personB?.nation || 'US',
        },
        index: PLANET_INDEX,  // Required per spec
        planets: extractPlanetaryCentidegrees(transitData?.person_b?.chart),
        houses: extractHouseCentidegrees(transitData?.person_b?.chart),
        aspects: extractNatalAspectsCompact(transitData?.person_b?.aspects, PLANET_INDEX),
      }] : []),
    ],
  };
}

/**
 * Generate FIELD file (wm-field-v1) - Symbolic Weather
 * Contains transit data, Balance Meter readings, references parent MAP
 */
function generateFieldFile(dailyEntries, startDate, endDate, config, mapId, transitData, relationalSummary = null) {
  const daily = {};

  const PLANET_INDEX = {
    'Sun': 0, 'Moon': 1, 'Mercury': 2, 'Venus': 3, 'Mars': 4,
    'Jupiter': 5, 'Saturn': 6, 'Uranus': 7, 'Neptune': 8,
    'Pluto': 9, 'Node': 10, 'Mean_Node': 10, 'ASC': 11, 'Ascendant': 11, 'MC': 12, 'Medium_Coeli': 12
  };

  // Aspect type keys per spec
  const ASP_KEYS = {'cnj': 0, 'opp': 1, 'sq': 2, 'tri': 3, 'sex': 4,
                    'conjunction': 0, 'opposition': 1, 'square': 2, 'trine': 3, 'sextile': 4};

  dailyEntries.forEach(entry => {
    const scoredAspects = entry.symbolic_weather?._aggregateResult?.scored || [];
    const compactAspects = scoredAspects
      .map(a => extractCompactAspect(a, PLANET_INDEX, ASP_KEYS))
      .filter(a => a !== null)
      .sort((a, b) => Math.abs(a[3]) - Math.abs(b[3])) // Sort by orb tightness
      .slice(0, 18); // Keep top 18 per spec

    const dayData = transitData?.person_a?.chart?.transitsByDate?.[entry.date];
    const tpos = (dayData?.tpos || []).map(p => Math.round(p * 100));
    const thouse = dayData?.thouse || [];

    daily[entry.date] = {
      tpos,
      thouse,
      as: compactAspects,
      meter: {
        mag_x10: Math.round(entry.symbolic_weather.magnitude * 10),
        bias_x10: Math.round(entry.symbolic_weather.directional_bias * 10),
      },
      status: {
        pending: compactAspects.length === 0,
        notes: compactAspects.length === 0 ? ['No significant aspects found for this day'] : [],
      },
    };
  });

  return {
    _meta: {
      kind: 'FIELD',
      schema: 'wm-field-v1',
      _natal_ref: mapId,
      math_brain_version: 'mb-2025.10.18',
      balance_meter_version: '5.0',
      ephemeris_source: 'astrologer-api',
      orbs_profile: config.orbs_profile || 'wm-spec-2025-09',
      house_system: config.house_system || 'Placidus',
      timezone_db_version: 'IANA-2025a',
      relocation_mode: config.translocation || 'none',
      angle_drift_alert: false,
      created_utc: new Date().toISOString(),
    },
    keys: {
      asp: ASP_KEYS  // Required per spec
    },
    period: {
      s: startDate,  // spec uses 's' not 'start'
      e: endDate,    // spec uses 'e' not 'end'
    },
    daily,
    relational_summary: relationalSummary,
  };
}

/**
 * Extract planetary positions as centidegrees (longitude × 100)
 */
function extractPlanetaryCentidegrees(chart) {
  if (!chart || !chart.planets) return [];

  const planetOrder = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter',
                       'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Node'];

  return planetOrder.map(name => {
    const planet = chart.planets.find(p => p.name === name);
    if (planet && typeof planet.abs_pos === 'number') {
      return Math.round(planet.abs_pos * 100); // Convert to centidegrees
    }
    return null;
  }).filter(v => v !== null);
}

/**
 * Extract house cusps as centidegrees
 */
function extractHouseCentidegrees(chart) {
  if (!chart || !chart.house_cusps) return [];

  return chart.house_cusps.map(cusp =>
    typeof cusp === 'number' ? Math.round(cusp * 100) : null
  ).filter(v => v !== null);
}

/**
 * Extract natal aspects in compact format per spec: {"a": 0, "b": 4, "t": "sq", "o": 210}
 */
function extractNatalAspectsCompact(aspects, planetIndex) {
  if (!Array.isArray(aspects)) return [];

  // Aspect type abbreviations per spec
  const ASP_ABBREV = {
    'conjunction': 'cnj', 'opposition': 'opp', 'square': 'sq',
    'trine': 'tri', 'sextile': 'sex', 'quincunx': 'qnx', 'semisextile': 'ssx',
    'semisquare': 'ssq', 'sesquisquare': 'ses', 'quintile': 'qui', 'biquintile': 'biq'
  };

  return aspects.map(asp => {
    const planet1Idx = planetIndex[asp.planet1] ?? planetIndex[asp.p1_name];
    const planet2Idx = planetIndex[asp.planet2] ?? planetIndex[asp.p2_name];
    const aspType = ASP_ABBREV[asp.aspect?.toLowerCase()] || asp.aspect;

    if (planet1Idx === undefined || planet2Idx === undefined) return null;

    return {
      a: planet1Idx,
      b: planet2Idx,
      t: aspType,
      o: asp.orb ? Math.round(asp.orb * 100) : 0, // centidegrees
    };
  }).filter(a => a !== null);
}

/**
 * Extract compact aspect for FIELD file: [tIdx, nIdx, aspKey, orb_cdeg, w*10]
 */
function extractCompactAspect(scoredAspect, planetIndex, aspectKeyIndex) {
  if (!scoredAspect || !scoredAspect.transit?.body || !scoredAspect.natal?.body || !scoredAspect.type) {
    return null;
  }

  const transitPlanetIndex = planetIndex[scoredAspect.transit.body];
  const natalPlanetIndex = planetIndex[scoredAspect.natal.body];
  const aspectTypeKey = aspectKeyIndex[scoredAspect.type.toLowerCase()];

  if (transitPlanetIndex === undefined || natalPlanetIndex === undefined || aspectTypeKey === undefined) {
    return null;
  }

  const orbCentidegrees = scoredAspect.orbDeg ? Math.round(scoredAspect.orbDeg * 100) : 0;
  // Use the 'S' score from the seismograph result for the weight, as specified.
  const weightX10 = scoredAspect.S ? Math.round(scoredAspect.S * 10) : 0;

  return [
    transitPlanetIndex,
    natalPlanetIndex,
    aspectTypeKey,
    orbCentidegrees,
    weightX10,
  ];
}


module.exports = {
  generateMapFile,
  generateFieldFile,
};
