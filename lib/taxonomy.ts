// Final Frozen Emoji Spec (September 2025)
// Non-overlapping rules:
// - 🌀 only at Volatility max (5)
// - 🌫 only for Fog/Dissolution (Valence negative)
// - ∠ (ASCII stand‑in) only for Aspect in Sources of Force
// - ⚡ numeric magnitude scale (0–5) remains neutral
// NOTE: Provided spec uses 🌊 in both negative (Cross Current) and positive (Flow Tide) lists.
// This creates an overlap; retained verbatim but flagged via DUPLICATE_EMOJI constant.

export interface ValenceMode { emoji: string; label: string; polarity: 'positive' | 'negative'; description?: string; }

export const VALENCE_NEGATIVE: ValenceMode[] = [
  { emoji: '🌪', label: 'Recursion Pull', polarity: 'negative', description: 'Old cycles re-emerge' },
  { emoji: '⚔', label: 'Friction Clash', polarity: 'negative', description: 'Conflict, accidents' },
  { emoji: '🌊', label: 'Cross Current', polarity: 'negative', description: 'Competing flows, confusion' },
  { emoji: '🌫', label: 'Fog / Dissolution', polarity: 'negative', description: 'Blurred boundaries, signals scatter' },
  { emoji: '🌋', label: 'Pressure / Eruption', polarity: 'negative', description: 'Compression until release' },
  { emoji: '🕰', label: 'Saturn Weight', polarity: 'negative', description: 'Heaviness, delay' },
  { emoji: '🧩', label: 'Fragmentation', polarity: 'negative', description: 'Fractured focus' },
  { emoji: '⬇️', label: 'Entropy Drift', polarity: 'negative', description: 'Inertia, energy drains away' }
];

export const VALENCE_POSITIVE: ValenceMode[] = [
  { emoji: '🌱', label: 'Fertile Field', polarity: 'positive', description: 'Growth, fresh shoots' },
  { emoji: '✨', label: 'Harmonic Resonance', polarity: 'positive', description: 'Natural ease' },
  { emoji: '💎', label: 'Expansion Lift', polarity: 'positive', description: 'Confidence, abundance' },
  { emoji: '🔥', label: 'Combustion Clarity', polarity: 'positive', description: 'Breakthrough insight' },
  { emoji: '🦋', label: 'Liberation / Release', polarity: 'positive', description: 'Uranian fresh air' },
  { emoji: '🧘', label: 'Integration', polarity: 'positive', description: 'Opposites reconcile' },
  { emoji: '🌊', label: 'Flow Tide', polarity: 'positive', description: 'Smooth adaptability' },
  { emoji: '🌈', label: 'Visionary Spark', polarity: 'positive', description: 'Inspiration, transcendence' }
];

export const DUPLICATE_EMOJI = ['🌊']; // Appears in both polarities per supplied spec.

// Volatility Ladder (0 → 5 ascending only)
export interface VolatilityBand { range: string; emoji: string; label: string; felt: string; }
export const VOLATILITY_LADDER: VolatilityBand[] = [
  { range: '0', emoji: '➿', label: 'Aligned Flow', felt: 'All signals cohered, single channel' },
  { range: '1–2', emoji: '🔄', label: 'Cycled Pull', felt: 'Stable repeats, predictable rhythm' },
  { range: '2–3', emoji: '🔀', label: 'Mixed Paths', felt: 'Split distribution, neither steady nor chaotic' },
  { range: '3–4', emoji: '🧩', label: 'Fragment Scatter', felt: 'Threads split apart, uneven strikes' },
  { range: '5', emoji: '🌀', label: 'Vortex Dispersion', felt: 'Extreme scatter, no clear center' }
];

// Sources of Force
export interface SourceForce { emoji: string; label: string; description: string; }
export const SOURCES_OF_FORCE: SourceForce[] = [
  { emoji: '🎯', label: 'Orb', description: 'Closeness of contact (closer = stronger)' },
  { emoji: '∠', label: 'Aspect', description: 'Geometric angle (majors thunder, minors whisper)' },
  { emoji: '🪐', label: 'Potency', description: 'Planet speed/mass (slower = tectonic, faster = sparks)' },
  { emoji: '📡', label: 'Resonance', description: 'Amplification when hitting Sun, Moon, ASC, MC, Nodes' },
  { emoji: '♾️', label: 'Recursion', description: 'Repeated / overlapping themes that echo louder' }
];

export const MAGNITUDE_SYMBOL = '⚡';
export interface MagnitudeLevel { level: number; label: string; notes: string; }
export const MAGNITUDE_LADDER: MagnitudeLevel[] = [
  { level: 0, label: 'Trace', notes: 'Barely measurable; background rhythm; potential present.' },
  { level: 1, label: 'Pulse', notes: 'Subtle impressions; passing signals.' },
  { level: 2, label: 'Wave', notes: 'Noticeable bursts; often personal-planet triggered.' },
  { level: 3, label: 'Surge', notes: 'Clear activation; events or demands emerge.' },
  { level: 4, label: 'Peak', notes: 'Stacked factors; concentrated symbolic weight.' },
  { level: 5, label: 'Threshold', notes: 'Ceiling of measurable load; life-defining, not catastrophic.' }
];
export function formatMagnitude(level: number | null | undefined): string {
  if (level == null || Number.isNaN(level)) return '';
  const entry = MAGNITUDE_LADDER.find(m => m.level === level);
  return entry ? `${MAGNITUDE_SYMBOL} ${entry.level} ${entry.label}` : '';
}

// The Twelve Houses of Astrology: A Symbolic Framework
// Maintains geometric integrity while stripping away prediction
export interface AstroHouse {
  number: number;
  name: string;
  category: 'Self and Being' | 'Connection and Interaction' | 'Growth and Evolution' | 'Responsibility and Integration';
  description: string;
  keywords: string[];
  experiential: string; // How it manifests in lived experience
}

export const TWELVE_HOUSES: AstroHouse[] = [
  // I. Self and Being
  {
    number: 1,
    name: 'House of Embodiment (Ascendant)',
    category: 'Self and Being',
    description: 'The individual\'s physical self, personality, and initial approach to the world',
    keywords: ['identity', 'appearance', 'first impressions', 'personal style', 'vitality'],
    experiential: 'How you naturally present yourself; your immediate response to new situations'
  },
  {
    number: 2,
    name: 'House of Resources',
    category: 'Self and Being',
    description: 'Personal possessions, values, and financial well-being',
    keywords: ['money', 'possessions', 'values', 'self-worth', 'material security'],
    experiential: 'What you consider valuable; your relationship with material resources'
  },
  {
    number: 5,
    name: 'House of Expression',
    category: 'Self and Being',
    description: 'Creativity, self-expression, children, and romantic pursuits',
    keywords: ['creativity', 'romance', 'children', 'play', 'artistic expression'],
    experiential: 'How you create and express joy; what makes you feel alive and playful'
  },

  // II. Connection and Interaction
  {
    number: 3,
    name: 'House of Signals',
    category: 'Connection and Interaction',
    description: 'Communication, short journeys, siblings, and early education',
    keywords: ['communication', 'learning', 'siblings', 'local travel', 'information'],
    experiential: 'How you process and share information; your everyday communication style'
  },
  {
    number: 7,
    name: 'House of Relational Mirror',
    category: 'Connection and Interaction',
    description: 'Partnerships, open enemies, and committed relationships',
    keywords: ['partnerships', 'marriage', 'open enemies', 'contracts', 'projection'],
    experiential: 'What you attract in others; how you relate in one-on-one partnerships'
  },
  {
    number: 11,
    name: 'House of Networks',
    category: 'Connection and Interaction',
    description: 'Friendships, groups, hopes, and wishes',
    keywords: ['friends', 'groups', 'hopes', 'social causes', 'future vision'],
    experiential: 'Your social circles; what you hope for and work toward collectively'
  },

  // III. Growth and Evolution
  {
    number: 4,
    name: 'House of Foundations',
    category: 'Growth and Evolution',
    description: 'Home, family roots, and the subconscious mind',
    keywords: ['home', 'family', 'roots', 'security', 'emotional foundation'],
    experiential: 'What makes you feel safe and grounded; your deepest emotional needs'
  },
  {
    number: 8,
    name: 'House of Shared Load',
    category: 'Growth and Evolution',
    description: 'Transformation, joint resources, intimacy, and death',
    keywords: ['transformation', 'joint resources', 'intimacy', 'crisis', 'rebirth'],
    experiential: 'How you handle profound change; what you share deeply with others'
  },
  {
    number: 9,
    name: 'House of Horizon',
    category: 'Growth and Evolution',
    description: 'Higher education, long journeys, philosophy, and spirituality',
    keywords: ['philosophy', 'travel', 'higher learning', 'meaning', 'expansion'],
    experiential: 'Your search for meaning; how you expand beyond familiar boundaries'
  },

  // IV. Responsibility and Integration
  {
    number: 6,
    name: 'House of Maintenance',
    category: 'Responsibility and Integration',
    description: 'Daily routines, work, health, and service',
    keywords: ['work', 'health', 'routine', 'service', 'improvement'],
    experiential: 'Your daily habits and work life; how you maintain and improve yourself'
  },
  {
    number: 10,
    name: 'House of Structure (Midheaven)',
    category: 'Responsibility and Integration',
    description: 'Career, public image, and life direction',
    keywords: ['career', 'reputation', 'achievement', 'authority', 'public image'],
    experiential: 'How the world sees you; your professional identity and legacy'
  },
  {
    number: 12,
    name: 'House of Dissolution',
    category: 'Responsibility and Integration',
    description: 'The subconscious, hidden matters, solitude, and karma',
    keywords: ['subconscious', 'solitude', 'spirituality', 'karma', 'release'],
    experiential: 'What operates behind the scenes; your relationship with the invisible'
  }
];

export const HOUSE_CATEGORIES = [
  'Self and Being',
  'Connection and Interaction', 
  'Growth and Evolution',
  'Responsibility and Integration'
] as const;

export function getHousesByCategory(category: typeof HOUSE_CATEGORIES[number]): AstroHouse[] {
  return TWELVE_HOUSES.filter(house => house.category === category);
}

export function getHouseByNumber(number: number): AstroHouse | undefined {
  return TWELVE_HOUSES.find(house => house.number === number);
}

export function formatHouseDisplay(house: AstroHouse): string {
  return `${house.number}. ${house.name}: ${house.description}`;
}

