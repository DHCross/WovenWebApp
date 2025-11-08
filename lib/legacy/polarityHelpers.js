/**
 * Polarity Card helpers extracted from legacy index.html
 * These generate FIELD (somatic) and VOICE (behavioral) content
 * following the Raven Calder FIELD → MAP → VOICE protocol
 */

/**
 * Generate somatic/sensory texture for FIELD layer
 * @param {Object} aspect - Aspect object with aspect type
 * @param {string|null} person - Optional person identifier ('A' or 'B')
 * @returns {string} Somatic texture description
 */
export function generatePolarityField(aspect, person = null) {
  const aspectType = aspect.aspect?.toLowerCase();
  
  const fieldTextures = {
    'conjunction': 'fusion pressure, merging pull',
    'opposition': 'pull-apart tension, polarizing stretch',
    'square': 'friction heat, resistance pressure',
    'trine': 'flowing ease, supportive current',
    'sextile': 'opportunity spark, gentle activation'
  };
  
  return fieldTextures[aspectType] || 'energetic texture';
}

/**
 * Generate VOICE content (behavioral description) for polarity cards
 * Uses conditional language (may/might/could) per Raven Calder spec
 * @param {Object} polarity - Polarity object with aspect info
 * @param {string|null} person - Optional person identifier ('A' or 'B')
 * @returns {string} Conditional behavioral description
 */
export function generatePolarityVoice(polarity, person = null) {
  // Extract aspect type from the polarity object
  let aspectType = 'conjunction';
  
  if (polarity.aspect) {
    aspectType = polarity.aspect.toLowerCase();
  } else if (polarity.map) {
    // Try to extract from map string (e.g., "Mars Square Saturn, 2.3° orb")
    const mapParts = polarity.map.split(' ');
    if (mapParts.length >= 3) {
      aspectType = mapParts[1].toLowerCase();
    }
  }
  
  const voiceTemplates = {
    'conjunction': 'These energies may blend together, sometimes harmoniously, sometimes creating intensity that needs conscious direction.',
    'opposition': 'These energies may pull in different directions, creating awareness through contrast and the need to find balance.',
    'square': 'These energies may create friction that generates movement - challenge that promotes growth when engaged consciously.',
    'trine': 'These energies may flow naturally together, creating ease and supporting natural expression.',
    'sextile': 'These energies may offer opportunities for integration through conscious engagement and effort.'
  };
  
  const baseVoice = voiceTemplates[aspectType] || 'These planetary energies may interact in ways that create opportunities for conscious awareness and growth.';
  
  if (person === 'A') {
    return `For Person A: ${baseVoice}`;
  } else if (person === 'B') {
    return `For Person B: ${baseVoice}`;
  } else {
    return baseVoice;
  }
}

/**
 * Extract top 3 polarities from chart data for FIELD → MAP → VOICE cards
 * @param {Object} data - Chart data with aspects
 * @param {boolean} isRelational - Whether this is a relational reading
 * @returns {Array} Array of polarity objects with nameA, nameB, field, map, voice, aspect
 */
export function extractTopPolarities(data, isRelational = false) {
  const polarities = [];

  if (data.person_a?.aspects) {
    data.person_a.aspects.slice(0, 3).forEach(aspect => {
      polarities.push({
        nameA: aspect.p1_name,
        nameB: aspect.p2_name,
        aspect: aspect.aspect, // Pass aspect type through for VOICE generation
        field: generatePolarityField(aspect),
        map: `${aspect.p1_name} ${aspect.aspect} ${aspect.p2_name}, ${Math.abs(aspect.orb || aspect.orbit || 0).toFixed(1)}° orb`,
        fieldA: isRelational ? generatePolarityField(aspect, 'A') : null,
        fieldB: isRelational ? generatePolarityField(aspect, 'B') : null
      });
    });
  }

  // Fill to 3 polarities with actual data if available
  while (polarities.length < 3) {
    const allAspects = data.person_a?.aspects || [];
    const remainingAspects = allAspects.filter(aspect =>
      !polarities.some(polarity =>
        polarity.nameA === aspect.p1_name &&
        polarity.nameB === aspect.p2_name
      )
    );

    if (remainingAspects.length > 0) {
      const nextAspect = remainingAspects[0];
      polarities.push({
        nameA: nextAspect.p1_name,
        nameB: nextAspect.p2_name,
        aspect: nextAspect.aspect, // Pass aspect type through
        field: generatePolarityField(nextAspect),
        map: `${nextAspect.p1_name} ${nextAspect.aspect} ${nextAspect.p2_name}, ${Math.abs(nextAspect.orb || nextAspect.orbit || 0).toFixed(1)}° orb`,
        fieldA: isRelational ? generatePolarityField(nextAspect, 'A') : null,
        fieldB: isRelational ? generatePolarityField(nextAspect, 'B') : null
      });
    } else {
      // Use archetypal fallback if no more aspects available
      polarities.push({
        nameA: 'Individual',
        nameB: 'Collective',
        aspect: 'conjunction', // Default for fallback
        field: 'personal/transpersonal tension',
        map: 'Fundamental human polarity patterns',
        fieldA: isRelational ? 'Individual focus for A' : null,
        fieldB: isRelational ? 'Individual focus for B' : null
      });
    }
  }

  return polarities;
}

/**
 * Generate complete Polarity Cards markdown section
 * @param {Object} data - Chart data with aspects
 * @param {boolean} isRelational - Whether this is a relational reading
 * @returns {string} Markdown for Polarity Cards section
 */
export function generatePolarityCards(data, isRelational = false) {
  let md = `## Polarity Cards\n\n`;

  const polarities = extractTopPolarities(data, isRelational);

  polarities.forEach((polarity, index) => {
    md += `### ${index + 1}) **${polarity.nameA}** ↔ **${polarity.nameB}**\n\n`;

    if (isRelational) {
      md += `**FIELD:**\n`;
      md += `  - **Person A:** ${polarity.fieldA}\n`;
      md += `  - **Person B:** ${polarity.fieldB}\n\n`;
      md += `**VOICE:**\n`;
      md += `  - **Person A:** ${generatePolarityVoice(polarity, 'A')}\n`;
      md += `  - **Person B:** ${generatePolarityVoice(polarity, 'B')}\n\n`;
    } else {
      md += `**FIELD:** ${polarity.field}\n\n`;
      md += `**VOICE:** ${generatePolarityVoice(polarity)}\n\n`;
    }
    
    // MAP is backstage-only, not included in user-facing output
    // (Operator can see it in logs/debug mode if needed)
  });

  return md;
}
