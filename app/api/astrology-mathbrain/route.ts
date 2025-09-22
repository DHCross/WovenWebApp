import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Reuse the legacy math brain implementation directly
const mathBrainFunction = require('../../../lib/server/astrology-mathbrain.js');

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
    console.error('Astrology MathBrain API error:', error);
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
        context: { mode: (()=>{
          const rt = String(input.report_type||'').toLowerCase();
          if (rt.includes('synastry_transits')) return 'synastry_transits';
          if (rt.includes('synastry')) return 'synastry';
          if (rt.includes('balance_meter')) return 'balance_meter';
          return (input.context?.mode || 'mirror');
        })() },
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

    const result = await mathBrainFunction.handler(event, context);
    
    return new NextResponse(result.body, {
      status: result.statusCode,
      headers: new Headers(result.headers || {})
    });
  } catch (error: any) {
    console.error('Astrology MathBrain API error:', error);
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
