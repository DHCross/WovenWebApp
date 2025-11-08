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

export async function renderMirrorDraft(payload: any, geometry: NormalizedGeometry): Promise<Record<string, any>> {
  // Attempt to use the existing Raven renderer when available. Fallback to local draft otherwise.
  try {
    // Allow opt-out via env if needed
    const allowIntegration = process.env.RAVEN_RENDER_INTEGRATION !== '0';
    if (allowIntegration) {
      // Dynamic import to avoid build-time hard dependency in minimal test harnesses
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      const mod: any = await import('@/lib/raven/render').catch(() => null);
      const renderFn: any = mod?.renderShareableMirror || mod?.renderMirror || mod?.default;
      if (typeof renderFn === 'function') {
        const header = extractWovenHeader(payload);
        // Compute relational placeholders if relational context present
        let relational: Record<string, any> | undefined;
        try {
          const hasRel = Boolean(header?.relational_context) || Boolean(payload?.person_b);
          if (hasRel) {
            relational = await analyzeRelationship(payload, geometry, header);
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

  const picture = [
    start && end ? `Window ${start} → ${end}` : null,
    primary ? `Elemental emphasis: ${primary}` : null,
    `Mirror prepared for ${name}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const feeling = primary
    ? `Feels like ${primary} leaning through this window—track how that shows up today.`
    : `Feels steady; check where the pattern actually shows in your day.`;

  const container = `Treat this as a natal/period mirror. Use it to notice tensions and name one concrete signal.`;
  const option = `Pick one move that would test this mirror in the next 24 hours.`;
  const next_step = `If this lands, what single moment confirms it—WB, ABE, or OSR?`;

  // Generate fallback reader_markdown with both precision and metaphor
  const aspectCount = geometry?.aspects?.length ?? 0;
  const aspectSummary = aspectCount > 0
    ? geometry.aspects.map((a: any) => `${a.from}–${a.to} ${a.type}${a.orb ? ` (${a.orb}° orb)` : ''}`).join(', ')
    : 'No aspects detected';

  const readerMarkdown = `# Mirror Reading for ${name}

## Geometric Overview

The chart geometry shows ${aspectCount} aspect${aspectCount !== 1 ? 's' : ''} in this configuration: ${aspectSummary}.

${primary ? `The dominant elemental pressure leans toward **${primary}**, creating a climate where ${primary === 'fire' ? 'initiative and momentum' : primary === 'earth' ? 'structure and grounding' : primary === 'air' ? 'connection and flow' : 'depth and feeling'} may surface more readily.` : 'The elemental distribution shows balanced pressure across all quadrants.'}

## Current Weather

${start && end ? `This reading covers the period from ${start} to ${end}, tracking how symbolic weather moves through your natal geometry.` : 'This reading reflects your natal baseline—the permanent structure that shapes how transiting weather moves through your chart.'}

The aspects above create friction points and flow channels. Watch for moments when these geometric tensions surface as lived experience—that's where the mirror becomes testable.

## What to Track

Notice where ${primary || 'the elemental balance'} shows up in your day. The geometry suggests certain patterns may appear, but only your lived experience confirms whether these aspects translate to actual pressure or ease.

Test this mirror by naming one concrete moment where you felt the pull of these patterns. That's your falsifiability check.`;

  const appendix: Record<string, any> = { 
    aspects: geometry?.aspects ?? [],
    reader_markdown: readerMarkdown
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
