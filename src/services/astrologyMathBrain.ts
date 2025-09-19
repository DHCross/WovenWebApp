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

export async function computeAstrology(req: AstrologyRequest): Promise<AstrologyResponse> {
  const parse = AstrologyRequestSchema.safeParse(req);
  if (!parse.success) {
    return { ok: false, status: 400, error: 'Validation failed', issues: parse.error.issues };
  }
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) {
    return { ok: false, status: 500, error: 'Missing RAPIDAPI_KEY' };
  }
  try {
    const upstream = await fetch(UPSTREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'astrologer.p.rapidapi.com'
      },
      body: JSON.stringify(req)
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
}
