import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
// Configure route to allow longer execution time for complex calculations
// Netlify Pro allows up to 26 seconds, free tier up to 10 seconds
export const maxDuration = 26; // seconds
export const dynamic = 'force-dynamic'; // Disable caching for this route

import { mathBrainService } from '@/src/math_brain/service';

// NEW: Import the v2 Math Brain orchestrator
const { runMathBrain } = require('../../../src/math_brain/main.js');
const { createMarkdownReading } = require('../../../src/formatter/create_markdown_reading.js');
const { sanitizeForFilename } = require('../../../src/utils/sanitizeFilename.js');

const MAX_DAILY_TRANSIT_WINDOW_DAYS = 30;

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

  if (missingRapidKey) {
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
  return NextResponse.json({
    success: true,
    message: 'Astrology MathBrain v2 service is active.',
    service: 'astrology-mathbrain',
    version: 'v2'
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawPayload = await request.json().catch(() => null);
    if (!rawPayload) {
      logger.error('Invalid or empty JSON body received');
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    // Execute the unified pipeline
    logger.info('Routing to unified Math Brain v2 pipeline');

    try {
      // Get raw chart data by calling the new Math Brain Service
      const chartData = await mathBrainService.fetch(rawPayload);

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
        reportStructure: rawPayload.personB ? 'synastry' : 'solo',
        relationshipContext,
        context: rawPayload.context
      };

      // Run the v2 engine to format the final report
      const unifiedOutput = await runMathBrain(v2Config, chartData);

      // Generate Markdown and prepare response (no filesystem round-trip)
      // Only generate markdown for relational reports with daily_entries
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

      const responseBody = {
        ...chartData,
        success: chartData?.success ?? true,
        version: 'v2',
        unified_output: unifiedOutput,
        markdown_reading: markdownContent,
        download_formats: {
          mirror_report: { format: 'markdown', content: markdownContent, filename: markdownFilename },
          symbolic_weather: { format: 'json', content: unifiedOutput, filename: `unified_output_${safePersonA}_${safePersonB}_${new Date().toISOString().split('T')[0]}.json` }
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
