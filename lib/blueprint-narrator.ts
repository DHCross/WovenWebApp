/**
 * Blueprint Narrator - Dynamic LLM-based metaphor generation
 * Replaces template-based blueprint generation with true synthesis
 *
 * Purpose: Generate unique, resonant metaphors for each individual's
 * constitutional modes that honor the specificity of their chart
 */

import { callPerplexity } from './llm';

interface ConstitutionalMode {
  function: string;
  description: string;
  primary_placements?: string[];
  supporting_placements?: string[];
  shadow_indicators?: string[];
  score: number;
}

interface BlueprintModes {
  primary_mode: ConstitutionalMode;
  secondary_mode: ConstitutionalMode;
  shadow_mode: ConstitutionalMode;
  confidence: string;
}

interface NatalContext {
  sun?: { sign: string; house?: number; element?: string };
  moon?: { sign: string; house?: number; element?: string };
  ascendant?: { sign: string; element?: string };
  mercury?: { sign: string; element?: string };
  aspects?: Array<{ type: string; p1_name: string; p2_name: string; orb: number }>;
}

/**
 * Generate unique blueprint metaphor using LLM synthesis
 *
 * This function transforms structural data about constitutional modes
 * into a unique, resonant metaphor that captures the individual's
 * psychological architecture.
 */
export async function generateBlueprintMetaphor(
  blueprintModes: BlueprintModes,
  natalContext?: NatalContext
): Promise<string> {

  const { primary_mode, secondary_mode, shadow_mode } = blueprintModes;

  // Build context from placements if available
  const contextLines: string[] = [];

  if (natalContext?.sun) {
    contextLines.push(`Sun in ${natalContext.sun.sign}${natalContext.sun.house ? ` (${natalContext.sun.house}th house)` : ''}`);
  }
  if (natalContext?.moon) {
    contextLines.push(`Moon in ${natalContext.moon.sign}${natalContext.moon.house ? ` (${natalContext.moon.house}th house)` : ''}`);
  }
  if (natalContext?.ascendant) {
    contextLines.push(`${natalContext.ascendant.sign} Rising`);
  }

  const contextBlock = contextLines.length > 0
    ? `\n\nSpecific natal placements:\n${contextLines.join('\n')}`
    : '';

  const prompt = `You are generating a unique blueprint metaphor for an individual's constitutional architecture.

Constitutional Modes Analysis:
- Primary Mode: ${primary_mode.function}
  ${primary_mode.description}
  Expressed through: ${primary_mode.primary_placements?.join(', ') || 'core identity'}

- Secondary Mode: ${secondary_mode.function}
  ${secondary_mode.description}
  Expressed through: ${secondary_mode.supporting_placements?.join(', ') || 'supportive channels'}

- Shadow Mode: ${shadow_mode.function}
  ${shadow_mode.description}
  Shadow indicators: ${shadow_mode.shadow_indicators?.join(', ') || 'constraint points'}
${contextBlock}

Generate a single-sentence metaphor (15-30 words) that:
1. Captures the PRIMARY mode as a foundational landscape/structure
2. Weaves in the SECONDARY mode as a current/thread/rhythm
3. Acknowledges the SHADOW mode as friction/tension/constraint
4. Uses ORIGINAL imagery - no generic templates
5. Feels specific to THIS person's unique combination

The metaphor should feel like a poetic description of their inner architecture - vivid, resonant, and utterly unique to these specific placements.

Do NOT use these phrases: "structured lattice", "flowing current", "steady foundation", "branching web", "analytical precision", "empathic resonance", "grounded presence", "visionary leaps", "threaded with", "occasionally strained by"

Output ONLY the metaphor, nothing else.`;

  try {
    const metaphor = await callPerplexity(prompt, { model: 'sonar-pro' });
    return metaphor.trim();
  } catch (error) {
    console.error('Blueprint metaphor generation failed:', error);
    // Fallback that signals the failure without resorting to templates
    return `Blueprint architecture: ${primary_mode.function} foundation, ${secondary_mode.function} current, ${shadow_mode.function} constraint (metaphor generation pending)`;
  }
}

/**
 * Generate narrative description of blueprint for frontstage
 * This is the opening paragraph that describes the stable constitutional climate
 */
export async function narrateBlueprintClimate(
  blueprintModes: BlueprintModes,
  metaphor: string,
  natalContext?: NatalContext
): Promise<string> {

  const { primary_mode, secondary_mode, shadow_mode } = blueprintModes;

  const contextLines: string[] = [];
  if (natalContext?.sun) contextLines.push(`Sun in ${natalContext.sun.sign}`);
  if (natalContext?.moon) contextLines.push(`Moon in ${natalContext.moon.sign}`);
  if (natalContext?.ascendant) contextLines.push(`${natalContext.ascendant.sign} Rising`);

  const contextBlock = contextLines.length > 0
    ? `\n\nKey placements: ${contextLines.join(', ')}`
    : '';

  const prompt = `[narrateBlueprintClimate]\nYou are Raven Calder, writing the opening "Blueprint" paragraph for a Woven Map report. This paragraph describes the stable constitutional climate - the enduring psychological architecture.

Blueprint Metaphor (already generated):
"${metaphor}"

Constitutional Structure:
- Primary Mode: ${primary_mode.function} - ${primary_mode.description}
- Secondary Mode: ${secondary_mode.function} - ${secondary_mode.description}
- Shadow Mode: ${shadow_mode.function} - ${shadow_mode.description}
${contextBlock}

Write a single conversational paragraph (4-6 sentences) that:
1. Opens with or integrates the blueprint metaphor
2. Explains what this constitutional structure means in lived experience
3. Describes how the Primary mode operates as the dominant orientation
4. Shows how the Secondary mode supports or weaves through the Primary
5. Acknowledges the Shadow mode as a point of friction/constraint
6. Uses NO astrology jargon - translate everything into embodied, everyday language
7. Maintains agency ("you may", "this could", "often shows up as")

Remember: This is BASELINE climate, not current weather. Keep it enduring and structural.

Output only the paragraph, no title or preamble.`;

  try {
    const narrative = await callPerplexity(prompt, { model: 'sonar-pro' });
    return narrative.trim();
  } catch (error) {
    console.error('Blueprint narrative generation failed:', error);
    return `Your constitutional blueprint—${metaphor}—reflects the stable architecture through which you organize experience. The ${primary_mode.function.toLowerCase()} orientation forms your dominant lens, while ${secondary_mode.function.toLowerCase()} currents provide supportive structure. Friction appears where ${shadow_mode.function.toLowerCase()} patterns meet constraint.`;
  }
}

/**
 * Validation helper - ensures we're working with complete data
 */
export function validateBlueprintModes(modes: any): modes is BlueprintModes {
  return !!(
    modes?.primary_mode?.function &&
    modes?.secondary_mode?.function &&
    modes?.shadow_mode?.function
  );
}
