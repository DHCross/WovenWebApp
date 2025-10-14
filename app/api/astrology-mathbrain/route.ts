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
      const start = input?.window?.start || input?.transit_window?.start || input?.transitStartDate || input?.transit_start_date || input?.transitParams?.startDate || input?.startDate;
      const end = input?.window?.end || input?.transit_window?.end || input?.transitEndDate || input?.transit_end_date || input?.transitParams?.endDate || input?.endDate;
      const stepRaw = input?.window?.step || input?.transit_window?.step || input?.transitStep || input?.transit_step || input?.transitParams?.step || input?.step;
      const resolvedStep = typeof stepRaw === 'string' && stepRaw.trim().length ? stepRaw : 'daily';
      if(!input.subjectA && !input.subjectB){
        const out:any = { ...input };
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
      const a = input.subjectA || {};
      const b = input.subjectB || null;
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
      const tx = input.transits || {};
      const window = tx.from && tx.to ? { start: tx.from, end: tx.to, step: tx.step || 'daily' } : undefined;
      const houses = mapHouseSystem(input.houses);
      const out:any = {
        personA,
        ...(personB ? { personB } : {}),
        ...(window ? { window } : {}),
        context: {
          mode: (()=>{
            const rt = String(input.report_type||'').toLowerCase();
            if (rt.includes('synastry_transits')) return 'synastry_transits';
            if (rt.includes('synastry')) return 'synastry';
            if (rt.includes('balance_meter')) return 'balance_meter';
            return (input.context?.mode || 'mirror');
          })(),
          ...(input.translocation ? { translocation: input.translocation } : {})
        },
        relocation_mode: input.relocation_mode,
        orbs_profile: input.orbs_profile,
        ...(houses ? { houses_system_identifier: houses } : {})
      };
      if (input.relationship_context || input.relationshipContext) {
        out.relationship_context = input.relationship_context || input.relationshipContext;
      }
      if (!out.window && start && end) {
        out.window = { start, end, step: resolvedStep };
      }
      if (!out.transits && start && end) {
        out.transits = { from: start, to: end, step: resolvedStep };
      }

      ['wheel_only', 'wheel_format', 'theme', 'language'].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
          out[key] = input[key];
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
      
      const v2Config = {
        schema: 'mb-1',
        mode: parsedBody.context?.mode?.toUpperCase() || 'SYNASTRY_TRANSITS',
        step: parsedBody.window?.step || 'daily',
        startDate: parsedBody.window?.start || parsedBody.transits?.from,
        endDate: parsedBody.window?.end || parsedBody.transits?.to,
        personA: parsedBody.personA,
        personB: parsedBody.personB || null,
        translocation: parsedBody.context?.translocation || 'BOTH_LOCAL',
        reportStructure: parsedBody.personB ? 'synastry' : 'solo',
        relationshipType: parsedBody.relationship_context?.type || 'PARTNER'
      };
      
      try {
        // Write config to temp file
        fs.writeFileSync(configPath, JSON.stringify(v2Config, null, 2));
        
        // TEMPORARY: Use null transit data to use mock data while we fix the real integration
        logger.info('Running Math Brain v2 with mock data (temporary)');
        const unifiedOutput = await runMathBrain(configPath, null);
        
        // Build markdown content inline
        let markdownContent = '';
        const { run_metadata, daily_entries } = unifiedOutput;
        
        for (const day of daily_entries) {
          markdownContent += `## Woven Reading: ${run_metadata.person_a} & ${run_metadata.person_b}\n`;
          markdownContent += `**Date:** ${day.date}\n\n---\n\n`;
          markdownContent += '### Data for Interpretation\n\n';
          markdownContent += '#### Symbolic Weather\n';
          markdownContent += `- **Magnitude**: ${day.symbolic_weather.magnitude} (${day.symbolic_weather.labels.magnitude})\n`;
          markdownContent += `- **Directional Bias**: ${day.symbolic_weather.directional_bias} (${day.symbolic_weather.labels.directional_bias})\n\n`;
          markdownContent += '#### Mirror Data (Relational)\n';
          markdownContent += `- **Relational Tension**: ${day.mirror_data.relational_tension}\n`;
          markdownContent += `- **Relational Flow**: ${day.mirror_data.relational_flow}\n`;
          markdownContent += `- **Dominant Theme**: ${day.mirror_data.dominant_theme}\n`;
          markdownContent += `- **${run_metadata.person_a}'s Contribution**: Magnitude ${day.mirror_data.person_a_contribution.magnitude}, Bias ${day.mirror_data.person_a_contribution.bias}\n`;
          markdownContent += `- **${run_metadata.person_b}'s Contribution**: Magnitude ${day.mirror_data.person_b_contribution.magnitude}, Bias ${day.mirror_data.person_b_contribution.bias}\n\n`;
          markdownContent += '#### Poetic Hooks (Narrative Triggers)\n';
          markdownContent += `- **Peak Aspect of the Day**: ${day.poetic_hooks.peak_aspect_of_the_day}\n`;
          markdownContent += `- **Key Themes**: ${day.poetic_hooks.key_themes.join(', ')}\n`;
          if(day.poetic_hooks.significant_events && day.poetic_hooks.significant_events.length > 0) {
            markdownContent += `- **Significant Astrological Events**: ${day.poetic_hooks.significant_events.join(', ')}\n`;
          }
          markdownContent += '- **Top Contributing Aspects**:\n';
          day.poetic_hooks.top_contributing_aspects.forEach((aspect: any, index: number) => {
            markdownContent += `  - ${index + 1}. ${aspect.aspect} [${aspect.type}]\n`;
          });
          markdownContent += '\n---\n\n';
        }
        
        markdownContent += '### Your Task (Instructions for Raven/Poetic Brain)\n\n';
        markdownContent += 'You are Raven Calder, a poetic interpreter of symbolic data. Your task is to synthesize the data for each day presented above into a "Woven Reading." For each day:\n\n';
        markdownContent += '1.  **Begin with the Symbolic Weather**: Describe the overall feeling of the day using the Magnitude, Bias, and Volatility.\n';
        markdownContent += '2.  **Explain the Relational Dynamics**: Use the Mirror Data to describe the interplay between the two individuals. What is the shared experience? How are their individual contributions shaping it?\n';
        markdownContent += '3.  **Weave in the Narrative**: Use the Poetic Hooks to give the "why" behind the numbers. The "Peak Aspect" is the headline story of the day.\n';
        markdownContent += '4.  **Adhere to Your Voice**: Your language must be clear, agency-preserving, and non-predictive. Reflect the patterns; do not dictate the future.\n';
        
        // Clean up temp file
        try {
          fs.unlinkSync(configPath);
        } catch (e) {
          // Ignore cleanup errors
        }
        
        // Return both formats
        return NextResponse.json({
          success: true,
          version: 'v2',
          unified_output: unifiedOutput,
          markdown_reading: markdownContent,
          download_formats: {
            mirror_report: {
              format: 'markdown',
              content: markdownContent,
              filename: `Woven_Reading_${run_metadata.person_a}_${run_metadata.person_b}_${run_metadata.date_range[0]}_to_${run_metadata.date_range[1]}.md`
            },
            symbolic_weather: {
              format: 'json',
              content: unifiedOutput,
              filename: `unified_output_${run_metadata.person_a}_${run_metadata.person_b}_${new Date().toISOString().split('T')[0]}.json`
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
