import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { detectIntent } from '@/lib/raven/intent';
import { parseAstroSeekBlob } from '@/lib/raven/parser';
import { normalizeGeometry } from '@/lib/raven/normalize';
import { renderShareableMirror } from '@/lib/raven/render';
import { stampProvenance } from '@/lib/raven/provenance';
import { runMathBrain } from '@/lib/mathbrain/adapter';
import { createProbe, commitProbe, scoreSession, type SessionSSTLog, type SSTTag } from '@/lib/raven/sst';

const NO_CONTEXT_GUIDANCE = `I can’t responsibly read you without a chart or report context. Two quick options:

• Generate Math Brain on the main page (geometry only), then click “Ask Raven” to send the report here
• Or ask for “planetary weather only” to hear today’s field without personal mapping

If you already have a JSON report, paste or upload it and I’ll proceed.`;

// Minimal in-memory session store (dev only). For prod, persist per-user.
const sessions = new Map<string, SessionSSTLog>();

export async function POST(req: Request) {
  try {
    const { action = 'generate', input, options = {}, sessionId } = await req.json();
    let sid = sessionId as string | undefined;
    if (!sid) { sid = randomUUID(); }
    if (!sessions.has(sid)) sessions.set(sid, { probes: [] });

    if (action === 'feedback') {
      const { probeId, tag } = options as { probeId: string; tag: SSTTag };
      const log = sessions.get(sid)!;
      const idx = log.probes.findIndex(p => p.id === probeId);
      if (idx === -1) return NextResponse.json({ ok: false, error: 'Probe not found' }, { status: 404 });
      log.probes[idx] = commitProbe(log.probes[idx], tag);
      const scores = scoreSession(log);
      return NextResponse.json({ ok: true, sessionId: sid, scores, probe: log.probes[idx] });
    }

    if (action === 'export') {
      const log = sessions.get(sid)!;
      const scores = scoreSession(log);
      // For now, return JSON; PDF export can be added using html2pdf on client
      return NextResponse.json({ ok: true, sessionId: sid, scores, log });
    }

    // Default: generate (router)
    const intent = detectIntent(typeof input === 'string' ? input : '');
    if (intent === 'geometry') {
      const parsed = parseAstroSeekBlob(String(input));
      const geo = normalizeGeometry(parsed);
      const prov = stampProvenance({ source: 'AstroSeek (manual paste)' });
      const draft = await renderShareableMirror({ geo, prov, options });
      // create a probe entry from the draft next_step or a summary line
      const probe = createProbe(draft?.next_step || 'Reflect on the mirror', randomUUID());
      sessions.get(sid)!.probes.push(probe);
      return NextResponse.json({ intent, ok: true, draft, prov, sessionId: sid, probe });
    }

    if (intent === 'report') {
      // Map options.reportType → Math Brain payload
      const mb = await runMathBrain(options);
      if (!mb.success) {
        return NextResponse.json({ intent, ok: false, error: 'Math Brain failed', details: mb });
      }
      const prov = stampProvenance(mb.provenance);
      const draft = await renderShareableMirror({ geo: mb.geometry, prov, options });
      const probe = createProbe(draft?.next_step || 'Note one actionable step', randomUUID());
      sessions.get(sid)!.probes.push(probe);
      return NextResponse.json({ intent, ok: true, draft, prov, climate: mb.climate ?? null, sessionId: sid, probe });
    }

    if (intent === 'conversation') {
      const textInput = typeof input === 'string' ? input : '';
      const safeOptions = (options ?? {}) as Record<string, any>;
      const contexts = Array.isArray(safeOptions.reportContexts) ? safeOptions.reportContexts : [];
      const hasContextPayload = contexts.some(ctx => ctx && typeof ctx.content === 'string' && ctx.content.trim().length > 0);
      const hasGeometryPayload = !!safeOptions.geo || !!safeOptions.geometry;
      const hasReportIdentifiers = typeof safeOptions.reportId === 'string' || typeof safeOptions.reportType === 'string';
      const hasLegitimatePayload = hasContextPayload || hasGeometryPayload || hasReportIdentifiers;
      const wantsWeatherOnly = /\b(weather|sky today|planetary (weather|currents)|what's happening in the sky)\b/i.test(textInput);

      if (!hasLegitimatePayload && !wantsWeatherOnly) {
        return NextResponse.json({ intent, ok: false, error: NO_CONTEXT_GUIDANCE, sessionId: sid });
      }

      const prov = stampProvenance({ source: wantsWeatherOnly ? 'Conversational (Weather-only)' : 'Conversational' });
      const mergedOptions = { ...safeOptions, userMessage: textInput, weatherOnly: wantsWeatherOnly };
      const draft = await renderShareableMirror({ geo: null, prov, options: mergedOptions, conversational: true });
      const probe = createProbe(draft?.next_step || 'Take one breath', randomUUID());
      sessions.get(sid)!.probes.push(probe);
      return NextResponse.json({ intent, ok: true, draft, prov, sessionId: sid, probe });
    }

  } catch (error) {
    console.error('Raven API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ ok: false, error: 'Failed to process request', details: errorMessage }, { status: 500 });
  }
}
