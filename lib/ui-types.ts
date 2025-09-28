// UI/UX Contract Types - Three core types only; everything else derives from them

export type ReportHeader = {
  mode: "NATAL" | "SYNASTRY" | "TRANSITS" | "SYNASTRY_TRANSITS";
  window?: { start: string; end: string; step: "daily" | "hourly" | "none" };
  relocated: { active: boolean; label?: string };
};

export type Weather = {
  hasWindow: boolean; // true iff start/end present and valid
  balanceMeter?: {
    magnitude: "Low" | "Moderate" | "High";
    valence: "Harmonious" | "Tense" | "Complex";
    volatility: "Stable" | "Variable" | "Unstable"
  };
  tier1Hooks: Array<{ label: string; why: string; houseTag?: string }>;
};

export type Blueprint = {
  thesis: string; // non-empty string; always provided
};