/**
 * Report Phases for Phase-Gated Streaming
 * 
 * Mandate (Four Report Types):
 * Raven is not meant to speak in one unbroken monolith.
 * Raven is meant to unfold in phases.
 */

export enum ReportPhase {
    MIRROR_FLOW = 'mirror_flow',
    FIELD_ARCHITECTURE = 'field_architecture',
    COGNITIVE_ARCHITECTURE = 'cognitive_architecture',
    INTEGRATION_BLUEPRINT = 'integration_blueprint',
}

export const PHASE_ORDER: ReportPhase[] = [
    ReportPhase.MIRROR_FLOW,
    ReportPhase.FIELD_ARCHITECTURE,
    ReportPhase.COGNITIVE_ARCHITECTURE,
    ReportPhase.INTEGRATION_BLUEPRINT,
];

export const PHASE_LABELS: Record<ReportPhase, string> = {
    [ReportPhase.MIRROR_FLOW]: 'Mirror Flow',
    [ReportPhase.FIELD_ARCHITECTURE]: 'Field Architecture',
    [ReportPhase.COGNITIVE_ARCHITECTURE]: 'Cognitive Architecture',
    [ReportPhase.INTEGRATION_BLUEPRINT]: 'Integration Blueprint',
};

export const PHASE_ICONS: Record<ReportPhase, string> = {
    [ReportPhase.MIRROR_FLOW]: '🪶',
    [ReportPhase.FIELD_ARCHITECTURE]: '🗺️',
    [ReportPhase.COGNITIVE_ARCHITECTURE]: '🧠',
    [ReportPhase.INTEGRATION_BLUEPRINT]: '🔮',
};

export const PHASE_COLORS: Record<ReportPhase, { border: string; bg: string; text: string }> = {
    [ReportPhase.MIRROR_FLOW]: {
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-200',
    },
    [ReportPhase.FIELD_ARCHITECTURE]: {
        border: 'border-indigo-500/40',
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-200',
    },
    [ReportPhase.COGNITIVE_ARCHITECTURE]: {
        border: 'border-purple-500/40',
        bg: 'bg-purple-500/10',
        text: 'text-purple-200',
    },
    [ReportPhase.INTEGRATION_BLUEPRINT]: {
        border: 'border-amber-500/40',
        bg: 'bg-amber-500/10',
        text: 'text-amber-200',
    },
};

/**
 * Map existing NarrativeSections keys to ReportPhase
 * This bridges the current Poetic Brain output to the new phase system.
 */
export function mapNarrativeSectionToPhase(key: string): ReportPhase | null {
    const mapping: Record<string, ReportPhase> = {
        solo_mirror_a: ReportPhase.MIRROR_FLOW,
        solo_mirror_b: ReportPhase.MIRROR_FLOW,
        field_overview: ReportPhase.FIELD_ARCHITECTURE,
        relational_engine: ReportPhase.COGNITIVE_ARCHITECTURE,
        weather_overlay: ReportPhase.INTEGRATION_BLUEPRINT,
    };
    return mapping[key] ?? null;
}

/**
 * Narrative Sections interface
 * Matches the output of processMirrorDirective
 */
export interface NarrativeSections {
    solo_mirror_a?: string;
    solo_mirror_b?: string;
    relational_engine?: string;
    weather_overlay?: string;
}

/**
 * Convert NarrativeSections into phase-ordered array
 * Deduplicates phases and maintains correct order
 */
export function sectionsToPhaseArray(sections: NarrativeSections): Array<{ phase: ReportPhase; content: string }> {
    const result: Array<{ phase: ReportPhase; content: string }> = [];
    const seen = new Set<ReportPhase>();

    // Solo mirrors → MIRROR_FLOW (combine if both present)
    const mirrorContents: string[] = [];
    if (sections.solo_mirror_a) mirrorContents.push(sections.solo_mirror_a);
    if (sections.solo_mirror_b) mirrorContents.push(sections.solo_mirror_b);
    if (mirrorContents.length > 0 && !seen.has(ReportPhase.MIRROR_FLOW)) {
        result.push({ phase: ReportPhase.MIRROR_FLOW, content: mirrorContents.join('\n\n---\n\n') });
        seen.add(ReportPhase.MIRROR_FLOW);
    }

    // Relational engine → COGNITIVE_ARCHITECTURE
    if (sections.relational_engine && !seen.has(ReportPhase.COGNITIVE_ARCHITECTURE)) {
        result.push({ phase: ReportPhase.COGNITIVE_ARCHITECTURE, content: sections.relational_engine });
        seen.add(ReportPhase.COGNITIVE_ARCHITECTURE);
    }

    // Weather overlay → INTEGRATION_BLUEPRINT
    if (sections.weather_overlay && !seen.has(ReportPhase.INTEGRATION_BLUEPRINT)) {
        result.push({ phase: ReportPhase.INTEGRATION_BLUEPRINT, content: sections.weather_overlay });
        seen.add(ReportPhase.INTEGRATION_BLUEPRINT);
    }

    return result;
}
