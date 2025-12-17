/**
 * Temporal Binding — How You Hold What Happened
 * 
 * This module maps the STRUCTURAL WEIGHT of experience over time.
 * Not memory (cognitive retrieval), but how quickly emotional data decays
 * and how tightly past events bind to the present field.
 * 
 * AXIS: Temporal Binding Strength
 * - How long does an experience remain structurally load-bearing?
 * - What is the half-life of emotional events in your system?
 * 
 * CLASSES:
 * - ARCHITECTURE_HEAVY: Everything that mattered is still in the room
 * - FLEXIBLE_THREAD: What mattered stays, but can be set down
 * - CHAPTER_BASED: It was real then; now it's a finished chapter
 * - REFRAMED_ARCHIVE: What happened is kept, but meaning is edited
 * 
 * SIGNAL FIDELITY (per Gemini Raven):
 * - HIGH: Holds exact shape of event (Scorpio: "I remember exactly what you said")
 * - VARIABLE: Holds emotional impression, blurs facts (Pisces: "I remember how it felt")
 * - CONTEXTUAL: Fidelity shifts based on current need
 * 
 * @internal — Commercial Raven layer, never surfaces geometry
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TemporalBindingClass =
    | 'ARCHITECTURE_HEAVY'  // High binding, long half-life
    | 'FLEXIBLE_THREAD'     // Medium binding, context-dependent
    | 'CHAPTER_BASED'       // Low binding, closed episodes
    | 'REFRAMED_ARCHIVE';   // Binding through narrative edit

export type SignalFidelity = 'HIGH' | 'VARIABLE' | 'CONTEXTUAL';

export interface TemporalBindingProfile {
    /** Primary binding class */
    bindingClass: TemporalBindingClass;
    /** Half-life descriptor */
    halfLife: 'long' | 'moderate' | 'short' | 'variable';
    /** Fidelity of the archive */
    signalFidelity: SignalFidelity;
    /** Confidence (0-1) */
    confidence: number;
    /** What signals triggered this classification */
    signals: string[];
}

export interface TemporalCollision {
    /** Person A's binding class */
    classA: TemporalBindingClass;
    /** Person B's binding class */
    classB: TemporalBindingClass;
    /** Collision intensity */
    intensity: 'aligned' | 'slight' | 'moderate' | 'significant';
    /** The friction description */
    collisionScript: string;
    /** Movement for Person A */
    movementA: string;
    /** Movement for Person B */
    movementB: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Class Definitions with Geometric Inputs
// ─────────────────────────────────────────────────────────────────────────────

export interface TemporalBindingDefinition {
    id: TemporalBindingClass;
    name: string;
    tagline: string;
    halfLife: 'long' | 'moderate' | 'short' | 'variable';
    defaultFidelity: SignalFidelity;
    /** Hook sentences for Commercial Raven (frontstage) */
    hooks: string[];
    /** Movement sentence */
    movement: string;
    /** Geometric inputs (backstage) */
    geometricInputs: {
        /** Signs that increase this class */
        signs: string[];
        /** Planet aspects that trigger this */
        aspects: string[];
        /** Houses that reinforce this */
        houses: number[];
    };
}

export const TEMPORAL_BINDING_DEFINITIONS: Record<TemporalBindingClass, TemporalBindingDefinition> = {
    ARCHITECTURE_HEAVY: {
        id: 'ARCHITECTURE_HEAVY',
        name: 'Architecture Heavy',
        tagline: 'Everything that mattered is still in the room.',
        halfLife: 'long',
        defaultFidelity: 'HIGH',
        hooks: [
            'When something matters to you, it doesn\'t just belong to the past. It stays in the room, shaping how you move now.',
            'You don\'t drop emotional truth easily. If it was real then, some part of you still treats it as real now—even if the situation has changed.',
            'For you, meaningful moments don\'t just "fade out"—they stay woven into how you relate now.',
        ],
        movement: 'That\'s why "just move on" advice often lands like erasure for you. It\'s more honest to build new structure than to pretend the old one never existed.',
        geometricInputs: {
            signs: ['Scorpio', 'Taurus', 'Capricorn', 'Cancer'],
            aspects: ['Saturn-Moon', 'Pluto-Moon', 'Saturn-Venus', 'Pluto-Venus'],
            houses: [4, 8, 12],
        },
    },
    FLEXIBLE_THREAD: {
        id: 'FLEXIBLE_THREAD',
        name: 'Flexible Thread',
        tagline: 'What mattered stays, but I can set it down when needed.',
        halfLife: 'moderate',
        defaultFidelity: 'CONTEXTUAL',
        hooks: [
            'You remember what happened, but you can choose how much weight to give it. If an old story stops helping, you\'re able to set it down without pretending it never happened.',
            'You can keep a thread to the past without letting it run the whole show.',
            'Key events remain reference points for you, but they don\'t automatically determine what you do next.',
        ],
        movement: 'That flexibility is a strength—as long as you\'re clear with yourself about which threads you\'re still holding and why.',
        geometricInputs: {
            signs: ['Libra', 'Virgo', 'Aquarius'],
            aspects: ['Jupiter-Moon', 'Mercury-Moon', 'Saturn-Jupiter'],
            houses: [3, 7, 9],
        },
    },
    CHAPTER_BASED: {
        id: 'CHAPTER_BASED',
        name: 'Chapter Based',
        tagline: 'It was real then; now it\'s a finished chapter.',
        halfLife: 'short',
        defaultFidelity: 'HIGH',
        hooks: [
            'When a season ends, you close the book. What happened still counts—but it doesn\'t automatically define how you feel now.',
            'You tend to keep experiences in chapters: real, meaningful, but not always tied to your current choices.',
            'You treat important experiences as completed seasons. They\'re still real, but they don\'t automatically determine what you do in the present.',
        ],
        movement: 'The gift is lightness. The risk is that others who hold the past more tightly can feel like their chapter got closed without warning.',
        geometricInputs: {
            signs: ['Aries', 'Sagittarius', 'Gemini', 'Leo'],
            aspects: ['Uranus-Moon', 'Jupiter-Sun', 'Uranus-Venus'],
            houses: [1, 5, 9, 11],
        },
    },
    REFRAMED_ARCHIVE: {
        id: 'REFRAMED_ARCHIVE',
        name: 'Reframed Archive',
        tagline: 'What happened is kept, but its meaning is edited to protect me.',
        halfLife: 'variable',
        defaultFidelity: 'VARIABLE',
        hooks: [
            'When something starts to feel too heavy, your system reaches for a new way to frame it so it\'s easier to live with.',
            'You tend to protect yourself by changing what a past event meant, rather than just letting it sit as it was.',
            'Your relationship with what happened is fluid—the facts may stay, but the story around them shifts as you need it to.',
        ],
        movement: 'That can be a useful survival tool—as long as you\'re not quietly erasing someone else\'s reality in the process.',
        geometricInputs: {
            signs: ['Pisces', 'Gemini', 'Sagittarius'],
            aspects: ['Neptune-Mercury', 'Neptune-Sun', 'Neptune-Moon', 'Saturn-Neptune'],
            houses: [12, 9, 3],
        },
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Collision Scripts (Relational Physics)
// ─────────────────────────────────────────────────────────────────────────────

export const COLLISION_SCRIPTS: TemporalCollision[] = [
    {
        classA: 'ARCHITECTURE_HEAVY',
        classB: 'CHAPTER_BASED',
        intensity: 'significant',
        collisionScript: 'You are operating in different Time Zones. One of you navigates the room including the history; the other navigates the room as it stands today. One feels erased; the other feels haunted. The fix is to agree on which Time Zone you are discussing before you try to solve the problem.',
        movementA: 'When you feel hurt by how lightly they\'re treating the past, try naming it as a difference in how you each hold what happened, instead of as proof they never cared.',
        movementB: 'When you move on from a chapter internally, try saying so out loud—so the other person isn\'t still living inside a story you\'ve already closed.',
    },
    {
        classA: 'ARCHITECTURE_HEAVY',
        classB: 'REFRAMED_ARCHIVE',
        intensity: 'significant',
        collisionScript: 'You hold the exact shape of what happened; they hold the emotional impression but edit the meaning. When the story they tell doesn\'t match your record, it can feel like gaslighting—but for them, it\'s survival. The fix is to separate "what happened" from "what it meant."',
        movementA: 'Try asking: "Can we agree on the facts first, before we talk about what they meant?"',
        movementB: 'Try acknowledging their version of events before offering your reframe—so they don\'t feel like their reality is being overwritten.',
    },
    {
        classA: 'FLEXIBLE_THREAD',
        classB: 'CHAPTER_BASED',
        intensity: 'slight',
        collisionScript: 'Mild stretch. One keeps more threads active; the other closes books more decisively. This usually only creates friction during transitions—when one person is still referencing something the other considers finished.',
        movementA: 'Check: "Is this still an active thread for you, or have you closed that chapter?"',
        movementB: 'Check: "Have I told you explicitly that I\'ve moved on from this?"',
    },
    {
        classA: 'FLEXIBLE_THREAD',
        classB: 'REFRAMED_ARCHIVE',
        intensity: 'moderate',
        collisionScript: 'You can set things down but you keep them intact. They can\'t set things down without editing them first. This creates friction when you expect consistency in the story and find that it has subtly changed.',
        movementA: 'Assume good faith—their edits are usually protective, not deceptive.',
        movementB: 'Try to hold the story steady when discussing shared history, even if you\'ve privately reframed it.',
    },
    {
        classA: 'CHAPTER_BASED',
        classB: 'REFRAMED_ARCHIVE',
        intensity: 'moderate',
        collisionScript: 'Both of you process the past quickly, but differently. You close chapters cleanly; they close chapters by changing the meaning. Friction arises when their version of a closed chapter doesn\'t match yours.',
        movementA: 'Before assuming they\'re rewriting history, check if they\'re just processing differently.',
        movementB: 'Try to respect that their closed chapter is actually closed—not just reframed into something more comfortable.',
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Inference Logic
// ─────────────────────────────────────────────────────────────────────────────

const ELEMENTS: Record<string, string> = {
    Ari: 'F', Leo: 'F', Sag: 'F',
    Tau: 'E', Vir: 'E', Cap: 'E',
    Gem: 'A', Lib: 'A', Aqu: 'A',
    Can: 'W', Sco: 'W', Pis: 'W',
};

const FIXED_SIGNS = ['Tau', 'Leo', 'Sco', 'Aqu', 'Taurus', 'Leo', 'Scorpio', 'Aquarius'];
const WATER_SIGNS = ['Can', 'Sco', 'Pis', 'Cancer', 'Scorpio', 'Pisces'];

function norm(s?: string | null): string {
    if (!s) return '';
    const t = s.trim().slice(0, 3);
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/**
 * Infer temporal binding profile from chart positions
 */
export function inferTemporalBinding(
    positions: Record<string, any>,
    angleSigns?: Record<string, string>
): TemporalBindingProfile {
    const signals: string[] = [];
    let heavyScore = 0;
    let flexScore = 0;
    let chapterScore = 0;
    let reframeScore = 0;
    let fidelityHigh = 0;
    let fidelityVariable = 0;

    const moon = positions['Moon'] || positions['moon'];
    const sun = positions['Sun'] || positions['sun'];
    const saturn = positions['Saturn'] || positions['saturn'];
    const pluto = positions['Pluto'] || positions['pluto'];
    const neptune = positions['Neptune'] || positions['neptune'];
    const jupiter = positions['Jupiter'] || positions['jupiter'];
    const uranus = positions['Uranus'] || positions['uranus'];

    // Moon sign analysis
    const moonSign = norm(moon?.sign);
    if (['Sco', 'Tau', 'Cap', 'Can'].includes(moonSign)) {
        heavyScore += 3;
        signals.push(`Moon in ${moon?.sign} (high binding)`);
        if (moonSign === 'Sco') fidelityHigh += 2;
    }
    if (['Pis', 'Gem', 'Sag'].includes(moonSign)) {
        reframeScore += 2;
        signals.push(`Moon in ${moon?.sign} (reframe tendency)`);
        if (moonSign === 'Pis') fidelityVariable += 2;
    }
    if (['Ari', 'Leo', 'Gem'].includes(moonSign)) {
        chapterScore += 2;
        signals.push(`Moon in ${moon?.sign} (chapter-based)`);
    }

    // Saturn aspects to Moon (increases binding)
    if (saturn && moon) {
        heavyScore += 2;
        fidelityHigh += 1;
        signals.push('Saturn-Moon (structural memory)');
    }

    // Neptune aspects (increases reframing)
    if (neptune && (moon || sun)) {
        reframeScore += 2;
        fidelityVariable += 2;
        signals.push('Neptune-Luminary (narrative fluidity)');
    }

    // Jupiter/Uranus (increases chapter-based)
    if ((jupiter || uranus) && moon) {
        chapterScore += 2;
        signals.push('Jupiter/Uranus-Moon (quick processing)');
    }

    // 4th/8th/12th house Moon
    if (moon?.house && [4, 8, 12].includes(moon.house)) {
        heavyScore += 2;
        signals.push(`Moon in ${moon.house}H (deep binding)`);
    }

    // Determine primary class
    const scores = [
        { class: 'ARCHITECTURE_HEAVY' as TemporalBindingClass, score: heavyScore },
        { class: 'FLEXIBLE_THREAD' as TemporalBindingClass, score: flexScore + Math.min(heavyScore, chapterScore) },
        { class: 'CHAPTER_BASED' as TemporalBindingClass, score: chapterScore },
        { class: 'REFRAMED_ARCHIVE' as TemporalBindingClass, score: reframeScore },
    ];
    scores.sort((a, b) => b.score - a.score);

    const primary = scores[0];
    const def = TEMPORAL_BINDING_DEFINITIONS[primary.class];

    // Determine fidelity
    let signalFidelity: SignalFidelity = def.defaultFidelity;
    if (fidelityHigh > fidelityVariable + 1) signalFidelity = 'HIGH';
    else if (fidelityVariable > fidelityHigh + 1) signalFidelity = 'VARIABLE';
    else signalFidelity = 'CONTEXTUAL';

    return {
        bindingClass: primary.class,
        halfLife: def.halfLife,
        signalFidelity,
        confidence: Math.min(primary.score / 6, 1),
        signals,
    };
}

/**
 * Find collision script for two binding profiles
 */
export function findCollision(
    profileA: TemporalBindingProfile,
    profileB: TemporalBindingProfile
): TemporalCollision | null {
    // Check direct match
    let collision = COLLISION_SCRIPTS.find(
        c => c.classA === profileA.bindingClass && c.classB === profileB.bindingClass
    );
    if (collision) return collision;

    // Check reverse match
    collision = COLLISION_SCRIPTS.find(
        c => c.classA === profileB.bindingClass && c.classB === profileA.bindingClass
    );
    if (collision) {
        // Swap movements for reverse
        return {
            ...collision,
            movementA: collision.movementB,
            movementB: collision.movementA,
        };
    }

    // Same class = aligned
    if (profileA.bindingClass === profileB.bindingClass) {
        return {
            classA: profileA.bindingClass,
            classB: profileB.bindingClass,
            intensity: 'aligned',
            collisionScript: 'You hold what happened similarly. This axis doesn\'t create significant friction between you.',
            movementA: 'No adjustment needed on this axis.',
            movementB: 'No adjustment needed on this axis.',
        };
    }

    return null;
}

/**
 * Generate narrative section for temporal binding
 */
export function generateTemporalBindingSection(
    profileA: TemporalBindingProfile,
    profileB: TemporalBindingProfile,
    nameA: string = 'Person A',
    nameB: string = 'Person B'
): string[] {
    const lines: string[] = [];
    const defA = TEMPORAL_BINDING_DEFINITIONS[profileA.bindingClass];
    const defB = TEMPORAL_BINDING_DEFINITIONS[profileB.bindingClass];
    const collision = findCollision(profileA, profileB);

    lines.push('### Temporal Binding — How You Each Hold What Happened');
    lines.push('');

    // Individual profiles
    lines.push(`**${nameA}:** ${defA.tagline}`);
    lines.push(defA.hooks[0]);
    lines.push('');

    lines.push(`**${nameB}:** ${defB.tagline}`);
    lines.push(defB.hooks[0]);
    lines.push('');

    // Collision
    if (collision && collision.intensity !== 'aligned') {
        const intensityIcon = collision.intensity === 'significant' ? '⚡⚡' :
            collision.intensity === 'moderate' ? '⚡' : '~';
        lines.push(`**Field Tension ${intensityIcon}**`);
        lines.push(collision.collisionScript);
        lines.push('');
        lines.push(`**For ${nameA}:** ${collision.movementA}`);
        lines.push(`**For ${nameB}:** ${collision.movementB}`);
    } else {
        lines.push('**Field:** Aligned on this axis. No significant temporal binding tension.');
    }

    return lines;
}

export default {
    TEMPORAL_BINDING_DEFINITIONS,
    COLLISION_SCRIPTS,
    inferTemporalBinding,
    findCollision,
    generateTemporalBindingSection,
};
