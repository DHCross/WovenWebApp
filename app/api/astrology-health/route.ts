import { NextRequest, NextResponse } from 'next/server';

const mathBrainFunction = require('../../../lib/server/astrology-mathbrain.js');

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);

  // Convert headers
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const event = {
    httpMethod: 'GET',
    queryStringParameters: params,
    headers,
  };

  const result = await mathBrainFunction.health(event);
  return new NextResponse(result.body, {
    status: result.statusCode,
    headers: new Headers(result.headers || { 'content-type': 'application/json' })
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }) });
}
