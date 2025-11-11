// Persona + FIELD → MAP → VOICE shaping utilities.
// Ensures conditional, falsifiable language with persona-specific tone controls.

export type PersonaMode = 'plain' | 'hybrid' | 'poetic';

export interface PersonaConfig {
  mode?: PersonaMode;
}

export interface RavenDeltaContext {
  hook?: string;
  climate?: string;
  section?: 'mirror' | 'polarity' | 'meter';
}

const DEFAULT_MODE: PersonaMode = 'hybrid';
const EXTENDED_PICTO_REGEX = /\p{Extended_Pictographic}/gu;

const HYBRID_ALLOWED_EMOJI = ['🌬️', '🔥', '🌊', '🌱', '⭐', '⚡'];
const POETIC_ALLOWED_EMOJI = ['🌬️', '🔥', '🌊', '🌱', '⭐', '⚡', '🌙', '✨', '🪶', '🌌'];

type MetaphorStyle = 'none' | 'light' | 'rich';

interface MetaphorEntry {
  pattern: RegExp;
  hybrid: string;
  poetic: string;
}

const METAPHOR_TABLE: MetaphorEntry[] = [
  {
    pattern: /\bpressure\b/i,
    hybrid: 'pressure—like wind leaning against the windows',
    poetic: 'pressure—like moonlit tides pulling at shoreline bones',
  },
  {
    pattern: /\btension\b/i,
    hybrid: 'tension humming like a wire just before dawn',
    poetic: 'tension singing like silver wire in night air',
  },
  {
    pattern: /\bclarity\b/i,
    hybrid: 'clarity arriving like a compass catching north',
    poetic: 'clarity pouring in like dawn through a skylight',
  },
];

export const PERSONA_MODES: PersonaMode[] = ['plain', 'hybrid', 'poetic'];

export function resolvePersonaMode(input: unknown, fallback: PersonaMode = DEFAULT_MODE): PersonaMode {
  const allowed = new Set(PERSONA_MODES);
  if (typeof input === 'string') {
    const lowered = input.trim().toLowerCase();
    if (allowed.has(lowered as PersonaMode)) return lowered as PersonaMode;
  } else if (input && typeof input === 'object') {
    const candidate = (input as PersonaConfig).mode;
    if (typeof candidate === 'string') {
      const lowered = candidate.trim().toLowerCase();
      if (allowed.has(lowered as PersonaMode)) return lowered as PersonaMode;
    }
  }
  return fallback;
}

export function shapeVoice(raw: string, ctx: RavenDeltaContext, config?: PersonaConfig): string {
  const mode = resolvePersonaMode(config?.mode, DEFAULT_MODE);
  let out = typeof raw === 'string' ? raw : '';
  out = out || 'Listening.';

  out = enforceConditionalLanguage(out);
  out = guardCausality(out);
  out = tidyWhitespace(out);

  switch (mode) {
    case 'plain':
      out = filterEmoji(out, [], 0);
      out = applyMetaphors(out, 'none');
      break;
    case 'hybrid':
      out = filterEmoji(out, HYBRID_ALLOWED_EMOJI, 1);
      out = applyMetaphors(out, 'light');
      break;
    case 'poetic':
      out = filterEmoji(out, POETIC_ALLOWED_EMOJI, 3);
      out = applyMetaphors(out, 'rich');
      break;
  }

  if (ctx.section === 'mirror') {
    out = ensureTrailingAudit(out);
  }

  return out;
}

export function pickClimate(seed: string) {
  // Simple deterministic tags based on hash of seed
  const h = hash(seed);
  const mags = ['⚡ Pulse', '⚡ Stirring', '⚡ Convergence']; // Using official magnitude scale
  const vals = ['🌞 Supportive', '🌗 Mixed', '🌑 Restrictive'];
  const vols = ['🌪 Low', '🌪 Scattered', '🌪 Active'];
  return `${mags[h % 3]} · ${vals[h % 3]} · ${vols[h % 3]}`;
}

function enforceConditionalLanguage(text: string): string {
  return text
    .replace(/\b(?:is|are|was|were|will|always)\b/gi, (match) => (match.toLowerCase() === 'always' ? 'often' : 'may'))
    .replace(/\bmust\b/gi, 'may need to');
}

function guardCausality(text: string): string {
  return text.replace(/causes?/gi, 'may correlate with');
}

function tidyWhitespace(text: string): string {
  return text.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

function filterEmoji(text: string, allowed: string[], maxCount: number): string {
  let count = 0;
  const normalizedAllowed = allowed.map(normalizeEmojiSymbol);
  return text.replace(EXTENDED_PICTO_REGEX, (match) => {
    const normalized = normalizeEmojiSymbol(match);
    if (!normalizedAllowed.includes(normalized)) return '';
    if (count >= maxCount) return '';
    count += 1;
    return match;
  });
}

function applyMetaphors(text: string, style: MetaphorStyle): string {
  if (style === 'none') return text;
  for (const entry of METAPHOR_TABLE) {
    if (entry.pattern.test(text)) {
      const replacement = style === 'light' ? entry.hybrid : entry.poetic;
      return text.replace(entry.pattern, replacement);
    }
  }
  return text;
}

function ensureTrailingAudit(text: string): string {
  const audit = '<small style="opacity:.6">(If no resonance: mark OSR—null data is valid.)</small>';
  if (text.includes(audit)) return text;
  return `${text}\n\n${audit}`;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function normalizeEmojiSymbol(symbol: string): string {
  return symbol.replace(/\uFE0F/g, '');
}
