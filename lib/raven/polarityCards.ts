/**
 * Polarity Cards — Relational Currents Between Two Systems
 * 
 * Polarity Cards describe how two cognitive architectures (MBTI-ish axes)
 * pull on each other in the shared field. They don't type people—they
 * describe relational dynamics.
 * 
 * AXES:
 * - I ↔ E: Interior Chamber ↔ Shared Horizon
 * - N ↔ S: Pattern Lattice ↔ Concrete Anchor
 * - T ↔ F: Structure Spine ↔ Resonance Tide
 * - J ↔ P: Closure Gate ↔ Permeable Path
 * 
 * SST CLASSIFICATION:
 * Each card gets WB/ABE/OSR status:
 * - WB: Workable difference, normal stretch
 * - ABE: Weaponized axis, one side inverted
 * - OSR: No resonance, axis doesn't describe this pair
 * 
 * MOTION LANGUAGE:
 * Cards describe field dynamics ("The field stretches between...")
 * NOT identity verdicts ("You are introverted, they are extroverted")
 * 
 * @internal — Supports relational narrative, never surfaces framework
 */

import type { BigFiveProfile } from '../bigfive/inferBigFiveFromChart';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PolarityAxis = 'I_E' | 'N_S' | 'T_F' | 'J_P';
export type SSTStatus = 'WB' | 'ABE' | 'OSR';
export type Position = 'left' | 'center' | 'right';
export type Stretch = 'aligned' | 'moderate' | 'wide';

export interface PolarityCard {
    /** Which axis this card represents */
    axis: PolarityAxis;
    /** Human-readable axis name */
    axisName: string;
    /** Symbolic names for each pole */
    poles: [string, string];
    /** Where Person A sits on this axis */
    positionA: Position;
    /** Where Person B sits on this axis */
    positionB: Position;
    /** How far apart they are */
    stretch: Stretch;
    /** SST classification (default WB, can be upgraded) */
    sstStatus: SSTStatus;
    /** Field effect description (motion language) */
    fieldEffect: string;
    /** Signals that drove this inference */
    signals: string[];
}

export interface CognitiveArchitecture {
    /** Interior-first vs Exterior-first */
    I_E: { position: Position; strength: number; signals: string[] };
    /** Pattern-first vs Concrete-first */
    N_S: { position: Position; strength: number; signals: string[] };
    /** Structure-first vs Resonance-first */
    T_F: { position: Position; strength: number; signals: string[] };
    /** Closure-first vs Permeability-first */
    J_P: { position: Position; strength: number; signals: string[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Axis Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const AXIS_DEFINITIONS: Record<PolarityAxis, { name: string; poles: [string, string] }> = {
    I_E: { name: 'Energy Direction', poles: ['Interior Chamber', 'Shared Horizon'] },
    N_S: { name: 'Perception Mode', poles: ['Pattern Lattice', 'Concrete Anchor'] },
    T_F: { name: 'Decision Mode', poles: ['Structure Spine', 'Resonance Tide'] },
    J_P: { name: 'Closure Style', poles: ['Closure Gate', 'Permeable Path'] },
};

// ─────────────────────────────────────────────────────────────────────────────
// Field Effect Templates (Motion Language)
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_EFFECTS: Record<PolarityAxis, { aligned: string; moderate: string; wide: string }> = {
    I_E: {
        aligned: 'The field rests at similar depth—both systems prefer the same ignition zone.',
        moderate: 'The field gently stretches between inward restoration and outward contact. One moves toward quiet while the other warms to the room.',
        wide: 'The field stretches wide between interior chamber and shared horizon. One retreats to restore; the other ignites in contact. If unspoken, this can look like withdrawn vs. overwhelming.',
    },
    N_S: {
        aligned: 'The field shares a similar focus—both systems track at the same zoom level.',
        moderate: 'The field gently stretches between pattern and particular. One sees the forest; the other counts the trees.',
        wide: 'The field stretches wide between pattern lattice and concrete anchor. One speaks in "this always happens," the other tracks "this happened last Tuesday." Both are true—different zoom levels.',
    },
    T_F: {
        aligned: 'The field shares a similar decision engine—both systems weight the same currency.',
        moderate: 'The field gently stretches between structure and resonance. One asks "what is accurate?" the other asks "what feels right?"',
        wide: 'The field stretches wide between structure spine and resonance tide. One builds from logic; the other navigates by felt coherence. When under pressure, these can talk past each other.',
    },
    J_P: {
        aligned: 'The field shares a similar closure rhythm—both systems prefer the same pacing.',
        moderate: 'The field gently stretches between closure and permeability. One wants the door shut; the other leaves it ajar.',
        wide: 'The field stretches wide between closure gate and permeable path. One craves resolution; the other needs options to stay open. This can show as tension around "when is it done?"',
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Cognitive Architecture Inference (from Big Five + Chart)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infer cognitive architecture from Big Five profile
 * Maps Big Five dimensions to MBTI-ish axes
 */
export function inferCognitiveArchitecture(
    profile: BigFiveProfile,
    positions?: Record<string, any>
): CognitiveArchitecture {

    // ─── I/E Axis: Primarily from Extraversion ───
    const e = profile.E;
    const iePosition: Position = e.band === 'high' ? 'right' : e.band === 'low' ? 'left' : 'center';
    const ieStrength = Math.abs(e.value - 50);

    // ─── N/S Axis: Primarily from Openness ───
    const o = profile.O;
    const nsPosition: Position = o.band === 'high' ? 'left' : o.band === 'low' ? 'right' : 'center';
    const nsStrength = Math.abs(o.value - 50);

    // ─── T/F Axis: From Agreeableness (inverted) ───
    // High A = Feeling preference, Low A = Thinking preference
    const a = profile.A;
    const tfPosition: Position = a.band === 'high' ? 'right' : a.band === 'low' ? 'left' : 'center';
    const tfStrength = Math.abs(a.value - 50);

    // ─── J/P Axis: Primarily from Conscientiousness ───
    const c = profile.C;
    const jpPosition: Position = c.band === 'high' ? 'left' : c.band === 'low' ? 'right' : 'center';
    const jpStrength = Math.abs(c.value - 50);

    return {
        I_E: { position: iePosition, strength: ieStrength, signals: e.signals },
        N_S: { position: nsPosition, strength: nsStrength, signals: o.signals },
        T_F: { position: tfPosition, strength: tfStrength, signals: a.signals },
        J_P: { position: jpPosition, strength: jpStrength, signals: c.signals },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Polarity Card Generation
// ─────────────────────────────────────────────────────────────────────────────

function calculateStretch(posA: Position, posB: Position): Stretch {
    if (posA === posB) return 'aligned';
    if (posA === 'center' || posB === 'center') return 'moderate';
    if ((posA === 'left' && posB === 'right') || (posA === 'right' && posB === 'left')) return 'wide';
    return 'moderate';
}

/**
 * Generate polarity cards for a relational field between two cognitive architectures
 */
export function generatePolarityCards(
    archA: CognitiveArchitecture,
    archB: CognitiveArchitecture,
    nameA?: string,
    nameB?: string
): PolarityCard[] {
    const cards: PolarityCard[] = [];
    const axes: PolarityAxis[] = ['I_E', 'N_S', 'T_F', 'J_P'];

    for (const axis of axes) {
        const posA = archA[axis].position;
        const posB = archB[axis].position;
        const stretch = calculateStretch(posA, posB);
        const def = AXIS_DEFINITIONS[axis];
        const effects = FIELD_EFFECTS[axis];

        // Only generate cards for non-aligned axes (where there's actual stretch)
        // Or generate all for completeness
        const card: PolarityCard = {
            axis,
            axisName: def.name,
            poles: def.poles,
            positionA: posA,
            positionB: posB,
            stretch,
            sstStatus: 'WB', // Default to Within Boundary
            fieldEffect: effects[stretch],
            signals: [...archA[axis].signals, ...archB[axis].signals],
        };

        cards.push(card);
    }

    // Sort by stretch (wide first, as those have most friction)
    const stretchOrder = { wide: 0, moderate: 1, aligned: 2 };
    cards.sort((a, b) => stretchOrder[a.stretch] - stretchOrder[b.stretch]);

    return cards;
}

/**
 * Generate narrative section for polarity cards
 */
export function generatePolaritySection(
    archA: CognitiveArchitecture,
    archB: CognitiveArchitecture,
    nameA: string = 'Person A',
    nameB: string = 'Person B'
): string[] {
    const cards = generatePolarityCards(archA, archB, nameA, nameB);
    const lines: string[] = [];

    lines.push('### Polarity Cards — Where the Compasses Differ');
    lines.push('');

    // Only show cards with actual stretch
    const activeCards = cards.filter(c => c.stretch !== 'aligned');

    if (activeCards.length === 0) {
        lines.push('The cognitive architectures are broadly aligned. No major axis stretch detected.');
        return lines;
    }

    for (const card of activeCards) {
        const stretchIcon = card.stretch === 'wide' ? '⚡⚡' : '⚡';
        lines.push(`**${card.poles[0]} ↔ ${card.poles[1]}** ${stretchIcon} [${card.sstStatus}]`);
        lines.push(card.fieldEffect);
        lines.push('');
    }

    return lines;
}

export default {
    AXIS_DEFINITIONS,
    inferCognitiveArchitecture,
    generatePolarityCards,
    generatePolaritySection,
};
