import { DateTime } from 'luxon';
import { createHash } from 'crypto';
import { roundHalfUp, clamp, clampValue, SCALE_FACTOR } from '@/lib/balance/scale';
import type { ClampInfo } from '@/lib/balance/scale';
import { NormalizedDay } from '@/lib/schemas/day';

export type CoherenceSource = 'volatility' | 'coherence';

const DEFAULT_TIMEZONE = 'America/Chicago';
export const SCALE_FACTORS = Object.freeze({
  magnitude: SCALE_FACTOR,
  directional_bias: SCALE_FACTOR,
  coherence: SCALE_FACTOR
});

const SUPPORTIVE_ASPECTS = new Set(['trine', 'sextile', 'semisextile']);
const FRICTIONAL_ASPECTS = new Set([
  'square',
  'opposition',
  'quincunx',
  'semisquare',
  'semi-square',
  'sesquiquadrate',
  'sesquisquare'
]);

const ASPECT_WEIGHTS: Record<string, number> = Object.freeze({
  conjunction: 1.0,
  trine: 0.9,
  sextile: 0.55,
  square: 0.85,
  opposition: 1.0,
  quincunx: 0.35,
  semisquare: 0.45,
  'semi-square': 0.45,
  sesquiquadrate: 0.45,
  sesquisquare: 0.45,
  semisextile: 0.2
});

const ANGLE_NAMES = new Set([
  'Ascendant',
  'Descendant',
  'Medium_Coeli',
  'Imum_Coeli',
  'Midheaven',
  'IC',
  'MC',
  'ASC',
  'DSC'
]);

type AxisKind = 'unipolar' | 'bipolar' | 'coherence';

interface AxisTransform {
  normalized: number | null;
  scaled: number | null;
  clamped: number | null;
  rounded: number | null;
  flags: ClampInfo | null;
}

const AXIS_RANGES: Record<AxisKind, { min: number; max: number; clampMin: number; clampMax: number }> = {
  unipolar: { min: 0, max: 1, clampMin: 0, clampMax: 5 },
  bipolar: { min: -1, max: 1, clampMin: -5, clampMax: 5 },
  coherence: { min: 0, max: 1, clampMin: 0, clampMax: 5 }
};

function transformAxis(kind: AxisKind, normalized: number | null): AxisTransform {
  if (normalized == null) {
    return { normalized: null, scaled: null, clamped: null, rounded: null, flags: null };
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return { normalized: null, scaled: null, clamped: null, rounded: null, flags: null };
  }

  const { min, max, clampMin, clampMax } = AXIS_RANGES[kind];
  if (numeric < min - 1e-6 || numeric > max + 1e-6) {
    throw new Error(`[${kind}] normalized value ${numeric} outside expected range ${min}..${max}`);
  }

  const normalizedClamped = Math.min(max, Math.max(min, numeric));

  const scaled = normalizedClamped * SCALE_FACTOR;

  const [clamped, flags] = clamp(scaled, clampMin, clampMax);
  const rounded = roundHalfUp(clamped, 1);

  return { normalized: normalizedClamped, scaled, clamped, rounded, flags };
}

function assertNSCR(tag: string, kind: AxisKind, trace: AxisTransform) {
  if (trace.scaled == null || trace.clamped == null) {
    return;
  }

  const delta = Math.abs(trace.scaled - trace.clamped);
  if (delta <= 1e-6) {
    return;
  }

  const { clampMin, clampMax } = AXIS_RANGES[kind];
  const tolerance = 1e-6;
  const allowedStops = new Set<number>([clampMin, clampMax]);
  if (kind === 'bipolar') {
    allowedStops.add(0);
  }

  const clampedValue = trace.clamped;
  const nearBoundary = Array.from(allowedStops).some((limit) => Math.abs((clampedValue ?? 0) - limit) <= tolerance);

  if (!nearBoundary) {
    throw new Error(`[${tag}] clamp changed a mid-range value → double scaling suspected`);
  }
}

function formatWithMinus(value: number, decimals: number, opts: { showPlus?: boolean } = {}): string {
  const { showPlus = false } = opts;
  const rounded = value.toFixed(decimals);
  if (value < 0) {
    return `\u2212${rounded.slice(1)}`;
  }
  if (value > 0 && showPlus) {
    return `+${rounded}`;
  }
  return rounded;
}

export interface AspectInput {
  aspect: string;
  orb: number;
  transit_potency?: number;
  target_potency?: number;
  transit?: { name?: string; body?: string } | string;
  target?: { name?: string; body?: string } | string;
}

export interface EngineDayInput {
  date: string;
  magnitude: number;
  directional_bias: number;
  volatility?: number;
  coherence?: number;
  aspects?: AspectInput[];
  timezone?: string;
}

export interface Provenance {
  engine_build: string;
  dataset_id: string;
  run_id: string;
  export_timestamp: string;
}

export interface RendererConfig {
  coherenceFrom: CoherenceSource;
  timezone: string;
  provenance?: Partial<Provenance>;
}

export interface AxisTrace {
  date: string;
  axis: 'magnitude' | 'directional_bias' | 'coherence';
  normalized: number;
  scaled: number;
  clamped: number;
  rounded: number;
  transform: string;
}

export interface ClampCounter {
  axis: string;
  bound: 'min' | 'max';
  hits: number;
  total: number;
  rate: number;
}

export interface ObservabilitySnapshot {
  traces: AxisTrace[];
  clampSummary: ClampCounter[];
  alerts: string[];
}

export interface AxisDisplay {
  value: number;
  display: string;
  unit: string;
  source: 'engine' | 'computed';
  clampHit: boolean;
  precision: number;
}

export interface DayDisplay {
  date: string;
  timezone: string;
  axes: {
    magnitude: AxisDisplay;
    directionalBias: AxisDisplay;
    narrativeCoherence: AxisDisplay;
  };
}

export interface RendererMetadata {
  spec_version: '3.1';
  scaling_mode: 'absolute';
  scale_factors: typeof SCALE_FACTORS;
  coherence_from: CoherenceSource;
  coherence_inversion: boolean;
  pipeline: 'normalize → scale → clamp → round';
  weights_profile_version: 'tight_orbs_v1';
  conjunction_policy: 'neutral';
  normalized_input_hash: string;
  timezone: string;
  provenance: Provenance;
}

export interface RendererResult {
  days: DayDisplay[];
  metadata: RendererMetadata;
  observability: ObservabilitySnapshot;
}

function normalizeAspectName(name: string): string {
  return String(name || '').toLowerCase();
}

function resolveBodyName(body: AspectInput['transit'] | AspectInput['target']): string {
  if (!body) return '';
  if (typeof body === 'string') return body;
  return body.name || body.body || '';
}

function orbMaxForAspect(aspect: string): number {
  switch (aspect) {
    case 'trine':
    case 'sextile':
    case 'square':
    case 'opposition':
      return 3;
    default:
      return 1;
  }
}

function computeAspectWeight(aspect: string, orb: number, transitName: string, targetName: string, transitPotency?: number, targetPotency?: number): number {
  const base = ASPECT_WEIGHTS[aspect] ?? 0;
  if (base <= 0) return 0;
  const orbCap = orbMaxForAspect(aspect);
  const orbWeight = clampValue(1 - Math.abs(orb) / orbCap, 0, 1);
  if (orbWeight <= 0) return 0;
  const potency = clampValue((transitPotency ?? 1) * (targetPotency ?? 1), 0, Number.POSITIVE_INFINITY);
  let modifier = 1;
  if (ANGLE_NAMES.has(transitName) || ANGLE_NAMES.has(targetName)) {
    modifier *= 1.2;
  }
  if (transitName === targetName && FRICTIONAL_ASPECTS.has(aspect)) {
    modifier *= 0.8;
  }
  return base * orbWeight * potency * modifier;
}

function calculateClampCounter(axis: string, bound: 'min' | 'max', hits: number, total: number): ClampCounter {
  const safeTotal = total > 0 ? total : 0;
  const rate = safeTotal === 0 ? 0 : hits / safeTotal;
  return { axis, bound, hits, total: safeTotal, rate };
}

function canonicalizeDate(date: string, timezone: string): string {
  const dt = DateTime.fromISO(date, { zone: timezone });
  if (!dt.isValid) {
    // Attempt to parse without timezone and then set zone
    const fallback = DateTime.fromISO(date);
    if (!fallback.isValid) {
      throw new Error(`Invalid date or timezone for renderer: date="${date}", tz="${timezone}"`);
    }
    const iso = fallback.setZone(timezone).toISODate();
    if (!iso) {
      throw new Error(`Failed to canonicalize date ${date} for timezone ${timezone}`);
    }
    return iso;
  }
  const isoDate = dt.toISODate();
  if (!isoDate) {
    throw new Error(`Failed to canonicalize date ${date} in timezone ${timezone}`);
  }
  return isoDate;
}

function hashNormalizedInput(records: Array<Record<string, unknown>>): string {
  const normalized = JSON.stringify(records);
  return `sha256:${createHash('sha256').update(normalized).digest('hex')}`;
}

export function renderSymbolicWeather(
  inputs: EngineDayInput[],
  config: Partial<RendererConfig> = {}
): RendererResult {
  const coherenceFrom = config.coherenceFrom ?? 'coherence';
  const timezone = config.timezone ?? DEFAULT_TIMEZONE;
  const defaultCoherenceInversion = coherenceFrom === 'volatility';

  const provenance: Provenance = {
    engine_build: config.provenance?.engine_build ?? 'unknown',
    dataset_id: config.provenance?.dataset_id ?? 'unknown',
    run_id: config.provenance?.run_id ?? 'unknown',
    export_timestamp: config.provenance?.export_timestamp ?? new Date().toISOString()
  };

  if (!Array.isArray(inputs) || inputs.length === 0) {
    return {
      days: [],
      metadata: {
        spec_version: '3.1',
        scaling_mode: 'absolute',
        scale_factors: SCALE_FACTORS,
        coherence_from: coherenceFrom,
        coherence_inversion: defaultCoherenceInversion,
        pipeline: 'normalize → scale → clamp → round',
        weights_profile_version: 'tight_orbs_v1',
        conjunction_policy: 'neutral',
        normalized_input_hash: hashNormalizedInput([]),
        timezone,
        provenance
      },
      observability: {
        traces: [],
        clampSummary: [],
        alerts: []
      }
    };
  }

  // Input validation (cheap guardrail)
  for (const input of inputs) {
    try {
      NormalizedDay.parse({
        magnitude: Number(input.magnitude ?? 0),
        directional_bias: Number(input.directional_bias ?? 0),
        volatility: Number(input.volatility ?? 0)
      });
    } catch (error) {
      throw new Error(`Invalid normalized inputs for renderer: ${error instanceof Error ? error.message : 'validation failed'}`);
    }
  }

  const axisTraces: AxisTrace[] = [];
  const clampHits = {
    magnitude: { min: 0, max: 0 },
    directional_bias: { min: 0, max: 0 },
    coherence: { min: 0, max: 0 }
  };

  const normalizedRecordsForHash: Array<Record<string, unknown>> = [];
  const alerts: string[] = [];
  let coherenceComputedFromVolatility = defaultCoherenceInversion;

  const days: DayDisplay[] = inputs.map((input) => {
    const dayTimezone = input.timezone ?? timezone;
    const canonicalDate = canonicalizeDate(input.date, dayTimezone);

    // magnitude
    const magTrace = transformAxis('unipolar', typeof input.magnitude === 'number' ? input.magnitude : null);
    assertNSCR('magnitude', 'unipolar', magTrace);
    const magnitudeNormalized = magTrace.normalized ?? 0;
    const magnitudeScaled = magTrace.scaled ?? 0;
    const magnitudeClamped = magTrace.clamped ?? 0;
    const magnitudeRounded = magTrace.rounded ?? 0;
    const magnitudeClampHit = Boolean(magTrace.flags?.hitMin || magTrace.flags?.hitMax);
    if (magTrace.flags?.hitMin) {
      clampHits.magnitude.min += 1;
    } else if (magTrace.flags?.hitMax) {
      clampHits.magnitude.max += 1;
    }
    axisTraces.push({
      date: canonicalDate,
      axis: 'magnitude',
      normalized: magnitudeNormalized,
      scaled: magnitudeScaled,
      clamped: magnitudeClamped,
      rounded: magnitudeRounded,
      transform: '×5, clamp [0,5], round 1dp'
    });

    // directional
    const biasTrace = transformAxis('bipolar', typeof input.directional_bias === 'number' ? input.directional_bias : null);
    assertNSCR('directional_bias', 'bipolar', biasTrace);
    const directionalNormalized = biasTrace.normalized ?? 0;
    const directionalScaled = biasTrace.scaled ?? 0;
    const directionalClamped = biasTrace.clamped ?? 0;
    const directionalRounded = biasTrace.rounded ?? 0;
    const directionalClampHit = Boolean(biasTrace.flags?.hitMin || biasTrace.flags?.hitMax);
    if (biasTrace.flags?.hitMin) {
      clampHits.directional_bias.min += 1;
    } else if (biasTrace.flags?.hitMax) {
      clampHits.directional_bias.max += 1;
    }
    axisTraces.push({
      date: canonicalDate,
      axis: 'directional_bias',
      normalized: directionalNormalized,
      scaled: directionalScaled,
      clamped: directionalClamped,
      rounded: directionalRounded,
      transform: '×5, clamp [−5,5], round 1dp'
    });

    // coherence (stability): prefer precomputed coherence, otherwise derive once from volatility
    const coherenceFromVolatility = coherenceFrom === 'volatility';
    const coherenceInput =
      !coherenceFromVolatility && typeof input.coherence === 'number'
        ? clampValue(input.coherence, 0, 1)
        : (typeof input.volatility === 'number'
            ? clampValue(1 - clampValue(input.volatility, 0, 1), 0, 1)
            : null);
    const coherenceSource: AxisDisplay['source'] =
      !coherenceFromVolatility && typeof input.coherence === 'number' ? 'engine' : 'computed';
    if (coherenceSource === 'computed') {
      coherenceComputedFromVolatility = true;
    }
    const coherenceTrace = transformAxis('coherence', coherenceInput);
    assertNSCR('coherence', 'coherence', coherenceTrace);
    const coherenceNormalized = coherenceTrace.normalized ?? 0;
    const coherenceScaled = coherenceTrace.scaled ?? 0;
    const coherenceClamped = coherenceTrace.clamped ?? 0;
    const coherenceRounded = coherenceTrace.rounded ?? 0;
    const coherenceClampHit = Boolean(coherenceTrace.flags?.hitMin || coherenceTrace.flags?.hitMax);
    if (coherenceTrace.flags?.hitMin) {
      clampHits.coherence.min += 1;
    } else if (coherenceTrace.flags?.hitMax) {
      clampHits.coherence.max += 1;
    }
    axisTraces.push({
      date: canonicalDate,
      axis: 'coherence',
      normalized: coherenceNormalized,
      scaled: coherenceScaled,
      clamped: coherenceClamped,
      rounded: coherenceRounded,
      transform: coherenceSource === 'computed'
        ? 'coherence = 1 − volatility, ×5, clamp [0,5], round 1dp'
        : '×5, clamp [0,5], round 1dp'
    });

    const magnitudeDisplay = formatWithMinus(magnitudeRounded, 1);
    const directionalDisplay = formatWithMinus(directionalRounded, 1, { showPlus: directionalRounded > 0 });
    const coherenceDisplay = formatWithMinus(coherenceRounded, 1);

    normalizedRecordsForHash.push({
      date: canonicalDate,
      timezone: dayTimezone,
      magnitude: roundHalfUp(magnitudeNormalized, 6),
      directional_bias: roundHalfUp(directionalNormalized, 6),
      volatility: roundHalfUp(Number(input.volatility ?? 0), 6),
      coherence: roundHalfUp(coherenceInput ?? 0, 6),
      coherence_from: coherenceFrom
    });

    return {
      date: canonicalDate,
      timezone: dayTimezone,
      axes: {
        magnitude: {
          value: magnitudeRounded,
          display: magnitudeDisplay,
          unit: '0–5',
          source: 'engine',
          clampHit: magnitudeClampHit,
          precision: 1
        },
        directionalBias: {
          value: directionalRounded,
          display: directionalDisplay,
          unit: '−5…+5',
          source: 'engine',
          clampHit: directionalClampHit,
          precision: 1
        },
        narrativeCoherence: {
          value: coherenceRounded,
          display: coherenceDisplay,
          unit: '0–5',
          source: coherenceSource,
          clampHit: coherenceClampHit,
          precision: 1
        }
      }
    };
  });

  const totalDays = days.length;
  const totalSamples = totalDays; // future: axisSamples.magnitude, etc.
  const clampSummary: ClampCounter[] = [
    calculateClampCounter('magnitude', 'min', clampHits.magnitude.min, totalSamples),
    calculateClampCounter('magnitude', 'max', clampHits.magnitude.max, totalSamples),
    calculateClampCounter('directional_bias', 'min', clampHits.directional_bias.min, totalSamples),
    calculateClampCounter('directional_bias', 'max', clampHits.directional_bias.max, totalSamples),
    calculateClampCounter('coherence', 'min', clampHits.coherence.min, totalSamples),
    calculateClampCounter('coherence', 'max', clampHits.coherence.max, totalSamples)
  ];

  if (totalDays > 0) {
    const directionalClampRate = (clampHits.directional_bias.min + clampHits.directional_bias.max) / totalDays;
    if (directionalClampRate > 0.1) {
      alerts.push('Directional bias clamp rate exceeded 10% in absolute scaling mode.');
    }
    const magnitudeClampRate = (clampHits.magnitude.min + clampHits.magnitude.max) / totalDays;
    if (magnitudeClampRate > 0.2) {
      alerts.push('Magnitude clamp rate exceeded 20% in absolute scaling mode.');
    }
    const coherenceClampRate = (clampHits.coherence.min + clampHits.coherence.max) / totalDays;
    if (coherenceClampRate > 0.2) {
      alerts.push('Coherence clamp rate exceeded 20% in absolute scaling mode.');
    }
  }

  return {
    days,
    metadata: {
      spec_version: '3.1',
      scaling_mode: 'absolute',
      scale_factors: SCALE_FACTORS,
      coherence_from: coherenceFrom,
      coherence_inversion: coherenceComputedFromVolatility,
      pipeline: 'normalize → scale → clamp → round',
      weights_profile_version: 'tight_orbs_v1',
      conjunction_policy: 'neutral',
      normalized_input_hash: hashNormalizedInput(normalizedRecordsForHash),
      timezone,
      provenance
    },
    observability: {
      traces: axisTraces,
      clampSummary,
      alerts
    }
  };
}
