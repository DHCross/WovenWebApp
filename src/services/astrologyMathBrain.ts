import { z } from 'zod';

// Zod schema (align with current Netlify function expectations)
export const AstrologyRequestSchema = z.object({
  personA: z.object({
    name: z.string(),
    year: z.number(),
    month: z.number(),
    day: z.number(),
    hour: z.number().optional(),
    minute: z.number().optional(),
    latitude: z.number(),
    longitude: z.number(),
    city: z.string().optional(),
    state: z.string().optional(),
    nation: z.string().optional(),
    timezone: z.string().optional(),
    zodiac_type: z.string().optional(),
    sidereal_mode: z.string().optional(),
  }),
  personB: z.object({
    name: z.string(),
    year: z.number(),
    month: z.number(),
    day: z.number(),
    hour: z.number().optional(),
    minute: z.number().optional(),
    latitude: z.number(),
    longitude: z.number(),
    city: z.string().optional(),
    state: z.string().optional(),
    nation: z.string().optional(),
    timezone: z.string().optional(),
    zodiac_type: z.string().optional(),
    sidereal_mode: z.string().optional(),
  }).optional(),
  context: z.object({
    mode: z.string().optional()
  }).optional(),
  window: z.object({
    start: z.string(),
    end: z.string(),
    step: z.string().optional()
  }).optional(),
  relationship_context: z.any().optional(),
  orbs_profile: z.string().optional(),
  relocation_mode: z.any().optional(),
  houses_system_identifier: z.string().optional(),
  includeSidereal: z.boolean().optional(),
  default_sidereal_mode: z.string().optional(),
});

export type AstrologyRequest = z.infer<typeof AstrologyRequestSchema>;

export interface AstrologyResponseSuccess {
  ok: true;
  data: any;
}
export interface AstrologyResponseError {
  ok: false;
  status: number;
  error: string;
  issues?: any;
  detail?: any;
}
export type AstrologyResponse = AstrologyResponseSuccess | AstrologyResponseError;

// Upstream invocation (RapidAPI Astrologer)
const UPSTREAM_URL = 'https://astrologer.p.rapidapi.com/api/v2/natal-chart';

type ZodiacVariant = 'Tropic' | 'Sidereal' | null;

function normalizeZodiacType(value?: string | null): 'Tropic' | 'Sidereal' | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.startsWith('sid')) return 'Sidereal';
  if (normalized === 'sideral') return 'Sidereal';
  if (normalized.startsWith('tro')) return 'Tropic';
  return undefined;
}

function normalizeSiderealMode(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.toUpperCase().replace(/[\s-]+/g, '_');
}

function buildVariantPayload(base: Record<string, any>, target: ZodiacVariant, defaultSidereal?: string) {
  const payload = JSON.parse(JSON.stringify(base));
  const defaultMode = normalizeSiderealMode(defaultSidereal);
  (['personA', 'personB'] as const).forEach((key) => {
    const person = payload[key];
    if (!person) return;
    const requestedZodiac = target ?? person.zodiac_type;
    const normalizedZodiac = normalizeZodiacType(requestedZodiac) ?? 'Tropic';
    person.zodiac_type = normalizedZodiac;
    if (normalizedZodiac === 'Sidereal') {
      const explicitMode = normalizeSiderealMode(person.sidereal_mode) || defaultMode || 'LAHIRI';
      person.sidereal_mode = explicitMode;
    } else {
      if (person.sidereal_mode !== undefined) {
        delete person.sidereal_mode;
      }
    }
  });
  return payload;
}

export async function computeAstrology(req: AstrologyRequest): Promise<AstrologyResponse> {
  const parse = AstrologyRequestSchema.safeParse(req);
  if (!parse.success) {
    return { ok: false, status: 400, error: 'Validation failed', issues: parse.error.issues };
  }
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) {
    return { ok: false, status: 500, error: 'Missing RAPIDAPI_KEY' };
  }
  const { includeSidereal = false, default_sidereal_mode, ...baseRequest } = parse.data;

  const callUpstream = async (payload: Record<string, any>): Promise<AstrologyResponse> => {
    try {
      const upstream = await fetch(UPSTREAM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'astrologer.p.rapidapi.com'
        },
        body: JSON.stringify(payload)
      });
      if (!upstream.ok) {
        const text = await upstream.text();
        return { ok: false, status: upstream.status, error: 'Upstream error', detail: text.slice(0, 1500) };
      }
      const data = await upstream.json();
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, status: 500, error: 'Internal error', detail: err?.message || String(err) };
    }
  };

  if (!includeSidereal) {
    const payload = buildVariantPayload(baseRequest as Record<string, any>, null, default_sidereal_mode);
    return callUpstream(payload);
  }

  const tropicalPayload = buildVariantPayload(baseRequest as Record<string, any>, 'Tropic', default_sidereal_mode);
  const siderealPayload = buildVariantPayload(baseRequest as Record<string, any>, 'Sidereal', default_sidereal_mode);

  const [tropical, sidereal] = await Promise.all([
    callUpstream(tropicalPayload),
    callUpstream(siderealPayload)
  ]);

  if (!tropical.ok) {
    return tropical;
  }
  if (!sidereal.ok) {
    return sidereal;
  }

  return {
    ok: true,
    data: {
      tropical: tropical.data,
      sidereal: sidereal.data
    }
  };
}
