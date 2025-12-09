/**
 * Tension Synthesis — The Dual-Trigger Physics Engine (v2.0)
 * 
 * This module detects internal tensions using TWO complementary approaches:
 * 1. GLOBAL THRESHOLDS: Big Five bands (High O + High N → Sponge)
 * 2. LOCAL GEOMETRY: Specific placements (Pisces Moon 6H + Virgo Rising → Absorber)
 * 
 * PHILOSOPHY:
 * "Let geometry set the floor and Big Five adjust the volume, not the other way around."
 * 
 * SST CLASSIFICATION:
 * Every tension is tagged with Symbolic Spectrum Table status:
 * - WB (Within Boundary): Translatable shadow, on-theme but strained
 * - ABE (At Boundary Edge): Symbolic inversion, broken compass
 * - OSR (Outside Symbolic Range): Signal void, no resonance
 * 
 * INSTRUMENT-VS-MUSICIAN:
 * All friction sentences describe the TOOL, not the person.
 * "Your system includes a high-permeability intake" NOT "You are a sponge."
 * 
 * @internal — Works with vocabulary shaping, never surfaces framework names
 */

import type { BigFiveProfile } from './inferBigFiveFromChart';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SSTStatus = 'WB' | 'ABE' | 'OSR';
export type TriggerSource = 'global' | 'local' | 'both';

export interface TensionPattern {
    /** Unique identifier for this tension */
    id: string;
    /** Human-readable name (backstage only) */
    name: string;
    /** First dimension involved (for global trigger) */
    dimA?: 'O' | 'C' | 'E' | 'A' | 'N';
    /** Second dimension involved (for global trigger) */
    dimB?: 'O' | 'C' | 'E' | 'A' | 'N';
    /** What bands trigger this tension (global) */
    globalCondition?: {
        bandA: 'high' | 'moderate' | 'low';
        bandB: 'high' | 'moderate' | 'low';
    };
    /** The friction sentences (instrument-first, multiple skins) */
    friction: {
        architect: string;
        narrator: string;
    };
    /** How the tension typically manifests */
    mechanism: string;
    /** Default SST status if behavior not yet validated */
    defaultSST: SSTStatus;
}

export interface LocalGeometryFlag {
    /** Pattern this triggers */
    patternId: string;
    /** Description of the condition */
    condition: string;
    /** Function to check if flag is active */
    check: (positions: Record<string, any>, angleSigns?: Record<string, string>) => boolean;
}

export interface DetectedTension {
    pattern: TensionPattern;
    /** How strong (1-3) based on deviation from baseline */
    intensity: 1 | 2 | 3;
    /** SST classification */
    sstStatus: SSTStatus;
    /** What triggered this detection */
    source: TriggerSource;
    /** Which signals activated this */
    signals: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Element/Modality Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ELEMENTS: Record<string, 'F' | 'E' | 'A' | 'W'> = {
    Ari: 'F', Leo: 'F', Sag: 'F',
    Tau: 'E', Vir: 'E', Cap: 'E',
    Gem: 'A', Lib: 'A', Aqu: 'A',
    Can: 'W', Sco: 'W', Pis: 'W',
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

function isWater(sign?: string | null): boolean { return elem(sign) === 'W'; }
function isEarth(sign?: string | null): boolean { return elem(sign) === 'E'; }

// ─────────────────────────────────────────────────────────────────────────────
// Tension Map — Instrument-First Language
// ─────────────────────────────────────────────────────────────────────────────

export const TENSION_MAP: TensionPattern[] = [
    // ============================================
    // THE SPONGE / ABSORBER: High intake + High processing cost
    // ============================================
    {
        id: 'sponge',
        name: 'The Sponge Effect',
        dimA: 'O',
        dimB: 'N',
        globalCondition: { bandA: 'high', bandB: 'high' },
        friction: {
            architect: 'Your system includes a **high-permeability intake** paired with a **heavy-duty processor**. As a tool, it is built for noticing subtle shifts quickly. In shadow, this can show up as carrying more emotional weight than your body can comfortably hold.',
            narrator: 'Your system includes an **open-door policy** and a **slow-burning hearth**. As a tool, this is built for deep attunement—you sense what others miss. In shadow, you may find yourself full before you feel fed, absorbing more than you meant to.',
        },
        mechanism: 'High permeability + high processing cost = saturation and delayed emotional resolution',
        defaultSST: 'WB',
    },
    {
        id: 'absorber',
        name: 'The Absorber',
        dimA: 'A',
        dimB: 'N',
        globalCondition: { bandA: 'high', bandB: 'high' },
        friction: {
            architect: 'Your system includes a **field-harmonizing relay** paired with **high processing cost**. As a tool, it is built for creating relational coherence. In shadow, this can show up as absorbing emotional residue—others feel soothed while you feel saturated.',
            narrator: 'Your system includes a **room-reading sensor** and a **deep-processing core**. As a tool, you are built to smooth friction and translate between people. In shadow, the peace you create for others may come at your own body\'s expense.',
        },
        mechanism: 'High accommodation + high sensitivity = relational labor and emotional accumulation',
        defaultSST: 'WB',
    },

    // ============================================
    // IGNITION vs INSPECTION: Drive + Structure tension
    // ============================================
    {
        id: 'brake_gas',
        name: 'Ignition vs Inspection',
        dimA: 'E',
        dimB: 'C',
        globalCondition: { bandA: 'high', bandB: 'high' },
        friction: {
            architect: 'Your system includes both an **ignition module** and an **inspection protocol**. As a tool, this is built for high-energy, high-quality output. In shadow, this can show up as internal oscillation—bursts of engagement followed by meticulous post-processing.',
            narrator: 'Your system includes both a **leap-first impulse** and a **measure-twice voice**. As a tool, you are built for bold action with follow-through. In shadow, you may feel the pull of both at once—the desire to start moving and the part that says "wait."',
        },
        mechanism: 'High drive to engage + high need for structure = internal oscillation',
        defaultSST: 'WB',
    },

    // ============================================
    // COMMITMENT LAG: Fast exploration + Slow binding
    // ============================================
    {
        id: 'commitment_lag',
        name: 'Opens Fast, Closes Slow',
        dimA: 'O',
        dimB: 'C',
        globalCondition: { bandA: 'high', bandB: 'high' },
        friction: {
            architect: 'Your system includes a **high sampling rate** with a **high commitment threshold**. As a tool, this is built for thorough exploration before durable binding. In shadow, this can show up as delayed commitment—fast exploration, slow lock-in.',
            narrator: 'Your system includes a **wide scanning lens** and a **serious follow-through gear**. As a tool, you are built to try many things before choosing. In shadow, your \"no\" may be delayed—but when it comes, it is final.',
        },
        mechanism: 'Wide aperture + strong follow-through = fast exploration, slow commitment',
        defaultSST: 'WB',
    },

    // ============================================
    // THE GATEKEEPER: Narrow intake + Strong holding
    // ============================================
    {
        id: 'gatekeeper',
        name: 'The Gatekeeper',
        dimA: 'O',
        dimB: 'C',
        globalCondition: { bandA: 'low', bandB: 'high' },
        friction: {
            architect: 'Your system includes a **verification loop** before intake. As a tool, this is built for quality control—you check fit, value, and structural integrity before accepting input. In shadow, this can show up as over-filtering or difficulty letting new things in.',
            narrator: 'Your system includes a **careful entry protocol**. As a tool, you are built to protect what matters by checking before opening. In shadow, you may build so slowly that opportunities pass by, even when they were right for you.',
        },
        mechanism: 'Narrow aperture + high structure = careful intake, durable commitment',
        defaultSST: 'WB',
    },

    // ============================================
    // THE ANCHOR: Stability + Structure
    // ============================================
    {
        id: 'anchor',
        name: 'The Anchor',
        dimA: 'N',
        dimB: 'C',
        globalCondition: { bandA: 'low', bandB: 'high' },
        friction: {
            architect: 'Your system includes a **low-reactivity baseline** with **high structural emphasis**. As a tool, this is built for reliable, grounded presence. In shadow, this can show up as suppression—you may not feel entitled to the turbulence you hold steady.',
            narrator: 'Your system includes a **steady keel** and a **load-bearing frame**. As a tool, you are built to hold ground when others shake. In shadow, you may forget that you are allowed to shake too. The anchor is still in the water; it just doesn\'t move much.',
        },
        mechanism: 'Emotional stability + structural discipline = reliable ground, possible suppression',
        defaultSST: 'WB',
    },

    // ============================================
    // THE LIVE WIRE: High intake + High output
    // ============================================
    {
        id: 'live_wire',
        name: 'The Live Wire',
        dimA: 'O',
        dimB: 'E',
        globalCondition: { bandA: 'high', bandB: 'high' },
        friction: {
            architect: 'Your system includes **maximum throughput** wiring: high intake, high output. As a tool, this is built for brightness, velocity, and connection. In shadow, this can show up as running hot—the same thing that makes you magnetic can make you exhausted.',
            narrator: 'Your system includes a **wide antenna** and a **broadcast tower**. As a tool, you are built to sample ideas, connect with people, and move fast. In shadow, you can run through fuel quickly if you don\'t monitor the tank.',
        },
        mechanism: 'Wide aperture + outward energy = high-broadcast, high-velocity, potential burnout',
        defaultSST: 'WB',
    },

    // ============================================
    // THE INTERNAL EXPLORER: High intake + Low output
    // ============================================
    {
        id: 'internal_explorer',
        name: 'The Internal Explorer',
        dimA: 'O',
        dimB: 'E',
        globalCondition: { bandA: 'high', bandB: 'low' },
        friction: {
            architect: 'Your system includes **wide-scan intake** with **selective output routing**. As a tool, this is built for rich internal synthesis. In shadow, this can show up as feeling under-known—your universe is invisible to people who think they know you.',
            narrator: 'Your system includes a **vast internal library** and a **carefully guarded front door**. As a tool, you are built to explore constantly, but quietly. In shadow, you may share so selectively that your depth goes unseen.',
        },
        mechanism: 'Wide aperture + inward energy = rich interior life, selective disclosure',
        defaultSST: 'WB',
    },

    // ============================================
    // THE LONE WOLF: Self-referenced + Independent
    // ============================================
    {
        id: 'lone_wolf',
        name: 'The Lone Wolf',
        dimA: 'A',
        dimB: 'E',
        globalCondition: { bandA: 'low', bandB: 'low' },
        friction: {
            architect: 'Your system includes **self-referencing** with **internal restoration**. As a tool, this is built for autonomous orbit—you move through social space without needing it to validate your position. In shadow, this can show up as isolation or difficulty receiving help.',
            narrator: 'Your system includes its **own center of gravity**. As a tool, you are built for self-sufficiency. In shadow, you may hold your own ground so firmly that you forget how to borrow from others.',
        },
        mechanism: 'Edge-preserving + inward energy = autonomous, self-referenced stability',
        defaultSST: 'WB',
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Local Geometry Flags — Placement-Specific Triggers
// ─────────────────────────────────────────────────────────────────────────────

export const LOCAL_GEOMETRY_FLAGS: LocalGeometryFlag[] = [
    // ============================================
    // SPONGE/ABSORBER: Water Moon in service/emotional houses
    // ============================================
    {
        patternId: 'sponge',
        condition: 'Water Moon in 4th/6th/8th/12th house',
        check: (pos) => {
            const moon = pos['Moon'] || pos['moon'];
            if (!moon) return false;
            const h = moon.house;
            return isWater(moon.sign) && [4, 6, 8, 12].includes(h);
        },
    },
    {
        patternId: 'absorber',
        condition: 'Water Moon + Earth Rising',
        check: (pos, angleSigns) => {
            const moon = pos['Moon'] || pos['moon'];
            const asc = angleSigns?.ascendant || angleSigns?.Ascendant;
            if (!moon) return false;
            return isWater(moon.sign) && isEarth(asc);
        },
    },
    {
        patternId: 'absorber',
        condition: 'Pisces/Cancer Moon + Virgo/Capricorn emphasis',
        check: (pos) => {
            const moon = pos['Moon'] || pos['moon'];
            const moonSign = norm(moon?.sign);
            if (!['Pis', 'Can'].includes(moonSign || '')) return false;

            // Check for Cap/Vir emphasis (3+ planets)
            let earthMethodCount = 0;
            for (const [_, planet] of Object.entries(pos)) {
                const s = norm((planet as any)?.sign);
                if (s === 'Cap' || s === 'Vir') earthMethodCount++;
            }
            return earthMethodCount >= 3;
        },
    },

    // ============================================
    // GATEKEEPER: Saturn on angles or in communication houses
    // ============================================
    {
        patternId: 'gatekeeper',
        condition: 'Saturn in 1st/3rd/7th house',
        check: (pos) => {
            const saturn = pos['Saturn'] || pos['saturn'];
            if (!saturn) return false;
            return [1, 3, 7].includes(saturn.house);
        },
    },

    // ============================================
    // ANCHOR with Live Wire Edge: Fixed fire + Fixed air
    // ============================================
    {
        patternId: 'anchor',
        condition: 'Sun in Fixed Fire + Moon in Fixed Air',
        check: (pos) => {
            const sun = pos['Sun'] || pos['sun'];
            const moon = pos['Moon'] || pos['moon'];
            const sunSign = norm(sun?.sign);
            const moonSign = norm(moon?.sign);
            return sunSign === 'Leo' && moonSign === 'Aqu';
        },
    },

    // ============================================
    // IGNITION vs INSPECTION: Mars in Mutable + Saturn/Mercury in Earth
    // ============================================
    {
        patternId: 'brake_gas',
        condition: 'Mars in Mutable + Mercury/Saturn in Earth',
        check: (pos) => {
            const mars = pos['Mars'] || pos['mars'];
            const mercury = pos['Mercury'] || pos['mercury'];
            const saturn = pos['Saturn'] || pos['saturn'];

            const marsSign = norm(mars?.sign);
            const mutableSigns = ['Gem', 'Vir', 'Sag', 'Pis'];

            if (!mutableSigns.includes(marsSign || '')) return false;

            return isEarth(mercury?.sign) || isEarth(saturn?.sign);
        },
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dual Detection Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect all active tensions using DUAL TRIGGER approach:
 * - Pass 1: Global Big Five thresholds
 * - Pass 2: Local geometry flags
 * - Merge: Dedupe and combine sources
 */
export function detectTensions(
    profile: BigFiveProfile,
    positions?: Record<string, any>,
    angleSigns?: Record<string, string>
): DetectedTension[] {
    const detectedMap = new Map<string, DetectedTension>();

    // ─── PASS 1: Global Trait Thresholds ───
    for (const pattern of TENSION_MAP) {
        if (!pattern.dimA || !pattern.dimB || !pattern.globalCondition) continue;

        const dimAValue = profile[pattern.dimA];
        const dimBValue = profile[pattern.dimB];

        if (dimAValue.band === pattern.globalCondition.bandA &&
            dimBValue.band === pattern.globalCondition.bandB) {

            const deviationA = Math.abs(dimAValue.value - 50);
            const deviationB = Math.abs(dimBValue.value - 50);
            const avgDeviation = (deviationA + deviationB) / 2;

            let intensity: 1 | 2 | 3 = 1;
            if (avgDeviation >= 25) intensity = 3;
            else if (avgDeviation >= 15) intensity = 2;

            detectedMap.set(pattern.id, {
                pattern,
                intensity,
                sstStatus: pattern.defaultSST,
                source: 'global',
                signals: [`${pattern.dimA}-${dimAValue.band}`, `${pattern.dimB}-${dimBValue.band}`],
            });
        }
    }

    // ─── PASS 2: Local Geometry Flags ───
    if (positions) {
        for (const flag of LOCAL_GEOMETRY_FLAGS) {
            if (flag.check(positions, angleSigns)) {
                const pattern = TENSION_MAP.find(p => p.id === flag.patternId);
                if (!pattern) continue;

                const existing = detectedMap.get(pattern.id);
                if (existing) {
                    // Both sources triggered - upgrade source and add signal
                    existing.source = 'both';
                    existing.signals.push(`LOCAL: ${flag.condition}`);
                    // Bump intensity if both triggered
                    if (existing.intensity < 3) {
                        existing.intensity = (existing.intensity + 1) as 1 | 2 | 3;
                    }
                } else {
                    // Only local triggered - still valid detection
                    detectedMap.set(pattern.id, {
                        pattern,
                        intensity: 2, // Local-only gets medium intensity
                        sstStatus: pattern.defaultSST,
                        source: 'local',
                        signals: [`LOCAL: ${flag.condition}`],
                    });
                }
            }
        }
    }

    // Sort by intensity (strongest first), then by both > local > global
    const result = Array.from(detectedMap.values());
    result.sort((a, b) => {
        if (b.intensity !== a.intensity) return b.intensity - a.intensity;
        const sourceOrder = { both: 0, local: 1, global: 2 };
        return sourceOrder[a.source] - sourceOrder[b.source];
    });

    return result;
}

/**
 * Get friction sentences for detected tensions
 * @param style - 'architect' for mechanical, 'narrator' for lived-feeling
 */
export function getFrictionSentences(
    tensions: DetectedTension[],
    style: 'architect' | 'narrator' = 'narrator'
): string[] {
    return tensions.map(t => t.pattern.friction[style]);
}

/**
 * Generate a tension synthesis section for narrative
 */
export function generateTensionSection(
    profile: BigFiveProfile,
    positions?: Record<string, any>,
    angleSigns?: Record<string, string>,
    style: 'architect' | 'narrator' = 'narrator',
    limit: number = 3
): string[] {
    const tensions = detectTensions(profile, positions, angleSigns);
    if (tensions.length === 0) return [];

    const lines: string[] = [];
    lines.push('### Core Tensions — Where the Parts Rub');
    lines.push('');

    const topTensions = tensions.slice(0, limit);
    for (const tension of topTensions) {
        const sourceTag = tension.source === 'both' ? '⚡⚡' :
            tension.source === 'local' ? '📍' : '📊';
        lines.push(`**${tension.pattern.name}** ${sourceTag} [${tension.sstStatus}]`);
        lines.push(tension.pattern.friction[style]);
        lines.push('');
    }

    return lines;
}

export default {
    TENSION_MAP,
    LOCAL_GEOMETRY_FLAGS,
    detectTensions,
    getFrictionSentences,
    generateTensionSection,
};
