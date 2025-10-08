import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { detectIntent } from '@/lib/raven/intent';
import { parseAstroSeekBlob } from '@/lib/raven/parser';
import { normalizeGeometry } from '@/lib/raven/normalize';
import { renderShareableMirror } from '@/lib/raven/render';
import { stampProvenance } from '@/lib/raven/provenance';
import { summariseUploadedReportJson } from '@/lib/raven/reportSummary';
import { runMathBrain } from '@/lib/mathbrain/adapter';
import { createProbe, commitProbe, scoreSession, type SessionSSTLog, type SSTTag } from '@/lib/raven/sst';
import {
  ASTROSEEK_REFERENCE_GUIDANCE,
  referencesAstroSeekWithoutGeometry
} from '@/lib/raven/guards';
import { buildNoContextGuardCopy } from '@/lib/guard/no-context';

const PERSONAL_READING_PATTERNS: RegExp[] = [
  /\b(read|mirror|interpret|analyze|look at)\b[^.]{0,120}\b(me|my)\b/i,
  /\b(me|my)\b[^.]{0,120}\b(chart|natal|birth\s+chart|placements|geometry|astrology|transits|report)\b/i,
  /\bpersonal\s+(reading|mirror)\b/i,
  /\bwhat do you see in my\b/i,
  /\btell me what you see\b[^.]{0,120}\b(me|my)\b/i,
  /\bbalance\s+meter\b/i,
  /\bsession\b[^.]{0,40}\bscore\b/i,
];

function requestsPersonalReading(text: string): boolean {
  if (!text) return false;
  return PERSONAL_READING_PATTERNS.some((pattern) => pattern.test(text));
}

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
    const uploadedSummary = summariseUploadedReportJson(textInput);
    if (uploadedSummary) {
      const { draft, prov, climateText, highlight } = uploadedSummary;
      const probe = createProbe(
        highlight || 'Mark one observation from this upload.',
        randomUUID()
      );
      sessions.get(sid)!.probes.push(probe);
      return NextResponse.json({
        intent: 'report',
        ok: true,
        draft,
        prov,
        climate: climateText ?? null,
        sessionId: sid,
        probe,
      });
    }
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

    const wantsPersonalReading = requestsPersonalReading(textInput);
    const mentionsAstroSeek = referencesAstroSeekWithoutGeometry(textInput);

    if (!hasReportContext && !hasGeometryPayload && !wantsWeatherOnly && (wantsPersonalReading || mentionsAstroSeek)) {
      if (mentionsAstroSeek) {
        const prov = stampProvenance({ source: 'Conversational Guard (AstroSeek)' });
        const guidance = ASTROSEEK_REFERENCE_GUIDANCE;
        const guardDraft = {
          picture: 'Got your AstroSeek mention—one more step.',
          feeling: 'I need the actual export contents to mirror accurately.',
          container: 'Option 1 · Click “Upload report” and drop the AstroSeek download (JSON or text).',
          option: 'Option 2 · Open the export and paste the full table or text here.',
          next_step: 'Once the geometry is included, I can read you in detail.'
        };
        return NextResponse.json({ intent, ok: true, guard: true, guidance, draft: guardDraft, prov, sessionId: sid });
      }
      if (wantsPersonalReading) {
        const prov = stampProvenance({ source: 'Conversational Guard' });
        const guardCopy = buildNoContextGuardCopy();
        const guardDraft = {
          picture: guardCopy.picture,
          feeling: guardCopy.feeling,
          container: guardCopy.container,
          option: guardCopy.option,
          next_step: guardCopy.next_step
        };
        return NextResponse.json({ intent, ok: true, guard: true, guidance: guardCopy.guidance, draft: guardDraft, prov, sessionId: sid });
      }
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
    const shouldScoreSession = hasReportContext || hasGeometryPayload;
    const probe = shouldScoreSession ? createProbe(draft?.next_step || 'Take one breath', randomUUID()) : null;
    if (probe) {
      sessions.get(sid)!.probes.push(probe);
    }
    return NextResponse.json({ intent, ok: true, draft, prov, sessionId: sid, probe: probe ?? null });


  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Raven API Error:', error);

    // Enhanced error logging
    if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error('Error name:', error.name);
      // eslint-disable-next-line no-console
      console.error('Error message:', error.message);
      // eslint-disable-next-line no-console
      console.error('Error stack:', error.stack);
    }

    // Log request details for debugging
    try {
      const url = new URL(req.url);
      // eslint-disable-next-line no-console
      console.error('Request URL:', url.pathname);
      // eslint-disable-next-line no-console
      console.error('Request method:', req.method);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Could not log request details:', e);
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorDetails = error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : errorMessage;

    return NextResponse.json({
      ok: false,
      error: 'Failed to process request',
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }, { status: 500 });
  }
}
