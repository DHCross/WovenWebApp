import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Import the existing Netlify function logic
// Since this is a CommonJS module, we'll need to use require
const netlifyHandler = require('../../../netlify/functions/astrology-mathbrain.js');

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
    const result = await netlifyHandler.handler(event, context);
    
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
    const body = (function transform(input:any){
      if(!input || (!input.subjectA && !input.subjectB)) return JSON.stringify(input ?? {});
      const a = input.subjectA || {};
      const b = input.subjectB || null;
      const birthA = a.birth || {};
      const birthB = b?.birth || {};
      const toPerson = (name:string, birth:any, local:any)=>({
        name,
        year: parseInt(birth.date?.split('-')[0]||birth.year,10),
        month: parseInt(birth.date?.split('-')[1]||birth.month,10),
        day: parseInt(birth.date?.split('-')[2]||birth.day,10),
        hour: parseInt((birth.time||'').split(':')[0]||birth.hour,10),
        minute: parseInt((birth.time||'').split(':')[1]||birth.minute,10),
        latitude: birth.lat ?? birth.latitude,
        longitude: birth.lon ?? birth.lng ?? birth.longitude,
        timezone: birth.tz ?? birth.timezone,
        city: birth.city,
        state: birth.state,
        nation: birth.nation,
        ...(local ? { A_local: local, B_local: local } : {})
      });
      const personA = toPerson(a.name, birthA, a.A_local);
      const personB = b ? toPerson(b.name, birthB, b.B_local) : undefined;
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

    const result = await netlifyHandler.handler(event, context);
    
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
