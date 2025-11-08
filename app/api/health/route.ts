import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

export const dynamic = 'force-dynamic'; // Ensure this is not statically optimized
