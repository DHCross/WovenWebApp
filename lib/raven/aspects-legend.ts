/**
 * Astrological Aspects Legend with Directional Bias Weights
 * 
 * Translates geometric symbols (aspects) into the Woven Map's approved lexicon:
 * Restrictive Force (friction, challenge) vs Harmonic Force (flow, integration).
 * 
 * Supports falsifiability by making aspect weights and directional biases explicit
 * and traceable back to the seismograph calculations.
 */

/**
 * Aspect geometry and its symbolic weight
 */
export interface AspectDefinition {
  name: string;
  shorthand: string;
  angle: number;              // Degrees (e.g., 90 for square)
  orb: number;                // Orb range for detection
  force: 'restrictive' | 'harmonic' | 'neutral';
  directionalBias: number;    // -5 to +5 scale used in seismograph
  weight: number;             // Magnitude weight (0-1 scale)
  symbol: string;             // Unicode or ASCII symbol
  theme: string;              // Brief theme description
  keywords: string[];
}

/**
 * The seven core aspects used in Woven Map analysis
 * Structured for Magnitude and Directional Bias calculation
 */
export const ASPECTS_LEGEND: Record<string, AspectDefinition> = {
  conjunction: {
    name: 'Conjunction',
    shorthand: '☌',
    angle: 0,
    orb: 8,
    force: 'neutral',
    directionalBias: 0,      // Neutral—depends on planetary pairing
    weight: 0.7,             // Moderate presence
    symbol: '☌',
    theme: 'Merging, blending, unified intent',
    keywords: ['union', 'intensification', 'overlap', 'presence'],
  },

  sextile: {
    name: 'Sextile',
    shorthand: '⌛',
    angle: 60,
    orb: 6,
    force: 'harmonic',
    directionalBias: +2,      // Supportive force toward positive valence
    weight: 0.4,             // Lighter supportive touch
    symbol: '⌛',
    theme: 'Ease, opportunity, natural flow',
    keywords: ['support', 'opportunity', 'ease', 'integration'],
  },

  square: {
    name: 'Square',
    shorthand: '□',
    angle: 90,
    orb: 8,
    force: 'restrictive',
    directionalBias: -2.5,    // Restrictive force toward negative valence
    weight: 0.8,             // Strong tension
    symbol: '□',
    theme: 'Friction, friction, productive tension',
    keywords: ['challenge', 'friction', 'pressure', 'growth'],
  },

  trine: {
    name: 'Trine',
    shorthand: '△',
    angle: 120,
    orb: 8,
    force: 'harmonic',
    directionalBias: +3,      // Strong supportive force
    weight: 0.6,             // Significant harmonic presence
    symbol: '△',
    theme: 'Flow, harmony, natural grace',
    keywords: ['harmony', 'talent', 'gift', 'ease'],
  },

  opposition: {
    name: 'Opposition',
    shorthand: '☍',
    angle: 180,
    orb: 8,
    force: 'restrictive',
    directionalBias: -3,      // Strong restrictive force
    weight: 0.9,             // Maximum tension
    symbol: '☍',
    theme: 'Polarity, awareness through reflection',
    keywords: ['tension', 'awareness', 'mirror', 'polarity'],
  },

  quincunx: {
    name: 'Quincunx',
    shorthand: '⚻',
    angle: 150,
    orb: 6,
    force: 'restrictive',
    directionalBias: -1,      // Slight restrictive adjustment
    weight: 0.5,             // Moderate awkwardness
    symbol: '⚻',
    theme: 'Adjustment required, recalibration',
    keywords: ['awkwardness', 'adjustment', 'refinement', 'correction'],
  },

  semisquare: {
    name: 'Semi-Square',
    shorthand: '∠',
    angle: 45,
    orb: 4,
    force: 'restrictive',
    directionalBias: -1.5,    // Mild restrictive irritation
    weight: 0.3,             // Minor friction
    symbol: '∠',
    theme: 'Minor friction, subtle irritation',
    keywords: ['irritation', 'minor tension', 'nudge'],
  },
};

/**
 * Get aspect by name
 */
export function getAspectDefinition(aspectName: string): AspectDefinition | null {
  return ASPECTS_LEGEND[aspectName.toLowerCase()] || null;
}

/**
 * Get aspect by angle (within orb)
 */
export function getAspectByAngle(angle: number): AspectDefinition | null {
  const normalizedAngle = ((angle % 360) + 360) % 360;

  for (const aspect of Object.values(ASPECTS_LEGEND)) {
    const diff = Math.abs(normalizedAngle - aspect.angle);
    const adjustedDiff = Math.min(diff, 360 - diff);
    if (adjustedDiff <= aspect.orb) {
      return aspect;
    }
  }

  return null;
}

/**
 * Generate markdown legend table
 */
export function generateAspectsMarkdownTable(): string {
  let table = '| Aspect | Angle | Orb | Force | Bias | Weight | Theme |\n';
  table += '|--------|-------|-----|-------|------|--------|-------|\n';

  for (const aspect of Object.values(ASPECTS_LEGEND)) {
    const biasSign = aspect.directionalBias > 0 ? '+' : '';
    const forceEmoji = aspect.force === 'harmonic' ? '↑' : aspect.force === 'restrictive' ? '↓' : '◆';
    table += `| **${aspect.shorthand}** ${aspect.name} | ${aspect.angle}° | ±${aspect.orb}° | ${forceEmoji} ${aspect.force} | ${biasSign}${aspect.directionalBias} | ${(aspect.weight * 100).toFixed(0)}% | ${aspect.theme} |\n`;
  }

  return table;
}

/**
 * Generate text legend
 */
export function generateAspectsTextLegend(): string {
  let text = 'ASTROLOGICAL ASPECTS LEGEND\n';
  text += '════════════════════════════════════════════\n\n';
  text += 'RESTRICTIVE FORCE (Challenge & Friction)\n';
  text += '────────────────────────────────────────────\n';

  const restrictive = Object.values(ASPECTS_LEGEND).filter(a => a.force === 'restrictive');
  restrictive.forEach(aspect => {
    text += `${aspect.shorthand} ${aspect.name.padEnd(15)} | ${aspect.angle}° | Bias: ${aspect.directionalBias > 0 ? '+' : ''}${aspect.directionalBias}\n`;
    text += `   Theme: ${aspect.theme}\n`;
    text += `   Keywords: ${aspect.keywords.join(', ')}\n\n`;
  });

  text += '\nHARMONIC FORCE (Flow & Integration)\n';
  text += '────────────────────────────────────────────\n';

  const harmonic = Object.values(ASPECTS_LEGEND).filter(a => a.force === 'harmonic');
  harmonic.forEach(aspect => {
    text += `${aspect.shorthand} ${aspect.name.padEnd(15)} | ${aspect.angle}° | Bias: ${aspect.directionalBias > 0 ? '+' : ''}${aspect.directionalBias}\n`;
    text += `   Theme: ${aspect.theme}\n`;
    text += `   Keywords: ${aspect.keywords.join(', ')}\n\n`;
  });

  return text;
}

/**
 * Calculate combined directional bias from multiple aspects
 * Used by seismograph for Valence scoring
 */
export function calculateAspectBias(aspects: Array<{ name: string; orb: number }>): number {
  if (aspects.length === 0) return 0;

  const totalBias = aspects.reduce((sum, asp) => {
    const def = getAspectDefinition(asp.name);
    if (!def) return sum;

    // Apply orb-based dampening (tighter orb = stronger weight)
    const orbWeight = 1 - asp.orb / def.orb;
    return sum + def.directionalBias * orbWeight;
  }, 0);

  // Normalize to -5 to +5 range
  return Math.max(-5, Math.min(5, totalBias));
}

/**
 * Determine if aspect is tensile (challenging) or harmonic (supportive)
 */
export function isRestrictiveAspect(aspectName: string): boolean {
  const aspect = getAspectDefinition(aspectName);
  return aspect ? aspect.force === 'restrictive' : false;
}

export function isHarmonicAspect(aspectName: string): boolean {
  const aspect = getAspectDefinition(aspectName);
  return aspect ? aspect.force === 'harmonic' : false;
}

/**
 * Get all aspects sorted by force type
 */
export function getAspectsByForce(force: 'restrictive' | 'harmonic' | 'neutral'): AspectDefinition[] {
  return Object.values(ASPECTS_LEGEND).filter(a => a.force === force);
}

/**
 * Get quick list for UI dropdown/menu
 */
export function getAspectsQuickList(): Array<{ shorthand: string; name: string; force: string }> {
  return Object.values(ASPECTS_LEGEND).map(a => ({
    shorthand: a.shorthand,
    name: a.name,
    force: a.force,
  }));
}

/**
 * Comprehensive aspect interpretation context
 */
export function getAspectContext(aspectName: string, planet1: string, planet2: string): string {
  const aspect = getAspectDefinition(aspectName);
  if (!aspect) return '';

  const p1 = planet1.toLowerCase();
  const p2 = planet2.toLowerCase();

  // Examples for common planetary aspects
  if (aspect.force === 'harmonic') {
    if (/sun|moon/.test(p1) && /venus|jupiter/.test(p2)) {
      return `${aspect.name}: Natural rapport and ease between your inner nature and values`;
    }
  }

  if (aspect.force === 'restrictive') {
    if (/mars/.test(p1) && /saturn/.test(p2)) {
      return `${aspect.name}: Friction between your drive and your discipline—creative tension requiring integration`;
    }
    if (/moon/.test(p1) && /pluto/.test(p2)) {
      return `${aspect.name}: Deep emotional intensity; transformation required through awareness`;
    }
  }

  // Generic fallback
  return `${aspect.name}: ${aspect.theme} between ${planet1} and ${planet2}`;
}
