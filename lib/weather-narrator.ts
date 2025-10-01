/**
 * Weather Narrator - Dynamic LLM-based symbolic weather generation
 * Replaces template-based weather phrases with unique synthesis
 *
 * Purpose: Describe current symbolic weather by synthesizing daily indices,
 * active transits, and the individual's blueprint into original prose
 */

import { generateText } from './llm';

interface DailyIndex {
  date: string;
  magnitude?: number;
  valence?: number;
  volatility?: number;
  sf_diff?: number;
  resilience?: number;
  depletion?: number;
}

interface Transit {
  type: string;
  transiting_planet: string;
  natal_planet: string;
  orb: number;
  exact_date?: string;
  applying?: boolean;
}

interface WeatherContext {
  indices: DailyIndex[];
  transits?: Transit[];
  blueprintMetaphor?: string;
  window?: { start: string; end: string };
}

/**
 * Generate symbolic weather narrative using LLM synthesis
 *
 * This function creates a unique description of the current symbolic weather
 * by analyzing daily indices and active transits in the context of the
 * individual's constitutional blueprint.
 */
export async function narrateSymbolicWeather(
  context: WeatherContext
): Promise<string> {

  const { indices, transits = [], blueprintMetaphor, window } = context;

  if (!indices || indices.length === 0) {
    return "Symbolic weather suppressed: no daily indices for this window.";
  }

  // Analyze recent indices
  const recentDays = indices.slice(-3);
  const avgMagnitude = recentDays.reduce((sum, day) => sum + (day.magnitude || 0), 0) / recentDays.length;
  const avgValence = recentDays.reduce((sum, day) => sum + (day.valence || 0), 0) / recentDays.length;
  const avgVolatility = recentDays.reduce((sum, day) => sum + (day.volatility || 0), 0) / recentDays.length;
  const avgSfDiff = recentDays.reduce((sum, day) => sum + (day.sf_diff || 0), 0) / recentDays.length;

  // Build indices summary
  const indicesSummary = `
Recent ${recentDays.length}-day window:
- Average magnitude: ${avgMagnitude.toFixed(2)} (pressure/intensity level)
- Average valence: ${avgValence.toFixed(2)} (friction vs flow: negative = friction)
- Average volatility: ${avgVolatility.toFixed(2)} (atmospheric instability)
- Average SF differential: ${avgSfDiff.toFixed(2)} (strain-flow balance)
`;

  // Build transits summary
  const transitsSummary = transits.length > 0
    ? `\nActive transits (${transits.length} total):\n` +
      transits.slice(0, 5).map(t =>
        `- ${t.transiting_planet} ${t.type} natal ${t.natal_planet} (orb: ${t.orb.toFixed(2)}°${t.applying ? ', applying' : ', separating'})`
      ).join('\n')
    : '\nNo active transits provided.';

  const blueprintContext = blueprintMetaphor
    ? `\nThis person's constitutional blueprint: "${blueprintMetaphor}"`
    : '';

  const windowContext = window
    ? `\nTime window: ${window.start} to ${window.end}`
    : '';

  const prompt = `You are Raven Calder writing the "Weather" paragraph for a Woven Map report. This paragraph describes the current symbolic weather - the active atmospheric conditions right now.

DATA (Field Layer):
${indicesSummary}${transitsSummary}${blueprintContext}${windowContext}

Your task:
1. Open with FIELD: neutral description of today's symbolic activation based on the indices
2. Interpret what this atmospheric pattern might mean in lived experience (MAP layer)
3. Avoid these template phrases: "high-intensity weather", "elevated magnitude", "steady undercurrents", "scattered weather patterns", "neutral weather patterns", "significant volatility"
4. Use ORIGINAL, vivid language that captures the specific texture of THIS weather pattern
5. Integrate the blueprint metaphor if provided - describe how this weather interacts with their constitutional structure
6. Remember: high magnitude = pressure (not moral judgment), negative valence = friction (not punishment)
7. If quiet but tense (low magnitude but negative valence or high SF differential), note that "quiet ≠ stable"
8. Use conditional language: "may", "could", "often shows up as"
9. NO astrology jargon - translate transits into embodied experience without naming planets
10. Keep to 4-6 sentences

Output only the paragraph, no title or preamble.`;

  try {
    const narrative = await generateText(prompt, { model: 'gemini-1.5-flash' });
    return narrative.trim();
  } catch (error) {
    console.error('Weather narrative generation failed:', error);

    // Fallback that uses indices but minimal templating
    let fallback = `The symbolic atmosphere `;

    if (avgMagnitude > 3 && avgVolatility > 3) {
      fallback += `carries significant pressure with unstable currents`;
    } else if (avgMagnitude > 3) {
      fallback += `shows elevated intensity with relatively steady conditions`;
    } else if (avgVolatility > 3) {
      fallback += `remains variable and unpredictable despite lower pressure`;
    } else {
      fallback += `appears quiet, though surface calm may mask underlying tension`;
    }

    fallback += ` over this ${recentDays.length}-day window.`;

    if (avgValence < -1) {
      fallback += ` Friction exceeds flow; expect resistance in forward movement.`;
    }

    return fallback;
  }
}

/**
 * Validate that we have sufficient index data for weather generation
 */
export function hasValidIndices(indices: DailyIndex[] | undefined): boolean {
  if (!indices || indices.length === 0) return false;

  // Check that at least one index has magnitude data
  return indices.some(idx => idx.magnitude !== undefined && idx.magnitude !== null);
}

/**
 * Generate experimental prompt for user
 *
 * When conditions warrant, suggest a concrete, same-day experiment
 * the user can perform to test the symbolic weather interpretation
 */
export async function generateWeatherExperiment(
  context: WeatherContext
): Promise<string | null> {

  const { indices, transits = [], blueprintMetaphor } = context;

  if (!indices || indices.length === 0) return null;

  const recentDay = indices[indices.length - 1];

  // Only generate experiments for notable conditions
  const isMagnitudeHigh = (recentDay.magnitude || 0) > 3.5;
  const isVolatilityHigh = (recentDay.volatility || 0) > 3.5;
  const isValenceNegative = (recentDay.valence || 0) < -1.5;

  if (!isMagnitudeHigh && !isVolatilityHigh && !isValenceNegative) {
    return null; // Conditions too neutral for experiment
  }

  const indicesSummary = `
Today's conditions:
- Magnitude: ${recentDay.magnitude?.toFixed(2) || 'N/A'}
- Valence: ${recentDay.valence?.toFixed(2) || 'N/A'}
- Volatility: ${recentDay.volatility?.toFixed(2) || 'N/A'}
`;

  const blueprintContext = blueprintMetaphor
    ? `\nConstitutional blueprint: "${blueprintMetaphor}"`
    : '';

  const prompt = `You are Raven Calder suggesting a concrete, same-day experiment to test today's symbolic weather.

${indicesSummary}${blueprintContext}

Generate ONE specific, actionable experiment (1-2 sentences) that:
1. Can be performed today
2. Is concrete and falsifiable
3. Tests the hypothesis suggested by today's conditions
4. Feels relevant to this person's blueprint if provided
5. Uses conditional language ("try", "notice if", "experiment with")

Examples of good experiments:
- "Try front-loading your highest-stakes decision before noon and notice if afternoon resistance increases."
- "Experiment with externalizing: speak your internal debate out loud to a trusted person and track whether clarity emerges or fragments further."

Do NOT suggest: meditation, journaling, "being mindful", or other generic practices.

Output only the experiment suggestion, nothing else.`;

  try {
    const experiment = await generateText(prompt, { model: 'gemini-1.5-flash' });
    return experiment.trim();
  } catch (error) {
    console.error('Weather experiment generation failed:', error);
    return null;
  }
}
