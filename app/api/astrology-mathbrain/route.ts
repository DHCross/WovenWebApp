import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
    const raw = await request.json().catch(() => null);
    // Transform subjectA/subjectB/transits/houses shape → function input
    function mapHouseSystem(h: string|undefined){
      if(!h) return undefined;
      const name = String(h).toLowerCase();
      const map: Record<string,string> = {
        placidus: 'P', whole_sign: 'W', wholesign: 'W', 'whole sign': 'W', regiomontanus: 'R', koch: 'K', campanus: 'C', equal: 'E'
      } as any;
      return map[name] || h;
    }
    const pickNation = (subject: any, birth: any) => {
      return subject?.nation || birth?.nation || subject?.country || birth?.country || subject?.country_code || birth?.country_code || subject?.nation_code || undefined;
    };
    const body = (function transform(input:any){
      if (!input || typeof input !== 'object') {
        return JSON.stringify(input ?? {});
      }

      const normalized = { ...input };

      const normalizePerson = (person: any, keyPrefix: 'A' | 'B') => {
        if (!person || typeof person !== 'object') return undefined;
        const birth = person.birth || {};
        const normalizedBirth = {
          date: person.date || birth.date || undefined,
          year: person.year ?? birth.year ?? undefined,
          month: person.month ?? birth.month ?? undefined,
          day: person.day ?? birth.day ?? undefined,
          hour: person.hour ?? birth.hour ?? undefined,
          minute: person.minute ?? birth.minute ?? undefined,
          lat: person.latitude ?? person.lat ?? birth.lat ?? undefined,
          lng: person.longitude ?? person.lng ?? birth.lng ?? undefined,
          timezone: person.timezone ?? birth.timezone ?? birth.tz ?? undefined,
          city: person.city ?? birth.city ?? undefined,
          state: person.state ?? birth.state ?? undefined,
          nation: person.nation ?? birth.nation ?? undefined,
        };

        const localKey = keyPrefix === 'A' ? 'A_local' : 'B_local';

        return {
          name: person.name,
          birth: normalizedBirth,
          [localKey]: person[localKey] || person.local || undefined,
        };
      };

      if (!normalized.subjectA && normalized.personA) {
        const subjectA = normalizePerson(normalized.personA, 'A');
        if (subjectA) {
          normalized.subjectA = subjectA;
        }
      }

      if (!normalized.subjectB && normalized.personB) {
        const subjectB = normalizePerson(normalized.personB, 'B');
        if (subjectB) {
          normalized.subjectB = subjectB;
        }
      }

      const effective = normalized;

      const start = effective?.window?.start || effective?.transit_window?.start || effective?.transitStartDate || effective?.transit_start_date || effective?.transitParams?.startDate || effective?.startDate;
      const end = effective?.window?.end || effective?.transit_window?.end || effective?.transitEndDate || effective?.transit_end_date || effective?.transitParams?.endDate || effective?.endDate;
      const stepRaw = effective?.window?.step || effective?.transit_window?.step || effective?.transitStep || effective?.transit_step || effective?.transitParams?.step || effective?.step;
      const resolvedStep = typeof stepRaw === 'string' && stepRaw.trim().length ? stepRaw : 'daily';
      if(!effective.subjectA && !effective.subjectB){
        const out:any = { ...effective };
        if (start && end) {
          const normalizedWindow = { start, end, step: resolvedStep };
          out.window = out.window || normalizedWindow;
          if (!out.transits || typeof out.transits !== 'object') {
            out.transits = { from: start, to: end, step: resolvedStep };
          } else {
            out.transits = {
              ...out.transits,
              from: out.transits.from || start,
              to: out.transits.to || end,
              step: out.transits.step || resolvedStep,
            };
          }
        }
        return JSON.stringify(out);
      }
      const a = effective.subjectA || {};
      const b = effective.subjectB || null;
      const birthA = a.birth || {};
      const birthB = b?.birth || {};
      const toPerson = (name:string, subject:any, birth:any, local:any)=>({
        name,
        year: parseInt(birth.date?.split('-')[0]||birth.year,10),
        month: parseInt(birth.date?.split('-')[1]||birth.month,10),
        day: parseInt(birth.date?.split('-')[2]||birth.day,10),
        hour: parseInt((birth.time||'').split(':')[0]||birth.hour,10),
        minute: parseInt((birth.time||'').split(':')[1]||birth.minute,10),
        latitude: birth.lat ?? birth.latitude ?? subject?.latitude,
        longitude: birth.lon ?? birth.lng ?? birth.longitude ?? subject?.longitude,
        timezone: birth.tz ?? birth.timezone ?? subject?.timezone,
        city: birth.city || subject?.city,
        state: birth.state || subject?.state,
        nation: pickNation(subject, birth),
        ...(local ? { A_local: local, B_local: local } : {})
      });
      const personA = toPerson(a.name, a, birthA, a.A_local);
      const personB = b ? toPerson(b.name, b, birthB, b.B_local) : undefined;
      const tx = effective.transits || {};
      const window = tx.from && tx.to ? { start: tx.from, end: tx.to, step: tx.step || 'daily' } : undefined;
      const houses = mapHouseSystem(effective.houses);
      const out:any = {
        personA,
        ...(personB ? { personB } : {}),
        ...(window ? { window } : {}),
        context: {
          mode: (()=>{
            const rt = String(effective.report_type||'').toLowerCase();
            if (rt.includes('synastry_transits')) return 'synastry_transits';
            if (rt.includes('synastry')) return 'synastry';
            if (rt.includes('balance_meter')) return 'balance_meter';
            return (effective.context?.mode || 'mirror');
          })(),
          ...(effective.translocation ? { translocation: effective.translocation } : {})
        },
        relocation_mode: effective.relocation_mode,
        orbs_profile: effective.orbs_profile,
        ...(houses ? { houses_system_identifier: houses } : {})
      };
      if (effective.relationship_context || effective.relationshipContext) {
        out.relationship_context = effective.relationship_context || effective.relationshipContext;
      }
      if (!out.window && start && end) {
        out.window = { start, end, step: resolvedStep };
      }
      if (!out.transits && start && end) {
        out.transits = { from: start, to: end, step: resolvedStep };
      }

      ['wheel_only', 'wheel_format', 'theme', 'language'].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(effective, key)) {
          out[key] = effective[key];
        }
      });
      return JSON.stringify(out);
    })(raw);
    
    // Convert Next.js request to Netlify event format
    const url = new URL(request.url);
    
    // Convert headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    const event = {
      httpMethod: 'POST',
      queryStringParameters: Object.fromEntries(url.searchParams),
      headers,
      body,
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

    // Always use Math Brain v2 (legacy system removed)
    logger.info('Using Math Brain v2');
      
      // Parse the input
      const parsedBody = JSON.parse(body);
      
      // Create a temporary config file
      const tempDir = os.tmpdir();
      const configPath = path.join(tempDir, `math_brain_config_${randomUUID()}.json`);
      
      const v2Mode = (()=>{
        const modeHint = String(parsedBody.context?.mode || '').toUpperCase();

        // If a compliant mode is already provided, use it.
        if (['SYNASTRY_TRANSITS', 'COMPOSITE_TRANSITS', 'NATAL_TRANSITS'].includes(modeHint)) {
          return modeHint;
        }

        // Logic based on report type and data shape
        if (modeHint.includes('SYNASTRY')) {
          return 'SYNASTRY_TRANSITS';
        }
        if (modeHint.includes('COMPOSITE')) {
          return 'COMPOSITE_TRANSITS';
        }

        // If no Person B, it must be a solo natal chart with transits.
        if (!parsedBody.personB) {
          return 'NATAL_TRANSITS';
        }

        // Default for any two-person report is Synastry with Transits.
        // This covers 'BALANCE_METER', 'MIRROR', etc.
        return 'SYNASTRY_TRANSITS';
      })();

      const today = new Date().toISOString().split('T')[0];
      const startDate = parsedBody.window?.start || parsedBody.transits?.from;
      const endDate = parsedBody.window?.end || parsedBody.transits?.to;

      const v2Config = {
        schema: 'mb-1',
        mode: v2Mode,
        step: parsedBody.window?.step || 'daily',
        startDate: startDate || today,
        endDate: endDate || today,
        personA: parsedBody.personA,
        personB: parsedBody.personB || null,
        translocation: parsedBody.context?.translocation || 'BOTH_LOCAL',
        reportStructure: parsedBody.personB ? 'synastry' : 'solo',
        relationshipType: parsedBody.relationship_context?.type || 'PARTNER'
      };
      
      try {
        // Write config to temp file
        fs.writeFileSync(configPath, JSON.stringify(v2Config, null, 2));

        // Fetch real transit data using the existing legacy pipeline
        logger.info('Fetching transit data for Math Brain v2', {
          mode: v2Config.mode,
          startDate: v2Config.startDate,
          endDate: v2Config.endDate,
        });

        let legacyResult;
        try {
          legacyResult = await mathBrainFunction.handler(event, context);
        } catch (legacyError: any) {
          logger.error('Legacy Math Brain threw an exception', {
            error: legacyError?.message,
            stack: legacyError?.stack,
          });
          throw new Error(`Legacy Math Brain exception: ${legacyError?.message || 'unknown error'}`);
        }

        if (!legacyResult || typeof legacyResult.statusCode !== 'number') {
          logger.error('Legacy Math Brain returned an invalid response', { legacyResult });
          throw new Error('Legacy Math Brain returned an invalid response');
        }

        if (legacyResult.statusCode >= 400) {
          logger.error('Legacy Math Brain failed', {
            statusCode: legacyResult.statusCode,
            bodyPreview: typeof legacyResult.body === 'string' ? legacyResult.body.slice(0, 4000) : legacyResult.body,
          });
          throw new Error(`Legacy Math Brain failed with status ${legacyResult.statusCode}`);
        }

        let legacyData: any;
        try {
          legacyData = typeof legacyResult.body === 'string' ? JSON.parse(legacyResult.body) : legacyResult.body;
        } catch (parseError: any) {
          logger.error('Failed to parse legacy Math Brain response', {
            error: parseError?.message,
            bodyPreview: typeof legacyResult.body === 'string' ? legacyResult.body.slice(0, 2000) : legacyResult.body,
          });
          throw new Error('Failed to parse legacy Math Brain response');
        }

        const transitData = {
          person_a: legacyData?.person_a,
          person_b: legacyData?.person_b,
          synastry: legacyData?.synastry,
          composite: legacyData?.composite,
        };

        logger.info('Running Math Brain v2 with real transit data', {
          hasPersonB: Boolean(transitData.person_b),
          hasSynastry: Boolean(transitData.synastry),
        });

        const unifiedOutput = await runMathBrain(configPath, transitData);

        const unifiedOutputPath = path.join(tempDir, `math_brain_unified_${randomUUID()}.json`);
        fs.writeFileSync(unifiedOutputPath, JSON.stringify(unifiedOutput, null, 2));

        let markdownContent: string;
        const runMetadata = unifiedOutput.run_metadata || {};
        const safePersonA = sanitizeForFilename(runMetadata.person_a, 'PersonA');
        const safePersonB = sanitizeForFilename(runMetadata.person_b, runMetadata.person_b ? 'PersonB' : 'Solo');
        const dateRange = Array.isArray(runMetadata.date_range) ? runMetadata.date_range : [];
        const safeStart = sanitizeForFilename(dateRange[0], 'start');
        const safeEnd = sanitizeForFilename(dateRange[1], dateRange[0] ? 'end' : 'start');

        let markdownFilename = `Woven_Reading_${safePersonA}_${safePersonB}_${safeStart}_to_${safeEnd}.md`;

        try {
          const markdownPath = createMarkdownReading(unifiedOutputPath);
          markdownContent = fs.readFileSync(markdownPath, 'utf8');
          markdownFilename = path.basename(markdownPath);
          try {
            fs.unlinkSync(markdownPath);
          } catch (e) {
            // ignore cleanup error
          }
        } catch (markdownError: any) {
          logger.error('Failed to generate markdown via createMarkdownReading', {
            error: markdownError?.message,
            stack: markdownError?.stack,
          });

          markdownContent = '# Math Brain v2 Reading\n\nFailed to generate detailed markdown automatically. Please download the JSON output and regenerate later.';
        }
        const { run_metadata } = unifiedOutput;

        try {
          fs.unlinkSync(configPath);
        } catch (e) {
          // ignore
        }

        try {
          fs.unlinkSync(unifiedOutputPath);
        } catch (e) {
          // ignore
        }

        return NextResponse.json({
          success: true,
          version: 'v2',
          unified_output: unifiedOutput,
          markdown_reading: markdownContent,
          download_formats: {
            mirror_report: {
              format: 'markdown',
              content: markdownContent,
              filename: markdownFilename,
            },
            symbolic_weather: {
              format: 'json',
              content: unifiedOutput,
              filename: `unified_output_${safePersonA}_${safePersonB}_${new Date().toISOString().split('T')[0]}.json`
            }
          }
        }, { status: 200 });
        
      } catch (v2Error: any) {
        logger.error('Math Brain v2 error', {
          error: v2Error instanceof Error ? v2Error.message : String(v2Error),
          stack: v2Error instanceof Error ? v2Error.stack : undefined
        });
        
        // Clean up temp file on error
        try {
          if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
        } catch (e) {
          // Ignore cleanup errors
        }
        
        return NextResponse.json({
          success: false,
          error: 'Math Brain v2 processing failed',
          detail: v2Error instanceof Error ? v2Error.message : String(v2Error),
          code: 'MATH_BRAIN_V2_ERROR'
        }, { status: 500 });
      }
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
