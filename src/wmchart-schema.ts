/* Flexible Woven Map Chart Schema (v1 relaxed) */
import { z } from 'zod';

// --- Enums & primitives ---
export const QualityEnum = z.enum(['cardinal','fixed','mutable']);
export const ElementEnum = z.enum(['fire','earth','air','water']);
export const SignEnum = z.enum([
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
]);
export const HouseEnum = z.enum([
  'First_House','Second_House','Third_House','Fourth_House',
  'Fifth_House','Sixth_House','Seventh_House','Eighth_House',
  'Ninth_House','Tenth_House','Eleventh_House','Twelfth_House'
]);

// Accept enum label OR numeric (1..12)
export const HouseFlexible = z.union([HouseEnum, z.number().int().min(1).max(12)]);
export const SchemaVersion = z.string().regex(/^WM-Chart-\d+\.\d+$/);

export const ChartPlanetSchema = z.object({
  name: z.string(),
  quality: QualityEnum.optional(),
  element: ElementEnum.optional(),
  sign: SignEnum.optional(),
  sign_num: z.number().int().min(0).max(11).optional(),
  position: z.number().optional(),
  abs_pos: z.number().optional(),
  emoji: z.string().optional(),
  point_type: z.string().optional(),
  house: HouseFlexible.optional(),
  retrograde: z.boolean().optional()
});

export const AspectSnapshotSchema = z.object({
  planet_a: z.string(),
  planet_b: z.string(),
  abs_pos_a: z.number().optional(),
  abs_pos_b: z.number().optional(),
  aspect_name: z.string(),
  orbit: z.number().nullable().optional(),
  diff: z.number().nullable().optional()
});

export const HousesArraySchema = z.array(z.object({
  name: HouseEnum,
  cusp: z.number()
})).optional();
export const AxialCuspsSchema = z.array(z.object({ axis: z.string(), degree: z.number() })).optional();

export const ChartSnapshotSchema = z.object({
  planets: z.array(ChartPlanetSchema).optional(),
  aspects: z.array(AspectSnapshotSchema).optional(),
  houses: HousesArraySchema,
  axial_cusps: AxialCuspsSchema
});

const OrbBandEnum = z.enum(['tight','close','medium','wide']);
const ValenceHintEnum = z.enum(['hot','cool','neutral_to_hot','neutral_to_cool']);

export const WMAspectSchema = z.object({
  p1_name: z.string(),
  p2_name: z.string(),
  aspect: z.string(),
  orb: z.number().nullable().optional(),
  orbit: z.number().nullable().optional(),
  p1_house: z.number().nullable().optional(),
  p2_house: z.number().nullable().optional(),
  p1_is_retrograde: z.boolean().optional(),
  p2_is_retrograde: z.boolean().optional(),
  orb_band: OrbBandEnum.optional(),
  valence_hint: ValenceHintEnum.optional()
}).transform(r => ({ ...r, orb: r.orb ?? r.orbit ?? null }));

export const WMTransitAspectSchema = z.object({
  transit_body: z.string(),
  natal_target: z.string(),
  aspect: z.string(),
  orb: z.number().nullable().optional(),
  orbit: z.number().nullable().optional(),
  orb_band: OrbBandEnum.optional(),
  valence_hint: ValenceHintEnum.optional(),
  transit_house: z.number().nullable().optional(),
  natal_house: z.number().nullable().optional(),
  transit_is_retrograde: z.boolean().optional(),
  natal_is_retrograde: z.boolean().optional(),
  transit_lon: z.number().nullable().optional(),
  natal_lon: z.number().nullable().optional()
}).transform(r => ({ ...r, orb: r.orb ?? r.orbit ?? null }));

export const ChartOrTransitRow = z.union([
  z.object({
    kind: z.literal('snapshot').optional(),
    person: z.enum(['person_a','person_b']).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    location_type: z.enum(['birth','relocated']).optional(),
    chart: ChartSnapshotSchema
  }),
  WMTransitAspectSchema,
  WMAspectSchema
]);

const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const TransitsByDateSchema = z.record(ISODate, z.union([
  z.array(ChartOrTransitRow),
  z.object({ aspects: z.array(ChartOrTransitRow).optional(), seismograph: z.any().optional() })
]));

const PersonDetailsSchema = z.object({
  name: z.string(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  birth_time: z.string().optional(),
  birth_city: z.string().optional(),
  birth_state: z.string().optional(),
  birth_country: z.string().optional(),
  birth_coordinates: z.string().optional(),
  timezone: z.string().optional(),
  zodiac_type: z.enum(['Tropic','Sidereal']).optional()
});

const PersonBlockSchema = z.object({
  details: PersonDetailsSchema.optional(),
  chart: ChartSnapshotSchema.optional(),
  aspects: z.array(z.union([AspectSnapshotSchema, WMAspectSchema])).optional(),
  derived: z.any().optional(),
  transit_data: z.any().optional()
});

export const WMChartRootSchema = z.object({
  schema: SchemaVersion.optional(),
  relationship_type: z.enum(['partner','friend','family']).optional(),
  intimacy_tier: z.enum(['P1','P2','P3']).optional(),
  diagnostics: z.any().optional(),
  person_a: PersonBlockSchema,
  person_b: PersonBlockSchema.optional(),
  transitsByDate: TransitsByDateSchema.optional(),
  byDate: TransitsByDateSchema.optional(),
  transits: z.array(ChartOrTransitRow).optional(),
  synastry: z.any().optional(),
  composite: z.any().optional()
});

export type WMChartRoot = z.infer<typeof WMChartRootSchema>;
export type ChartOrTransit = z.infer<typeof ChartOrTransitRow>;

export function safeParseRoot(data: unknown) {
  const res = WMChartRootSchema.safeParse(data);
  if (res.success) return { success: true as const, data: res.data };
  return { success: false as const, error: res.error.format() };
}

export function coalesceTransitsByDate(root: any) { return root?.transitsByDate ?? root?.byDate ?? {}; }
export function normalizeTransitDateBlock(value: any): ChartOrTransit[] {
  if (Array.isArray(value)) return value as ChartOrTransit[];
  if (value && Array.isArray(value.aspects)) return value.aspects as ChartOrTransit[];
  return [];
}
export function pickTransitsView(root: any) {
  const dict = coalesceTransitsByDate(root);
  const byDate: Record<string, ChartOrTransit[]> = {};
  for (const [date, val] of Object.entries(dict)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) byDate[date] = normalizeTransitDateBlock(val);
  }
  const flat = Object.values(byDate).reduce<ChartOrTransit[]>((acc, arr) => acc.concat(arr), []);
  return { byDate, flat };
}
export function flattenRows<T>(arr: T[][]): T[] { return arr.reduce((a,v)=>a.concat(v), [] as T[]); }
export function checkTransitsRedundancy(root: any) {
  const dict = coalesceTransitsByDate(root);
  const flat = root?.transits;
  if (dict && flat) {
    const dictCount = Object.values(dict).reduce((s: number, v: any) => s + normalizeTransitDateBlock(v).length, 0);
    if (dictCount !== flat.length) throw new Error(`Transit redundancy mismatch: byDate=${dictCount} vs flat=${flat.length}`);
  }
}
export function normalizeAspectRow(row: any) { if (row && row.orb == null && typeof row.orbit === 'number') row.orb = row.orbit; return row; }
export function normalizeAllTransits(root: any) { const { byDate } = pickTransitsView(root); for (const k of Object.keys(byDate)) byDate[k] = byDate[k].map(normalizeAspectRow); return byDate; }
