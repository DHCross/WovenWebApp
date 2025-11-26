
import { AstroSeekParseResult, AstroSeekPlacement, AstroSeekAspect, AstroSeekLocation } from '../raven/parser';
import {
    KerykeionChart,
    AstrologicalSubjectModel,
    KerykeionPointModel,
    AspectModel,
    KerykeionPointName,
    KerykeionSign,
    KerykeionElement,
    KerykeionQuality,
    KerykeionAspectName,
    KerykeionHouseName
} from './schema';

// --- Constants & Helpers ---

const SIGN_ORDER: KerykeionSign[] = [
    "Ari", "Tau", "Gem", "Can", "Leo", "Vir",
    "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"
];

const ELEMENT_MAP: Record<KerykeionSign, KerykeionElement> = {
    "Ari": "Fire", "Leo": "Fire", "Sag": "Fire",
    "Tau": "Earth", "Vir": "Earth", "Cap": "Earth",
    "Gem": "Air", "Lib": "Air", "Aqu": "Air",
    "Can": "Water", "Sco": "Water", "Pis": "Water"
};

const QUALITY_MAP: Record<KerykeionSign, KerykeionQuality> = {
    "Ari": "Cardinal", "Can": "Cardinal", "Lib": "Cardinal", "Cap": "Cardinal",
    "Tau": "Fixed", "Leo": "Fixed", "Sco": "Fixed", "Aqu": "Fixed",
    "Gem": "Mutable", "Vir": "Mutable", "Sag": "Mutable", "Pis": "Mutable"
};

const PLANET_NAME_MAP: Record<string, KerykeionPointName> = {
    "Sun": "Sun", "Moon": "Moon", "Mercury": "Mercury", "Venus": "Venus",
    "Mars": "Mars", "Jupiter": "Jupiter", "Saturn": "Saturn",
    "Uranus": "Uranus", "Neptune": "Neptune", "Pluto": "Pluto",
    "North Node": "Mean_Node", "True Node": "True_Node",
    "South Node": "Mean_South_Node", // Assuming Mean for generic "South Node"
    "Chiron": "Chiron", "Lilith": "Mean_Lilith",
    "Ascendant": "Ascendant", "Midheaven": "Medium_Coeli",
    "Descendant": "Descendant", "Imum Coeli": "Imum_Coeli"
};

const ASPECT_NAME_MAP: Record<string, KerykeionAspectName> = {
    "Conjunction": "conjunction",
    "Opposition": "opposition",
    "Square": "square",
    "Trine": "trine",
    "Sextile": "sextile",
    "Quincunx": "quincunx",
    // Add others if AstroSeek parser supports them
};

const HOUSE_NAME_MAP: Record<number, KerykeionHouseName> = {
    1: "First_House", 2: "Second_House", 3: "Third_House", 4: "Fourth_House",
    5: "Fifth_House", 6: "Sixth_House", 7: "Seventh_House", 8: "Eighth_House",
    9: "Ninth_House", 10: "Tenth_House", 11: "Eleventh_House", 12: "Twelfth_House"
};

function mapSign(rawSign?: string): KerykeionSign {
    if (!rawSign) return "Ari"; // Fallback
    const sub = rawSign.substring(0, 3);
    return sub as KerykeionSign;
}

function calculateAbsPos(sign: KerykeionSign, degree: number): number {
    const signIndex = SIGN_ORDER.indexOf(sign);
    return (signIndex * 30) + degree;
}

function createPointModel(
    name: KerykeionPointName,
    placement: AstroSeekPlacement | undefined,
    pointType: "Planet" | "AxialCusps"
): KerykeionPointModel {
    const sign = mapSign(placement?.sign);
    const degree = placement?.degree || 0;
    const absPos = calculateAbsPos(sign, degree);

    return {
        name,
        quality: QUALITY_MAP[sign],
        element: ELEMENT_MAP[sign],
        sign,
        sign_num: SIGN_ORDER.indexOf(sign),
        position: degree,
        abs_pos: absPos,
        emoji: "", // Todo: Add emoji mapping
        point_type: pointType,
        house: placement?.house ? HOUSE_NAME_MAP[placement.house] : null,
        retrograde: placement?.retrograde || false
    };
}

function createHouseModel(houseNum: number, placement?: AstroSeekPlacement): KerykeionPointModel {
    const name = HOUSE_NAME_MAP[houseNum];
    const sign = mapSign(placement?.sign);
    const degree = placement?.degree || 0;
    const absPos = calculateAbsPos(sign, degree);

    return {
        name,
        quality: QUALITY_MAP[sign],
        element: ELEMENT_MAP[sign],
        sign,
        sign_num: SIGN_ORDER.indexOf(sign),
        position: degree,
        abs_pos: absPos,
        emoji: "",
        point_type: "House",
        house: name, // House is in itself
        retrograde: false
    };
}

// --- Main Mapper ---

export function mapAstroSeekToKerykeion(parsed: AstroSeekParseResult): KerykeionChart {
    const subject: Partial<AstrologicalSubjectModel> = {
        name: "Parsed Subject", // Placeholder
        // Date/Time/Location would need to come from parsed.location if available
        // For now, we populate the points
    };

    // Populate Location if available
    if (parsed.location) {
        subject.city = parsed.location.city;
        subject.nation = parsed.location.country;
        subject.lat = parsed.location.lat;
        subject.lng = parsed.location.long;
        // Note: Date/Time parsing from raw string is complex and might need a dedicated helper
        // For this phase, we focus on the geometry (points/houses)
    }

    // Helper to find placement
    const findPlacement = (name: string) => parsed.placements.find(p => p.body === name);

    // Map Planets & Angles
    subject.sun = createPointModel("Sun", findPlacement("Sun"), "Planet");
    subject.moon = createPointModel("Moon", findPlacement("Moon"), "Planet");
    subject.mercury = createPointModel("Mercury", findPlacement("Mercury"), "Planet");
    subject.venus = createPointModel("Venus", findPlacement("Venus"), "Planet");
    subject.mars = createPointModel("Mars", findPlacement("Mars"), "Planet");
    subject.jupiter = createPointModel("Jupiter", findPlacement("Jupiter"), "Planet");
    subject.saturn = createPointModel("Saturn", findPlacement("Saturn"), "Planet");
    subject.uranus = createPointModel("Uranus", findPlacement("Uranus"), "Planet");
    subject.neptune = createPointModel("Neptune", findPlacement("Neptune"), "Planet");
    subject.pluto = createPointModel("Pluto", findPlacement("Pluto"), "Planet");
    subject.mean_node = createPointModel("Mean_Node", findPlacement("North Node"), "Planet");
    subject.true_node = createPointModel("True_Node", findPlacement("True Node") || findPlacement("North Node"), "Planet"); // Fallback
    subject.mean_south_node = createPointModel("Mean_South_Node", findPlacement("South Node"), "Planet");
    subject.true_south_node = createPointModel("True_South_Node", findPlacement("South Node"), "Planet"); // Fallback
    subject.chiron = createPointModel("Chiron", findPlacement("Chiron"), "Planet");
    subject.mean_lilith = createPointModel("Mean_Lilith", findPlacement("Lilith"), "Planet");

    subject.ascendant = createPointModel("Ascendant", findPlacement("Ascendant"), "AxialCusps");
    subject.medium_coeli = createPointModel("Medium_Coeli", findPlacement("Midheaven"), "AxialCusps");
    subject.descendant = createPointModel("Descendant", findPlacement("Descendant"), "AxialCusps");
    subject.imum_coeli = createPointModel("Imum_Coeli", findPlacement("Imum Coeli"), "AxialCusps");

    // Map Houses (AstroSeek parser currently puts house cusps in placements with body="House X" or similar? 
    // Actually, the current parser extracts `house` property for planets, but doesn't explicitly list house cusps as bodies usually.
    // We might need to infer house cusps or check if the parser supports them. 
    // Looking at parser.ts, `extractHouse` is for planet positions. 
    // If the input text has a house table, we need to ensure parser captures it.
    // For now, we'll initialize empty or look for "House 1", "1st House" etc if parser captures them.

    // TODO: Update parser to explicitly capture House Cusps as bodies if they are in the text.
    // For now, we will create dummy house models to satisfy the interface.
    subject.first_house = createHouseModel(1, findPlacement("House 1") || findPlacement("1st House"));
    subject.second_house = createHouseModel(2, findPlacement("House 2") || findPlacement("2nd House"));
    subject.third_house = createHouseModel(3, findPlacement("House 3") || findPlacement("3rd House"));
    subject.fourth_house = createHouseModel(4, findPlacement("House 4") || findPlacement("4th House"));
    subject.fifth_house = createHouseModel(5, findPlacement("House 5") || findPlacement("5th House"));
    subject.sixth_house = createHouseModel(6, findPlacement("House 6") || findPlacement("6th House"));
    subject.seventh_house = createHouseModel(7, findPlacement("House 7") || findPlacement("7th House"));
    subject.eighth_house = createHouseModel(8, findPlacement("House 8") || findPlacement("8th House"));
    subject.ninth_house = createHouseModel(9, findPlacement("House 9") || findPlacement("9th House"));
    subject.tenth_house = createHouseModel(10, findPlacement("House 10") || findPlacement("10th House"));
    subject.eleventh_house = createHouseModel(11, findPlacement("House 11") || findPlacement("11th House"));
    subject.twelfth_house = createHouseModel(12, findPlacement("House 12") || findPlacement("12th House"));

    // Map Aspects
    const aspects: AspectModel[] = parsed.aspects.map(a => {
        const p1Name = PLANET_NAME_MAP[a.from];
        const p2Name = PLANET_NAME_MAP[a.to];
        const aspectName = ASPECT_NAME_MAP[a.type];

        if (!p1Name || !p2Name || !aspectName) return null;

        return {
            p1_name: p1Name,
            p2_name: p2Name,
            aspect: aspectName,
            orbit: a.orb || 0,
            aspect_degrees: 0, // Not calculated by parser
            diff: 0, // Not calculated
            p1_abs_pos: 0, // Would need lookup from subject points
            p2_abs_pos: 0, // Would need lookup
            p1: 0, // ID placeholder
            p2: 0  // ID placeholder
        };
    }).filter((a): a is AspectModel => a !== null);

    return {
        subject: subject as AstrologicalSubjectModel,
        aspects
    };
}
