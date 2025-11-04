import { z } from 'zod';

// Core numeric metric schema (value + optional confidence)
const metric = z.union([
  z.number(),
  z.object({ value: z.number(), confidence: z.number().optional() })
]);

// Seismograph structure
export const seismographSchema = z.object({
  magnitude: metric.optional(),
  valence: metric.optional(),
  volatility: metric.optional(),
  coherence: metric.optional(), // Added: Narrative Coherence (0-5, higher = stable)
  scaling_strategy: z.string().optional(),
  valence_label: z.string().optional(),
});

// Hook aspect representation (angle, planets, orb, flags)
export const hookSchema = z.object({
  label: z.string().min(1), // e.g. "Sun square Mars (2.1°)"
  angle: z.number().optional(),
  orb: z.number().optional(),
  retrograde_involved: z.boolean().optional(),
  exact: z.boolean().optional(),
  // Diagnostic classification
  resonanceState: z.enum(['WB', 'ABE', 'OSR']).optional(), // Within Boundary, At Boundary Edge, Outside Symbolic Range
  shadowMode: z.enum(['translatable', 'inverted', 'integrated', 'unknown']).optional(),
  // NEW: SRP enrichment (Phase 1) - namespaced for safety
  srp: z.object({
    blendId: z.number().int().min(1).max(144).optional(), // Light Ledger blend ID
    hingePhrase: z.string().optional(), // e.g., "Fervent Flame: Initiateing Initiate"
    elementWeave: z.string().optional(), // e.g., "Fire-Fire"
    shadowId: z.string().optional(), // e.g., "1R" if ABE/OSR
    restorationCue: z.string().optional(), // Shadow restoration guidance
    collapseMode: z.string().optional(), // e.g., "self-devouring", "custody"
  }).optional(),
});

// Shadow Layer structure (for diagnostic integrity)
export const shadowLayerSchema = z.object({
  structuralTensions: z.array(z.object({
    aspect: z.string(), // e.g., "Saturn square Sun"
    orb: z.number().optional(),
    mode: z.enum(['Saturn', 'Pluto', 'Neptune', 'Chiron', 'Other']).optional(),
    hypothesis: z.string().optional() // Shadow hypothesis for testing
  })).optional(),
  shadowHypothesis: z.string().optional(), // Overall shadow pattern description
  integrationStatus: z.enum(['active', 'O-Integration', 'partial']).optional()
});

// Enhanced Matrix archetype (Tropical x Sidereal)
export const enhancedMatrixSchema = z.object({
  tropicalSun: z.string().optional(), // Ego Grammar
  siderealSun: z.string().optional(), // Structural Mirror
  complexArchetype: z.string().optional(), // e.g., "Tropical Leo / Sidereal Cancer"
  lensRotationTriggered: z.boolean().optional()
});

// Person schema (natal geometry + metadata)
const personSchema = z.object({
  name: z.string().optional(),
  birth_data: z.any().optional(),
  chart: z.any().optional(),
  aspects: z.array(z.any()).optional(),
  natal_chart: z.any().optional(),
  details: z.any().optional(),
  summary: z.any().optional(),
}).passthrough();

const narrativeSectionsSchema = z.object({
  solo_mirror_a: z.string().optional(),
  solo_mirror_b: z.string().optional(),
  relational_engine: z.string().optional(),
  weather_overlay: z.string().optional(),
}).partial();

const dailyReadingSchema = z.object({
  date: z.string().optional(),
  magnitude: z.number().optional(),
  magnitude_x10: z.number().optional(),
  directional_bias: z.number().optional(),
  directional_bias_x10: z.number().optional(),
  coherence: z.number().optional(),
  coherence_x10: z.number().optional(),
  drivers: z.array(z.union([z.string(), z.record(z.any())])).optional(),
  aspects: z.array(z.record(z.any())).optional(),
}).passthrough();

const symbolicWeatherContextSchema = z.object({
  daily_readings: z.array(dailyReadingSchema).optional(),
  transit_context: z.object({
    period: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
      step: z.string().optional(),
    }).optional(),
  }).optional(),
}).passthrough();

const balanceMeterSchema = z.object({
  magnitude: z.number().optional(),
  magnitude_0to5: z.number().optional(),
  directional_bias: z.number().optional(),
  directional_bias_x10: z.number().optional(),
  coherence: z.number().optional(),
  coherence_0to5: z.number().optional(),
  period: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  channel_summary_canonical: z.record(z.any()).optional(),
}).passthrough();

const symbolicWeatherSchema = z.object({
  balance_meter_frontstage: z.object({
    summary: z.array(z.object({
      span: z.string().optional(),
      magnitude_x10: z.number().optional(),
      directional_bias_x10: z.number().optional(),
      coherence_x10: z.number().optional(),
      notes: z.string().optional(),
    }).passthrough()).optional(),
  }).optional(),
  daily_readings: z.array(z.record(z.any())).optional(),
  transit_context: z.object({
    period: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
      step_days: z.number().optional(),
    }).optional(),
  }).optional(),
}).passthrough();

const provenanceSchema = z.object({
  data_source: z.string().optional(),
  ephemeris_backend: z.string().optional(),
  orbs_profile: z.string().optional(),
  relocation_mode: z.string().optional(),
  map_id: z.string().optional(),
  math_brain_version: z.string().optional(),
  renderer_version: z.string().optional(),
  semantic_profile: z.string().optional(),
}).passthrough();

// Payload schema (geometry-first, no hidden inference)
export const poeticBrainPayloadSchema = z.object({
  _format: z.string().optional(),
  _version: z.string().optional(),
  _poetic_brain_compatible: z.boolean().optional(),
  generated_at: z.string().optional(),
  _natal_section: z.record(z.any()).optional(),
  person_a: personSchema.optional(),
  person_b: personSchema.nullable().optional(),
  mirror_contract: z.object({
    report_kind: z.string().optional(),
    intimacy_tier: z.string().optional(),
    relationship_type: z.string().optional(),
    is_relational: z.boolean().optional(),
    is_natal_only: z.boolean().optional(),
  }).passthrough().optional(),
  narrative_sections: narrativeSectionsSchema.optional(),
  symbolic_weather_context: symbolicWeatherContextSchema.optional(),
  balance_meter: balanceMeterSchema.optional(),
  symbolic_weather: symbolicWeatherSchema.optional(),
  climateLine: z.string().optional(),
  constitutionalClimate: z.string().optional(),
  hooks: z.array(z.union([z.string(), hookSchema])).optional(),
  seismograph: seismographSchema.optional(),
  angles: z.array(z.any()).optional(), // Kept loose until angle shape formalized
  transits: z.array(z.any()).optional(),
  focusTheme: z.string().optional(),
  // Diagnostic Integrity Protocol fields
  shadowLayer: shadowLayerSchema.optional(),
  enhancedMatrix: enhancedMatrixSchema.optional(),
  // Tool vs. Person distinction
  toolDescription: z.string().optional(), // Description of archetypal tool/instrument
  expressionContext: z.string().optional(), // Context about how tool is being used
  provenance: provenanceSchema.optional(),
  // Allow forward-compatible extras (namespaced preferred)
}).passthrough();

export type PoeticBrainPayload = z.infer<typeof poeticBrainPayloadSchema>;

export function validatePoeticBrainPayload(data: unknown): PoeticBrainPayload {
  const parsed = poeticBrainPayloadSchema.parse(data);
  return parsed;
}
