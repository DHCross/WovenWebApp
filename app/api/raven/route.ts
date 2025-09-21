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
    const textInput = typeof input === 'string' ? input : '';
    const resolvedOptions = (typeof options === 'object' && options !== null) ? options as Record<string, any> : {};
    let sid = sessionId as string | undefined;
    if (!sid) { sid = randomUUID(); }
    if (!sessions.has(sid)) sessions.set(sid, { probes: [] });

    if (action === 'feedback') {
      const { probeId, tag } = resolvedOptions as { probeId: string; tag: SSTTag };
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
    const intent = detectIntent(textInput);
    if (intent === 'geometry') {
      const parsed = parseAstroSeekBlob(String(input));
      const geo = normalizeGeometry(parsed);
      const prov = stampProvenance({ source: 'AstroSeek (manual paste)' });
      const draft = await renderShareableMirror({ geo, prov, options: resolvedOptions });
      // create a probe entry from the draft next_step or a summary line
      const probe = createProbe(draft?.next_step || 'Reflect on the mirror', randomUUID());
      sessions.get(sid)!.probes.push(probe);
      return NextResponse.json({ intent, ok: true, draft, prov, sessionId: sid, probe });
    }

    if (intent === 'report') {
      // Map options.reportType → Math Brain payload
      const mb = await runMathBrain(resolvedOptions);
      if (!mb.success) {
        return NextResponse.json({ intent, ok: false, error: 'Math Brain failed', details: mb });
      }
      const prov = stampProvenance(mb.provenance);
      const draft = await renderShareableMirror({ geo: mb.geometry, prov, options: resolvedOptions });
      const probe = createProbe(draft?.next_step || 'Note one actionable step', randomUUID());
      sessions.get(sid)!.probes.push(probe);
      return NextResponse.json({ intent, ok: true, draft, prov, climate: mb.climate ?? null, sessionId: sid, probe });
    }

    // conversation
    const rawContexts = Array.isArray(resolvedOptions.reportContexts) ? resolvedOptions.reportContexts : [];
    const normalizedContexts = rawContexts
      .map((ctx: any) => {
        if (!ctx || typeof ctx !== 'object') return null;
        const content = typeof ctx.content === 'string' ? ctx.content : '';
        const summary = typeof ctx.summary === 'string' ? ctx.summary : '';
        if (!content.trim() && !summary.trim()) return null;
        const next: Record<string, any> = { ...ctx };
        if (content) next.content = content;
        if (summary) next.summary = summary;
        return next;
      })
      .filter((ctx): ctx is Record<string, any> => Boolean(ctx));

    const hasReportContext =
      normalizedContexts.length > 0 ||
      typeof resolvedOptions.reportId === 'string' ||
      typeof resolvedOptions.reportType === 'string';

    const hasGeometryPayload = Boolean(
      resolvedOptions.geo ||
      resolvedOptions.geometry ||
      resolvedOptions.geometryData ||
      resolvedOptions.chart
    );

    const wantsWeatherOnly =
      resolvedOptions.weatherOnly === true ||
      (typeof resolvedOptions.mode === 'string' && /weather/i.test(resolvedOptions.mode)) ||
      /\b(weather|sky today|planetary (weather|currents)|what's happening in the sky)\b/i.test(textInput);

    if (!hasReportContext && !hasGeometryPayload && !wantsWeatherOnly) {
      const prov = stampProvenance({ source: 'Conversational Guard' });
      const guidance = NO_CONTEXT_GUIDANCE;
      const guardDraft = {
        picture: 'With you—before we dive in…',
        feeling: 'I need a chart or report context to mirror accurately.',
        container: 'Option 1 · Generate Math Brain on the main page, then click “Ask Raven.”',
        option: 'Option 2 · Ask for “planetary weather only” to hear today’s field without personal mapping.',
        next_step: 'If you already have a JSON report, upload it here and I’ll proceed.'
      };
      return NextResponse.json({ intent, ok: true, guard: true, guidance, draft: guardDraft, prov, sessionId: sid });
    }

    const mergedOptions: Record<string, any> = {
      ...resolvedOptions,
      reportContexts: normalizedContexts.length > 0 ? normalizedContexts : undefined,
      userMessage: textInput,
      weatherOnly: wantsWeatherOnly
    };
    if (!mergedOptions.reportContexts) {
      delete mergedOptions.reportContexts;
    }

    const prov = stampProvenance({
      source: wantsWeatherOnly ? 'Conversational (Weather-only)' : 'Conversational'
    });

    const draft = await renderShareableMirror({ geo: null, prov, options: mergedOptions, conversational: true });
    const probe = createProbe(draft?.next_step || 'Take one breath', randomUUID());
    sessions.get(sid)!.probes.push(probe);
    return NextResponse.json({ intent, ok: true, draft, prov, sessionId: sid, probe });


  } catch (error) {
    console.error('Raven API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ ok: false, error: 'Failed to process request', details: errorMessage }, { status: 500 });
  }
}
