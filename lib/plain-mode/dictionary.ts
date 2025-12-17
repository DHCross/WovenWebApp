/**
 * Plain Mode Dictionary
 * Translates technical astrological/system terms into approachable language
 * for the "Anti-Dread" user archetype who needs clarity without jargon
 */

export const PLAIN_MODE_DICTIONARY: Record<string, string> = {
  // === Core Systems ===
  'Math Brain': 'Clarity Engine',
  'Poetic Brain': 'Mirror Voice',
  'Mirror Directive': 'Pattern Summary',
  'Mirror Report': 'Your Pattern Map',
  'Woven Map': 'Pattern Navigator',
  
  // === Mechanics ===
  'Symbolic Weather': 'Current Atmosphere',
  'Transits': 'Moving Influences',
  'Natal Chart': 'Baseline Blueprint',
  'Natal': 'Baseline',
  'Relocation': 'Location Shift',
  'Synastry': 'Relationship Dynamics',
  'Composite': 'Shared Pattern',
  'Aspects': 'Pattern Connections',
  'Aspect': 'Connection',
  'Houses': 'Life Areas',
  'House': 'Life Area',
  
  // === Metrics ===
  'Magnitude': 'Intensity',
  'Directional Bias': 'Energy Flow',
  'Valence': 'Quality',
  'Orb': 'Precision',
  'Coherence': 'Clarity',
  'SFD': 'Signal Strength',
  
  // === Planets (when context requires simplification) ===
  'Sun': 'Core Identity',
  'Moon': 'Emotional Pattern',
  'Mercury': 'Thinking Style',
  'Venus': 'Connection Style',
  'Mars': 'Action Pattern',
  'Jupiter': 'Growth Direction',
  'Saturn': 'Structure Pattern',
  'Uranus': 'Change Catalyst',
  'Neptune': 'Dream Pattern',
  'Pluto': 'Transformation',
  'Chiron': 'Growth Edge',
  
  // === Aspect Types ===
  'Conjunction': 'Fusion',
  'Opposition': 'Polarity',
  'Square': 'Tension',
  'Trine': 'Flow',
  'Sextile': 'Opportunity',
  'Quincunx': 'Adjustment',
  
  // === Signs (kept simple - these are recognizable) ===
  // No translation needed - most users know zodiac signs
  
  // === Session States ===
  'OSR': 'Outside Current View',
  'WB': 'Pattern-Based',
  'ABE': 'Self-Reported',
  
  // === UI Elements ===
  'Hook Stack': 'Key Patterns',
  'Polarity Cards': 'Tension Points',
  'Mirror Voice': 'Reflection',
  'Frontstage': 'Pattern Overview',
  'Backstage': 'Technical Details',
  'Seismograph': 'Energy Monitor',
  'Balance Meter': 'Energy Balance',
  
  // === Report Types ===
  'Solo Mirror': 'Personal Reading',
  'Relational Mirror': 'Partnership Reading',
  'Parallel Diagnostic': 'Side-by-Side Reading',
  'Weather Overlay': 'Current Influences',
};

/**
 * Get the plain-mode translation for a term
 * Falls back to original if no translation exists
 */
export function translateTerm(term: string, isPlainMode: boolean): string {
  if (!isPlainMode) return term;
  return PLAIN_MODE_DICTIONARY[term] ?? term;
}

/**
 * Translate all known terms in a text string
 * Preserves case when possible
 */
export function translateText(text: string, isPlainMode: boolean): string {
  if (!isPlainMode || !text) return text;
  
  let result = text;
  for (const [technical, plain] of Object.entries(PLAIN_MODE_DICTIONARY)) {
    // Case-insensitive replace while preserving surrounding context
    const regex = new RegExp(`\\b${escapeRegex(technical)}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      // Preserve original casing pattern if possible
      if (match === match.toUpperCase()) return plain.toUpperCase();
      if (match === match.toLowerCase()) return plain.toLowerCase();
      if (match[0] === match[0].toUpperCase()) {
        return plain.charAt(0).toUpperCase() + plain.slice(1);
      }
      return plain;
    });
  }
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type TermKey = keyof typeof PLAIN_MODE_DICTIONARY;
