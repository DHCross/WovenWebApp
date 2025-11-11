/**
 * Aspect Mandate Generator
 * Implements Geometry → Archetype → Lived Tension translation
 *
 * Template: "This [geometry] creates a wire between [Planet A archetype]
 * and [Planet B archetype]. Field pressure: [FIELD]. Map translation:
 * [behavioral pattern]. Voice mirror: 'This often shows up as...'"
 *
 * Advanced Diagnostic Lexicon:
 * - Current: Energy flow between planets (tight orb, active)
 * - Hook: Exact contact point where energy catches (separating, building tension)
 * - Compression: Multiple aspects stacked in same area (complex pressure)
 * - Paradox Lock: Single aspect carrying opposite impulses (inherent contradiction)
 */

/**
 * Get planet archetype
 */
function getPlanetArchetype(planetName) {
  const archetypes = {
    Sun: { name: 'Core Identity', essence: 'who you are at your center', color: 'gold' },
    Moon: { name: 'Emotional Nature', essence: 'how you feel and respond', color: 'silver' },
    Mercury: { name: 'Mind & Communication', essence: 'how you think and speak', color: 'quicksilver' },
    Venus: { name: 'Values & Connection', essence: 'what you love and attract', color: 'copper' },
    Mars: { name: 'Will & Action', essence: 'how you move and assert', color: 'iron' },
    Jupiter: { name: 'Expansion & Meaning', essence: 'where you grow and believe', color: 'bronze' },
    Saturn: { name: 'Structure & Limits', essence: 'what you build and fear', color: 'lead' },
    Uranus: { name: 'Innovation & Disruption', essence: 'how you break free', color: 'electric' },
    Neptune: { name: 'Dreams & Dissolution', essence: 'what you imagine and merge with', color: 'iridescent' },
    Pluto: { name: 'Power & Transformation', essence: 'what you control and release', color: 'obsidian' },
    Node: { name: 'Destiny & Growth', essence: 'where you\'re learning', color: 'pearl' },
    ASC: { name: 'Persona & Presence', essence: 'how you appear', color: 'mirror' },
    MC: { name: 'Purpose & Authority', essence: 'what you\'re known for', color: 'crown' }
  };

  return archetypes[planetName] || { name: planetName, essence: 'unknown', color: 'gray' };
}

/**
 * Determine diagnostic lexicon
 * Current, Hook, Compression, or Paradox Lock
 */
function determineDiagnosticLexicon(aspect, allAspects) {
  const orb = Math.abs(aspect.orb || 0);
  const isApplying = aspect.applying !== false;

  // Paradox Lock: Opposition or Square with tight orb (inherent contradiction)
  if ((aspect.type === 'opposition' || aspect.type === 'square') && orb < 1) {
    return 'Paradox Lock';
  }

  // Current: Conjunction or tight aspect (active energy flow)
  if (aspect.type === 'conjunction' && orb < 2) {
    return 'Current';
  }

  // Hook: Separating aspect (exact contact point, building tension)
  if (!isApplying && orb < 3) {
    return 'Hook';
  }

  // Compression: Multiple aspects in same area
  const sameArea = allAspects.filter(a =>
    (a.planet_a === aspect.planet_a || a.planet_b === aspect.planet_a) &&
    a !== aspect
  );
  if (sameArea.length > 1) {
    return 'Compression';
  }

  // Default: Current
  return 'Current';
}

/**
 * Generate FIELD pressure description
 */
function generateFieldPressure(aspect, lexicon) {
  const type = aspect.type || 'aspect';
  const orb = Math.abs(aspect.orb || 0);

  const pressureDescriptions = {
    conjunction: 'Energy merges and intensifies',
    opposition: 'Energy pulls in opposite directions',
    square: 'Energy creates friction and urgency',
    trine: 'Energy flows smoothly and naturally',
    sextile: 'Energy supports and facilitates',
    default: 'Energy creates a particular dynamic'
  };

  const basePressure = pressureDescriptions[type] || pressureDescriptions.default;

  if (lexicon === 'Paradox Lock') {
    return `${basePressure}—but the contradiction is built in. This isn't a problem to solve; it's a paradox to live with.`;
  } else if (lexicon === 'Current') {
    return `${basePressure}. This is active, present energy.`;
  } else if (lexicon === 'Hook') {
    return `${basePressure}. The exact point of contact is where the tension catches.`;
  } else if (lexicon === 'Compression') {
    return `${basePressure}. Multiple layers of pressure in the same area create complexity.`;
  }

  return basePressure;
}

/**
 * Generate MAP translation (behavioral pattern)
 */
function generateMapTranslation(planetA, planetB, aspectType) {
  const translations = {
    'Sun-Moon-conjunction': 'Your core identity and emotional nature are aligned. You feel like yourself.',
    'Sun-Moon-opposition': 'Your core identity and emotional nature pull in different directions. You\'re learning to integrate both.',
    'Sun-Moon-square': 'Your core identity and emotional nature create friction. You\'re learning to let both speak.',
    'Sun-Saturn-conjunction': 'Your core identity is bound up with structure and responsibility.',
    'Sun-Saturn-opposition': 'Your core identity wants to shine; Saturn wants to contain. The tension is productive.',
    'Sun-Saturn-square': 'Your core identity and limitations are in constant negotiation.',
    'Moon-Mars-conjunction': 'Your emotions and your will are fused. You feel what you want.',
    'Moon-Mars-opposition': 'Your emotions and your will pull in different directions. You\'re learning to feel AND act.',
    'Moon-Mars-square': 'Your emotions and your will create friction. You\'re learning to channel both.',
    'Venus-Mars-conjunction': 'Your values and your will are aligned. You want what you love.',
    'Venus-Mars-opposition': 'Your values and your will pull in different directions. You\'re learning to love AND assert.',
    'Venus-Mars-square': 'Your values and your will create friction. You\'re learning to desire AND act.',
    'Mercury-Neptune-conjunction': 'Your mind and imagination merge. You think in symbols.',
    'Mercury-Neptune-opposition': 'Your mind wants clarity; Neptune wants mystery. You\'re learning to think AND feel.',
    'Mercury-Neptune-square': 'Your mind and imagination create friction. You\'re learning to communicate the ineffable.',
    'Saturn-Pluto-conjunction': 'Your structure and power are fused. You build with intention.',
    'Saturn-Pluto-opposition': 'Your structure and power pull in different directions. You\'re learning to hold AND release.',
    'Saturn-Pluto-square': 'Your structure and power create friction. You\'re learning to build AND transform.'
  };

  const key = `${planetA}-${planetB}-${aspectType}`;
  return translations[key] || `Your ${planetA.toLowerCase()} and ${planetB.toLowerCase()} create a particular dynamic through ${aspectType}.`;
}

/**
 * Generate VOICE mirror (lived experience)
 */
function generateVoiceMirror(mapTranslation, planetA, planetB, personName) {
  const mirrors = [
    `This often shows up as: ${mapTranslation}`,
    `In lived experience: ${mapTranslation}`,
    `What this looks like: ${mapTranslation}`,
    `How this manifests: ${mapTranslation}`
  ];

  return mirrors[Math.floor(Math.random() * mirrors.length)];
}

/**
 * Translate single aspect to voice
 */
function translateAspectToVoice(aspect, allAspects = [], personName = 'you') {
  const planetA = aspect.planet_a || 'Unknown';
  const planetB = aspect.planet_b || 'Unknown';
  const aspectType = aspect.type || 'aspect';
  const orb = Math.abs(aspect.orb || 0);

  // 1. Extract geometry
  const geometry = `${planetA} ${aspectType} ${planetB} (orb: ${orb.toFixed(1)}°)`;

  // 2. Map to archetypes
  const archetypeA = getPlanetArchetype(planetA);
  const archetypeB = getPlanetArchetype(planetB);

  // 3. Determine diagnostic lexicon
  const lexicon = determineDiagnosticLexicon(aspect, allAspects);

  // 4. Generate FIELD pressure description
  const fieldPressure = generateFieldPressure(aspect, lexicon);

  // 5. Generate MAP translation (behavioral pattern)
  const mapTranslation = generateMapTranslation(planetA, planetB, aspectType);

  // 6. Generate VOICE mirror (lived experience)
  const voiceMirror = generateVoiceMirror(mapTranslation, planetA, planetB, personName);

  return {
    geometry,
    archetype_a: archetypeA,
    archetype_b: archetypeB,
    lexicon,
    field_pressure: fieldPressure,
    map_translation: mapTranslation,
    voice_mirror: voiceMirror,
    formatted: `**${geometry}** [${lexicon}]\n\nThis creates a wire between ${archetypeA.name} (${archetypeA.essence}) and ${archetypeB.name} (${archetypeB.essence}).\n\n**Field pressure**: ${fieldPressure}\n\n**Map translation**: ${mapTranslation}\n\n**Voice mirror**: "${voiceMirror}"`
  };
}

/**
 * Generate aspect mandate section for a chart
 */
function generateAspectMandateSection(personName, natalChart) {
  if (!natalChart || !natalChart.aspects || natalChart.aspects.length === 0) {
    return `## ${personName}'s Aspect Geometry\n\nNo aspects received for this chart.\n\n`;
  }

  let output = `## ${personName}'s Aspect Geometry\n\n`;

  // Sort aspects by orb tightness (most important first)
  const sortedAspects = [...natalChart.aspects].sort((a, b) => {
    const orbA = Math.abs(a.orb || 0);
    const orbB = Math.abs(b.orb || 0);
    return orbA - orbB;
  });

  // Show top 5 aspects
  const topAspects = sortedAspects.slice(0, 5);

  topAspects.forEach((aspect, index) => {
    const translated = translateAspectToVoice(aspect, natalChart.aspects, personName);
    output += `### ${index + 1}. ${translated.geometry}\n\n`;
    output += translated.formatted;
    output += `\n\n---\n\n`;
  });

  return output;
}

module.exports = {
  getPlanetArchetype,
  determineDiagnosticLexicon,
  generateFieldPressure,
  generateMapTranslation,
  generateVoiceMirror,
  translateAspectToVoice,
  generateAspectMandateSection
};
