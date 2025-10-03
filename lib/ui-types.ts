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
    volatility: "Stable" | "Variable" | "Unstable";
    biasRange?: { min: number; max: number; average: number };
    magnitudeRange?: { min: number; max: number; average: number };
    volatilityRange?: { min: number; max: number; average: number };
  };
  tier1Hooks: Array<{ label: string; why: string; houseTag?: string }>;
};

export type Blueprint = {
  thesis: string; // non-empty string; always provided
};

export type SnapshotTone = {
  magnitude: "Low" | "Moderate" | "High";
  valence: "Harmonious" | "Tense" | "Complex";
  volatility: "Stable" | "Variable" | "Unstable";
};

export type SnapshotAnchor = {
  name: string;
  strength: number;
  valence: "supportive" | "challenging" | "mixed";
  benefit: string;
  friction: string;
};

export type SnapshotHook = {
  label: string;
  intensity: number;
  targetHouse: string;
};

export type SnapshotData = {
  header: {
    location: string;
    dateRange: string;
    type: "Snapshot" | "Overview";
  };
  tone: SnapshotTone;
  anchors: SnapshotAnchor[];
  hooks: SnapshotHook[];
  topHouse: {
    tag: string;
    keywords: string;
    relocated: boolean;
  };
  heatband?: Array<{ day: string; intensity: "light" | "medium" | "dark" }>;
  auditFooter: {
    anchorsCount: number;
    hooksCount: number;
    lens: string;
    peaks?: string;
  };
};
