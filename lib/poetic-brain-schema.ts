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
  shadowMode: z.enum(['translatable', 'inverted', 'integrated', 'unknown']).optional()
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

// Payload schema (geometry-first, no hidden inference)
export const poeticBrainPayloadSchema = z.object({
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
  // Allow forward-compatible extras (namespaced preferred)
}).strict().passthrough();

export type PoeticBrainPayload = z.infer<typeof poeticBrainPayloadSchema>;

export function validatePoeticBrainPayload(data: unknown): PoeticBrainPayload {
  const parsed = poeticBrainPayloadSchema.parse(data);
  return parsed;
}
