/**
 * MBTI Correspondence Inference — Backstage Only
 * 
 * Heuristic mapping from chart geometry to MBTI-like tendencies.
 * NEVER used frontstage; only supplies symbolic context for Poetic Brain.
 * 
 * ARCHITECTURE NOTE (v1.4 — Three-Layer Precedence Model):
 * 
 * LAYER 1: BLUEPRINT (Symbolic Core — Raven's Layer)
 * - J/P: Sun Modality (Primary Determinant)
 * - N/S: Sun Element + Mercury Element + Moon Element (Water = Depth-Patterning)
 * - T/F: Moon Element + Venus-Saturn + MC/IC
 * - E/I: Moon Element + Saturn Bias
 * 
 * LAYER 2: ENGINE (Numeric Tone)
 * - Provides polarity pressure and nuance (e.g., "Soft P" vs "Strong J")
 * - Does NOT override Layer 1 if Blueprint signal is clear.
 * 
 * LAYER 3: CONTACT RESONANCE (The Interface)
 * - Ascendant, Mars, Sun polarity (for E/I)
 * - Strictly firewalled from Type determination.
 * 
 * PROTOCOL RULES:
 * - Rule A: Blueprint Precedence — Sun determines J/P.
 * - Rule B: Depth-Patterning — Water Moons allow N-orientation.
 * - Rule C: Falsifiability Required.
 * 
 * @internal
 */

type ChartInput = {
  positions?: Record<string, any> | null;
  angle_signs?: Record<string, string> | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sign → Element / Modality
// ─────────────────────────────────────────────────────────────────────────────

const ELEMENTS: Record<string, 'F' | 'E' | 'A' | 'W'> = {
  Ari: 'F', Leo: 'F', Sag: 'F',
  Tau: 'E', Vir: 'E', Cap: 'E',
  Gem: 'A', Lib: 'A', Aqu: 'A',
  Can: 'W', Sco: 'W', Pis: 'W',
};

const MODALITIES: Record<string, 'C' | 'F' | 'M'> = {
  Ari: 'C', Can: 'C', Lib: 'C', Cap: 'C',
  Tau: 'F', Leo: 'F', Sco: 'F', Aqu: 'F',
  Gem: 'M', Vir: 'M', Sag: 'M', Pis: 'M',
};

const ELEMENT_NAMES: Record<string, string> = {
  F: 'Fire', E: 'Earth', A: 'Air', W: 'Water',
};

const MODALITY_NAMES: Record<string, string> = {
  C: 'Cardinal', F: 'Fixed', M: 'Mutable',
};

// Interior Compass planets (used for MBTI inference)
const INTERIOR_COMPASS_PLANETS = new Set(['Moon', 'moon', 'Venus', 'venus', 'Saturn', 'saturn']);

// Contact Resonance planets (excluded from MBTI inference)
const CONTACT_RESONANCE_PLANETS = new Set(['Sun', 'sun', 'Mars', 'mars', 'Mercury', 'mercury']);

function norm(s?: string | null): string | null {
  if (!s) return null;
  const t = s.trim().slice(0, 3);
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function elem(sign?: string | null): 'F' | 'E' | 'A' | 'W' | null {
  const k = norm(sign);
  return k ? ELEMENTS[k] ?? null : null;
}

function mod(sign?: string | null): 'C' | 'F' | 'M' | null {
  const k = norm(sign);
  return k ? MODALITIES[k] ?? null : null;
}

function isRetrograde(planet: any): boolean {
  return planet?.retrograde === true || planet?.is_retrograde === true;
}

function isWater(sign?: string | null): boolean {
  return elem(sign) === 'W';
}

function is12thHouse(planet: any): boolean {
  // Check if house is 12 (handle string or number)
  return planet?.house == 12;
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence Buckets (v1.2 — Best-Fit With Spine)
// ─────────────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'strong_call' | 'clear_call' | 'soft_call';

function scoreToConfidence(score: number): ConfidenceLevel {
  const abs = Math.abs(score);
  if (abs >= 0.6) return 'strong_call';
  if (abs >= 0.3) return 'clear_call';
  return 'soft_call';
}

// ─────────────────────────────────────────────────────────────────────────────
// Falsifiability Clauses (v1.2 — Required for every call)
// ─────────────────────────────────────────────────────────────────────────────

const FALSIFIABILITY_CLAUSES: Record<string, Record<string, string>> = {
  EI: {
    E: 'If you consistently find that solitude restores you more than contact, this read would need revision.',
    I: 'If you consistently find that contact energizes you more than solitude and depth, this read would need revision.',
  },
  NS: {
    N: 'If you consistently notice concrete details before patterns, this read would need revision.',
    S: 'If you consistently read meaning and pattern before tangible detail, this read would need revision.',
  },
  TF: {
    T: 'If high-stakes decisions consistently feel right through relational coherence rather than structural clarity, this read would need revision.',
    F: 'If high-stakes decisions consistently feel right through framework logic rather than felt integrity, this read would need revision.',
  },
  JP: {
    J: 'If you consistently feel more at ease with options open than with things decided, this read would need revision.',
    P: 'If you consistently feel more at ease with closure than with open possibilities, this read would need revision.',
  },
};

function getFalsifiabilityClause(axis: string, value: string, confidence: ConfidenceLevel): string {
  const base = FALSIFIABILITY_CLAUSES[axis]?.[value] || 'Lived experience is the ultimate test.';
  if (confidence === 'soft_call') {
    return `This is a close read. ${base}`;
  }
  return base;
}

// ─────────────────────────────────────────────────────────────────────────────
// Axis Detail Interface (v1.2 — Per-axis reasoning)
// ─────────────────────────────────────────────────────────────────────────────

export interface AxisDetail {
  /** The preference value: 'E' or 'I', 'N' or 'S', etc. */
  value: string;
  /** Raw score from -1 to 1 */
  score: number;
  /** Confidence bucket */
  confidence: ConfidenceLevel;
  /** Interior Compass signals that drove this call */
  interiorSignals: string[];
  /** Contact Resonance signals that may look similar (for explanation) */
  contactSignals: string[];
  /** Human-readable reasoning (v1.4 Voice) */
  reasoning: string;
  /** Testable prediction that would disprove this call */
  falsifiability: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Axis Scores — Interior Compass Only (v1.4 Depth Edition)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * E/I Axis — Outward-first vs. Inward-first Motion
 * 
 * Sources (v1.4 — Depth Edition):
 * 1. Moon element (primary)
 * 2. Saturn inward/outward bias (Gravity Well clause applied)
 * 
 * v1.4 Updates:
 * - Saturn in Water or 12th House = -0.4 (Gravity Well)
 * - Saturn Retrograde = 1.2x multiplier on inward bias
 */
function axisEI(positions: Record<string, any>, ascSign: string | null): AxisDetail {
  const interiorSignals: string[] = [];
  const contactSignals: string[] = [];

  // Primary signal: Moon element
  const moon = positions['Moon'] || positions['moon'];
  const moonEl = elem(moon?.sign);
  let moonScore = 0;
  if (moonEl) {
    const outward = moonEl === 'F' || moonEl === 'A';
    moonScore = outward ? 1.0 : 0.0;
    interiorSignals.push(`Moon in ${ELEMENT_NAMES[moonEl]} (${outward ? 'outward-moving' : 'inward-moving'})`);
  }

  // Secondary signal: Saturn bias (Gravity Well)
  const saturn = positions['Saturn'] || positions['saturn'];
  const saturnEl = elem(saturn?.sign);
  let saturnBias = 0;

  if (saturnEl) {
    const isWaterSaturn = isWater(saturn?.sign);
    const is12th = is12thHouse(saturn);
    const isRx = isRetrograde(saturn);

    if (isWaterSaturn || is12th) {
      // Gravity Well Clause
      saturnBias = -0.4;
      interiorSignals.push(`Saturn in ${isWaterSaturn ? 'Water' : '12th House'} (Gravity Well — deep inward pull)`);
    } else {
      const saturnOutward = saturnEl === 'F' || saturnEl === 'A';
      saturnBias = saturnOutward ? 0.15 : -0.15;
      interiorSignals.push(`Saturn in ${ELEMENT_NAMES[saturnEl]} (${saturnOutward ? 'outward' : 'inward'} structure)`);
    }

    // Retrograde Factor
    if (isRx && saturnBias < 0) {
      saturnBias *= 1.2; // Deepen the inward pull
      interiorSignals.push(`Saturn Retrograde (intensifies inward focus)`);
    }
  }

  // Track Contact Resonance (for explanation, NOT for scoring)
  const ascEl = elem(ascSign);
  if (ascEl) {
    const ascOutward = ascEl === 'F' || ascEl === 'A';
    contactSignals.push(`Ascendant in ${ELEMENT_NAMES[ascEl]} (${ascOutward ? 'E-like' : 'I-like'} mask)`);
  }
  const sun = positions['Sun'] || positions['sun'];
  const sunEl = elem(sun?.sign);
  if (sunEl) {
    const sunOutward = sunEl === 'F' || sunEl === 'A';
    contactSignals.push(`Sun in ${ELEMENT_NAMES[sunEl]} (${sunOutward ? 'E-like' : 'I-like'} expression)`);
  }
  const mars = positions['Mars'] || positions['mars'];
  const marsEl = elem(mars?.sign);
  if (marsEl === 'F' || marsEl === 'A') {
    contactSignals.push(`Mars in ${ELEMENT_NAMES[marsEl]} (E-like ignition)`);
  }

  // Calculate score: Moon + Saturn only
  const rawScore = moonScore + saturnBias;
  // Normalize: 0 = pure I, 1.2 = pure E
  // Convert to -1..1 scale centered at 0.5
  const score = Math.max(-1, Math.min(1, (rawScore - 0.5) * 2));

  const value = score >= 0 ? 'E' : 'I';
  const confidence = scoreToConfidence(score);

  // v1.4 Voice
  let reasoning = `Your energy tends to flow ${value === 'E' ? 'outward, gathering momentum from connection' : 'inward, gathering strength from depth'}. `;
  reasoning += `Key signals: ${interiorSignals.join('; ')}. `;
  if (contactSignals.length > 0) {
    const mismatch = (value === 'I' && contactSignals.some(s => s.includes('E-like'))) ||
      (value === 'E' && contactSignals.some(s => s.includes('I-like')));
    if (mismatch) {
      reasoning += `Note: You may appear ${value === 'I' ? 'more outgoing' : 'more reserved'} to others (${contactSignals.join('; ')}), but this is your interface, not your engine.`;
    }
  }

  return {
    value,
    score,
    confidence,
    interiorSignals,
    contactSignals,
    reasoning,
    falsifiability: getFalsifiabilityClause('EI', value, confidence),
  };
}

/**
 * N/S Axis — Pattern-first vs. Concrete-first Perception
 * 
 * Sources (v1.4 — Three-Layer Precedence):
 * 1. Actor (Sun) element
 * 2. Mercury element
 * 3. Moon element (Water = Depth-Patterning)
 */
function axisNS(positions: Record<string, any>): AxisDetail {
  const interiorSignals: string[] = [];
  const contactSignals: string[] = [];

  // Primary signal: Actor (Sun) element
  const sun = positions['Sun'] || positions['sun'];
  const sunEl = elem(sun?.sign);
  let actorScore = 0;
  if (sunEl) {
    const patternFirst = sunEl === 'F' || sunEl === 'A';
    actorScore = patternFirst ? 1.0 : 0.0;
    interiorSignals.push(`Sun in ${ELEMENT_NAMES[sunEl]} (${patternFirst ? 'pattern-seeking' : 'grounded'})`);
  }

  // Secondary signal: Mercury element
  const mercury = positions['Mercury'] || positions['mercury'];
  const mercuryEl = elem(mercury?.sign);
  let mercuryScore = 0;
  if (mercuryEl) {
    const patternFirst = mercuryEl === 'F' || mercuryEl === 'A';
    mercuryScore = patternFirst ? 1.0 : 0.0;
    interiorSignals.push(`Mercury in ${ELEMENT_NAMES[mercuryEl]} (${patternFirst ? 'abstract' : 'practical'})`);
  }

  // Tertiary signal: Moon element (Water = Depth-Patterning)
  const moon = positions['Moon'] || positions['moon'];
  const moonEl = elem(moon?.sign);
  let moonScore = 0;
  if (moonEl === 'W') {
    moonScore = 1.5; // Strong N bias for Water Moons (Overrides Earth)
    interiorSignals.push(`Moon in Water (depth-patterning / intuitive bias)`);
  }

  // Calculate combined score
  const combinedScore = actorScore + mercuryScore + moonScore;

  // Thresholds adjusted for 3 inputs
  let value: string;
  // Max score 2.8 (Sun+Merc+Moon), Min 0.0
  // Midpoint ~1.4
  if (combinedScore >= 1.5) value = 'N';
  else if (combinedScore <= 1.0) value = 'S';
  else value = combinedScore >= 1.2 ? 'N' : 'S';

  const score = Math.max(-1, Math.min(1, (combinedScore - 1.2)));
  const confidence = scoreToConfidence(score);

  // v1.4 Voice
  let reasoning = `You tend to read ${value === 'N' ? 'the pattern before the detail' : 'the reality before the theory'}. `;
  reasoning += `Key signals: ${interiorSignals.join('; ')}.`;

  return {
    value,
    score,
    confidence,
    interiorSignals,
    contactSignals,
    reasoning,
    falsifiability: getFalsifiabilityClause('NS', value, confidence),
  };
}

/**
 * T/F Axis — Structure-led vs. Resonance-led Evaluation
 * 
 * Sources (v1.2 Final):
 * 1. Moon element
 * 2. Venus ↔ Saturn weighting
 * 3. MC/IC purpose-axis tone
 */
function axisTF(positions: Record<string, any>, mcSign: string | null): AxisDetail {
  const interiorSignals: string[] = [];
  const contactSignals: string[] = [];

  const moon = positions['Moon'] || positions['moon'];
  const venus = positions['Venus'] || positions['venus'];
  const saturn = positions['Saturn'] || positions['saturn'];

  const moonEl = elem(moon?.sign);
  const venusEl = elem(venus?.sign);
  const saturnEl = elem(saturn?.sign);
  const mcEl = elem(mcSign);

  // Primary: Moon element
  let moonScore = 0;
  if (moonEl) {
    const fLeaning = moonEl === 'W' || moonEl === 'F';
    moonScore = fLeaning ? 1.5 : 0.5;
    interiorSignals.push(`Moon in ${ELEMENT_NAMES[moonEl]} (${fLeaning ? 'resonance-led' : 'logic-led'})`);
  }

  // Venus-Moon harmony
  let venusBonus = 0;
  if (moonEl && venusEl) {
    if (moonEl === venusEl) {
      venusBonus = 0.2;
      interiorSignals.push(`Moon-Venus harmony (values align with feelings)`);
    } else if ((moonEl === 'F' && venusEl === 'A') || (moonEl === 'A' && venusEl === 'F') ||
      (moonEl === 'W' && venusEl === 'E') || (moonEl === 'E' && venusEl === 'W')) {
      venusBonus = 0.1;
      interiorSignals.push(`Moon-Venus flow (values support feelings)`);
    }
  }

  // Saturn dominance
  let saturnPenalty = 0;
  if (saturnEl) {
    saturnPenalty = -0.2;
    interiorSignals.push(`Saturn in ${ELEMENT_NAMES[saturnEl]} (structural weight)`);
  }

  // MC/IC purpose-axis tone
  let mcBonus = 0;
  if (mcEl) {
    const mcFLeaning = mcEl === 'W' || mcEl === 'F';
    mcBonus = mcFLeaning ? 0.15 : -0.15;
    interiorSignals.push(`MC in ${ELEMENT_NAMES[mcEl]} (${mcFLeaning ? 'value-driven' : 'system-driven'} purpose)`);
  }

  // Track Contact Resonance
  const mercury = positions['Mercury'] || positions['mercury'];
  const mercuryEl = elem(mercury?.sign);
  if (mercuryEl === 'A') {
    contactSignals.push(`Mercury in Air (analytical speech)`);
  } else if (mercuryEl === 'W') {
    contactSignals.push(`Mercury in Water (empathic speech)`);
  }

  const combinedScore = moonScore + venusBonus + saturnPenalty + mcBonus;

  let value: string;
  if (combinedScore >= 1.3) value = 'F';
  else if (combinedScore <= 0.7) value = 'T';
  else value = combinedScore >= 1.0 ? 'F' : 'T';

  const score = Math.max(-1, Math.min(1, (combinedScore - 1.0) * 1.5));
  const confidence = scoreToConfidence(score);

  // v1.4 Voice
  let reasoning = `You tend to weigh decisions through ${value === 'F' ? 'felt integrity and resonance' : 'logic, consistency, and structure'}. `;
  reasoning += `Key signals: ${interiorSignals.join('; ')}.`;
  if (contactSignals.length > 0) {
    const mismatch = (value === 'F' && contactSignals.some(s => s.includes('analytical'))) ||
      (value === 'T' && contactSignals.some(s => s.includes('empathic')));
    if (mismatch) {
      reasoning += ` Note: You may sound ${value === 'F' ? 'more analytical' : 'more feeling-oriented'} in conversation (${contactSignals.join('; ')}), but this is your communication style, not your decision anchor.`;
    }
  }

  return {
    value,
    score,
    confidence,
    interiorSignals,
    contactSignals,
    reasoning,
    falsifiability: getFalsifiabilityClause('TF', value, confidence),
  };
}

/**
 * J/P Axis — Closure-seeking vs. Open-form Movement
 * 
 * Sources (v1.4 — Three-Layer Precedence):
 * 1. Sun Modality (Primary - Blueprint Layer)
 * 2. Moon Modality (Secondary - Engine Layer)
 * 3. Saturn structure-bias
 * 
 * v1.4 Updates:
 * - Sun Modality determines Blueprint J/P (+/- 1.5 weight)
 * - Moon/Saturn provide tonal nuance
 */
function axisJP(positions: Record<string, any>, ascSign: string | null): AxisDetail {
  const interiorSignals: string[] = [];
  const contactSignals: string[] = [];

  // Primary: Sun Modality (Blueprint Layer)
  const sun = positions['Sun'] || positions['sun'];
  const sunMod = mod(sun?.sign);
  let sunScore = 0;
  if (sunMod) {
    const jLeaning = sunMod === 'C' || sunMod === 'F';
    // Heavy weight to ensure Blueprint precedence
    sunScore = jLeaning ? 1.5 : -1.5;
    interiorSignals.push(`Sun in ${MODALITY_NAMES[sunMod]} (Blueprint ${jLeaning ? 'J' : 'P'})`);
  }

  // Secondary: Moon modality (Engine Layer)
  const moon = positions['Moon'] || positions['moon'];
  const moonMod = mod(moon?.sign);
  let moonScore = 0;
  if (moonMod) {
    const jLeaning = moonMod === 'C' || moonMod === 'F';
    moonScore = jLeaning ? 0.5 : -0.5;
    interiorSignals.push(`Moon in ${MODALITY_NAMES[moonMod]} (${jLeaning ? 'closure-seeking' : 'open-flow'} tone)`);
  }

  // Tertiary: Saturn structure-bias
  const saturn = positions['Saturn'] || positions['saturn'];
  const saturnMod = mod(saturn?.sign);
  let saturnBias = 0;
  const isRx = isRetrograde(saturn);

  if (saturnMod) {
    const jLeaning = saturnMod === 'C' || saturnMod === 'F';
    saturnBias = jLeaning ? 0.15 : -0.15;
    interiorSignals.push(`Saturn in ${MODALITY_NAMES[saturnMod]} (${jLeaning ? 'structured' : 'flexible'})`);

    // Retrograde Factor (Internal Order)
    if (isRx && saturnBias > 0) {
      saturnBias *= 1.2;
      interiorSignals.push(`Saturn Retrograde (intensifies internal order)`);
    }
  } else if (saturn?.sign) {
    saturnBias = 0.1;
    interiorSignals.push(`Saturn present (structural weight)`);
  }

  // Track Contact Resonance
  const ascMod = mod(ascSign);
  if (ascMod) {
    const jLeaning = ascMod === 'C' || ascMod === 'F';
    contactSignals.push(`Ascendant in ${MODALITY_NAMES[ascMod]} (${jLeaning ? 'J-like' : 'P-like'} style)`);
  }
  const mars = positions['Mars'] || positions['mars'];
  const marsMod = mod(mars?.sign);
  if (marsMod) {
    const jLeaning = marsMod === 'C' || marsMod === 'F';
    contactSignals.push(`Mars in ${MODALITY_NAMES[marsMod]} (${jLeaning ? 'J-like' : 'P-like'} action)`);
  }

  // Calculate score
  // Sun (+/- 1.5) dominates Moon (+/- 0.5) and Saturn (+/- 0.15)
  const rawScore = sunScore + moonScore + saturnBias;

  // Normalize
  const score = Math.max(-1, Math.min(1, rawScore / 2.0));

  const value = score >= 0 ? 'J' : 'P';
  const confidence = scoreToConfidence(score);

  // v1.4 Voice
  let reasoning = `You tend to prefer ${value === 'J' ? 'a settled path and clear closure' : 'open options and flexible flow'}. `;
  reasoning += `Key signals: ${interiorSignals.join('; ')}.`;
  if (contactSignals.length > 0) {
    const mismatch = (value === 'P' && contactSignals.some(s => s.includes('J-like'))) ||
      (value === 'J' && contactSignals.some(s => s.includes('P-like')));
    if (mismatch) {
      reasoning += ` Note: You may act ${value === 'P' ? 'more structured' : 'more spontaneous'} in the moment (${contactSignals.join('; ')}), but this is action style, not your deep preference.`;
    }
  }

  return {
    value,
    score,
    confidence,
    interiorSignals,
    contactSignals,
    reasoning,
    falsifiability: getFalsifiabilityClause('JP', value, confidence),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Interface — v1.2 Best-Fit With Spine
// ─────────────────────────────────────────────────────────────────────────────

export interface AxisReasoning {
  value: string;
  confidence: ConfidenceLevel;
  reasoning: string;
  falsifiability: string;
}

export interface MbtiHint {
  code: string;
  _axes?: { EI: number; NS: number; TF: number; JP: number };
  _layer_note?: string;
  axisReasoning?: {
    EI: AxisReasoning;
    NS: AxisReasoning;
    TF: AxisReasoning;
    JP: AxisReasoning;
  };
  globalSummary?: string;
}

export interface ContactResonance {
  ignition_style: string;
  interface_tone: string;
  presentation_tempo: string;
  ei_appearance_note?: string;
  tf_appearance_note?: string;
}

export interface PoeticBrainContext {
  motion_tendency: string;
  processing_style: string;
  decision_lens: string;
  rhythm_preference: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Poetic Brain Formatting (symbolic, not typology)
// ─────────────────────────────────────────────────────────────────────────────

const MOTION_PHRASES: Record<string, string> = {
  E: 'outward-moving energy, drawn toward external engagement',
  I: 'inward-moving energy, drawn toward internal reflection',
};

const PROCESSING_PHRASES: Record<string, string> = {
  N: 'pattern-seeking awareness, tends to read between the lines',
  S: 'grounded awareness, tends to trust direct experience',
};

const DECISION_PHRASES: Record<string, string> = {
  T: 'analytical lens, weighs logic and consistency',
  F: 'empathic lens, weighs harmony and values',
};

const RHYTHM_PHRASES: Record<string, string> = {
  J: 'structured rhythm, prefers clarity and closure',
  P: 'adaptive rhythm, prefers openness and flexibility',
};

export function formatForPoeticBrain(hint: MbtiHint | null): PoeticBrainContext | null {
  if (!hint?.code || hint.code.length !== 4) return null;

  const [ei, ns, tf, jp] = hint.code.split('');

  return {
    motion_tendency: MOTION_PHRASES[ei] || 'balanced energy flow',
    processing_style: PROCESSING_PHRASES[ns] || 'flexible awareness',
    decision_lens: DECISION_PHRASES[tf] || 'balanced consideration',
    rhythm_preference: RHYTHM_PHRASES[jp] || 'adaptable rhythm',
  };
}

export function inferContactResonance(chart?: ChartInput | null): ContactResonance | null {
  if (!chart?.positions) return null;

  const sun = chart.positions['Sun'] || chart.positions['sun'];
  const mars = chart.positions['Mars'] || chart.positions['mars'];
  const mercury = chart.positions['Mercury'] || chart.positions['mercury'];

  const asc = chart.angle_signs?.ascendant ??
    chart.angle_signs?.['Ascendant'] ??
    (chart.angle_signs as any)?.asc ??
    null;

  const ascEl = elem(asc);
  const marsEl = elem(mars?.sign);
  const sunEl = elem(sun?.sign);
  const mercuryEl = elem(mercury?.sign);

  // Ignition style from Mars + Sun
  let ignition = 'measured ignition';
  if (marsEl === 'F' || sunEl === 'F') ignition = 'fast ignition, decisive first impression';
  else if (marsEl === 'A' || sunEl === 'A') ignition = 'quick-witted initiative, intellectualized contact';
  else if (marsEl === 'E' || sunEl === 'E') ignition = 'deliberate entry, grounded first impression';
  else if (marsEl === 'W' || sunEl === 'W') ignition = 'cautious entry, emotionally attuned contact';

  // Interface tone from Ascendant
  let interface_tone = 'adaptable interface';
  if (ascEl === 'F') interface_tone = 'warm, expressive interface';
  else if (ascEl === 'A') interface_tone = 'cool, intellectual interface';
  else if (ascEl === 'E') interface_tone = 'grounded, reserved interface';
  else if (ascEl === 'W') interface_tone = 'receptive, guarded interface';

  // Presentation tempo from Mercury
  let tempo = 'variable tempo';
  if (mercuryEl === 'F') tempo = 'fast-paced, enthusiastic speech';
  else if (mercuryEl === 'A') tempo = 'quick, analytical communication';
  else if (mercuryEl === 'E') tempo = 'measured, practical communication';
  else if (mercuryEl === 'W') tempo = 'reflective, emotionally-colored speech';

  // v1.2: E/I appearance mismatch detection
  let ei_appearance_note: string | undefined;
  const ascOutward = ascEl === 'F' || ascEl === 'A';
  const marsOutward = marsEl === 'F' || marsEl === 'A';
  if (ascOutward || marsOutward) {
    const notes: string[] = [];
    if (ascOutward) notes.push(`Ascendant in ${ELEMENT_NAMES[ascEl!]} creates E-like first impression`);
    if (marsOutward) notes.push(`Mars in ${ELEMENT_NAMES[marsEl!]} signals quick ignition`);
    ei_appearance_note = notes.join('; ') + ' — may appear more extraverted than interior compass suggests';
  } else if (ascEl === 'W' || ascEl === 'E') {
    ei_appearance_note = `Ascendant in ${ELEMENT_NAMES[ascEl]} creates I-like first impression — may appear more introverted than interior compass suggests`;
  }

  // v1.2: T/F appearance mismatch detection
  let tf_appearance_note: string | undefined;
  if (mercuryEl === 'A') {
    tf_appearance_note = `Mercury in Air creates T-like articulation style — may appear more analytical than interior values suggest`;
  } else if (mercuryEl === 'W') {
    tf_appearance_note = `Mercury in Water creates F-like speech pattern — may appear more feeling-oriented than interior decision architecture suggests`;
  }

  return {
    ignition_style: ignition,
    interface_tone: interface_tone,
    presentation_tempo: tempo,
    ei_appearance_note,
    tf_appearance_note,
  };
}

function buildGlobalSummary(ei: AxisDetail, ns: AxisDetail, tf: AxisDetail, jp: AxisDetail): string {
  const strongAxes: string[] = [];
  const softAxes: string[] = [];

  for (const [name, axis] of [['E/I', ei], ['N/S', ns], ['T/F', tf], ['J/P', jp]] as const) {
    if (axis.confidence === 'strong_call') {
      strongAxes.push(`${name}: ${axis.value}`);
    } else if (axis.confidence === 'soft_call') {
      softAxes.push(`${name}: ${axis.value}`);
    }
  }

  // v1.4 Voice: Collaborative framing
  let summary = `This map listens to you. Your interior compass currently points to ${ei.value}${ns.value}${tf.value}${jp.value}. `;
  if (strongAxes.length > 0) {
    summary += `The signals for ${strongAxes.join(', ')} are clear. `;
  }
  if (softAxes.length > 0) {
    summary += `The signals for ${softAxes.join(', ')} are close—these may shift under different contexts. `;
  }
  summary += `Where do you feel the map fits your experience?`;

  return summary;
}

export function inferMbtiFromChart(chart?: ChartInput | null): MbtiHint | null {
  if (!chart?.positions || Object.keys(chart.positions).length < 3) return null;

  const mc = chart.angle_signs?.midheaven ??
    chart.angle_signs?.['Midheaven'] ??
    chart.angle_signs?.['MC'] ??
    (chart.angle_signs as any)?.mc ??
    null;

  const asc = chart.angle_signs?.ascendant ??
    chart.angle_signs?.['Ascendant'] ??
    (chart.angle_signs as any)?.asc ??
    null;

  const ei = axisEI(chart.positions, asc);
  const ns = axisNS(chart.positions);
  const tf = axisTF(chart.positions, mc);
  const jp = axisJP(chart.positions, asc);

  return {
    code: `${ei.value}${ns.value}${tf.value}${jp.value}`,
    _axes: { EI: ei.score, NS: ns.score, TF: tf.score, JP: jp.score },
    _layer_note: 'Interior Compass only — Contact Resonance excluded per v1.4 protocol',
    axisReasoning: {
      EI: { value: ei.value, confidence: ei.confidence, reasoning: ei.reasoning, falsifiability: ei.falsifiability },
      NS: { value: ns.value, confidence: ns.confidence, reasoning: ns.reasoning, falsifiability: ns.falsifiability },
      TF: { value: tf.value, confidence: tf.confidence, reasoning: tf.reasoning, falsifiability: tf.falsifiability },
      JP: { value: jp.value, confidence: jp.confidence, reasoning: jp.reasoning, falsifiability: jp.falsifiability },
    },
    globalSummary: buildGlobalSummary(ei, ns, tf, jp),
  };
}

export default inferMbtiFromChart;
