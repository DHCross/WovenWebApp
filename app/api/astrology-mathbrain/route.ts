import { NextRequest, NextResponse } from 'next/server';
import { AstrologyRequestSchema, computeAstrology } from '../../../src/services/astrologyMathBrain';

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
};

function withCors<T>(body: T, init: { status?: number } = {}) {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: corsHeaders,
  });
}

export async function GET() {
  return withCors({
    success: true,
    message: 'Math Brain API is available',
    endpoints: ['GET', 'POST'],
    timestamp: new Date().toISOString(),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return withCors({
      success: false,
      error: 'Invalid JSON payload',
      code: 'INVALID_JSON',
    }, { status: 400 });
  }

  const parsed = AstrologyRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return withCors({
      success: false,
      error: 'Validation failed',
      code: 'INVALID_REQUEST',
      issues: parsed.error.issues,
    }, { status: 400 });
  }

  const result = await computeAstrology(parsed.data);
  if (!result.ok) {
    return withCors({
      success: false,
      error: result.error,
      code: result.status === 500 ? 'UPSTREAM_ERROR' : 'BAD_REQUEST',
      detail: result.detail,
      issues: result.issues,
    }, { status: result.status });
  }

  return withCors({
    success: true,
    data: result.data,
  });
}
