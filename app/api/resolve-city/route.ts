import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const city = url.searchParams.get('city') || '';
  const state = url.searchParams.get('state') || '';
  const nation = url.searchParams.get('nation') || 'US';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  } as Record<string, string>;

  if (!city) {
    return new NextResponse(
      JSON.stringify({ error: 'city parameter required' }),
      { status: 400, headers }
    );
  }

  // Reuse existing logic from the server module by adapting the event shape
  const { resolveCity } = await import('../../../lib/server/astrology-mathbrain.js');
  const event = {
    queryStringParameters: { city, state, nation },
  } as any;

  const result = await resolveCity(event);

  return new NextResponse(result.body, { status: result.statusCode || 200, headers });
}

