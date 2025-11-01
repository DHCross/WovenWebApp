const { aggregate } = require('../seismograph');
const { classifyMagnitude, classifyDirectionalBias } = require('../../lib/reporting/metric-labels');

function computeSymbolicWeatherWithContext(transitsA, transitsB, prevContext, rollingMagnitudes) {
  // Ensure inputs are arrays
  const safeTransitsA = Array.isArray(transitsA) ? transitsA : [];
  const safeTransitsB = Array.isArray(transitsB) ? transitsB : [];

  // Combine all transits from both persons
  const allTransits = [...safeTransitsA, ...safeTransitsB];

  // If no transits, return zero values
  if (!allTransits || allTransits.length === 0) {
    return {
      magnitude: 0,
      directional_bias: 0,
      labels: { magnitude: 'Quiet', directional_bias: 'Neutral' },
      _rawMagnitude: 0,
      _aggregateResult: null
    };
  }

  // Prepare rolling context for adaptive normalization (14-day window)
  const rollingContext = rollingMagnitudes.length >= 1 ? { magnitudes: [...rollingMagnitudes] } : null;

  // Use the seismograph aggregate function with proper context
  const weather = aggregate(allTransits, prevContext, { rollingContext, enableDiagnostics: false });

  // Extract and label the metrics
  const magnitude = weather.magnitude || 0;
  const directionalBias = weather.directional_bias || 0;
  const rawMagnitude = weather.energyMagnitude || weather.rawMagnitude || magnitude;

  return {
    magnitude: Number(magnitude.toFixed(1)),
    directional_bias: Number(directionalBias.toFixed(1)),
    labels: {
      magnitude: classifyMagnitude(magnitude),
      directional_bias: classifyDirectionalBias(directionalBias)
    },
    _rawMagnitude: rawMagnitude,
    _aggregateResult: weather
  };
}

function computeMirrorData(transitsA, transitsB, synastryAspects) {
  // Ensure inputs are arrays
  const safeTransitsA = Array.isArray(transitsA) ? transitsA : [];
  const safeTransitsB = Array.isArray(transitsB) ? transitsB : [];
  const safeSynastry = Array.isArray(synastryAspects) ? synastryAspects : [];

  // Calculate individual contributions for each person
  const weatherA = safeTransitsA.length > 0 ? aggregate(safeTransitsA, null, { enableDiagnostics: false }) : { magnitude: 0, directional_bias: 0 };
  const weatherB = safeTransitsB.length > 0 ? aggregate(safeTransitsB, null, { enableDiagnostics: false }) : { magnitude: 0, directional_bias: 0 };

  // Determine relational dynamics from synastry aspects
  const hardAspects = safeSynastry.filter(a => ['square', 'opposition', 'conjunction'].includes(a.aspect));
  const softAspects = safeSynastry.filter(a => ['trine', 'sextile'].includes(a.aspect));

  const relationalTension = hardAspects.length * 0.8 + (weatherA.magnitude + weatherB.magnitude) * 0.3;
  const relationalFlow = softAspects.length * 0.6 + Math.max(0, 5 - Math.abs(weatherA.directional_bias + weatherB.directional_bias)) * 0.2;

  // Find dominant planetary theme (simplified - look for most common planet in aspects)
  let dominantTheme = 'Mixed Dynamics';
  if (hardAspects.length > 0) {
    const planet = hardAspects[0].p1_name || hardAspects[0].p2_name || 'Unknown';
    dominantTheme = `Tension (${planet})`;
  } else if (softAspects.length > 0) {
    const planet = softAspects[0].p1_name || softAspects[0].p2_name || 'Unknown';
    dominantTheme = `Flow (${planet})`;
  }

  return {
    relational_tension: Number(relationalTension.toFixed(1)),
    relational_flow: Number(relationalFlow.toFixed(1)),
    dominant_theme: dominantTheme,
    person_a_contribution: {
      magnitude: Number((weatherA.magnitude || 0).toFixed(1)),
      bias: Number((weatherA.directional_bias || 0).toFixed(1))
    },
    person_b_contribution: {
      magnitude: Number((weatherB.magnitude || 0).toFixed(1)),
      bias: Number((weatherB.directional_bias || 0).toFixed(1))
    },
  };
}

function computePoeticHooks(transitsA, transitsB, synastryAspects) {
  // Ensure inputs are arrays
  const safeTransitsA = Array.isArray(transitsA) ? transitsA : [];
  const safeTransitsB = Array.isArray(transitsB) ? transitsB : [];
  const safeSynastry = Array.isArray(synastryAspects) ? synastryAspects : [];

  // Combine all aspects for ranking
  const allAspects = [
    ...safeTransitsA.map(a => ({ ...a, owner: 'Person A', type: categorizeAspect(a.aspect) })),
    ...safeTransitsB.map(a => ({ ...a, owner: 'Person B', type: categorizeAspect(a.aspect) })),
    ...safeSynastry.map(a => ({ ...a, owner: 'Synastry', type: categorizeAspect(a.aspect) }))
  ];

  // Sort aspects by significance (tighter orb = more significant)
  const sortedAspects = allAspects
    .filter(a => a.orbit !== undefined && a.orbit !== null)
    .sort((a, b) => Math.abs(a.orbit) - Math.abs(b.orbit))
    .slice(0, 5);

  // Identify peak aspect (tightest orb)
  const peakAspect = sortedAspects[0] || null;
  const peakAspectLabel = peakAspect
    ? `Transit ${peakAspect.p1_name} ${peakAspect.aspect} Natal ${peakAspect.p2_name} (${peakAspect.owner})`
    : 'No significant aspects';

  // Extract key themes from top aspects
  const themes = sortedAspects
    .map(a => getThemeForPlanet(a.p1_name || a.p2_name))
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .slice(0, 3);

  // Format top contributing aspects
  const topAspects = sortedAspects.slice(0, 3).map(a => ({
    aspect: `Transit ${a.p1_name} ${a.aspect} Natal ${a.p2_name} (${a.owner})`,
    type: a.type,
    strength: Number((1 - Math.abs(a.orbit) / 10).toFixed(2))
  }));

  return {
    peak_aspect_of_the_day: peakAspectLabel,
    key_themes: themes.length > 0 ? themes : ['Mixed Energies'],
    significant_events: [], // Would require retrograde/station detection from real data
    top_contributing_aspects: topAspects
  };
}

function categorizeAspect(aspectName) {
  const hardAspects = ['square', 'opposition', 'conjunction'];
  const softAspects = ['trine', 'sextile'];
  if (hardAspects.includes(aspectName)) return 'Tension';
  if (softAspects.includes(aspectName)) return 'Flow';
  return 'Minor';
}

function getThemeForPlanet(planetName) {
  const themes = {
    'Saturn': 'Structure',
    'Jupiter': 'Expansion',
    'Mars': 'Action',
    'Venus': 'Values',
    'Mercury': 'Communication',
    'Sun': 'Identity',
    'Moon': 'Emotions',
    'Uranus': 'Change',
    'Neptune': 'Dissolution',
    'Pluto': 'Transformation'
  };
  return themes[planetName] || null;
}

module.exports = {
  computeSymbolicWeatherWithContext,
  computeMirrorData,
  computePoeticHooks,
};
