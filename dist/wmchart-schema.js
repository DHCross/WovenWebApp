"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWMChartRoot = exports.isTransitsByDate = exports.isChartOrTransit = exports.isChartSnapshot = exports.isWMAspect = exports.isWMTransitAspect = exports.WMChartRootSchema = exports.TransitsByDateSchema = exports.ChartOrTransitRow = exports.WMTransitAspectSchema = exports.WMAspectSchema = exports.ChartSnapshotSchema = exports.AspectSnapshotSchema = exports.ChartPlanetSchema = exports.HouseEnum = exports.SignEnum = exports.ElementEnum = exports.QualityEnum = void 0;
exports.coalesceTransitsByDate = coalesceTransitsByDate;
exports.checkTransitsRedundancy = checkTransitsRedundancy;
exports.assertWMChartRoot = assertWMChartRoot;
exports.getTransitsByDate = getTransitsByDate;
exports.flattenTransitsByDate = flattenTransitsByDate;
exports.pickTransitsView = pickTransitsView;
/** ES5-compatible array flattening for array of arrays */
function flatten(arr) {
    return arr.reduce(function (acc, val) {
        return acc.concat(val);
    }, []);
}
const zod_1 = require("zod");
// ---------- Shared enums & lean geometry schemas ----------
exports.QualityEnum = zod_1.z.enum(["cardinal", "fixed", "mutable"]);
exports.ElementEnum = zod_1.z.enum(["fire", "earth", "air", "water"]);
exports.SignEnum = zod_1.z.enum([
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]);
exports.HouseEnum = zod_1.z.enum([
    "First_House", "Second_House", "Third_House", "Fourth_House",
    "Fifth_House", "Sixth_House", "Seventh_House", "Eighth_House",
    "Ninth_House", "Tenth_House", "Eleventh_House", "Twelfth_House"
]);
// Full chart "planet" snapshot (existing strict shape, extracted to reuse)
exports.ChartPlanetSchema = zod_1.z.object({
    name: zod_1.z.string(),
    quality: exports.QualityEnum,
    element: exports.ElementEnum,
    sign: exports.SignEnum,
    sign_num: zod_1.z.number().int().min(0).max(11),
    position: zod_1.z.number(),
    abs_pos: zod_1.z.number(),
    emoji: zod_1.z.string().optional(),
    point_type: zod_1.z.string().optional(),
    house: exports.HouseEnum,
    retrograde: zod_1.z.boolean()
});
// Full chart "aspect" snapshot (existing strict shape, extracted to reuse)
exports.AspectSnapshotSchema = zod_1.z.object({
    planet_a: zod_1.z.string(),
    planet_b: zod_1.z.string(),
    abs_pos_a: zod_1.z.number(),
    abs_pos_b: zod_1.z.number(),
    aspect_name: zod_1.z.string(),
    orbit: zod_1.z.number(),
    diff: zod_1.z.number()
});
// Houses / cusps blocks (extracted to reuse)
const HousesArraySchema = zod_1.z.array(zod_1.z.object({
    name: exports.HouseEnum,
    cusp: zod_1.z.number()
})).optional();
const AxialCuspsSchema = zod_1.z.array(zod_1.z.object({
    axis: zod_1.z.string(),
    degree: zod_1.z.number()
})).optional();
// Full chart snapshot (planets + aspects [+ houses/cusps])
exports.ChartSnapshotSchema = zod_1.z.object({
    planets: zod_1.z.array(exports.ChartPlanetSchema),
    aspects: zod_1.z.array(exports.AspectSnapshotSchema),
    houses: HousesArraySchema,
    axial_cusps: AxialCuspsSchema
});
// ---------- Lean WM geometry (mapper output) ----------
const OrbBandEnum = zod_1.z.enum(["tight", "close", "medium", "wide"]);
const ValenceHintEnum = zod_1.z.enum(["hot", "cool", "neutral_to_hot", "neutral_to_cool"]);
exports.WMAspectSchema = zod_1.z.object({
    p1_name: zod_1.z.string(),
    p2_name: zod_1.z.string(),
    aspect: zod_1.z.string(),
    orb: zod_1.z.number(),
    p1_house: zod_1.z.number().optional(),
    p2_house: zod_1.z.number().optional(),
    p1_is_retrograde: zod_1.z.boolean().optional(),
    p2_is_retrograde: zod_1.z.boolean().optional(),
    orb_band: OrbBandEnum,
    valence_hint: ValenceHintEnum
});
exports.WMTransitAspectSchema = zod_1.z.object({
    transit_body: zod_1.z.string(),
    natal_target: zod_1.z.string(),
    aspect: zod_1.z.string(),
    orb: zod_1.z.number(),
    orb_band: OrbBandEnum,
    valence_hint: ValenceHintEnum,
    transit_house: zod_1.z.number().nullable().optional(),
    natal_house: zod_1.z.number().nullable().optional(),
    transit_is_retrograde: zod_1.z.boolean().optional(),
    natal_is_retrograde: zod_1.z.boolean().optional(),
    transit_lon: zod_1.z.number().nullable().optional(),
    natal_lon: zod_1.z.number().nullable().optional()
});
// A union used where "chart snapshot OR lean rows" are acceptable
exports.ChartOrTransitRow = zod_1.z.union([
    zod_1.z.object({
        person: zod_1.z.enum(["person_a", "person_b"]),
        date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        location_type: zod_1.z.enum(["birth", "relocated"]),
        chart: exports.ChartSnapshotSchema
    }),
    exports.WMTransitAspectSchema
]);
// Shared "by date" record schema (accept either key name: transitsByDate or byDate)
const ISODate = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
exports.TransitsByDateSchema = zod_1.z.record(ISODate, zod_1.z.array(exports.ChartOrTransitRow));
// Helper to coalesce either alias at runtime
function coalesceTransitsByDate(root) {
    var _a, _b;
    return (_b = (_a = root === null || root === void 0 ? void 0 : root.transitsByDate) !== null && _a !== void 0 ? _a : root === null || root === void 0 ? void 0 : root.byDate) !== null && _b !== void 0 ? _b : {};
}
exports.WMChartRootSchema = zod_1.z.object({
    schema: zod_1.z.literal("WM-Chart-1.0"),
    relationship_type: zod_1.z.enum(["partner", "friend", "family"]),
    intimacy_tier: zod_1.z.enum(["P1", "P2", "P3"]).optional(),
    diagnostics: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.any())).optional(),
    person_a: zod_1.z.object({
        details: zod_1.z.object({
            name: zod_1.z.string(),
            birth_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO
            birth_time: zod_1.z.string(),
            birth_city: zod_1.z.string(),
            birth_state: zod_1.z.string(),
            birth_country: zod_1.z.string(),
            birth_coordinates: zod_1.z.string(),
            timezone: zod_1.z.string(),
            zodiac_type: zod_1.z.enum(["Tropic", "Sidereal"])
        }),
        chart: zod_1.z.object({
            planets: zod_1.z.array(exports.ChartPlanetSchema),
            aspects: zod_1.z.array(zod_1.z.union([exports.AspectSnapshotSchema, exports.WMAspectSchema])),
            houses: HousesArraySchema,
            axial_cusps: AxialCuspsSchema
        })
    }),
    person_b: zod_1.z.object({
        details: zod_1.z.object({
            name: zod_1.z.string(),
            birth_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            birth_time: zod_1.z.string(),
            birth_city: zod_1.z.string(),
            birth_state: zod_1.z.string(),
            birth_country: zod_1.z.string(),
            birth_coordinates: zod_1.z.string(),
            timezone: zod_1.z.string(),
            zodiac_type: zod_1.z.enum(["Tropic", "Sidereal"])
        }),
        chart: zod_1.z.object({
            planets: zod_1.z.array(exports.ChartPlanetSchema),
            aspects: zod_1.z.array(zod_1.z.union([exports.AspectSnapshotSchema, exports.WMAspectSchema])),
            houses: HousesArraySchema,
            axial_cusps: AxialCuspsSchema
        })
    }).optional(),
    // Accept either the canonical name or the legacy alias
    transitsByDate: exports.TransitsByDateSchema.optional(),
    byDate: exports.TransitsByDateSchema.optional(),
    transits: zod_1.z.array(exports.ChartOrTransitRow).optional()
});
// Redundancy rule runtime check
function checkTransitsRedundancy(root) {
    var _a;
    // Note: treat `byDate` as an alias of `transitsByDate`
    const dict = (_a = root === null || root === void 0 ? void 0 : root.transitsByDate) !== null && _a !== void 0 ? _a : root === null || root === void 0 ? void 0 : root.byDate;
    const flat = root === null || root === void 0 ? void 0 : root.transits;
    // Require at least one to be present
    if (!dict && !flat) {
        throw new Error("At least one of transits/transitsByDate (or byDate) must be present");
    }
    // If both are present, they must be deeply equal after flattening the dict
    if (dict && flat) {
        const flattened = JSON.stringify(flatten(Object.values(dict)));
        const flattenedFlat = JSON.stringify(flat);
        if (flattened !== flattenedFlat) {
            throw new Error("transits and transitsByDate/byDate must be deeply equal if both are present");
        }
    }
}
/** Narrowers (type guards) */
const isWMTransitAspect = (v) => exports.WMTransitAspectSchema.safeParse(v).success;
exports.isWMTransitAspect = isWMTransitAspect;
const isWMAspect = (v) => exports.WMAspectSchema.safeParse(v).success;
exports.isWMAspect = isWMAspect;
const isChartSnapshot = (v) => exports.ChartSnapshotSchema.safeParse(v).success;
exports.isChartSnapshot = isChartSnapshot;
const isChartOrTransit = (v) => exports.ChartOrTransitRow.safeParse(v).success;
exports.isChartOrTransit = isChartOrTransit;
const isTransitsByDate = (v) => exports.TransitsByDateSchema.safeParse(v).success;
exports.isTransitsByDate = isTransitsByDate;
const isWMChartRoot = (v) => exports.WMChartRootSchema.safeParse(v).success;
exports.isWMChartRoot = isWMChartRoot;
/** Assertions (throw on invalid) */
function assertWMChartRoot(v) {
    const res = exports.WMChartRootSchema.safeParse(v);
    if (!res.success) {
        // Using zod's .format() keeps messages compact but precise
        throw new Error("Invalid WMChartRoot: " + JSON.stringify(res.error.format()));
    }
}
/** Get a typed-byDate dictionary, tolerant of aliasing (`byDate` vs `transitsByDate`). */
function getTransitsByDate(root) {
    var _a, _b;
    // Prefer full-root parse for maximum fidelity
    const parsedRoot = exports.WMChartRootSchema.safeParse(root);
    if (parsedRoot.success) {
        return (_b = ((_a = parsedRoot.data.transitsByDate) !== null && _a !== void 0 ? _a : parsedRoot.data.byDate)) !== null && _b !== void 0 ? _b : {};
    }
    // Fall back to best-effort coalescing using whatever keys exist
    const dict = coalesceTransitsByDate(root);
    const parsedDict = exports.TransitsByDateSchema.safeParse(dict);
    return parsedDict.success ? parsedDict.data : {};
}
/** Flatten a byDate dictionary into a single array of rows. */
function flattenTransitsByDate(dict) {
    const parsed = exports.TransitsByDateSchema.safeParse(dict);
    return parsed.success ? flatten(Object.values(parsed.data)) : [];
}
/** Pick a normalized transits view from an arbitrary root shape. */
function pickTransitsView(root) {
    const byDate = getTransitsByDate(root);
    const flat = flatten(Object.values(byDate));
    return { byDate, flat };
}
