// Thin integration layer so the main app doesn’t import deep module internals directly.
// This preserves future flexibility (e.g., swapping build output, adding caching, validation).

import { generateSection, SectionType, InputPayload } from '../poetic-brain/src/index';
import { validatePoeticBrainPayload } from './poetic-brain-schema';

export interface PoeticBrainAdapterOptions {
  sectionType: SectionType;
  payload: InputPayload;
}

export interface PoeticBrainAdapterResult {
  text: string;
  section: SectionType;
  generatedAt: string;
}

export function invokePoeticBrain(opts: PoeticBrainAdapterOptions): PoeticBrainAdapterResult {
  const { sectionType, payload } = opts;
  let validated: InputPayload;
  try {
    validated = validatePoeticBrainPayload(payload);
  } catch (e: any) {
    return {
      text: `[Poetic Brain validation error] ${e.message}`,
      section: sectionType,
      generatedAt: new Date().toISOString()
    };
  }
  const text = generateSection(sectionType, validated);
  return { text, section: sectionType, generatedAt: new Date().toISOString() };
}
