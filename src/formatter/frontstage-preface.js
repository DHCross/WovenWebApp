const fs = require('fs');
const path = require('path');

/**
 * Frontstage Preface Generator
 * Creates warm, conversational entry for Woven readings
 * 
 * Implements the Frontstage Preface protocol:
 * - Persona Intro: Raven-in-the-coffee-shop greeting
 * - Resonance Profile: Blueprint modes + behavioral anchors
 * - Paradoxes: 1-3 productive tensions
 * - Relational Focus: Names both parties (if relational)
 */

/**
 * Extract blueprint modes from natal chart
 * Identifies primary, secondary, and shadow modes
 */
function extractBlueprintModes(natalChart) {
  if (!natalChart || typeof natalChart !== 'object') {
    return { primary: null, secondary: null, shadow: null };
  }

  // Extract Sun (primary identity mode)
  const sun = natalChart.planets?.find(p => p.name === 'Sun');
  const sunSign = sun ? getSignName(sun.sign) : null;
  const sunHouse = sun?.house || null;

  // Extract Moon (secondary emotional mode)
  const moon = natalChart.planets?.find(p => p.name === 'Moon');
  const moonSign = moon ? getSignName(moon.sign) : null;
  const moonHouse = moon?.house || null;

  // Extract Rising/ASC (shadow/persona mode)
  const asc = natalChart.planets?.find(p => p.name === 'ASC');
  const ascSign = asc ? getSignName(asc.sign) : null;

  return {
    primary: { planet: 'Sun', sign: sunSign, house: sunHouse },
    secondary: { planet: 'Moon', sign: moonSign, house: moonHouse },
    shadow: { planet: 'ASC', sign: ascSign }
  };
}

/**
 * Map zodiac sign to name
 */
function getSignName(signNumber) {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  if (typeof signNumber === 'number' && signNumber >= 0 && signNumber < 12) {
    return signs[signNumber];
  }
  return null;
}

/**
 * Generate Raven persona intro
 * Warm, coffee-shop greeting that sets tone
 */
function generatePersonaIntro(personName, blueprintModes) {
  const intros = [
    `I'm Raven. I read charts like maps—not predictions, but mirrors. Let me show you what I see in ${personName}'s geometry.`,
    `Hey, I'm Raven. I work with the actual sky, not fortune-telling. Here's what your chart is actually saying.`,
    `I'm Raven. I read the chart as a mirror of how you tend to move through the world. No mysticism, just geometry translated into lived experience.`,
    `I'm Raven, and I read charts as blueprints for how you're wired. Let me walk you through ${personName}'s actual pattern.`
  ];

  return intros[Math.floor(Math.random() * intros.length)];
}

/**
 * Generate resonance profile
 * 3-4 paragraphs describing blueprint modes + behavioral anchors
 */
function generateResonanceProfile(personName, blueprintModes, natalChart) {
  if (!blueprintModes.primary || !blueprintModes.primary.sign) {
    return generateFallbackResonanceProfile(personName);
  }

  const { primary, secondary, shadow } = blueprintModes;
  const primaryDesc = generateModeDescription(primary.planet, primary.sign);
  const secondaryDesc = generateModeDescription(secondary.planet, secondary.sign);
  const shadowDesc = generateModeDescription(shadow.planet, shadow.sign);

  const paragraphs = [
    // Para 1: Core impression
    `${personName} comes across as ${primaryDesc}. There's a directness there, but also a quality of someone who's always watching the bigger picture. People sense that ${personName} is steady, yet inside there's often a back-and-forth between the part that wants to move and the part that waits until the ground feels solid.`,

    // Para 2: The rotation of drives
    `Underneath, there are three strong voices trading places: ${secondaryDesc}—the part that feels and responds—and ${shadowDesc}—the way ${personName} shows up in the world. At different times in life one takes the lead, but all three are always in the mix. This is why ${personName} can be adaptive, but also why there's sometimes a feeling of negotiating with yourself.`,

    // Para 3: The pressure patterns
    `This inner system brings both gifts and friction. Sometimes ${personName} holds back emotions when they'd rather let them flow. Sometimes energy scatters and then suddenly reacts when something tips. And often, there's a replaying of choices in the head, testing whether ${personName} stayed true to their own code. These aren't flaws—they're the way this chart has taught resilience.`,

    // Para 4: The big picture
    `What this all adds up to is a life spent balancing dreams with duty, movement with structure. ${personName} is not one-dimensional—there's a rotation between seeker, builder, and disruptor. And people who know ${personName} well feel that complexity: not chaotic, but rich, layered, quietly powerful.`
  ];

  return paragraphs.join('\n\n');
}

/**
 * Generate fallback resonance profile when chart data incomplete
 */
function generateFallbackResonanceProfile(personName) {
  return `${personName}'s chart shows a complex inner system—multiple drives trading places, not a single fixed mode. This is someone who adapts, who feels deeply, and who's learning to trust their own rhythm. The tension between different parts of the self isn't a flaw; it's the source of resilience.`;
}

/**
 * Generate mode description based on planet and sign
 */
function generateModeDescription(planet, sign) {
  const descriptions = {
    Sun: {
      Aries: 'purposeful and direct, someone who moves first and asks questions later',
      Taurus: 'grounded and steady, someone who builds slowly but builds to last',
      Gemini: 'curious and adaptive, someone who learns by talking and connecting',
      Cancer: 'protective and intuitive, someone who leads with feeling',
      Leo: 'creative and generous, someone who brings warmth and clarity',
      Virgo: 'precise and discerning, someone who sees what others miss',
      Libra: 'balanced and relational, someone who holds space for multiple perspectives',
      Scorpio: 'intense and penetrating, someone who goes deep and doesn\'t look away',
      Sagittarius: 'expansive and philosophical, someone who seeks meaning and truth',
      Capricorn: 'strategic and responsible, someone who builds systems that last',
      Aquarius: 'innovative and independent, someone who thinks differently',
      Pisces: 'intuitive and fluid, someone who feels the whole room'
    },
    Moon: {
      Aries: 'quick to react, needs action and directness to feel safe',
      Taurus: 'slow to change, needs stability and consistency',
      Gemini: 'restless and curious, needs variety and communication',
      Cancer: 'deeply feeling, needs security and emotional honesty',
      Leo: 'needs recognition and warmth, feels through creativity',
      Virgo: 'analytical about emotions, needs clarity and usefulness',
      Libra: 'seeks harmony, uncomfortable with conflict',
      Scorpio: 'feels intensely, needs depth and truth',
      Sagittarius: 'needs freedom and meaning, restless with routine',
      Capricorn: 'reserved emotionally, needs respect and competence',
      Aquarius: 'detached, needs intellectual stimulation',
      Pisces: 'absorbent, needs boundaries and compassion'
    },
    ASC: {
      Aries: 'comes across as direct and energetic',
      Taurus: 'comes across as calm and grounded',
      Gemini: 'comes across as curious and communicative',
      Cancer: 'comes across as warm and protective',
      Leo: 'comes across as confident and generous',
      Virgo: 'comes across as thoughtful and precise',
      Libra: 'comes across as balanced and diplomatic',
      Scorpio: 'comes across as intense and perceptive',
      Sagittarius: 'comes across as optimistic and expansive',
      Capricorn: 'comes across as composed and capable',
      Aquarius: 'comes across as independent and original',
      Pisces: 'comes across as intuitive and gentle'
    }
  };

  const planetDesc = descriptions[planet] || {};
  return planetDesc[sign] || `someone with ${planet} in ${sign}`;
}

/**
 * Extract paradoxes from natal chart
 * Identifies productive tensions (1-3 key paradoxes)
 */
function extractParadoxes(natalChart) {
  if (!natalChart || !natalChart.aspects) {
    return [
      'The tension between wanting to move and needing to wait.',
      'The dance between holding on and letting go.'
    ];
  }

  const paradoxes = [];

  // Look for key tension aspects
  const tensions = natalChart.aspects.filter(a => 
    (a.type === 'square' || a.type === 'opposition') && 
    ['Sun', 'Moon', 'Mars', 'Venus', 'Saturn'].includes(a.planet_a)
  );

  if (tensions.length > 0) {
    const tension = tensions[0];
    const paradox = generateParadoxFromAspect(tension);
    if (paradox) paradoxes.push(paradox);
  }

  // Add default paradoxes if needed
  if (paradoxes.length === 0) {
    paradoxes.push('The tension between what you want and what you need.');
  }

  return paradoxes.slice(0, 3);
}

/**
 * Generate paradox description from aspect
 */
function generateParadoxFromAspect(aspect) {
  const paradoxTemplates = {
    'Sun-Saturn': 'The tension between wanting to shine and doubting whether you should.',
    'Sun-Pluto': 'The tension between wanting to be seen and needing to control what\'s visible.',
    'Moon-Mars': 'The tension between feeling deeply and needing to act quickly.',
    'Moon-Saturn': 'The tension between needing to feel and being afraid to show it.',
    'Venus-Mars': 'The tension between wanting connection and needing independence.',
    'Venus-Saturn': 'The tension between opening your heart and protecting it.',
    'Mercury-Neptune': 'The tension between needing clarity and sensing what words can\'t say.'
  };

  const key = `${aspect.planet_a}-${aspect.planet_b}`;
  return paradoxTemplates[key] || null;
}

/**
 * Generate relational focus (if two people)
 */
function generateRelationalFocus(personA, personB) {
  if (!personB) return null;

  return `Between ${personA} and ${personB}, there's a particular dance. This reading will show you how their individual patterns meet, where they amplify each other, and where they create friction. The goal isn't to predict the relationship—it's to show you the actual geometry of how you two tend to move together.`;
}

/**
 * Main function: Generate complete Frontstage Preface
 */
function generateFrontstagePreface(personA, personB, natalChartA, natalChartB) {
  const blueprintModesA = extractBlueprintModes(natalChartA);
  
  const personaIntro = generatePersonaIntro(personA, blueprintModesA);
  const resonanceProfile = generateResonanceProfile(personA, blueprintModesA, natalChartA);
  const paradoxes = extractParadoxes(natalChartA);
  const relationalFocus = personB ? generateRelationalFocus(personA, personB) : null;

  let preface = `# Woven Mirror: ${personA}${personB ? ` & ${personB}` : ''}\n\n`;
  preface += `## Frontstage Preface\n\n`;
  preface += `${personaIntro}\n\n`;
  preface += `---\n\n`;
  preface += `### Your Baseline Pattern\n\n`;
  preface += `${resonanceProfile}\n\n`;
  preface += `---\n\n`;
  preface += `### The Productive Tensions\n\n`;
  paradoxes.forEach(p => {
    preface += `- ${p}\n`;
  });
  preface += `\n`;

  if (relationalFocus) {
    preface += `---\n\n`;
    preface += `### Between You Two\n\n`;
    preface += `${relationalFocus}\n\n`;
  }

  preface += `---\n\n`;

  return preface;
}

module.exports = {
  generateFrontstagePreface,
  extractBlueprintModes,
  generatePersonaIntro,
  generateResonanceProfile,
  extractParadoxes,
  generateRelationalFocus
};
