import { z } from 'zod';

export const NormalizedDay = z.object({
  magnitude: z.number().min(0).max(1),
  directional_bias: z.number().min(-1).max(1),
  volatility: z.number().min(0).max(1),
  sfd: z.number().min(-1).max(1).nullable(),
});

const ClampInfo = z.object({
  hitMin: z.boolean(),
  hitMax: z.boolean(),
});

const AxisDisplay = z.object({
  raw: z.number(),
  value: z.number(),
  flags: ClampInfo,
});

const SfdDisplay = z.object({
  raw: z.number().nullable(),
  value: z.number().nullable(),
  display: z.string(),
  flags: ClampInfo,
});

const ScalingMeta = z.object({
  mode: z.literal('absolute'),
  factor: z.literal(5),
  pipeline: z.literal('normalize→scale→clamp→round'),
  coherence_inversion: z.boolean(),
});

export const DisplayDay = z.object({
  magnitude: AxisDisplay,
  directional_bias: AxisDisplay,
  coherence: AxisDisplay,
  sfd: SfdDisplay,
});

export const DayExport = z.object({
  normalized: NormalizedDay,
  display: DisplayDay,
  scaling: ScalingMeta,
  meta: z.object({
    scaling_mode: z.literal('absolute'),
    scale_factor: z.literal(5),
    coherence_inversion: z.boolean(),
    pipeline: z.literal('normalize→scale→clamp→round'),
    spec_version: z.literal('3.1'),
    orbs: z.any().optional(),
  }).passthrough(),
});

export type DayExportType = z.infer<typeof DayExport>;
