import {
  scaleUnipolar,
  scaleBipolar,
  scaleCoherenceFromVol,
  scaleSFD,
  ClampInfo,
} from '@/lib/balance/scale';
import { assertBalanceMeterInvariants } from '@/lib/balance/assertions';
import { DayExport } from '@/lib/schemas/day';
import { DEFAULT_RELATIONAL_ORBS, OrbsProfile, assertRelationalOrbs } from '@/lib/aspects/orbs';

export type RelationalNormalizedDay = {
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
    factor: 50;
    pipeline: 'normalize→scale→clamp→round';
    coherence_inversion: true;
  };
  meta: {
    mode: 'relational';
    scaling_mode: 'absolute';
    scale_factor: 50;
    coherence_inversion: true;
    pipeline: 'normalize→scale→clamp→round';
    spec_version: '3.1';
    orbs: OrbsProfile;
  };
};

export function buildRelationalDayExport(
  relN: RelationalNormalizedDay,
  profile: OrbsProfile = DEFAULT_RELATIONAL_ORBS,
): RelationalDayExport {
  assertRelationalOrbs(profile);

  const magnitude = scaleUnipolar(relN.magnitude);
  const bias = scaleBipolar(relN.directional_bias);
  const coherence = scaleCoherenceFromVol(relN.volatility);
  const sfd = scaleSFD(relN.sfd, relN.sfd != null && Math.abs(relN.sfd) > 0.15);

  const payload = {
    normalized: relN,
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
      factor: 50 as const,
      pipeline: 'normalize→scale→clamp→round' as const,
      coherence_inversion: true as const,
    },
    meta: {
      mode: 'relational' as const,
      scaling_mode: 'absolute' as const,
      scale_factor: 50 as const,
      coherence_inversion: true as const,
      pipeline: 'normalize→scale→clamp→round' as const,
      spec_version: '3.1' as const,
      orbs: profile,
    },
  } satisfies RelationalDayExport;

  // Runtime validation: enforce spec v3.1 compliance
  // Transform to expected format for assertion
  const validatePayload = {
    axes: {
      magnitude: { normalized: relN.magnitude, ...payload.display.magnitude },
      directional_bias: { normalized: relN.directional_bias, ...payload.display.directional_bias },
      coherence: { normalized: relN.volatility, ...payload.display.coherence },
      sfd: { normalized: relN.sfd, ...payload.display.sfd },
    },
    labels: {
      magnitude: '', directional_bias: '', coherence: '', sfd: '' // Not validated
    },
    scaling: payload.scaling,
    _raw: {}
  };
  assertBalanceMeterInvariants(validatePayload as any);

  DayExport.parse(payload);
  return payload;
}
