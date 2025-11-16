// Climate Narrative Engine
// Transforms raw climate metrics into story-first displays

import { ClimateData, VALENCE_LEVELS, ValenceLevel } from './climate-renderer';
import { buildPeriodLabel } from './voice/periodLabel';
import { synthesizeLabel } from './voice/labels';
import { assertApprovedLabel } from './voice/guard';
import { clampValue } from './balance/scale';

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
const CLIMATE_PATTERNS: Record<string, ClimatePattern> = {
  'favorable_wind': {
    name: 'Favorable Wind',
    icon: '🌊✨',
    description: 'High positive valence with low volatility',
    signature: 'Powerful, steady, constructive energy',
    advice: 'Use this coherent energy for significant progress. The stability allows for bold moves.'
  },
  'surge_scatter': {
    name: 'Surge Scatter',
    icon: '🌀⚡',
    description: 'High positive valence with high volatility',
    signature: 'Immense power geared toward change, but scattered and chaotic',
    advice: 'Harness the energy but be prepared for unpredictability. Focus on what you can control.'
  },
  'diamond_pressure': {
    name: 'Diamond Pressure',
    icon: '💎⚔️',
    description: 'High negative valence with low volatility',
    signature: 'Intense, focused compression that transforms',
    advice: 'This pressure is creating something valuable. Stay present and work with the process.'
  },
  'storm_system': {
    name: 'Compression Field',
    icon: '⛈️🌪',
    description: 'High negative valence with high volatility',
    signature: 'Chaotic restrictive forces; breakdown before breakthrough',
    advice: 'Focus on survival and protection. This is temporary but intense clearing weather.'
  },
  'steady_flow': {
    name: 'Steady Flow',
    icon: '🌊🧘',
    description: 'Moderate positive valence with low volatility',
    signature: 'Reliable, gentle progress',
    advice: 'Build on this stable foundation. Small, consistent actions will compound.'
  },
  'choppy_waters': {
    name: 'Choppy Waters',
    icon: '🌊🔀',
    description: 'Moderate valence with high volatility',
    signature: 'Changing conditions requiring adaptation',
    advice: 'Stay flexible and responsive. Ride the waves rather than fighting them.'
  },
  'gentle_pressure': {
    name: 'Gentle Pressure',
    icon: '🌫⚖️',
    description: 'Moderate negative valence with low volatility',
    signature: 'Consistent challenge that strengthens',
    advice: 'Use this steady resistance as training. Small improvements will accumulate.'
  },
  'equilibrium': {
    name: 'Equilibrium',
    icon: '⚖️🕯️',
    description: 'Neutral valence with low volatility',
    signature: 'Balanced, stable conditions',
    advice: 'Perfect time for reflection and planning. The calm allows for clear thinking.'
  },
  'chaos_neutral': {
    name: 'Neutral Chaos',
    icon: '⚖️🌀',
    description: 'Neutral valence with high volatility',
    signature: 'Unpredictable but not directionally biased',
    advice: 'Stay centered in the chaos. Opportunities and challenges are equally likely.'
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
    ? 'peak compression'
    : climate.magnitude >= 3
      ? 'noticeable pressure'
      : climate.magnitude >= 2
        ? 'steady background hum'
        : 'soft, low-volume charge';

  const directionTone = valenceLevel.level <= -2
    ? 'an inward tilt'
    : valenceLevel.level >= 2
      ? 'an outward tilt'
      : 'a neutral tilt';

  const nervousSystemLine = valenceLevel.level <= -2
    ? 'Each nervous system is conserving energy internally, so subtle, low-demand contact lands best.'
    : valenceLevel.level >= 2
      ? 'Both nervous systems prefer motion and exchange, so collaborative gestures feel natural.'
      : 'Either person can steer tone with gentle intent because the field sits close to equilibrium.';

  const echoSensitivity = climate.magnitude >= 3
    ? 'Small misreads echo louder than usual, so clarity matters more than volume.'
    : 'The stakes are moderate, allowing room for softness and calibration.';

  return `${timeFrame} between ${pairLabel} carries ${magnitudeTone} (${magnitudeLabel.toLowerCase()}) with ${directionTone}. ${nervousSystemLine} ${echoSensitivity}`;
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

  // Magnitude poles
  let magnitudeWB = '';
  let magnitudeABE = '';

  if (isLatentField) {
    // Dormant/ex relationship - conditional phrasing
    if (climate.magnitude >= 4) {
      magnitudeWB = 'If this field were re-engaged, it would carry breakthrough-level archetypal charge';
      magnitudeABE = 'Awareness Note: High symbolic charge may tempt re-engagement without clear boundaries';
    } else if (climate.magnitude >= 3) {
      magnitudeWB = 'If stirred, this dormant field would surface with solid energetic intensity';
      magnitudeABE = 'Notice if symbolic flare-ups feel like invitations for action — they may simply dramatize closure';
    } else if (climate.magnitude >= 2) {
      magnitudeWB = 'Dormant field carries moderate potential if contact reopens';
      magnitudeABE = 'Low enough charge that reactivation is unlikely unless deliberately pursued';
    } else {
      magnitudeWB = 'Minimal symbolic charge in this dormant field — largely settled';
      magnitudeABE = 'May still surface in dreams or peripheral awareness but carries little active pull';
    }
  } else {
    // Active relationship - standard phrasing
    if (climate.magnitude >= 4) {
      magnitudeWB = 'Perfect conditions for breakthrough actions and significant decisions';
      magnitudeABE = 'Risk of overwhelming your system or taking on too much at once';
    } else if (climate.magnitude >= 3) {
      magnitudeWB = 'Solid energy for making meaningful progress on important projects';
      magnitudeABE = 'May scatter attention across too many priorities';
    } else if (climate.magnitude >= 2) {
      magnitudeWB = 'Steady energy for consistent, incremental progress';
      magnitudeABE = 'Might feel underwhelming if expecting major shifts';
    } else {
      magnitudeWB = 'Perfect for reflection, planning, and gentle beginnings';
      magnitudeABE = 'May feel sluggish or unproductive if forcing action';
    }
  }

  // Valence poles
  let valenceWB = '';
  let valenceABE = '';

  if (isLatentField) {
    // Dormant/ex relationship - conditional phrasing
    if (valenceLevel.level >= 3) {
      valenceWB = 'Liberation-tilted energy suggests renewed contact would surface themes of freedom and independence';
      valenceABE = 'Symbolic harmony may romanticize what was actually a completed cycle';
    } else if (valenceLevel.level >= 1) {
      valenceWB = 'Gentle supportive undertones in the dormant field — if re-engaged, may feel collaborative';
      valenceABE = 'Ease could mask unresolved patterns that led to the original separation';
    } else if (valenceLevel.level <= -3) {
      valenceWB = 'Compression-tilted energy signals that this field, if stirred, would highlight restriction themes';
      valenceABE = 'Even dormant, intense friction patterns may surface in imagination or peripheral contact';
    } else if (valenceLevel.level <= -1) {
      valenceWB = 'Moderate friction signals that reactivation would likely resurface familiar challenges';
      valenceABE = 'Be mindful of interpreting symbolic tension as unfinished business requiring action';
    } else {
      valenceWB = 'Neutral dormant field — neither pulling toward reconnection nor pushing away';
      valenceABE = 'Balanced energy may simply reflect that the story is complete, with no charge either way';
    }
  } else {
    // Active relationship - standard phrasing
    if (valenceLevel.level >= 3) {
      valenceWB = 'Harmonious energy supports both/and solutions and collaborative progress';
      valenceABE = 'Harmony-seeking might avoid necessary direct conversations or tough decisions';
    } else if (valenceLevel.level >= 1) {
      valenceWB = 'Gentle supportive flow that makes things feel easier and more natural';
      valenceABE = 'Could lead to complacency or avoiding growth-edge challenges';
    } else if (valenceLevel.level <= -3) {
      valenceWB = 'Intense compression creates valuable transformation and clarity';
      valenceABE = 'Pressure might feel overwhelming or trigger resistance patterns';
    } else if (valenceLevel.level <= -1) {
      valenceWB = 'Moderate challenges strengthen skills and build resilience';
      valenceABE = 'Friction could accumulate into frustration if not addressed mindfully';
    } else {
      valenceWB = 'Balanced conditions allow for clear thinking and neutral assessment';
      valenceABE = 'Lack of directional energy might feel stagnant or unclear';
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
  names?: [string, string]
): string {
  const pairLabel = formatRelationalPair(names);
  const directional = valenceLevel.level <= -2
    ? 'Keep contact light and clear; compression days reward steady presence more than initiatives.'
    : valenceLevel.level >= 2
      ? 'Share momentum cues and invite co-creation; outward tilt supports shared action.'
      : 'Name what you notice and let the other person steer if they have more bandwidth.';

  const magnitudeNote = climate.magnitude >= 4
    ? 'Treat every exchange like it echoes.'
    : climate.magnitude >= 3
      ? 'Expect small ripples to matter; clarity prevents misreads.'
      : 'Use the lower volume to stay curious rather than corrective.';

  return `${pairLabel} benefit from clarity without demand today. ${directional} ${magnitudeNote}`;
}

export function generateClimateNarrative(
  climate: ClimateData,
  activatedHouses?: string[],
  isRangeSummary: boolean = false,
  isLatentField: boolean = false,
  mode: 'single' | 'relational' = 'single',
  names?: [string, string]
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
    ? generateRelationalGuidance(climate, valenceLevel, names)
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
