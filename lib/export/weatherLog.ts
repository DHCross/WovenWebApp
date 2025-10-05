import {
  scaleUnipolar,
  scaleBipolar,
  scaleCoherenceFromVol,
  scaleSFD,
  ClampInfo,
} from '@/lib/balance/scale';
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
    factor: 50;
    pipeline: 'normalize→scale→clamp→round';
    coherence_inversion: true;
  };
  meta: {
    scaling_mode: 'absolute';
    scale_factor: 50;
    coherence_inversion: true;
    pipeline: 'normalize→scale→clamp→round';
    spec_version: '3.1';
  };
};

export function buildDayExport(n: NormalizedDay): WeatherLogDay {
  const magnitude = scaleUnipolar(n.magnitude);
  const bias = scaleBipolar(n.directional_bias);
  const coherence = scaleCoherenceFromVol(n.volatility);
  const sfd = scaleSFD(n.sfd, n.sfd != null && Math.abs(n.sfd) > 0.15);

  const payload = {
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
      factor: 50 as const,
      pipeline: 'normalize→scale→clamp→round' as const,
      coherence_inversion: true as const,
    },
    meta: {
      scaling_mode: 'absolute' as const,
      scale_factor: 50 as const,
      coherence_inversion: true as const,
      pipeline: 'normalize→scale→clamp→round' as const,
      spec_version: '3.1' as const,
    },
  } satisfies WeatherLogDay;

  DayExport.parse(payload);
  return payload;
}
