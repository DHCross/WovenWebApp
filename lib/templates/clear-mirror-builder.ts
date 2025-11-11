/**
 * CLEAR MIRROR BUILDER
 * 
 * ARCHITECTURE NOTE:
 * This builder provides TEMPLATE STRUCTURES that Poetic Brain (Raven Calder) will populate.
 * 
 * Pipeline:
 * 1. Math Brain → Calculates geometry, aspects, orbs, magnitudes
 * 2. Seismograph → Classifies WB/ABE/OSR boundaries
 * 3. [THIS FILE] → Structures the data for Raven
 * 4. Poetic Brain (Raven Calder) → Translates geometry into lived-language hypotheses
 * 
 * What Math Brain provides:
 * - Coordinates, vectors, orbs (e.g., "Venus Taurus opp Saturn Scorpio, 4°09'")
 * - Magnitude/Valence/Volatility scores
 * - Aspect matrices (for relational: A→B overlays)
 * - WB/ABE/OSR classifications per aspect
 * 
 * What Raven Calder generates (not pre-filled here):
 * - E-Prime narrative text ("The pattern tends to...")
 * - Core Insights (compressed from high-magnitude patterns, Mag ≥ 3.0)
 * - Polarity Cards (from identified tension patterns)
 * - Mirror Voice reflections
 * - Directional attribution in relational reads ("When A does X, B feels Y")
 * 
 * Current implementation: Template placeholders
 * Future: Raven API integration for actual language generation
 */

import type { ClearMirrorData } from './clear-mirror-template';

interface ChartData {
  person_a: {
    name?: string;
    details?: any;
    chart?: any;
    aspects?: any[];
  };
  person_b?: {
    name?: string;
    details?: any;
    chart?: any;
    aspects?: any[];
  };
  report?: any;
  unified_output?: any;
}

/**
 * Build Clear Mirror data structure from chart result
 */
export function buildClearMirrorData(result: ChartData): ClearMirrorData {
  const personName = result.person_a?.name || result.person_a?.details?.name || 'Individual';
  const chartType: 'solo' | 'relational' = result.person_b ? 'relational' : 'solo';
  const date = new Date().toISOString().split('T')[0];

  // Extract chart geometry for footnoting
  const sun = result.person_a?.chart?.planets?.find((p: any) => p.name === 'Sun');
  const moon = result.person_a?.chart?.planets?.find((p: any) => p.name === 'Moon');
  const ascendant = result.person_a?.chart?.angles?.ASC;
  const mc = result.person_a?.chart?.angles?.MC;
  
  // Build frontstage with inline footnotes
  const frontstageText = buildFrontstageText(result);
  const frontstageFootnotes = extractFrontstageFootnotes(result);

  // Build other sections
  const coreInsights = buildCoreInsights(result);
  const polarityCards = buildPolarityCards(result);
  const auditLayer = buildAuditLayer(result);

  return {
    personName,
    date,
    chartType,
    preface: buildPreface(result),
    frontstage: {
      text: frontstageText,
      footnotes: frontstageFootnotes,
    },
    resonantSummary: {
      text: buildResonantSummary(result),
      footnotes: [],
    },
    coreInsights,
    personalityBlueprint: {
      text: buildPersonalityBlueprint(result),
      footnotes: [],
    },
    polarityCards,
    integration: {
      text: buildIntegration(result),
      footnotes: [],
    },
    innerConstitution: {
      text: buildInnerConstitution(result),
      footnotes: [],
    },
    mirrorVoice: {
      text: buildMirrorVoice(result),
      footnotes: [],
    },
    auditLayer,
  };
}

/**
 * Build preface section (optional context)
 */
function buildPreface(result: ChartData): string | undefined {
  // Optional: Add notes about chart rectification, AM/PM clarification, etc.
  return undefined;
}

/**
 * Build Frontstage text with inline footnote markers
 */
function buildFrontstageText(result: ChartData): string {
  const sun = result.person_a?.chart?.planets?.find((p: any) => p.name === 'Sun');
  const moon = result.person_a?.chart?.planets?.find((p: any) => p.name === 'Moon');
  
  // E-Prime template with superscript footnote markers
  const lines = [
    'The geometry tends to evoke drive paired with directness. A sense of "let\'s do this" frequently launches action once purpose crystallizes.¹ Beneath that impulse runs a need to grasp why something matters. When drive meets depth, the pattern suggests alignment with core values.²',
    '',
    '**Tension line:** The same spark that propels forward triggers immediate review in the symbolic loop.',
    '',
    'The pattern indicates learning through doing and reflection through pausing. Energy unfolds in cycles—strong bursts of drive followed by quieter regrouping.³ Acceleration follows clarified purpose; examination follows acceleration. This rhythm corresponds to accuracy, not indecision.',
    '',
    'In daily contexts the geometry projects calm, structured, and curious presentation. Systems that reveal the big picture support optimal function.⁴ Truth takes precedence over harmony. In work or relationships honesty precedes comfort; depth precedes surface agreement. Focus leans toward uncovering hidden patterns—motives, emotional truths—and translating them into practical clarity.',
    '',
    'Emotionally the pattern blends empathy with directness. Deep listening precedes naming the heart of an issue without cruelty.⁵ Warmth combines with precision; others receive help articulating unphrased feelings. Under stress overanalysis or impact-doubt emerges; in balance steadiness, inventiveness, and quiet transformation prevail.',
    '',
    'Overall the geometry corresponds to motion guided by conscience—instinct to act paired with need to understand. Systems emerge that render emotional life visible, using structure as lens for truth, not control.⁶',
  ];

  return lines.join('\n');
}

/**
 * Extract symbolic footnotes for Frontstage
 */
function extractFrontstageFootnotes(result: ChartData): Array<{ number: number; content: string }> {
  const sun = result.person_a?.chart?.planets?.find((p: any) => p.name === 'Sun');
  const moon = result.person_a?.chart?.planets?.find((p: any) => p.name === 'Moon');
  const ascendant = result.person_a?.chart?.angles?.ASC;
  
  return [
    { number: 1, content: `[e.g., ${sun?.sign || 'Sun'} in ${sun?.house || 'house'} — experiential learning; tangible value.]` },
    { number: 2, content: `[e.g., ${result.person_a?.chart?.angles?.MC?.sign || 'MC'} — depth-seeking purpose.]` },
    { number: 3, content: `[e.g., Mars in ${moon?.sign || 'sign'} ↔ Moon in ${moon?.sign || 'sign'} — fire cycles of burst/regroup.]` },
    { number: 4, content: `[e.g., ${ascendant?.sign || 'Ascendant'} ASC — systemic composure.]` },
    { number: 5, content: `[e.g., ${moon?.sign || 'Moon'} Moon trine Mars — warm precision.]` },
    { number: 6, content: `[e.g., Saturn sextile Neptune — structure serves insight.]` },
  ];
}

/**
 * Build Resonant Summary
 */
function buildResonantSummary(result: ChartData): string {
  return 'The chart geometry reveals a pattern of thoughtful acceleration—movement that pauses to gather truth before proceeding. Conscience guides impulse; structure clarifies emotion. You tend to operate as a translator between inner complexity and outer clarity, using systems to honor depth rather than flatten it.';
}

/**
 * Build Core Insights section
 */
function buildCoreInsights(result: ChartData): ClearMirrorData['coreInsights'] {
  // Extract top 3-5 tightest aspects or highest-magnitude patterns
  const aspects = result.person_a?.aspects || [];
  const topAspects = aspects
    .slice(0, 5)
    .map((asp: any, idx: number) => ({
      pattern: `${asp.planet1?.name || 'Planet'} ${asp.aspect || 'aspect'} ${asp.planet2?.name || 'Planet'}`,
      geometry: `Orb: ${asp.orb?.toFixed(2) || 'N/A'}° — ${asp.interpretation || 'Dynamic interaction'}`,
      testMarker: `Notice when this tension/synergy appears in decisions or relationships`,
    }));

  return {
    insights: topAspects.length > 0 ? topAspects : [
      {
        pattern: 'Primary Drive Pattern',
        geometry: 'Sun-Mars aspect — initiative meets purpose',
        testMarker: 'Track moments when action precedes or follows clarity',
      },
    ],
  };
}

/**
 * Build Polarity Cards
 */
function buildPolarityCards(result: ChartData): ClearMirrorData['polarityCards'] {
  return [
    {
      title: 'The Start and the Steady',
      text: 'One force wants to launch; the other wants to test the ground first. When you notice which side leads—immediate action or careful preparation—you participate in the pattern rather than judge it.',
      footnote: '[Sun/Mercury in fire sign ↔ Saturn in earth sign — ignition paired with review.]',
    },
    {
      title: 'The Honest Mirror',
      text: 'Truth-telling versus social smoothness. You tend to value precision in language even when it creates tension. The pattern suggests honesty precedes comfort in your relational design.',
      footnote: '[Mercury-Pluto aspect or Scorpio emphasis — depth communication.]',
    },
    {
      title: 'The Cost Check',
      text: 'Before committing energy, you assess whether the return matches the investment. This appears as discernment, not stinginess—a habit of honoring finite resources.',
      footnote: '[Saturn aspects or Capricorn placements — resource consciousness.]',
    },
    {
      title: 'The Rest Phase',
      text: 'After intensity you require restoration. The pattern indicates that downtime functions as recalibration, not avoidance. Silence rebuilds clarity.',
      footnote: '[Water sign emphasis or 12th house activity — regenerative retreat.]',
    },
  ];
}

/**
 * Build Personality Blueprint
 */
function buildPersonalityBlueprint(result: ChartData): string {
  return 'The geometry suggests a personality that operates through deliberate momentum. Acceleration follows clarified purpose; review follows action. You tend to value precision in communication and structure in emotional processing. Systems reveal truth; truth guides movement. The pattern indicates learning through experience paired with reflection through pause.';
}

/**
 * Build Integration section
 */
function buildIntegration(result: ChartData): string {
  return 'Integration happens when the pattern\'s opposing forces work in sequence rather than conflict. Action → Reflection → Recalibration → Action. Each phase serves the next. When stress appears, notice whether you skip a phase (acting without reflection, or reflecting without acting). Restoring the rhythm restores function.';
}

/**
 * Build Inner Constitution
 */
function buildInnerConstitution(result: ChartData): string {
  return 'The constitutional geometry reveals archetypal forces operating beneath personality. These forces remain consistent across contexts—the inner parliament that debates each decision. Understanding their voices helps you navigate choice without suppressing complexity. Structure emerges from honoring all parts, not dominating with one.';
}

/**
 * Build Mirror Voice
 */
function buildMirrorVoice(result: ChartData): string {
  return 'As you read this reflection, notice what lands and what bounces off. The geometry describes possibility, not fate. Your actual life supplies the testing ground. Mark what resonates (WB), what partly fits (ABE), and what contradicts experience (OSR). Those marks reveal where the symbolic language meets lived truth—and where it misses. That calibration performs the real work of the mirror.';
}

/**
 * Build Audit Layer (developer reference tables)
 */
function buildAuditLayer(result: ChartData): ClearMirrorData['auditLayer'] {
  const aspects = result.person_a?.aspects || [];
  
  return {
    frontstage: [
      {
        observed: 'Deliberate momentum pattern',
        geometry: 'Sun-Saturn aspect (structure guides action)',
        testMarker: 'Notice pause before major decisions',
      },
      {
        observed: 'Precision in communication',
        geometry: 'Mercury-Pluto aspect (depth language)',
        testMarker: 'Track truthfulness vs. social ease',
      },
    ],
    coreInsights: aspects.slice(0, 3).map((asp: any) => ({
      pattern: `${asp.planet1?.name || 'P1'} ${asp.aspect || 'asp'} ${asp.planet2?.name || 'P2'}`,
      geometry: `Orb ${asp.orb?.toFixed(2) || 'N/A'}° — ${asp.type || 'aspect'}`,
      testMarker: 'Observe in daily context',
    })),
    polarityCards: [
      {
        polarity: 'Action/Reflection',
        geometry: 'Fire-Earth polarity across chart',
        testMarker: 'Notice which leads in decisions',
      },
    ],
  };
}

export default buildClearMirrorData;
