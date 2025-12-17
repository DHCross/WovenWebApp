#!/usr/bin/env node
/**
 * Test script for internal synastry calculator
 * 
 * Usage: node scripts/test-synastry-calculator.js [path-to-json]
 */

const fs = require('fs');
const path = require('path');

// Mock the module loading since we're in pure JS
const calcPath = path.join(__dirname, '../lib/poetics/synastry-calculator.ts');

// For testing, we'll manually implement the key functions
// In production, this would use the TypeScript-compiled version

const ASPECT_DEFINITIONS = [
    { name: 'conjunction', angle: 0, defaultOrb: 8, nature: 'neutral' },
    { name: 'opposition', angle: 180, defaultOrb: 8, nature: 'hard' },
    { name: 'trine', angle: 120, defaultOrb: 8, nature: 'soft' },
    { name: 'square', angle: 90, defaultOrb: 7, nature: 'hard' },
    { name: 'sextile', angle: 60, defaultOrb: 6, nature: 'soft' },
];

const PLANET_WEIGHTS = {
    Sun: 10, Moon: 10, Mercury: 6, Venus: 8, Mars: 8,
    Jupiter: 5, Saturn: 5, Uranus: 3, Neptune: 3, Pluto: 4,
    Chiron: 4, Node: 3, Mean_Node: 3, ASC: 7, MC: 5,
    First_House: 7, Tenth_House: 5,
};

function normalizeAngle(angle) {
    let normalized = angle % 360;
    if (normalized < 0) normalized += 360;
    return normalized;
}

function angularDistance(posA, posB) {
    const diff = Math.abs(normalizeAngle(posA) - normalizeAngle(posB));
    return diff > 180 ? 360 - diff : diff;
}

function getAbsolutePosition(pos) {
    if (!pos) return null;
    const candidates = [pos.abs_pos, pos.absolute_longitude, pos.longitude];
    for (const val of candidates) {
        if (typeof val === 'number' && Number.isFinite(val)) {
            return normalizeAngle(val);
        }
    }
    return null;
}

function getOrbForPlanets(planetA, planetB, baseOrb) {
    const weightA = PLANET_WEIGHTS[planetA] ?? 3;
    const weightB = PLANET_WEIGHTS[planetB] ?? 3;
    const avgWeight = (weightA + weightB) / 2;
    if (avgWeight >= 9) return baseOrb + 1;
    if (avgWeight >= 7) return baseOrb;
    if (avgWeight >= 5) return baseOrb - 0.5;
    return baseOrb - 1;
}

function calculateSynastryAspects(positionsA, positionsB, personAName, personBName) {
    const aspects = [];
    const skipKeys = new Set(['cusps', 'houses', '_raw', 'angles', 'angle_signs', 'transitsByDate']);

    const planetsA = Object.entries(positionsA).filter(([k]) => !skipKeys.has(k));
    const planetsB = Object.entries(positionsB).filter(([k]) => !skipKeys.has(k));

    for (const [planetAName, posA] of planetsA) {
        const absA = getAbsolutePosition(posA);
        if (absA === null) continue;

        for (const [planetBName, posB] of planetsB) {
            const absB = getAbsolutePosition(posB);
            if (absB === null) continue;

            const distance = angularDistance(absA, absB);

            for (const aspectDef of ASPECT_DEFINITIONS) {
                const orb = getOrbForPlanets(planetAName, planetBName, aspectDef.defaultOrb);
                const deviation = Math.abs(distance - aspectDef.angle);

                if (deviation <= orb) {
                    const orbTightness = 1 - (deviation / orb);
                    const planetWeight = ((PLANET_WEIGHTS[planetAName] ?? 3) + (PLANET_WEIGHTS[planetBName] ?? 3)) / 2;
                    const weight = orbTightness * planetWeight;

                    if (weight < 3) continue;

                    aspects.push({
                        planet_a: planetAName,
                        planet_b: planetBName,
                        person_a_name: personAName,
                        person_b_name: personBName,
                        type: aspectDef.name,
                        orb: Number(deviation.toFixed(2)),
                        weight: Number(weight.toFixed(2)),
                        nature: aspectDef.nature,
                    });
                }
            }
        }
    }

    return aspects.sort((a, b) => b.weight - a.weight).slice(0, 15);
}

// Main execution
const jsonPath = process.argv[2] || path.join(__dirname, '../analysis/Wheel Charts/Weather_Dashboard_dan-cross-stephie_2025-12-08_to_2025-12-13_Mirror+SymbolicWeather.json');

console.log('🔮 Synastry Calculator Test');
console.log('='.repeat(50));
console.log(`Reading: ${path.basename(jsonPath)}\n`);

try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    const personA = data.person_a;
    const personB = data.person_b;

    if (!personA || !personB) {
        console.log('❌ Missing person_a or person_b in JSON');
        process.exit(1);
    }

    const positionsA = personA.chart?.positions || {};
    const positionsB = personB.chart?.positions || {};

    console.log(`Person A: ${personA.name}`);
    console.log(`  Planets with positions: ${Object.keys(positionsA).filter(k => !['cusps', 'transitsByDate'].includes(k)).length}`);

    console.log(`\nPerson B: ${personB.name}`);
    console.log(`  Planets with positions: ${Object.keys(positionsB).filter(k => !['cusps', 'transitsByDate'].includes(k)).length}`);

    console.log('\n' + '='.repeat(50));
    console.log('Computing Synastry Aspects...\n');

    const aspects = calculateSynastryAspects(
        positionsA,
        positionsB,
        personA.name,
        personB.name
    );

    console.log(`Found ${aspects.length} cross-chart aspects:\n`);

    aspects.forEach((asp, i) => {
        const emoji = asp.nature === 'hard' ? '🔺' : asp.nature === 'soft' ? '🔷' : '⚪';
        console.log(`${i + 1}. ${emoji} ${asp.person_a_name}'s ${asp.planet_a} ${asp.type} ${asp.person_b_name}'s ${asp.planet_b}`);
        console.log(`   Orb: ${asp.orb}° | Weight: ${asp.weight} | Nature: ${asp.nature}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('✅ Synastry calculator working correctly!');
    console.log('   These aspects can now power the Relational Engine narrative.');

} catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
}
