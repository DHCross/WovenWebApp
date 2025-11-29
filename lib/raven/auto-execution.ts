/**
 * Auto-Execution Planning
 * 
 * Functions for determining how to automatically execute mirror readings
 * based on the context and session state.
 */

import type { SessionSSTLog } from './sst';
import { safeParseJSON } from './helpers';

// =============================================================================
// TYPES
// =============================================================================

export type AutoExecutionStatus =
  | 'none'
  | 'solo_auto'
  | 'relational_auto'
  | 'parallel_auto'
  | 'relational_choice'
  | 'contextual_auto'
  | 'osr';

export type AutoExecutionPlan = {
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

// =============================================================================
// SUBJECT RESOLUTION
// =============================================================================

/**
 * Resolve a subject (person_a or person_b) from various payload structures
 */
export function resolveSubject(payload: any, key: 'person_a' | 'person_b'): any {
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

/**
 * Check if a subject has complete chart data
 */
export function hasCompleteSubject(subject: any): boolean {
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

/**
 * Extract subject name from various payload structures
 */
export function extractSubjectName(subject: any, fallback: string): string {
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

// =============================================================================
// CONTEXT LAYER DETECTION
// =============================================================================

/**
 * Detect which context layers are present in the payload
 */
export function detectContextLayers(payload: any): string[] {
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

/**
 * Extract mirror contract from payload
 */
export function extractMirrorContract(payload: any): Record<string, any> | null {
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

// =============================================================================
// AUTO-EXECUTION PLANNING
// =============================================================================

/**
 * Derive an auto-execution plan based on context and session state
 */
export function deriveAutoExecutionPlan(
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
    // eslint-disable-next-line no-console
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

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[AutoPlan] Deriving plan for context:', mirrorContext.id);
    // eslint-disable-next-line no-console
    console.log('[AutoPlan] Payload keys:', Object.keys(payload));
    // eslint-disable-next-line no-console
    console.log('[AutoPlan] Person A found:', !!personA, 'Complete:', hasCompleteSubject(personA));
    // eslint-disable-next-line no-console
    console.log('[AutoPlan] Person B found:', !!personB, 'Complete:', hasCompleteSubject(personB));
  }

  if (!hasCompleteSubject(personA)) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[AutoPlan] OSR: Missing Person A');
    }
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
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[AutoPlan] OSR: Missing required Person B for relational template');
    }
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

/**
 * Parse user's answer to relational vs parallel choice
 */
export function parseRelationalChoiceAnswer(text: string): 'relational' | 'parallel' | null {
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
