import {
  scaleUnipolar,
  scaleBipolar,
  scaleCoherenceFromVol,
  scaleSFD,
  ClampInfo,
  SCALE_FACTOR,
} from '@/lib/balance/scale';
import {
  assertBalanceMeterInvariants,
  assertDisplayRanges,
  assertNotDoubleInverted,
  assertSfdDrivers,
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
  /** 0..1 (volatility) → inverted → 0..5 coherence */
  volatility: number;
  /** null or −1..+1 (ratio-diff); never fabricated */
  sfd: number | null;
  /** Optional driver count for SFD assertions */
  sfd_drivers?: number;
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

export type SfdDisplay = {
  raw: number | null;
  value: number | null;
  display: string; // 'n/a' when null
  flags: ClampInfo;
};

export type RelationalDayExport = {
  normalized: RelationalNormalizedDay;
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
    coherence_from: 'volatility' | 'coherence';
  };
  meta: {
    mode: 'relational';
    spec_version: '3.1';
    scaling_mode: 'absolute';
    scale_factor: 5;
    scale_factors: {
      magnitude: 5;
      directional_bias: 5;
      coherence: 5;
      sfd: 10;
    };
    pipeline: 'normalize→scale→clamp→round';
    coherence_inversion: true;
    coherence_from: 'volatility' | 'coherence';
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
  coherence_from?: 'volatility' | 'coherence'; // default 'volatility'
  includeTrace?: boolean;
};

/** Build a spec-stamped, relational day export (v3.1) */
export function buildRelationalDayExport(
  relN: RelationalNormalizedDay,
  profile: OrbsProfile = DEFAULT_RELATIONAL_ORBS,
  opts: BuildRelationalOptions = {},
): RelationalDayExport {
  assertRelationalOrbs(profile);

  const coherenceFrom = opts.coherence_from ?? 'volatility';
  // v3.1 expects inversion-from-volatility; stamp explicitly to prevent double inversion downstream.
  // If you later support pre-inverted coherence input, update scalers accordingly.

  // Canonical scaling
  const magnitude = scaleUnipolar(relN.magnitude);
  const bias = scaleBipolar(relN.directional_bias);
  const coherence = scaleCoherenceFromVol(relN.volatility);
  const sfd = scaleSFD(relN.sfd, true);

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
      // trace shows volatility input used for inversion
      coherence: withTrace(
        { raw: coherence.raw, value: coherence.value, flags: coherence.flags },
        relN.volatility,
        0, 5
      ),
      sfd: {
        raw: sfd.raw,
        value: sfd.value,
        display: sfd.display, // 'n/a' when null — no fabrication
        flags: sfd.flags,
      },
    },
    scaling: {
      mode: 'absolute' as const,
      factor: 5 as const,
      pipeline: 'normalize→scale→clamp→round' as const,
      coherence_inversion: true as const,
      coherence_from: coherenceFrom,
    },
    meta: {
      mode: 'relational' as const,
      spec_version: '3.1' as const,
      scaling_mode: 'absolute' as const,
      scale_factor: 5 as const,
      scale_factors: {
        magnitude: 5 as const,
        directional_bias: 5 as const,
        coherence: 5 as const,
        sfd: 10 as const,
      },
      pipeline: 'normalize→scale→clamp→round' as const,
      coherence_inversion: true as const,
      coherence_from: coherenceFrom,
      orbs: profile,
      timezone: opts.timezone,
      provenance: opts.provenance,
      normalized_input_hash: opts.normalized_input_hash,
    },
  } satisfies RelationalDayExport;

  // Runtime validation: enforce spec v3.1 compliance
  const validatePayload = {
    axes: {
      magnitude: { normalized: relN.magnitude, ...payload.display.magnitude },
      directional_bias: { normalized: relN.directional_bias, ...payload.display.directional_bias },
      coherence: { normalized: relN.volatility, ...payload.display.coherence },
      sfd: { normalized: relN.sfd, ...payload.display.sfd },
    },
    labels: { magnitude: '', directional_bias: '', coherence: '', sfd: '' },
    scaling: payload.scaling,
    _raw: {}
  };
  assertBalanceMeterInvariants(validatePayload as any);

  const sfdDisplayValue = sfd.value ?? 'n/a';
  assertDisplayRanges({
    mag: magnitude.value,
    bias: bias.value,
    coh: coherence.value,
    sfd: sfdDisplayValue,
  });
  if (coherenceFrom === 'volatility') {
    assertNotDoubleInverted(relN.volatility, coherence.value);
  }
  assertSfdDrivers(relN.sfd_drivers ?? Number.NaN, sfdDisplayValue);

  DayExport.parse(payload); // Zod guard
  return payload;
}
