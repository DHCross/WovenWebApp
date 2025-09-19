import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ success: true, status: 'ok', time: new Date().toISOString() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }) });
}
