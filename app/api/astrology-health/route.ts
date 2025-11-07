import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = Object.fromEntries(url.searchParams.entries());

  // Reuse compact health logic from server module by adapting event shape
  const { health } = await import('../../../lib/server/astrology-mathbrain.js');
  const event = {
    queryStringParameters: search,
  } as any;

  const result = await health(event);

  return new NextResponse(result.body, {
    status: result.statusCode || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

