// Climate Narrative Engine
// Transforms raw climate metrics into story-first displays

import { ClimateData, VALENCE_LEVELS, ValenceLevel } from './climate-renderer';
import { buildPeriodLabel } from './voice/periodLabel';
import { synthesizeLabel } from './voice/labels';
import { assertApprovedLabel } from './voice/guard';
import { clampValue } from './balance/scale';

/**
 * Relationship context for negative constraints.
 * These values tell the generator what NOT to assume, not what to say.
 * The Math Brain graphics describe weather; Raven chatbot handles nuance.
 */
export interface RelationshipContext {
  /** Primary relationship type: PARTNER, FRIEND, or FAMILY */
  type?: 'PARTNER' | 'FRIEND' | 'FAMILY';
  /** For PARTNER: P1 (new), P2 (dating), P3 (situationship), P4 (casual), P5a (committed), P5b (non-romantic intimate) */
  intimacy_tier?: 'P1' | 'P2' | 'P3' | 'P4' | 'P5a' | 'P5b';
  /** Role within FAMILY: Parent, Offspring, Sibling, etc. */
  role?: string;
}

export interface ClimatePattern {
  name: string;
  icon: string;
  description: string;
  signature: string;
  advice: string;
}

export interface ClimateNarrative {
  headline: string;
  labelSubtitle?: string;
  voiceLabel: string;
  pattern: ClimatePattern;
  story: string;
  dimensions: {
    magnitude: {
      value: number;
      label: string;
      meaning: string;
    };
    valence: {
      value: number;
      label: string;
      meaning: string;
    };
    volatility: {
      value: number;
      label: string;
      meaning: string;
    };
  };
  paradox: {
    magnitude: { wb: string; abe: string };
    valence: { wb: string; abe: string };
  };
  activatedHouses?: string[];
}

// Climate patterns based on valence + volatility combinations
// NOTE: "advice" is now environmental description, not behavioral instruction
const CLIMATE_PATTERNS: Record<string, ClimatePattern> = {
  'favorable_wind': {
    name: 'Favorable Wind',
    icon: '🌊✨',
    description: 'High positive valence with low volatility',
    signature: 'Powerful, steady, constructive energy',
    advice: 'The field feels coherent and expansive. Action taken now tends to land cleanly. Stillness remains equally valid.'
  },
  'surge_scatter': {
    name: 'Surge Scatter',
    icon: '🌀⚡',
    description: 'High positive valence with high volatility',
    signature: 'Immense power geared toward change, but scattered and chaotic',
    advice: 'The field carries strong energy that shifts unpredictably. Some things may land; others may scatter.'
  },
  'diamond_pressure': {
    name: 'Diamond Pressure',
    icon: '💎⚔️',
    description: 'High negative valence with low volatility',
    signature: 'Intense, focused compression that transforms',
    advice: 'The field feels dense and inward-facing. Pressure shows up. What you do with it remains yours to choose.'
  },
  'storm_system': {
    name: 'Compression Field',
    icon: '⛈️🌪',
    description: 'High negative valence with high volatility',
    signature: 'Chaotic restrictive forces; breakdown before breakthrough',
    advice: 'The field feels turbulent and contracted. This weather pattern typically passes. No action required.'
  },
  'steady_flow': {
    name: 'Steady Flow',
    icon: '🌊🧘',
    description: 'Moderate positive valence with low volatility',
    signature: 'Reliable, gentle progress',
    advice: 'The field feels stable with a gentle forward lean. Things begun now tend to proceed without disruption.'
  },
  'choppy_waters': {
    name: 'Choppy Waters',
    icon: '🌊🔀',
    description: 'Moderate valence with high volatility',
    signature: 'Changing conditions requiring adaptation',
    advice: 'The field feels variable—conditions shift. What works one hour may not work the next. The weather, not you.'
  },
  'gentle_pressure': {
    name: 'Gentle Pressure',
    icon: '🌫⚖️',
    description: 'Moderate negative valence with low volatility',
    signature: 'Consistent challenge that strengthens',
    advice: 'The field has a steady inward pull. Friction may be present without being urgent.'
  },
  'equilibrium': {
    name: 'Equilibrium',
    icon: '⚖️🕯️',
    description: 'Neutral valence with low volatility',
    signature: 'Balanced, stable conditions',
    advice: 'The field feels quiet and balanced. Neither pushing nor pulling. A neutral canvas.'
  },
  'chaos_neutral': {
    name: 'Neutral Chaos',
    icon: '⚖️🌀',
    description: 'Neutral valence with high volatility',
    signature: 'Unpredictable but not directionally biased',
    advice: 'The field feels active but directionless. Unpredictability shows up as the weather pattern, not a problem to solve.'
  }
};

function getValenceLevel(valence: number): ValenceLevel {
  const clamped = Math.max(-5, Math.min(5, Math.round(valence)));
  return VALENCE_LEVELS.find(level => level.level === clamped) || VALENCE_LEVELS.find(level => level.level === 0) || VALENCE_LEVELS[5];
}

function getMagnitudeLabel(value: number): string {
  // Official magnitude scale from metric-labels.js
  if (value <= 0.5) return 'Trace';
  if (value <= 1.5) return 'Pulse';
  if (value <= 2.5) return 'Wave';
  if (value <= 3.5) return 'Surge';
  if (value <= 4.5) return 'Peak';
  return 'Threshold';
}

function getVolatilityLabel(value: number): string {
  if (value < 1) return 'Aligned Flow';
  if (value < 2) return 'Coherent';
  if (value < 3) return 'Variable';
  if (value < 4) return 'Turbulent';
  return 'Chaotic';
}

function determineClimatePattern(valence: number, volatility: number, magnitude: number): ClimatePattern {
  const absValence = Math.abs(valence);
  const isPositive = valence > 0;
  const isHighValence = absValence >= 3;
  const isModerateValence = absValence >= 1.5 && absValence < 3;
  const isHighVolatility = volatility >= 3;
  const isLowVolatility = volatility < 2;

  // High valence patterns
  if (isHighValence) {
    if (isPositive) {
      return isLowVolatility ? CLIMATE_PATTERNS.favorable_wind : CLIMATE_PATTERNS.surge_scatter;
    } else {
      return isLowVolatility ? CLIMATE_PATTERNS.diamond_pressure : CLIMATE_PATTERNS.storm_system;
    }
  }

  // Moderate valence patterns
  if (isModerateValence) {
    if (isPositive) {
      return isLowVolatility ? CLIMATE_PATTERNS.steady_flow : CLIMATE_PATTERNS.choppy_waters;
    } else {
      return isLowVolatility ? CLIMATE_PATTERNS.gentle_pressure : CLIMATE_PATTERNS.choppy_waters;
    }
  }

  // Near equilibrium
  if (absValence < 1) {
    return isHighVolatility ? CLIMATE_PATTERNS.chaos_neutral : CLIMATE_PATTERNS.equilibrium;
  }

  // Default to steady flow
  return CLIMATE_PATTERNS.steady_flow;
}

function formatRelationalPair(names?: [string, string]): string {
  if (names && names[0] && names[1]) {
    return `${names[0]} and ${names[1]}`;
  }
  if (names && names[0]) {
    return `${names[0]} and their counterpart`;
  }
  if (names && names[1]) {
    return `${names[1]} and their counterpart`;
  }
  return 'both people';
}

function generateRelationalStory(
  climate: ClimateData,
  valenceLevel: ValenceLevel,
  magnitudeLabel: string,
  isRangeSummary: boolean,
  names?: [string, string]
): string {
  const pairLabel = formatRelationalPair(names);
  const timeFrame = isRangeSummary
    ? "This period's relational field"
    : "Today's relational field";

  const magnitudeTone = climate.magnitude >= 4
    ? 'peak activation'
    : climate.magnitude >= 3
      ? 'noticeable charge'
      : climate.magnitude >= 2
        ? 'steady background hum'
        : 'soft, low-volume presence';

  const directionTone = valenceLevel.level <= -2
    ? 'an inward tilt'
    : valenceLevel.level >= 2
      ? 'an outward tilt'
      : 'a neutral tilt';

  // Environmental description only - no behavioral prescription
  const fieldDescription = valenceLevel.level <= -2
    ? 'The field tends toward conservation and inward focus.'
    : valenceLevel.level >= 2
      ? 'The field tends toward motion and exchange.'
      : 'The field sits near equilibrium, responsive to whoever moves first.';

  const sensitivityNote = climate.magnitude >= 3
    ? 'At this volume, small signals carry farther than usual.'
    : 'At this volume, there is room for recalibration without consequence.';

  return `${timeFrame} between ${pairLabel} carries ${magnitudeTone} (${magnitudeLabel.toLowerCase()}) with ${directionTone}. ${fieldDescription} ${sensitivityNote}`;
}

function generateStory(
  climate: ClimateData,
  pattern: ClimatePattern,
  isRangeSummary: boolean = false,
  mode: 'single' | 'relational' = 'single',
  names?: [string, string]
): string {
  const valenceLevel = getValenceLevel(climate.valence_bounded ?? climate.valence ?? 0);
  const magnitudeLabel = getMagnitudeLabel(climate.magnitude);
  const volatilityLabel = getVolatilityLabel(climate.volatility);

  if (mode === 'relational') {
    return generateRelationalStory(climate, valenceLevel, magnitudeLabel, isRangeSummary, names);
  }

  const intensityPhrase = climate.magnitude >= 4
    ? "chapter-defining intensity"
    : climate.magnitude >= 3
    ? "significant energy"
    : "moderate energy";

  const coherencePhrase = climate.volatility <= 1.5
    ? "stable and coherent"
    : climate.volatility >= 3.5
    ? "scattered and unpredictable"
    : "moderately variable";

  const directionPhrase = valenceLevel.level > 2
    ? `strongly ${valenceLevel.anchor.toLowerCase()}`
    : valenceLevel.level < -2
    ? `deeply ${valenceLevel.anchor.toLowerCase()}`
    : valenceLevel.level === 0
    ? "in perfect balance"
    : `gently ${valenceLevel.anchor.toLowerCase()}`;

  const timeFrame = isRangeSummary
    ? "This period's overall symbolic weather pattern shows"
    : "Today's symbolic weather shows";

  return `${timeFrame} ${intensityPhrase} flowing through ${coherencePhrase} channels with a ${directionPhrase} tilt. ${pattern.signature}.`;
}

function generateParadoxPoles(climate: ClimateData, isLatentField: boolean = false): { magnitude: { wb: string; abe: string }; valence: { wb: string; abe: string }} {
  const magnitudeLabel = getMagnitudeLabel(climate.magnitude);
  const valenceLevel = getValenceLevel(climate.valence_bounded ?? climate.valence ?? 0);

  // Magnitude poles - E-Prime compliant (no "is/are")
  let magnitudeWB = '';
  let magnitudeABE = '';

  if (isLatentField) {
    // Dormant/ex relationship - conditional phrasing
    if (climate.magnitude >= 4) {
      magnitudeWB = 'If this field were re-engaged, it would carry breakthrough-level archetypal charge.';
      magnitudeABE = 'Awareness Note: High symbolic charge may surface as pull toward re-engagement.';
    } else if (climate.magnitude >= 3) {
      magnitudeWB = 'If stirred, this dormant field would surface with solid energetic intensity.';
      magnitudeABE = 'Symbolic flare-ups may dramatize closure; this does not require action.';
    } else if (climate.magnitude >= 2) {
      magnitudeWB = 'Dormant field carries moderate potential if contact reopens.';
      magnitudeABE = 'Reactivation seems unlikely unless deliberately pursued.';
    } else {
      magnitudeWB = 'Minimal symbolic charge appears in this dormant field—largely settled.';
      magnitudeABE = 'May still surface in dreams or peripheral awareness; carries little active pull.';
    }
  } else {
    // Active relationship - E-Prime compliant
    if (climate.magnitude >= 4) {
      magnitudeWB = 'The conditions support significant action. Breakthrough-level energy appears available.';
      magnitudeABE = 'Intense structural pressure may show up. Capacity varies.';
    } else if (climate.magnitude >= 3) {
      magnitudeWB = 'Solid energy appears present. Things begun now tend to carry weight.';
      magnitudeABE = 'Attention may scatter across priorities. The field, not failure.';
    } else if (climate.magnitude >= 2) {
      magnitudeWB = 'Steady energy supports incremental progress.';
      magnitudeABE = 'Major shifts seem unlikely in this weather. Not wrongness.';
    } else {
      magnitudeWB = 'Low-volume field. Space for reflection exists.';
      magnitudeABE = 'Forcing action may meet resistance. Inaction remains valid.';
    }
  }

  // Valence poles - E-Prime compliant (no "is/are")
  let valenceWB = '';
  let valenceABE = '';

  if (isLatentField) {
    // Dormant/ex relationship - conditional phrasing
    if (valenceLevel.level >= 3) {
      valenceWB = 'Liberation-tilted energy; contact would surface themes of freedom and independence.';
      valenceABE = 'Symbolic harmony may romanticize what completed as a cycle.';
    } else if (valenceLevel.level >= 1) {
      valenceWB = 'Gentle supportive undertones; if re-engaged, may feel collaborative.';
      valenceABE = 'Ease could mask patterns that led to original separation.';
    } else if (valenceLevel.level <= -3) {
      valenceWB = 'Compression-tilted energy; if stirred, would highlight restriction themes.';
      valenceABE = 'Even dormant, friction patterns may surface in imagination.';
    } else if (valenceLevel.level <= -1) {
      valenceWB = 'Moderate friction signals; reactivation would resurface familiar challenges.';
      valenceABE = 'Symbolic tension does not require resolution through action.';
    } else {
      valenceWB = 'Neutral dormant field—neither pulling toward reconnection nor pushing away.';
      valenceABE = 'Balanced energy may reflect that the story completed.';
    }
  } else {
    // Active relationship - E-Prime compliant
    if (valenceLevel.level >= 3) {
      valenceWB = 'Harmonious energy appears present. Collaborative solutions tend to emerge.';
      valenceABE = 'Ease may bypass necessary conversations. Information, not instruction.';
    } else if (valenceLevel.level >= 1) {
      valenceWB = 'Gentle supportive flow. Things feel easier.';
      valenceABE = 'Comfort may reduce urgency for growth-edge work. The weather.';
    } else if (valenceLevel.level <= -3) {
      valenceWB = 'Intense compression appears present. Transformation energy seems available.';
      valenceABE = 'Structural pressure may trigger resistance. Normal.';
    } else if (valenceLevel.level <= -1) {
      valenceWB = 'Moderate challenge appears present. Friction surfaces.';
      valenceABE = 'Friction may accumulate if unacknowledged. Acknowledgment does not require action.';
    } else {
      valenceWB = 'Balanced conditions. Clear thinking available.';
      valenceABE = 'Lack of directional pull may feel stagnant. The weather pattern.';
    }
  }

  return {
    magnitude: { wb: magnitudeWB, abe: magnitudeABE },
    valence: { wb: valenceWB, abe: valenceABE }
  };
}

function generateRelationalGuidance(
  climate: ClimateData,
  valenceLevel: ValenceLevel,
  names?: [string, string],
  relationshipContext?: RelationshipContext
): string {
  const pairLabel = formatRelationalPair(names);
  
  /**
   * NEGATIVE CONSTRAINTS ARCHITECTURE
   * ─────────────────────────────────
   * The Math Brain graphics describe weather ONLY. Relationship context acts
   * as guardrails (what NOT to assume), not a steering wheel (what to say).
   * 
   * Key principle: We REMOVE inappropriate assumptions based on relationship
   * type rather than ADD scripts for specific relationships. Raven chatbot
   * handles full nuance; these cards stay generic and safe.
   * 
   * Constraints by relationship type:
   * - FAMILY (high obligation): Don't say "if you skip contact, nothing breaks"
   * - FRIEND (low obligation): Don't assume frequent contact - stay generic
   * - PARTNER/P3 (situationship): Don't say "treat contact as optional" (matches their baseline)
   * - PARTNER/P5a/P5b (committed): Don't give relationship work advice
   */

  // Default: most guarded phrasing (safe for any relationship)
  let contactPhrase = 'The field registers between these charts.';
  let actionPhrase = 'How you engage—or whether you engage—remains yours to determine.';
  
  // Only add "contact optional" language if we're NOT in a high-obligation or situationship context
  // FAMILY: High obligation - don't imply skipping contact is fine
  // P3 (situationship): Already treating contact as optional - don't state the obvious
  const canDescribeContactOptional = 
    !relationshipContext?.type || // No context = stay generic
    (relationshipContext.type === 'FRIEND') || // Friends: contact genuinely optional
    (relationshipContext.type === 'PARTNER' && relationshipContext.intimacy_tier === 'P4'); // P4 casual: low stakes
  
  // Don't give "momentum" or "shared action" advice to committed partners
  // This could come across as "work on your relationship today" which is prescriptive
  const canDescribeMomentum =
    !relationshipContext?.type ||
    relationshipContext.type !== 'PARTNER' ||
    !['P5a', 'P5b'].includes(relationshipContext.intimacy_tier || '');

  // Don't tell FAMILY about "subtlety" in communication - could sound like walking on eggshells
  const canDescribeSensitivity =
    !relationshipContext?.type ||
    relationshipContext.type !== 'FAMILY';

  // Build field tendency based on valence, filtered by negative constraints
  if (valenceLevel.level <= -2) {
    contactPhrase = 'The field feels sensitive today.';
    if (canDescribeSensitivity) {
      contactPhrase += ' If contact happens, subtlety may land more easily than intensity.';
    }
    // DON'T add "if contact doesn't happen, nothing breaks" for high-obligation or situationship
    if (canDescribeContactOptional) {
      contactPhrase += ' If contact doesn\'t happen, nothing breaks.';
    }
  } else if (valenceLevel.level >= 2) {
    contactPhrase = 'The field carries momentum today.';
    // DON'T tell committed partners "shared action tends to flow" (prescriptive)
    if (canDescribeMomentum) {
      contactPhrase += ' Shared action tends to flow; solitary action also works.';
    }
  } else {
    contactPhrase = 'The field sits near equilibrium.';
    // Generic enough for any relationship
  }

  // Sensitivity description based on magnitude
  let sensitivityNote = '';
  if (climate.magnitude >= 4) {
    sensitivityNote = 'At this volume, signals carry.';
  } else if (climate.magnitude >= 3) {
    sensitivityNote = 'At this volume, small signals may register more than usual.';
  } else {
    sensitivityNote = 'At this volume, room exists for imprecision without consequence.';
  }

  return `The relational field between ${pairLabel}: ${contactPhrase} ${sensitivityNote} ${actionPhrase}`;
}

export function generateClimateNarrative(
  climate: ClimateData,
  activatedHouses?: string[],
  isRangeSummary: boolean = false,
  isLatentField: boolean = false,
  mode: 'single' | 'relational' = 'single',
  names?: [string, string],
  relationshipContext?: RelationshipContext
): ClimateNarrative {
  const valence = climate.valence_bounded ?? climate.valence ?? 0;
  const pattern = determineClimatePattern(valence, climate.volatility, climate.magnitude);
  const story = generateStory(climate, pattern, isRangeSummary, mode, names);
  const paradox = generateParadoxPoles(climate, isLatentField);
  const valenceLevel = getValenceLevel(valence);
  const clampedVolatility = clampValue(climate.volatility ?? 0, 0, 5);
  const coherenceForLabel = +(5 - clampedVolatility).toFixed(2);
  const periodLabel = buildPeriodLabel({
    magnitude: climate.magnitude,
    bias: valence,
    coherence: coherenceForLabel,
  });

  const voiceLabel = assertApprovedLabel(
    synthesizeLabel(
      climate.magnitude,
      valence,
      coherenceForLabel
    )
  );

  const headline = periodLabel.title;
  const relationalAdvice = mode === 'relational'
    ? generateRelationalGuidance(climate, valenceLevel, names, relationshipContext)
    : undefined;
  const patternForMode = relationalAdvice
    ? { ...pattern, advice: relationalAdvice }
    : pattern;

  return {
    headline,
    labelSubtitle: periodLabel.subtitle,
    voiceLabel,
    pattern: patternForMode,
    story,
    dimensions: {
      magnitude: {
        value: climate.magnitude,
        label: getMagnitudeLabel(climate.magnitude),
        meaning: climate.magnitude >= 4 ? 'Chapter-defining energy demands attention' :
                climate.magnitude >= 3 ? 'Significant energy present for meaningful action' :
                climate.magnitude >= 2 ? 'Moderate energy for steady progress' :
                'Background energy; perfect for reflection and planning'
      },
      valence: {
        value: valence,
        label: valenceLevel.anchor,
        meaning: valenceLevel.description
      },
      volatility: {
        value: climate.volatility,
        label: getVolatilityLabel(climate.volatility),
        meaning: climate.volatility >= 4 ? 'Highly unpredictable; stay flexible' :
                climate.volatility >= 3 ? 'Variable conditions require adaptation' :
                climate.volatility >= 2 ? 'Some fluctuation but generally stable' :
                'Coherent and steady energy flow'
      },
    },
    paradox,
    activatedHouses
  };
}
