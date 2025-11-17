import { NextResponse } from 'next/server';
import { createWovenAIPacket } from '../../../lib/export/wovenAIPacket';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const unifiedOutput = body?.unifiedOutput;
    const options = body?.options ?? {};

    if (!unifiedOutput || typeof unifiedOutput !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'unifiedOutput (Math Brain v2 output) is required.' },
        { status: 400 },
      );
    }

    const packet = createWovenAIPacket(unifiedOutput, options);

    return NextResponse.json({ ok: true, packet });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[WovenAIPacket] API error', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to generate Woven AI Packet.' },
      { status: 500 },
    );
  }
}
