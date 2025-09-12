import { NextRequest, NextResponse } from 'next/server';

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
    awsRequestId: crypto.randomUUID(),
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
    const body = await request.text();
    
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
      body: body,
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
      awsRequestId: crypto.randomUUID(),
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