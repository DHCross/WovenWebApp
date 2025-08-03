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
      planets: z.array(z.object({
        name: z.string(),
        quality: z.enum(["cardinal", "fixed", "mutable"]),
        element: z.enum(["fire", "earth", "air", "water"]),
        sign: z.enum([
          "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
          "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]),
        sign_num: z.number().int().min(0).max(11),
        position: z.number(),
        abs_pos: z.number(),
        emoji: z.string(),
        point_type: z.string(),
        house: z.enum([
          "First_House", "Second_House", "Third_House", "Fourth_House",
          "Fifth_House", "Sixth_House", "Seventh_House", "Eighth_House",
          "Ninth_House", "Tenth_House", "Eleventh_House", "Twelfth_House"
        ]),
        retrograde: z.boolean()
      })),
      aspects: z.array(z.object({
        planet_a: z.string(),
        planet_b: z.string(),
        abs_pos_a: z.number(),
        abs_pos_b: z.number(),
        aspect_name: z.string(),
        orbit: z.number(),
        diff: z.number()
      })),
      houses: z.array(z.object({
        name: z.enum([
          "First_House", "Second_House", "Third_House", "Fourth_House",
          "Fifth_House", "Sixth_House", "Seventh_House", "Eighth_House",
          "Ninth_House", "Tenth_House", "Eleventh_House", "Twelfth_House"
        ]),
        cusp: z.number()
      })).optional(),
      axial_cusps: z.array(z.object({
        axis: z.string(),
        degree: z.number()
      })).optional()
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
      planets: z.array(z.object({
        name: z.string(),
        quality: z.enum(["cardinal", "fixed", "mutable"]),
        element: z.enum(["fire", "earth", "air", "water"]),
        sign: z.enum([
          "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
          "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]),
        sign_num: z.number().int().min(0).max(11),
        position: z.number(),
        abs_pos: z.number(),
        emoji: z.string(),
        point_type: z.string(),
        house: z.enum([
          "First_House", "Second_House", "Third_House", "Fourth_House",
          "Fifth_House", "Sixth_House", "Seventh_House", "Eighth_House",
          "Ninth_House", "Tenth_House", "Eleventh_House", "Twelfth_House"
        ]),
        retrograde: z.boolean()
      })),
      aspects: z.array(z.object({
        planet_a: z.string(),
        planet_b: z.string(),
        abs_pos_a: z.number(),
        abs_pos_b: z.number(),
        aspect_name: z.string(),
        orbit: z.number(),
        diff: z.number()
      })),
      houses: z.array(z.object({
        name: z.enum([
          "First_House", "Second_House", "Third_House", "Fourth_House",
          "Fifth_House", "Sixth_House", "Seventh_House", "Eighth_House",
          "Ninth_House", "Tenth_House", "Eleventh_House", "Twelfth_House"
        ]),
        cusp: z.number()
      })).optional(),
      axial_cusps: z.array(z.object({
        axis: z.string(),
        degree: z.number()
      })).optional()
    })
  }),
  transitsByDate: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.array(z.object({
    person: z.enum(["person_a", "person_b"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    location_type: z.enum(["birth", "relocated"]),
    chart: z.object({
      planets: z.array(z.object({
        name: z.string(),
        quality: z.enum(["cardinal", "fixed", "mutable"]),
        element: z.enum(["fire", "earth", "air", "water"]),
        sign: z.enum([
          "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
          "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]),
        sign_num: z.number().int().min(0).max(11),
        position: z.number(),
        abs_pos: z.number(),
        emoji: z.string(),
        point_type: z.string(),
        house: z.enum([
          "First_House", "Second_House", "Third_House", "Fourth_House",
          "Fifth_House", "Sixth_House", "Seventh_House", "Eighth_House",
          "Ninth_House", "Tenth_House", "Eleventh_House", "Twelfth_House"
        ]),
        retrograde: z.boolean()
      })),
      aspects: z.array(z.object({
        planet_a: z.string(),
        planet_b: z.string(),
        abs_pos_a: z.number(),
        abs_pos_b: z.number(),
        aspect_name: z.string(),
        orbit: z.number(),
        diff: z.number()
      })),
      houses: z.array(z.object({
        name: z.enum([
          "First_House", "Second_House", "Third_House", "Fourth_House",
          "Fifth_House", "Sixth_House", "Seventh_House", "Eighth_House",
          "Ninth_House", "Tenth_House", "Eleventh_House", "Twelfth_House"
        ]),
        cusp: z.number()
      })).optional(),
      axial_cusps: z.array(z.object({
        axis: z.string(),
        degree: z.number()
      })).optional()
    })
  }))).optional(),
  transits: z.array(z.object({
    person: z.enum(["person_a", "person_b"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    location_type: z.enum(["birth", "relocated"]),
    chart: z.object({
      planets: z.array(z.object({
        name: z.string(),
        quality: z.enum(["cardinal", "fixed", "mutable"]),
        element: z.enum(["fire", "earth", "air", "water"]),
        sign: z.enum([
          "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
          "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]),
        sign_num: z.number().int().min(0).max(11),
        position: z.number(),
        abs_pos: z.number(),
        emoji: z.string(),
        point_type: z.string(),
        house: z.enum([
          "First_House", "Second_House", "Third_House", "Fourth_House",
          "Fifth_House", "Sixth_House", "Seventh_House", "Eighth_House",
          "Ninth_House", "Tenth_House", "Eleventh_House", "Twelfth_House"
        ]),
        retrograde: z.boolean()
      })),
      aspects: z.array(z.object({
        planet_a: z.string(),
        planet_b: z.string(),
        abs_pos_a: z.number(),
        abs_pos_b: z.number(),
        aspect_name: z.string(),
        orbit: z.number(),
        diff: z.number()
      })),
      houses: z.array(z.object({
        name: z.enum([
          "First_House", "Second_House", "Third_House", "Fourth_House",
          "Fifth_House", "Sixth_House", "Seventh_House", "Eighth_House",
          "Ninth_House", "Tenth_House", "Eleventh_House", "Twelfth_House"
        ]),
        cusp: z.number()
      })).optional(),
      axial_cusps: z.array(z.object({
        axis: z.string(),
        degree: z.number()
      })).optional()
    })
  })).optional()
});

// Redundancy rule runtime check
export function checkTransitsRedundancy(root: any) {
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
