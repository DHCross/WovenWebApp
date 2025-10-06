/* PDF Sanitization Helper - Maps Math Brain glyphs and non-WinAnsi characters to ASCII-safe fallbacks */

// First, strip all variation selectors and combining characters that cause encoding issues
function stripVariationSelectors(text: string): string {
  return text
    // Remove Variation Selector-16 (U+FE0F) - forces emoji rendering
    .replace(/\uFE0F/g, '')
    // Remove Variation Selector-15 (U+FE0E) - forces text rendering
    .replace(/\uFE0E/g, '')
    // Remove other combining characters that cause issues
    .replace(/[\u0300-\u036F]/g, '') // Combining diacritical marks
    .replace(/[\u20D0-\u20FF]/g, '') // Combining marks for symbols
    .replace(/[\u1AB0-\u1AFF]/g, '') // Combining diacritical marks extended
    .replace(/[\u1DC0-\u1DFF]/g, ''); // Combining diacritical marks supplement
}

// Map of common astrological glyphs and symbols to ASCII equivalents
const GLYPH_MAP: Record<string, string> = {
  // Planetary symbols
  '☉': 'Sun',
  '☽': 'Moon',
  '☿': 'Mercury',
  '♀': 'Venus',
  '♂': 'Mars',
  '♃': 'Jupiter',
  '♄': 'Saturn',
  '♅': 'Uranus',
  '♆': 'Neptune',
  '♇': 'Pluto',

  // Zodiac signs
  '♈': 'Aries',
  '♉': 'Taurus',
  '♊': 'Gemini',
  '♋': 'Cancer',
  '♌': 'Leo',
  '♍': 'Virgo',
  '♎': 'Libra',
  '♏': 'Scorpio',
  '♐': 'Sagittarius',
  '♑': 'Capricorn',
  '♒': 'Aquarius',
  '♓': 'Pisces',

  // Aspects
  '☌': 'conjunction',
  '☍': 'opposition',
  '□': 'square',
  '△': 'trine',
  '✶': 'sextile',
  '⚼': 'quincunx',

  // Other astrological symbols
  '☊': 'North Node',
  '☋': 'South Node',
  '⚷': 'Chiron',
  'ⅺ': 'Lilith',
  '⚸': 'Ceres',
  '⚹': 'Pallas',
  '⚺': 'Juno',
  '⚻': 'Vesta',

  // House cusps
  'ASC': 'Ascendant',
  'MC': 'Midheaven',
  'DSC': 'Descendant',
  'IC': 'Imum Coeli',

  // Degrees and mathematical symbols
  '°': 'deg',
  '′': "'",
  '″': '"',
  '∠': 'angle',
  '∞': 'infinity',
  '±': '+/-',
  '×': 'x',
  '÷': '/',
  '≈': '~',
  '≤': '<=',
  '≥': '>=',
  '≠': '!=',

  // Common Unicode characters that break PDF encoding
  '"': '"',
  "'": "'",
  '…': '...',
  '–': '-',
  '—': '--',
  '•': '*',
  '·': '.',
  '‹': '<',
  '›': '>',
  '«': '<<',
  '»': '>>',
  '¡': '!',
  '¿': '?',

  // Mathematical and scientific
  '∆': 'Delta',
  'Σ': 'Sum',
  'π': 'pi',
  'μ': 'mu',
  'σ': 'sigma',
  'φ': 'phi',
  'ψ': 'psi',
  'ω': 'omega',
  'α': 'alpha',
  'β': 'beta',
  'γ': 'gamma',
  'δ': 'delta',
  'ε': 'epsilon',
  'ζ': 'zeta',
  'η': 'eta',
  'θ': 'theta',
  'ι': 'iota',
  'κ': 'kappa',
  'λ': 'lambda',
  'ν': 'nu',
  'ξ': 'xi',
  'ο': 'omicron',
  'ρ': 'rho',
  'τ': 'tau',
  'υ': 'upsilon',
  'χ': 'chi',

  // Fractions
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',

  // Currencies (often problematic)
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '¢': 'cents',
  '₹': 'INR',
  '₽': 'RUB',
  '₦': 'NGN',
  '₨': 'Rs',

  // Arrows
  '→': '->',
  '←': '<-',
  '↑': '^',
  '↓': 'v',
  '↔': '<->',
  '↕': '^v',
  '⇒': '=>',
  '⇐': '<=',
  '⇔': '<=>',

  // Checkbox and list symbols
  '☐': '[ ]',
  '☑': '[x]',
  '☒': '[X]',
  '✓': 'v',
  '✔': 'v',
  '✗': 'x',
  '✘': 'X',

  // Emojis and emoticons
  '😀': ':)',
  '😊': ':)',
  '😎': 'B)',
  '😢': ':(',
  '😭': ":'''(",
  '😍': '<3',
  '😘': ':*',
  '😂': ':D',
  '🤔': ':thinking:',
  '👍': '+1',
  '👎': '-1',
  '❤️': '<3',
  '💔': '</3',
  '⭐': '*',
  '🌟': '*',
  '✨': '*sparkles*',
  '🔥': '*fire*',
  '💪': '*strong*',
  '🎉': '*celebration*',
  '🎯': '*target*',
  '✅': '[OK]',
  '❌': '[X]',
  '📊': '*chart*',
  '📈': '*trending_up*',
  '📉': '*trending_down*',
  '⚡': '*lightning*',
  '⚡️': '*lightning*', // With variation selector
  '🔥️': '*fire*', // With variation selector
  '✨️': '*sparkles*', // With variation selector
  '⭐️': '*', // With variation selector
  '🌙': 'Moon',
  '🌞': 'Sun',
  '🌍': 'Earth',
  '🚀': 'rocket',
  '🚨': '[ALERT]',
  '⚠': '[WARN]',

  // Common Balance Meter symbols with variation selectors
  '💎': '*diamond*',
  '💎️': '*diamond*',
  '🦋': '*butterfly*',
  '🦋️': '*butterfly*',
  '🌈': '*rainbow*',
  '🌈️': '*rainbow*',
  '🧘': '*meditation*',
  '🧘️': '*meditation*',
  '🌊': '*wave*',
  '🌊️': '*wave*',
  '🌱': '*seedling*',
  '🌱️': '*seedling*',
  '⚖️': '*balance*',
  '🌪': '*tornado*',
  '🌪️': '*tornado*',
  '🌫': '*fog*',
  '🌫️': '*fog*',
  '🧩': '*puzzle*',
  '🧩️': '*puzzle*',
  '⚔️': '*swords*',
  '💥': '*explosion*',
  '💥️': '*explosion*',

  // Common problematic symbols
  '§': 'section',
  '¶': 'paragraph',
  '©': '(c)',
  '®': '(R)',
  '™': '(TM)',
  '†': '+',
  '‡': '++',
  '‰': 'per mille',
  '‱': 'per ten thousand',
  '─': '-'
};

// Additional character ranges that are problematic for WinAnsi encoding
const PROBLEMATIC_RANGES: Array<[number, number]> = [
  [0x0080, 0x009F], // Control characters
  [0x0100, 0x017F], // Latin Extended-A
  [0x0180, 0x024F], // Latin Extended-B
  [0x1E00, 0x1EFF], // Latin Extended Additional
  [0x2000, 0x206F], // General Punctuation
  [0x2070, 0x209F], // Superscripts and Subscripts
  [0x20A0, 0x20CF], // Currency Symbols
  [0x2100, 0x214F], // Letterlike Symbols
  [0x2150, 0x218F], // Number Forms
  [0x2190, 0x21FF], // Arrows
  [0x2200, 0x22FF], // Mathematical Operators
  [0x2300, 0x23FF], // Miscellaneous Technical
  [0x2400, 0x243F], // Control Pictures
  [0x2440, 0x245F], // Optical Character Recognition
  [0x2460, 0x24FF], // Enclosed Alphanumerics
  [0x2500, 0x257F], // Box Drawing
  [0x2580, 0x259F], // Block Elements
  [0x25A0, 0x25FF], // Geometric Shapes
  [0x2600, 0x26FF], // Miscellaneous Symbols
  [0x2700, 0x27BF], // Dingbats
  [0x1F000, 0x1F9FF], // Emoji and symbols
];

/**
 * Sanitizes text for PDF generation by replacing problematic characters
 * with ASCII-safe equivalents that work with WinAnsi encoding.
 */
export function sanitizeForPDF(
  text: string,
  options: { preserveWhitespace?: boolean } = {},
): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const { preserveWhitespace = false } = options;

  // First, strip all variation selectors and combining characters
  let sanitized = stripVariationSelectors(text);

  // First pass: Replace known glyphs and symbols
  for (const [original, replacement] of Object.entries(GLYPH_MAP)) {
    if (sanitized.includes(original)) {
      // Create word boundary regex to avoid replacing parts of existing words
      const regex = new RegExp(escapeRegExp(original), 'g');
      sanitized = sanitized.replace(regex, (match, offset) => {
        // Check if this glyph is part of a larger word that already contains the replacement
        const before = sanitized.slice(Math.max(0, offset - 10), offset);
        const after = sanitized.slice(offset + match.length, offset + match.length + 10);
        const context = before + replacement + after;

        // Avoid double replacement (e.g., "Leo ♌" becomes "Leo Leo" instead of just "Leo")
        if (before.trim().endsWith(replacement.trim()) || after.trim().startsWith(replacement.trim())) {
          return ''; // Just remove the glyph if the word is already there
        }
        return replacement;
      });
    }
  }

  // Second pass: Replace problematic Unicode ranges with generic fallbacks
  sanitized = sanitized.replace(/[\u0080-\u009F]/g, ''); // Remove control chars
  sanitized = sanitized.replace(/[\u0100-\u017F]/g, (char) => {
    // Latin Extended-A - try to decompose accents
    return char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  });

  // Third pass: Handle remaining problematic characters
  sanitized = Array.from(sanitized).map(char => {
    const charCode = char.codePointAt(0) || 0;

    // Check if character is in problematic ranges
    const isProblematic = PROBLEMATIC_RANGES.some(([start, end]) =>
      charCode >= start && charCode <= end
    );

    if (isProblematic) {
      // Try to find a reasonable ASCII approximation
      if (charCode >= 0x2000 && charCode <= 0x200F) return ' '; // Various spaces
      if (charCode >= 0x2010 && charCode <= 0x2027) return '-'; // Various dashes
      if (charCode >= 0x2030 && charCode <= 0x2038) return '%'; // Permille, etc.
      if (charCode >= 0x2070 && charCode <= 0x2079) return char.charCodeAt(0) - 0x2070 + '0'; // Superscript digits
      if (charCode >= 0x2080 && charCode <= 0x2089) return char.charCodeAt(0) - 0x2080 + '0'; // Subscript digits

      // For emojis and complex symbols, use generic replacement
      if (charCode >= 0x1F000) return '*symbol*';

      // Default fallback for unhandled problematic chars
      return '?';
    }

    return char;
  }).join('');

  // Final cleanup
  sanitized = sanitized
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  if (preserveWhitespace) {
    sanitized = sanitized
      .replace(/\t/g, '  ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } else {
    sanitized = sanitized
      .replace(/\s+/g, ' ')
      .trim();
  }

  sanitized = sanitized
    .replace(/\?+/g, '?')
    .replace(/\*symbol\*\*symbol\*/g, '*symbols*');

  return sanitized;
}

/**
 * Sanitizes a JSON object recursively, cleaning all string values
 */
export function sanitizeJSONForPDF(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeForPDF(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(sanitizeJSONForPDF);
  } else if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = sanitizeForPDF(key);
      sanitized[cleanKey] = sanitizeJSONForPDF(value);
    }
    return sanitized;
  }
  return obj;
}

/**
 * Sanitizes report text specifically for PDF generation,
 * handling both rendered content and raw JSON
 */
export function sanitizeReportForPDF(report: {
  renderedText?: string;
  rawJSON?: any;
  title?: string;
  sections?: Array<{ title: string; body: string; mode?: string }>;
}): {
  renderedText?: string;
  rawJSON?: string;
  title?: string;
  sections?: Array<{ title: string; body: string; mode?: string }>;
} {
  const sanitized: any = {};

  if (report.renderedText) {
    sanitized.renderedText = sanitizeForPDF(report.renderedText);
  }

  if (report.rawJSON) {
    const cleanJSON = sanitizeJSONForPDF(report.rawJSON);
    sanitized.rawJSON = JSON.stringify(cleanJSON, null, 2);
  }

  if (report.title) {
    sanitized.title = sanitizeForPDF(report.title);
  }

  if (report.sections) {
    sanitized.sections = report.sections.map(section => ({
      title: sanitizeForPDF(section.title),
      body: section.mode === 'mono'
        ? JSON.stringify(sanitizeJSONForPDF(JSON.parse(section.body)), null, 2)
        : sanitizeForPDF(section.body),
      mode: section.mode
    }));
  }

  return sanitized;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates that a string is safe for PDF generation
 * Returns true if the string contains only WinAnsi-compatible characters
 */
export function isPDFSafe(text: string): boolean {
  if (!text || typeof text !== 'string') return true;

  return Array.from(text).every(char => {
    const charCode = char.codePointAt(0) || 0;

    // ASCII range is always safe
    if (charCode <= 0x7F) return true;

    // WinAnsi extended range (0x80-0xFF)
    if (charCode >= 0x80 && charCode <= 0xFF) {
      // Check for specific problematic characters in WinAnsi
      const problematic = [0x81, 0x8D, 0x8F, 0x90, 0x9D];
      return !problematic.includes(charCode);
    }

    // Anything above 0xFF needs sanitization
    return false;
  });
}

/**
 * Test function to demonstrate sanitization
 */
export function testSanitization(): void {
  const testCases = [
    'Sun ☉ in Leo ♌ trine Moon ☽ in Sagittarius ♐ (3°42′)',
    'Mercury ☿ retrograde ℞ opposing Jupiter ♃ with 2°15″ orb',
    'Aspects: conjunction ☌, opposition ☍, square □, trine △, sextile ✶',
    'Houses: ASC 15°23′ Pisces ♓, MC 28°47′ Sagittarius ♐',
    'Special characters: "smart quotes", em-dash — and ellipsis…',
    'Math: ∆ = 45°, π ≈ 3.14159, ∞ energy flow →',
    'Emojis: 🌟✨⭐ High energy! 🚀 Transformative period 🔥',
    'Fractions: ½ strength, ¾ complete, ⅓ remaining'
  ];

  console.log('PDF Sanitization Test Results:');
  console.log('================================');

  testCases.forEach((test, i) => {
    const original = test;
    const sanitized = sanitizeForPDF(test);
    const isSafe = isPDFSafe(sanitized);

    console.log(`\nTest ${i + 1}:`);
    console.log(`Original:  ${original}`);
    console.log(`Sanitized: ${sanitized}`);
    console.log(`PDF Safe:  ${isSafe ? '✓' : '✗'}`);
  });
}
