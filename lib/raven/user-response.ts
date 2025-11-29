/**
 * User Response Classification
 * 
 * Functions for detecting and classifying user responses in Raven sessions,
 * including SST classification (WB/ABE/OSR) and meta-signals.
 */

/**
 * Check if user message indicates OSR (signal void, non-ping, outside symbolic range)
 */
export function checkForOSRIndicators(text: string): boolean {
  const lower = text.toLowerCase();
  const osrPhrases = [
    'doesn\'t resonate',
    'no resonance',
    'signal void',
    'non-ping',
    'outside symbolic range',
    'doesn\'t match lived experience',
    'not recognizable in life',
    'doesn\'t ring true',
    'outside my experience',
    'not grounded in reality',
    'metaphor without lived grounding',
    'symbolic speculation',
    'no behavioral evidence',
    'misses the mark entirely',
    'no connection to actual life',
    'unrecognizable patterns'
  ];

  return osrPhrases.some((phrase: string) => lower.includes(phrase));
}

/**
 * Check if user is clearly affirming/confirming resonance (WB - Within Boundary)
 */
export function checkForClearAffirmation(text: string): boolean {
  const lower = text.toLowerCase();
  const clearAffirmPhrases = [
    'within boundary',
    'wb',
    'resonates with lived experience',
    'recognizable in life',
    'that\'s exactly what happens',
    'matches my experience',
    'grounded in reality',
    'behavioral evidence',
    'lived truth',
    'that\'s me',
    'yes it is',
    'yes that is',
    'that\'s right',
    'correct',
    'true'
  ];

  // Also check for simple "yes" at start of response
  if (/^yes\b/i.test(text.trim())) return true;

  return clearAffirmPhrases.some((phrase: string) => lower.includes(phrase));
}

/**
 * Check if user is requesting to start/continue the reading (not OSR)
 */
export function checkForReadingStartRequest(text: string): boolean {
  const startReadingPhrases = [
    'give me the reading',
    'start the reading',
    'begin the reading',
    'continue with the reading',
    'show me the reading',
    'start the mirror',
    'give me the mirror',
    'show me the mirror',
    'start mirror flow',
    'give me mirror flow',
    'show me mirror flow',
    'start symbolic weather',
    'give me symbolic weather',
    'show me symbolic weather',
    'let\'s begin',
    'let\'s start',
    'please continue',
    'go ahead',
  ];

  return startReadingPhrases.some((phrase: string) => text.toLowerCase().includes(phrase));
}

/**
 * Check if user is giving partial/uncertain confirmation (ABE)
 */
export function checkForPartialAffirmation(text: string): boolean {
  const lower = text.toLowerCase();
  const partialPhrases = [
    'sort of',
    'kind of',
    'partly',
    'somewhat',
    'maybe',
    'i think so',
    'possibly',
    'in a way',
    'to some extent'
  ];

  return partialPhrases.some((phrase: string) => lower.includes(phrase));
}

/**
 * Enhanced response classification for SST
 */
export function classifyUserResponse(text: string): 'CLEAR_WB' | 'PARTIAL_ABE' | 'OSR' | 'UNCLEAR' {
  // Check if user is requesting to start/continue the reading (treat as CLEAR_WB)
  if (checkForReadingStartRequest(text)) return 'CLEAR_WB';
  if (checkForClearAffirmation(text)) return 'CLEAR_WB';
  if (checkForPartialAffirmation(text)) return 'PARTIAL_ABE';
  if (checkForOSRIndicators(text)) return 'OSR';
  return 'UNCLEAR';
}

/**
 * Detect meta-signal complaints about being asked again / repetition
 */
export function isMetaSignalAboutRepetition(text: string): boolean {
  const lower = text.toLowerCase();
  const phrases = [
    'you asked',
    'you are asking again',
    'why are you asking',
    'i already said',
    'i just said',
    'as i said',
    'what i had just explained',
    'repeating myself',
    'asked again',
    'repeat the question',
    'i literally just',
    'already confirmed',
    "i've already answered",
    'well, yeah',
  ];
  return phrases.some((p: string) => lower.includes(p));
}
