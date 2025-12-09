/**
 * Big Five Vocabulary Shaper — Translates Scores to Symbolic Language
 * 
 * This module takes Big Five scores (backstage) and produces weighted phrase pools
 * that influence HOW Raven speaks without ever naming the framework.
 * 
 * DESIGN PHILOSOPHY:
 * "The frame is optional. The experience is not."
 * 
 * Users experience Raven's voice as poetic and geometric.
 * Only on explicit request do they learn the underlying vocabulary was shaped
 * by personality research frameworks.
 * 
 * USAGE:
 * - Import into narrative generation pipeline
 * - Call getVocabularyShaping() to get phrase pools
 * - Use phrases naturally in narrative (do NOT cite the dimension)
 * 
 * @internal — Never exposed to users unless explicitly requested
 */

import type { BigFiveProfile, BigFiveScore } from './inferBigFiveFromChart';

// ─────────────────────────────────────────────────────────────────────────────
// Phrase Pools by Dimension
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Openness (O) — Aperture width, pattern-seeking tendency
 */
const OPENNESS_PHRASES = {
    high: [
        'wide aperture',
        'scans the horizon before landing',
        'permeable to unfamiliar currents',
        'pattern-seeking scan',
        'drawn to the unexplored edge',
        'meaning-first intake',
        'explores before committing',
        'curious about the distant',
        'imaginative reach',
        'sees connections across domains',
    ],
    moderate: [
        'balanced aperture',
        'selective curiosity',
        'explores within familiar territory',
        'practical imagination',
        'grounded creativity',
    ],
    low: [
        'consolidates before expanding',
        'prefers the tested path',
        'builds from what is already known',
        'focused aperture',
        'depth over breadth',
        'practical focus',
        'trusts the proven',
        'detail-anchored',
        'concrete before abstract',
    ],
};

/**
 * Conscientiousness (C) — Structural emphasis, timing discipline
 */
const CONSCIENTIOUSNESS_PHRASES = {
    high: [
        'load-bearing architecture',
        'sequence-aware timing',
        'holds structure under pressure',
        'disciplined pacing',
        'builds in order',
        'reliable rhythm',
        'follows through on commitments',
        'attention to detail',
        'goal-directed motion',
        'structured approach to complexity',
    ],
    moderate: [
        'flexible structure',
        'adaptive timing',
        'holds shape when needed',
        'practical organization',
        'situational discipline',
    ],
    low: [
        'improvisational rhythm',
        'responds when the field calls',
        'moves with what arrives',
        'spontaneous timing',
        'loose structure',
        'fluid approach',
        'adapts in the moment',
        'responsive rather than planned',
        'lets things unfold',
    ],
};

/**
 * Extraversion (E) — Energy direction, restoration source
 */
const EXTRAVERSION_PHRASES = {
    high: [
        'outward-moving energy',
        'energized by contact',
        'ignites through engagement',
        'shared-field oriented',
        'externally sparked',
        'momentum through connection',
        'draws energy from the crowd',
        'action before reflection',
        'expressive and visible',
    ],
    moderate: [
        'balanced between solitude and contact',
        'context-dependent energy',
        'selective engagement',
        'measured projection',
        'chooses when to surface',
    ],
    low: [
        'inward-moving energy',
        'restored by solitude',
        'depth before movement',
        'internal momentum',
        'processes before projecting',
        'quiet-running engine',
        'reflective core',
        'selectively visible',
        'internal center of gravity',
    ],
};

/**
 * Agreeableness (A) — Field-harmonizing vs. edge-preserving
 */
const AGREEABLENESS_PHRASES = {
    high: [
        'field-harmonizing tendency',
        'moves toward coherence',
        'smoothing function active',
        'permeable to others\' states',
        'accommodating by default',
        'seeks common ground',
        'conflict-diffusing',
        'attunes to group atmosphere',
        'prioritizes relational flow',
    ],
    moderate: [
        'selective harmonizing',
        'holds ground when it matters',
        'conditionally accommodating',
        'balanced between self and other',
        'context-aware boundaries',
    ],
    low: [
        'edge-preserving',
        'maintains contour under pressure',
        'does not default to merge',
        'autonomous stance',
        'clear boundaries',
        'holds position',
        'comfortable with friction',
        'self-referenced first',
        'independent field',
    ],
};

/**
 * Neuroticism (N) — Sensitivity, reactivity to pressure
 * NOTE: We frame this as "sensitivity" and "early-warning," not dysfunction
 */
const NEUROTICISM_PHRASES = {
    high: [
        'sensitized seismograph',
        'early-warning system active',
        'responsive to pressure gradients',
        'finely calibrated to shifts',
        'picks up subtle changes quickly',
        'emotionally responsive architecture',
        'processes through feeling first',
        'depth-tracking',
        'intensity-aware',
    ],
    moderate: [
        'calibrated sensitivity',
        'responsive when it matters',
        'feels and stabilizes',
        'balanced reactivity',
        'moderate volatility signature',
    ],
    low: [
        'even-keel baseline',
        'stable under load',
        'low volatility signature',
        'steady-state architecture',
        'slow to destabilize',
        'grounded under pressure',
        'emotionally steady',
        'consistent baseline',
        'unfazed by turbulence',
    ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulary Shaping Output
// ─────────────────────────────────────────────────────────────────────────────

export interface VocabularyShaping {
    /** Phrases for describing perception/curiosity style */
    aperture: string[];
    /** Phrases for describing structure/timing style */
    structure: string[];
    /** Phrases for describing energy direction */
    energy: string[];
    /** Phrases for describing relational style */
    relational: string[];
    /** Phrases for describing sensitivity/reactivity */
    sensitivity: string[];
    /** Combined pool of all suggested phrases */
    allPhrases: string[];
    /** Backstage summary (never shown to users unless requested) */
    _technicalSummary: string;
}

/**
 * Select random phrases from a pool
 */
function selectPhrases(pool: string[], count: number = 3): string[] {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, pool.length));
}

/**
 * Get vocabulary shaping from a Big Five profile
 * 
 * Returns phrase pools that can be naturally woven into Raven's narrative
 * without ever naming the underlying framework.
 */
export function getVocabularyShaping(profile: BigFiveProfile): VocabularyShaping {
    const aperture = selectPhrases(OPENNESS_PHRASES[profile.O.band], 3);
    const structure = selectPhrases(CONSCIENTIOUSNESS_PHRASES[profile.C.band], 3);
    const energy = selectPhrases(EXTRAVERSION_PHRASES[profile.E.band], 3);
    const relational = selectPhrases(AGREEABLENESS_PHRASES[profile.A.band], 3);
    const sensitivity = selectPhrases(NEUROTICISM_PHRASES[profile.N.band], 3);

    const allPhrases = [...aperture, ...structure, ...energy, ...relational, ...sensitivity];

    // Technical summary for backstage/footnote use only
    const _technicalSummary = [
        `O-${profile.O.value} (${profile.O.band})`,
        `C-${profile.C.value} (${profile.C.band})`,
        `E-${profile.E.value} (${profile.E.band})`,
        `A-${profile.A.value} (${profile.A.band})`,
        `N-${profile.N.value} (${profile.N.band})`,
    ].join(' | ');

    return {
        aperture,
        structure,
        energy,
        relational,
        sensitivity,
        allPhrases,
        _technicalSummary,
    };
}

/**
 * Get a single phrase that captures the most prominent dimension
 * Useful for quick characterizations
 */
export function getDominantPhrase(profile: BigFiveProfile): string {
    // Find which dimension deviates most from the baseline (50)
    const dimensions: { key: keyof Omit<BigFiveProfile, '_framework_note'>; score: BigFiveScore }[] = [
        { key: 'O', score: profile.O },
        { key: 'C', score: profile.C },
        { key: 'E', score: profile.E },
        { key: 'A', score: profile.A },
        { key: 'N', score: profile.N },
    ];

    let maxDeviation = 0;
    let dominantDimension = dimensions[0];

    for (const dim of dimensions) {
        const deviation = Math.abs(dim.score.value - 50);
        if (deviation > maxDeviation) {
            maxDeviation = deviation;
            dominantDimension = dim;
        }
    }

    // Get the appropriate phrase pool
    const pools: Record<string, Record<'high' | 'moderate' | 'low', string[]>> = {
        O: OPENNESS_PHRASES,
        C: CONSCIENTIOUSNESS_PHRASES,
        E: EXTRAVERSION_PHRASES,
        A: AGREEABLENESS_PHRASES,
        N: NEUROTICISM_PHRASES,
    };

    const pool = pools[dominantDimension.key][dominantDimension.score.band];
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Format the technical ledger for footnote/appendix use
 * Only called when user explicitly requests technical breakdown
 */
export function formatTechnicalLedger(profile: BigFiveProfile): string {
    const lines = [
        '---',
        '*Technical Ledger (Personality Inference)*',
        '',
        `| Dimension | Score | Band |`,
        `|-----------|-------|------|`,
        `| Openness | ${profile.O.value} | ${profile.O.band} |`,
        `| Conscientiousness | ${profile.C.value} | ${profile.C.band} |`,
        `| Extraversion | ${profile.E.value} | ${profile.E.band} |`,
        `| Agreeableness | ${profile.A.value} | ${profile.A.band} |`,
        `| Neuroticism (Sensitivity) | ${profile.N.value} | ${profile.N.band} |`,
        '',
        '*Note: These scores are inferred from chart geometry, not self-report.*',
        '*They shape vocabulary choices but are not deterministic.*',
        '---',
    ];

    return lines.join('\n');
}

/**
 * Generate an in-context explanation for when user asks "What do you mean by X?"
 * 
 * Example: User asks "What do you mean by 'wide aperture'?"
 * Raven explains without sounding like a textbook.
 */
export function explainPhrase(phrase: string): string | null {
    const explanations: Record<string, string> = {
        // Openness phrases
        'wide aperture': 'In personality research, this maps to what\'s sometimes called "Openness to Experience"—but the chart doesn\'t measure that directly. It infers the *tendency* toward pattern-seeking and exploratory attention from how certain planets sit.',
        'pattern-seeking scan': 'This describes a way of taking in information where you tend to look for connections and meaning before settling on concrete details. Some frameworks call this "Intuitive" processing.',
        'consolidates before expanding': 'This suggests a preference for depth over breadth—building from the known rather than constantly seeking the novel. It\'s not a limit; it\'s a structural preference.',

        // Conscientiousness phrases
        'load-bearing architecture': 'This describes a structural quality where you tend to hold commitments and follow through. In formal terms, it maps to what personality research calls "Conscientiousness."',
        'improvisational rhythm': 'This suggests a more spontaneous, responsive style—you move with what arrives rather than holding to a rigid sequence. Neither is better; they\'re different structural orientations.',

        // Extraversion phrases
        'inward-moving energy': 'This describes where your energy tends to flow and restore. Some people are energized by solitude and depth; others by contact and engagement. This pattern suggests the former.',
        'outward-moving energy': 'This describes an orientation where contact and engagement tend to spark energy rather than deplete it.',

        // Agreeableness phrases
        'edge-preserving': 'This describes a relational style that maintains clear contours under pressure—you don\'t default to merging or accommodating. In some frameworks, this is the "low Agreeableness" pole, though it\'s not about warmth.',
        'field-harmonizing tendency': 'This describes an orientation toward smoothing, accommodating, and moving toward coherence in relational fields.',

        // Neuroticism phrases
        'sensitized seismograph': 'This describes high responsiveness to emotional pressure gradients—you pick up on shifts quickly. In personality research, this maps to "Neuroticism," though that label is misleading. It\'s a sensitivity, not a dysfunction.',
        'even-keel baseline': 'This describes emotional stability under load—a system that\'s slow to destabilize and quick to return to baseline.',
    };

    return explanations[phrase.toLowerCase()] || null;
}

export default {
    getVocabularyShaping,
    getDominantPhrase,
    formatTechnicalLedger,
    explainPhrase,
};
