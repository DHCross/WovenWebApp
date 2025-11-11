import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const perplexityKey = process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY;
    const status = {
      success: true,
      timestamp: new Date().toISOString(),
      env: {
        perplexityConfigured: Boolean(perplexityKey && String(perplexityKey).trim()),
        rapidapiConfigured: Boolean(process.env.RAPIDAPI_KEY && String(process.env.RAPIDAPI_KEY).trim()),
        auth0Configured: Boolean(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID),
      },
      endpoints: {
        poeticBrain: '/api/poetic-brain (POST, requires Auth0 bearer token)',
        resolveCity: '/api/resolve-city (GET)',
        astrologyHealth: '/api/astrology-health (GET)'
      }
    };

    return NextResponse.json(status, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'HEALTH_ERROR' }, { status: 500 });
  }
}
