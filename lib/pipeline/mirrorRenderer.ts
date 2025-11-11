import { z } from 'zod';
import type { NormalizedGeometry, NormalizedAspect } from '../raven/normalize';

export interface MirrorDraft {
  metadata_banner?: string;
  picture: string;
  feeling: string;
  container: string;
  option: string;
  next_step: string;
  appendix?: {
    window?: { start?: string; end?: string };
    recognition_trace?: RecognitionTrace;
    relational_context?: Record<string, any>;
    symbolic_footnotes?: string[];
    primary_element?: string | null;
    _metadata?: {
      payload_shape: string[];
      relational: boolean;
      person_a_name?: string;
      person_b_name?: string;
      truncation_warning?: string;
    };
  };
}

interface MirrorRenderContext {
  payload: MirrorPayload;
  geometry: NormalizedGeometry;
  header: WovenHeader | null;
  subjectName: string;
  window: { start?: string; end?: string };
  elements: Record<string, number> | null;
  primaryElement: ElementKey | null;
  primaryModality: ModalityKey | null;
  hasTransitWindow: boolean;
  recognitionTrace: RecognitionTrace;
}

type ElementKey = 'Fire' | 'Earth' | 'Air' | 'Water';
type ModalityKey = 'Cardinal' | 'Fixed' | 'Mutable';

interface RecognitionTrace {
  dominant_aspects: string[];
  angular_contacts: string[];
  anchors: string[];
}

interface WovenHeader {
  mode?: string;
  subject_name?: string;
  reader_id?: string;
  include_persona_context?: boolean;
  map_source?: string;
  integration_mode?: string;
  reference_date?: string;
  relational_context?: Record<string, any>;
}

const headerSchema = z
  .object({
    mode: z.string().optional(),
    subject_name: z.string().optional(),
    reader_id: z.string().optional(),
    include_persona_context: z.boolean().optional(),
    map_source: z.string().optional(),
    integration_mode: z.string().optional(),
    reference_date: z.string().optional(),
    relational_context: z.record(z.any()).optional(),
  })
  .passthrough();

const personSchema = z
  .object({
    name: z.string().optional(),
    birth_data: z.any().optional(),
    chart: z.any().optional(),
    aspects: z.array(z.any()).optional(),
    natal_chart: z.any().optional(),
    details: z.any().optional(),
    summary: z.any().optional(),
  })
  .passthrough();

const contractSchema = z
  .object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    report_kind: z.string().optional(),
    intimacy_tier: z.string().optional(),
    relationship_type: z.string().optional(),
    is_relational: z.boolean().optional(),
    is_natal_only: z.boolean().optional(),
    person_a: personSchema.optional(),
    person_b: personSchema.optional(),
  })
  .passthrough()
  .optional();

const periodSchema = z
  .object({
    start: z.string().optional(),
    end: z.string().optional(),
    elements: z.record(z.number()).optional(),
  })
  .passthrough();

const mirrorPayloadSchema = z
  .object({
    person_a: personSchema.optional(),
    person_b: personSchema.optional(),
    mirror_contract: contractSchema,
    Woven_Header: headerSchema.optional(),
    'Woven Header': headerSchema.optional(),
    WovenHeader: headerSchema.optional(),
    symbolic_weather: z
      .object({
        periods: z.array(periodSchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type MirrorPayload = z.infer<typeof mirrorPayloadSchema>;

export async function renderMirrorDraft(payloadInput: unknown, geometry: NormalizedGeometry): Promise<MirrorDraft> {
  const payload = validateMirrorPayload(payloadInput);
  const context = enrichContext(payload, geometry);
  const localDraft = buildLocalDraft(context);
  const remoteDraft = await maybeRenderViaRaven(context, localDraft);
  return remoteDraft ?? localDraft;
}

function validateMirrorPayload(payload: unknown): MirrorPayload {
  try {
    return mirrorPayloadSchema.parse(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error';
    throw new Error(`Mirror payload failed validation: ${message}`);
  }
}

function enrichContext(payload: MirrorPayload, geometry: NormalizedGeometry): MirrorRenderContext {
  const header = resolveHeader(payload);
  const subjectName = resolveSubjectName(payload, header);
  const window = resolveWindow(payload);
  const elements = resolveElements(payload);
  const primaryElement = resolvePrimaryElement(elements, geometry);
  const primaryModality = resolvePrimaryModality(geometry);
  const recognitionTrace = buildRecognitionTrace(geometry);

  return {
    payload,
    geometry,
    header,
    subjectName,
    window,
    elements,
    primaryElement,
    primaryModality,
    hasTransitWindow: Boolean(window.start && window.end),
    recognitionTrace,
  };
}

function resolveHeader(payload: MirrorPayload): WovenHeader | null {
  const candidate =
    payload.Woven_Header || payload['Woven Header'] || payload.WovenHeader || (payload as any).wovenHeader || null;
  if (!candidate || typeof candidate !== 'object') return null;
  const parsed = headerSchema.safeParse(candidate);
  return parsed.success ? (parsed.data as WovenHeader) : null;
}

function resolveSubjectName(payload: MirrorPayload, header: WovenHeader | null): string {
  if (header?.subject_name) return header.subject_name;
  const contractName = payload.mirror_contract?.person_a?.name ?? payload.mirror_contract?.person_a?.details?.name;
  if (contractName) return contractName;
  return payload.person_a?.name ?? payload.person_a?.details?.name ?? 'Person A';
}

function resolveWindow(payload: MirrorPayload): { start?: string; end?: string } {
  const periods = payload.symbolic_weather?.periods ?? [];
  const symbolic = periods.length > 0 ? periods[0] : undefined;
  return {
    start: payload.mirror_contract?.start_date ?? symbolic?.start,
    end: payload.mirror_contract?.end_date ?? symbolic?.end,
  };
}

function resolveElements(payload: MirrorPayload): Record<string, number> | null {
  const period = payload.symbolic_weather?.periods?.[0];
  if (period?.elements && typeof period.elements === 'object') {
    return period.elements;
  }
  return null;
}

function resolvePrimaryElement(
  elements: Record<string, number> | null,
  geometry: NormalizedGeometry
): ElementKey | null {
  if (elements) {
    const entries = Object.entries(elements).filter(([, value]) => typeof value === 'number');
    if (entries.length) {
      entries.sort((a, b) => (b[1] as number) - (a[1] as number));
      const candidate = normalizeElementKey(entries[0][0]);
      if (candidate) return candidate;
    }
  }
  return normalizeElementKey(geometry.summary.dominantElement ?? null);
}

function resolvePrimaryModality(geometry: NormalizedGeometry): ModalityKey | null {
  return normalizeModalityKey(geometry.summary.dominantModality ?? null);
}

function normalizeElementKey(input: string | null | undefined): ElementKey | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  switch (normalized) {
    case 'fire':
      return 'Fire';
    case 'earth':
      return 'Earth';
    case 'air':
      return 'Air';
    case 'water':
      return 'Water';
    default:
      return null;
  }
}

function normalizeModalityKey(input: string | null | undefined): ModalityKey | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  switch (normalized) {
    case 'cardinal':
      return 'Cardinal';
    case 'fixed':
      return 'Fixed';
    case 'mutable':
      return 'Mutable';
    default:
      return null;
  }
}

function buildRecognitionTrace(geometry: NormalizedGeometry): RecognitionTrace {
  const aspects = geometry.aspects || [];
  const dominant = aspects
    .filter((aspect) => typeof aspect.orb === 'number' && Math.abs(aspect.orb) <= 3)
    .slice(0, 5)
    .map(formatAspectSummary);

  const angularBodies = new Set(['Ascendant', 'Descendant', 'Midheaven', 'Imum Coeli', 'ASC', 'DSC', 'MC', 'IC']);
  const angular = aspects
    .filter((aspect) => angularBodies.has(aspect.from) || angularBodies.has(aspect.to))
    .slice(0, 5)
    .map(formatAspectSummary);

  const anchors = aspects
    .filter((aspect) => aspect.type.toLowerCase() === 'conjunction' && typeof aspect.orb === 'number' && Math.abs(aspect.orb) <= 2)
    .slice(0, 5)
    .map(formatAspectSummary);

  return {
    dominant_aspects: dominant,
    angular_contacts: angular,
    anchors,
  };
}

function formatAspectSummary(aspect: NormalizedAspect): string {
  const base = `${aspect.from} ${aspect.type.toLowerCase()} ${aspect.to}`;
  if (typeof aspect.orb === 'number') {
    return `${base} (${aspect.orb.toFixed(2)}° orb)`;
  }
  return base;
}

function buildLocalDraft(context: MirrorRenderContext): MirrorDraft {
  const picture = buildPicture(context);
  const feeling = buildFeeling(context);
  const container = buildContainer(context);
  const option = buildVoiceOption(context);
  const nextStep = buildNextStep(context);
  const metadata = buildMetadataSnapshot(context);
  const appendix = buildAppendix(context, metadata);
  const metadataBanner = buildMetadataBanner(metadata);

  validateEPrimeIntegrity({ feeling, container, option });

  return {
    metadata_banner: metadataBanner,
    picture,
    feeling,
    container,
    option,
    next_step: nextStep,
    appendix,
  };
}

const ELEMENT_FEELING_TONES: Record<ElementKey, string> = {
  Fire: 'A quickening like heat catching dry tinder—pressurised urgency that wants motion.',
  Earth: 'Dense weight like roots taking hold—structure seeking deliberate pacing.',
  Air: 'A shifting current of thought—movement that invites dialogue instead of scatter.',
  Water: "A tidal pull toward depth—pressure that invites immersion rather than avoidance.",
};

const ELEMENT_OPTION_TONES: Record<ElementKey, string> = {
  Fire: 'Name one motion you can initiate so the heat moves through action instead of simmering.',
  Earth: 'Choose one tangible anchor to steady the system and watch how the pattern lands.',
  Air: 'Speak or write the loop you keep rehearsing; give the wind a channel.',
  Water: 'Pour the feeling into music, water, or quiet reflection so it stays mobile.',
};

const MODALITY_NEXT_TONES: Record<ModalityKey, string> = {
  Cardinal: 'Log one moment you choose action over rumination within the next day.',
  Fixed: 'Notice where you clamp down; loosen one notch and observe the result.',
  Mutable: 'Track one lane change you accept intentionally instead of by drift.',
};

function buildPicture(context: MirrorRenderContext): string {
  const lines = [
    context.window.start && context.window.end ? `Window ${context.window.start} → ${context.window.end}` : null,
    context.primaryElement ? `Elemental emphasis: ${context.primaryElement}` : null,
    `Mirror prepared for ${context.subjectName}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return lines;
}

function buildFeeling(context: MirrorRenderContext): string {
  if (context.primaryElement && ELEMENT_FEELING_TONES[context.primaryElement]) {
    return ELEMENT_FEELING_TONES[context.primaryElement];
  }
  return 'A point of balance—still water under a clear sky. Quiet pressure that holds potential rather than absence.';
}

function buildContainer(context: MirrorRenderContext): string {
  if (context.hasTransitWindow) {
    return 'Long-wave structure (natal geometry) meeting short-wave activation (transit window). The tension sketches a fulcrum rather than a fault.';
  }
  return 'Long-wave structure only (natal baseline). The permanent inner geometry naming how you meet the world.';
}

function buildVoiceOption(context: MirrorRenderContext): string {
  if (context.primaryElement && ELEMENT_OPTION_TONES[context.primaryElement]) {
    return ELEMENT_OPTION_TONES[context.primaryElement];
  }
  return 'Treat the pattern as a hypothesis: notice one concrete moment today where it appears and document what shifts.';
}

function buildNextStep(context: MirrorRenderContext): string {
  if (context.primaryModality && MODALITY_NEXT_TONES[context.primaryModality]) {
    return MODALITY_NEXT_TONES[context.primaryModality];
  }
  return 'Choose a small, reversible act in the next 24 hours and note whether it lands as WB, ABE, or OSR.';
}

function buildAppendix(context: MirrorRenderContext, metadata: MirrorMetadataSnapshot): MirrorDraft['appendix'] {
  return {
    _metadata: {
      payload_shape: metadata.payloadShape,
      relational: metadata.relational,
      person_a_name: metadata.personAName,
      person_b_name: metadata.personBName,
      truncation_warning: metadata.truncationWarning,
    },
    window: context.window,
    recognition_trace: context.recognitionTrace,
    relational_context: context.header?.relational_context,
    symbolic_footnotes: buildSymbolicFootnotes(context.geometry),
    primary_element: context.primaryElement,
  };
}

interface MirrorMetadataSnapshot {
  payloadShape: string[];
  relational: boolean;
  personAName: string;
  personBName?: string;
  truncationWarning?: string;
}

function buildMetadataSnapshot(context: MirrorRenderContext): MirrorMetadataSnapshot {
  const payloadShape = Object.entries(context.payload)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key]) => key);
  const relational =
    Boolean(context.payload.person_b) ||
    Boolean(context.payload.mirror_contract?.person_b) ||
    Boolean(context.header?.relational_context);
  const personAName =
    context.payload.person_a?.name ??
    context.payload.person_a?.details?.name ??
    context.payload.mirror_contract?.person_a?.name ??
    'Person A';
  const personBName = relational
    ? context.payload.person_b?.name ??
      context.payload.person_b?.details?.name ??
      context.payload.mirror_contract?.person_b?.name ??
      'Person B'
    : undefined;
  const truncationWarning = relational
    ? 'RELATIONAL READING: Payload contains both person_a and person_b. If only one party is visible, the file was truncated.'
    : undefined;

  return {
    payloadShape,
    relational,
    personAName,
    personBName,
    truncationWarning,
  };
}

function buildMetadataBanner(metadata: MirrorMetadataSnapshot): string {
  const relationalNote = metadata.relational
    ? `RELATIONAL ▸ ${metadata.personAName} ↔ ${metadata.personBName ?? 'Person B'}`
    : `SOLO ▸ ${metadata.personAName}`;
  const fieldList = metadata.payloadShape.length ? metadata.payloadShape.join(', ') : 'no payload fields detected';
  const warning = metadata.truncationWarning ? ` — ${metadata.truncationWarning}` : '';
  return `METADATA ▸ ${relationalNote} • payload fields: ${fieldList}${warning}`;
}

function buildSymbolicFootnotes(geometry: NormalizedGeometry): string[] {
  if (!geometry.aspects || geometry.aspects.length === 0) return [];
  return geometry.aspects.slice(0, 8).map((aspect, index) => {
    const orb = typeof aspect.orb === 'number' ? `${aspect.orb.toFixed(2)}°` : 'orb N/A';
    return `${index + 1}. ${aspect.from} ${aspect.type.toLowerCase()} ${aspect.to} (${orb})`;
  });
}

function validateEPrimeIntegrity(segments: Record<string, string>): void {
  const patterns = [/\bis\b/i, /\bare\b/i, /\bwas\b/i, /\bwere\b/i, /\bbeing\b/i, /\bbeen\b/i];
  const violations: string[] = [];
  for (const [label, text] of Object.entries(segments)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        violations.push(`${label} contains prohibited copula term`);
        break;
      }
    }
  }
  if (violations.length) {
    console.warn('[MirrorRenderer] E-Prime integrity warnings:', violations);
  }
}

async function maybeRenderViaRaven(context: MirrorRenderContext, localDraft: MirrorDraft): Promise<MirrorDraft | null> {
  if (process.env.RAVEN_RENDER_INTEGRATION === '0') return null;
  try {
    const mod: any = await import('@/lib/raven/render').catch(() => null);
    const renderFn: any = mod?.renderShareableMirror || mod?.renderMirror || mod?.default;
    if (typeof renderFn !== 'function') return null;

    const prov = buildProvenance(context);
    const options = buildRenderOptions(context);
    const remoteDraft = await renderFn({ geo: context.geometry, prov, options });
    if (!remoteDraft || typeof remoteDraft !== 'object') {
      return null;
    }
    return mergeDrafts(localDraft, remoteDraft);
  } catch (error) {
    console.warn('[MirrorRenderer] Remote render unavailable, falling back to local draft', error);
    return null;
  }
}

function buildProvenance(context: MirrorRenderContext) {
  return {
    source: 'Poetic Brain Pipeline',
    reader_id: context.header?.reader_id,
    subject_name: context.subjectName,
    reference_date: context.header?.reference_date ?? context.window.end ?? context.window.start,
    integration_mode: context.header?.integration_mode,
    relational_context: context.header?.relational_context,
    balance_meter_version: 'n/a',
    metrics_unavailable: true,
  };
}

function buildRenderOptions(context: MirrorRenderContext) {
  return {
    mode: context.header?.mode,
    include_persona_context: context.header?.include_persona_context,
    map_source: context.header?.map_source,
    relational_context: context.header?.relational_context,
    geometryValidated: true,
    person_a: context.payload.person_a,
    person_b: context.payload.person_b,
    mirror_contract: context.payload.mirror_contract,
    symbolic_weather: context.payload.symbolic_weather,
  };
}

function mergeDrafts(localDraft: MirrorDraft, remoteDraft: Record<string, any>): MirrorDraft {
  return {
    metadata_banner: localDraft.metadata_banner,
    picture: remoteDraft.picture ?? localDraft.picture,
    feeling: remoteDraft.feeling ?? localDraft.feeling,
    container: remoteDraft.container ?? localDraft.container,
    option: remoteDraft.option ?? localDraft.option,
    next_step: remoteDraft.next_step ?? localDraft.next_step,
    appendix: {
      ...(localDraft.appendix || {}),
      ...(remoteDraft.appendix || {}),
    },
  };
}
