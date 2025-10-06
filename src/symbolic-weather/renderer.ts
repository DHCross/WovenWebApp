import { DateTime } from 'luxon';
import { createHash } from 'crypto';
import { scaleUnipolar, scaleBipolar, scaleCoherenceFromVol, roundHalfUp, clamp, clampValue, SCALE_FACTOR } from '@/lib/balance/scale';
import { NormalizedDay } from '@/lib/schemas/day';

export type CoherenceSource = 'volatility' | 'coherence';

const DEFAULT_TIMEZONE = 'America/Chicago';
export const SCALE_FACTORS = Object.freeze({
  magnitude: SCALE_FACTOR,
  directional_bias: SCALE_FACTOR,
  coherence: SCALE_FACTOR,
  sfd: 10
});

const SUPPORTIVE_ASPECTS = new Set(['trine', 'sextile']);
const FRICTIONAL_ASPECTS = new Set([
  'square',
  'opposition',
  'quincunx',
  'semisquare',
  'semi-square',
  'sesquiquadrate',
  'sesquisquare'
]);

const ASPECT_WEIGHTS: Record<string, number> = {
  trine: 1.0,
  sextile: 0.8,
  square: 1.0,
  opposition: 1.0,
  quincunx: 0.6,
  semisquare: 0.6,
  'semi-square': 0.6,
  sesquiquadrate: 0.6,
  sesquisquare: 0.6
};

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
  sfd?: number | null;
  sfd_pre_scaled?: boolean;
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

export interface SfdTrace {
  date: string;
  axis: 'sfd';
  supportive_sum: number | null;
  frictional_sum: number | null;
  score_raw: number | null;
  scaled: number | null;
  clamped: number | null;
  rounded: number | null;
  display: number | 'n/a';
  reason?: 'input' | 'computed' | 'absent';
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
  sfd: SfdTrace[];
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

export interface SfdDisplay {
  value: number | null;
  display: string;
  status: 'n/a' | 'ok';
  source: 'engine' | 'computed' | 'absent';
  supportive: number | null;
  frictional: number | null;
  precision: number;
}

interface ComputedSfdResult {
  value: number | null;
  raw: number | null;
  supportive: number | null;
  frictional: number | null;
  source: 'computed' | 'absent';
}

export interface DayDisplay {
  date: string;
  timezone: string;
  axes: {
    magnitude: AxisDisplay;
    directionalBias: AxisDisplay;
    narrativeCoherence: AxisDisplay;
    integrationBias: SfdDisplay;
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
  sfd_pre_scaled: boolean;
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

function computeSfdFromAspects(aspects: AspectInput[] | undefined): ComputedSfdResult {
  if (!aspects || aspects.length === 0) {
    return { value: null, raw: null, supportive: null, frictional: null, source: 'absent' };
  }

  let supportiveSum = 0;
  let frictionalSum = 0;

  for (const aspectRecord of aspects) {
    const aspectName = normalizeAspectName(aspectRecord.aspect);
    const transitName = resolveBodyName(aspectRecord.transit);
    const targetName = resolveBodyName(aspectRecord.target);
    const weight = computeAspectWeight(
      aspectName,
      Number(aspectRecord.orb ?? 0),
      transitName,
      targetName,
      aspectRecord.transit_potency,
      aspectRecord.target_potency
    );

    if (weight <= 0) continue;

    if (SUPPORTIVE_ASPECTS.has(aspectName)) {
      supportiveSum += weight;
    } else if (FRICTIONAL_ASPECTS.has(aspectName)) {
      frictionalSum += weight;
    }
  }

  if (supportiveSum === 0 && frictionalSum === 0) {
    return { value: null, raw: null, supportive: 0, frictional: 0, source: 'absent' };
  }

  const raw = (supportiveSum - frictionalSum) / (supportiveSum + frictionalSum);
  const [clamped] = clamp(raw, -1, 1);
  const rounded = roundHalfUp(clamped, 2);
  return { value: rounded, raw, supportive: supportiveSum, frictional: frictionalSum, source: 'computed' };
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

function resolveSfdDisplay(
  dayInput: EngineDayInput,
  computed: ComputedSfdResult
): {
  value: number | null;
  display: string;
  status: 'n/a' | 'ok';
  source: 'engine' | 'computed' | 'absent';
  supportive: number | null;
  frictional: number | null;
  trace: SfdTrace;
} {
  const provided = dayInput.sfd;
  const parsedInput = typeof provided === 'string' ? Number(provided) : provided;
  const hasInput = typeof parsedInput === 'number' && Number.isFinite(parsedInput);
  let value: number | null = null;
  let source: 'engine' | 'computed' | 'absent' = 'absent';
  let supportive = computed.supportive;
  let frictional = computed.frictional;
  let scoreRaw: number | null = null;
  let scaled: number | null = null;
  let clamped: number | null = null;
  let rounded: number | null = null;

  if (hasInput) {
    source = 'engine';
    const preScaled = dayInput.sfd_pre_scaled === true;
    scoreRaw = preScaled ? parsedInput : parsedInput * SCALE_FACTORS.sfd;
    const [bounded, clampFlags] = clamp(scoreRaw, -1, 1);
    clamped = bounded;
    rounded = roundHalfUp(bounded, 2);
    value = rounded;
  } else if (computed.value !== null) {
    source = computed.source;
    supportive = computed.supportive;
    frictional = computed.frictional;
    scoreRaw = computed.raw ?? computed.value;
    scaled = scoreRaw;
    const [bounded, clampFlags] = clamp(scoreRaw ?? 0, -1, 1);
    clamped = bounded;
    rounded = roundHalfUp(bounded, 2);
    value = rounded;
  }

  if (value === null) {
    return {
      value: null,
      display: 'n/a',
      status: 'n/a',
      source,
      supportive,
      frictional,
      trace: {
        date: dayInput.date || '',
        axis: 'sfd',
        supportive_sum: supportive,
        frictional_sum: frictional,
        score_raw: scoreRaw,
        scaled: null,
        clamped: null,
        rounded: null,
        display: 'n/a',
        reason: source === 'engine' ? 'input' : source
      }
    };
  }

  if (!hasInput && (supportive == null || frictional == null || supportive + frictional === 0)) {
    throw new Error(`Fabrication sentinel: tried to display SFD without aspect drivers on ${dayInput.date || 'unknown date'}.`);
  }

  const display = formatWithMinus(value, 2, { showPlus: value > 0 });
  return {
    value,
    display,
    status: 'ok',
    source,
    supportive,
    frictional,
    trace: {
      date: '',
      axis: 'sfd',
      supportive_sum: supportive,
      frictional_sum: frictional,
      score_raw: scoreRaw,
      scaled,
      clamped,
      rounded,
      display: value,
      reason: source === 'engine' ? 'input' : source
    }
  };
}

export function renderSymbolicWeather(
  inputs: EngineDayInput[],
  config: Partial<RendererConfig> = {}
): RendererResult {
  const coherenceFrom = config.coherenceFrom ?? 'volatility';
  const timezone = config.timezone ?? DEFAULT_TIMEZONE;

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
        coherence_inversion: coherenceFrom === 'volatility',
        pipeline: 'normalize → scale → clamp → round',
        weights_profile_version: 'tight_orbs_v1',
        conjunction_policy: 'neutral',
        sfd_pre_scaled: false,
        normalized_input_hash: hashNormalizedInput([]),
        timezone,
        provenance
      },
      observability: {
        traces: [],
        sfd: [],
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
        volatility: Number(input.volatility ?? 0),
        sfd: (typeof input.sfd === 'number' ? input.sfd : null)
      });
    } catch (error) {
      throw new Error(`Invalid normalized inputs for renderer: ${error instanceof Error ? error.message : 'validation failed'}`);
    }
  }

  const axisTraces: AxisTrace[] = [];
  const sfdTraces: SfdTrace[] = [];
  const clampHits = {
    magnitude: { min: 0, max: 0 },
    directional_bias: { min: 0, max: 0 },
    coherence: { min: 0, max: 0 },
    sfd: { min: 0, max: 0 }
  };

  const normalizedRecordsForHash: Array<Record<string, unknown>> = [];

  const days: DayDisplay[] = inputs.map((input) => {
    const dayTimezone = input.timezone ?? timezone;
    const canonicalDate = canonicalizeDate(input.date, dayTimezone);

    // magnitude
    const mag = scaleUnipolar(Number(input.magnitude ?? 0)); // norm → ×50 → clamp [0,5] → round(1dp)
    const magnitudeNormalized = Number(input.magnitude ?? 0);
    const magnitudeScaled = mag.raw;
    const magnitudeClamped = mag.raw; // raw is already clamped in the scaler
    const magnitudeRounded = mag.value;
    const magnitudeClampHit = mag.flags.hitMin || mag.flags.hitMax;
    if (magnitudeClampHit) {
      if (mag.flags.hitMin) {
        clampHits.magnitude.min += 1;
      } else if (mag.flags.hitMax) {
        clampHits.magnitude.max += 1;
      }
    }
    axisTraces.push({
      date: canonicalDate,
      axis: 'magnitude',
      normalized: magnitudeNormalized,
      scaled: magnitudeScaled,
      clamped: magnitudeClamped,
      rounded: magnitudeRounded,
      transform: '×50, clamp [0,5], round 1dp'
    });

    // directional
    const bias = scaleBipolar(Number(input.directional_bias ?? 0)); // norm → ×50 → clamp [−5,5] → round(1dp)
    const directionalNormalized = Number(input.directional_bias ?? 0);
    const directionalScaled = bias.raw;
    const directionalClamped = bias.raw; // raw is already clamped in the scaler
    const directionalRounded = bias.value;
    const directionalClampHit = bias.flags.hitMin || bias.flags.hitMax;
    if (directionalClampHit) {
      if (bias.flags.hitMin) {
        clampHits.directional_bias.min += 1;
      } else if (bias.flags.hitMax) {
        clampHits.directional_bias.max += 1;
      }
    }
    axisTraces.push({
      date: canonicalDate,
      axis: 'directional_bias',
      normalized: directionalNormalized,
      scaled: directionalScaled,
      clamped: directionalClamped,
      rounded: directionalRounded,
      transform: '×50, clamp [−5,5], round 1dp'
    });

    // coherence (from volatility)
    const coh = (coherenceFrom === 'volatility')
      ? scaleCoherenceFromVol(Number(input.volatility ?? 0))        // 5 − (vol×50) → clamp [0,5] → round(1dp)
      : scaleUnipolar(Number(input.coherence ?? 0));
    const coherenceSourceValue = coherenceFrom === 'volatility'
      ? Number(input.volatility ?? 0)
      : Number(input.coherence ?? 0);
    const coherenceScaled = coh.raw;
    const coherenceClamped = coh.raw; // raw is already clamped in the scaler
    const coherenceRounded = coh.value;
    const coherenceClampHit = coh.flags.hitMin || coh.flags.hitMax;
    if (coherenceClampHit) {
      if (coh.flags.hitMin) {
        clampHits.coherence.min += 1;
      } else if (coh.flags.hitMax) {
        clampHits.coherence.max += 1;
      }
    }
    axisTraces.push({
      date: canonicalDate,
      axis: 'coherence',
      normalized: coherenceSourceValue,
      scaled: coherenceScaled,
      clamped: coherenceClamped,
      rounded: coherenceRounded,
      transform: coherenceFrom === 'volatility'
        ? '5 − (volatility × 50), clamp [0,5], round 1dp'
        : '×50, clamp [0,5], round 1dp'
    });

    const computedSfd = computeSfdFromAspects(input.aspects);
    const sfdDisplay = resolveSfdDisplay({ ...input, date: canonicalDate }, computedSfd);
    sfdTraces.push(sfdDisplay.trace);

    // SFD pre-scaled detection: remove the heuristic
    const preScaled = input.sfd_pre_scaled === true;
    if (!preScaled && Math.abs(Number(input.sfd ?? 0)) > 0.2) {
      alerts.push(`SFD suspicious magnitude without pre_scaled flag on ${canonicalDate}`);
    }

    if (
      sfdDisplay.status === 'ok' &&
      sfdDisplay.trace.scaled != null &&
      sfdDisplay.trace.clamped != null &&
      sfdDisplay.trace.scaled !== sfdDisplay.trace.clamped
    ) {
      if (sfdDisplay.trace.scaled < -1 && sfdDisplay.trace.clamped === -1) {
        clampHits.sfd.min += 1;
      } else if (sfdDisplay.trace.scaled > 1 && sfdDisplay.trace.clamped === 1) {
        clampHits.sfd.max += 1;
      }
    }

    const magnitudeDisplay = formatWithMinus(magnitudeRounded, 1);
    const directionalDisplay = formatWithMinus(directionalRounded, 1, { showPlus: directionalRounded > 0 });
    const coherenceDisplay = formatWithMinus(coherenceRounded, 1);

    const hashedSfd = (() => {
      if (typeof input.sfd === 'number' && Number.isFinite(input.sfd)) {
        return roundHalfUp(input.sfd, 6);
      }
      if (typeof input.sfd === 'string') {
        const parsed = Number(input.sfd);
        if (Number.isFinite(parsed)) {
          return roundHalfUp(parsed, 6);
        }
      }
      return null;
    })();

    normalizedRecordsForHash.push({
      date: canonicalDate,
      timezone: dayTimezone,
      magnitude: roundHalfUp(magnitudeNormalized, 6),
      directional_bias: roundHalfUp(directionalNormalized, 6),
      volatility: roundHalfUp(Number(input.volatility ?? 0), 6),
      coherence: roundHalfUp(Number(input.coherence ?? 0), 6),
      sfd: hashedSfd,
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
          source: coherenceFrom === 'volatility' ? 'computed' : 'engine',
          clampHit: coherenceClampHit,
          precision: 1
        },
        integrationBias: {
          value: sfdDisplay.value,
          display: sfdDisplay.display,
          status: sfdDisplay.status,
          source: sfdDisplay.source,
          supportive: sfdDisplay.supportive,
          frictional: sfdDisplay.frictional,
          precision: 2
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
    calculateClampCounter('coherence', 'max', clampHits.coherence.max, totalSamples),
    calculateClampCounter('sfd', 'min', clampHits.sfd.min, totalSamples),
    calculateClampCounter('sfd', 'max', clampHits.sfd.max, totalSamples)
  ];

  const alerts: string[] = [];
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
      coherence_inversion: coherenceFrom === 'volatility',
      pipeline: 'normalize → scale → clamp → round',
      weights_profile_version: 'tight_orbs_v1',
      conjunction_policy: 'neutral',
      sfd_pre_scaled: inputs.some((input) => input.sfd_pre_scaled === true),
      normalized_input_hash: hashNormalizedInput(normalizedRecordsForHash),
      timezone,
      provenance
    },
    observability: {
      traces: axisTraces,
      sfd: sfdTraces,
      clampSummary,
      alerts
    }
  };
}
