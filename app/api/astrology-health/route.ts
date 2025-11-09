import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ping = url.searchParams.get('ping');
  
  // Basic health check for astrology services
  const healthData = {
    ok: true,
    status: 'healthy',
    service: 'astrology-mathbrain',
    timestamp: new Date().toISOString(),
    ping: ping || undefined,
  };

  return NextResponse.json(healthData, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}

