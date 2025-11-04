import type { MandateAspect } from './types';

/**
 * Formats mandate data for LLM prompt injection
 * Follows FIELD → MAP → VOICE protocol from Raven's prompt architecture
 */
export function formatMandateForPrompt(mandate: MandateAspect, index: number): string {
  const { archetypes, geometry, diagnostic, fieldPressure, mapTranslation, voiceHook } = mandate;
  const aspectType = geometry.aspectType.toLowerCase();
  const orb = geometry.orbDegrees.toFixed(1);
  
  return [
    `## ${index + 1}. ${archetypes.a.name} ${aspectType} ${archetypes.b.name} (${orb}° orb)`,
    `**Diagnostic**: ${diagnostic}`,
    `**Field Pressure**: ${fieldPressure}`,
    `**Map Translation**: ${mapTranslation}`,
    `**Voice Hook**: "${voiceHook}"`,
    '' // Empty line for readability
  ].join('\n');
}

/**
 * Builds the mandate section for the LLM prompt
 * Returns empty string if no mandates are provided
 */
export function buildMandatePromptSection(
  mandates: MandateAspect[],
  personName: string
): string {
  if (!mandates.length) {
    return `No high-charge aspects were found for ${personName}. ` +
           `Focus on the core planetary positions and houses instead.\n\n`;
  }

  const mandateSections = mandates
    .map((mandate, i) => formatMandateForPrompt(mandate, i))
    .join('\n');

  return [
    `# MANDATE DATA - ${personName}`,
    'The following aspects represent the highest-tension geometries in the chart. ',
    'Use them to ground your analysis in observable patterns.\n',
    mandateSections,
    '---\n',
  ].join('\n');
}

/**
 * Enhances the existing prompt with mandate data
 */
export function enhancePromptWithMandates(
  basePrompt: string,
  personA: { name: string; mandates: MandateAspect[] },
  personB?: { name: string; mandates: MandateAspect[] }
): string {
  const personASection = buildMandatePromptSection(personA.mandates, personA.name);
  
  let personBSection = '';
  if (personB) {
    personBSection = buildMandatePromptSection(personB.mandates, personB.name);
  }

  // Insert mandate sections after the core prompt architecture but before any specific instructions
  const promptSections = basePrompt.split('\n\n');
  const architectureIndex = promptSections.findIndex(section => 
    section.includes('[[RAVEN_PROMPT_ARCHITECTURE]]')
  );
  
  if (architectureIndex !== -1) {
    promptSections.splice(
      architectureIndex + 1, 
      0, 
      personASection + (personBSection ? '\n' + personBSection : '')
    );
  }

  return promptSections.join('\n\n');
}
