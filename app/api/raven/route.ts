import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { detectIntent } from '@/lib/raven/intent';
import { parseAstroSeekBlob } from '@/lib/raven/parser';
import { normalizeGeometry } from '@/lib/raven/normalize';
import { renderShareableMirror } from '@/lib/raven/render';
import { stampProvenance } from '@/lib/raven/provenance';
import { summariseUploadedReportJson } from '@/lib/raven/reportSummary';
import { runMathBrain } from '@/lib/mathbrain/adapter';
import { callPerplexity } from '@/lib/llm';
import {
  createProbe,
  commitProbe,
  scoreSession,
  type SessionSSTLog,
  type SSTTag,
  type SessionTurn,
  type SessionSuggestion,
} from '@/lib/raven/sst';
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
const RAVEN_PERSONA_HOOK = "You are Raven Calder, a mystical poetic brain. Your voice is wise, lyrical, and insightful. You do not give direct advice, but rather offer reflections, metaphors, and beautiful questions. You see the cosmos in a grain of sand. Respond to the user's prompt with this persona. CRITICAL: Do NOT break character. Do not mention you are an AI or a language model. Suppress all chain-of-thought or meta-commentary.";
const MAX_CONTEXT_CHARS = 1800;
const MAX_HISTORY_TURNS = 6;

function truncateContextContent(content: string, limit: number = MAX_CONTEXT_CHARS): string {
  if (content.length <= limit) return content;
  return content.slice(0, limit).trimEnd() + ' …';
}

function formatReportContextsForPrompt(contexts: Record<string, any>[]): string {
  if (!Array.isArray(contexts) || contexts.length === 0) return '';
  return contexts
    .slice(-3)
    .map((ctx, idx) => {
      const name = typeof ctx.name === 'string' && ctx.name.trim() ? ctx.name.trim() : `Report ${idx + 1}`;
      const typeLabel = typeof ctx.type === 'string' && ctx.type.trim() ? ctx.type.trim().toUpperCase() : 'UNKNOWN';
      const summary = typeof ctx.summary === 'string' ? ctx.summary.trim() : '';
      const relocationText = ctx.relocation?.label ? `Relocation: ${ctx.relocation.label}` : '';
      const rawContent = typeof ctx.content === 'string' ? ctx.content.trim() : '';
      let snippet = rawContent ? truncateContextContent(rawContent) : '';
      if (snippet) {
        const looksJson = /^[\s\r\n]*[{[]/.test(snippet);
        snippet = looksJson ? `\`\`\`json\n${snippet}\n\`\`\`` : snippet;
      }
      return [
        `Report ${idx + 1} · ${typeLabel} · ${name}`,
        summary ? `Summary: ${summary}` : '',
        relocationText,
        snippet,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function formatHistoryForPrompt(history?: SessionTurn[]): string {
  if (!history || history.length === 0) return '';
  const recent = history.slice(-MAX_HISTORY_TURNS);
  return recent
    .map((turn) => {
      const speaker = turn.role === 'raven' ? 'Raven' : 'User';
      return `${speaker}: ${turn.content}`;
    })
    .join('\n');
}

function extractProbeFromResponse(responseText: string): string | null {
  const lines = responseText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (line.endsWith('?') && line.length <= 200) {
      return line;
    }
  }
  const match = responseText.match(/([^.?!\n]{3,200}\?)(?!.*\?)/s);
  return match ? match[1].trim() : null;
}

type ConversationMode = 'explanation' | 'clarification' | 'suggestion';

const CLARIFICATION_PATTERNS: RegExp[] = [
  /\bcan you clarify\b/i,
  /\bcan you explain\b/i,
  /\bwhat do you mean\b/i,
  /\bi don't (quite\s+)?understand\b/i,
  /\bthat (doesn't|does not) (fit|land|make sense)\b/i,
  /\bhelp me understand\b/i,
  /\bso you're saying\b/i,
  /\bdoes that mean\b/i,
];

const SUGGESTION_PATTERNS: RegExp[] = [
  /\b(feature|product|app) suggestion\b/i,
  /\bhere'?s an idea\b/i,
  /\bmaybe you could\b/i,
  /\bi (recommend|suggest)\b/i,
  /\bit would help if\b/i,
  /\bcan you (add|change|update|adjust|stop)\b/i,
  /\bshould (we|you)\b.*\b(instead|maybe)\b/i,
  /\bwould it be possible to\b/i,
];

const FALLBACK_PROBE_BY_MODE: Record<ConversationMode, string> = {
  explanation: 'Where do you feel this pattern pressing most in your day right now?',
  clarification: 'What would help me restate this so it feels truer to your lived experience?',
  suggestion: 'How should we carry this suggestion forward so it genuinely supports you?',
};

function detectConversationMode(text: string, session: SessionSSTLog): ConversationMode {
  const input = text.trim();
  if (!input) return 'explanation';

  if (SUGGESTION_PATTERNS.some((pattern) => pattern.test(input))) {
    return 'suggestion';
  }

  const looksLikeClarification =
    CLARIFICATION_PATTERNS.some((pattern) => pattern.test(input)) ||
    /\b(resonate|land|fit|accurate|familiar)\b/i.test(input);

  if (looksLikeClarification) {
    const lastProbe = [...(session.probes || [])].reverse().find((probe) => !probe.committed);
    if (lastProbe) {
      return 'clarification';
    }
  }

  return 'explanation';
}

function recordSuggestion(session: SessionSSTLog, text: string): void {
  const normalized = text.trim();
  if (!normalized) return;
  if (!Array.isArray(session.suggestions)) {
    session.suggestions = [] as SessionSuggestion[];
  }
  const alreadyStored = session.suggestions.some(
    (entry) => entry.text === normalized,
  );
  if (!alreadyStored) {
    session.suggestions.push({
      text: normalized,
      acknowledged: true,
      createdAt: new Date().toISOString(),
    });
  }
}

const sessions = new Map<string, SessionSSTLog>();

export async function POST(req: Request) {
  try {
    const { action = 'generate', input, options = {}, sessionId } = await req.json();
    const textInput = typeof input === 'string' ? input : '';
    const resolvedOptions = (typeof options === 'object' && options !== null) ? options as Record<string, any> : {};
    let sid = sessionId as string | undefined;
    if (!sid) { sid = randomUUID(); }
    if (!sessions.has(sid)) sessions.set(sid, { probes: [], turnCount: 0, history: [] });
    const sessionLog = sessions.get(sid)!;
    if (typeof sessionLog.turnCount !== 'number') sessionLog.turnCount = 0;
    if (!Array.isArray(sessionLog.history)) sessionLog.history = [];

    if (action === 'feedback') {
      const { probeId, tag } = resolvedOptions as { probeId: string; tag: SSTTag };
      const idx = sessionLog.probes.findIndex(p => p.id === probeId);
      if (idx === -1) return NextResponse.json({ ok: false, error: 'Probe not found' }, { status: 404 });
      sessionLog.probes[idx] = commitProbe(sessionLog.probes[idx], tag);
      const scores = scoreSession(sessionLog);
      return NextResponse.json({ ok: true, sessionId: sid, scores, probe: sessionLog.probes[idx] });
    }

    if (action === 'export') {
      const scores = scoreSession(sessionLog);
      // For now, return JSON; PDF export can be added using html2pdf on client
      return NextResponse.json({
        ok: true,
        sessionId: sid,
        scores,
        log: sessionLog,
        suggestions: sessionLog.suggestions ?? [],
      });
    }

    // Default: generate (router)
    const intent = detectIntent(textInput);
    const uploadedSummary = summariseUploadedReportJson(textInput);
    if (uploadedSummary) {
      const { draft, prov, climateText } = uploadedSummary;
      return NextResponse.json({
        intent: 'report',
        ok: true,
        draft,
        prov,
        climate: climateText ?? null,
        sessionId: sid,
        probe: null,
      });
    }
    if (intent === 'geometry') {
      const parsed = parseAstroSeekBlob(String(input));
      const geo = normalizeGeometry(parsed);
      const prov = stampProvenance({ source: 'AstroSeek (manual paste)' });
      const draft = await renderShareableMirror({ geo, prov, options: resolvedOptions });
      // create a probe entry from the draft next_step or a summary line
      const probe = createProbe(draft?.next_step || 'Reflect on the mirror', randomUUID());
      sessionLog.probes.push(probe);
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
      sessionLog.probes.push(probe);
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

    const contextPrompt = formatReportContextsForPrompt(normalizedContexts);
    const historyPrompt = formatHistoryForPrompt(sessionLog.history);
    const isFirstTurn = (sessionLog.turnCount ?? 0) === 0;

    const instructionLines: string[] = [
      'Respond in natural paragraphs (2-3) using a warm, lyrical voice. Weave symbolic insight into lived, testable language.',
      'Do NOT use headers, bullet lists, numbered sections, or bracketed labels. No markdown headings.',
      isFirstTurn
        ? 'This is the first substantive turn of the session. Close with a reflective line instead of a question.'
        : 'End with exactly one reflective question that invites them to test the resonance in their lived experience.',
      'Never mention being an AI. Do not describe chain-of-thought. Stay inside the Raven Calder persona.',
    ];
    if (wantsWeatherOnly) {
      instructionLines.push('The user is asking for symbolic weather / current climate. Anchor your reflection in present-time field dynamics while staying grounded in their lived situation.');
    }

    const conversationMode = detectConversationMode(textInput, sessionLog);
    if (conversationMode === 'suggestion') {
      instructionLines.push(
        'The user is offering a product suggestion. Acknowledge it, affirm the useful part, and confirm you will carry it forward without promising implementation.',
      );
    } else if (conversationMode === 'clarification') {
      instructionLines.push(
        'The user is clarifying a previous mirror. Focus on restating the pattern plainly, integrating their language, and outlining the repair before asking the closing question.',
      );
    } else {
      instructionLines.push(
        'You are primarily explaining the pattern. Keep the voice grounded, specific, and oriented to their lived moment.',
      );
    }

    const promptSections: string[] = [
      instructionLines.join('\n'),
    ];
    if (contextPrompt) {
      promptSections.push(`SESSION CONTEXT\n${contextPrompt}\n\nUse these as background only. Prefer the user's live words. Do not restate the uploads; integrate gently where relevant.`);
    }
    if (historyPrompt) {
      promptSections.push(`Recent conversation:\n${historyPrompt}`);
    }
    promptSections.push(`User message:\n${textInput}`);
    promptSections.push(`Interaction mode: ${conversationMode}`);
    promptSections.push(`Session meta: first_turn=${isFirstTurn ? 'true' : 'false'}. When first_turn=true, invite them to notice rather than question.`);

    const prompt = promptSections.filter(Boolean).join('\n\n');

    try {
      const reply = await callPerplexity(prompt, {
        model: process.env.POETIC_BRAIN_MODEL || 'sonar-pro',
        personaHook: RAVEN_PERSONA_HOOK,
      });
      const replyText = (reply || '').trim();
      if (!replyText) {
        throw new Error('Empty response from Perplexity API');
      }

      const now = new Date().toISOString();
      sessionLog.history!.push({ role: 'user', content: textInput, createdAt: now });
      sessionLog.history!.push({ role: 'raven', content: replyText, createdAt: now });
      if (sessionLog.history!.length > MAX_HISTORY_TURNS * 2) {
        sessionLog.history = sessionLog.history!.slice(-MAX_HISTORY_TURNS * 2);
      }
      sessionLog.turnCount = (sessionLog.turnCount ?? 0) + 1;

      const prov = stampProvenance({
        source: wantsWeatherOnly ? 'Poetic Brain (Weather-only)' : 'Poetic Brain (Perplexity)',
      });

      const draft: Record<string, any> = { conversation: replyText };

      if (conversationMode === 'suggestion') {
        recordSuggestion(sessionLog, textInput);
      }

      let probe = null;
      const shouldScoreSession = !isFirstTurn && (hasReportContext || hasGeometryPayload);
      if (shouldScoreSession) {
        const probeText =
          extractProbeFromResponse(replyText) ??
          FALLBACK_PROBE_BY_MODE[conversationMode];
        probe = createProbe(probeText, randomUUID());
        sessionLog.probes.push(probe);
      }

      return NextResponse.json({ intent, ok: true, draft, prov, sessionId: sid, probe: probe ?? null });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Perplexity conversation error:', err);
      return NextResponse.json({
        ok: false,
        error: err?.message || 'The poetic muse encountered an unexpected disturbance.',
      }, { status: 500 });
    }


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
