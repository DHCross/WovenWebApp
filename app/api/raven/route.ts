import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { detectIntent } from '@/lib/raven/intent';
import { parseAstroSeekBlob } from '@/lib/raven/parser';
import { normalizeGeometry } from '@/lib/raven/normalize';
import { renderShareableMirror } from '@/lib/raven/render';
import { stampProvenance } from '@/lib/raven/provenance';
import { summariseUploadedReportJson } from '@/lib/raven/reportSummary';
import { runMathBrain } from '@/lib/mathbrain/adapter';
import { generateStream } from '@/lib/llm';
import { processMirrorDirective } from '@/poetic-brain/src/index';
import {
  createProbe,
  commitProbe,
  scoreSession,
  type SessionSSTLog,
  type SSTTag,
  type SessionTurn,
  type SessionSuggestion,
  type SSTProbe,
  type ConversationMode,
} from '@/lib/raven/sst';
import {
  ASTROSEEK_REFERENCE_GUIDANCE,
  referencesAstroSeekWithoutGeometry
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

/**
 * Extract geometry directly from uploaded report JSON to bypass Math Brain regeneration.
 * Returns null if the JSON doesn't contain valid geometry.
 */
function extractGeometryFromUploadedReport(contexts: Record<string, any>[]): any {
  if (!Array.isArray(contexts) || contexts.length === 0) return null;

  const mirrorContext = [...contexts].reverse().find(
    (ctx) => ctx && ctx.type === 'mirror' && typeof ctx.content === 'string'
  );

  if (!mirrorContext) return null;

  try {
    const parsed = JSON.parse(mirrorContext.content);
    // Check if this is a Math Brain v2 unified output with geometry
    if (parsed && typeof parsed === 'object') {
      // Unwrap unified_output (snake_case) or unifiedOutput (camelCase) if present
      const unwrapped = parsed.unified_output || parsed.unifiedOutput || parsed;

      // PRIORITY 1: Check for Mirror + Symbolic Weather format (person_a/personA.chart structure)
      const mirrorPayload =
        (unwrapped.person_a && typeof unwrapped.person_a === 'object'
          ? unwrapped.person_a
          : unwrapped.personA && typeof unwrapped.personA === 'object'
            ? unwrapped.personA
            : null);
      if (mirrorPayload?.chart && typeof mirrorPayload.chart === 'object') {
        return unwrapped; // Return the whole structure with person_a/person_b
      }

      // PRIORITY 2: Look for geometry in various possible locations
      const geo =
        unwrapped.geometry ||
        unwrapped.chart ||
        unwrapped.natal_chart ||
        unwrapped.natalChart ||
        unwrapped;

      // Validate that we have the minimum required geometry fields
      if (geo && typeof geo === 'object') {
        const hasPersonA = geo.person_a && typeof geo.person_a === 'object';
        const hasChart = geo.chart && typeof geo.chart === 'object';
        const hasBasicData = geo.planets || geo.houses || geo.aspects;

        if (hasPersonA || hasChart || hasBasicData) {
          return geo;
        }
      }
    }
  } catch (e) {
    // Invalid JSON or missing geometry
    return null;
  }

  return null;
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

const META_FEEDBACK_PATTERNS: RegExp[] = [
  /\b(this|your)\s+(system|app|build|code|program|programming)\b.*\b(broken|bug|issue|problem|stuck|loop|failing)\b/i,
  /\bpoetic brain\b.*\b(stuck|loop|broken)\b/i,
  /\bperplexity\b.*\b(issue|problem|bug)\b/i,
  /\bnetlify\b.*\b(error|fail|deploy)\b/i,
  /\bresonance check\b.*\b(stop|turn off|stuck)\b/i,
  /\b(stop|quit)\b.*\b(poetry|metaphor|lyric)\b/i,
  /\brespond\b.*\bplain(ly)?\b/i,
  /\bno more\b.*\b(poetry|metaphor)\b/i,
  /\bfrustrated\b.*\bwith\b.*\byou\b/i,
  /\bwhy are you\b.*\bdoing\b.*(this|that)\b/i,
  /\byour programming\b/i,
  /\bthis feels like a loop\b/i,
  /\bmeta feedback\b/i,
  /\bdebug\b/i,
];

const FALLBACK_PROBE_BY_MODE: Record<ConversationMode, string> = {
  explanation: 'Where do you feel this pattern pressing most in your day right now?',
  clarification: 'What would help me restate this so it feels truer to your lived experience?',
  suggestion: 'How should we carry this suggestion forward so it genuinely supports you?',
  meta_feedback: 'What specific adjustment would make this feel more useful right now?',
};

function detectConversationMode(text: string, session: SessionSSTLog): ConversationMode {
  const input = text.trim();
  if (!input) return 'explanation';

  if (META_FEEDBACK_PATTERNS.some((pattern) => pattern.test(input))) {
    return 'meta_feedback';
  }

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

// Check if user message indicates OSR (signal void, non-ping, outside symbolic range)
function checkForOSRIndicators(text: string): boolean {
  const lower = text.toLowerCase();
  const osrPhrases = [
    'doesn\'t resonate',
    'no resonance',
    'signal void',
    'non-ping',
    'outside symbolic range',
    'doesn\'t match lived experience',
    'not recognizable in life',
    'doesn\'t ring true',
    'outside my experience',
    'not grounded in reality',
    'metaphor without lived grounding',
    'symbolic speculation',
    'no behavioral evidence',
    'misses the mark entirely',
    'no connection to actual life',
    'unrecognizable patterns'
  ];

  return osrPhrases.some((phrase: string) => lower.includes(phrase));
}

// Generate validation probes for Mirror Directive responses
function generateValidationProbe(narrative: string, mirrorContent: any): { question: string; type: string; options: string[] } | null {
  // Extract key themes from the narrative to create targeted probes
  const isRelational = mirrorContent.person_b || mirrorContent._required_sections?.includes('person_b');

  const soloProbes = [
    {
      question: "Does what I've described about your core patterns resonate with your lived experience—does this feel Within Boundary (WB), or does it miss the mark entirely (OSR)?",
      type: "sst_resonance",
      options: ["Within Boundary (WB)", "At Boundary Edge (ABE)", "Outside Symbolic Range (OSR)"]
    },
    {
      question: "When I describe these primary tensions, do you recognize them in your actual daily life, or does this feel like symbolic interpretation without lived grounding?",
      type: "behavioral_check",
      options: ["Recognizable in lived experience", "Partially recognizable", "Not recognizable in life"]
    },
    {
      question: "Does this mapping of your blueprint to lived experience feel accurate, or are we drifting into metaphor without behavioral anchoring?",
      type: "integrity_check",
      options: ["Grounded in both geometry and behavior", "Straddling the line", "Drifting into metaphor"]
    }
  ];

  const relationalProbes = [
    {
      question: "Does this description of your relational dynamics match what actually happens between you, or is this symbolic speculation without behavioral evidence?",
      type: "relational_sst",
      options: ["Matches lived relational patterns", "Partially matches", "Outside lived experience"]
    },
    {
      question: "When I describe [specific dynamic], does that reflect observable behavior in your relationship, or is this ungrounded interpretation?",
      type: "relational_behavioral",
      options: ["Grounded in actual behavior", "Mixed", "Ungrounded interpretation"]
    }
  ];

  const probes = isRelational ? [...soloProbes, ...relationalProbes] : soloProbes;

  // Select a probe based on narrative content (simple rotation for now)
  const probeIndex = narrative.length % probes.length;
  return probes[probeIndex] || probes[0];
}

// Check if user is clearly affirming/confirming resonance (WB - Within Boundary)
function checkForClearAffirmation(text: string): boolean {
  const lower = text.toLowerCase();
  const clearAffirmPhrases = [
    'within boundary',
    'wb',
    'resonates with lived experience',
    'recognizable in life',
    'that\'s exactly what happens',
    'matches my experience',
    'grounded in reality',
    'behavioral evidence',
    'lived truth',
    'that\'s me',
    'yes it is',
    'yes that is',
    'that\'s right',
    'correct',
    'true'
  ];

  // Also check for simple "yes" at start of response
  if (/^yes\b/i.test(text.trim())) return true;

  return clearAffirmPhrases.some((phrase: string) => lower.includes(phrase));
}

// Check if user is requesting to start/continue the reading (not OSR)
function checkForReadingStartRequest(text: string): boolean {
  const startReadingPhrases = [
    'give me the reading',
    'start the reading',
    'begin the reading',
    'continue with the reading',
    'show me the reading',
    'start the mirror',
    'give me the mirror',
    'show me the mirror',
    'start mirror flow',
    'give me mirror flow',
    'show me mirror flow',
    'start symbolic weather',
    'give me symbolic weather',
    'show me symbolic weather',
    'let\'s begin',
    'let\'s start',
    'please continue',
    'go ahead',
  ];

  return startReadingPhrases.some((phrase: string) => text.toLowerCase().includes(phrase));
}

// Check if user is giving partial/uncertain confirmation
function checkForPartialAffirmation(text: string): boolean {
  const lower = text.toLowerCase();
  const partialPhrases = [
    'sort of',
    'kind of',
    'partly',
    'somewhat',
    'maybe',
    'i think so',
    'possibly',
    'in a way',
    'to some extent'
  ];

  return partialPhrases.some((phrase: string) => lower.includes(phrase));
}

// Enhanced response classification
function classifyUserResponse(text: string): 'CLEAR_WB' | 'PARTIAL_ABE' | 'OSR' | 'UNCLEAR' {
  // Check if user is requesting to start/continue the reading (treat as CLEAR_WB)
  if (checkForReadingStartRequest(text)) return 'CLEAR_WB';
  if (checkForClearAffirmation(text)) return 'CLEAR_WB';
  if (checkForPartialAffirmation(text)) return 'PARTIAL_ABE';
  if (checkForOSRIndicators(text)) return 'OSR';
  return 'UNCLEAR';
}

// Detect meta-signal complaints about being asked again / repetition
function isMetaSignalAboutRepetition(text: string): boolean {
  const lower = text.toLowerCase();
  const phrases = [
    'you asked',
    'you are asking again',
    'why are you asking',
    'i already said',
    'i just said',
    'as i said',
    'what i had just explained',
    'repeating myself',
    'asked again',
    'repeat the question',
    'i literally just',
    'already confirmed',
    "i've already answered",
    'well, yeah',
  ];
  return phrases.some((p: string) => lower.includes(p));
}

function pickHook(t: string) {
  // Check for JSON report uploads with specific conditions
  if (t.includes('"balance_meter"') && t.includes('"magnitude"')) {
    try {
      const jsonMatch = t.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const magnitude = data.balance_meter?.magnitude?.value;
        const directionalBias = data.balance_meter?.directional_bias?.value ?? data.balance_meter?.directional_bias;

        if (typeof magnitude === 'number' && typeof directionalBias === 'number') {
          if (magnitude >= 4 && directionalBias <= -4) {
            return 'Crisis & Structural Overload · Maximum Threshold';
          } else if (magnitude >= 3 && directionalBias <= -3) {
            return 'Pressure & Restriction · Compression Field';
          }
        }
      }
    } catch (e) {
      // Fall through to text-based detection
    }
  }

  if (/dream|sleep/i.test(t)) return 'Duty & Dreams · Saturn ↔ Neptune';
  if (/private|depth|shadow/i.test(t)) return 'Private & Piercing · Mercury ↔ Pluto';
  if (/restless|ground/i.test(t)) return 'Restless & Grounded · Pluto ↔ Moon';
  return undefined;
}

function buildAstroSeekGuardDraft(): Record<string, string> {
  return {
    picture: 'Got your AstroSeek mention—one more step.',
    feeling: 'I need the actual export contents to mirror accurately.',
    container: 'Option 1 · Click "Upload report" and drop the AstroSeek download (JSON or text).',
    option: 'Option 2 · Open the export and paste the full table or text here.',
    next_step: 'Once the geometry is included, I can read you in detail.'
  };
}

function createGuardPayload(
  source: string,
  guidance: string,
  draft: Record<string, any>
): { guard: true; guidance: string; draft: Record<string, any>; prov: Record<string, any> } {
  const prov = stampProvenance({ source });
  return {
    guard: true as const,
    guidance,
    draft,
    prov
  };
}

function safeParseJSON(value: string): { ok: boolean; data: any | null } {
  if (typeof value !== 'string') return { ok: false, data: null };
  try {
    return { ok: true, data: JSON.parse(value) };
  } catch {
    return { ok: false, data: null };
  }
}

function resolveSubject(payload: any, key: 'person_a' | 'person_b'): any {
  if (!payload || typeof payload !== 'object') return null;
  const camelKey = key === 'person_a' ? 'personA' : 'personB';

  const sources: Array<any> = [];
  if (payload.unified_output && typeof payload.unified_output === 'object') {
    sources.push(payload.unified_output);
  }
  sources.push(payload);

  if (payload.context && typeof payload.context === 'object') {
    sources.push(payload.context);
    if (payload.context.unified_output && typeof payload.context.unified_output === 'object') {
      sources.push(payload.context.unified_output);
    }
    if (payload.context.subjects && typeof payload.context.subjects === 'object') {
      sources.push(payload.context.subjects);
    }
  }

  if (payload.subjects && typeof payload.subjects === 'object') {
    sources.push(payload.subjects);
  }

  if (payload.profiles && typeof payload.profiles === 'object') {
    sources.push(payload.profiles);
  }

  if (payload.people && typeof payload.people === 'object') {
    sources.push(payload.people);
  }

  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    const candidate = source[key] ?? source[camelKey];
    if (candidate && typeof candidate === 'object') {
      return candidate;
    }
  }

  return null;
}

function hasCompleteSubject(subject: any): boolean {
  if (!subject || typeof subject !== 'object') return false;

  // Check for v2 schema first (unified_output.person_a.chart)
  const v2Chart = subject.unified_output?.person_a?.chart ||
    subject.unified_output?.personA?.chart ||
    subject.unified_output?.chart;

  // Fall back to v1 schema
  const chart = v2Chart ||
    (subject.chart ??
      subject.chart_natal ??
      subject.chartNatal ??
      subject.geometry ??
      subject.natal_chart ??
      subject.blueprint ??
      null);

  // Check if we have valid chart data in either format
  const hasPlanets =
    Array.isArray(chart?.planets) && chart.planets.length > 0 ||
    (chart && typeof chart === 'object' &&
      (chart.planets || chart.planets === undefined) && // Allow missing planets if other data exists
      Object.keys(chart).some(k => k !== 'planets'));

  const aspects =
    Array.isArray(subject.aspects) && subject.aspects.length > 0 ||
    Array.isArray(chart?.aspects) && chart.aspects.length > 0;

  const placements =
    Array.isArray(subject.placements) && subject.placements.length > 0;

  // Also check for _natal_section in v2 schema
  const hasNatalSection =
    subject._natal_section &&
    typeof subject._natal_section === 'object' &&
    Object.keys(subject._natal_section).length > 0;

  return Boolean(hasPlanets || aspects || placements || hasNatalSection);
}

function extractSubjectName(subject: any, fallback: string): string {
  if (!subject || typeof subject !== 'object') return fallback;
  const name =
    subject.name ??
    subject.details?.name ??
    subject.profile?.name ??
    subject.meta?.name ??
    subject.identity?.name ??
    subject.person?.name;
  return typeof name === 'string' && name.trim() ? name.trim() : fallback;
}

function detectContextLayers(payload: any): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const layers = new Set<string>();
  const targets = [payload, payload.context, payload.metadata, payload.meta].filter(
    (entry): entry is Record<string, any> => Boolean(entry && typeof entry === 'object')
  );
  for (const entry of targets) {
    if (
      'relationship_context' in entry ||
      'relationship' in entry ||
      'relationship_scope' in entry ||
      'relationship_profile' in entry ||
      'mirror_contract' in entry && entry.mirror_contract?.relationship_type
    ) {
      layers.add('relationship');
    }
    if ('dream' in entry || 'dream_context' in entry || 'dream_log' in entry) {
      layers.add('dream');
    }
    if (
      'field' in entry ||
      'field_context' in entry ||
      'fieldmap' in entry ||
      'wm_fieldmap' in entry ||
      'field_map' in entry
    ) {
      layers.add('field');
    }
    if (
      'symbolic_weather' in entry ||
      'symbolic_weather_context' in entry ||
      'weather_overlay' in entry ||
      'transit_context' in entry ||
      'symbolic_weather_package' in entry ||
      'weather_package' in entry
    ) {
      layers.add('symbolic_weather');
    }
  }
  return Array.from(layers);
}

function extractMirrorContract(payload: any): Record<string, any> | null {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.mirror_contract && typeof payload.mirror_contract === 'object') {
    return payload.mirror_contract;
  }
  if (payload.contract && typeof payload.contract === 'object') {
    return payload.contract;
  }
  if (payload.context && typeof payload.context === 'object') {
    const ctx = payload.context;
    if (ctx.mirror_contract && typeof ctx.mirror_contract === 'object') {
      return ctx.mirror_contract;
    }
    if (ctx.contract && typeof ctx.contract === 'object') {
      return ctx.contract;
    }
  }
  return null;
}

type AutoExecutionStatus =
  | 'none'
  | 'solo_auto'
  | 'relational_auto'
  | 'parallel_auto'
  | 'relational_choice'
  | 'contextual_auto'
  | 'osr';

type AutoExecutionPlan = {
  status: AutoExecutionStatus;
  contextId?: string;
  contextName?: string;
  instructions?: string[];
  forceQuestion?: boolean;
  personAName?: string;
  personBName?: string;
  contextLayers?: string[];
  reason?: string;
};

function deriveAutoExecutionPlan(
  contexts: Record<string, any>[],
  sessionLog: SessionSSTLog & Record<string, any>
): AutoExecutionPlan {
  if (!Array.isArray(contexts) || contexts.length === 0) {
    return { status: 'none' };
  }

  const mirrorContext =
    [...contexts].reverse().find((ctx) => ctx && ctx.type === 'mirror' && typeof ctx.content === 'string') ??
    (typeof contexts[contexts.length - 1]?.content === 'string' ? contexts[contexts.length - 1] : null);

  if (!mirrorContext || typeof mirrorContext.content !== 'string') {
    return { status: 'none' };
  }

  // Check for failed contexts to prevent loops
  if (sessionLog.failedContexts && sessionLog.failedContexts.has(mirrorContext.id)) {
    console.log('[AutoPlan] Skipping failed context:', mirrorContext.id);
    return { status: 'none' };
  }

  const parsed = safeParseJSON(mirrorContext.content);
  if (!parsed.ok) {
    return {
      status: 'osr',
      contextId: mirrorContext.id,
      contextName: mirrorContext.name,
      reason: 'invalid_json',
    };
  }

  const payload = parsed.data || {};
  const companionContexts = contexts.filter((ctx) => ctx && ctx !== mirrorContext && typeof ctx.content === 'string');
  const resolveWithCompanion = (
    subject: any,
    key: 'person_a' | 'person_b'
  ): any => {
    if (hasCompleteSubject(subject)) return subject;
    for (const ctx of companionContexts) {
      const companionParsed = safeParseJSON(String(ctx.content));
      if (!companionParsed.ok) continue;
      const candidate = resolveSubject(companionParsed.data, key);
      if (hasCompleteSubject(candidate)) {
        return candidate;
      }
    }
    return subject;
  };

  const personA = resolveWithCompanion(resolveSubject(payload, 'person_a'), 'person_a');
  const personB = resolveWithCompanion(resolveSubject(payload, 'person_b'), 'person_b');

  console.log('[AutoPlan] Deriving plan for context:', mirrorContext.id);
  console.log('[AutoPlan] Payload keys:', Object.keys(payload));
  console.log('[AutoPlan] Person A found:', !!personA, 'Complete:', hasCompleteSubject(personA));
  console.log('[AutoPlan] Person B found:', !!personB, 'Complete:', hasCompleteSubject(personB));

  if (!hasCompleteSubject(personA)) {
    console.log('[AutoPlan] OSR: Missing Person A');
    return {
      status: 'osr',
      contextId: mirrorContext.id,
      contextName: mirrorContext.name,
      reason: 'missing_person_a',
    };
  }

  const templateHint = typeof payload._template_hint === 'string' ? payload._template_hint : null;
  const requiredSections = Array.isArray(payload._required_sections) ? payload._required_sections : [];

  // Check for required Person B
  if (
    (requiredSections.includes('person_b') || requiredSections.includes('personB')) &&
    !hasCompleteSubject(personB)
  ) {
    console.log('[AutoPlan] OSR: Missing required Person B for relational template');
    return {
      status: 'osr',
      contextId: mirrorContext.id,
      contextName: mirrorContext.name,
      reason: 'missing_required_subject_b',
    };
  }

  const contract = extractMirrorContract(payload);
  const reportKindRaw: string | null = (() => {
    if (typeof contract?.report_kind === 'string') return contract.report_kind;
    if (typeof payload?.report_kind === 'string') return payload.report_kind;
    if (typeof payload?.report?.kind === 'string') return payload.report.kind;
    if (typeof payload?.context?.report_kind === 'string') return payload.context.report_kind;
    return null;
  })();

  const reportKind = reportKindRaw ? reportKindRaw.toLowerCase() : null;
  const contractRelational =
    contract?.is_relational === true ||
    (typeof contract?.relational === 'boolean' && contract.relational) ||
    (typeof reportKind === 'string' && /relational|synastry|composite/.test(reportKind)) ||
    templateHint === 'relational_pair';
  const contractParallel =
    typeof contract?.mode === 'string' && /parallel/i.test(contract.mode) ||
    (typeof reportKind === 'string' && /parallel/.test(reportKind));

  const personAName = extractSubjectName(personA, 'Person A');
  const personBName = hasCompleteSubject(personB)
    ? extractSubjectName(personB, 'Person B')
    : undefined;
  const contextLayers = detectContextLayers(payload);

  if (hasCompleteSubject(personB)) {
    const relationalModes = (sessionLog.relationalModes || {}) as Record<string, 'relational' | 'parallel'>;
    const storedMode = relationalModes[mirrorContext.id];
    const resolvedMode: 'relational' | 'parallel' | null =
      storedMode ??
      (contractRelational ? 'relational' : contractParallel ? 'parallel' : null);

    if (resolvedMode === 'relational') {
      return {
        status: 'relational_auto',
        contextId: mirrorContext.id,
        contextName: mirrorContext.name,
        personAName,
        personBName,
        instructions: [
          `AUTO-EXECUTION: Relational mirror in progress for ${personAName} and ${personBName}.`,
          'STRUCTURE: Generate Clear Mirror format with explicit sections:',
          '1. Hook Stack (4 items): **[Number]. [Headline]** + lived example + geometry footnote',
          '2. Frontstage: Numeric coordinates (Magnitude/Bias/Coherence) + sensory description with inline footnotes',
          '3. Polarity Cards (2-4): **Card [N] — [Title]** + reflection + geometry',
          '4. Mirror Voice: Direct "you" reflection with conditional inference + resonance question',
          '5. Socratic Closure: WB/ABE/OSR marking instructions',
          'Begin immediately. Use both names directly. Keep voice lyrical but falsifiable.',
        ],
        forceQuestion: true,
      };
    }

    if (resolvedMode === 'parallel') {
      return {
        status: 'parallel_auto',
        contextId: mirrorContext.id,
        contextName: mirrorContext.name,
        personAName,
        personBName,
        instructions: [
          `AUTO-EXECUTION: Parallel diagnostics for ${personAName} and ${personBName}.`,
          'STRUCTURE: Generate Clear Mirror format for EACH chart separately:',
          '1. Hook Stack (4 items per person)',
          '2. Frontstage (separate for A and B)',
          '3. Polarity Cards (2-4 per person)',
          '4. Mirror Voice (separate reflections)',
          '5. Socratic Closure (shared)',
          'Execute immediately. Keep them distinct—no relational synthesis until end.',
        ],
        forceQuestion: true,
      };
    }

    return {
      status: 'relational_choice',
      contextId: mirrorContext.id,
      contextName: mirrorContext.name,
      personAName,
      personBName,
    };
  }

  if (contextLayers.length > 0) {
    const layerLabel = contextLayers
      .map((layer) => {
        switch (layer) {
          case 'relationship':
            return 'relationship context';
          case 'dream':
            return 'dream payload';
          case 'field':
            return 'field map';
          case 'symbolic_weather':
            return 'symbolic weather overlay';
          default:
            return layer;
        }
      })
      .join(', ');
    return {
      status: 'contextual_auto',
      contextId: mirrorContext.id,
      contextName: mirrorContext.name,
      personAName,
      contextLayers,
      instructions: [
        `AUTO-EXECUTION: Contextual mirror for ${personAName}.`,
        `STRUCTURE: Generate Clear Mirror format integrating ${layerLabel}:`,
        '1. Hook Stack (4 items): Include contextual layer influences',
        '2. Frontstage: FIELD LAYER + contextual coordinates',
        '3. Polarity Cards (2-4): Context-informed tensions',
        '4. Mirror Voice: Weave contextual insights into narrative',
        '5. Socratic Closure: Context-aware resonance question',
        'Execute immediately. Integrate layers seamlessly—no permission gates.',
      ],
      forceQuestion: true,
    };
  }

  return {
    status: 'solo_auto',
    contextId: mirrorContext.id,
    contextName: mirrorContext.name,
    personAName,
    instructions: [
      `AUTO-EXECUTION: Solo diagnostic for ${personAName}.`,
      'STRUCTURE: Generate Clear Mirror format with explicit sections:',
      '1. Hook Stack (4 items): Numbered, bolded headlines with inline geometry footnotes',
      '2. Frontstage: FIELD LAYER coordinates (date/time/location), planetary geometry summary',
      '3. Polarity Cards (2-4): Tension/contradiction pairs with titles',
      '4. Mirror Voice: VOICE LAYER narrative with embedded Socratic question',
      '5. Socratic Closure: Optional custom reflection or standard closure',
      'Execute immediately. Use section headings (### Hook Stack, etc.). E-Prime language throughout.',
    ],
    forceQuestion: true,
  };
}

function parseRelationalChoiceAnswer(text: string): 'relational' | 'parallel' | null {
  const input = (text || '').trim().toLowerCase();
  if (!input) return null;
  if (/(relational|together|both|synastry|relationship|combined|shared)/i.test(input)) {
    return 'relational';
  }
  if (/(parallel|separate|individual|solo|each|individually)/i.test(input)) {
    return 'parallel';
  }
  return null;
}

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
      sessionLog.probes[idx] = commitProbe(sessionLog.probes[idx], tag);
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
          const result = processMirrorDirective(content);

          if (result.success && result.narrative_sections) {
            let narrative = '';
            if (result.narrative_sections.solo_mirror_a) narrative += result.narrative_sections.solo_mirror_a + '\n\n';
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
      return NextResponse.json({ intent, ok: true, draft: relationalDraft, prov: relationalProv, climate: relationalResponse.climate ?? null, sessionId: sid, probe: relationalProbe });
    }

    if (autoPlan.status === 'parallel_auto') {
      wantsWeatherOnly = false;
      const parallelResponse = await runMathBrain({
        ...resolvedOptions,
        reportType: 'parallel',
        autoMode: 'parallel_auto',
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
      return NextResponse.json({ intent, ok: true, draft: parallelDraft, prov: parallelProv, climate: parallelResponse.climate ?? null, sessionId: sid, probe: parallelProbe });
    }

    if (autoPlan.status === 'contextual_auto') {
      wantsWeatherOnly = false;
      const contextualResponse = await runMathBrain({
        ...resolvedOptions,
        reportType: resolvedOptions.reportType ?? 'mirror',
        autoMode: 'contextual_auto',
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
        sessionId: sid,
        probe: contextualProbe,
      });
    }

    if (autoPlan.status === 'solo_auto') {
      wantsWeatherOnly = false;

      const uploadedGeo = extractGeometryFromUploadedReport(normalizedContexts);

      if (uploadedGeo) {
        const soloProv = stampProvenance({ source: 'Math Brain (Uploaded Report)', timestamp: new Date().toISOString() });
        const soloOptions = {
          ...resolvedOptions,
          geometryValidated: isGeometryValidated(uploadedGeo),
          operationalFlow: OPERATIONAL_FLOW,
          operational_flow: OPERATIONAL_FLOW,
        };
        const soloDraft = await renderShareableMirror({
          geo: uploadedGeo,
          prov: soloProv,
          options: soloOptions,
          mode: 'natal-only',
        });
        const soloProbe = createProbe(soloDraft?.next_step || 'Notice where this pattern lands in your body', randomUUID());
        sessionLog.probes.push(soloProbe);
        updateSession(sid, () => { });
        return NextResponse.json({ intent, ok: true, draft: soloDraft, prov: soloProv, climate: null, sessionId: sid, probe: soloProbe });
      }

      const soloResponse = await runMathBrain({
        ...resolvedOptions,
        reportType: 'mirror',
        autoMode: 'solo_auto',
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
      return NextResponse.json({ intent, ok: true, draft: soloDraft, prov: soloProv, climate: soloResponse.climate ?? null, sessionId: sid, probe: soloProbe });
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
      const mb = await runMathBrain(resolvedOptions);
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
      return NextResponse.json({ intent, ok: true, draft, prov, climate: mb.climate ?? null, sessionId: sid, probe });
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
