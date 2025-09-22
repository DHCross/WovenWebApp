import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { detectIntent } from '@/lib/raven/intent';
import { parseAstroSeekBlob } from '@/lib/raven/parser';
import { normalizeGeometry } from '@/lib/raven/normalize';
import { renderShareableMirror } from '@/lib/raven/render';
import { stampProvenance } from '@/lib/raven/provenance';
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

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

function getNested(source: any, path: string[]): any {
  let current: any = source;
  for (const segment of path) {
    if (!isObject(current) && typeof current !== 'object') return undefined;
    current = current?.[segment];
    if (current === undefined || current === null) return current;
  }
  return current;
}

function asString(value: any): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
}

function asNumber(value: any): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (isObject(value)) {
    if (typeof value.value === 'number' && Number.isFinite(value.value)) {
      return value.value;
    }
    if (typeof value.score === 'number' && Number.isFinite(value.score)) {
      return value.score;
    }
    if (typeof value.mean === 'number' && Number.isFinite(value.mean)) {
      return value.mean;
    }
  }
  return undefined;
}

function pickString(data: any, paths: string[][]): string | undefined {
  for (const path of paths) {
    const candidate = getNested(data, path);
    const str = asString(candidate);
    if (str) return str;
  }
  return undefined;
}

function pickNumber(data: any, paths: string[][]): number | undefined {
  for (const path of paths) {
    const candidate = getNested(data, path);
    const num = asNumber(candidate);
    if (num !== undefined) return num;
  }
  return undefined;
}

function summariseUploadedReportJson(raw: string): {
  draft: Record<string, any>;
  prov: Record<string, any>;
  climateText?: string;
  highlight?: string;
} | null {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed.startsWith('{') || trimmed.length < 20) {
    return null;
  }
  if (!/"balance_meter"|"solo_mirror"|"mirror_voice"/i.test(trimmed)) {
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!isObject(parsed)) {
    return null;
  }

  const reportType =
    pickString(parsed, [
      ['report_type'],
      ['mode'],
      ['context', 'mode'],
      ['metadata', 'report_type'],
      ['reports', 'report_type'],
      ['reports', 'type'],
      ['contract'],
    ]) || 'report';

  const subject = pickString(parsed, [
    ['balance_meter', 'person', 'name'],
    ['person', 'name'],
    ['person_a', 'details', 'name'],
    ['person_a', 'name'],
    ['context', 'person', 'name'],
    ['context', 'person_a', 'name'],
    ['provenance', 'person_name'],
  ]);

  const climateLine = pickString(parsed, [
    ['balance_meter', 'climate_line'],
    ['balance_meter', 'climate', 'line'],
    ['summary', 'climate_line'],
    ['context', 'climate_line'],
    ['reports', 'balance_meter', 'climate', 'line'],
  ]);

  const magnitude = pickNumber(parsed, [
    ['balance_meter', 'magnitude'],
    ['balance_meter', 'magnitude', 'value'],
    ['balance_meter', 'summary', 'magnitude'],
    ['balance_meter', 'summary', 'magnitude', 'value'],
    ['balance_meter', 'seismograph', 'magnitude'],
    ['balance_meter', 'climate', 'magnitude'],
    ['seismograph', 'magnitude'],
    ['summary', 'balance_meter', 'magnitude'],
    ['summary', 'balance_meter', 'magnitude', 'value'],
    ['reports', 'balance_meter', 'magnitude'],
    ['reports', 'balance_meter', 'magnitude', 'value'],
  ]);
  const magnitudeLabel = pickString(parsed, [
    ['balance_meter', 'magnitude', 'label'],
    ['balance_meter', 'magnitude', 'term'],
    ['balance_meter', 'magnitude_label'],
    ['balance_meter', 'climate', 'magnitude_label'],
    ['summary', 'balance_meter', 'magnitude_label'],
  ]);

  const valence = pickNumber(parsed, [
    ['balance_meter', 'valence'],
    ['balance_meter', 'valence', 'value'],
    ['balance_meter', 'valence_bounded'],
    ['balance_meter', 'climate', 'valence'],
    ['balance_meter', 'climate', 'valence_bounded'],
    ['seismograph', 'valence'],
    ['summary', 'balance_meter', 'valence'],
    ['summary', 'balance_meter', 'valence', 'value'],
    ['reports', 'balance_meter', 'valence'],
    ['reports', 'balance_meter', 'valence', 'value'],
  ]);
  const valenceLabel = pickString(parsed, [
    ['balance_meter', 'valence', 'label'],
    ['balance_meter', 'valence', 'term'],
    ['balance_meter', 'valence_label'],
    ['balance_meter', 'climate', 'valence_label'],
    ['summary', 'balance_meter', 'valence_label'],
  ]);

  const volatility = pickNumber(parsed, [
    ['balance_meter', 'volatility'],
    ['balance_meter', 'volatility', 'value'],
    ['balance_meter', 'climate', 'volatility'],
    ['balance_meter', 'seismograph', 'volatility'],
    ['seismograph', 'volatility'],
    ['summary', 'balance_meter', 'volatility'],
    ['reports', 'balance_meter', 'volatility'],
    ['reports', 'balance_meter', 'volatility', 'value'],
  ]);
  const volatilityLabel = pickString(parsed, [
    ['balance_meter', 'volatility', 'label'],
    ['balance_meter', 'volatility', 'term'],
    ['balance_meter', 'volatility_label'],
  ]);

  const periodStart = pickString(parsed, [
    ['balance_meter', 'period', 'start'],
    ['context', 'period', 'start'],
    ['context', 'window', 'start'],
    ['window', 'start'],
    ['reports', 'balance_meter', 'period', 'start'],
  ]);
  const periodEnd = pickString(parsed, [
    ['balance_meter', 'period', 'end'],
    ['context', 'period', 'end'],
    ['context', 'window', 'end'],
    ['window', 'end'],
    ['reports', 'balance_meter', 'period', 'end'],
  ]);

  const hooksRoot =
    getNested(parsed, ['balance_meter', 'hook_stack', 'hooks']) ??
    getNested(parsed, ['reports', 'balance_meter', 'hook_stack', 'hooks']);
  const hooks = Array.isArray(hooksRoot)
    ? hooksRoot
        .map((entry: any) => {
          if (typeof entry === 'string') {
            return entry.trim();
          }
          if (isObject(entry)) {
            const label = asString(entry.label);
            if (!label) return undefined;
            const orb = asNumber(entry.orb);
            const tags: string[] = [];
            if (entry.exact === true) tags.push('exact');
            if (typeof orb === 'number') tags.push(`${orb.toFixed(1)}°`);
            return tags.length ? `${label} (${tags.join(', ')})` : label;
          }
          return undefined;
        })
        .filter(Boolean)
    : [];

  const summaryPieces: string[] = [];
  if (typeof magnitude === 'number') {
    summaryPieces.push(
      `Magnitude ${magnitude.toFixed(2)}${magnitudeLabel ? ` (${magnitudeLabel})` : ''}`
    );
  }
  if (typeof valence === 'number') {
    summaryPieces.push(
      `Valence ${valence.toFixed(2)}${valenceLabel ? ` (${valenceLabel})` : ''}`
    );
  }
  if (typeof volatility === 'number') {
    summaryPieces.push(
      `Volatility ${volatility.toFixed(2)}${volatilityLabel ? ` (${volatilityLabel})` : ''}`
    );
  }

  const containerParts: string[] = [];
  if (periodStart && periodEnd) {
    containerParts.push(`Window ${periodStart} → ${periodEnd}`);
  } else if (periodStart) {
    containerParts.push(`Window begins ${periodStart}`);
  }
  if (hooks.length) {
    containerParts.push(`Hooks ${hooks.slice(0, 2).join(' · ')}`);
  }

  const picture = climateLine || `Report logged for ${subject || 'this chart'}.`;
  const feeling = summaryPieces.length
    ? summaryPieces.join(' · ')
    : 'Stored for interpretation when you are ready.';
  const container = containerParts.length
    ? containerParts.join(' · ')
    : 'Context added to the session library.';
  const option = 'Ask for a Poetic translation of any section or upload another layer.';
  const next_step = 'When you are ready, tell me which pattern you want mirrored.';

  const appendix: Record<string, any> = {};
  if (reportType) appendix.report_type = reportType;
  if (subject) appendix.subject = subject;
  if (periodStart) appendix.period_start = periodStart;
  if (periodEnd) appendix.period_end = periodEnd;
  if (typeof magnitude === 'number') appendix.magnitude = magnitude;
  if (magnitudeLabel) appendix.magnitude_label = magnitudeLabel;
  if (typeof valence === 'number') appendix.valence = valence;
  if (valenceLabel) appendix.valence_label = valenceLabel;
  if (typeof volatility === 'number') appendix.volatility = volatility;
  if (volatilityLabel) appendix.volatility_label = volatilityLabel;
  if (hooks.length) appendix.hooks = hooks.slice(0, 3);

  const draft: Record<string, any> = { picture, feeling, container, option, next_step };
  if (Object.keys(appendix).length > 0) {
    draft.appendix = appendix;
  }

  const prov = stampProvenance({
    source: 'Uploaded JSON Report',
    report_type: reportType,
    ...(subject ? { subject } : {}),
  });

  const climateText = summaryPieces.length ? summaryPieces.join(' · ') : undefined;
  const highlight = climateText ||
    (periodStart
      ? `Report stored for ${periodStart}${periodEnd ? ` → ${periodEnd}` : ''}`
      : undefined);

  return { draft, prov, climateText, highlight };
}

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
    console.error('Raven API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ ok: false, error: 'Failed to process request', details: errorMessage }, { status: 500 });
  }
}
