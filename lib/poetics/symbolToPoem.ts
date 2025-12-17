/**
 * Symbol-to-Poem Translation Engine
 * Protocol: Persona/Symbol-to-Poem Translation 8.28.25 copy.txt
 * 
 * STRICT OUTPUT FORMAT:
 * 1. POEM (Pure, no emojis, no explanation)
 * 2. EXPLANATION TABLE (Line-by-line audit: Emoji + Field + Map)
 * 3. LEGEND (Mandatory emoji key)
 * 
 * METHODOLOGY:
 * FIELD (Energetic Driver) → MAP (Astrological Source) → VOICE (Poetic Line)
 */

import type { BigFiveProfile } from '../../lib/bigfive/inferBigFiveFromChart';
import type { DetectedTension } from '../../lib/bigfive/tensionSynthesis';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces & Constants
// ─────────────────────────────────────────────────────────────────────────────

export interface PoemLine {
    /** The poetic line itself (VOICE) */
    text: string;
    /** The energetic/emotional driver (FIELD) */
    field: string;
    /** The astrological source (MAP) */
    map: string;
    /** The emoji code(s) for the table */
    emoji: string;
}

export interface SymbolToPoemOutput {
    poem: string[];
    auditTable: PoemLine[];
    legend: typeof EMOJI_LEGEND;
    formattedMarkdown: string;
}

export const EMOJI_LEGEND = [
    { emoji: '🔴', planet: 'Sun / Mars', meaning: 'Vital drive, force, motion' },
    { emoji: '🟠', planet: 'Venus', meaning: 'Relating, beauty, aesthetic gesture' },
    { emoji: '🟢', planet: 'Mercury', meaning: 'Voice, cognition, translation' },
    { emoji: '🔵', planet: 'Moon / Neptune', meaning: 'Feeling, memory, longing' },
    { emoji: '🟣', planet: 'Saturn / Chiron', meaning: 'Structure, boundary, compression' },
    { emoji: '⚪', planet: 'Uranus / Pluto', meaning: 'Disruption, shadow, metamorphosis' },
    { emoji: '⚫', planet: 'Jupiter', meaning: 'Meaning, expansion, ethical center' }
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Generators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a Symbol-to-Poem translation from chart data
 */
export function generateSymbolToPoem(
    profile: BigFiveProfile | null,
    tensions: DetectedTension[],
    positions: Record<string, any>,
    subjectName: string = 'Subject'
): SymbolToPoemOutput {
    const lines: PoemLine[] = [];

    // 1. ANCHOR IDENTITY (Sun/Ascendant) -> 🔴 (Vital Drive)
    // Simple heuristic: Get Sun sign/house or Ascendant
    const sun = positions['Sun'] || positions['sun'];
    if (sun) {
        lines.push({
            text: `The ${sun.sign} light moves through the specific architecture of this moment.`,
            field: 'Vital Presence',
            map: `Sun in ${sun.sign}`,
            emoji: '🔴'
        });
    }

    // 2. EMOTIONAL CORE (Moon) -> 🔵 (Feeling)
    const moon = positions['Moon'] || positions['moon'];
    if (moon) {
        lines.push({
            text: `A quiet current pulls beneath the surface, remembering what water knows.`,
            field: 'Deep Feeling / Memory',
            map: `Moon in ${moon.sign}`,
            emoji: '🔵'
        });
    }

    // 3. TENSION VECTORS (From DetectedTension) -> 🟣 (Structure) or ⚪ (Shadow)
    // Map top tension to a poetic line
    if (tensions.length > 0) {
        const tension = tensions[0]; // Primary tension
        const isShadow = tension.sstStatus === 'ABE' || tension.sstStatus === 'OSR';

        lines.push({
            text: tension.pattern.friction.narrator,
            field: `Structural Tension (${tension.pattern.name})`,
            map: tension.signals.join(', '),
            emoji: isShadow ? '⚪' : '🟣'
        });
    } else {
        // Fallback if no tension detected
        const saturn = positions['Saturn'] || positions['saturn'];
        if (saturn) {
            lines.push({
                text: `The frame holds steady even when the wind rises.`,
                field: 'Structural Boundary',
                map: `Saturn in ${saturn.sign}`,
                emoji: '🟣'
            });
        }
    }

    // 4. RELATIONALGESTURE (Venus) -> 🟠 (Relating)
    const venus = positions['Venus'] || positions['venus'];
    if (venus) {
        lines.push({
            text: `Reaching out, the hand shapes itself to what it might hold.`,
            field: 'Aesthetic / Relational Gesture',
            map: `Venus in ${venus.sign}`,
            emoji: '🟠'
        });
    }

    // 5. MEANING/EXPANSION (Jupiter/Mercury) -> ⚫ (Meaning) or 🟢 (Voice)
    const mercury = positions['Mercury'] || positions['mercury'];
    if (mercury) {
        lines.push({
            text: `Naming the world is how the world becomes real.`,
            field: 'Cognition / Voice',
            map: `Mercury in ${mercury.sign}`,
            emoji: '🟢'
        });
    }

    // Format the full output
    const poemText = lines.map(cols => cols.text);
    const formattedMarkdown = formatMarkdown(subjectName, lines);

    return {
        poem: poemText,
        auditTable: lines,
        legend: EMOJI_LEGEND,
        formattedMarkdown
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatter
// ─────────────────────────────────────────────────────────────────────────────

function formatMarkdown(subjectName: string, lines: PoemLine[]): string {
    const date = new Date().toISOString().split('T')[0];

    let md = '';

    // Header
    md += '```\n';
    md += 'Symbol-to-Song Translation\n';
    md += `Subject: ${subjectName}\n`;
    md += `Date: ${date}\n`;
    md += 'Derived from: Natal Chart · FIELD → MAP → VOICE methodology\n';
    md += 'Color Code Conformity Applied\n';
    md += '```\n\n';
    md += '---\n\n';

    // 1. Poem
    md += '### 1. Poem (Pure Poetic Output—No Color Codes, No Explanations, No Emoji)\n\n';
    lines.forEach(line => {
        md += `${line.text}\n\n`;
    });
    md += '---\n\n';

    // 2. Explanation Table
    md += '### 2. Explanation Table (Line-by-Line Audit: Emoji + Field + MAP)\n\n';
    md += '| Emoji | Poem Line / Stanza | FIELD (Energetic/Emotional Driver) | MAP (Astrological Source) |\n';
    md += '| :--- | :--- | :--- | :--- |\n';

    lines.forEach(line => {
        // Escape pipes in text just in case
        const safeText = line.text.replace(/\|/g, '\\|');
        const safeField = line.field.replace(/\|/g, '\\|');
        const safeMap = line.map.replace(/\|/g, '\\|');
        md += `| ${line.emoji} | ${safeText} | ${safeField} | ${safeMap} |\n`;
    });

    md += '\n---\n\n';

    // 3. Legend
    md += '### 3. Color/Emoji Legend (Must Be Included)\n\n';
    md += '| Emoji | Planet(s) | Symbolic Function |\n';
    md += '| :--- | :--- | :--- |\n';
    EMOJI_LEGEND.forEach(item => {
        md += `| ${item.emoji} | ${item.planet} | ${item.meaning} |\n`;
    });

    md += '\n';

    return md;
}
