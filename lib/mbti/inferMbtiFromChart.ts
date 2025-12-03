/**
 * MBTI Correspondence Inference — Backstage Only
 * 
 * Subtle heuristic mapping from chart geometry to MBTI-like tendencies.
 * NEVER used frontstage; only supplies symbolic context for Poetic Brain.
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

// ─────────────────────────────────────────────────────────────────────────────
// Axis Scores (internal, terse)
// ─────────────────────────────────────────────────────────────────────────────

interface Axis { s: number; l: string } // score (-1..1), letter

function axisEI(asc: string | null, positions: Record<string, any>): Axis {
  const ascEl = elem(asc);
  if (ascEl) {
    const outward = ascEl === 'F' || ascEl === 'A';
    return { s: outward ? 0.8 : -0.8, l: outward ? 'E' : 'I' };
  }
  let f = 0, e = 0, a = 0, w = 0;
  for (const p of Object.values(positions)) {
    const el = elem(p?.sign);
    if (el === 'F') f++; else if (el === 'E') e++; else if (el === 'A') a++; else if (el === 'W') w++;
  }
  const out = f + a, inn = e + w;
  const diff = out - inn;
  const s = diff / Math.max(1, out + inn);
  return { s, l: s >= 0 ? 'E' : 'I' };
}

function axisNS(positions: Record<string, any>): Axis {
  const mer = positions['Mercury'] || positions['mercury'];
  const merEl = elem(mer?.sign);
  if (merEl) {
    const intuit = merEl === 'A' || merEl === 'F';
    return { s: intuit ? 0.7 : -0.7, l: intuit ? 'N' : 'S' };
  }
  return { s: 0, l: 'N' }; // default slight intuition
}

function axisTF(positions: Record<string, any>): Axis {
  let air = 0, water = 0;
  for (const p of Object.values(positions)) {
    const el = elem(p?.sign);
    if (el === 'A') air++; else if (el === 'W') water++;
  }
  if (air > water) return { s: 0.6, l: 'T' };
  if (water > air) return { s: -0.6, l: 'F' };
  return { s: 0, l: 'T' };
}

function axisJP(positions: Record<string, any>): Axis {
  let cf = 0, m = 0;
  for (const p of Object.values(positions)) {
    const mo = mod(p?.sign);
    if (mo === 'C' || mo === 'F') cf++; else if (mo === 'M') m++;
  }
  if (cf > m) return { s: 0.6, l: 'J' };
  if (m > cf) return { s: -0.6, l: 'P' };
  return { s: 0, l: 'J' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Interface (minimal footprint)
// ─────────────────────────────────────────────────────────────────────────────

export interface MbtiHint {
  /** Four-letter tendency code (symbolic resonance, not assertion) */
  code: string;
  /** Per-axis scores (-1..1) for backstage context only */
  _axes?: { EI: number; NS: number; TF: number; JP: number };
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
 * Infer MBTI-like tendency from chart geometry.
 * Returns null if insufficient data.
 * 
 * @internal backstage only
 */
export function inferMbtiFromChart(chart?: ChartInput | null): MbtiHint | null {
  if (!chart?.positions || Object.keys(chart.positions).length < 3) return null;

  const asc =
    chart.angle_signs?.ascendant ??
    chart.angle_signs?.['Ascendant'] ??
    (chart.angle_signs as any)?.asc ??
    null;

  const ei = axisEI(asc, chart.positions);
  const ns = axisNS(chart.positions);
  const tf = axisTF(chart.positions);
  const jp = axisJP(chart.positions);

  return {
    code: `${ei.l}${ns.l}${tf.l}${jp.l}`,
    _axes: { EI: ei.s, NS: ns.s, TF: tf.s, JP: jp.s },
  };
}

export default inferMbtiFromChart;
