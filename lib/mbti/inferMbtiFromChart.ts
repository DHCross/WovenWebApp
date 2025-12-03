/**
 * MBTI Correspondence Inference — Backstage Only
 * 
 * Heuristic mapping from chart geometry to MBTI-like tendencies.
 * NEVER used frontstage; only supplies symbolic context for Poetic Brain.
 * 
 * ARCHITECTURE NOTE (v1.3 — Clean Firewall):
 * 
 * INTERIOR COMPASS (determines type):
 * - E/I: Moon element + Saturn bias
 * - N/S: Sun element + Mercury element (perception architecture)
 * - T/F: Moon element + Venus-Saturn weighting + MC/IC purpose-axis tone
 * - J/P: Moon modality + Saturn structure-bias
 * 
 * CONTACT RESONANCE (EXCLUDED from type — hard firewall):
 * - Ascendant sign (interface mask)
 * - Mars ignition
 * - Sun modality/polarity for E/I or J/P (presentation, not cognition)
 * - Mercury tempo
 * 
 * PROTOCOL RULES:
 * - Rule A: No Axis Left Uncalled — every axis gets a best-fit
 * - Rule B: Layer-Based Tie-Breaker — Moon first, Saturn second
 * - Rule C: Falsifiability Required — every call includes testable prediction
 * - FIREWALL: Sun/ASC/Mars/Mercury tempo NEVER influence E/I, T/F, or J/P
 * 
 * NOTE: All scoring values are HEURISTICS, not empirical claims.
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

function isInteriorCompassPlanet(name: string): boolean {
  return INTERIOR_COMPASS_PLANETS.has(name);
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
  /** Human-readable reasoning */
  reasoning: string;
  /** Testable prediction that would disprove this call */
  falsifiability: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Axis Scores — Interior Compass Only (v1.2 Best-Fit With Spine)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * E/I Axis — Outward-first vs. Inward-first Motion
 * 
 * Sources (v1.3 — Clean Firewall):
 * 1. Moon element (primary)
 * 2. Saturn inward/outward bias
 * 
 * EXCLUDED (Contact Resonance — hard firewall):
 * - Sun polarity (presentation, not cognition)
 * - Ascendant (interface mask)
 * - Mars (ignition style)
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
    interiorSignals.push(`Moon in ${ELEMENT_NAMES[moonEl]} (${outward ? 'outward-first' : 'inward-first'})`);
  }
  
  // Secondary signal: Saturn bias
  const saturn = positions['Saturn'] || positions['saturn'];
  const saturnEl = elem(saturn?.sign);
  let saturnBias = 0;
  if (saturnEl) {
    const saturnOutward = saturnEl === 'F' || saturnEl === 'A';
    saturnBias = saturnOutward ? 0.2 : -0.2;
    interiorSignals.push(`Saturn in ${ELEMENT_NAMES[saturnEl]} (${saturnOutward ? 'outward' : 'inward'} structural bias)`);
  }
  
  // Track Contact Resonance (for explanation, NOT for scoring)
  const ascEl = elem(ascSign);
  if (ascEl) {
    const ascOutward = ascEl === 'F' || ascEl === 'A';
    contactSignals.push(`Ascendant in ${ELEMENT_NAMES[ascEl]} (${ascOutward ? 'E-like' : 'I-like'} presentation)`);
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
  
  // Calculate score: Moon + Saturn only (no Sun polarity)
  const rawScore = moonScore + saturnBias;
  // Normalize: 0 = pure I (Earth/Water Moon, inward Saturn)
  //            1.2 = pure E (Fire/Air Moon, outward Saturn)
  // Convert to -1..1 scale centered at 0.5
  const score = Math.max(-1, Math.min(1, (rawScore - 0.5) * 2));
  
  const value = score >= 0 ? 'E' : 'I';
  const confidence = scoreToConfidence(score);
  
  // Build reasoning
  let reasoning = `Interior compass reads ${value}-like (${value === 'E' ? 'outward-first motion' : 'inward-first motion'}). `;
  reasoning += `Key signals: ${interiorSignals.join('; ')}. `;
  if (contactSignals.length > 0) {
    const mismatch = (value === 'I' && contactSignals.some(s => s.includes('E-like'))) ||
                     (value === 'E' && contactSignals.some(s => s.includes('I-like')));
    if (mismatch) {
      reasoning += `Note: Contact layer shows ${value === 'I' ? 'E' : 'I'}-like signals (${contactSignals.join('; ')}), but these describe presentation, not inner orientation.`;
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
 * Sources (v1.2 Final):
 * 1. Actor (Sun) element
 * 2. Mercury element
 * 
 * Fire/Air = pattern-seeking (N)
 * Earth/Water = concrete-grounded (S)
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
    interiorSignals.push(`Actor (Sun) in ${ELEMENT_NAMES[sunEl]} (${patternFirst ? 'pattern-seeking' : 'concrete-grounded'})`);
  }
  
  // Secondary signal: Mercury element
  const mercury = positions['Mercury'] || positions['mercury'];
  const mercuryEl = elem(mercury?.sign);
  let mercuryScore = 0;
  if (mercuryEl) {
    const patternFirst = mercuryEl === 'F' || mercuryEl === 'A';
    mercuryScore = patternFirst ? 1.0 : 0.0;
    interiorSignals.push(`Mercury in ${ELEMENT_NAMES[mercuryEl]} (${patternFirst ? 'abstract processing' : 'practical processing'})`);
  }
  
  // Calculate combined score
  // Both count equally: Fire/Air = 1.0, Earth/Water = 0.0
  // Combined range: 0.0 to 2.0
  const combinedScore = actorScore + mercuryScore;
  
  // Decision thresholds (heuristic)
  // >= 1.2 → N
  // <= 0.8 → S
  // 0.8 < x < 1.2 → hinge
  let value: string;
  if (combinedScore >= 1.2) value = 'N';
  else if (combinedScore <= 0.8) value = 'S';
  else value = combinedScore >= 1.0 ? 'N' : 'S'; // slight tiebreaker toward N
  
  // Convert to -1..1 scale for confidence
  const score = Math.max(-1, Math.min(1, (combinedScore - 1.0)));
  const confidence = scoreToConfidence(score);
  
  let reasoning = `Interior compass reads ${value}-like (${value === 'N' ? 'pattern-first perception' : 'concrete-first perception'}). `;
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
 * Sources (v1.2 Final, ranked):
 * 1. Moon element (primary)
 *    - Water/Fire → F-leaning
 *    - Earth/Air → T-leaning
 * 2. Venus ↔ Saturn weighting
 *    - Venus/Moon harmony → +F
 *    - Saturn dominance → +T
 * 3. MC/IC purpose-axis tone
 *    - Water/Fire → F-lean
 *    - Earth/Air → T-lean
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
  
  // Primary: Moon element (Water/Fire = F-leaning, Earth/Air = T-leaning)
  let moonScore = 0;
  if (moonEl) {
    const fLeaning = moonEl === 'W' || moonEl === 'F';
    moonScore = fLeaning ? 1.5 : 0.5;
    interiorSignals.push(`Moon in ${ELEMENT_NAMES[moonEl]} (${fLeaning ? 'F-leaning' : 'T-leaning'})`);
  }
  
  // Venus-Moon harmony
  let venusBonus = 0;
  if (moonEl && venusEl) {
    if (moonEl === venusEl) {
      venusBonus = 0.2;
      interiorSignals.push(`Moon-Venus in same element (relational ease → +F)`);
    } else if ((moonEl === 'F' && venusEl === 'A') || (moonEl === 'A' && venusEl === 'F') ||
               (moonEl === 'W' && venusEl === 'E') || (moonEl === 'E' && venusEl === 'W')) {
      venusBonus = 0.1;
      interiorSignals.push(`Moon-Venus in compatible elements (relational flow)`);
    }
  } else if (venusEl) {
    interiorSignals.push(`Venus in ${ELEMENT_NAMES[venusEl]}`);
  }
  
  // Saturn dominance → T
  let saturnPenalty = 0;
  if (saturnEl) {
    saturnPenalty = -0.2; // Saturn presence leans T
    interiorSignals.push(`Saturn in ${ELEMENT_NAMES[saturnEl]} (structural weight → +T)`);
  }
  
  // MC/IC purpose-axis tone
  let mcBonus = 0;
  if (mcEl) {
    const mcFLeaning = mcEl === 'W' || mcEl === 'F';
    mcBonus = mcFLeaning ? 0.15 : -0.15;
    interiorSignals.push(`MC/IC in ${ELEMENT_NAMES[mcEl]} (${mcFLeaning ? 'F-lean purpose' : 'T-lean purpose'})`);
  }
  
  // Track Contact Resonance T-like appearances
  const mercury = positions['Mercury'] || positions['mercury'];
  const mercuryEl = elem(mercury?.sign);
  if (mercuryEl === 'A') {
    contactSignals.push(`Mercury in Air (T-like articulation style)`);
  } else if (mercuryEl === 'W') {
    contactSignals.push(`Mercury in Water (F-like articulation style)`);
  }
  
  // Calculate combined score
  // moonScore: 0.5 (T-lean) to 1.5 (F-lean)
  // Adjustments: venusBonus (+0.2 max), saturnPenalty (-0.2), mcBonus (±0.15)
  const combinedScore = moonScore + venusBonus + saturnPenalty + mcBonus;
  
  // Decision thresholds (heuristic)
  // >= 1.3 → F (strong)
  // <= 0.7 → T (strong)
  // Otherwise → hinge
  let value: string;
  if (combinedScore >= 1.3) value = 'F';
  else if (combinedScore <= 0.7) value = 'T';
  else value = combinedScore >= 1.0 ? 'F' : 'T';
  
  // Convert to -1..1 scale for confidence
  const score = Math.max(-1, Math.min(1, (combinedScore - 1.0) * 1.5));
  const confidence = scoreToConfidence(score);
  
  let reasoning = `Interior compass reads ${value}-like (${value === 'F' ? 'resonance-led evaluation' : 'structure-led evaluation'}). `;
  reasoning += `Key signals: ${interiorSignals.join('; ')}.`;
  if (contactSignals.length > 0) {
    const mismatch = (value === 'F' && contactSignals.some(s => s.includes('T-like'))) ||
                     (value === 'T' && contactSignals.some(s => s.includes('F-like')));
    if (mismatch) {
      reasoning += ` Note: ${contactSignals.join('; ')} may appear ${value === 'F' ? 'T' : 'F'}-like in conversation, but this is contact style, not decision architecture.`;
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
 * Sources (v1.3 — Clean Firewall):
 * 1. Moon modality (primary — emotional engine rhythm)
 * 2. Saturn structure-bias (secondary — architectural weight)
 * 
 * EXCLUDED (Contact Resonance — hard firewall):
 * - Sun modality (burn pattern, not interior rhythm)
 * - Ascendant modality (mask, not cognition)
 * - Mars modality (action style, not preference)
 */
function axisJP(positions: Record<string, any>, ascSign: string | null): AxisDetail {
  const interiorSignals: string[] = [];
  const contactSignals: string[] = [];
  
  // Primary: Moon modality (emotional engine rhythm)
  const moon = positions['Moon'] || positions['moon'];
  const moonMod = mod(moon?.sign);
  let moonScore = 0;
  if (moonMod) {
    const jLeaning = moonMod === 'C' || moonMod === 'F';
    moonScore = jLeaning ? 1.0 : 0.0;
    interiorSignals.push(`Moon in ${MODALITY_NAMES[moonMod]} (${jLeaning ? 'closure-seeking emotional rhythm' : 'open-form emotional rhythm'})`);
  }
  
  // Secondary: Saturn structure-bias
  const saturn = positions['Saturn'] || positions['saturn'];
  const saturnMod = mod(saturn?.sign);
  let saturnBias = 0;
  if (saturnMod) {
    const jLeaning = saturnMod === 'C' || saturnMod === 'F';
    saturnBias = jLeaning ? 0.3 : -0.2;
    interiorSignals.push(`Saturn in ${MODALITY_NAMES[saturnMod]} (${jLeaning ? 'structured architect' : 'flexible architect'})`);
  } else if (saturn?.sign) {
    // Saturn present but modality unclear — still adds J weight
    saturnBias = 0.1;
    interiorSignals.push(`Saturn present (structural weight toward closure)`);
  }
  
  // Track Contact Resonance (for explanation, NOT for scoring)
  const sun = positions['Sun'] || positions['sun'];
  const sunMod = mod(sun?.sign);
  if (sunMod) {
    const jLeaning = sunMod === 'C' || sunMod === 'F';
    contactSignals.push(`Sun in ${MODALITY_NAMES[sunMod]} (${jLeaning ? 'J-like' : 'P-like'} expression)`);
  }
  const ascMod = mod(ascSign);
  if (ascMod) {
    const jLeaning = ascMod === 'C' || ascMod === 'F';
    contactSignals.push(`Ascendant in ${MODALITY_NAMES[ascMod]} (${jLeaning ? 'J-like' : 'P-like'} interface)`);
  }
  const mars = positions['Mars'] || positions['mars'];
  const marsMod = mod(mars?.sign);
  if (marsMod) {
    const jLeaning = marsMod === 'C' || marsMod === 'F';
    contactSignals.push(`Mars in ${MODALITY_NAMES[marsMod]} (${jLeaning ? 'J-like' : 'P-like'} action)`);
  }
  
  // Calculate score: Moon modality + Saturn bias
  const rawScore = moonScore + saturnBias;
  // Range: 0.0 (Mutable Moon, flexible Saturn) to 1.3 (Fixed Moon, Fixed Saturn)
  // Convert to -1..1 scale centered at 0.5
  const score = Math.max(-1, Math.min(1, (rawScore - 0.5) * 1.5));
  
  const value = score >= 0 ? 'J' : 'P';
  const confidence = scoreToConfidence(score);
  
  let reasoning = `Interior compass reads ${value}-like (${value === 'J' ? 'closure-seeking rhythm' : 'open-form rhythm'}). `;
  reasoning += `Key signals: ${interiorSignals.join('; ')}.`;
  if (contactSignals.length > 0) {
    const mismatch = (value === 'P' && contactSignals.some(s => s.includes('J-like'))) ||
                     (value === 'J' && contactSignals.some(s => s.includes('P-like')));
    if (mismatch) {
      reasoning += ` Note: Contact layer shows ${value === 'P' ? 'J' : 'P'}-like signals (${contactSignals.join('; ')}), but these describe action style, not interior preference.`;
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

/**
 * Per-axis reasoning with falsifiability (v1.2)
 */
export interface AxisReasoning {
  value: string;
  confidence: ConfidenceLevel;
  reasoning: string;
  falsifiability: string;
}

/**
 * Full MBTI analysis package with per-axis reasoning (v1.2)
 */
export interface MbtiHint {
  /** Four-letter tendency code (symbolic resonance, not assertion) */
  code: string;
  /** Per-axis scores (-1..1) for backstage context only */
  _axes?: { EI: number; NS: number; TF: number; JP: number };
  /** Layer separation metadata */
  _layer_note?: string;
  /** v1.2: Per-axis reasoning and falsifiability */
  axisReasoning?: {
    EI: AxisReasoning;
    NS: AxisReasoning;
    TF: AxisReasoning;
    JP: AxisReasoning;
  };
  /** v1.2: Global confidence summary */
  globalSummary?: string;
}

export interface ContactResonance {
  /** Describes interface behavior, NOT cognitive preference */
  ignition_style: string;
  interface_tone: string;
  presentation_tempo: string;
  /** v1.2: Signals that may create E/I appearance mismatch */
  ei_appearance_note?: string;
  /** v1.2: Signals that may create T/F appearance mismatch */
  tf_appearance_note?: string;
}

export interface PoeticBrainContext {
  /** Symbolic phrases for narrative context (never raw MBTI codes frontstage) */
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

/**
 * Format MBTI hint into symbolic phrases for Poetic Brain context.
 * Returns null if hint is invalid.
 * 
 * @internal backstage only - provides narrative context without raw codes
 */
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

/**
 * Infer Contact Resonance (interface behavior) from chart geometry.
 * This is SEPARATE from MBTI inference and describes how others experience the person.
 * 
 * v1.2: Now includes appearance mismatch notes for E/I and T/F
 * 
 * @internal backstage only - provides context for Poetic Brain without conflating with MBTI
 */
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

/**
 * Build global summary from axis details
 */
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
  
  let summary = `Interior compass best-fit: ${ei.value}${ns.value}${tf.value}${jp.value}. `;
  if (strongAxes.length > 0) {
    summary += `Strong signals on ${strongAxes.join(', ')}. `;
  }
  if (softAxes.length > 0) {
    summary += `Softer reads on ${softAxes.join(', ')} — these may shift under different contexts. `;
  }
  summary += `All four axes received a call; none left ambiguous per Protocol Rule A.`;
  
  return summary;
}

/**
 * Infer MBTI-like tendency from chart geometry (Interior Compass layer only).
 * Returns null if insufficient data.
 * 
 * v1.2: Returns full AxisReasoning with per-axis falsifiability clauses.
 * Protocol Rules:
 * - Rule A: No Axis Left Uncalled — every axis gets a best-fit
 * - Rule B: Layer-Based Tie-Breaker — when score ≈ 0, use Moon first, Saturn second
 * - Rule C: Falsifiability Required — every call comes with a testable expectation
 * 
 * EXCLUDES Contact Resonance signals (Ascendant, Mars, Mercury-tempo, Sun presentation)
 * Uses only Interior Compass signals (Moon, MC/IC, Saturn, Venus-Moon-Saturn interplay)
 * 
 * @internal backstage only
 */
export function inferMbtiFromChart(chart?: ChartInput | null): MbtiHint | null {
  if (!chart?.positions || Object.keys(chart.positions).length < 3) return null;

  // MC sign for T/F purpose-axis tone only
  const mc = chart.angle_signs?.midheaven ??
    chart.angle_signs?.['Midheaven'] ??
    chart.angle_signs?.['MC'] ??
    (chart.angle_signs as any)?.mc ??
    null;

  // Ascendant for Contact Resonance tracking only (NOT used for scoring)
  const asc = chart.angle_signs?.ascendant ??
    chart.angle_signs?.['Ascendant'] ??
    (chart.angle_signs as any)?.asc ??
    null;

  // v1.3 Clean Firewall axis functions:
  // E/I: Moon element + Saturn bias (Sun polarity EXCLUDED)
  // N/S: Sun element + Mercury element (perception architecture)
  // T/F: Moon element + Venus/Saturn + MC/IC tone
  // J/P: Moon modality + Saturn bias (Sun/ASC modality EXCLUDED)
  const ei = axisEI(chart.positions, asc);
  const ns = axisNS(chart.positions);
  const tf = axisTF(chart.positions, mc);
  const jp = axisJP(chart.positions, asc);

  return {
    code: `${ei.value}${ns.value}${tf.value}${jp.value}`,
    _axes: { EI: ei.score, NS: ns.score, TF: tf.score, JP: jp.score },
    _layer_note: 'Interior Compass only — Contact Resonance excluded per v1.2 protocol',
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
