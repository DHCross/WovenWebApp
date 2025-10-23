import {
  scaleUnipolar,
  scaleBipolar,
  ClampInfo,
  SCALE_FACTOR,
} from '@/lib/balance/scale';
import {
  assertBalanceMeterInvariants,
  assertDisplayRanges,
} from '@/lib/balance/assertions';
import { DayExport } from '@/lib/schemas/day';
import {
  DEFAULT_RELATIONAL_ORBS,
  OrbsProfile,
  assertRelationalOrbs
} from '@/lib/aspects/orbs';

export type RelationalNormalizedDay = {
  /** 0..1 → ×5 → 0..5 */
  magnitude: number;
  /** −1..+1 → ×5 → −5..+5 */
  directional_bias: number;
  /** 0..1 (volatility) */
  volatility: number;
};

export type AxisDisplay = {
  raw: number;
  value: number;
  flags: ClampInfo;
  trace?: {
    normalized: number;
    scaled: number;
    clamped: number;
    rounded: number;
  };
};

export type RelationalDayExport = {
  normalized: RelationalNormalizedDay;
  display: {
    magnitude: AxisDisplay;
    directional_bias: AxisDisplay;
  };
  scaling: {
    mode: 'absolute';
    factor: 5;
    pipeline: 'normalize→scale→clamp→round';
  };
  meta: {
    mode: 'relational';
    spec_version: '5.0';
    scaling_mode: 'absolute';
    scale_factor: 5;
    scale_factors: {
      magnitude: 5;
      directional_bias: 5;
    };
    pipeline: 'normalize→scale→clamp→round';
    orbs: OrbsProfile;
    timezone?: string;
    provenance?: {
      run_id: string;
      engine_build?: string;
      rendered_at_utc?: string;
    };
    normalized_input_hash?: string;
  };
};

type BuildRelationalOptions = {
  timezone?: string;
  provenance?: {
    run_id: string;
    engine_build?: string;
    rendered_at_utc?: string;
  };
  normalized_input_hash?: string;
  includeTrace?: boolean;
};

/** Build a spec-stamped, relational day export (v5.0) */
export function buildRelationalDayExport(
  relN: RelationalNormalizedDay,
  profile: OrbsProfile = DEFAULT_RELATIONAL_ORBS,
  opts: BuildRelationalOptions = {},
): RelationalDayExport {
  assertRelationalOrbs(profile);

  // Canonical scaling
  const magnitude = scaleUnipolar(relN.magnitude);
  const bias = scaleBipolar(relN.directional_bias);

  // Optional lightweight trace for observability (values still come from canonical scalers)
  const withTrace = <T extends AxisDisplay>(
    axis: T,
    normalized: number,
    clampMin: number,
    clampMax: number
  ): T => {
    if (!opts.includeTrace) return axis;
    const scaled = normalized * SCALE_FACTOR;
    const clamped = Math.max(clampMin, Math.min(clampMax, scaled));
    const rounded = Number(axis.value.toFixed(1));
    return {
      ...axis,
      trace: { normalized, scaled, clamped, rounded },
    };
  };

  const payload = {
    normalized: relN,
    display: {
      magnitude: withTrace(
        { raw: magnitude.raw, value: magnitude.value, flags: magnitude.flags },
        relN.magnitude,
        0, 5
      ),
      directional_bias: withTrace(
        { raw: bias.raw, value: bias.value, flags: bias.flags },
        relN.directional_bias,
        -5, 5
      ),
    },
    scaling: {
      mode: 'absolute' as const,
      factor: 5 as const,
      pipeline: 'normalize→scale→clamp→round' as const,
    },
    meta: {
      mode: 'relational' as const,
      spec_version: '5.0' as const,
      scaling_mode: 'absolute' as const,
      scale_factor: 5 as const,
      scale_factors: {
        magnitude: 5 as const,
        directional_bias: 5 as const,
      },
      pipeline: 'normalize→scale→clamp→round' as const,
      orbs: profile,
      timezone: opts.timezone,
      provenance: opts.provenance,
      normalized_input_hash: opts.normalized_input_hash,
    },
  } satisfies RelationalDayExport;

  // Runtime validation: enforce spec v5.0 compliance
  const validatePayload = {
    axes: {
      magnitude: { normalized: relN.magnitude, ...payload.display.magnitude },
      directional_bias: { normalized: relN.directional_bias, ...payload.display.directional_bias },
    },
    labels: { magnitude: '', directional_bias: '' },
    scaling: payload.scaling,
    _raw: {}
  };
  assertBalanceMeterInvariants(validatePayload as any);

  assertDisplayRanges({
    mag: magnitude.value,
    bias: bias.value,
  });

  DayExport.parse(payload); // Zod guard
  return payload;
}
