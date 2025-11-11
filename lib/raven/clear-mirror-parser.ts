/**
 * CLEAR MIRROR RESPONSE PARSER
 * 
 * Extracts structured sections from Raven auto-execution LLM responses.
 * Maps markdown output to ClearMirrorData interface fields.
 * 
 * Expected input format (from auto-execution prompts):
 * ### Hook Stack
 * **1. [Headline]** body text¹²³
 * **2. [Headline]** body text
 * ...
 * 
 * ### Frontstage
 * Date/time/location coordinates
 * Planetary geometry summary
 * 
 * ### Polarity Cards
 * **Card Title 1**
 * Tension description
 * 
 * ### Mirror Voice
 * Narrative with embedded question
 * 
 * ### Socratic Closure
 * Custom closure or standard
 */

export interface ParsedClearMirrorSections {
  hookStack?: Array<{
    headline: string;
    body: string;
  }>;
  frontstage?: string;
  polarityCards?: Array<{
    title: string;
    body: string;
  }>;
  mirrorVoice?: string;
  socraticClosure?: string;
  rawMarkdown: string; // fallback if parsing fails
}

/**
 * Extract Hook Stack items from markdown
 * Pattern: **1. [Headline]** body text
 */
function extractHookStack(text: string): Array<{ headline: string; body: string }> | undefined {
  const hookStackMatch = text.match(/### Hook Stack\s+([\s\S]*?)(?=###|$)/i);
  if (!hookStackMatch) return undefined;

  const hookSection = hookStackMatch[1];
  const items: Array<{ headline: string; body: string }> = [];
  
  // Match numbered items: **1. [Headline]** body
  const itemRegex = /\*\*\d+\.\s*\[([^\]]+)\]\*\*\s*([^\n]+(?:\n(?!\*\*\d+\.)[^\n]+)*)/g;
  let match;
  
  while ((match = itemRegex.exec(hookSection)) !== null) {
    items.push({
      headline: match[1].trim(),
      body: match[2].trim(),
    });
  }
  
  return items.length > 0 ? items : undefined;
}

/**
 * Extract Frontstage section
 * Everything between ### Frontstage and next section
 */
function extractFrontstage(text: string): string | undefined {
  const match = text.match(/### Frontstage\s+([\s\S]*?)(?=###|$)/i);
  return match ? match[1].trim() : undefined;
}

/**
 * Extract Polarity Cards
 * Pattern: **Card Title**\n body text
 */
function extractPolarityCards(text: string): Array<{ title: string; body: string }> | undefined {
  const polarityMatch = text.match(/### Polarity Cards?\s+([\s\S]*?)(?=###|$)/i);
  if (!polarityMatch) return undefined;

  const polaritySection = polarityMatch[1];
  const cards: Array<{ title: string; body: string }> = [];
  
  // Match bolded titles followed by body text
  const cardRegex = /\*\*([^*]+)\*\*\s*\n([^\n]+(?:\n(?!\*\*)[^\n]+)*)/g;
  let match;
  
  while ((match = cardRegex.exec(polaritySection)) !== null) {
    cards.push({
      title: match[1].trim(),
      body: match[2].trim(),
    });
  }
  
  return cards.length > 0 ? cards : undefined;
}

/**
 * Extract Mirror Voice section
 * Everything between ### Mirror Voice and next section
 */
function extractMirrorVoice(text: string): string | undefined {
  const match = text.match(/### Mirror Voice\s+([\s\S]*?)(?=###|$)/i);
  return match ? match[1].trim() : undefined;
}

/**
 * Extract Socratic Closure section
 * Everything between ### Socratic Closure and end
 */
function extractSocraticClosure(text: string): string | undefined {
  const match = text.match(/### Socratic Closure\s+([\s\S]*?)$/i);
  return match ? match[1].trim() : undefined;
}

/**
 * Parse LLM response into structured sections
 * Falls back to raw markdown if sections not found
 */
export function parseClearMirrorResponse(markdown: string): ParsedClearMirrorSections {
  const hookStack = extractHookStack(markdown);
  const frontstage = extractFrontstage(markdown);
  const polarityCards = extractPolarityCards(markdown);
  const mirrorVoice = extractMirrorVoice(markdown);
  const socraticClosure = extractSocraticClosure(markdown);

  return {
    hookStack,
    frontstage,
    polarityCards,
    mirrorVoice,
    socraticClosure,
    rawMarkdown: markdown,
  };
}

/**
 * Check if response contains expected Clear Mirror structure
 * Used for validation and fallback decisions
 */
export function hasValidClearMirrorStructure(parsed: ParsedClearMirrorSections): boolean {
  return !!(
    parsed.hookStack && parsed.hookStack.length > 0 &&
    parsed.frontstage &&
    parsed.mirrorVoice
  );
}
