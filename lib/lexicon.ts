// lexicon.ts
// Separated vocabularies per Raven Calder diagnostic
// Directional Bias = DIRECTION words
// SFD = INTEGRATION words
// NEVER mix these

export const TOOLTIP_BIAS =
  "Directional Bias (−5..+5): flow orientation — inward/contraction (−) vs outward/expansion (+). Not 'good/bad'.";

export const TOOLTIP_MAG =
  "Magnitude (0..5): field loudness — 0 latent, 2–3 noticeable, 4–5 peak.";

export const TOOLTIP_COH =
  "Coherence (0..5): story stability — inversion of volatility; higher = steadier storyline.";

export const TOOLTIP_SFD =
  "Integration Bias, SFD (−1.00..+1.00): forces fragment (<0) vs cooperate (>0). Independent of Directional Bias.";

export const WEATHER_CONSTRAINT =
  "Symbolic weather is shown only when transit drivers exist. Natal mirrors render without transits.";

// Direction vocabulary (for Directional Bias only)
export const DIRECTION_VOCAB = {
  inward: 'Inward/Contraction',
  outward: 'Outward/Expansion',
  neutral: 'Equilibrium',
} as const;

// Integration vocabulary (for SFD only)
export const INTEGRATION_VOCAB = {
  fragmentation: 'Fragmentation',
  cooperation: 'Cooperation',
  balanced: 'Balanced',
} as const;
