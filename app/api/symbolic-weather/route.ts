/**
 * Symbolic Weather API Endpoint
 * Returns time-series balance meter data for seismograph visualization
 *
 * IMPORTANT: House frame is ALWAYS natal. The upstream API cannot recalculate
 * houses for relocation. Any place-specific guidance must come from author overlay.
 *
 * Query params:
 *   - start: ISO date string (YYYY-MM-DD)
 *   - end: ISO date string (YYYY-MM-DD)
 *   - step: 'daily' | 'weekly' (default: daily)
 *   - userId: (optional) User ID for stored chart lookup
 *   - chartId: (optional) Chart ID for specific report
 *
 * Returns array of daily readings with BM-v3 schema including house framing:
 * [
 *   {
 *     date: "2025-11-01",
 *     magnitude_0to5: 3.8,
 *     bias_signed_minus5to5: -2.7,
 *     coherence_0to5: 2.3,
 *     sfd_cont_minus1to1: -0.12,
 *     schema_version: "BM-v3",
 *     orbs_profile: "tight",
 *     house_frame: "natal",                   // ALWAYS natal
 *     relocation_supported: false,            // API cannot recalc houses
 *     relocation_overlay: {                   // Optional author guidance
 *       user_place: "Austin, TX",
 *       advisory: "...",
 *       confidence: "author_note"
 *     },
 *     provenance: { ... }
 *   }
 * ]
 */

import { NextResponse } from 'next/server';
import {
  renderSymbolicWeather,
  type EngineDayInput,
  type AspectInput,
  type RendererResult
} from '@/src/symbolic-weather/renderer';

const DEFAULT_TIMEZONE = 'America/Chicago';

const logger = {
  info: (message: string, context: Record<string, unknown> = {}) => {
    // eslint-disable-next-line no-console
    console.log(`[SymbolicWeather] ${message}`, context);
  },
  warn: (message: string, context: Record<string, unknown> = {}) => {
    // eslint-disable-next-line no-console
    console.warn(`[SymbolicWeather] ${message}`, context);
  },
  error: (message: string, context: Record<string, unknown> = {}) => {
    // eslint-disable-next-line no-console
    console.error(`[SymbolicWeather] ${message}`, context);
  }
};

const NORMALIZATION_PIPELINE = 'normalize→scale→clamp→round';

type FrontstageInput = {
  magnitude?: number | null;
  directional_bias?: number | null;
  volatility?: number | null;
  coherence?: number | null;
};

type NormalizedInputResult = {
  magnitude: number | null;
  directional_bias: number | null;
  volatility: number | null;
  coherence: number | null;
  meta: {
    pipeline: typeof NORMALIZATION_PIPELINE;
    coercions: string[];
  };
};

const hasTenthPrecision = (value: number) => Math.abs(Math.round(value * 10) / 10 - value) <= 1e-6;

const looksDisplayScaleMag = (value: number) => Number.isFinite(value) && value >= 0 && value <= 5 && hasTenthPrecision(value);
const looksDisplayScaleBias = (value: number) => Number.isFinite(value) && value >= -5 && value <= 5 && hasTenthPrecision(value);
const looksDisplayScaleVol = (value: number) =>
  Number.isFinite(value) && value > 1 && value <= 5;
const looksDisplayScaleCoh = (value: number) =>
  Number.isFinite(value) && value > 1 && value <= 5;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp11 = (value: number) => Math.max(-1, Math.min(1, value));

function toNormalizedInputs(source: FrontstageInput): NormalizedInputResult {
  const meta: NormalizedInputResult['meta'] = {
    pipeline: NORMALIZATION_PIPELINE,
    coercions: []
  };

  const result: NormalizedInputResult = {
    magnitude: null,
    directional_bias: null,
    volatility: null,
    coherence: null,
    meta
  };

  if (typeof source.magnitude === 'number' && Number.isFinite(source.magnitude)) {
    const raw = source.magnitude;
    const normalized = looksDisplayScaleMag(raw) ? raw / 5 : raw;
    if (looksDisplayScaleMag(raw)) {
      meta.coercions.push('magnitude:display→normalized');
    }
    result.magnitude = clamp01(normalized);
  }

  if (typeof source.directional_bias === 'number' && Number.isFinite(source.directional_bias)) {
    const raw = source.directional_bias;
    const normalized = looksDisplayScaleBias(raw) ? raw / 5 : raw;
    if (looksDisplayScaleBias(raw)) {
      meta.coercions.push('bias:display→normalized');
    }
    result.directional_bias = clamp11(normalized);
  }

  if (typeof source.volatility === 'number' && Number.isFinite(source.volatility)) {
    const raw = source.volatility;
    const normalized = looksDisplayScaleVol(raw) ? raw / 5 : raw;
    if (looksDisplayScaleVol(raw)) {
      meta.coercions.push('volatility:display→normalized');
    }
    result.volatility = clamp01(normalized);
  }

  if (typeof source.coherence === 'number' && Number.isFinite(source.coherence)) {
    const raw = source.coherence;
    const normalized = looksDisplayScaleCoh(raw) ? raw / 5 : raw;
    if (looksDisplayScaleCoh(raw)) {
      meta.coercions.push('coherence:display→normalized');
    }
    result.coherence = clamp01(normalized);
  }

  return result;
}

const asFiniteNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

function mapAspects(rawAspects: any[] | undefined): AspectInput[] {
  if (!Array.isArray(rawAspects)) {
    return [];
  }

  return rawAspects
    .map((aspect) => {
      const aspectName = aspect?._aspect ?? aspect?.aspect ?? aspect?.type;
      if (!aspectName) return null;

      const orbCandidate = typeof aspect?._orb === 'number'
        ? aspect._orb
        : typeof aspect?.orb === 'number'
        ? aspect.orb
        : typeof aspect?.orbit === 'number'
        ? aspect.orbit
        : null;

      if (orbCandidate == null || !Number.isFinite(orbCandidate)) {
        return null;
      }

      const transitName = aspect?.p1_name
        ?? aspect?.transit_name
        ?? (typeof aspect?.transit === 'string' ? aspect.transit : aspect?.transit?.name);
      const targetName = aspect?.p2_name
        ?? aspect?.natal_name
        ?? (typeof aspect?.target === 'string' ? aspect.target : aspect?.target?.name);

      const record: AspectInput = {
        aspect: aspectName,
        orb: orbCandidate,
        transit_potency: typeof aspect?.transit_potency === 'number' ? aspect.transit_potency : undefined,
        target_potency: typeof aspect?.target_potency === 'number' ? aspect.target_potency : undefined,
        transit: transitName ? { name: transitName } : undefined,
        target: targetName ? { name: targetName } : undefined
      };

      return record;
    })
    .filter((aspect): aspect is AspectInput => Boolean(aspect));
}

function buildRendererResult(mathBrainResult: any, options: {
  startDate: string;
  endDate: string;
}): RendererResult {
  const transitsByDate = mathBrainResult?.person_a?.chart?.transitsByDate || {};
  const provenance = mathBrainResult?.provenance || {};
  const timezone = provenance.tz || provenance.timezone || DEFAULT_TIMEZONE;

  const upstreamScale = (provenance.scale || provenance.scaling || mathBrainResult?._provenance?.scale) as string | undefined;
  if (typeof upstreamScale === 'string' && upstreamScale.length > 0 && upstreamScale !== 'normalized') {
    throw new Error(`Upstream must emit normalized scale; got ${upstreamScale}.`);
  }

  const dates = Object.keys(transitsByDate)
    .filter((date) => date >= options.startDate && date <= options.endDate)
    .sort();

  const engineInputs: EngineDayInput[] = dates.map((date) => {
    const dayData = transitsByDate[date] || {};
    const seismo = dayData.seismograph || {};
    const balance = dayData.balance || {};

    const magnitudeRaw = asFiniteNumber(seismo.magnitude ?? balance.magnitude);
    const directionalRaw = asFiniteNumber(seismo.bias_signed ?? balance.bias_signed);
    const volatilityRaw = asFiniteNumber(seismo.volatility);
    const coherenceRaw = asFiniteNumber(seismo.coherence);

    const normalized = toNormalizedInputs({
      magnitude: magnitudeRaw,
      directional_bias: directionalRaw,
      volatility: volatilityRaw,
      coherence: coherenceRaw
    });

    if (normalized.meta.coercions.length > 0) {
      logger.info('Coerced display-scale inputs', { date, coercions: normalized.meta.coercions });
    }

    const input: EngineDayInput = {
      date,
      magnitude: normalized.magnitude ?? 0,
      directional_bias: normalized.directional_bias ?? 0,
      volatility: normalized.volatility ?? 0,
      timezone,
      aspects: mapAspects(dayData.filtered_aspects || dayData.aspects)
    };

    if (normalized.coherence != null) {
      input.coherence = normalized.coherence;
    }

    return input;
  });

  return renderSymbolicWeather(engineInputs, {
    coherenceFrom: 'volatility',
    timezone,
    provenance: {
      engine_build: provenance.math_brain_version || provenance.version || 'unknown',
      dataset_id: provenance.dataset_id || provenance.datasetId || 'unknown',
      run_id: provenance.run_id || provenance.runId || 'unknown',
      export_timestamp: new Date().toISOString()
    }
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const step = searchParams.get('step') || 'daily';

    // Optional: User context for fetching stored data
    const userId = searchParams.get('userId');
    const chartId = searchParams.get('chartId');

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing required parameters: start and end dates' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // TODO: Fetch stored Math Brain result for userId/chartId
    // For now, return structured mock data with correct house framing
    const mockMathBrainResult = {
      person_a: {
        chart: {
          transitsByDate: {
            [start]: {
              seismograph: {
                magnitude: 3.8,
                bias_signed: -2.7,
                volatility: 2.3,
                bias_method: 'balance_signed_v3',
                magnitude_method: 'rolling_window_v3'
              },
              balance: {
                magnitude: 3.8,
                bias_signed: -2.7
              },
              sfd: {
                sfd_cont: -0.12
              }
            }
          }
        }
      },
      provenance: {
        house_system: 'Placidus',
        orbs_profile: 'tight',
        math_brain_version: '3.1.4',
        tz: 'America/Chicago'
      }
    };

    const rendererOutput = buildRendererResult(mockMathBrainResult, {
      startDate: start,
      endDate: end
    });

    return NextResponse.json({
      success: true,
      data: rendererOutput.days,
      metadata: rendererOutput.metadata,
      observability: rendererOutput.observability,
      window: {
        start,
        end,
        step,
        count: rendererOutput.days.length,
        timezone: rendererOutput.metadata.timezone,
        house_frame: 'natal',
        relocation_supported: false
      }
    });
  } catch (error) {
    logger.error('Symbolic Weather API error', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
