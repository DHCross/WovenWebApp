/**
 * Big Five Correspondence Inference — Backstage Only
 * 
 * Heuristic mapping from chart geometry to Big Five-like tendencies.
 * NEVER surfaces frontstage as labels; only provides symbolic vocabulary shaping.
 * 
 * ARCHITECTURE PHILOSOPHY:
 * The Big Five dimensions inform HOW Raven speaks, not WHAT Raven says.
 * These scores shape word choice, metaphor selection, and pacing intuitions
 * without ever being named in the output.
 * 
 * DIMENSIONS:
 * - O (Openness): Wide aperture vs. consolidated focus
 * - C (Conscientiousness): Load-bearing structure vs. improvisational rhythm
 * - E (Extraversion): Outward ignition vs. inward restoration (overlaps MBTI E/I)
 * - A (Agreeableness): Field-harmonizing vs. edge-preserving
 * - N (Neuroticism): Sensitized seismograph vs. even-keel baseline
 * 
 * SOURCES (All from Interior Compass, never Contact Resonance):
 * - O: Mercury/Jupiter elements, Mutable modality, 9th/12th house emphasis
 * - C: Saturn strength, Fixed modality, 6th/10th house emphasis
 * - E: Moon element + Saturn (same as MBTI E/I)
 * - A: Venus-Moon harmony, Water/Air emphasis, 7th house
 * - N: Water emphasis, Chiron aspects, 4th/8th/12th houses
 * 
 * @internal — Never exposed frontstage
 */

type ChartInput = {
    positions?: Record<string, any> | null;
    angle_signs?: Record<string, string> | null;
    aspects?: any[] | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sign → Element / Modality (shared with MBTI inference)
// ─────────────────────────────────────────────────────────────────────────────

const ELEMENTS: Record<string, 'F' | 'E' | 'A' | 'W'> = {
    Ari: 'F', Leo: 'F', Sag: 'F',
    Tau: 'E', Vir: 'E', Cap: 'E',
    Gem: 'A', Lib: 'A', Aqu: 'A',
    Can: 'W', Sco: 'W', Pis: 'W',
};

const MODALITIES: Record<string, 'C' | 'F' | 'M'> = {
    Ari: 'C', Can: 'C', Lib: 'C', Cap: 'C',
    Tau: 'F', Leo: 'F', Sco: 'F', Aqu: 'F',
    Gem: 'M', Vir: 'M', Sag: 'M', Pis: 'M',
};

function norm(s?: string | null): string | null {
    if (!s) return null;
    const t = s.trim().slice(0, 3);
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function elem(sign?: string | null): 'F' | 'E' | 'A' | 'W' | null {
    const k = norm(sign);
    return k ? ELEMENTS[k] ?? null : null;
}

function mod(sign?: string | null): 'C' | 'F' | 'M' | null {
    const k = norm(sign);
    return k ? MODALITIES[k] ?? null : null;
}

function isWater(sign?: string | null): boolean {
    return elem(sign) === 'W';
}

function isAir(sign?: string | null): boolean {
    return elem(sign) === 'A';
}

function isFire(sign?: string | null): boolean {
    return elem(sign) === 'F';
}

function isMutable(sign?: string | null): boolean {
    return mod(sign) === 'M';
}

function isFixed(sign?: string | null): boolean {
    return mod(sign) === 'F';
}

// ─────────────────────────────────────────────────────────────────────────────
// Big Five Score Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface BigFiveScore {
    /** Raw score 0-100 */
    value: number;
    /** Categorical band */
    band: 'low' | 'moderate' | 'high';
    /** Interior signals that drove this inference */
    signals: string[];
}

export interface BigFiveProfile {
    /** Openness to Experience — Wide aperture vs. consolidated focus */
    O: BigFiveScore;
    /** Conscientiousness — Load-bearing structure vs. improvisational rhythm */
    C: BigFiveScore;
    /** Extraversion — Outward ignition vs. inward restoration */
    E: BigFiveScore;
    /** Agreeableness — Field-harmonizing vs. edge-preserving */
    A: BigFiveScore;
    /** Neuroticism — Sensitized seismograph vs. even-keel baseline */
    N: BigFiveScore;
    /** Backstage-only note */
    _framework_note: string;
}

function scoreToBand(value: number): 'low' | 'moderate' | 'high' {
    if (value >= 65) return 'high';
    if (value >= 35) return 'moderate';
    return 'low';
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Dimension Inference
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Openness to Experience
 * High: Pattern-seeking, abstract, exploratory
 * Low: Practical, conventional, focused on the known
 * 
 * Sources: Mercury element, Jupiter element, Mutable modality count, 9th/12th house
 */
function inferOpenness(positions: Record<string, any>): BigFiveScore {
    const signals: string[] = [];
    let score = 50; // Baseline

    // Mercury element (Air/Fire = abstract thinking)
    const mercury = positions['Mercury'] || positions['mercury'];
    const mercuryEl = elem(mercury?.sign);
    if (mercuryEl === 'A' || mercuryEl === 'F') {
        score += 15;
        signals.push(`Mercury in ${mercuryEl === 'A' ? 'Air' : 'Fire'} (abstract processing)`);
    } else if (mercuryEl === 'E') {
        score -= 10;
        signals.push(`Mercury in Earth (practical focus)`);
    }

    // Jupiter element (Fire/Air = expansive seeking)
    const jupiter = positions['Jupiter'] || positions['jupiter'];
    const jupiterEl = elem(jupiter?.sign);
    if (jupiterEl === 'F' || jupiterEl === 'A') {
        score += 12;
        signals.push(`Jupiter in ${jupiterEl === 'F' ? 'Fire' : 'Air'} (wide-horizon seeking)`);
    }

    // Mutable modality emphasis (adaptability, openness to change)
    let mutableCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        if (planet?.sign && isMutable(planet.sign)) {
            mutableCount++;
        }
    }
    if (mutableCount >= 4) {
        score += 10;
        signals.push(`Strong Mutable emphasis (adaptable, curious)`);
    }

    // 9th house emphasis (philosophy, exploration)
    const sun = positions['Sun'] || positions['sun'];
    const moon = positions['Moon'] || positions['moon'];
    if (sun?.house === 9 || moon?.house === 9 || jupiter?.house === 9) {
        score += 8;
        signals.push(`9th house emphasis (meaning-seeking)`);
    }

    // Neptune aspects can add imagination/openness
    const neptune = positions['Neptune'] || positions['neptune'];
    if (neptune && isWater(neptune?.sign)) {
        score += 5;
        signals.push(`Neptune in Water (imaginative depth)`);
    }

    return {
        value: Math.max(0, Math.min(100, score)),
        band: scoreToBand(score),
        signals,
    };
}

/**
 * Conscientiousness
 * High: Structured, reliable, sequence-aware
 * Low: Spontaneous, flexible, responsive
 * 
 * Sources: Saturn strength, Fixed modality count, 6th/10th house emphasis
 */
function inferConscientiousness(positions: Record<string, any>): BigFiveScore {
    const signals: string[] = [];
    let score = 50;

    // Saturn element and strength
    const saturn = positions['Saturn'] || positions['saturn'];
    const saturnEl = elem(saturn?.sign);
    if (saturnEl === 'E') {
        score += 15;
        signals.push(`Saturn in Earth (grounded discipline)`);
    } else if (saturnEl === 'W') {
        score += 8;
        signals.push(`Saturn in Water (emotional containment)`);
    }

    // Fixed modality emphasis (persistence, follow-through)
    let fixedCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        if (planet?.sign && isFixed(planet.sign)) {
            fixedCount++;
        }
    }
    if (fixedCount >= 4) {
        score += 12;
        signals.push(`Strong Fixed emphasis (persistent, determined)`);
    } else if (fixedCount <= 1) {
        score -= 8;
        signals.push(`Low Fixed emphasis (fluid, less locked-in)`);
    }

    // 6th house emphasis (service, routine, attention to detail)
    const sun = positions['Sun'] || positions['sun'];
    const moon = positions['Moon'] || positions['moon'];
    const mercury = positions['Mercury'] || positions['mercury'];
    if (sun?.house === 6 || moon?.house === 6 || mercury?.house === 6) {
        score += 10;
        signals.push(`6th house emphasis (service-oriented, detail-aware)`);
    }

    // 10th house emphasis (achievement, responsibility)
    if (sun?.house === 10 || saturn?.house === 10) {
        score += 10;
        signals.push(`10th house emphasis (responsibility-focused)`);
    }

    // Capricorn stellium (multiple planets in Cap)
    let capCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        if (norm(planet?.sign) === 'Cap') {
            capCount++;
        }
    }
    if (capCount >= 3) {
        score += 10;
        signals.push(`Capricorn concentration (structural emphasis)`);
    }

    return {
        value: Math.max(0, Math.min(100, score)),
        band: scoreToBand(score),
        signals,
    };
}

/**
 * Extraversion
 * High: Outward-moving, energized by contact
 * Low: Inward-moving, restored by solitude
 * 
 * NOTE: This overlaps significantly with MBTI E/I axis.
 * Sources: Moon element, Saturn bias (same as MBTI)
 */
function inferExtraversion(positions: Record<string, any>): BigFiveScore {
    const signals: string[] = [];
    let score = 50;

    // Moon element (Fire/Air = outward-moving)
    const moon = positions['Moon'] || positions['moon'];
    const moonEl = elem(moon?.sign);
    if (moonEl === 'F' || moonEl === 'A') {
        score += 18;
        signals.push(`Moon in ${moonEl === 'F' ? 'Fire' : 'Air'} (outward-moving energy)`);
    } else if (moonEl === 'W' || moonEl === 'E') {
        score -= 15;
        signals.push(`Moon in ${moonEl === 'W' ? 'Water' : 'Earth'} (inward-moving energy)`);
    }

    // Saturn bias
    const saturn = positions['Saturn'] || positions['saturn'];
    const saturnEl = elem(saturn?.sign);
    if (saturnEl === 'F' || saturnEl === 'A') {
        score += 8;
        signals.push(`Saturn in ${saturnEl === 'F' ? 'Fire' : 'Air'} (outward structure)`);
    } else if (isWater(saturn?.sign) || saturn?.house === 12) {
        score -= 12;
        signals.push(`Saturn in Water/12th (deep inward gravity)`);
    }

    // 1st house emphasis (self-projection)
    const sun = positions['Sun'] || positions['sun'];
    const mars = positions['Mars'] || positions['mars'];
    if (sun?.house === 1 || mars?.house === 1) {
        score += 8;
        signals.push(`1st house emphasis (self-projecting)`);
    }

    return {
        value: Math.max(0, Math.min(100, score)),
        band: scoreToBand(score),
        signals,
    };
}

/**
 * Agreeableness
 * High: Harmonizing, accommodating, merging-tendency
 * Low: Edge-preserving, autonomous, maintains contour
 * 
 * Sources: Venus-Moon harmony, Libra/Pisces emphasis, 7th house
 */
function inferAgreeableness(positions: Record<string, any>): BigFiveScore {
    const signals: string[] = [];
    let score = 50;

    // Venus-Moon element harmony
    const venus = positions['Venus'] || positions['venus'];
    const moon = positions['Moon'] || positions['moon'];
    const venusEl = elem(venus?.sign);
    const moonEl = elem(moon?.sign);

    if (venusEl && moonEl && venusEl === moonEl) {
        score += 12;
        signals.push(`Venus-Moon harmony (values and feelings aligned)`);
    }

    // Venus in Water (empathic connection style)
    if (venusEl === 'W') {
        score += 10;
        signals.push(`Venus in Water (emotionally attuned connection)`);
    } else if (venusEl === 'A') {
        score += 5;
        signals.push(`Venus in Air (socially fluent)`);
    }

    // Libra emphasis (relationship-oriented)
    let libraCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        if (norm(planet?.sign) === 'Lib') {
            libraCount++;
        }
    }
    if (libraCount >= 2) {
        score += 10;
        signals.push(`Libra emphasis (harmony-seeking)`);
    }

    // Pisces emphasis (boundary-diffusing)
    let piscesCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        if (norm(planet?.sign) === 'Pis') {
            piscesCount++;
        }
    }
    if (piscesCount >= 2) {
        score += 8;
        signals.push(`Pisces emphasis (permeable boundaries)`);
    }

    // 7th house emphasis (partnership focus)
    const sun = positions['Sun'] || positions['sun'];
    if (sun?.house === 7 || venus?.house === 7) {
        score += 10;
        signals.push(`7th house emphasis (partnership-oriented)`);
    }

    // Mars in Aries/Scorpio reduces agreeableness (edge-preserving)
    const mars = positions['Mars'] || positions['mars'];
    if (norm(mars?.sign) === 'Ari' || norm(mars?.sign) === 'Sco') {
        score -= 10;
        signals.push(`Mars in ${norm(mars?.sign) === 'Ari' ? 'Aries' : 'Scorpio'} (edge-preserving)`);
    }

    return {
        value: Math.max(0, Math.min(100, score)),
        band: scoreToBand(score),
        signals,
    };
}

/**
 * Neuroticism (Emotional Reactivity / Sensitivity)
 * High: Sensitized, reactive to pressure gradients, early-warning active
 * Low: Even-keel, stable under load, low volatility
 * 
 * NOTE: We frame this as "sensitivity" rather than dysfunction.
 * Sources: Water emphasis, Chiron placement, 4th/8th/12th house, Moon aspects
 */
function inferNeuroticism(positions: Record<string, any>): BigFiveScore {
    const signals: string[] = [];
    let score = 50;

    // Water element concentration
    let waterCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        if (planet?.sign && isWater(planet.sign)) {
            waterCount++;
        }
    }
    if (waterCount >= 4) {
        score += 15;
        signals.push(`Strong Water emphasis (emotionally sensitized)`);
    } else if (waterCount <= 1) {
        score -= 10;
        signals.push(`Low Water emphasis (emotionally steady)`);
    }

    // Moon in Water (amplifies emotional responsiveness)
    const moon = positions['Moon'] || positions['moon'];
    if (isWater(moon?.sign)) {
        score += 8;
        signals.push(`Moon in Water (deep emotional resonance)`);
    }

    // 4th/8th/12th house Moon (internal processing emphasis)
    if (moon?.house === 4 || moon?.house === 8 || moon?.house === 12) {
        score += 8;
        signals.push(`Moon in ${moon.house === 4 ? '4th' : moon.house === 8 ? '8th' : '12th'} house (internal processing depth)`);
    }

    // Chiron prominent (wound-awareness)
    const chiron = positions['Chiron'] || positions['chiron'];
    if (chiron && (chiron.house === 1 || chiron.house === 7 || chiron.house === 10)) {
        score += 8;
        signals.push(`Chiron in angular house (sensitized to relational dynamics)`);
    }

    // Scorpio stellium (intensity, depth of feeling)
    let scorpioCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        if (norm(planet?.sign) === 'Sco') {
            scorpioCount++;
        }
    }
    if (scorpioCount >= 3) {
        score += 10;
        signals.push(`Scorpio concentration (intensity, depth-tracking)`);
    }

    // Earth/Air emphasis stabilizes (reduces reactivity)
    let earthAirCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        const el = elem(planet?.sign);
        if (el === 'E' || el === 'A') {
            earthAirCount++;
        }
    }
    if (earthAirCount >= 5) {
        score -= 10;
        signals.push(`Earth/Air emphasis (grounded, steady baseline)`);
    }

    return {
        value: Math.max(0, Math.min(100, score)),
        band: scoreToBand(score),
        signals,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Inference Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infer Big Five profile from chart geometry.
 * Returns null if insufficient data.
 * 
 * REMEMBER: This is BACKSTAGE ONLY. Never surface these labels frontstage.
 * Use the vocabularyShaper to translate scores into symbolic language.
 */
export function inferBigFiveFromChart(chart?: ChartInput | null): BigFiveProfile | null {
    if (!chart?.positions || Object.keys(chart.positions).length < 3) return null;

    const positions = chart.positions;

    return {
        O: inferOpenness(positions),
        C: inferConscientiousness(positions),
        E: inferExtraversion(positions),
        A: inferAgreeableness(positions),
        N: inferNeuroticism(positions),
        _framework_note: 'Big Five inferred from interior geometry — shapes vocabulary, never surfaces as labels',
    };
}

export default inferBigFiveFromChart;
