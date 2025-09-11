import { NextRequest } from 'next/server';
import { invokePoeticBrain } from '../../../lib/poetic-brain-adapter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { sectionType, inputPayload } = await req.json();
    if (!sectionType) {
      return new Response(JSON.stringify({ success: false, error: 'MISSING_SECTION_TYPE' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  const result = invokePoeticBrain({ sectionType, payload: inputPayload || {} });
  return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message || 'INTERNAL_ERROR' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
