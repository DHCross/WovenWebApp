import { NextResponse } from 'next/server';
import { z } from 'zod';
import { processWithMathBrain } from '@/lib/pipeline/mathBrainAdapter';
import { renderMirrorDraft } from '@/lib/pipeline/mirrorRenderer';

// Permissive schemas for two common inputs
// Common fragments
const NameLike = z.string().min(1).max(200);
const PersonASchema = z
  .object({
    name: NameLike.optional(),
    details: z.object({ name: NameLike.optional() }).partial().optional(),
  })
  .partial();

const ElementsSchema = z
  .record(z.number().finite())
  .refine(
    (rec) => Object.values(rec).every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
    { message: 'elements values must be between 0 and 1' },
  );

const AspectSchema = z
  .object({
    planets: z.array(NameLike).min(2).max(3),
    aspect: NameLike,
    orb: z.number().finite().optional(),
    exact_time: z.string().optional(),
  })
  .partial();

const PeriodSchema = z
  .object({
    start: z.string().optional(),
    end: z.string().optional(),
    elements: ElementsSchema.optional(),
    aspects: z.array(AspectSchema).optional(),
  })
  .partial();

const MirrorContractSchema = z
  .object({
    person_a: PersonASchema.optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  })
  .passthrough();

const MirrorDirectiveSchema = z
  .object({
    _format: z.literal('mirror_directive_json').optional(),
    person_a: PersonASchema.optional(),
    mirror_contract: MirrorContractSchema.optional(),
    contract: z.any().optional(),
  })
  .passthrough()
  .refine(
    (obj) => Boolean(obj._format || obj.person_a || obj.mirror_contract || obj.contract),
    { message: 'mirror directive payload missing required markers' },
  );

const MirrorSymbolicWeatherSchema = z
  .object({
    _format: z.literal('mirror-symbolic-weather-v1').optional(),
    mirror_contract: MirrorContractSchema.optional(),
    contract: z.any().optional(),
    person_a: PersonASchema.optional(),
    symbolic_weather: z
      .object({
        periods: z.array(PeriodSchema).min(1).optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough()
  .refine(
    (obj) => Boolean(obj._format || obj.symbolic_weather || obj.mirror_contract || obj.contract || obj.person_a),
    { message: 'combined mirror+weather payload missing required markers' },
  );

function extractName(payload: any): string | null {
  const a = payload?.person_a || payload?.personA || {};
  return (
    a?.name ||
    a?.details?.name ||
    payload?.mirror_contract?.person_a?.name ||
    null
  );
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

function pickPrimaryElement(elements: Record<string, number> | null): string | null {
  if (!elements) return null;
  const entries = Object.entries(elements).filter(([, v]) => typeof v === 'number');
  if (!entries.length) return null;
  entries.sort((a, b) => (b[1] as number) - (a[1] as number));
  return entries[0][0];
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Accept either mirror directive or combined format
    const isDirective = MirrorDirectiveSchema.safeParse(data).success;
    const isCombined = MirrorSymbolicWeatherSchema.safeParse(data).success;
    if (!isDirective && !isCombined) {
      return NextResponse.json(
        { error: 'Unsupported payload. Provide mirror_directive_json or mirror-symbolic-weather-v1.' },
        { status: 400 },
      );
    }
    // Pipeline: derive minimal geometry, then render mirror draft
    const geometry = await processWithMathBrain(data);
    const draft = await renderMirrorDraft(data, geometry);

    return NextResponse.json({ type: 'mirror', version: '1.0', draft });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing poetic brain request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
