// Symbolic Visual Design System
// Physics-based visual language that shows charge, not emotion

export const VALENCE_COLORS = {
  // --- Positive Valence (Expansive Elements) ---
  '5': { bg: 'from-amber-500/20 to-yellow-600/20', border: 'border-amber-500/60', text: 'text-amber-200', icon: '🔥' }, // Fire / Liberation
  '4': { bg: 'from-emerald-600/20 to-green-700/20', border: 'border-emerald-500/60', text: 'text-emerald-200', icon: '🌱' }, // Earth / Growth / Expansion
  '3': { bg: 'from-sky-600/20 to-blue-700/20', border: 'border-sky-500/60', text: 'text-sky-200', icon: '🌊' }, // Water / Flow / Harmony
  '2': { bg: 'from-violet-600/20 to-purple-700/20', border: 'border-violet-500/60', text: 'text-violet-200', icon: '🧘' }, // Air / Integration
  '1': { bg: 'from-slate-700/20 to-gray-800/20', border: 'border-slate-500/60', text: 'text-slate-200', icon: '✨' }, // Subtle Lift

  // --- Neutral ---
  '0': { bg: 'from-stone-800/20 to-slate-900/20', border: 'border-stone-600/60', text: 'text-stone-300', icon: '⚖️' }, // Equilibrium

  // --- Negative Valence (Constrictive Elements) ---
  '-1': { bg: 'from-orange-800/20 to-amber-900/20', border: 'border-orange-600/50', text: 'text-orange-300', icon: '🌫' }, // Subtle Drag
  '-2': { bg: 'from-rose-800/20 to-red-900/20', border: 'border-rose-600/50', text: 'text-rose-300', icon: '🧩' }, // Contraction
  '-3': { bg: 'from-indigo-800/20 to-blue-900/20', border: 'border-indigo-600/50', text: 'text-indigo-300', icon: '⚔️' }, // Friction
  '-4': { bg: 'from-purple-800/20 to-violet-900/20', border: 'border-purple-600/50', text: 'text-purple-300', icon: '🕰' }, // Grind
  '-5': { bg: 'from-gray-800/20 to-black/30', border: 'border-gray-600/50', text: 'text-gray-300', icon: '🌋' }, // Compression
};

// Magnitude visual weight (intensity through thickness, not brightness)
export const MAGNITUDE_STYLES = {
  1: { fontWeight: 'font-light', borderWidth: 'border', opacity: 'opacity-60' },
  2: { fontWeight: 'font-normal', borderWidth: 'border', opacity: 'opacity-75' },
  3: { fontWeight: 'font-medium', borderWidth: 'border-2', opacity: 'opacity-90' },
  4: { fontWeight: 'font-semibold', borderWidth: 'border-2', opacity: 'opacity-100' },
  5: { fontWeight: 'font-bold', borderWidth: 'border-4', opacity: 'opacity-100' },
};

// Volatility through visual stability/chaos
export const VOLATILITY_STYLES = {
  low: { animation: '', transform: 'transform-none', pattern: 'stable' },
  moderate: { animation: '', transform: 'transform-none', pattern: 'variable' },
  high: { animation: 'animate-pulse', transform: 'hover:scale-105', pattern: 'chaotic' },
};

// Pattern intensity indicators (replacing emotional faces with geometric intensity)
export const PATTERN_INTENSITY = {
  1: { indicator: '◦', description: 'Subtle pattern' },
  2: { indicator: '●', description: 'Notable pattern' },
  3: { indicator: '⬢', description: 'Significant pattern' },
  4: { indicator: '◆', description: 'Strong pattern' },
  5: { indicator: '◆◆', description: 'Dominant pattern' },
};

// Recognition level visual themes (not emotional, but observational)
export const RECOGNITION_THEMES = {
  immediate: {
    gradient: 'from-emerald-600 to-green-600',
    description: 'High geometric precision match',
    indicator: '🎯'
  },
  emerging: {
    gradient: 'from-amber-600 to-orange-600',
    description: 'Developing pattern recognition',
    indicator: '🌱'
  },
  exploratory: {
    gradient: 'from-slate-600 to-gray-600',
    description: 'Early pattern investigation',
    indicator: '🗺️'
  }
};

// Visual utility functions
export function getValenceVisuals(valence: number) {
  const rounded = Math.round(Math.max(-5, Math.min(5, valence)));
  const key = rounded.toString() as keyof typeof VALENCE_COLORS;
  return VALENCE_COLORS[key] || VALENCE_COLORS['0'];
}

export function getMagnitudeVisuals(magnitude: number) {
  const clamped = Math.round(Math.max(1, Math.min(5, magnitude))) as keyof typeof MAGNITUDE_STYLES;
  return MAGNITUDE_STYLES[clamped];
}

export function getVolatilityVisuals(volatility: number) {
  if (volatility >= 4) return VOLATILITY_STYLES.high;
  if (volatility >= 2) return VOLATILITY_STYLES.moderate;
  return VOLATILITY_STYLES.low;
}

export function getPatternIntensityVisuals(charge: number) {
  const clamped = Math.round(Math.max(1, Math.min(5, charge))) as keyof typeof PATTERN_INTENSITY;
  return PATTERN_INTENSITY[clamped];
}

export function getRecognitionTheme(level: 'immediate' | 'emerging' | 'exploratory') {
  return RECOGNITION_THEMES[level];
}

// CSS class generators for dynamic styling
export function generateClimateClasses(valence: number, magnitude: number, volatility: number) {
  const valenceStyle = getValenceVisuals(valence);
  const magnitudeStyle = getMagnitudeVisuals(magnitude);
  const volatilityStyle = getVolatilityVisuals(volatility);

  return {
    background: `bg-gradient-to-br ${valenceStyle.bg}`,
    border: valenceStyle.border,
    text: valenceStyle.text,
    weight: magnitudeStyle.fontWeight,
    borderWidth: magnitudeStyle.borderWidth,
    opacity: magnitudeStyle.opacity,
    animation: volatilityStyle.animation,
    transform: volatilityStyle.transform,
    icon: valenceStyle.icon
  };
}