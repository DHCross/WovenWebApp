/**
 * MBTI Correspondence Inference from Woven Map Chart Geometry
 * 
 * This module infers MBTI-like preference tendencies from natal chart data
 * using the Woven Map ⇄ MBTI Correspondence Table.
 * 
 * IMPORTANT: This is for BACKSTAGE/INTERNAL use only.
 * - Never assert "you ARE an INTJ" — only "your chart geometry resonates with..."
 * - Poetic Brain uses this for context, not diagnosis
 * - Frontstage output should use symbolic language, not MBTI codes
 * 
 * @module lib/mbti/inferMbtiFromChart
 */

import correspondenceData from './woven_map_mbti_correspondence.json';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChartPosition {
  sign?: string;
  deg?: number;
  abs_pos?: number;
  house?: number | string;
  retro?: boolean;
  retrograde?: boolean;
}

export interface ChartData {
  positions?: Record<string, ChartPosition>;
  angle_signs?: {
    ascendant?: string;
    mc?: string;
    descendant?: string;
    ic?: string;
  };
  cusps?: number[];
}

export interface AxisScore {
  /** Score from -1 (first preference) to +1 (second preference) */
  score: number;
  /** Confidence 0-1 based on how many indicators were present */
  confidence: number;
  /** Which preference is indicated: 'E'|'I', 'N'|'S', 'T'|'F', 'J'|'P' */
  indicated: string;
  /** Human-readable explanation */
  rationale: string[];
}

export interface MbtiCorrespondence {
  /** Four-letter code like "INTJ" — use with caution, symbolic only */
  code: string;
  /** Individual axis breakdowns */
  axes: {
    EI: AxisScore;
    NS: AxisScore;
    TF: AxisScore;
    JP: AxisScore;
  };
  /** Overall confidence 0-1 */
  confidence: number;
  /** Archetypal motion phrase from correspondence table */
  archetypal_motion: string | null;
  /** Symbolic phrases for Poetic Brain */
  symbolic_phrases: string[];
  /** Detected hinge points (where user might straddle two types) */
  hinge_points: string[];
  /** Disclaimer for any output */
  disclaimer: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SIGN_ELEMENTS: Record<string, string> = correspondenceData.sign_elements;
const SIGN_MODALITIES: Record<string, string> = correspondenceData.sign_modalities;
const SIGN_POLARITIES: Record<string, string> = correspondenceData.sign_polarities;

// Normalize sign names (handle various formats)
const SIGN_NORMALIZE: Record<string, string> = {
  'aries': 'Ari', 'ari': 'Ari',
  'taurus': 'Tau', 'tau': 'Tau',
  'gemini': 'Gem', 'gem': 'Gem',
  'cancer': 'Can', 'can': 'Can',
  'leo': 'Leo',
  'virgo': 'Vir', 'vir': 'Vir',
  'libra': 'Lib', 'lib': 'Lib',
  'scorpio': 'Sco', 'sco': 'Sco',
  'sagittarius': 'Sag', 'sag': 'Sag',
  'capricorn': 'Cap', 'cap': 'Cap',
  'aquarius': 'Aqu', 'aqu': 'Aqu',
  'pisces': 'Pis', 'pis': 'Pis',
};

function normalizeSign(sign: string | undefined): string | null {
  if (!sign) return null;
  const lower = sign.toLowerCase().slice(0, 3);
  // Check if it's already a 3-letter code
  const normalized = SIGN_NORMALIZE[lower] || SIGN_NORMALIZE[sign.toLowerCase()];
  if (normalized) return normalized;
  // Try matching first 3 chars to known signs
  for (const [key, val] of Object.entries(SIGN_NORMALIZE)) {
    if (key.startsWith(lower)) return val;
  }
  return null;
}

function getElement(sign: string | undefined): string | null {
  const norm = normalizeSign(sign);
  return norm ? SIGN_ELEMENTS[norm] || null : null;
}

function getModality(sign: string | undefined): string | null {
  const norm = normalizeSign(sign);
  return norm ? SIGN_MODALITIES[norm] || null : null;
}

function getPolarity(sign: string | undefined): string | null {
  const norm = normalizeSign(sign);
  return norm ? SIGN_POLARITIES[norm] || null : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Axis Inference Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * E/I Axis: Outward-first vs. Inward-first Motion
 * 
 * Key indicators:
 * - Ascendant sign element/polarity
 * - Overall element balance (Fire/Air vs Earth/Water)
 * - Sun placement
 */
function inferEI(chart: ChartData): AxisScore {
  const rationale: string[] = [];
  let score = 0; // Negative = E, Positive = I
  let indicators = 0;

  // 1. Ascendant sign
  const ascSign = chart.angle_signs?.ascendant;
  if (ascSign) {
    const ascElement = getElement(ascSign);
    const ascPolarity = getPolarity(ascSign);
    const ascModality = getModality(ascSign);

    if (ascPolarity === 'positive') {
      score -= 0.3;
      rationale.push(`Ascendant in ${ascSign} (positive polarity) → outward-first`);
    } else if (ascPolarity === 'negative') {
      score += 0.3;
      rationale.push(`Ascendant in ${ascSign} (negative polarity) → inward-first`);
    }

    if (ascModality === 'Cardinal') {
      score -= 0.1;
      rationale.push(`Cardinal rising → initiative through contact`);
    } else if (ascModality === 'Fixed') {
      score += 0.1;
      rationale.push(`Fixed rising → depth before movement`);
    }

    indicators++;
  }

  // 2. Element balance across personal planets
  const personalPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];
  let fireAir = 0, earthWater = 0;

  for (const planet of personalPlanets) {
    const pos = chart.positions?.[planet];
    if (pos?.sign) {
      const elem = getElement(pos.sign);
      if (elem === 'Fire' || elem === 'Air') fireAir++;
      else if (elem === 'Earth' || elem === 'Water') earthWater++;
    }
  }

  if (fireAir + earthWater > 0) {
    indicators++;
    const balance = (fireAir - earthWater) / (fireAir + earthWater);
    score -= balance * 0.3; // More Fire/Air = more E
    if (fireAir > earthWater) {
      rationale.push(`Fire/Air dominance (${fireAir}/${fireAir + earthWater}) → extroverted orientation`);
    } else if (earthWater > fireAir) {
      rationale.push(`Earth/Water dominance (${earthWater}/${fireAir + earthWater}) → introverted orientation`);
    }
  }

  // 3. Sun placement (angular = more visible/extroverted tendency)
  const sun = chart.positions?.['Sun'];
  if (sun?.house) {
    const house = typeof sun.house === 'number' ? sun.house : parseInt(sun.house) || 0;
    if ([1, 4, 7, 10].includes(house)) {
      score -= 0.1;
      rationale.push(`Angular Sun (house ${house}) → visible expression`);
      indicators++;
    }
  }

  const confidence = Math.min(1, indicators / 3);
  const indicated = score <= 0 ? 'E' : 'I';

  return {
    score: Math.max(-1, Math.min(1, score)),
    confidence,
    indicated,
    rationale,
  };
}

/**
 * N/S Axis: Pattern-first vs. Concrete-first Perception
 * 
 * Key indicators:
 * - Mercury sign element (Air/Fire = N, Earth/Water = S)
 * - Moon sign element
 * - Saturn emphasis (strong Saturn = S tendency)
 */
function inferNS(chart: ChartData): AxisScore {
  const rationale: string[] = [];
  let score = 0; // Negative = N, Positive = S
  let indicators = 0;

  // 1. Mercury sign (primary indicator)
  const mercury = chart.positions?.['Mercury'];
  if (mercury?.sign) {
    const elem = getElement(mercury.sign);
    indicators++;
    if (elem === 'Air' || elem === 'Fire') {
      score -= 0.4;
      rationale.push(`Mercury in ${mercury.sign} (${elem}) → pattern-first perception`);
    } else if (elem === 'Earth' || elem === 'Water') {
      score += 0.4;
      rationale.push(`Mercury in ${mercury.sign} (${elem}) → concrete-first perception`);
    }
  }

  // 2. Moon sign
  const moon = chart.positions?.['Moon'];
  if (moon?.sign) {
    const elem = getElement(moon.sign);
    indicators++;
    if (elem === 'Air') {
      score -= 0.2;
      rationale.push(`Moon in ${moon.sign} (Air) → abstract emotional processing`);
    } else if (elem === 'Water') {
      // Water Moon is ambiguous — can be intuitive (N) or sensory-deep (S)
      score -= 0.1;
      rationale.push(`Moon in ${moon.sign} (Water) → intuitive-feeling blend`);
    } else if (elem === 'Earth') {
      score += 0.2;
      rationale.push(`Moon in ${moon.sign} (Earth) → grounded emotional needs`);
    }
  }

  // 3. Saturn emphasis (angular or aspecting Mercury)
  const saturn = chart.positions?.['Saturn'];
  if (saturn?.house) {
    const house = typeof saturn.house === 'number' ? saturn.house : parseInt(saturn.house) || 0;
    if ([1, 4, 7, 10].includes(house)) {
      score += 0.15;
      rationale.push(`Angular Saturn → concrete verification tendency`);
      indicators++;
    }
  }

  const confidence = Math.min(1, indicators / 3);
  const indicated = score <= 0 ? 'N' : 'S';

  return {
    score: Math.max(-1, Math.min(1, score)),
    confidence,
    indicated,
    rationale,
  };
}

/**
 * T/F Axis: Structure-led vs. Resonance-led Evaluation
 * 
 * Key indicators:
 * - Air emphasis = T, Water/Venus emphasis = F
 * - Mercury-Saturn aspects (T)
 * - Moon-Venus strength (F)
 */
function inferTF(chart: ChartData): AxisScore {
  const rationale: string[] = [];
  let score = 0; // Negative = T, Positive = F
  let indicators = 0;

  // 1. Count Air vs Water placements
  const decisionPlanets = ['Mercury', 'Venus', 'Mars', 'Jupiter'];
  let airCount = 0, waterFireCount = 0;

  for (const planet of decisionPlanets) {
    const pos = chart.positions?.[planet];
    if (pos?.sign) {
      const elem = getElement(pos.sign);
      if (elem === 'Air') airCount++;
      if (elem === 'Water' || elem === 'Fire') waterFireCount++;
    }
  }

  if (airCount + waterFireCount > 0) {
    indicators++;
    if (airCount > waterFireCount) {
      score -= 0.3;
      rationale.push(`Air emphasis (${airCount} placements) → analytical decision-making`);
    } else if (waterFireCount > airCount) {
      score += 0.3;
      rationale.push(`Water/Fire emphasis → values-resonant decision-making`);
    }
  }

  // 2. Venus placement strength
  const venus = chart.positions?.['Venus'];
  if (venus?.sign) {
    const elem = getElement(venus.sign);
    indicators++;
    if (elem === 'Earth' || elem === 'Water') {
      score += 0.2;
      rationale.push(`Venus in ${venus.sign} → relational coherence priority`);
    } else if (elem === 'Air') {
      score -= 0.1;
      rationale.push(`Venus in ${venus.sign} → aesthetic logic`);
    }
  }

  // 3. Saturn angularity (T indicator)
  const saturn = chart.positions?.['Saturn'];
  if (saturn?.house) {
    const house = typeof saturn.house === 'number' ? saturn.house : parseInt(saturn.house) || 0;
    if ([1, 10].includes(house)) {
      score -= 0.2;
      rationale.push(`Angular Saturn → structure-first evaluation`);
      indicators++;
    }
  }

  const confidence = Math.min(1, indicators / 3);
  const indicated = score <= 0 ? 'T' : 'F';

  return {
    score: Math.max(-1, Math.min(1, score)),
    confidence,
    indicated,
    rationale,
  };
}

/**
 * J/P Axis: Closure-seeking vs. Open-form Movement
 * 
 * Key indicators:
 * - Modality balance (Cardinal/Fixed = J, Mutable = P)
 * - Uranus/Neptune prominence (P)
 * - Saturn/Pluto angularity (J)
 */
function inferJP(chart: ChartData): AxisScore {
  const rationale: string[] = [];
  let score = 0; // Negative = J, Positive = P
  let indicators = 0;

  // 1. Modality balance
  let cardinal = 0, fixed = 0, mutable = 0;
  const allPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

  for (const planet of allPlanets) {
    const pos = chart.positions?.[planet];
    if (pos?.sign) {
      const mod = getModality(pos.sign);
      if (mod === 'Cardinal') cardinal++;
      else if (mod === 'Fixed') fixed++;
      else if (mod === 'Mutable') mutable++;
    }
  }

  const total = cardinal + fixed + mutable;
  if (total > 0) {
    indicators++;
    const jScore = (cardinal + fixed) / total;
    const pScore = mutable / total;

    if (jScore > pScore) {
      score -= (jScore - pScore) * 0.5;
      rationale.push(`Cardinal/Fixed dominance (${cardinal + fixed}/${total}) → closure-seeking rhythm`);
    } else {
      score += (pScore - jScore) * 0.5;
      rationale.push(`Mutable dominance (${mutable}/${total}) → open-form rhythm`);
    }
  }

  // 2. Uranus/Neptune prominence (P indicators)
  const uranus = chart.positions?.['Uranus'];
  const neptune = chart.positions?.['Neptune'];

  if (uranus?.house) {
    const house = typeof uranus.house === 'number' ? uranus.house : parseInt(uranus.house) || 0;
    if ([1, 4, 7, 10].includes(house)) {
      score += 0.2;
      rationale.push(`Angular Uranus → adaptive, improvisational movement`);
      indicators++;
    }
  }

  // 3. Saturn angularity (J indicator)
  const saturn = chart.positions?.['Saturn'];
  if (saturn?.house) {
    const house = typeof saturn.house === 'number' ? saturn.house : parseInt(saturn.house) || 0;
    if ([1, 4, 7, 10].includes(house)) {
      score -= 0.2;
      rationale.push(`Angular Saturn → structural rhythm preference`);
      indicators++;
    }
  }

  const confidence = Math.min(1, indicators / 3);
  const indicated = score <= 0 ? 'J' : 'P';

  return {
    score: Math.max(-1, Math.min(1, score)),
    confidence,
    indicated,
    rationale,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Inference Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infer MBTI correspondence from chart geometry
 * 
 * @param chart - Chart data with positions and angles
 * @returns MbtiCorrespondence object with scores, code, and symbolic phrases
 */
export function inferMbtiFromChart(chart: ChartData | null | undefined): MbtiCorrespondence | null {
  if (!chart || !chart.positions || Object.keys(chart.positions).length === 0) {
    return null;
  }

  const axes = {
    EI: inferEI(chart),
    NS: inferNS(chart),
    TF: inferTF(chart),
    JP: inferJP(chart),
  };

  const code = `${axes.EI.indicated}${axes.NS.indicated}${axes.TF.indicated}${axes.JP.indicated}`;

  // Calculate overall confidence (average of axis confidences)
  const confidence = (axes.EI.confidence + axes.NS.confidence + axes.TF.confidence + axes.JP.confidence) / 4;

  // Get archetypal motion from two-letter patterns
  const archetypes = correspondenceData.archetypal_patterns as Record<string, { motion: string }>;
  const pattern1 = `${axes.EI.indicated}${axes.NS.indicated}`;
  const pattern2 = `${axes.TF.indicated}${axes.JP.indicated}`;
  const motion1 = archetypes[pattern1]?.motion;
  const motion2 = archetypes[pattern2]?.motion;
  const archetypal_motion = motion1 && motion2 ? `${motion1} + ${motion2}` : motion1 || motion2 || null;

  // Build symbolic phrases from axis symbolic language
  const symbolic_phrases: string[] = [];
  const axesData = correspondenceData.axes as Record<string, Record<string, { symbolic_language?: string[] }>>;
  
  for (const [axisKey, axis] of Object.entries(axes)) {
    const axisInfo = axesData[axisKey]?.[axis.indicated];
    if (axisInfo?.symbolic_language) {
      symbolic_phrases.push(axisInfo.symbolic_language[0]);
    }
  }

  // Detect hinge points (where score is close to 0)
  const hinge_points: string[] = [];
  const HINGE_THRESHOLD = 0.15;

  if (Math.abs(axes.EI.score) < HINGE_THRESHOLD) {
    hinge_points.push('E/I hinge: Fire ignition + Saturn-bound presence');
  }
  if (Math.abs(axes.NS.score) < HINGE_THRESHOLD) {
    hinge_points.push('N/S hinge: Pattern perception meets concrete verification');
  }
  if (Math.abs(axes.TF.score) < HINGE_THRESHOLD) {
    hinge_points.push('T/F hinge: Structure-led clarity serving resonance-led purpose');
  }
  if (Math.abs(axes.JP.score) < HINGE_THRESHOLD) {
    hinge_points.push('J/P hinge: Design impulse meets adaptive response');
  }

  return {
    code,
    axes,
    confidence,
    archetypal_motion,
    symbolic_phrases,
    hinge_points,
    disclaimer: 'Symbolic resonance only — not a typology assertion. Chart geometry suggests tendencies, not fixed identity.',
  };
}

/**
 * Format MBTI correspondence for Poetic Brain consumption
 * Uses symbolic language, never raw type codes in frontstage
 */
export function formatForPoeticBrain(correspondence: MbtiCorrespondence | null): string | null {
  if (!correspondence) return null;

  const lines: string[] = [];

  // Archetypal motion as lead
  if (correspondence.archetypal_motion) {
    lines.push(`Constitutional Motion: ${correspondence.archetypal_motion}`);
  }

  // Symbolic phrases
  if (correspondence.symbolic_phrases.length > 0) {
    lines.push(`Core Tendencies: ${correspondence.symbolic_phrases.join('; ')}`);
  }

  // Hinge points (areas of flexibility)
  if (correspondence.hinge_points.length > 0) {
    lines.push(`Flexibility Points: ${correspondence.hinge_points.join('; ')}`);
  }

  // Confidence note
  if (correspondence.confidence < 0.5) {
    lines.push('(Note: Limited chart data — tendencies approximate)');
  }

  return lines.join('\n');
}

export default inferMbtiFromChart;
