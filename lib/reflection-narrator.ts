/**
 * Reflection Narrator - Dynamic LLM-based stitched reflection generation
 * Replaces template-based reflection phrases with true synthesis
 *
 * Purpose: Weave blueprint, weather, and paradox into an integrative
 * final reflection that honors the complexity of the individual's experience
 */

import { generateText } from './llm';

interface ReflectionContext {
  mode: 'natal-only' | 'balance' | 'relational-mirror' | 'relational-balance';
  blueprintMetaphor: string;
  blueprintNarrative?: string;
  weatherNarrative?: string;
  hasWeatherData: boolean;
  hasBlueprintData: boolean;
  coreTensions?: string[];
  relocationContext?: {
    enabled: boolean;
    location?: string;
    timezone?: string;
  };
}

/**
 * Generate stitched reflection using LLM synthesis
 *
 * This is the final paragraph that weaves together blueprint, weather,
 * and paradox into a cohesive, integrative reflection.
 */
export async function narrateStitchedReflection(
  context: ReflectionContext
): Promise<string> {

  const {
    mode,
    blueprintMetaphor,
    blueprintNarrative,
    weatherNarrative,
    hasWeatherData,
    hasBlueprintData,
    coreTensions = [],
    relocationContext
  } = context;

  // Handle edge cases with minimal templates
  if (mode === 'natal-only' && !hasBlueprintData) {
    return "Natal structure unclear—re-export the chart with full placements.";
  }

  if (!hasBlueprintData && !hasWeatherData) {
    return "Integration limited: missing both natal blueprint and current weather data.";
  }

  // Build context for LLM
  const modeContext = `Report mode: ${mode}`;

  const blueprintContext = hasBlueprintData
    ? `\nBlueprint metaphor: "${blueprintMetaphor}"\n\nBlueprint narrative:\n${blueprintNarrative || 'Not provided'}`
    : '\nBlueprint: Not available';

  const weatherContext = hasWeatherData && weatherNarrative
    ? `\n\nWeather narrative:\n${weatherNarrative}`
    : '\n\nWeather: Not available';

  const tensionsContext = coreTensions.length > 0
    ? `\n\nCore tensions/paradoxes identified:\n${coreTensions.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
    : '';

  const relocationNote = relocationContext?.enabled
    ? `\n\nRelocation lens: Active (viewing from ${relocationContext.location || 'specified location'})`
    : '\n\nRelocation lens: Off (natal location)';

  const prompt = `You are Raven Calder writing the final "Stitched Reflection" paragraph for a Woven Map report. This is the integrative synthesis that weaves everything together.

${modeContext}${blueprintContext}${weatherContext}${tensionsContext}${relocationNote}

Your task:
1. Weave blueprint, weather, and paradox into ONE cohesive reflection (4-6 sentences)
2. For natal-only mode: focus on how these patterns surface in lived experience, with no weather references
3. For balance mode: show how blueprint and weather intersect—how natal themes respond to current transits
4. Reframe friction as creative tension, not pathology
5. If relocation is active, acknowledge how place shifts the expression
6. End with an OPEN QUESTION that invites resonance testing (not a directive)
7. Avoid these template phrases:
   - "stands alone—track how these patterns surface"
   - "Blueprint and current weather patterns intersect"
   - "Blueprint present without current weather data"
   - "observe how natal themes respond to daily transits"
8. Use conditional language: "may", "could", "might"
9. Maintain agency—this is a mirror, not a mandate

Output only the paragraph, no title or preamble.`;

  try {
    const reflection = await generateText(prompt, { model: 'gemini-1.5-flash' });
    return reflection.trim();
  } catch (error) {
    console.error('Stitched reflection generation failed:', error);

    // Minimal fallback based on mode
    if (mode === 'natal-only') {
      return hasBlueprintData
        ? `Your constitutional blueprint—${blueprintMetaphor}—shapes how you meet the world. Consider how these patterns show up in your daily choices and where they feel most alive.`
        : "Natal structure unclear—re-export the chart with full placements.";
    }

    if (hasBlueprintData && hasWeatherData) {
      return `The interplay between your foundational architecture—${blueprintMetaphor}—and today's atmospheric conditions creates a specific field of possibility. Notice where pressure activates latent capacity and where resistance signals a need for recalibration.`;
    } else if (hasBlueprintData) {
      return `Your blueprint—${blueprintMetaphor}—provides the stable ground. Without current weather data, focus on recognizing these patterns as they surface in your lived experience.`;
    } else if (hasWeatherData) {
      return "Current weather patterns are active, but without natal context, integration remains incomplete. Consider obtaining a full chart reading for deeper synthesis.";
    }

    return "Integration limited: missing both natal blueprint and current weather data.";
  }
}

/**
 * Generate relational stitched reflection
 *
 * For relational reports (Relational Mirror or Relational Balance),
 * the stitched reflection must hold BOTH people equally and describe
 * the between-space rather than prioritizing one person's experience.
 */
export async function narrateRelationalReflection(
  context: {
    mode: 'relational-mirror' | 'relational-balance';
    personA: {
      name?: string;
      blueprintMetaphor: string;
      blueprintNarrative?: string;
    };
    personB: {
      name?: string;
      blueprintMetaphor: string;
      blueprintNarrative?: string;
    };
    crossAspects?: Array<{
      type: string;
      p1_planet: string;
      p2_planet: string;
      orb: number;
      nature: 'support' | 'friction';
    }>;
    weatherNarrative?: string;
    hasWeatherData: boolean;
  }
): Promise<string> {

  const {
    mode,
    personA,
    personB,
    crossAspects = [],
    weatherNarrative,
    hasWeatherData
  } = context;

  const nameA = personA.name || 'Person A';
  const nameB = personB.name || 'Person B';

  const blueprintContext = `
${nameA}'s blueprint: "${personA.blueprintMetaphor}"
${nameB}'s blueprint: "${personB.blueprintMetaphor}"
`;

  const aspectsSummary = crossAspects.length > 0
    ? `\nCross-aspects between you:\n` +
      crossAspects.slice(0, 5).map(a =>
        `- ${a.type} (${a.nature}): ${a.p1_planet} to ${a.p2_planet} (${a.orb.toFixed(2)}°)`
      ).join('\n')
    : '\nNo cross-aspects provided.';

  const weatherContext = hasWeatherData && weatherNarrative
    ? `\n\nCurrent weather narrative:\n${weatherNarrative}`
    : '\n\nWeather: Not available (mirror mode)';

  const prompt = `You are Raven Calder writing the final "Stitched Reflection" paragraph for a RELATIONAL Woven Map report. This reflection describes the between-space—the field that exists between these two people.

Report mode: ${mode}
${blueprintContext}${aspectsSummary}${weatherContext}

Your task:
1. Hold BOTH people equally—use "between you," "you two," "you both"
2. Describe the relational field: where do these blueprints create resonance? Where do they create friction?
3. For oppositions: mirror the seesaw and emphasize the fulcrum
4. For squares: describe productive friction as growth fuel
5. Highlight missing aspects as independence space (not absence)
6. If weather data is present (balance mode), show how current transits activate the relational field
7. Frame both support AND friction as generative
8. End with an open question that invites both people to test the resonance
9. Use conditional language: "may", "could", "might"
10. NO astrology jargon—translate everything into lived relational experience
11. Keep to 4-6 sentences

Output only the paragraph, no title or preamble.`;

  try {
    const reflection = await generateText(prompt, { model: 'gemini-1.5-flash' });
    return reflection.trim();
  } catch (error) {
    console.error('Relational reflection generation failed:', error);

    // Minimal fallback
    const supportCount = crossAspects.filter(a => a.nature === 'support').length;
    const frictionCount = crossAspects.filter(a => a.nature === 'friction').length;

    return `The space between ${nameA}'s blueprint—${personA.blueprintMetaphor}—and ${nameB}'s blueprint—${personB.blueprintMetaphor}—creates a field where ${supportCount} support zones and ${frictionCount} friction zones coexist. Both are generative. Notice where resonance flows easily and where productive tension invites growth.`;
  }
}

/**
 * Validation helper
 */
export function validateReflectionContext(context: any): boolean {
  return !!(
    context?.mode &&
    context?.blueprintMetaphor
  );
}
