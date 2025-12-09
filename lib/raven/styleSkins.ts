/**
 * Style Skins — The Interface Layer
 * 
 * Defines two distinct "voice skins" for Raven's narrative output.
 * The underlying geometry (the math) remains identical; only the metaphor layer shifts.
 * 
 * IMPORTANT: Raven should NOT make users "pick a persona." The style is context-adaptive
 * or defaulted, not user-selectable. This ensures Raven remains consistent.
 * 
 * ARCHITECTURE:
 * [Friction Sentences] → [Style Filter] → [Final Output]
 * 
 * SKINS:
 * - ARCHITECT: Mechanical, precise, engineering metaphors
 * - NARRATOR: Warm, visceral, lived-feeling metaphors
 */

export type StyleSkin = 'architect' | 'narrator';

// ─────────────────────────────────────────────────────────────────────────────
// Style Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface StyleDefinition {
    id: StyleSkin;
    name: string;
    description: string;
    targetAudience: string;
    tone: string;
    keyMetaphors: string[];
}

export const STYLE_DEFINITIONS: Record<StyleSkin, StyleDefinition> = {
    architect: {
        id: 'architect',
        name: 'The Architect',
        description: 'Mechanical, diagnostic, engineering-focused',
        targetAudience: 'Analysts, thinkers, people who want the blueprint',
        tone: 'Precise, neutral, structural',
        keyMetaphors: [
            'architecture', 'physics', 'circuitry', 'load-bearing',
            'velocity', 'filtration', 'inlet', 'processor', 'throughput',
            'threshold', 'oscillation', 'baseline', 'system', 'subsystem',
        ],
    },
    narrator: {
        id: 'narrator',
        name: 'The Narrator',
        description: 'Warm, visceral, lived-feeling',
        targetAudience: 'Feelers, relational clients, people who want to feel seen',
        tone: 'Empathetic, second-person, grounded but warm',
        keyMetaphors: [
            'door', 'room', 'current', 'weather', 'hunger', 'weight',
            'rhythm', 'breath', 'hearth', 'gravity', 'water', 'party',
            'fuel', 'tank', 'anchor', 'peephole', 'knocking',
        ],
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Style Selection Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the appropriate style based on context
 * 
 * Default is 'narrator' (warm, lived-feeling) because most users
 * want to feel seen, not analyzed.
 * 
 * Auto-switch to 'architect' when:
 * - User explicitly requests technical breakdown
 * - Session is flagged as analytical
 * - Certain professional contexts (TBD)
 */
export function selectStyle(options?: {
    explicitRequest?: StyleSkin;
    sessionMode?: 'analytical' | 'relational' | 'default';
    userPreference?: StyleSkin;
}): StyleSkin {
    // Explicit request always wins
    if (options?.explicitRequest) {
        return options.explicitRequest;
    }

    // User preference (from profile) is second priority
    if (options?.userPreference) {
        return options.userPreference;
    }

    // Session mode can influence
    if (options?.sessionMode === 'analytical') {
        return 'architect';
    }

    // Default to narrator (warm, lived-feeling)
    return 'narrator';
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Headers by Style
// ─────────────────────────────────────────────────────────────────────────────

export const SECTION_HEADERS: Record<StyleSkin, Record<string, string>> = {
    architect: {
        blueprint: 'System Overview',
        texture: 'Constitutional Mechanics',
        tensions: 'Core Pressure Patterns',
        interface: 'Interface Layer',
        closing: 'System Summary',
    },
    narrator: {
        blueprint: 'Blueprint Overview',
        texture: 'How Your System Moves',
        tensions: 'Where the Parts Rub',
        interface: 'Interface Note',
        closing: 'Mirror Voice',
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulary Adapters by Style
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vocabulary translation table for common phrases
 * Maps neutral vocabulary to style-specific variants
 */
export const VOCABULARY_ADAPTERS: Record<StyleSkin, Record<string, string>> = {
    architect: {
        'wide aperture': 'high-permeability intake',
        'balanced aperture': 'variable-permeability intake',
        'consolidates before expanding': 'gated verification loop',
        'load-bearing architecture': 'high structural load capacity',
        'flexible structure': 'adaptive structural parameters',
        'improvisational rhythm': 'responsive timing protocol',
        'outward-moving energy': 'external-facing power draw',
        'inward-moving energy': 'internal restoration cycle',
        'context-dependent energy': 'variable power routing',
        'field-harmonizing': 'coherence-seeking relational mode',
        'edge-preserving': 'boundary-maintaining relational mode',
        'sensitized seismograph': 'high-sensitivity pressure detector',
        'even-keel baseline': 'stable reactivity baseline',
    },
    narrator: {
        'wide aperture': 'open door',
        'balanced aperture': 'door that opens by feel',
        'consolidates before expanding': 'checks the peephole first',
        'load-bearing architecture': 'holds what it holds',
        'flexible structure': 'bends without breaking',
        'improvisational rhythm': 'moves with what comes',
        'outward-moving energy': 'lights up in company',
        'inward-moving energy': 'needs the quiet to refill',
        'context-dependent energy': 'reads the room before deciding',
        'field-harmonizing': 'smooths over the rough spots',
        'edge-preserving': 'holds your own shape',
        'sensitized seismograph': 'feels the room before you think about it',
        'even-keel baseline': 'stays steady when things shake',
    },
};

/**
 * Adapt a phrase to the target style
 */
export function adaptPhrase(phrase: string, style: StyleSkin): string {
    const adapted = VOCABULARY_ADAPTERS[style][phrase.toLowerCase()];
    return adapted || phrase;
}

/**
 * Get section header for a section type and style
 */
export function getSectionHeader(section: keyof typeof SECTION_HEADERS['narrator'], style: StyleSkin): string {
    return SECTION_HEADERS[style][section] || section;
}

export default {
    STYLE_DEFINITIONS,
    SECTION_HEADERS,
    VOCABULARY_ADAPTERS,
    selectStyle,
    adaptPhrase,
    getSectionHeader,
};
