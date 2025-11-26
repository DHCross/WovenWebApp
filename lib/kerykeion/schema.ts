
/**
 * Kerykeion API Schema Definitions
 * Derived from openapi.json
 */

export type KerykeionPlanetName =
    | "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn"
    | "Uranus" | "Neptune" | "Pluto" | "Mean_Node" | "True_Node"
    | "Mean_South_Node" | "True_South_Node" | "Chiron" | "Mean_Lilith";

export type KerykeionAngleName =
    | "Ascendant" | "Medium_Coeli" | "Descendant" | "Imum_Coeli";

export type KerykeionHouseName =
    | "First_House" | "Second_House" | "Third_House" | "Fourth_House"
    | "Fifth_House" | "Sixth_House" | "Seventh_House" | "Eighth_House"
    | "Ninth_House" | "Tenth_House" | "Eleventh_House" | "Twelfth_House";

export type KerykeionPointName = KerykeionPlanetName | KerykeionAngleName | KerykeionHouseName;

export type KerykeionSign =
    | "Ari" | "Tau" | "Gem" | "Can" | "Leo" | "Vir"
    | "Lib" | "Sco" | "Sag" | "Cap" | "Aqu" | "Pis";

export type KerykeionElement = "Air" | "Fire" | "Earth" | "Water";
export type KerykeionQuality = "Cardinal" | "Fixed" | "Mutable";

export interface KerykeionPointModel {
    name: KerykeionPointName;
    quality: KerykeionQuality;
    element: KerykeionElement;
    sign: KerykeionSign;
    sign_num: number;
    position: number;
    abs_pos: number;
    emoji: string;
    point_type: "Planet" | "House" | "AxialCusps";
    house?: KerykeionHouseName | null;
    retrograde?: boolean | null;
}

export type KerykeionAspectName =
    | "conjunction" | "semi-sextile" | "semi-square" | "sextile" | "quintile"
    | "square" | "trine" | "sesquiquadrate" | "biquintile" | "quincunx" | "opposition";

export interface AspectModel {
    p1_name: KerykeionPointName;
    p1_abs_pos: number;
    p2_name: KerykeionPointName;
    p2_abs_pos: number;
    aspect: KerykeionAspectName;
    orbit: number;
    aspect_degrees: number;
    diff: number;
    p1: number; // ID
    p2: number; // ID
}

export interface LunarPhaseModel {
    degrees_between_s_m: number;
    moon_phase: number;
    sun_phase: number;
    moon_emoji: string;
    moon_phase_name: string;
}

export interface AstrologicalSubjectModel {
    name: string;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    city: string;
    nation: string;
    lng: number;
    lat: number;
    tz_str: string;
    zodiac_type: "Tropic" | "Sidereal";
    sidereal_mode?: string | null;
    houses_system_identifier: string;
    houses_system_name: string;
    perspective_type: string;
    iso_formatted_local_datetime: string;
    iso_formatted_utc_datetime: string;
    julian_day: number;
    utc_time: number;
    local_time: number;

    // Points
    sun: KerykeionPointModel;
    moon: KerykeionPointModel;
    mercury: KerykeionPointModel;
    venus: KerykeionPointModel;
    mars: KerykeionPointModel;
    jupiter: KerykeionPointModel;
    saturn: KerykeionPointModel;
    uranus: KerykeionPointModel;
    neptune: KerykeionPointModel;
    pluto: KerykeionPointModel;
    mean_node: KerykeionPointModel;
    true_node: KerykeionPointModel;
    mean_south_node: KerykeionPointModel;
    true_south_node: KerykeionPointModel;
    chiron?: KerykeionPointModel | null;
    mean_lilith?: KerykeionPointModel | null;

    // Angles
    ascendant: KerykeionPointModel;
    descendant: KerykeionPointModel;
    medium_coeli: KerykeionPointModel;
    imum_coeli: KerykeionPointModel;

    // Houses
    first_house: KerykeionPointModel;
    second_house: KerykeionPointModel;
    third_house: KerykeionPointModel;
    fourth_house: KerykeionPointModel;
    fifth_house: KerykeionPointModel;
    sixth_house: KerykeionPointModel;
    seventh_house: KerykeionPointModel;
    eighth_house: KerykeionPointModel;
    ninth_house: KerykeionPointModel;
    tenth_house: KerykeionPointModel;
    eleventh_house: KerykeionPointModel;
    twelfth_house: KerykeionPointModel;

    // Lists
    planets_names_list: string[];
    axial_cusps_names_list: string[];
    houses_names_list: string[];

    lunar_phase: LunarPhaseModel;
}

// This matches BirthChartResponseModel in openapi.json (though not explicitly fully defined there, inferred from usage)
// Actually, BirthChartResponseModel usually just wraps the subject and aspects.
// Let's define a normalized structure that we will use internally.

export interface KerykeionChart {
    subject: AstrologicalSubjectModel;
    aspects: AspectModel[];
}
