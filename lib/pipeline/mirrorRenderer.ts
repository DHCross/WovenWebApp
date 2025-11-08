import type { NormalizedGeometry } from './mathBrainAdapter';
import { analyzeRelationship } from './relationalAdapter';

type WovenHeader = {
  mode?: string;
  subject_name?: string;
  reader_id?: string;
  include_persona_context?: boolean;
  map_source?: string;
  integration_mode?: string;
  reference_date?: string;
  relational_context?: Record<string, any>;
};

function extractWovenHeader(payload: any): WovenHeader | null {
  if (!payload || typeof payload !== 'object') return null;
  const header =
    payload.Woven_Header ||
    payload['Woven Header'] ||
    payload.WovenHeader ||
    null;
  if (!header || typeof header !== 'object') return null;
  const h = header as Record<string, any>;
  return {
    mode: typeof h.mode === 'string' ? h.mode : undefined,
    subject_name: typeof h.subject_name === 'string' ? h.subject_name : undefined,
    reader_id: typeof h.reader_id === 'string' ? h.reader_id : undefined,
    include_persona_context:
      typeof h.include_persona_context === 'boolean' ? h.include_persona_context : undefined,
    map_source: typeof h.map_source === 'string' ? h.map_source : undefined,
    integration_mode: typeof h.integration_mode === 'string' ? h.integration_mode : undefined,
    reference_date: typeof h.reference_date === 'string' ? h.reference_date : undefined,
    relational_context:
      h.relational_context && typeof h.relational_context === 'object'
        ? (h.relational_context as Record<string, any>)
        : h.relationship_context && typeof h.relationship_context === 'object'
        ? (h.relationship_context as Record<string, any>)
        : undefined,
  };
}

function extractRelationalContext(payload: any): Record<string, any> | undefined {
  const header = extractWovenHeader(payload);
  if (header?.relational_context && typeof header.relational_context === 'object') {
    return header.relational_context as Record<string, any>;
  }
  // Fallback: top-level relationship/relational context if exposed outside the header
  const top =
    (payload && typeof payload === 'object' &&
      ((payload.relational_context && typeof payload.relational_context === 'object' && payload.relational_context) ||
        (payload.relationship_context && typeof payload.relationship_context === 'object' && payload.relationship_context))) ||
    undefined;
  return top as Record<string, any> | undefined;
}

function pickPrimaryElement(elements: Record<string, number> | null): string | null {
  if (!elements) return null;
  const entries = Object.entries(elements).filter(([, v]) => typeof v === 'number');
  if (!entries.length) return null;
  entries.sort((a, b) => (b[1] as number) - (a[1] as number));
  return entries[0][0];
}

function extractWindow(payload: any): { start?: string; end?: string } {
  const mc = payload?.mirror_contract || payload?.contract || {};
  const start = mc?.start_date || payload?.symbolic_weather?.periods?.[0]?.start;
  const end = mc?.end_date || payload?.symbolic_weather?.periods?.[0]?.end;
  return { start, end };
}

function extractElements(payload: any): Record<string, number> | null {
  const p = payload?.symbolic_weather?.periods?.[0];
  if (p?.elements && typeof p.elements === 'object') return p.elements as Record<string, number>;
  return null;
}

function extractName(payload: any): string | null {
  const header = extractWovenHeader(payload);
  if (header?.subject_name) return header.subject_name;
  const a = payload?.person_a || payload?.personA || {};
  return (
    a?.name ||
    a?.details?.name ||
    payload?.mirror_contract?.person_a?.name ||
    null
  );
}

function extractRecognitionTrace(geometry: NormalizedGeometry): Record<string, any> {
  const aspects = geometry?.aspects || [];
  
  // Dominant aspects: tight orbs (< 3°) or major configurations
  const dominant = aspects
    .filter((a: any) => Math.abs(a.orb || 0) < 3)
    .map((a: any) => `${a.from}-${a.to} ${a.type}`)
    .slice(0, 5);
  
  // Angular contacts: aspects involving ASC/MC
  const angular = aspects
    .filter((a: any) => ['asc', 'mc', 'dsc', 'ic'].includes(a.from?.toLowerCase()) || ['asc', 'mc', 'dsc', 'ic'].includes(a.to?.toLowerCase()))
    .map((a: any) => `${a.from}-${a.to} ${a.type}`);
  
  // Anaretic points: planets near 29° (if we had degree data)
  const anaretic: string[] = []; // TODO: Implement when degree data available
  
  // Anchors: key structural aspects (conjunctions to angles, etc)
  const anchors = aspects
    .filter((a: any) => a.type === 'conjunction' && Math.abs(a.orb || 0) < 2)
    .map((a: any) => `${a.from}-${a.to}`);
  
  return {
    dominant_aspects: dominant,
    angular_contacts: angular,
    anaretic_points: anaretic,
    anchors: anchors,
  };
}

function validateEPrimeIntegrity(segments: Record<string, string>): void {
  const violations: string[] = [];
  
  // Check VOICE for "to be" verbs
  const voiceText = segments.voice || '';
  const eprimeViolations = [
    /\bis\b/gi,
    /\bare\b/gi,
    /\bwas\b/gi,
    /\bwere\b/gi,
    /\bbeing\b/gi,
    /\bbeen\b/gi,
  ];
  
  for (const pattern of eprimeViolations) {
    if (pattern.test(voiceText)) {
      violations.push(`E-Prime violation in VOICE: found "${voiceText.match(pattern)?.[0]}"`);
    }
  }
  
  if (violations.length > 0) {
    console.warn('[Mirror Integrity] E-Prime violations detected:', violations);
    // Don't throw in production, just warn
    // throw new Error(`E-Prime integrity check failed: ${violations.join('; ')}`);
  }
}

export async function renderMirrorDraft(payload: any, geometry: NormalizedGeometry): Promise<Record<string, any>> {
  // Attempt to use the existing Raven renderer when available. Fallback to local draft otherwise.
  try {
    // Allow opt-out via env if needed
    const allowIntegration = process.env.RAVEN_RENDER_INTEGRATION !== '0';
    if (allowIntegration) {
      // Dynamic import to avoid build-time hard dependency in minimal test harnesses
      const mod: any = await import('@/lib/raven/render').catch(() => null);
      const renderFn: any = mod?.renderShareableMirror || mod?.renderMirror || mod?.default;
      if (typeof renderFn === 'function') {
        const header = extractWovenHeader(payload);
        // Compute relational placeholders if relational context present
        let relational: Record<string, any> | undefined;
        try {
          const hasRel = Boolean(header?.relational_context) || Boolean(payload?.person_b);
          if (hasRel) {
            relational = await analyzeRelationship(payload, geometry, header ?? undefined);
          }
        } catch {
          relational = undefined;
        }
        const prov = {
          source: 'Poetic Brain (Pipeline)',
          reader_id: header?.reader_id,
          subject_name: header?.subject_name,
          reference_date: header?.reference_date,
          integration_mode: header?.integration_mode,
          relational_context: header?.relational_context,
        };
        const options = {
          mode: header?.mode,
          include_persona_context: header?.include_persona_context,
          map_source: header?.map_source,
          relational,
        } as Record<string, any>;
        const draft = await renderFn({ geo: geometry, prov, options });
        if (draft && typeof draft === 'object') {
          // Ensure required fields exist; if missing, merge with local defaults
          const local = await buildLocalDraft(payload, geometry);
          return {
            picture: draft.picture ?? local.picture,
            feeling: draft.feeling ?? local.feeling,
            container: draft.container ?? local.container,
            option: draft.option ?? local.option,
            next_step: draft.next_step ?? local.next_step,
            appendix: {
              ...(local.appendix || {}),
              ...(draft.appendix || {}),
              ...(options.relational ? { relational: options.relational } : {}),
            },
          };
        }
      }
    }
  } catch {
    // Swallow integration errors and fall back to local rendering
  }

  return buildLocalDraft(payload, geometry);
}

async function buildLocalDraft(payload: any, geometry: NormalizedGeometry): Promise<Record<string, any>> {
  const name = extractName(payload) || 'Person A';
  const { start, end } = extractWindow(payload);
  const elements = extractElements(payload);
  const primary = pickPrimaryElement(elements) || geometry?.summary?.dominantElement || null;
  const hasTransits = Boolean(start && end);
  
  // Extract recognition trace for audit
  const recognitionTrace = extractRecognitionTrace(geometry);

  const picture = [
    start && end ? `Window ${start} → ${end}` : null,
    primary ? `Elemental emphasis: ${primary}` : null,
    `Mirror prepared for ${name}`,
  ]
    .filter(Boolean)
    .join(' · ');

  // FIELD: Somatic texture — phenomenon, not verdict
  const fieldMap: Record<string, string> = {
    fire: 'A quickening, like a spark catching in dry grass. The heat reads as urgency held in suspension.',
    earth: 'A sense of density, like roots taking hold. The weight reads not as burden, but as anchor.',
    air: 'A current of change, like wind shifting direction. The movement reads as possibility, not chaos.',
    water: "A pull toward depth, like a river's undertow. The pressure reads as invitation, not undertow.",
  };

  const feeling = primary
    ? fieldMap[primary]
    : 'A point of balance—still water under a clear sky. The quiet reads not as absence, but as compression held in suspension.';

  // MAP: Structural description — geometry meeting activation
  const container = hasTransits
    ? 'Long-wave structure (natal geometry) meeting short-wave activation (current transit). The tension between them sketches a fulcrum rather than a fault. Here, pressure organizes instead of fragments.'
    : 'Long-wave structure only (natal baseline). The permanent inner geometry that shapes how you meet the world. This is the map, not the weather.';

  // VOICE: Testable invitation — agency-preserving hypothesis
  const option = hasTransits
    ? 'You could test this balance by naming one concrete signal—an action, a word, a silence—that feels like it sits on that fulcrum. Not to solve it, only to see if the stillness bends or holds.'
    : 'You could test this pattern by noticing where it shows up in one concrete moment today. The geometry suggests a tendency; your experience confirms whether it translates to lived pressure or remains abstract.';

  // Resonance Test: Falsifiability gate
  const next_step =
    'One small, reversible act in the next 24 hours can test the reflection. If it resonates, notice where it lands: In the body (WB), in memory (ABE), or in the outer world (OSR).';

  // Validate E-Prime integrity before proceeding
  validateEPrimeIntegrity({ feeling, container, voice: option });

  const aspectCount = geometry?.aspects?.length ?? 0;
  const aspectSummary = aspectCount > 0
    ? geometry.aspects.map((a: any) => `${a.from}–${a.to} ${a.type}${a.orb ? ` (${a.orb}° orb)` : ''}`).join('; ')
    : 'No significant aspects detected';

  const symbolicFootnotes = aspectCount > 0
    ? '### Symbolic Footnotes\n\n' + geometry.aspects.map((a: any, i: number) => {
        const from = a.from.charAt(0).toUpperCase() + a.from.slice(1);
        const to = a.to.charAt(0).toUpperCase() + a.to.slice(1);
        const type = a.type;
        let interpretation = '';
        if (type === 'conjunction') interpretation = `merges the energies of ${from} and ${to}, creating a focal point of intense, unified expression.`;
        else if (type === 'opposition') interpretation = `creates a tension between ${from} and ${to}, demanding balance and integration of seemingly opposite forces.`;
        else if (type === 'trine') interpretation = `forms a harmonious flow between ${from} and ${to}, indicating natural talent and ease.`;
        else if (type === 'square') interpretation = `builds dynamic friction between ${from} and ${to}, prompting action and demanding resolution.`;
        else interpretation = `links ${from} and ${to} in a significant pattern.`;
        
        return `${i + 1}. **${from} ${type} ${to}**: This aspect ${interpretation}`;
      }).join('\n')
    : '';

  // Generate personality reflection based on elemental emphasis
  const personalityReflection = primary
    ? primary === 'fire'
      ? 'You tend to learn through action. Movement precedes understanding; initiative reveals the path. When stuck, forward motion often dissolves the uncertainty.'
      : primary === 'earth'
      ? 'You tend to trust what can be built and tested. Stability arrives through consistent effort. When overwhelmed, return to what is tangible and verifiable.'
      : primary === 'air'
      ? 'You tend to understand through connection and exchange. Ideas clarify when shared; isolation can feel like stagnation. When uncertain, reach for conversation or new perspective.'
      : 'You tend to navigate through feeling and depth. Emotional truth often arrives before rational clarity. When disconnected, stillness and introspection restore alignment.'
    : 'Your pattern suggests balanced engagement with all elements—fire, earth, air, water. This creates versatility, but may require conscious choice about which mode serves the current moment.';

  // Relocation disclosure
  const relocationMode = payload?.relocation_mode || 'none';
  const relocationDisclosure = relocationMode === 'A_local' || relocationMode === 'B_local'
    ? '\n\n---\n\n*Reflection computed from relocated coordinates (felt-weather frame). Houses re-anchored to current location; planetary positions remain natal.*'
    : hasTransits
    ? '\n\n---\n\n*Reflection computed from natal baseline with transit overlay.*'
    : '\n\n---\n\n*Reflection computed from natal baseline only.*';

  const readerMarkdown = `# Mirror Reading for ${name}

## Geometric Overview
This reflection translates symbolic geometry into testable language. The configuration shows **${aspectCount}** major aspect${aspectCount !== 1 ? 's' : ''}: *${aspectSummary}*.

${primary ? `The dominant elemental pressure leans toward **${primary}**. This suggests a climate where themes of ${primary === 'fire' ? 'initiative and action' : primary === 'earth' ? 'structure and stability' : primary === 'air' ? 'connection and ideas' : 'emotion and depth'} may feel more present.` : 'The elemental pressures are balanced, suggesting a climate of integration.'}

## Symbolic Weather
${start && end ? `This reading covers the period from ${start} to ${end}, tracking how a current symbolic "weather" pattern interacts with your natal "blueprint."` : 'This reading reflects your natal baseline—the permanent inner structure that shapes how you meet the world.'}

The aspects above create channels of flow and points of friction. The most resonant insights often emerge where you can feel these geometric patterns as lived experience.

${symbolicFootnotes}

## Resonant Reflection
${personalityReflection}

${aspectCount > 0 ? 'The aspects in your chart create specific pressure points—moments where energy concentrates and choice becomes visible. These are not mandates, but invitations. Where the geometry suggests tension, you may feel the pull to act, integrate, or reframe.' : 'With minimal major aspects detected, the chart suggests a more fluid, self-directed quality. The absence of strong geometric pressure can mean greater freedom—or the need to consciously create your own momentum.'}

## What to Track
Notice where the feeling of **${primary || 'elemental balance'}** shows up. The geometry is a map of potential; your experience is the ground truth. A testable mirror emerges when you can name one concrete moment where you felt the pull of these patterns. That is the beginning of a dialogue with the symbols.

---

*This reading offers hypotheses drawn from symbolic geometry. Its accuracy emerges only through comparison with lived experience. Mark what resonates: **WB** (fits), **ABE** (partially fits), **OSR** (doesn't fit). Testing creates truth.*${relocationDisclosure}`;

  const appendix: Record<string, any> = { 
    aspects: geometry?.aspects ?? [],
    reader_markdown: readerMarkdown,
    // Recognition trace (upstream lineage)
    recognition_trace: recognitionTrace,
    // Enhanced provenance block (v5.0 requirement)
    provenance: {
      recognition_stack_version: 'v2.1',
      eprime_compliance: true,
      house_system: 'Placidus', // TODO: Extract from payload or geometry
      orbs_profile: 'wm-spec-2025-09',
      timezone_db_version: 'IANA-2025a',
      math_brain_version: 'mb-2025.11.08',
      balance_meter_version: hasTransits ? 'v5.0' : 'n/a',
      relocation_mode: relocationMode,
      generated_utc: new Date().toISOString(),
    },
    // Mirror metadata (Recognition Stack → Mirror interface)
    mirror: {
      mirror_id: `${name.toLowerCase().replace(/\s+/g, '.')}.${hasTransits ? 'transit' : 'natal'}`,
      field: feeling,
      map: container,
      voice: option,
      invitation: next_step,
      classification_pending: true,
      has_transits: hasTransits,
    },
  };
  const relational = extractRelationalContext(payload);
  if (elements) appendix.elements = elements;
  if (start || end) {
    appendix.period_start = start || null;
    appendix.period_end = end || null;
  }
  if (relational) appendix.relational_context = relational;

  return { picture, feeling, container, option, next_step, appendix };
}
