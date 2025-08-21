/** ES5-compatible array flattening for array of arrays */
function flatten<T>(arr: T[][]): T[] {
  return arr.reduce(function(acc, val) {
    return acc.concat(val);
  }, []);
}
import { z } from "zod";

export type ZodiacQuality = "cardinal" | "fixed" | "mutable";
export type Element = "fire" | "earth" | "air" | "water";
export type Sign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";
export type House =
  | "First_House" | "Second_House" | "Third_House" | "Fourth_House"
  | "Fifth_House" | "Sixth_House" | "Seventh_House" | "Eighth_House"
  | "Ninth_House" | "Tenth_House" | "Eleventh_House" | "Twelfth_House";

// ---------- Shared enums & lean geometry schemas ----------
export const QualityEnum = z.enum(["cardinal", "fixed", "mutable"]);
export const ElementEnum = z.enum(["fire", "earth", "air", "water"]);
export const SignEnum = z.enum([
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]);
export const HouseEnum = z.enum([
  "First_House", "Second_House", "Third_House", "Fourth_House",
  "Fifth_House", "Sixth_House", "Seventh_House", "Eighth_House",
  "Ninth_House", "Tenth_House", "Eleventh_House", "Twelfth_House"
]);

// Full chart "planet" snapshot (existing strict shape, extracted to reuse)
export const ChartPlanetSchema = z.object({
  name: z.string(),
  quality: QualityEnum,
  element: ElementEnum,
  sign: SignEnum,
  sign_num: z.number().int().min(0).max(11),
  position: z.number(),
  abs_pos: z.number(),
  emoji: z.string().optional(),
  point_type: z.string().optional(),
  house: HouseEnum,
  retrograde: z.boolean()
});

// Full chart "aspect" snapshot (existing strict shape, extracted to reuse)
export const AspectSnapshotSchema = z.object({
  planet_a: z.string(),
  planet_b: z.string(),
  abs_pos_a: z.number(),
  abs_pos_b: z.number(),
  aspect_name: z.string(),
  orbit: z.number(),
  diff: z.number()
});

// Houses / cusps blocks (extracted to reuse)
const HousesArraySchema = z.array(z.object({
  name: HouseEnum,
  cusp: z.number()
})).optional();

const AxialCuspsSchema = z.array(z.object({
  axis: z.string(),
  degree: z.number()
})).optional();

// Full chart snapshot (planets + aspects [+ houses/cusps])
export const ChartSnapshotSchema = z.object({
  planets: z.array(ChartPlanetSchema),
  aspects: z.array(AspectSnapshotSchema),
  houses: HousesArraySchema,
  axial_cusps: AxialCuspsSchema
});

// ---------- Lean WM geometry (mapper output) ----------
const OrbBandEnum = z.enum(["tight","close","medium","wide"]);
const ValenceHintEnum = z.enum(["hot","cool","neutral_to_hot","neutral_to_cool"]);

export const WMAspectSchema = z.object({
  p1_name: z.string(),
  p2_name: z.string(),
  aspect: z.string(),
  orb: z.number(),
  p1_house: z.number().optional(),
  p2_house: z.number().optional(),
  p1_is_retrograde: z.boolean().optional(),
  p2_is_retrograde: z.boolean().optional(),
  orb_band: OrbBandEnum,
  valence_hint: ValenceHintEnum
});

export const WMTransitAspectSchema = z.object({
  transit_body: z.string(),
  natal_target: z.string(),
  aspect: z.string(),
  orb: z.number(),
  orb_band: OrbBandEnum,
  valence_hint: ValenceHintEnum,
  transit_house: z.number().nullable().optional(),
  natal_house: z.number().nullable().optional(),
  transit_is_retrograde: z.boolean().optional(),
  natal_is_retrograde: z.boolean().optional(),
  transit_lon: z.number().nullable().optional(),
  natal_lon: z.number().nullable().optional()
});

// A union used where "chart snapshot OR lean rows" are acceptable
export const ChartOrTransitRow = z.union([
  z.object({
    person: z.enum(["person_a", "person_b"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    location_type: z.enum(["birth", "relocated"]),
    chart: ChartSnapshotSchema
  }),
  WMTransitAspectSchema
]);

// Shared "by date" record schema (accept either key name: transitsByDate or byDate)
const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const TransitsByDateSchema = z.record(ISODate, z.array(ChartOrTransitRow));

// Helper to coalesce either alias at runtime
export function coalesceTransitsByDate(root: any) {
  return root?.transitsByDate ?? root?.byDate ?? {};
}

export const WMChartRootSchema = z.object({
  schema: z.literal("WM-Chart-1.0"),
  relationship_type: z.enum(["partner", "friend", "family"]),
  intimacy_tier: z.enum(["P1", "P2", "P3"]).optional(),
  diagnostics: z.array(z.record(z.string(), z.any())).optional(),
  person_a: z.object({
    details: z.object({
      name: z.string(),
      birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO
      birth_time: z.string(),
      birth_city: z.string(),
      birth_state: z.string(),
      birth_country: z.string(),
      birth_coordinates: z.string(),
      timezone: z.string(),
      zodiac_type: z.enum(["Tropic", "Sidereal"])
    }),
    chart: z.object({
      planets: z.array(ChartPlanetSchema),
      aspects: z.array(z.union([AspectSnapshotSchema, WMAspectSchema])),
      houses: HousesArraySchema,
      axial_cusps: AxialCuspsSchema
    })
  }),
  person_b: z.object({
    details: z.object({
      name: z.string(),
      birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      birth_time: z.string(),
      birth_city: z.string(),
      birth_state: z.string(),
      birth_country: z.string(),
      birth_coordinates: z.string(),
      timezone: z.string(),
      zodiac_type: z.enum(["Tropic", "Sidereal"])
    }),
    chart: z.object({
      planets: z.array(ChartPlanetSchema),
      aspects: z.array(z.union([AspectSnapshotSchema, WMAspectSchema])),
      houses: HousesArraySchema,
      axial_cusps: AxialCuspsSchema
    })
  }).optional(),
  // Accept either the canonical name or the legacy alias
  transitsByDate: TransitsByDateSchema.optional(),
  byDate: TransitsByDateSchema.optional(),
  transits: z.array(ChartOrTransitRow).optional()
});

// Redundancy rule runtime check
export function checkTransitsRedundancy(root: any) {
  // Note: treat `byDate` as an alias of `transitsByDate`
  const dict = root?.transitsByDate ?? root?.byDate;
  const flat = root?.transits;

  // Require at least one to be present
  if (!dict && !flat) {
    throw new Error("At least one of transits/transitsByDate (or byDate) must be present");
  }

  // If both are present, they must be deeply equal after flattening the dict
  if (dict && flat) {
  const flattened = JSON.stringify(flatten(Object.values(dict) as ChartOrTransit[][]));
    const flattenedFlat = JSON.stringify(flat);
    if (flattened !== flattenedFlat) {
      throw new Error("transits and transitsByDate/byDate must be deeply equal if both are present");
    }
  }
}

// ---------- Runtime type guards & typed helpers ----------

export type WMTransitAspect = z.infer<typeof WMTransitAspectSchema>;
export type WMAspect = z.infer<typeof WMAspectSchema>;
export type ChartSnapshot = z.infer<typeof ChartSnapshotSchema>;
export type ChartOrTransit = z.infer<typeof ChartOrTransitRow>;
export type TransitsByDate = z.infer<typeof TransitsByDateSchema>;
export type WMChartRoot = z.infer<typeof WMChartRootSchema>;

/** Narrowers (type guards) */
export const isWMTransitAspect = (v: unknown): v is WMTransitAspect =>
  WMTransitAspectSchema.safeParse(v).success;

export const isWMAspect = (v: unknown): v is WMAspect =>
  WMAspectSchema.safeParse(v).success;

export const isChartSnapshot = (v: unknown): v is ChartSnapshot =>
  ChartSnapshotSchema.safeParse(v).success;

export const isChartOrTransit = (v: unknown): v is ChartOrTransit =>
  ChartOrTransitRow.safeParse(v).success;

export const isTransitsByDate = (v: unknown): v is TransitsByDate =>
  TransitsByDateSchema.safeParse(v).success;

export const isWMChartRoot = (v: unknown): v is WMChartRoot =>
  WMChartRootSchema.safeParse(v).success;

/** Assertions (throw on invalid) */
export function assertWMChartRoot(v: unknown): asserts v is WMChartRoot {
  const res = WMChartRootSchema.safeParse(v);
  if (!res.success) {
    // Using zod's .format() keeps messages compact but precise
    throw new Error("Invalid WMChartRoot: " + JSON.stringify(res.error.format()));
  }
}

/** Get a typed-byDate dictionary, tolerant of aliasing (`byDate` vs `transitsByDate`). */
export function getTransitsByDate(root: unknown): Record<string, ChartOrTransit[]> {
  // Prefer full-root parse for maximum fidelity
  const parsedRoot = WMChartRootSchema.safeParse(root);
  if (parsedRoot.success) {
    return (parsedRoot.data.transitsByDate ?? parsedRoot.data.byDate) ?? {};
  }
  // Fall back to best-effort coalescing using whatever keys exist
  const dict = coalesceTransitsByDate(root as any);
  const parsedDict = TransitsByDateSchema.safeParse(dict);
  return parsedDict.success ? parsedDict.data : {};
}

/** Flatten a byDate dictionary into a single array of rows. */
export function flattenTransitsByDate(dict: unknown): ChartOrTransit[] {
  const parsed = TransitsByDateSchema.safeParse(dict);
  return parsed.success ? flatten(Object.values(parsed.data) as ChartOrTransit[][]) : [];
}

/** Pick a normalized transits view from an arbitrary root shape. */
export function pickTransitsView(root: unknown): {
  byDate: Record<string, ChartOrTransit[]>;
  flat: ChartOrTransit[];
} {
  const byDate = getTransitsByDate(root);
  const flat = flatten(Object.values(byDate) as ChartOrTransit[][]);
  return { byDate, flat };
}
