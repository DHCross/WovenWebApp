import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function respond(body: any, status = 200) {
  return NextResponse.json(body, { status, headers });
}

export async function GET() {
  const domain = process.env.AUTH0_DOMAIN?.replace(/^https?:\/\//, '');
  const clientId = process.env.AUTH0_CLIENT_ID;
  const audience = process.env.AUTH0_AUDIENCE ?? null;

  if (!domain || !clientId) {
    return respond({
      success: false,
      error: 'Auth misconfiguration: set AUTH0_DOMAIN and AUTH0_CLIENT_ID.',
      code: 'AUTH0_CONFIG_MISSING',
    }, 500);
  }

  return respond({
    success: true,
    domain,
    clientId,
    audience,
    hasAudience: Boolean(audience),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers });
}
