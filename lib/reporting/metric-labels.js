const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const VALENCE_LEVELS = [
  { min: -5, max: -4, label: 'Collapse', emoji: '🌋', polarity: 'negative', code: 'collapse' },
  { min: -4, max: -2.5, label: 'Friction', emoji: '⚔️', polarity: 'negative', code: 'friction' },
  { min: -2.5, max: -1, label: 'Drag', emoji: '🌪️', polarity: 'negative', code: 'drag' },
  { min: -1, max: 1, label: 'Equilibrium', emoji: '⚖️', polarity: 'neutral', code: 'equilibrium' },
  { min: 1, max: 2.5, label: 'Flow', emoji: '🌊', polarity: 'positive', code: 'flow' },
  { min: 2.5, max: 5.01, label: 'Expansion', emoji: '🦋', polarity: 'positive', code: 'expansion' },
];

const MAGNITUDE_LEVELS = [
  { max: 0.5, label: 'Trace' },
  { max: 1.5, label: 'Pulse' },
  { max: 2.5, label: 'Wave' },
  { max: 3.5, label: 'Surge' },
  { max: 4.5, label: 'Peak' },
  { max: Infinity, label: 'Threshold' },
];

const VOLATILITY_LEVELS = [
  { max: 0.5, label: 'Aligned Flow', emoji: '➿' },
  { max: 2, label: 'Cycled Pull', emoji: '🔄' },
  { max: 3, label: 'Mixed Paths', emoji: '🔀' },
  { max: 5, label: 'Fragment Scatter', emoji: '🧩' },
  { max: Infinity, label: 'Vortex Dispersion', emoji: '🌀' },
];

function safeNumber(value, fallback = null) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function classifyValence(value) {
  const num = safeNumber(value, null);
  if (num == null) return null;
  const bounded = clamp(num, -5, 5);
  const tier = VALENCE_LEVELS.find(level => bounded >= level.min && bounded < level.max);
  if (!tier) {
    return {
      value: +bounded.toFixed(2),
      label: null,
      emoji: null,
      polarity: bounded >= 0 ? 'positive' : 'negative',
      band: null,
      code: null,
    };
  }
  return {
    value: +bounded.toFixed(2),
    label: tier.label,
    emoji: tier.emoji,
    polarity: tier.polarity,
    band: [tier.min, tier.max],
    code: tier.code,
  };
}

function classifyMagnitude(value) {
  const num = safeNumber(value, null);
  if (num == null) return null;
  const tier = MAGNITUDE_LEVELS.find(level => num <= level.max);
  return {
    value: +num.toFixed(2),
    label: tier ? tier.label : null,
  };
}

function classifyVolatility(value) {
  const num = safeNumber(value, null);
  if (num == null) return null;
  const tier = VOLATILITY_LEVELS.find(level => num <= level.max);
  return {
    value: +num.toFixed(2),
    label: tier ? tier.label : null,
    emoji: tier ? tier.emoji : null,
  };
}

function classifySfd(value) {
  const num = safeNumber(value, null);
  if (num == null) return null;
  const bounded = clamp(num, -5, 5);
  let disc = 0;
  let label = 'scaffolding mixed';
  if (bounded >= 1) {
    disc = 1;
    label = 'scaffolding present';
  } else if (bounded <= -1) {
    disc = -1;
    label = 'scaffolding cut';
  }
  return {
    value: +bounded.toFixed(2),
    disc,
    label,
  };
}

module.exports = {
  VALENCE_LEVELS,
  MAGNITUDE_LEVELS,
  VOLATILITY_LEVELS,
  classifyValence,
  classifyMagnitude,
  classifyVolatility,
  classifySfd,
  clamp,
};
