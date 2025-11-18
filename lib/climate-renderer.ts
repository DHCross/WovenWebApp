// Dynamic Climate Emoji Selection (Renderer-Only)
// Implements -5 to +5 valence mapping with emoji patterns per level
import { VALENCE_NEGATIVE, VALENCE_POSITIVE, ValenceMode } from './taxonomy';

export interface ClimateData {
  magnitude: number; // 0-5
  valence?: number;   // legacy -5 to +5 scale
  valence_bounded?: number; // preferred canonical valence (-5..+5)
  volatility: number; // 0-5
  drivers?: string[]; // today's active drivers (optional context)
}

export interface ForceWeights {
  orb: number;     // 🎯 proximity factor
  resonance: number; // 📡 amplification
  potency: number;   // 🪐 planetary weight
  recursion: number; // ♾️ repeated themes
  aspect: number;    // ∠ geometric angle
}

// Valence Level Mapping (-5 to +5)
export interface ValenceLevel {
  level: number;
  anchor: string;
  emojis: string[];
  description: string;
}

export const VALENCE_LEVELS: ValenceLevel[] = [
  { level: -5, anchor: 'Compression', emojis: ['🌋', '🧩', '⬇️'], description: 'Maximum restrictive tilt; deep inward compression' },
  { level: -4, anchor: 'Grind', emojis: ['🕰', '⚔', '🌪'], description: 'Sustained resistance; heavy duty load' },
  { level: -3, anchor: 'Friction', emojis: ['⚔', '🌊', '🌫'], description: 'Conflicts or cross-purposes slow motion' },
  { level: -2, anchor: 'Contraction', emojis: ['🌫', '🧩', '⬇️'], description: 'Narrowing options; ambiguity or energy drain' },
  { level: -1, anchor: 'Drag', emojis: ['🌪', '🌫'], description: 'Subtle headwind; minor loops or haze' },
  { level: 0, anchor: 'Equilibrium', emojis: ['⚖️'], description: 'Net-neutral tilt; forces cancel or diffuse' },
  { level: 1, anchor: 'Lift', emojis: ['🌱', '✨'], description: 'Gentle tailwind; beginnings sprout' },
  { level: 2, anchor: 'Flow', emojis: ['🌊', '🧘'], description: 'Smooth adaptability; things click' },
  { level: 3, anchor: 'Harmony', emojis: ['🧘', '✨', '🌊'], description: 'Coherent progress; both/and solutions' },
  { level: 4, anchor: 'Expansion', emojis: ['💎', '🔥', '🦋'], description: 'Widening opportunities; clear insight fuels growth' },
  { level: 5, anchor: 'Liberation', emojis: ['🦋', '🌈', '🔥'], description: 'Peak openness; breakthroughs/big-sky view' }
];

// Default force weights (can be customized per reading)
const DEFAULT_WEIGHTS: ForceWeights = {
  orb: 1.2,      // closer = stronger
  resonance: 1.1, // hitting key points
  potency: 1.0,   // base planetary influence
  recursion: 1.3, // repeated themes echo
  aspect: 0.9     // geometric relationships
};

export interface EmojiCandidate {
  emoji: string;
  label: string;
  score: number;
  type: 'valence';
}

/**
 * Gets valence level data for a given numeric valence (-5 to +5)
 */
function getCanonicalValence(climate: ClimateData): number {
  const raw = typeof climate.valence_bounded === 'number'
    ? climate.valence_bounded
    : climate.valence;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function getValenceLevel(valence: number): ValenceLevel {
  const clamped = Math.max(-5, Math.min(5, Math.round(valence)));
  return VALENCE_LEVELS.find(level => level.level === clamped) || VALENCE_LEVELS[5]; // default to equilibrium
}

/**
 * Selects emojis based on valence level and magnitude, following emoji selection rules
 */
export function selectClimateEmojis(climate: ClimateData, weights: ForceWeights = DEFAULT_WEIGHTS): EmojiCandidate[] {
  const { magnitude } = climate;
  const valence = getCanonicalValence(climate);
  
  // Get the appropriate valence level
  const level = getValenceLevel(valence);
  
  // Handle equilibrium (level 0) 
  if (level.level === 0) {
    return [{ emoji: '⚖️', label: level.anchor, score: 1.0, type: 'valence' }];
  }
  
  // Determine selection count based on magnitude
  let maxEmojis = 1;
  if (magnitude <= 2) {
    maxEmojis = Math.min(2, level.emojis.length);
  } else if (magnitude >= 3) {
    maxEmojis = Math.min(3, level.emojis.length);
  }
  
  // Select emojis from the level's pattern, with slight randomization to prevent repetition
  const selectedEmojis = [...level.emojis]
    .sort(() => Math.random() - 0.5) // shuffle
    .slice(0, maxEmojis);
  
  return selectedEmojis.map(emoji => ({
    emoji,
    label: level.anchor,
    score: 1.0,
    type: 'valence' as const
  }));
}

/**
 * Formats selected emojis into a climate display string
 */
export function formatClimateDisplay(climate: ClimateData, weights?: ForceWeights): string {
  const selected = selectClimateEmojis(climate, weights);
  const level = getValenceLevel(getCanonicalValence(climate));
  
  if (selected.length === 0) {
    return `⚡ ${climate.magnitude} · ⚖️ Neutral`;
  }
  
  const emojiPart = selected.map(s => s.emoji).join('');
  return `⚡ ${climate.magnitude} · ${emojiPart} ${level.anchor}`;
}

/**
 * Enhanced formatter that includes volatility display
 */
export function formatFullClimateDisplay(climate: ClimateData, weights?: ForceWeights): string {
  const selected = selectClimateEmojis(climate, weights);
  const level = getValenceLevel(getCanonicalValence(climate));
  const volatilityEmojis = ['➿', '🔄', '🔀', '🧩', '🌀'];
  const volEmoji = volatilityEmojis[Math.min(Math.floor(climate.volatility), 4)] || '➿';

  if (selected.length === 0) {
    return `Symbolic Climate: ⚡ ${climate.magnitude} magnitude · ⚖️ neutral balance · ${volEmoji} ${climate.volatility} volatility`;
  }

  const emojiPart = selected.map(s => s.emoji).join('');
  const emojiExplanation = `${emojiPart} = ${level.anchor.toLowerCase()} energy`;

  return `Symbolic Climate: ⚡ ${climate.magnitude} magnitude · ${emojiExplanation} · ${volEmoji} ${climate.volatility} volatility`;
}
