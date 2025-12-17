/*
 * Poetic Brain – Aspect Mandate shared types
 * ------------------------------------------
 * Defines the structured output consumed by the Poetic Brain narrative engine
 * and downstream prompt builders. The semantic layer translates raw geometry
 * (MAP data) into reusable mandate objects describing archetypal tension.
 */

export type AspectType =
  | 'conjunction'
  | 'opposition'
  | 'square'
  | 'trine'
  | 'sextile'
  | 'quincunx'
  | 'semisextile'
  | 'semisquare'
  | 'sesquiquadrate'
  | string;

export interface PlanetArchetypeData {
  /** Canonical planet key coming from the MAP (e.g., "Sun", "Mars", "ASC") */
  planet: string;
  /** Archetypal label used in narrative layers */
  name: string;
  /** Short essence statement describing how the planet tends to act */
  essence: string;
  /** Optional owner/context label (e.g., Person A, Person B) */
  owner?: string;
}

export interface AspectGeometry {
  aspectType: AspectType;
  orbDegrees: number;
  applying: boolean;
  weight: number;
  houses?: {
    primary?: number;
    secondary?: number;
  };
}

export type MandateDiagnostic = 'Current' | 'Hook' | 'Compression' | 'Paradox Lock';

export interface MandateProvenance {
  source: 'MAP';
  natalIndexA?: number;
  natalIndexB?: number;
  rawAspectRef?: string;
}

export interface MandateAspect {
  id: string;
  geometry: AspectGeometry;
  archetypes: {
    a: PlanetArchetypeData;
    b: PlanetArchetypeData;
  };
  diagnostic: MandateDiagnostic;
  fieldPressure: string;
  mapTranslation: string;
  voiceHook: string;
  provenance: MandateProvenance;
}

export interface ChartMandates {
  personName: string;
  mandates: MandateAspect[];
}

export interface RelationalMandates {
  pairLabel: string;
  personA: string;
  personB: string;
  mandates: MandateAspect[];
}

export interface MandateBuildOptions {
  /** Maximum number of mandates to emit (default: 5) */
  limit?: number;
  /** Provide intimacy tier context for tone adjustments */
  intimacyTier?: string | null;
}
