import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { detectIntent } from '@/lib/raven/intent';
import { parseAstroSeekBlob } from '@/lib/raven/parser';
import { normalizeGeometry } from '@/lib/raven/normalize';
import { renderShareableMirror } from '@/lib/raven/render';
import { stampProvenance } from '@/lib/raven/provenance';
import { summariseUploadedReportJson } from '@/lib/raven/reportSummary';
import { generateHousesMarkdownTable, generateHousesTextLegend, getHousesQuickList } from '@/lib/raven/houses-legend';
import { generateAspectsMarkdownTable, generateAspectsTextLegend, getAspectsQuickList, getAspectDefinition } from '@/lib/raven/aspects-legend';
import { runMathBrain } from '@/lib/mathbrain/adapter';
import { generateStream } from '@/lib/llm';
import { verifyToken } from '@/lib/auth/jwt';
import { checkAllowlist } from '@/lib/auth/allowlist';
import { processMirrorDirective } from '@/poetic-brain/src/index';
import { sanitizeDirectiveForMode } from '@/lib/raven/sanitizeDirectiveForMode';
import {
  createProbe,
  commitProbe,
  scoreSession,
  getSSTSource,
  type SessionSSTLog,
  type SSTTag,
  type SessionTurn,
  type SessionSuggestion,
  type SSTProbe,
  type ConversationMode,
} from '@/lib/raven/sst';
import {
  detectQuerentIdentity,
  generateContextGateQuestion,
  getVoiceAdaptationInstructions,
  needsContextGate,
  createContextGateState,
  confirmQuerentIdentity,
  detectSubjectConflict,
  initializeContextGateFromMetadata,
  type QuerentRole,
  type ContextGateState,
} from '@/lib/raven/context-gate';
import {
  buildRavenSystemPrompt,
  RAVEN_PERSONA_HOOK_COMPACT,
} from '@/lib/raven/protocol';
import {
  ASTROSEEK_REFERENCE_GUIDANCE,
  referencesAstroSeekWithoutGeometry,
  pickHook,
  buildAstroSeekGuardDraft,
  createGuardPayload,
} from '@/lib/raven/guards';
import { buildNoContextGuardCopy } from '@/lib/guard/no-context';
import { RAVEN_PROMPT_ARCHITECTURE } from '@/lib/raven/prompt-architecture';
import { requestsPersonalReading } from '@/lib/raven/personal-reading';
import { isGeometryValidated, OPERATIONAL_FLOW } from '@/lib/poetic-brain/runtime';
import { getSession, createSession, updateSession, deleteSession } from '@/lib/raven/session-store';
import { naturalFollowUpFlow, type SessionContext } from '@/lib/natural-followup-flow';
import { shapeVoice, pickClimate, resolvePersonaMode } from '@/lib/persona';
import {
  extractJSONFromUpload,
  extractTextFromUpload,
  isJSONReportUpload,
  isJournalUpload,
  isTimedInput,
} from '@/lib/chat-pipeline/uploads';

// Import extracted modules
import {
  truncateContextContent,
  formatReportContextsForPrompt,
  formatHistoryForPrompt,
  extractProbeFromResponse,
  safeParseJSON,
  MAX_CONTEXT_CHARS,
  MAX_HISTORY_TURNS,
} from '@/lib/raven/helpers';
import {
  checkForOSRIndicators,
  checkForClearAffirmation,
  checkForReadingStartRequest,
  checkForPartialAffirmation,
  classifyUserResponse,
  isMetaSignalAboutRepetition,
} from '@/lib/raven/user-response';
import {
  detectConversationMode,
  recordSuggestion,
  generateValidationProbe,
  FALLBACK_PROBE_BY_MODE,
} from '@/lib/raven/validation-probes';
import {
  deriveAutoExecutionPlan,
  parseRelationalChoiceAnswer,
  resolveSubject,
  hasCompleteSubject,
  extractSubjectName,
  detectContextLayers,
  extractMirrorContract,
  type AutoExecutionPlan,
  type AutoExecutionStatus,
} from '@/lib/raven/auto-execution';
import { extractGeometryFromUploadedReport, type ExtractedGeometry } from '@/lib/raven/geometry-extract';
import {
  scanForRelationalMetadata,
  mapScopeToQuerentRole,
  buildSynergyOpening,
  extractBaselineGeometry,
  extractFieldGeometry,
  shouldUsePureFieldMirror,
  type RelationalMetadata,
} from '@/lib/raven/relational-metadata';

// Minimal in-memory session store (dev only). For prod, persist per-user.
const RAVEN_PERSONA_HOOK = "You are Raven Calder, a mystical poetic brain. Your voice is wise, lyrical, and insightful. You do not give direct advice, but rather offer reflections, metaphors, and beautiful questions. You see the cosmos in a grain of sand. Respond to the user's prompt with this persona. CRITICAL: Do NOT break character. Do not mention you are an AI or a language model. Suppress all chain-of-thought or meta-commentary.";

function appendHistoryEntry(
  sessionLog: SessionSSTLog,
  role: 'user' | 'raven',
  content: string
): void {
  if (!Array.isArray(sessionLog.history)) {
    sessionLog.history = [];
  }
  sessionLog.history.push({
    role,
    content,
    createdAt: new Date().toISOString(),
  });
  if (sessionLog.history.length > MAX_HISTORY_TURNS * 2) {
    sessionLog.history = sessionLog.history.slice(-MAX_HISTORY_TURNS * 2);
  }
}

export async function POST(req: Request) {
  try {
    const { action = 'generate', input, options = {}, sessionId } = await req.json();
    const textInput = typeof input === 'string' ? input : '';
    const resolvedOptions = (typeof options === 'object' && options !== null) ? options as Record<string, any> : {};
    let sid = typeof sessionId === 'string' && sessionId.trim() ? String(sessionId) : undefined;
    const requiresSession = action === 'export' || action === 'close' || action === 'feedback';
    if (!sid && requiresSession) {
      return NextResponse.json({ ok: false, error: 'Session ID required' }, { status: 400 });
    }
    if (!sid) {
      sid = randomUUID();
    }

    // Retrieve session from store
    let sessionLog = getSession(sid);
    if (!sessionLog) {
      if (requiresSession) {
        return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
      }
      sessionLog = { probes: [], turnCount: 0, history: [] };
      createSession(sid, sessionLog);
    }

    // Session state normalization
    if (typeof sessionLog.turnCount !== 'number') sessionLog.turnCount = 0;
    if (!Array.isArray(sessionLog.history)) sessionLog.history = [];
    if (!sessionLog.relationalModes || typeof sessionLog.relationalModes !== 'object') {
      sessionLog.relationalModes = {};
    }

    if (action === 'feedback') {
      const { probeId, tag } = resolvedOptions as { probeId: string; tag: SSTTag };
      const idx = sessionLog.probes.findIndex((p: SSTProbe) => p.id === probeId);
      if (idx === -1) return NextResponse.json({ ok: false, error: 'Probe not found' }, { status: 404 });
      // Use SST source based on querent role (observer confirmations are secondary data)
      const source = getSSTSource(sessionLog.contextGate?.querentRole);
      sessionLog.probes[idx] = commitProbe(sessionLog.probes[idx], tag, source);
      const scores = scoreSession(sessionLog);
      updateSession(sid, () => { }); // Persist change
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

    if (action === 'close') {
      deleteSession(sid);
      return NextResponse.json({ ok: true, sessionId: sid });
    }

    // Allow relational mode answers to short-circuit before intent detection
    const pendingChoice = sessionLog.pendingRelationalChoice as { contextId: string } | undefined;
    if (pendingChoice) {
      const decision = parseRelationalChoiceAnswer(textInput);
      if (!decision) {
        const reminder =
          'I have both charts live. Just let me know—relational (together) or parallel (separate diagnostics)?';
        appendHistoryEntry(sessionLog, 'user', textInput);
        appendHistoryEntry(sessionLog, 'raven', reminder);
        sessionLog.turnCount = (sessionLog.turnCount ?? 0) + 1;
        updateSession(sid, () => { }); // Persist
        const prov = stampProvenance({ source: 'Poetic Brain (Auto-Execution Prompt)' });
        return NextResponse.json({
          intent: 'conversation',
          ok: true,
          draft: { conversation: reminder },
          prov,
          sessionId: sid,
          probe: null,
        });
      }
      sessionLog.pendingRelationalChoice = undefined;
      if (!sessionLog.relationalModes || typeof sessionLog.relationalModes !== 'object') {
        sessionLog.relationalModes = {};
      }
      sessionLog.relationalModes[pendingChoice.contextId] = decision;
      updateSession(sid, () => { }); // Persist
    }

    // ==========================================================================
    // CONTEXT GATE: Check if we need to identify the querent before proceeding
    // ==========================================================================
    // Check if user is responding to a context gate question; once confirmed, continue to auto-exec flows
    if (sessionLog.contextGate && sessionLog.contextGate.querentRole === 'unconfirmed' && textInput.trim()) {
      const identity = detectQuerentIdentity(textInput, sessionLog.contextGate.sessionSubjects);
      if (identity) {
        sessionLog.contextGate = confirmQuerentIdentity(
          sessionLog.contextGate,
          identity.role,
          textInput.trim()
        );
        updateSession(sid, () => { });
        // Do NOT return a conversational prompt here; fall through to auto-execution below
      } else {
        // Identity detection failed - provide helpful guidance
        const subjects = sessionLog.contextGate.sessionSubjects;
        let helpMessage: string;
        if (subjects.length === 2) {
          helpMessage = `I didn't quite catch that. To help me tailor the reading correctly, could you let me know: are you ${subjects[0]}, ${subjects[1]}, or both of you together? (You can also say "observer" if you're asking about someone else's chart.)`;
        } else if (subjects.length === 1) {
          helpMessage = `I didn't quite catch that. Are you ${subjects[0]}, or are you asking about their chart as a third party?`;
        } else {
          helpMessage = `I didn't quite catch that. Could you tell me who I'm speaking with?`;
        }
        
        appendHistoryEntry(sessionLog, 'raven', helpMessage);
        updateSession(sid, () => { });
        
        const prov = stampProvenance({ source: 'Getting Started' });
        return NextResponse.json({
          intent: 'conversation',
          ok: true,
          draft: { conversation: helpMessage },
          prov,
          sessionId: sid,
          probe: null,
          hook: 'Getting Started',
          contextGate: sessionLog.contextGate,
        });
      }
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
      const geometryValidated = isGeometryValidated(geo);
      const optionsWithValidation = {
        ...resolvedOptions,
        geometryValidated,
        operationalFlow: OPERATIONAL_FLOW,
        operational_flow: OPERATIONAL_FLOW,
      };
      const draft = await renderShareableMirror({ geo, prov, options: optionsWithValidation });
      // create a probe entry from the draft next_step or a summary line
      const probe = createProbe(draft?.next_step || 'Reflect on the mirror', randomUUID());
      sessionLog.probes.push(probe);
      updateSession(sid, () => { }); // Persist
      return NextResponse.json({ intent, ok: true, draft, prov, sessionId: sid, probe });
    }

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

    // Handle Mirror Directive JSON (formerly handled by chat/route.ts)
    if (normalizedContexts.length > 0) {
      const mirrorContext = normalizedContexts.find(rc => {
        try {
          const content = typeof rc.content === 'string' ? JSON.parse(rc.content) : rc.content;
          return content._format === 'mirror_directive_json' || content._format === 'mirror-symbolic-weather-v1';
        } catch {
          return false;
        }
      });

          if (mirrorContext) {
        try {
          const content = typeof mirrorContext.content === 'string' ? JSON.parse(mirrorContext.content) : mirrorContext.content;
              // If caller explicitly requested Solo mode, sanitize the directive to remove person_b
              const sanitized = sanitizeDirectiveForMode(content, resolvedOptions);
              const usedContent = sanitized.content;
              const result = processMirrorDirective(usedContent);

          if (result.success && result.narrative_sections) {
            let narrative = '';
            if (result.narrative_sections.solo_mirror_a) narrative += result.narrative_sections.solo_mirror_a + '\n\n';
            // CRITICAL FIX: Include Person B's solo mirror for relational reports
            // Without this, Person B's patterns were only shown in relational_engine context,
            // causing Person B's behaviors to appear fused onto Person A's reading
            if (result.narrative_sections.solo_mirror_b) narrative += result.narrative_sections.solo_mirror_b + '\n\n';
            if (result.narrative_sections.relational_engine) narrative += result.narrative_sections.relational_engine + '\n\n';
            if (result.narrative_sections.weather_overlay) narrative += result.narrative_sections.weather_overlay;

            // Check for probes (similar logic to chat/route.ts)
            let probeData: SSTProbe | { question: string; type: string; options: string[] } | null = null;
            const isFirstTurn = (sessionLog.turnCount ?? 0) <= 1;
            const isOSRResponse = checkForOSRIndicators(textInput);
            const isMetaIrritation = isMetaSignalAboutRepetition(textInput);
            const shouldAddProbe = !isFirstTurn && !isOSRResponse && !isMetaIrritation;

            if (narrative.trim()) {
              if (shouldAddProbe) {
                probeData = generateValidationProbe(narrative, content);
                if (probeData?.question) {
                  narrative += '\n\n' + probeData.question;
                }
              }

              // Update session logs
              appendHistoryEntry(sessionLog, 'user', textInput || "Reading request");
              appendHistoryEntry(sessionLog, 'raven', narrative);
              updateSession(sid, () => { });

              // Streaming logic
              const encoder = new TextEncoder();
              const responseStream = new ReadableStream({
                async start(controller) {
                  const send = (data: object) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                  };

                  // Initial metadata frame
                  send({
                    climate: "VOICE · Report Interpretation",
                    hook: "Auto · Mirror Reading",
                    sessionId: sid,
                    ok: true,
                    // Send probe data for UI
                    ...(probeData && {
                      probe: probeData,
                      validationMode: 'resonance'
                    })
                  });

                  send({ delta: narrative });
                  controller.close();
                }
              });

              return new Response(responseStream, {
                headers: {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  'Connection': 'keep-alive'
                }
              });
            }
          }
        } catch (e) {
          console.error("Mirror Directive processing failed", e);
        }
      }
    }

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

    let wantsWeatherOnly =
      resolvedOptions.weatherOnly === true ||
      (typeof resolvedOptions.mode === 'string' && /weather/i.test(resolvedOptions.mode)) ||
      /\b(weather|sky today|planetary (weather|currents)|what's happening in the sky)\b/i.test(textInput);

    const wantsPersonalReading = requestsPersonalReading(textInput);
    const mentionsAstroSeek = referencesAstroSeekWithoutGeometry(textInput);

    // Allow "begin" or "start" to re-trigger auto-execution if contexts exist
    const requestsAutoStart = /^\s*(begin|start|please\s+(begin|start)|go\s+ahead|let'?s\s+start)\s*$/i.test(textInput);
    const effectiveInput = requestsAutoStart ? '' : textInput;

    const autoPlan = deriveAutoExecutionPlan(normalizedContexts, sessionLog);
    
    // ==========================================================================
    // CONTEXT GATE: Initialize with subject names if we have them
    // ==========================================================================
    if (!sessionLog.contextGate && (autoPlan.personAName || autoPlan.personBName)) {
      const subjects: string[] = [];
      if (autoPlan.personAName) subjects.push(autoPlan.personAName);
      if (autoPlan.personBName) subjects.push(autoPlan.personBName);
      sessionLog.contextGate = createContextGateState(subjects);
      updateSession(sid, () => { });
    }
    
    // Check for subject conflicts on new uploads
    if (sessionLog.contextGate && autoPlan.personAName) {
      const newSubjects: string[] = [];
      if (autoPlan.personAName) newSubjects.push(autoPlan.personAName);
      if (autoPlan.personBName) newSubjects.push(autoPlan.personBName);
      
      const conflict = detectSubjectConflict(sessionLog.contextGate.sessionSubjects, newSubjects);
      if (conflict.hasConflict && conflict.message) {
        // Update context gate with new subjects but mark as needing re-confirmation
        sessionLog.contextGate = {
          ...sessionLog.contextGate,
          sessionSubjects: newSubjects,
          querentRole: 'unconfirmed', // Force re-confirmation
          confirmedAt: undefined,
        };
        
        appendHistoryEntry(sessionLog, 'raven', conflict.message);
        updateSession(sid, () => { });
        
        const prov = stampProvenance({ source: 'Context Gate (Subject Conflict)' });
        return NextResponse.json({
          intent: 'conversation',
          ok: true,
          draft: { conversation: conflict.message },
          prov,
          sessionId: sid,
          probe: null,
          contextGate: sessionLog.contextGate,
        });
      }
    }
    
    // If context gate is unconfirmed and this is the first turn with context, ask who's speaking
    const isFirstTurnWithContext = (sessionLog.turnCount ?? 0) === 0 && normalizedContexts.length > 0;
    if (isFirstTurnWithContext && sessionLog.contextGate && needsContextGate(sessionLog.contextGate)) {
      const gateQuestion = generateContextGateQuestion(sessionLog.contextGate.sessionSubjects);
      
      appendHistoryEntry(sessionLog, 'raven', gateQuestion);
      sessionLog.turnCount = 1;
      updateSession(sid, () => { });
      
      // Use 'Getting Started' instead of 'Context Gate' for a cleaner user experience
      // This is just a clarifying question, not a technical checkpoint
      const prov = stampProvenance({ source: 'Getting Started' });
      return NextResponse.json({
        intent: 'conversation',
        ok: true,
        draft: { conversation: gateQuestion },
        prov,
        sessionId: sid,
        probe: null,
        hook: 'Getting Started',  // Clean hook for display
        contextGate: sessionLog.contextGate,
      });
    }
    
    if (autoPlan.status === 'osr') {
      const contextName = autoPlan.contextName ? `“${autoPlan.contextName}”` : 'that upload';
      const reason =
        autoPlan.reason === 'invalid_json'
          ? 'it looks corrupted or incomplete'
          : 'the core chart data is missing';
      const message = `I tried to open ${contextName}, but ${reason}.`;

      appendHistoryEntry(sessionLog, 'raven', message);
      updateSession(sid, () => { });

      return NextResponse.json({
        ok: true,
        message,
        guard: true,
        guidance: 'osr_detected',
        details: {
          reason: autoPlan.reason,
          contextId: autoPlan.contextId,
          contextName: autoPlan.contextName,
        },
        probe: null,
      });
    }

    // Auto-execution branches
    if (autoPlan.status === 'relational_auto') {
      wantsWeatherOnly = false;
      const relationalResponse = await runMathBrain({
        ...resolvedOptions,
        reportType: 'relational',
        autoMode: 'relational_auto',
        include_balance_tooltips: true,
      });
      if (!relationalResponse.success) {
        if (!sessionLog.failedContexts) sessionLog.failedContexts = new Set();
        if (autoPlan.contextId) {
          sessionLog.failedContexts.add(autoPlan.contextId);
        }

        const contextName = autoPlan.contextName ? `“${autoPlan.contextName}”` : 'this report';
        const message = `I tried to regenerate a fresh relational Math Brain pass from ${contextName}, but the engine didn’t respond cleanly. Your uploaded report is still attached here—I can work directly with it. What would you like to explore first?`;
        appendHistoryEntry(sessionLog, 'raven', message);
        updateSession(sid, () => { });
        const prov = stampProvenance({ source: 'Poetic Brain (Auto-Execution Fallback)' });
        return NextResponse.json({
          intent: 'conversation',
          ok: true,
          draft: { conversation: message },
          prov,
          sessionId: sid,
          probe: null,
        });
      }
      const relationalProv = stampProvenance(relationalResponse.provenance);
      const relationalOptions = {
        ...resolvedOptions,
        geometryValidated: isGeometryValidated(relationalResponse.geometry),
        operationalFlow: OPERATIONAL_FLOW,
        operational_flow: OPERATIONAL_FLOW,
      };
      const relationalDraft = await renderShareableMirror({
        geo: relationalResponse.geometry,
        prov: relationalProv,
        options: relationalOptions,
        mode: 'relational-mirror',
      });
      const relationalProbe = createProbe(relationalDraft?.next_step || 'Notice how the mirror moves between you two', randomUUID());
      sessionLog.probes.push(relationalProbe);
      updateSession(sid, () => { });
      return NextResponse.json({ intent, ok: true, draft: relationalDraft, prov: relationalProv, climate: relationalResponse.climate ?? null, balanceTooltips: relationalResponse.balanceTooltips ?? null, sessionId: sid, probe: relationalProbe });
    }

    if (autoPlan.status === 'parallel_auto') {
      wantsWeatherOnly = false;
      const parallelResponse = await runMathBrain({
        ...resolvedOptions,
        reportType: 'parallel',
        autoMode: 'parallel_auto',
        include_balance_tooltips: true,
      });
      if (!parallelResponse.success) {
        if (!sessionLog.failedContexts) sessionLog.failedContexts = new Set();
        if (autoPlan.contextId) {
          sessionLog.failedContexts.add(autoPlan.contextId);
        }

        const contextName = autoPlan.contextName ? `“${autoPlan.contextName}”` : 'this report';
        const message = `I tried to regenerate parallel mirrors from ${contextName}, but the Math Brain engine stalled. The report itself is still live here—tell me whose side you want to start with or what pattern you’d like to test.`;
        appendHistoryEntry(sessionLog, 'raven', message);
        updateSession(sid, () => { });
        const prov = stampProvenance({ source: 'Poetic Brain (Auto-Execution Fallback)' });
        return NextResponse.json({
          intent: 'conversation',
          ok: true,
          draft: { conversation: message },
          prov,
          sessionId: sid,
          probe: null,
        });
      }
      const parallelProv = stampProvenance(parallelResponse.provenance);
      const parallelOptions = {
        ...resolvedOptions,
        geometryValidated: isGeometryValidated(parallelResponse.geometry),
        operationalFlow: OPERATIONAL_FLOW,
        operational_flow: OPERATIONAL_FLOW,
      };
      const parallelDraft = await renderShareableMirror({
        geo: parallelResponse.geometry,
        prov: parallelProv,
        options: parallelOptions,
        mode: 'relational-balance', // Best fit for parallel/synastry if parallel-mirror not available
      });
      const parallelProbe = createProbe(parallelDraft?.next_step || 'Check where the lines cross', randomUUID());
      sessionLog.probes.push(parallelProbe);
      updateSession(sid, () => { });
      return NextResponse.json({ intent, ok: true, draft: parallelDraft, prov: parallelProv, climate: parallelResponse.climate ?? null, balanceTooltips: parallelResponse.balanceTooltips ?? null, sessionId: sid, probe: parallelProbe });
    }

    if (autoPlan.status === 'contextual_auto') {
      wantsWeatherOnly = false;
      const contextualResponse = await runMathBrain({
        ...resolvedOptions,
        reportType: resolvedOptions.reportType ?? 'mirror',
        autoMode: 'contextual_auto',
        include_balance_tooltips: true,
      });
      if (!contextualResponse.success) {
        if (!sessionLog.failedContexts) sessionLog.failedContexts = new Set();
        if (autoPlan.contextId) {
          sessionLog.failedContexts.add(autoPlan.contextId);
        }

        const contextName = autoPlan.contextName ? `“${autoPlan.contextName}”` : 'this report';
        const message = `I tried to weave in the extra context around ${contextName}, but the Math Brain engine didn’t complete a fresh run. The uploaded report is still present—describe the context you care about, and I’ll mirror it directly.`;
        appendHistoryEntry(sessionLog, 'raven', message);
        updateSession(sid, () => { });
        const prov = stampProvenance({ source: 'Poetic Brain (Auto-Execution Fallback)' });
        return NextResponse.json({
          intent: 'conversation',
          ok: true,
          draft: { conversation: message },
          prov,
          sessionId: sid,
          probe: null,
        });
      }

      const contextualProv = stampProvenance(contextualResponse.provenance);
      const contextualOptions = {
        ...resolvedOptions,
        geometryValidated: isGeometryValidated(contextualResponse.geometry),
        operationalFlow: OPERATIONAL_FLOW,
        operational_flow: OPERATIONAL_FLOW,
      };
      const contextualDraft = await renderShareableMirror({
        geo: contextualResponse.geometry,
        prov: contextualProv,
        options: contextualOptions,
        mode: 'natal-only', // Fallback to natal-only as contextual-mirror is not a valid schema mode
      });
      const contextualProbe = createProbe(
        contextualDraft?.next_step || 'Let me know how that contextual mirror lands for you',
        randomUUID(),
      );
      sessionLog.probes.push(contextualProbe);
      updateSession(sid, () => { });
      return NextResponse.json({
        intent,
        ok: true,
        draft: contextualDraft,
        prov: contextualProv,
        climate: contextualResponse.climate ?? null,
        balanceTooltips: contextualResponse.balanceTooltips ?? null,
        sessionId: sid,
        probe: contextualProbe,
      });
    }

    if (autoPlan.status === 'solo_auto') {
      wantsWeatherOnly = false;

      const extractedGeo = extractGeometryFromUploadedReport(normalizedContexts);

      if (extractedGeo) {
        // NEW: Extract relational metadata and initialize context gate
        const metadata = extractedGeo.metadata;
        if (metadata && !sessionLog.contextGate?.querentRole) {
          sessionLog.contextGate = initializeContextGateFromMetadata(metadata, sessionLog.contextGate);
        }

        // NEW: Use multi-layer approach (baseline + field)
        let renderGeo = extractedGeo.full;
        let synergyContext = '';

        if (!extractedGeo.shouldUsePureField && extractedGeo.baseline) {
          // We have a baseline - render baseline first, then layer current field
          renderGeo = extractedGeo.baseline;
          synergyContext = buildSynergyOpening(metadata, extractedGeo.field ? 'current Symbolic Weather' : undefined);
        }

        const soloProv = stampProvenance({ 
          source: 'Math Brain (Uploaded Report)',
          baseline_type: metadata.baselineType,
          relational_scope: metadata.scope,
          timestamp: new Date().toISOString() 
        });
        const soloOptions = {
          ...resolvedOptions,
          geometryValidated: isGeometryValidated(renderGeo),
          operationalFlow: OPERATIONAL_FLOW,
          operational_flow: OPERATIONAL_FLOW,
        };
        const soloDraft = await renderShareableMirror({
          geo: renderGeo,
          prov: soloProv,
          options: soloOptions,
          mode: 'natal-only',
        });

        // NEW: Prepend synergy context to draft
        if (synergyContext && soloDraft?.conversation) {
          soloDraft.conversation = `${synergyContext}\n\n${soloDraft.conversation}`;
        }

        const soloProbe = createProbe(soloDraft?.next_step || 'Notice where this pattern lands in your body', randomUUID());
        sessionLog.probes.push(soloProbe);
        updateSession(sid, () => { });
        return NextResponse.json({ intent, ok: true, draft: soloDraft, prov: soloProv, climate: null, sessionId: sid, probe: soloProbe });
      }

      const soloResponse = await runMathBrain({
        ...resolvedOptions,
        reportType: 'mirror',
        autoMode: 'solo_auto',
        include_balance_tooltips: true,
      });
      if (!soloResponse.success) {
        const contextName = autoPlan.contextName ? `"${autoPlan.contextName}"` : 'this report';
        const message = `I tried to auto-run a fresh solo mirror from ${contextName}, but the Math Brain engine didn't return a clean result. The report you uploaded is still in view—I can read directly from it. What would you like the first mirror to focus on?`;
        appendHistoryEntry(sessionLog, 'raven', message);
        updateSession(sid, () => { });
        const prov = stampProvenance({ source: 'Poetic Brain (Auto-Execution Fallback)' });
        return NextResponse.json({
          intent: 'conversation',
          ok: true,
          draft: { conversation: message },
          prov,
          sessionId: sid,
          probe: null,
        });
      }
      const soloProv = stampProvenance(soloResponse.provenance);
      const soloOptions = {
        ...resolvedOptions,
        geometryValidated: isGeometryValidated(soloResponse.geometry),
        operationalFlow: OPERATIONAL_FLOW,
        operational_flow: OPERATIONAL_FLOW,
      };
      const soloDraft = await renderShareableMirror({
        geo: soloResponse.geometry,
        prov: soloProv,
        options: soloOptions,
        mode: 'natal-only',
      });
      const soloProbe = createProbe(soloDraft?.next_step || 'Notice where this pattern lands in your body', randomUUID());
      sessionLog.probes.push(soloProbe);
      updateSession(sid, () => { });
      return NextResponse.json({ intent, ok: true, draft: soloDraft, prov: soloProv, climate: soloResponse.climate ?? null, balanceTooltips: soloResponse.balanceTooltips ?? null, sessionId: sid, probe: soloProbe });
    }

    if (autoPlan.status === 'relational_choice') {
      sessionLog.pendingRelationalChoice = { contextId: autoPlan.contextId! };
      const question =
        `Two full charts are on the table. Do you want the reading together (relational) or separate diagnostics (parallel)?`;
      appendHistoryEntry(sessionLog, 'user', textInput);
      appendHistoryEntry(sessionLog, 'raven', question);
      sessionLog.turnCount = (sessionLog.turnCount ?? 0) + 1;
      updateSession(sid, () => { });
      const prov = stampProvenance({ source: 'Poetic Brain (Auto-Execution Prompt)' });
      return NextResponse.json({
        intent: 'conversation',
        ok: true,
        draft: { conversation: question },
        prov,
        sessionId: sid,
        probe: null,
      });
    }

    if (intent === 'report') {
      if (!hasReportContext && !hasGeometryPayload) {
        if (mentionsAstroSeek) {
          const guardPayload = createGuardPayload(
            'Conversational Guard (AstroSeek)',
            ASTROSEEK_REFERENCE_GUIDANCE,
            buildAstroSeekGuardDraft()
          );
          return NextResponse.json({ intent, ok: true, sessionId: sid, ...guardPayload });
        }
        const guardCopy = buildNoContextGuardCopy();
        const guardDraft = {
          picture: guardCopy.picture,
          feeling: guardCopy.feeling,
          container: guardCopy.container,
          option: guardCopy.option,
          next_step: guardCopy.next_step
        };
        const guardPayload = createGuardPayload('Conversational Guard', guardCopy.guidance, guardDraft);
        return NextResponse.json({ intent, ok: true, sessionId: sid, ...guardPayload });
      }
      // Map options.reportType → Math Brain payload
      const mb = await runMathBrain({ ...resolvedOptions, include_balance_tooltips: true });
      if (!mb.success) {
        return NextResponse.json({ intent, ok: false, error: 'Math Brain failed', details: mb });
      }
      const prov = stampProvenance(mb.provenance);
      const reportOptions = {
        ...resolvedOptions,
        geometryValidated: isGeometryValidated(mb.geometry),
        operationalFlow: OPERATIONAL_FLOW,
        operational_flow: OPERATIONAL_FLOW,
      };
      const inferredMode = (resolvedOptions.mode as any) ||
        (resolvedOptions.reportType === 'relational' || resolvedOptions.reportType === 'synastry' ? 'relational-mirror' :
          resolvedOptions.reportType === 'parallel' ? 'relational-balance' :
            'natal-only');

      const draft = await renderShareableMirror({
        geo: mb.geometry,
        prov,
        options: reportOptions,
        mode: inferredMode,
      });
      const probe = createProbe(draft?.next_step || 'Note one actionable step', randomUUID());
      sessionLog.probes.push(probe);
      updateSession(sid, () => { });
      return NextResponse.json({ intent, ok: true, draft, prov, climate: mb.climate ?? null, balanceTooltips: mb.balanceTooltips ?? null, sessionId: sid, probe });
    }

    // conversation
    if (!hasReportContext && !hasGeometryPayload && !wantsWeatherOnly && (wantsPersonalReading || mentionsAstroSeek)) {
      if (mentionsAstroSeek) {
        const guardPayload = createGuardPayload(
          'Conversational Guard (AstroSeek)',
          ASTROSEEK_REFERENCE_GUIDANCE,
          buildAstroSeekGuardDraft()
        );
        return NextResponse.json({ intent, ok: true, sessionId: sid, ...guardPayload });
      }
      if (wantsPersonalReading) {
        const guardCopy = buildNoContextGuardCopy();
        const guardDraft = {
          picture: guardCopy.picture,
          feeling: guardCopy.feeling,
          container: guardCopy.container,
          option: guardCopy.option,
          next_step: guardCopy.next_step
        };
        const guardPayload = createGuardPayload('Conversational Guard', guardCopy.guidance, guardDraft);
        return NextResponse.json({ intent, ok: true, sessionId: sid, ...guardPayload });
      }
    }

    const contextPrompt = formatReportContextsForPrompt(normalizedContexts);
    const historyPrompt = formatHistoryForPrompt(sessionLog.history);
    const isFirstTurn = (sessionLog.turnCount ?? 0) === 0;

    const conversationMode = detectConversationMode(effectiveInput, sessionLog);
    const previousMode = sessionLog.metaConversationMode;
    if (previousMode !== conversationMode) {
      console.info('[Raven] conversation_mode', { session: sid, from: previousMode ?? 'unset', to: conversationMode });
    }
    sessionLog.metaConversationMode = conversationMode;

    // INTELLIGENT PROMPT CONSTRUCTION (Ported from chat/route.ts)
    // ----------------------------------------------------------------------
    let instructionLines: string[] = [];

    // Default instruction lines
    const baseInstructionLines = [
      'STRUCTURE REQUIREMENT: Compose exactly three paragraphs labeled in-line as "FIELD LAYER:", "MAP LAYER:", and "VOICE LAYER:". Keep labels uppercase, followed by a colon, no markdown headings.',
      'FIELD LAYER must open with numeric coordinates — Magnitude, Directional Bias, and Coherence/Volatility — each with value and descriptive label before the sensory description. Name the polarity that is in tension.',
      'MAP LAYER links those observations to specific symbolic geometry (hooks, engines, or contracts). Reference the driving pattern and explain what it implies without giving directives.',
      'VOICE LAYER states a conditional inference, names the resonance classification (WB / ABE / OSR with weight), and ends with one falsifiable question.',
      'Respond in natural paragraphs (2-3) using a warm, lyrical voice. Weave symbolic insight into lived, testable language.',
      'Do NOT use markdown headings, bullet lists, or numbered sections beyond the required labels.',
      'Never mention being an AI. Do not describe chain-of-thought. Stay inside the Raven Calder persona.',
    ];

    if (autoPlan.instructions?.length) {
      instructionLines = [...autoPlan.instructions, ...baseInstructionLines];
    } else {
      // Natural Follow-Up Logic (from chat/route.ts)
      const skipOSRCheck = isFirstTurn && !checkForOSRIndicators(effectiveInput);
      const responseType = skipOSRCheck ? 'CLEAR_WB' : classifyUserResponse(effectiveInput);

      const mockSessionContext: SessionContext = {
        wbHits: [], abeHits: [], osrMisses: [], actorWeighting: 0, roleWeighting: 0, driftIndex: 0, sessionActive: true
      };

      if (responseType === 'CLEAR_WB') {
        const followUp = naturalFollowUpFlow.generateFollowUp({ type: 'AFFIRM', content: effectiveInput, originalMirror: effectiveInput }, mockSessionContext);
        instructionLines.push(
          `User confirmed resonance (WB). Acknowledge clearly: "Logged as WB: that resonance confirmed." Then pivot to depth exploration: "${followUp.question}"`
        );
      } else if (responseType === 'PARTIAL_ABE') {
        instructionLines.push(
          `User gave partial confirmation (ABE). Acknowledge: "Logging as ABE—partially resonant but needs fine-tuning." Ask for clarification: "What part lands, and what feels off?"`
        );
      } else if (responseType === 'OSR') {
        const followUp = naturalFollowUpFlow.generateFollowUp({ type: 'OSR', content: effectiveInput, originalMirror: effectiveInput }, mockSessionContext);
        instructionLines.push(
          `User indicated miss (OSR). Acknowledge and probe: "${followUp.question}"`
        );
      } else if (effectiveInput.toLowerCase().includes('poetic card')) {
        instructionLines.push(
          `User requests a poetic card. Generate a visual card summary of resonance patterns (WB/ABE/OSR scores) and composite guess. No new poems.`
        );
      } else if (effectiveInput.toLowerCase().includes('done') || effectiveInput.toLowerCase().includes('finished')) {
        const closure = naturalFollowUpFlow.generateSessionClosure();
        instructionLines.push(
          `User ending session. Respond with: "${closure.resetPrompt}". Offer continuation options.`
        );
      } else {
        // Fallback or Probe Response logic
        // We incorporate the base instructions but refine the closing
        instructionLines = [...baseInstructionLines];
      }
    }

    if (wantsWeatherOnly) {
      instructionLines.push('The user is asking for symbolic weather / current climate. Anchor your reflection in present-time field dynamics while staying grounded in their lived situation.');
    }

    if (conversationMode === 'meta_feedback') {
      instructionLines.push(
        'The user is giving meta feedback about the system or session behavior. Respond in plain, direct language.',
        'Acknowledge the issue, state what you can adjust, and invite actionable detail only if needed.',
        'Do NOT use symbolic metaphors, archetypal imagery, or resonance questions. Keep it diagnostic and pragmatic.',
      );
    } else if (conversationMode === 'suggestion') {
      instructionLines.push(
        'The user is offering a product suggestion. Acknowledge it, affirm the useful part, and confirm you will carry it forward without promising implementation.',
      );
    } else if (conversationMode === 'clarification') {
      instructionLines.push(
        'The user is clarifying a previous mirror. Focus on restating the pattern plainly, integrating their language, and outlining the repair before asking the closing question.',
      );
    }

    // Force question logic from auto-plan or general flow
    const closingInstruction =
      conversationMode === 'meta_feedback'
        ? 'Do not ask a resonance question. Close by confirming the adjustment you will make or by asking for one concrete detail if required for a fix.'
        : autoPlan.forceQuestion
          ? 'End with exactly one resonance question that invites them to test the mirror in their lived experience.'
          : isFirstTurn
            ? 'This is the first substantive turn of the session. Close with a reflective line instead of a question.'
            : 'End with exactly one reflective question that invites them to test the resonance in their lived experience.';
    instructionLines.push(closingInstruction);

    const promptSections: string[] = [
      RAVEN_PROMPT_ARCHITECTURE,
      instructionLines.join('\n'),
    ];
    if (contextPrompt) {
      promptSections.push(`SESSION CONTEXT\n${contextPrompt}\n\nUse these as background only. Prefer the user's live words. Do not restate the uploads; integrate gently where relevant.`);
    }
    if (historyPrompt) {
      promptSections.push(`Recent conversation:\n${historyPrompt}`);
    }
    promptSections.push(`User message:\n${effectiveInput || textInput}`);
    promptSections.push(`Interaction mode: ${conversationMode}`);
    promptSections.push(
      autoPlan.forceQuestion
        ? `Session meta: first_turn=${isFirstTurn ? 'true' : 'false'}. Auto-execution is active—close with a resonance question even on the first turn.`
        : `Session meta: first_turn=${isFirstTurn ? 'true' : 'false'}. When first_turn=true, invite them to notice rather than question.`
    );

    const prompt = promptSections.filter(Boolean).join('\n\n');

    // STREAMING IMPLEMENTATION
    const prov = stampProvenance({
      source: wantsWeatherOnly ? 'Poetic Brain (Weather-only)' : 'Poetic Brain (Perplexity)',
    });

    if (conversationMode === 'suggestion') {
      recordSuggestion(sessionLog, textInput);
    }

    let probe = null;
    const shouldScoreSession =
      !isFirstTurn &&
      (hasReportContext || hasGeometryPayload) &&
      conversationMode !== 'meta_feedback';

    if (sessionLog.validationActive !== shouldScoreSession) {
      console.info('[Raven] validation_state', { session: sid, active: shouldScoreSession });
      sessionLog.validationActive = shouldScoreSession;
    }

    // Record session data before streaming
    appendHistoryEntry(sessionLog, 'user', textInput);

    // === Auth: verify caller before invoking Perplexity ===
    const authHeader = (req as any).headers?.get ? (req as any).headers.get('authorization') : undefined;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized. Missing Bearer token.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = await verifyToken(token);
      const allow = checkAllowlist(decoded);
      if (!allow.allowed) {
        return NextResponse.json({ ok: false, error: 'Access denied', reason: allow.reason }, { status: 403 });
      }
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: 'Invalid token', detail: err?.message || String(err) }, { status: 401 });
    }

    const encoder = new TextEncoder();
    const stream = await generateStream(prompt, {
      model: process.env.POETIC_BRAIN_MODEL || 'sonar-pro',
      personaHook: RAVEN_PERSONA_HOOK,
    });

    const responseStream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Initial metadata chunk
        send({
          intent,
          ok: true,
          prov,
          sessionId: sid,
        });

        let fullReply = "";

        try {
          for await (const chunk of stream) {
            if (chunk.delta) {
              fullReply += chunk.delta;
              send({ delta: chunk.delta });
            }
            if (chunk.error) {
              send({ error: chunk.error });
            }
          }
        } catch (err: any) {
          send({ error: err?.message || 'Stream error' });
        } finally {
          // Post-stream processing
          appendHistoryEntry(sessionLog, 'raven', fullReply);
          sessionLog.turnCount = (sessionLog.turnCount ?? 0) + 1;

          if (shouldScoreSession) {
            const probeText =
              extractProbeFromResponse(fullReply) ??
              FALLBACK_PROBE_BY_MODE[conversationMode];
            probe = createProbe(probeText, randomUUID());
            sessionLog.probes.push(probe);

            // Send the final probe to the client as a trailing metadata chunk
            send({ probe });
          }

          updateSession(sid, () => { }); // Persist updates
          controller.close();
        }
      }
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

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

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return NextResponse.json({
      ok: false,
      error: 'Failed to process request',
      details: errorMessage,
    }, { status: 500 });
  }
}
