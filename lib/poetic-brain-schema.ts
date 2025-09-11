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
  scaling_strategy: z.string().optional(),
});

// Hook aspect representation (angle, planets, orb, flags)
export const hookSchema = z.object({
  label: z.string().min(1), // e.g. "Sun square Mars (2.1°)"
  angle: z.number().optional(),
  orb: z.number().optional(),
  retrograde_involved: z.boolean().optional(),
  exact: z.boolean().optional()
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
  // Allow forward-compatible extras (namespaced preferred)
}).strict().passthrough();

export type PoeticBrainPayload = z.infer<typeof poeticBrainPayloadSchema>;

export function validatePoeticBrainPayload(data: unknown): PoeticBrainPayload {
  const parsed = poeticBrainPayloadSchema.parse(data);
  return parsed;
}
