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
  SCALE_FACTORS,
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

  const dates = Object.keys(transitsByDate)
    .filter((date) => date >= options.startDate && date <= options.endDate)
    .sort();

  const engineInputs: EngineDayInput[] = dates.map((date) => {
    const dayData = transitsByDate[date] || {};
    const seismo = dayData.seismograph || {};
    const balance = dayData.balance || {};
    const sfdBlock = dayData.sfd || {};

    const magnitudeRaw = Number(seismo.magnitude ?? balance.magnitude ?? 0);
    const directionalRaw = Number(seismo.bias_signed ?? balance.bias_signed ?? 0);
    const volatilityRaw = Number(seismo.volatility ?? 0);
    const coherenceRaw = Number(seismo.coherence ?? 0);

    const input: EngineDayInput = {
      date,
      magnitude: Number.isFinite(magnitudeRaw) ? magnitudeRaw / SCALE_FACTORS.magnitude : 0,
      directional_bias: Number.isFinite(directionalRaw) ? directionalRaw / SCALE_FACTORS.directional_bias : 0,
      volatility: Number.isFinite(volatilityRaw) ? volatilityRaw / SCALE_FACTORS.coherence : 0,
      timezone,
      aspects: mapAspects(dayData.filtered_aspects || dayData.aspects)
    };

    if (Number.isFinite(coherenceRaw)) {
      input.coherence = coherenceRaw / SCALE_FACTORS.coherence;
    }

    const rawSfd = typeof sfdBlock.sfd_cont === 'number'
      ? sfdBlock.sfd_cont
      : typeof sfdBlock.value === 'number'
      ? sfdBlock.value
      : typeof sfdBlock.sfd === 'number'
      ? sfdBlock.sfd
      : null;

    if (typeof rawSfd === 'number' && Number.isFinite(rawSfd)) {
      if (Math.abs(rawSfd) <= 1) {
        input.sfd = rawSfd;
        input.sfd_pre_scaled = true;
      } else {
        input.sfd = rawSfd / SCALE_FACTORS.sfd;
      }
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
