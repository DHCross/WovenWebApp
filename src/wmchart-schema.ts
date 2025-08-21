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
const QualityEnum = z.enum(["cardinal", "fixed", "mutable"]);
const ElementEnum = z.enum(["fire", "earth", "air", "water"]);
const SignEnum = z.enum([
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]);
const HouseEnum = z.enum([
  "First_House", "Second_House", "Third_House", "Fourth_House",
  "Fifth_House", "Sixth_House", "Seventh_House", "Eighth_House",
  "Ninth_House", "Tenth_House", "Eleventh_House", "Twelfth_House"
]);

// Full chart "planet" snapshot (existing strict shape, extracted to reuse)
const ChartPlanetSchema = z.object({
  name: z.string(),
  quality: QualityEnum,
  element: ElementEnum,
  sign: SignEnum,
  sign_num: z.number().int().min(0).max(11),
  position: z.number(),
  abs_pos: z.number(),
  emoji: z.string(),
  point_type: z.string(),
  house: HouseEnum,
  retrograde: z.boolean()
});

// Full chart "aspect" snapshot (existing strict shape, extracted to reuse)
const AspectSnapshotSchema = z.object({
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
const ChartSnapshotSchema = z.object({
  planets: z.array(ChartPlanetSchema),
  aspects: z.array(AspectSnapshotSchema),
  houses: HousesArraySchema,
  axial_cusps: AxialCuspsSchema
});

// ---------- Lean WM geometry (mapper output) ----------
const OrbBandEnum = z.enum(["tight","close","medium","wide"]);
const ValenceHintEnum = z.enum(["hot","cool","neutral_to_hot","neutral_to_cool"]);

const WMAspectSchema = z.object({
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

const WMTransitAspectSchema = z.object({
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
const ChartOrTransitRow = z.union([
  z.object({
    person: z.enum(["person_a", "person_b"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    location_type: z.enum(["birth", "relocated"]),
    chart: ChartSnapshotSchema
  }),
  WMTransitAspectSchema
]);

export const WMChartRootSchema = z.object({
  schema: z.literal("WM-Chart-1.0"),
  relationship_type: z.enum(["partner", "friend", "family"]),
  intimacy_tier: z.enum(["P1", "P2", "P3"]).optional(),
  diagnostics: z.array(z.record(z.any())).optional(),
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
  }),
  transitsByDate: z.record(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.array(ChartOrTransitRow)
  ).optional(),
  transits: z.array(ChartOrTransitRow).optional()
});

// Redundancy rule runtime check
export function checkTransitsRedundancy(root: any) {
  // Note: we compare deep JSON of whichever accepted shapes (chart snapshots or lean rows) are present.
  if (root.transits && root.transitsByDate) {
    const transitsFlat = JSON.stringify(root.transits);
    const transitsDict = JSON.stringify(
      Object.values(root.transitsByDate).flat()
    );
    if (transitsFlat !== transitsDict) {
      throw new Error("transits and transitsByDate must be deeply equal if both are present");
    }
  }
  if (!root.transits && !root.transitsByDate) {
    throw new Error("At least one of transits or transitsByDate must be present");
  }
}
