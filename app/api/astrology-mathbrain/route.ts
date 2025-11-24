import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
// Configure route to allow longer execution time for complex calculations
// Netlify Pro allows up to 26 seconds, free tier up to 10 seconds
export const maxDuration = 26; // seconds
export const dynamic = 'force-dynamic'; // Disable caching for this route

// Reuse the legacy math brain implementation directly
const mathBrainFunction = require('../../../lib/server/astrology-mathbrain.js');

// NEW: Import the v2 Math Brain orchestrator
const { runMathBrain } = require('../../../src/math_brain/main.js');
const { createMarkdownReading } = require('../../../src/formatter/create_markdown_reading.js');
const { sanitizeForFilename } = require('../../../src/utils/sanitizeFilename.js');

const MAX_DAILY_TRANSIT_WINDOW_DAYS = 30;

// Balance Meter Label Helpers (Raven Calder / Math Brain v5)
function getMagnitudeLabel(value: number): string {
  if (value >= 4) return 'High';
  if (value >= 2) return 'Active';
  if (value >= 1) return 'Murmur';
  return 'Latent';
}

function getBiasLabel(value: number): string {
  if (value >= 3) return 'Strong Outward';
  if (value >= 1) return 'Mild Outward';
  if (value >= -1) return 'Equilibrium';
  if (value >= -3) return 'Mild Inward';
  return 'Strong Inward';
}

function getVolatilityLabel(value: number): string {
  if (value >= 4) return 'Very High';
  if (value >= 2) return 'High';
  if (value >= 1) return 'Moderate';
  return 'Low';
}

const logger = {
  info: (message: string, context: Record<string, unknown> = {}) => {
    // eslint-disable-next-line no-console
    console.log(`[AstrologyMathBrain] ${message}`, context);
  },
  warn: (message: string, context: Record<string, unknown> = {}) => {
    // eslint-disable-next-line no-console
    console.warn(`[AstrologyMathBrain] ${message}`, context);
  },
  error: (message: string, context: Record<string, unknown> = {}) => {
    // eslint-disable-next-line no-console
    console.error(`[AstrologyMathBrain] ${message}`, context);
  }
};

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function countInclusiveDays(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diffMs = endUtc - startUtc;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function buildFailureResponse(status: number, payload: any, rawBody: string | null) {
  const originalMessage = typeof payload?.error === 'string'
    ? payload.error
    : typeof payload?.message === 'string'
      ? payload.message
      : rawBody || 'Math Brain request failed.';

  let error = originalMessage;
  let code = typeof payload?.code === 'string' ? payload.code : 'MATH_BRAIN_ERROR';
  let hint: string | undefined;
  let httpStatus = status;

  const errorText = `${originalMessage} ${(payload?.detail || payload?.message || payload?.error || '')}`.trim();
  const missingRapidKey = code === 'RAPIDAPI_KEY_MISSING' || /RAPIDAPI_KEY/i.test(errorText);
  const birthDataRejected = code === 'NATAL_CHART_FETCH_FAILED' || /birth data/i.test(errorText);

  if (birthDataRejected) {
    error = 'Birth data appears invalid or incomplete. Double-check date, time, and location details.';
    code = 'BIRTH_DATA_INVALID';
    hint = 'Verify that the birth date, time (if provided), city, state, and coordinates are entered correctly.';
    httpStatus = 422;
  } else if (missingRapidKey) {
    error = 'Math Brain is offline until RAPIDAPI_KEY is configured.';
    code = 'RAPIDAPI_KEY_MISSING';
    hint = 'Add RAPIDAPI_KEY to .env.local and deployment secrets, then restart.';
    httpStatus = 503;
  } else if (code === 'RAPIDAPI_SUBSCRIPTION' || status === 401 || status === 403) {
    error = 'RapidAPI rejected the request. Verify your RAPIDAPI_KEY and subscription plan.';
    code = 'RAPIDAPI_AUTH_ERROR';
    hint = 'Double-check the RapidAPI key, subscription tier, and project linkage.';
    httpStatus = 503;
  } else if (status === 429) {
    error = 'RapidAPI rate limit reached. Pause for a minute and try again.';
    code = 'RAPIDAPI_RATE_LIMIT';
    httpStatus = 503;
  } else if (code === 'UPSTREAM_TEMPORARY' || status >= 500) {
    error = 'Astrologer API is temporarily unavailable. Please retry shortly.';
    code = 'UPSTREAM_TEMPORARY';
    httpStatus = status >= 500 ? 503 : status;
  }

  return NextResponse.json({
    success: false,
    error,
    code,
    hint,
    detail: payload?.detail ?? originalMessage
  }, { status: httpStatus });
}

export async function GET(request: NextRequest) {
  // Convert Next.js request to Netlify event format
  const url = new URL(request.url);
  
  // Convert headers
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  const event = {
    httpMethod: 'GET',
    queryStringParameters: Object.fromEntries(url.searchParams),
    headers,
    body: null,
    path: url.pathname,
    pathParameters: null,
    requestContext: {},
    resource: '',
    stageVariables: null,
    isBase64Encoded: false
  };

  const context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'astrology-mathbrain',
    functionVersion: '$LATEST',
    invokedFunctionArn: '',
    memoryLimitInMB: '1024',
  awsRequestId: randomUUID(),
    logGroupName: '',
    logStreamName: '',
    getRemainingTimeInMillis: () => 30000
  };

  try {
    const result = await mathBrainFunction.handler(event, context);
    
    return new NextResponse(result.body, {
      status: result.statusCode,
      headers: new Headers(result.headers || {})
    });
  } catch (error: any) {
    logger.error('Astrology MathBrain API error', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'ASTROLOGY_API_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawPayload = await request.json().catch(() => null);
    if (!rawPayload) {
      logger.error('Invalid or empty JSON body received');
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const normalizeNumber = (value: unknown): number | null => {
      const coerced = typeof value === 'string' ? value.trim() : value;
      const numeric = Number(coerced);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const reportTypeRaw = typeof rawPayload.report_type === 'string'
      ? rawPayload.report_type.toLowerCase()
      : '';
    const isSolarReturn = reportTypeRaw === 'solar_return' || reportTypeRaw === 'solar-return';

    if (isSolarReturn) {
      if (!rawPayload.personA || typeof rawPayload.personA !== 'object') {
        return NextResponse.json(
          { success: false, error: 'Person A data is required for solar return calculation' },
          { status: 400 }
        );
      }

      const personA = rawPayload.personA;
      const birthMonth = normalizeNumber(personA.month);
      const birthDay = normalizeNumber(personA.day);
      if (!birthMonth || !birthDay) {
        return NextResponse.json(
          { success: false, error: 'Person A month and day are required for solar return calculation' },
          { status: 400 }
        );
      }

      const solarReturnYearRaw = normalizeNumber(rawPayload.solar_return_year);
      const fallbackYear = new Date().getFullYear();
      let solarReturnYear = Number.isInteger(solarReturnYearRaw ?? NaN) ? solarReturnYearRaw as number : fallbackYear;

      const birthYear = normalizeNumber(personA.year);
      const baseDate = new Date(
        Number.isInteger(birthYear ?? NaN) ? birthYear as number : fallbackYear,
        birthMonth - 1,
        birthDay
      );
      if (Number.isNaN(baseDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid birth date supplied for solar return calculation' },
          { status: 400 }
        );
      }

      const computeReturnDate = (year: number) =>
        new Date(year, baseDate.getMonth(), baseDate.getDate());

      let returnDate = computeReturnDate(solarReturnYear);
      const now = new Date();
      if (returnDate.getTime() < now.getTime()) {
        solarReturnYear += 1;
        returnDate = computeReturnDate(solarReturnYear);
      }

      rawPayload.personA = {
        ...personA,
        year: returnDate.getFullYear(),
        month: returnDate.getMonth() + 1,
        day: returnDate.getDate()
      };
      rawPayload.report_type = 'natal';
      rawPayload.solar_return_year = solarReturnYear;
    }

    const body = JSON.stringify(rawPayload);

    const windowConfig = rawPayload?.window || null;
    const windowStep = typeof windowConfig?.step === 'string' ? windowConfig.step.toLowerCase() : null;

    if (windowStep === 'daily' && windowConfig?.start && windowConfig?.end) {
      const startDate = parseIsoDate(windowConfig.start);
      const endDate = parseIsoDate(windowConfig.end);
      if (!startDate || !endDate) {
        logger.warn('Invalid daily window dates received', { start: windowConfig.start, end: windowConfig.end });
        return NextResponse.json({
          success: false,
          error: 'Invalid transit window dates. Please use ISO format (YYYY-MM-DD).',
          code: 'INVALID_TRANSIT_WINDOW'
        }, { status: 400 });
      }

      if (endDate.getTime() < startDate.getTime()) {
        logger.warn('Daily window end precedes start', { start: windowConfig.start, end: windowConfig.end });
        return NextResponse.json({
          success: false,
          error: 'Transit window end date must be on or after the start date.',
          code: 'INVALID_TRANSIT_WINDOW_ORDER'
        }, { status: 400 });
      }

      const totalDays = countInclusiveDays(startDate, endDate);
      if (totalDays > MAX_DAILY_TRANSIT_WINDOW_DAYS) {
        logger.warn('Daily window exceeds maximum allowed span', { totalDays, start: windowConfig.start, end: windowConfig.end });
        return NextResponse.json({
          success: false,
          error: `Daily symbolic weather windows are limited to ${MAX_DAILY_TRANSIT_WINDOW_DAYS} days. Consider weekly sampling or shorten the range.`,
          code: 'TRANSIT_WINDOW_TOO_LARGE',
          limit: MAX_DAILY_TRANSIT_WINDOW_DAYS
        }, { status: 400 });
      }
    }

    // Prepare event for legacy handler
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => { headers[key] = value; });

    const event = {
      httpMethod: 'POST',
      headers,
      body,
      queryStringParameters: Object.fromEntries(url.searchParams),
      path: url.pathname, pathParameters: null, requestContext: {}, resource: '', stageVariables: null, isBase64Encoded: false
    };

    const context = {
      callbackWaitsForEmptyEventLoop: false, functionName: 'astrology-mathbrain', functionVersion: '$LATEST', invokedFunctionArn: '',
      memoryLimitInMB: '1024', awsRequestId: randomUUID(), logGroupName: '', logStreamName: '', getRemainingTimeInMillis: () => 30000
    };

    // Execute the unified pipeline
    logger.info('Routing to unified Math Brain v2 pipeline');

    try {
      // Get raw chart data by calling the legacy handler
      const legacyResult = await mathBrainFunction.handler(event, context);
      const legacyStatus = legacyResult?.statusCode ?? 500;
      let legacyBody: any = null;
      let rawBody: string | null = null;

      if (legacyResult?.body) {
        rawBody = legacyResult.body;
        try {
          legacyBody = JSON.parse(legacyResult.body);
        } catch {
          legacyBody = { error: legacyResult.body };
        }
      }

      if (!legacyResult || legacyStatus >= 400) {
        logger.error('Failed to fetch raw chart data from legacy handler', {
          statusCode: legacyStatus,
          errorCode: legacyBody?.code,
          errorMessage: legacyBody?.error,
          errorDetails: legacyBody
        });

        return buildFailureResponse(legacyStatus, legacyBody, rawBody);
      }

      const chartData = legacyBody;

      // Defensive guard: ensure natal data exists before continuing. If the
      // upstream responded 200 but did not include person_a chart basics,
      // fail fast so the client doesn't save an empty shell.
      const hasNatalData = Boolean(
        chartData &&
        chartData.person_a &&
        chartData.person_a.chart && // Must have the chart object
        (
          // Accept any of these valid data structures:
          // 1. chart.person.planets array
          // 2. chart.planets array (top-level)
          // 3. chart.aspects array
          (chartData.person_a.chart.person?.planets && Array.isArray(chartData.person_a.chart.person.planets)) ||
          (chartData.person_a.chart.planets && Array.isArray(chartData.person_a.chart.planets)) ||
          (chartData.person_a.chart.aspects && Array.isArray(chartData.person_a.chart.aspects))
        )
      );
      
      if (!hasNatalData) {
        // Log detailed debug info about what we received
        const debugInfo = {
          hasChartData: !!chartData,
          hasPersonA: !!chartData?.person_a,
          hasChart: !!chartData?.person_a?.chart,
          hasPersonPlanets: Array.isArray(chartData?.person_a?.chart?.person?.planets) ? 
            `${chartData.person_a.chart.person.planets.length} planets` : 'none',
          hasTopLevelPlanets: Array.isArray(chartData?.person_a?.chart?.planets) ? 
            `${chartData.person_a.chart.planets.length} planets` : 'none',
          hasAspects: Array.isArray(chartData?.person_a?.chart?.aspects) ? 
            `${chartData.person_a.chart.aspects.length} aspects` : 'none',
          chartKeys: chartData?.person_a?.chart ? Object.keys(chartData.person_a.chart) : []
        };
        
        logger.error('Missing critical natal data for person_a from legacy handler', {
          debugInfo,
          chartData: {
            person_a: {
              chart: chartData?.person_a?.chart ? 'exists' : 'missing',
              details: chartData?.person_a?.details ? 'exists' : 'missing',
              meta: chartData?.person_a?.meta ? 'exists' : 'missing',
            }
          }
        });
        
        return NextResponse.json({
          success: false,
          error: 'Upstream service returned an incomplete chart. Required planet or aspect data is missing.',
          code: 'INCOMPLETE_NATAL_CHART_DATA',
          debug: debugInfo
        }, { status: 502 });
      }

      // Prepare the config for the v2 formatter/aggregator
      const relationshipContextRaw =
        chartData?.relationship ||
        chartData?.relationship_context ||
        rawPayload.relationship_context ||
        rawPayload.relationship ||
        null;
      const scopeLabels: Record<string, string> = {
        PARTNER: 'Partner',
        FRIEND: 'Friend / Acquaintance',
        FAMILY: 'Family Member',
      };

      const relationshipContext = relationshipContextRaw
        ? (() => {
            const type = relationshipContextRaw.type
              ? String(relationshipContextRaw.type).toUpperCase()
              : undefined;
            const scope = relationshipContextRaw.scope || type || null;
            const contactState = relationshipContextRaw.contact_state || relationshipContextRaw.contactState || 'ACTIVE';
            const role = relationshipContextRaw.role
              ? relationshipContextRaw.role.charAt(0).toUpperCase() + relationshipContextRaw.role.slice(1)
              : relationshipContextRaw.role ?? null;
            return {
              ...relationshipContextRaw,
              type,
              scope,
              scope_label: scope ? (scopeLabels[scope] || scope) : null,
              contact_state: contactState,
              role,
            };
          })()
        : null;

      const v2Config = {
        schema: 'mb-1',
        mode: rawPayload.mode || rawPayload.context?.mode,
        step: rawPayload.window?.step || 'daily',
        startDate: rawPayload.window?.start,
        endDate: rawPayload.window?.end,
        personA: rawPayload.personA,
        personB: rawPayload.personB || null,
        translocation: rawPayload.translocation || 'BOTH_LOCAL',
        reportStructure: rawPayload.reportStructure || (rawPayload.personB ? 'synastry' : 'solo'),
        relationshipContext,
        context: rawPayload.context
      };

      // Run the v2 engine to format the final report
      const unifiedOutput = await runMathBrain(v2Config, chartData);

      // Enrich unified_output for exporters expecting provenance and woven_map.symbolic_weather
      try {
        // 1) Provide unified_output.provenance, deriving a stable package/hash id from run metadata
        const runMeta = unifiedOutput?.run_metadata || {};
        const legacyProv = chartData?.provenance || {};
        const provenance = { ...legacyProv, ...runMeta } as any;
        // Use run ID or timestamp as fallback for hash
        if (!provenance.normalized_input_hash && runMeta.run_id) {
          provenance.normalized_input_hash = runMeta.run_id;
        }
        (unifiedOutput as any).provenance = provenance;

        // 2) Provide unified_output.woven_map.symbolic_weather from daily_entries when available
        const dailyEntries = Array.isArray((unifiedOutput as any)?.daily_entries)
          ? (unifiedOutput as any).daily_entries as any[]
          : [];

        let symbolicWeather: any[] | null = null;
        if (dailyEntries.length > 0) {
          symbolicWeather = dailyEntries.map((entry: any) => {
            const date = entry?.date ?? null;
            const sw = entry?.symbolic_weather || {};
            const mag = typeof sw.magnitude === 'number' ? sw.magnitude : null;
            const bias = typeof sw.directional_bias === 'number' ? sw.directional_bias : null;
            const vol = typeof sw.volatility === 'number' ? sw.volatility : null;
            const coh = typeof sw.coherence === 'number' ? sw.coherence : null;

            const meter =
              mag !== null || bias !== null
                ? {
                    // Raw system units (x10 integers)
                    mag_x10: mag !== null ? Math.round(mag * 10) : null,
                    bias_x10: bias !== null ? Math.round(bias * 10) : null,
                    
                    // Human-readable symbolic gradient (Balance Meter v5)
                    magnitude: mag,
                    directional_bias: bias,
                    volatility: vol,
                    coherence: coh,
                    
                    // Semantic labels
                    magnitude_label: mag !== null ? getMagnitudeLabel(mag) : null,
                    directional_bias_label: bias !== null ? getBiasLabel(bias) : null,
                    volatility_label: vol !== null ? getVolatilityLabel(vol) : null,
                  }
                : null;

            return {
              date,
              meter,
              // Flattened accessors for easier consumption (Woven AI Packet / JSON exports)
              magnitude: mag,
              directional_bias: bias,
              volatility: vol,
              coherence: coh,
              label: sw.label || null,
              status: null,
              as: [] as any[],
              tpos: [] as any[],
              thouse: [] as any[],
            };
          });
        } else if (chartData?.woven_map?.symbolic_weather) {
          // Fallback: copy from legacy woven_map if present
          symbolicWeather = chartData.woven_map.symbolic_weather;
        }

        if (symbolicWeather) {
          (unifiedOutput as any).woven_map = (unifiedOutput as any).woven_map || {};
          (unifiedOutput as any).woven_map.symbolic_weather = symbolicWeather;
        }
      } catch (enrichError) {
        logger.warn('Unified output enrichment failed', { error: (enrichError as any)?.message });
      }

      // Generate Markdown and prepare response (no filesystem round-trip)
      // Generate markdown for any report with daily_entries (Solo or Relational)
      let markdownContent = '';
      let markdownFilename = '';
      if (unifiedOutput?.daily_entries && Array.isArray(unifiedOutput.daily_entries) && unifiedOutput.daily_entries.length > 0) {
        const markdownResult = createMarkdownReading(unifiedOutput, { writeToFile: false });
        markdownContent = markdownResult.content;
        markdownFilename = markdownResult.filename;
      }

      const runMetadata = unifiedOutput?.run_metadata ?? {};
      const safePersonA = sanitizeForFilename(runMetadata?.person_a, 'PersonA');
      const safePersonB = sanitizeForFilename(runMetadata?.person_b, runMetadata?.person_b ? 'PersonB' : 'Solo');
      const todayIso = new Date().toISOString().split('T')[0];

      const responseBody = {
        ...chartData,
        success: chartData?.success ?? true,
        version: 'v2',
        unified_output: unifiedOutput,
        markdown_reading: markdownContent,
        download_formats: {
          mirror_report: { format: 'markdown', content: markdownContent, filename: markdownFilename },
          symbolic_weather: {
            format: 'json',
            content: unifiedOutput,
            filename: `Mirror+SymbolicWeather_${safePersonA}_${safePersonB}_${todayIso}.json`,
          }
        }
      };

      if (relationshipContext) {
        responseBody.relationship_context = relationshipContext;
        responseBody.relationship = relationshipContext;
      }

      return NextResponse.json(responseBody, { status: 200 });

    } catch (pipelineError: any) {
      logger.error('Math Brain v2 pipeline error', { error: pipelineError.message, stack: pipelineError.stack });
      return NextResponse.json({ success: false, error: 'Math Brain v2 processing failed', detail: pipelineError.message, code: 'MATH_BRAIN_V2_ERROR' }, { status: 500 });
    }
  } catch (error: any) {
    logger.error('Astrology MathBrain API error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Internal server error', code: 'ASTROLOGY_API_ERROR' }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  return new NextResponse('', { 
    status: 200, 
    headers: new Headers(headers as any)
  });
}
