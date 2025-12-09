/**
 * Parent/Child Friction Test — Dual-Trigger Engine Verification
 * 
 * Tests the new tensionSynthesis v2.0 with:
 * 1. Global trait thresholds
 * 2. Local geometry flags
 * 3. SST classification
 * 4. Polarity Cards for relational currents
 */

import * as fs from 'fs';
import * as path from 'path';
import { inferBigFiveFromChart } from '../lib/bigfive/inferBigFiveFromChart';
import { detectTensions, generateTensionSection } from '../lib/bigfive/tensionSynthesis';
import { inferCognitiveArchitecture, generatePolarityCards, generatePolaritySection } from '../lib/raven/polarityCards';
import { inferTemporalBinding, findCollision, generateTemporalBindingSection, TEMPORAL_BINDING_DEFINITIONS } from '../lib/raven/temporalBinding';

interface ChartPositions {
    [key: string]: { sign: string; house?: number; deg?: number };
}

interface PersonData {
    name: string;
    chart: {
        positions: ChartPositions;
        angle_signs?: { ascendant: string; midheaven?: string };
    };
}

interface ChartJson {
    person_a: PersonData;
    person_b: PersonData;
}

const jsonPath = path.resolve(__dirname, '../analysis/Wheel Charts/2006-01-03_carrie_1975-08-21_Symbolic_Weather_Dashboard_2025-12-09_to_2025-12-09_Mirror+SymbolicWeather.json');

console.log('👪 PARENT/CHILD FRICTION TEST (DUAL-TRIGGER ENGINE v2.0)');
console.log('='.repeat(70));

try {
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(rawData) as ChartJson;

    const people = [data.person_a, data.person_b];
    const profiles: any[] = [];
    const architectures: any[] = [];
    const temporalProfiles: any[] = [];

    for (const person of people) {
        if (!person) continue;

        console.log(`\n📊 Analyzing: ${person.name}`);
        console.log('-'.repeat(40));

        // 1. Infer Big Five
        const profile = inferBigFiveFromChart({ positions: person.chart.positions } as any);

        if (!profile) {
            console.log('  ⚠️ Unable to infer Big Five (internal compass planets missing)');
            continue;
        }

        console.log(`Big Five: O-${profile.O.band} C-${profile.C.band} E-${profile.E.band} A-${profile.A.band} N-${profile.N.band}`);

        // 2. Detect Tensions with DUAL TRIGGER
        const tensions = detectTensions(
            profile,
            person.chart.positions,
            person.chart.angle_signs
        );

        console.log(`\nCore Tensions (${tensions.length} detected):`);
        if (tensions.length === 0) {
            console.log('  No tensions detected via global OR local triggers.');
        } else {
            for (const t of tensions) {
                const sourceIcon = t.source === 'both' ? '⚡⚡' : t.source === 'local' ? '📍' : '📊';
                console.log(`  ${sourceIcon} ${t.pattern.name} [${t.sstStatus}] (intensity: ${t.intensity})`);
                console.log(`     Source: ${t.source}`);
                console.log(`     Signals: ${t.signals.join(', ')}`);
            }
        }

        // 3. Infer Cognitive Architecture
        const arch = inferCognitiveArchitecture(profile, person.chart.positions);

        console.log(`\nCognitive Architecture:`);
        console.log(`  I↔E: ${arch.I_E.position} (${profile.E.band} E)`);
        console.log(`  N↔S: ${arch.N_S.position} (${profile.O.band} O)`);
        console.log(`  T↔F: ${arch.T_F.position} (${profile.A.band} A)`);
        console.log(`  J↔P: ${arch.J_P.position} (${profile.C.band} C)`);

        // 4. Infer Temporal Binding
        const temporal = inferTemporalBinding(person.chart.positions, person.chart.angle_signs);
        const def = TEMPORAL_BINDING_DEFINITIONS[temporal.bindingClass];

        console.log(`\nTemporal Binding:`);
        console.log(`  Class: ${temporal.bindingClass}`);
        console.log(`  Tagline: "${def.tagline}"`);
        console.log(`  Half-life: ${temporal.halfLife}`);
        console.log(`  Signal Fidelity: ${temporal.signalFidelity}`);
        console.log(`  Confidence: ${(temporal.confidence * 100).toFixed(0)}%`);
        console.log(`  Signals: ${temporal.signals.join(', ')}`);

        profiles.push({ name: person.name, profile });
        architectures.push({ name: person.name, arch });
        temporalProfiles.push({ name: person.name, temporal });
    }

    // 5. Polarity Cards (Relational)
    if (architectures.length === 2) {
        const [archA, archB] = architectures;

        console.log('\n' + '═'.repeat(70));
        console.log(`POLARITY CARDS: ${archA.name} ↔ ${archB.name}`);
        console.log('═'.repeat(70));

        const cards = generatePolarityCards(archA.arch, archB.arch, archA.name, archB.name);

        for (const card of cards) {
            const stretchIcon = card.stretch === 'wide' ? '⚡⚡' :
                card.stretch === 'moderate' ? '⚡' : '✓';
            console.log(`\n${stretchIcon} ${card.poles[0]} ↔ ${card.poles[1]} [${card.stretch}]`);
            console.log(`   ${archA.name}: ${card.positionA} | ${archB.name}: ${card.positionB}`);
            console.log(`   Effect: ${card.fieldEffect}`);
        }

        // Generate narrative section
        console.log('\n' + '─'.repeat(70));
        console.log('NARRATIVE OUTPUT (Narrator Style):');
        console.log('─'.repeat(70));

        const narrativeLines = generatePolaritySection(archA.arch, archB.arch, archA.name, archB.name);
        console.log(narrativeLines.join('\n'));
    }

    // 6. Temporal Binding Collision
    if (temporalProfiles.length === 2) {
        const [tA, tB] = temporalProfiles;

        console.log('\n' + '═'.repeat(70));
        console.log(`TEMPORAL BINDING: ${tA.name} ↔ ${tB.name}`);
        console.log('═'.repeat(70));

        const collision = findCollision(tA.temporal, tB.temporal);

        console.log(`\n${tA.name}: ${tA.temporal.bindingClass} (${tA.temporal.signalFidelity} fidelity)`);
        console.log(`${tB.name}: ${tB.temporal.bindingClass} (${tB.temporal.signalFidelity} fidelity)`);

        if (collision) {
            const intensityIcon = collision.intensity === 'significant' ? '⚡⚡' :
                collision.intensity === 'moderate' ? '⚡' : '✓';
            console.log(`\nCollision Intensity: ${intensityIcon} ${collision.intensity}`);
            console.log(`\nCollision Script:`);
            console.log(`  "${collision.collisionScript}"`);
            console.log(`\nMovements:`);
            console.log(`  For ${tA.name}: ${collision.movementA}`);
            console.log(`  For ${tB.name}: ${collision.movementB}`);
        }

        // Generate narrative section
        console.log('\n' + '─'.repeat(70));
        console.log('NARRATIVE OUTPUT (Temporal Binding):');
        console.log('─'.repeat(70));

        const narrativeLines = generateTemporalBindingSection(tA.temporal, tB.temporal, tA.name, tB.name);
        console.log(narrativeLines.join('\n'));
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ Dual-Trigger Engine Test Complete');
    console.log('═'.repeat(70));

} catch (error) {
    console.error('❌ Error:', error);
}
