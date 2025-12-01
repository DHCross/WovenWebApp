/**
 * Shared utilities for the Poetic Brain runtime. Centralises the
 * OPERATIONAL_FLOW constant, resonance classification, and language guards.
 */

export const OPERATIONAL_FLOW = [
  'MathBrain',
  'Seismograph',
  'BalanceMeter',
  'PoeticBrain',
  'Mirror/WovenMap',
] as const;

export type OperationalStage = (typeof OPERATIONAL_FLOW)[number];
export type ResonanceTier = 'WB' | 'ABE' | 'OSR';

/**
 * Classify a resonance ping into the WB / ABE / OSR schema.
 * `true` => WB, `"partial"` => ABE, everything else => OSR (valid null data).
 */
export function classifyResonance(ping: unknown): ResonanceTier {
  if (ping === true || ping === 'true' || ping === 'WB') return 'WB';
  if (ping === 'partial' || ping === 'ABE' || ping === 'edge') return 'ABE';
  return 'OSR';
}

const DIAGNOSTIC_WORDS = /\b(cause|causes|causing|caused|fate|fated|destiny|destined)\b/gi;
// Tighter patterns - only catch clearly charged questions (no global flag to avoid stateful .test)
const RELATIONAL_QUESTION_PATTERN = /\b(?:why|what)\s+(?:does|did|is|was)\s+(?:she|he|they)\s+(?:think|feel|want|hate|love|avoid|reject|abandon)\b/i;
const RELATIONAL_PRONOUNS = /\b(she|her|hers|he|him|his|they|them|their|theirs)\b/gi;
// Stronger emotional charge words - only clear distress signals
const EMOTIONAL_CHARGE_WORDS = /\b(grief|hurt|betrayal|heartbreak|silent treatment|stonewall|ghost|withdraw|abandon|reject|rage|resent|panic|devastated)\b/i;

/**
 * Replace deterministic language with conditional phrasing.
 * Keeps the surrounding text intact while softening certainty.
 */
export function replaceWithConditional(input: string): string {
  return input.replace(DIAGNOSTIC_WORDS, (match) => {
    const lower = match.toLowerCase();
    if (lower.startsWith('cause')) return 'may shape';
    if (lower.startsWith('destin')) return 'could invite';
    if (lower.startsWith('fate')) return 'tends to lean';
    return 'may influence';
  });
}

export interface RelationalCharge {
  charged: boolean;
  reframed?: string;
}

/**
 * Detect relationally charged questions ("Why does she...?", etc.) and
 * rewrite them to describe the space between people rather than motives.
 */
export function softReframeRelationalQuestion(input: string): RelationalCharge {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return { charged: false };
  }

  const trimmed = input.trim();
  const hasDirectQuestion = RELATIONAL_QUESTION_PATTERN.test(trimmed);
  const hasChargeWords = EMOTIONAL_CHARGE_WORDS.test(trimmed);

  // Only intervene with clear emotional charge + direct question about motives
  if (!hasDirectQuestion || !hasChargeWords) {
    return { charged: false };
  }

  let reframed = trimmed
    .replace(/\bwhy\s+does\s+(?:she|he|they)\s+(?:think|feel)\b/gi, 'what shifts between you when')
    .replace(/\bwhat\s+is\s+(?:she|he|they)\s+(?:thinking|feeling)\b/gi, 'what kind of pressure you notice in the space between you');

  reframed = reframed.replace(RELATIONAL_PRONOUNS, (match) => {
    const lower = match.toLowerCase();
    if (lower === 'she' || lower === 'he' || lower === 'they') {
      return 'the other person';
    }
    if (lower === 'her' || lower === 'him' || lower === 'them') {
      return 'the other person';
    }
    if (lower === 'hers' || lower === 'his' || lower === 'theirs') {
      return 'the other person\'s';
    }
    if (lower === 'their') {
      return 'the other person\'s';
    }
    return match;
  });

  return { charged: true, reframed };
}

/**
 * Ensure every charged reflection invites user resonance instead of assuming correctness.
 */
export function ensureResonanceInvitation(input: string): string {
  if (typeof input !== 'string' || input.trim().length === 0) return input;
  const normalized = input.trim();
  const alreadyInvites = /does that (feel|line up)|is that close|resonate|track/i.test(normalized);
  if (alreadyInvites) return normalized;
  
  // Only add resonance invitation for clearly reflective statements
  const hasReflectiveContent = /\b(might|could|may|tend|often|sometimes|usually)\b/i.test(normalized);
  if (!hasReflectiveContent) return normalized;
  
  return `${normalized}\n\nDoes that feel close to what you're living, or is it off in an important way?`;
}

/**
 * Apply the relational reframing + resonance guard when text is charged.
 */
export function enforceRelationalMirrorTone(input: string): { text: string; relational: boolean } {
  const { charged, reframed } = softReframeRelationalQuestion(input);
  if (!charged) {
    return { text: input, relational: false };
  }
  const reframedText = reframed ?? input;
  return { text: ensureResonanceInvitation(reframedText), relational: true };
}

/**
 * Determine whether the provided geometry payload counts as validated.
 * Requires placements to exist and at least one aspect or summary datum.
 */
export function isGeometryValidated(geo: any): boolean {
  if (!geo || typeof geo !== 'object') return false;
  const placements = Array.isArray(geo.placements) ? geo.placements : [];
  const aspects = Array.isArray(geo.aspects) ? geo.aspects : [];
  const hasSummary = geo.summary && typeof geo.summary === 'object';
  return placements.length > 0 && (aspects.length > 0 || hasSummary);
}

/**
 * Resolve relocation disclosure copy for felt weather vs natal blueprint.
 */
export function resolveRelocationDisclosure(relocationFrame?: string | null): string {
  if (typeof relocationFrame !== 'string' || relocationFrame.trim().length === 0) {
    return 'Natal (baseline blueprint)';
  }
  const normalized = relocationFrame.trim().toLowerCase();
  if (normalized === 'relocated' || normalized === 'felt' || normalized.includes('felt')) {
    return 'Relocated (felt weather)';
  }
  if (normalized.includes('relocate') || normalized.includes('relocated')) {
    return 'Relocated (felt weather)';
  }
  return 'Natal (baseline blueprint)';
}

const EPRIME_TARGETED_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bI'm\b/gi, 'I feel'],
  [/\bI am\b/gi, 'I feel'],
  [/\byou're\b/gi, 'you feel'],
  [/\bYou are\b/gi, 'You feel'],
  [/\bwe're\b/gi, 'we feel'],
  [/\bWe are\b/gi, 'We feel'],
  [/\bthey're\b/gi, 'they feel'],
  [/\bThey are\b/gi, 'They feel'],
  [/\bhe's\b/gi, 'he tends to'],
  [/\bHe is\b/gi, 'He tends to'],
  [/\bshe's\b/gi, 'she tends to'],
  [/\bShe is\b/gi, 'She tends to'],
  [/\bit's\b/gi, 'it tends to'],
  [/\bIt is\b/gi, 'It tends to'],
  [/\bthat's\b/gi, 'that tends to'],
  [/\bThat is\b/gi, 'That tends to'],
  [/\bwhat's\b/gi, 'what tends to'],
  [/\bwho's\b/gi, 'who tends to'],
  [/\bthere's\b/gi, 'there tends to show up'],
  [/\bThere is\b/gi, 'There tends to show up'],
  [/\bthere are\b/gi, 'there tend to show up'],
];

const EPRIME_GENERAL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bisn't\b/gi, 'does not feel'],
  [/\baren't\b/gi, 'do not show up as'],
  [/\bwasn't\b/gi, 'did not show up as'],
  [/\bweren't\b/gi, 'did not show up as'],
  [/\bain't\b/gi, 'does not land as'],
  [/\bbeen\b/gi, 'shown up as'],
  [/\bbeing\b/gi, 'showing up as'],
  [/\bwas\b/gi, 'showed up as'],
  [/\bwere\b/gi, 'showed up as'],
  [/\b\bis\b/gi, 'feels'],
  [/\bare\b/gi, 'show up as'],
  [/\bbe\b/gi, 'show up as'],
];

/**
 * Apply a light E-Prime filter to remove deterministic copula verbs.
 * Not a full linguistic rewrite, but enough to prefer agency-friendly phrasing.
 */
export function applyEPrimeFilter(input: string): string {
  if (typeof input !== 'string' || input.trim().length === 0) return input;
  let text = input;

  for (const [pattern, replacement] of EPRIME_TARGETED_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of EPRIME_GENERAL_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s+/g, ' ').trim();
}
