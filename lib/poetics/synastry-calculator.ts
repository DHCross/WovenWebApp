/**
 * Synastry Calculator - Internal Cross-Chart Aspect Computation
 * 
 * This module calculates synastry aspects directly from planetary positions,
 * eliminating the need for pre-computed synastry data in the input JSON.
 * 
 * Per Raven's Law: The system must never claim missing data when it has
 * the raw geometry to compute what it needs.
 */

import type { AspectType } from './types';

// Standard aspect definitions with their exact angles and default orbs
const ASPECT_DEFINITIONS: {
    name: AspectType;
    angle: number;
    defaultOrb: number;
    nature: 'hard' | 'soft' | 'neutral';
}[] = [
        { name: 'conjunction', angle: 0, defaultOrb: 8, nature: 'neutral' },
        { name: 'opposition', angle: 180, defaultOrb: 8, nature: 'hard' },
        { name: 'trine', angle: 120, defaultOrb: 8, nature: 'soft' },
        { name: 'square', angle: 90, defaultOrb: 7, nature: 'hard' },
        { name: 'sextile', angle: 60, defaultOrb: 6, nature: 'soft' },
        // Minor aspects with tighter orbs
        { name: 'quincunx', angle: 150, defaultOrb: 3, nature: 'hard' },
        { name: 'semisextile', angle: 30, defaultOrb: 2, nature: 'soft' },
        { name: 'semisquare', angle: 45, defaultOrb: 2, nature: 'hard' },
        { name: 'sesquiquadrate', angle: 135, defaultOrb: 2, nature: 'hard' },
    ];

// Planet priority for weighting (inner planets get more weight in synastry)
const PLANET_WEIGHTS: Record<string, number> = {
    Sun: 10,
    Moon: 10,
    Mercury: 6,
    Venus: 8,
    Mars: 8,
    Jupiter: 5,
    Saturn: 5,
    Uranus: 3,
    Neptune: 3,
    Pluto: 4,
    Chiron: 4,
    Node: 3,
    Mean_Node: 3,
    ASC: 7,
    MC: 5,
    First_House: 7,
    Tenth_House: 5,
};

// Default orb adjustments by planet combination
function getOrbForPlanets(planetA: string, planetB: string, baseOrb: number): number {
    const weightA = PLANET_WEIGHTS[planetA] ?? 3;
    const weightB = PLANET_WEIGHTS[planetB] ?? 3;
    const avgWeight = (weightA + weightB) / 2;

    // Higher weight planets get slightly wider orbs
    if (avgWeight >= 9) return baseOrb + 1;
    if (avgWeight >= 7) return baseOrb;
    if (avgWeight >= 5) return baseOrb - 0.5;
    return baseOrb - 1;
}

export interface RawPosition {
    abs_pos?: number;
    absolute_longitude?: number;
    longitude?: number;
    deg?: number;
    sign?: string;
    retrograde?: boolean;
    house?: number;
}

export interface ChartPositions {
    [planetName: string]: RawPosition;
}

export interface CalculatedAspect {
    planet_a: string;
    planet_b: string;
    person_a_name?: string;
    person_b_name?: string;
    type: AspectType;
    orb: number;
    exact_angle: number;
    applying: boolean;
    weight: number;
    nature: 'hard' | 'soft' | 'neutral';
    houses?: {
        primary?: number;
        secondary?: number;
    };
}

export interface SynastryCalculationResult {
    aspects: CalculatedAspect[];
    computed: true;
    source: 'internal_calculator';
    planet_count_a: number;
    planet_count_b: number;
    aspect_count: number;
}

/**
 * Extract the absolute position in degrees (0-360) from a position object
 */
function getAbsolutePosition(pos: RawPosition | undefined): number | null {
    if (!pos) return null;

    // Try various field names used across different API versions
    const candidates = [
        pos.abs_pos,
        pos.absolute_longitude,
        pos.longitude,
    ];

    for (const val of candidates) {
        if (typeof val === 'number' && Number.isFinite(val)) {
            return normalizeAngle(val);
        }
    }

    // If only deg + sign are available, compute absolute position
    if (typeof pos.deg === 'number' && typeof pos.sign === 'string') {
        const signOffset = getSignOffset(pos.sign);
        if (signOffset !== null) {
            return normalizeAngle(signOffset + pos.deg);
        }
    }

    return null;
}

/**
 * Get the starting degree offset for a zodiac sign
 */
function getSignOffset(sign: string): number | null {
    const signs: Record<string, number> = {
        'Ari': 0, 'Aries': 0,
        'Tau': 30, 'Taurus': 30,
        'Gem': 60, 'Gemini': 60,
        'Can': 90, 'Cancer': 90,
        'Leo': 120,
        'Vir': 150, 'Virgo': 150,
        'Lib': 180, 'Libra': 180,
        'Sco': 210, 'Scorpio': 210,
        'Sag': 240, 'Sagittarius': 240,
        'Cap': 270, 'Capricorn': 270,
        'Aqu': 300, 'Aquarius': 300,
        'Pis': 330, 'Pisces': 330,
    };
    return signs[sign] ?? null;
}

/**
 * Normalize an angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
    let normalized = angle % 360;
    if (normalized < 0) normalized += 360;
    return normalized;
}

/**
 * Calculate the shortest angular distance between two positions
 */
function angularDistance(posA: number, posB: number): number {
    const diff = Math.abs(normalizeAngle(posA) - normalizeAngle(posB));
    return diff > 180 ? 360 - diff : diff;
}

/**
 * Determine if an aspect is applying (getting closer) or separating
 * This is a simplified heuristic based on position order
 */
function isApplying(posA: number, posB: number, aspectAngle: number): boolean {
    // For now, use a simple heuristic: if posA < posB, likely applying
    // A more accurate calculation would require daily motion data
    const diff = normalizeAngle(posB - posA);
    const targetDiff = normalizeAngle(aspectAngle);
    return diff < targetDiff;
}

/**
 * Calculate synastry aspects between two charts
 * 
 * @param positionsA - Planetary positions for Person A
 * @param positionsB - Planetary positions for Person B
 * @param personAName - Name of Person A for attribution
 * @param personBName - Name of Person B for attribution
 * @param options - Configuration options
 */
export function calculateSynastryAspects(
    positionsA: ChartPositions,
    positionsB: ChartPositions,
    personAName: string = 'Person A',
    personBName: string = 'Person B',
    options: {
        includeMinorAspects?: boolean;
        maxAspects?: number;
        minWeight?: number;
    } = {}
): SynastryCalculationResult {
    const {
        includeMinorAspects = false,
        maxAspects = 20,
        minWeight = 2,
    } = options;

    const aspects: CalculatedAspect[] = [];

    // Filter to only major aspects unless minor are requested
    const aspectsToCheck = includeMinorAspects
        ? ASPECT_DEFINITIONS
        : ASPECT_DEFINITIONS.filter(a => ['conjunction', 'opposition', 'trine', 'square', 'sextile'].includes(a.name));

    // Skip certain keys that aren't planets
    const skipKeys = new Set(['cusps', 'houses', '_raw', 'angles', 'angle_signs']);

    const planetsA = Object.entries(positionsA).filter(([k]) => !skipKeys.has(k));
    const planetsB = Object.entries(positionsB).filter(([k]) => !skipKeys.has(k));

    for (const [planetAName, posA] of planetsA) {
        const absA = getAbsolutePosition(posA);
        if (absA === null) continue;

        for (const [planetBName, posB] of planetsB) {
            const absB = getAbsolutePosition(posB);
            if (absB === null) continue;

            const distance = angularDistance(absA, absB);

            // Check each aspect type
            for (const aspectDef of aspectsToCheck) {
                const orb = getOrbForPlanets(planetAName, planetBName, aspectDef.defaultOrb);
                const deviation = Math.abs(distance - aspectDef.angle);

                if (deviation <= orb) {
                    // Calculate weight based on orb tightness and planet importance
                    const orbTightness = 1 - (deviation / orb); // 1 = exact, 0 = edge of orb
                    const planetWeight = ((PLANET_WEIGHTS[planetAName] ?? 3) + (PLANET_WEIGHTS[planetBName] ?? 3)) / 2;
                    const weight = orbTightness * planetWeight;

                    if (weight < minWeight) continue;

                    aspects.push({
                        planet_a: planetAName,
                        planet_b: planetBName,
                        person_a_name: personAName,
                        person_b_name: personBName,
                        type: aspectDef.name,
                        orb: Number(deviation.toFixed(2)),
                        exact_angle: aspectDef.angle,
                        applying: isApplying(absA, absB, aspectDef.angle),
                        weight: Number(weight.toFixed(2)),
                        nature: aspectDef.nature,
                        houses: {
                            primary: (posA as any).house,
                            secondary: (posB as any).house,
                        },
                    });
                }
            }
        }
    }

    // Sort by weight (highest first) and limit
    const sortedAspects = aspects
        .sort((a, b) => b.weight - a.weight)
        .slice(0, maxAspects);

    return {
        aspects: sortedAspects,
        computed: true,
        source: 'internal_calculator',
        planet_count_a: planetsA.length,
        planet_count_b: planetsB.length,
        aspect_count: sortedAspects.length,
    };
}

/**
 * Check if chart positions have sufficient data for synastry calculation
 */
export function canCalculateSynastry(positionsA: any, positionsB: any): boolean {
    if (!positionsA || typeof positionsA !== 'object') return false;
    if (!positionsB || typeof positionsB !== 'object') return false;

    const skipKeys = new Set(['cusps', 'houses', '_raw', 'angles', 'angle_signs']);

    const countValidPositions = (positions: any): number => {
        let count = 0;
        for (const [key, pos] of Object.entries(positions)) {
            if (skipKeys.has(key)) continue;
            if (getAbsolutePosition(pos as RawPosition) !== null) {
                count++;
            }
        }
        return count;
    };

    // Need at least 5 valid positions in each chart for meaningful synastry
    const countA = countValidPositions(positionsA);
    const countB = countValidPositions(positionsB);

    return countA >= 5 && countB >= 5;
}

/**
 * Debug helper: log what positions are available
 */
export function debugChartPositions(positions: any, label: string): void {
    const skipKeys = new Set(['cusps', 'houses', '_raw', 'angles', 'angle_signs']);
    console.log(`[SynastryCalc] ${label} positions:`);

    for (const [key, pos] of Object.entries(positions || {})) {
        if (skipKeys.has(key)) continue;
        const absPos = getAbsolutePosition(pos as RawPosition);
        console.log(`  ${key}: ${absPos !== null ? absPos.toFixed(2) + '°' : 'NO POSITION'}`);
    }
}
