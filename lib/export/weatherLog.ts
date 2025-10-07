import {
  scaleUnipolar,
  scaleBipolar,
  scaleCoherenceFromVol,
  scaleSFD,
  ClampInfo,
} from '@/lib/balance/scale';
import { assertDisplayRanges, assertNotDoubleInverted } from '@/lib/balance/assertions';
import { DayExport } from '@/lib/schemas/day';

export type NormalizedDay = {
  magnitude: number;
  directional_bias: number;
  volatility: number;
  sfd: number | null;
};

export type AxisDisplay = {
  raw: number;
  value: number;
  flags: ClampInfo;
};

export type SfdDisplay = {
  raw: number | null;
  value: number | null;
  display: string;
  flags: ClampInfo;
};

// Optional build config for deeper provenance
export type BuildDayOptions = {
  orbs_profile?: string;
  timezone?: string;
  provenance?: string;
  normalized_input_hash?: string;
  driversCount?: number;
};

export type WeatherLogDay = {
  normalized: NormalizedDay;
  display: {
    magnitude: AxisDisplay;
    directional_bias: AxisDisplay;
    coherence: AxisDisplay;
    sfd: SfdDisplay;
  };
  scaling: {
    mode: 'absolute';
    factor: 5;
    pipeline: 'normalize→scale→clamp→round';
    coherence_inversion: true;
    coherence_from: 'volatility'; // Explicit label
  };
  meta: {
    scaling_mode: 'absolute';
    scale_factor: 5; // Keep for backward compatibility
    scale_factors: { magnitude: 5; directional_bias: 5; coherence: 5 }; // All axes
    coherence_inversion: true;
    coherence_from: 'volatility';
    pipeline: 'normalize→scale→clamp→round';
    spec_version: '3.1';
    orbs_profile?: string;
    timezone?: string;
    provenance?: string;
    normalized_input_hash?: string;
  };
  trace?: {
    // For observability: clamp hits, rounding deltas, etc.
    clamp_hits?: string[];
    rounding_deltas?: Record<string, number>;
  };
};

export function buildDayExport(
  n: NormalizedDay,
  opts?: BuildDayOptions
): WeatherLogDay {
  const magnitude = scaleUnipolar(n.magnitude);
  const bias = scaleBipolar(n.directional_bias);
  const coherence = scaleCoherenceFromVol(n.volatility);
  const sfd = scaleSFD(n.sfd, true);

  // Trace: accumulate clamp hits for deep debugging
  const clamp_hits: string[] = [];
  if (magnitude.flags.hitMin) clamp_hits.push('magnitude→low');
  if (magnitude.flags.hitMax) clamp_hits.push('magnitude→high');
  if (bias.flags.hitMin) clamp_hits.push('directional_bias→low');
  if (bias.flags.hitMax) clamp_hits.push('directional_bias→high');
  if (coherence.flags.hitMin) clamp_hits.push('coherence→low');
  if (coherence.flags.hitMax) clamp_hits.push('coherence→high');

  const payload: WeatherLogDay = {
    normalized: n,
    display: {
      magnitude: {
        raw: magnitude.raw,
        value: magnitude.value,
        flags: magnitude.flags,
      },
      directional_bias: {
        raw: bias.raw,
        value: bias.value,
        flags: bias.flags,
      },
      coherence: {
        raw: coherence.raw,
        value: coherence.value,
        flags: coherence.flags,
      },
      sfd: {
        raw: sfd.raw,
        value: sfd.value,
        display: sfd.display,
        flags: sfd.flags,
      },
    },
    scaling: {
      mode: 'absolute' as const,
      factor: 5 as const,
      pipeline: 'normalize→scale→clamp→round' as const,
      coherence_inversion: true as const,
      coherence_from: 'volatility' as const,
    },
    meta: {
      scaling_mode: 'absolute' as const,
      scale_factor: 5 as const, // Keep for backward compatibility
      scale_factors: { magnitude: 5, directional_bias: 5, coherence: 5 },
      coherence_inversion: true as const,
      coherence_from: 'volatility' as const,
      pipeline: 'normalize→scale→clamp→round' as const,
      spec_version: '3.1' as const,
      ...(opts?.orbs_profile && { orbs_profile: opts.orbs_profile }),
      ...(opts?.timezone && { timezone: opts.timezone }),
      ...(opts?.provenance && { provenance: opts.provenance }),
      ...(opts?.normalized_input_hash && { normalized_input_hash: opts.normalized_input_hash }),
    },
  };

  // Add trace block if we have clamp hits
  if (clamp_hits.length > 0) {
    payload.trace = { clamp_hits };
  }

  assertDisplayRanges({
    mag: magnitude.value,
    bias: bias.value,
    coh: coherence.value
  });
  assertNotDoubleInverted(n.volatility, coherence.value);

  DayExport.parse(payload);
  return payload;
}
