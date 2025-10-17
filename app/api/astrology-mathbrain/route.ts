import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

    const body = JSON.stringify(rawPayload);

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
    const tempDir = os.tmpdir();
    const configPath = path.join(tempDir, `math_brain_config_${randomUUID()}.json`);

    try {
      // Get raw chart data by calling the legacy handler
      const legacyResult = await mathBrainFunction.handler(event, context);
      if (!legacyResult || legacyResult.statusCode >= 400) {
        const errorBody = legacyResult?.body ? JSON.parse(legacyResult.body) : {};
        logger.error('Failed to fetch raw chart data from legacy handler', {
          statusCode: legacyResult?.statusCode,
          errorCode: errorBody?.code,
          errorMessage: errorBody?.error,
          errorDetails: errorBody
        });

        // Return a more detailed error to help debugging
        return NextResponse.json({
          success: false,
          error: 'Math Brain v2 processing failed',
          detail: errorBody?.error || 'Could not retrieve foundational chart data.',
          code: errorBody?.code || 'MATH_BRAIN_V2_ERROR',
          legacyStatusCode: legacyResult?.statusCode,
          hint: errorBody?.hint
        }, { status: 500 });
      }
      const chartData = JSON.parse(legacyResult.body);

      // Prepare the config for the v2 formatter/aggregator
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
        relationshipType: rawPayload.relationship_context?.type || 'PARTNER',
        context: rawPayload.context
      };
      fs.writeFileSync(configPath, JSON.stringify(v2Config, null, 2));

      // Run the v2 engine to format the final report
      const unifiedOutput = await runMathBrain(configPath, chartData);

      // Generate Markdown and prepare response
      const unifiedOutputPath = path.join(tempDir, `math_brain_unified_${randomUUID()}.json`);
      fs.writeFileSync(unifiedOutputPath, JSON.stringify(unifiedOutput, null, 2));

      const markdownPath = createMarkdownReading(unifiedOutputPath);
      const markdownContent = fs.readFileSync(markdownPath, 'utf8');
      const markdownFilename = path.basename(markdownPath);

      const { run_metadata } = unifiedOutput;
      const safePersonA = sanitizeForFilename(run_metadata.person_a, 'PersonA');
      const safePersonB = sanitizeForFilename(run_metadata.person_b, run_metadata.person_b ? 'PersonB' : 'Solo');

      // Cleanup temp files
      [configPath, unifiedOutputPath, markdownPath].forEach(p => {
        try { fs.unlinkSync(p); } catch (e) { /* ignore */ }
      });

      return NextResponse.json({
        success: true,
        version: 'v2',
        unified_output: unifiedOutput,
        markdown_reading: markdownContent,
        download_formats: {
          mirror_report: { format: 'markdown', content: markdownContent, filename: markdownFilename },
          symbolic_weather: { format: 'json', content: unifiedOutput, filename: `unified_output_${safePersonA}_${safePersonB}_${new Date().toISOString().split('T')[0]}.json` }
        }
      }, { status: 200 });

    } catch (pipelineError: any) {
      logger.error('Math Brain v2 pipeline error', { error: pipelineError.message, stack: pipelineError.stack });
      try { if (fs.existsSync(configPath)) fs.unlinkSync(configPath); } catch (e) { /* ignore */ }
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
