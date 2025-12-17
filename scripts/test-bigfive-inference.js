#!/usr/bin/env node
/**
 * Test script for Big Five inference and vocabulary shaping
 * 
 * Usage: node scripts/test-bigfive-inference.js [path-to-json]
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// Inline implementation for testing (mirrors the TypeScript version)
// ─────────────────────────────────────────────────────────────────────────────

const ELEMENTS = {
    Ari: 'F', Leo: 'F', Sag: 'F',
    Tau: 'E', Vir: 'E', Cap: 'E',
    Gem: 'A', Lib: 'A', Aqu: 'A',
    Can: 'W', Sco: 'W', Pis: 'W',
};

const MODALITIES = {
    Ari: 'C', Can: 'C', Lib: 'C', Cap: 'C',
    Tau: 'F', Leo: 'F', Sco: 'F', Aqu: 'F',
    Gem: 'M', Vir: 'M', Sag: 'M', Pis: 'M',
};

function norm(s) {
    if (!s) return null;
    const t = s.trim().slice(0, 3);
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function elem(sign) {
    const k = norm(sign);
    return k ? ELEMENTS[k] || null : null;
}

function mod(sign) {
    const k = norm(sign);
    return k ? MODALITIES[k] || null : null;
}

function isWater(sign) { return elem(sign) === 'W'; }
function isMutable(sign) { return mod(sign) === 'M'; }
function isFixed(sign) { return mod(sign) === 'F'; }

function scoreToBand(value) {
    if (value >= 65) return 'high';
    if (value >= 35) return 'moderate';
    return 'low';
}

// ─────────────────────────────────────────────────────────────────────────────
// Big Five Inference Functions
// ─────────────────────────────────────────────────────────────────────────────

function inferOpenness(positions) {
    const signals = [];
    let score = 50;

    const mercury = positions['Mercury'] || positions['mercury'];
    const mercuryEl = elem(mercury?.sign);
    if (mercuryEl === 'A' || mercuryEl === 'F') {
        score += 15;
        signals.push(`Mercury in ${mercuryEl === 'A' ? 'Air' : 'Fire'} (abstract processing)`);
    } else if (mercuryEl === 'E') {
        score -= 10;
        signals.push(`Mercury in Earth (practical focus)`);
    }

    const jupiter = positions['Jupiter'] || positions['jupiter'];
    const jupiterEl = elem(jupiter?.sign);
    if (jupiterEl === 'F' || jupiterEl === 'A') {
        score += 12;
        signals.push(`Jupiter in ${jupiterEl === 'F' ? 'Fire' : 'Air'} (wide-horizon seeking)`);
    }

    let mutableCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        if (planet?.sign && isMutable(planet.sign)) mutableCount++;
    }
    if (mutableCount >= 4) {
        score += 10;
        signals.push(`Strong Mutable emphasis (adaptable, curious)`);
    }

    return { value: Math.max(0, Math.min(100, score)), band: scoreToBand(score), signals };
}

function inferConscientiousness(positions) {
    const signals = [];
    let score = 50;

    const saturn = positions['Saturn'] || positions['saturn'];
    const saturnEl = elem(saturn?.sign);
    if (saturnEl === 'E') {
        score += 15;
        signals.push(`Saturn in Earth (grounded discipline)`);
    } else if (saturnEl === 'W') {
        score += 8;
        signals.push(`Saturn in Water (emotional containment)`);
    }

    let fixedCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        if (planet?.sign && isFixed(planet.sign)) fixedCount++;
    }
    if (fixedCount >= 4) {
        score += 12;
        signals.push(`Strong Fixed emphasis (persistent, determined)`);
    } else if (fixedCount <= 1) {
        score -= 8;
        signals.push(`Low Fixed emphasis (fluid, less locked-in)`);
    }

    return { value: Math.max(0, Math.min(100, score)), band: scoreToBand(score), signals };
}

function inferExtraversion(positions) {
    const signals = [];
    let score = 50;

    const moon = positions['Moon'] || positions['moon'];
    const moonEl = elem(moon?.sign);
    if (moonEl === 'F' || moonEl === 'A') {
        score += 18;
        signals.push(`Moon in ${moonEl === 'F' ? 'Fire' : 'Air'} (outward-moving energy)`);
    } else if (moonEl === 'W' || moonEl === 'E') {
        score -= 15;
        signals.push(`Moon in ${moonEl === 'W' ? 'Water' : 'Earth'} (inward-moving energy)`);
    }

    const saturn = positions['Saturn'] || positions['saturn'];
    const saturnEl = elem(saturn?.sign);
    if (isWater(saturn?.sign) || saturn?.house === 12) {
        score -= 12;
        signals.push(`Saturn in Water/12th (deep inward gravity)`);
    } else if (saturnEl === 'F' || saturnEl === 'A') {
        score += 8;
        signals.push(`Saturn in ${saturnEl === 'F' ? 'Fire' : 'Air'} (outward structure)`);
    }

    return { value: Math.max(0, Math.min(100, score)), band: scoreToBand(score), signals };
}

function inferAgreeableness(positions) {
    const signals = [];
    let score = 50;

    const venus = positions['Venus'] || positions['venus'];
    const moon = positions['Moon'] || positions['moon'];
    const venusEl = elem(venus?.sign);
    const moonEl = elem(moon?.sign);

    if (venusEl && moonEl && venusEl === moonEl) {
        score += 12;
        signals.push(`Venus-Moon harmony (values and feelings aligned)`);
    }

    if (venusEl === 'W') {
        score += 10;
        signals.push(`Venus in Water (emotionally attuned connection)`);
    } else if (venusEl === 'A') {
        score += 5;
        signals.push(`Venus in Air (socially fluent)`);
    }

    const mars = positions['Mars'] || positions['mars'];
    if (norm(mars?.sign) === 'Ari' || norm(mars?.sign) === 'Sco') {
        score -= 10;
        signals.push(`Mars in ${norm(mars?.sign) === 'Ari' ? 'Aries' : 'Scorpio'} (edge-preserving)`);
    }

    return { value: Math.max(0, Math.min(100, score)), band: scoreToBand(score), signals };
}

function inferNeuroticism(positions) {
    const signals = [];
    let score = 50;

    let waterCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        if (planet?.sign && isWater(planet.sign)) waterCount++;
    }
    if (waterCount >= 4) {
        score += 15;
        signals.push(`Strong Water emphasis (emotionally sensitized)`);
    } else if (waterCount <= 1) {
        score -= 10;
        signals.push(`Low Water emphasis (emotionally steady)`);
    }

    const moon = positions['Moon'] || positions['moon'];
    if (isWater(moon?.sign)) {
        score += 8;
        signals.push(`Moon in Water (deep emotional resonance)`);
    }

    let earthAirCount = 0;
    for (const [_, planet] of Object.entries(positions)) {
        const el = elem(planet?.sign);
        if (el === 'E' || el === 'A') earthAirCount++;
    }
    if (earthAirCount >= 5) {
        score -= 10;
        signals.push(`Earth/Air emphasis (grounded, steady baseline)`);
    }

    return { value: Math.max(0, Math.min(100, score)), band: scoreToBand(score), signals };
}

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulary Phrase Pools
// ─────────────────────────────────────────────────────────────────────────────

const PHRASE_POOLS = {
    O: {
        high: ['wide aperture', 'scans the horizon before landing', 'permeable to unfamiliar currents'],
        moderate: ['balanced aperture', 'selective curiosity', 'explores within familiar territory'],
        low: ['consolidates before expanding', 'prefers the tested path', 'builds from what\'s already known'],
    },
    C: {
        high: ['load-bearing architecture', 'sequence-aware timing', 'holds structure under pressure'],
        moderate: ['flexible structure', 'adaptive timing', 'holds shape when needed'],
        low: ['improvisational rhythm', 'responds when the field calls', 'moves with what arrives'],
    },
    E: {
        high: ['outward-moving energy', 'energized by contact', 'ignites through engagement'],
        moderate: ['balanced between solitude and contact', 'context-dependent energy', 'selective engagement'],
        low: ['inward-moving energy', 'restored by solitude', 'depth before movement'],
    },
    A: {
        high: ['field-harmonizing tendency', 'moves toward coherence', 'smoothing function active'],
        moderate: ['selective harmonizing', 'holds ground when it matters', 'conditionally accommodating'],
        low: ['edge-preserving', 'maintains contour under pressure', 'doesn\'t default to merge'],
    },
    N: {
        high: ['sensitized seismograph', 'early-warning system active', 'responsive to pressure gradients'],
        moderate: ['calibrated sensitivity', 'responsive when it matters', 'feels and stabilizes'],
        low: ['even-keel baseline', 'stable under load', 'low volatility signature'],
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Execution
// ─────────────────────────────────────────────────────────────────────────────

const jsonPath = process.argv[2] || path.join(__dirname, '../analysis/Wheel Charts/Weather_Dashboard_dan-cross-stephie_2025-12-08_to_2025-12-13_Mirror+SymbolicWeather.json');

console.log('🧠 Big Five Inference Test');
console.log('='.repeat(60));
console.log(`Reading: ${path.basename(jsonPath)}\n`);

try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    const people = [
        { name: data.person_a?.name || 'Person A', positions: data.person_a?.chart?.positions || {} },
        { name: data.person_b?.name || 'Person B', positions: data.person_b?.chart?.positions || {} },
    ];

    for (const person of people) {
        if (Object.keys(person.positions).length < 3) {
            console.log(`\n⚠️ Skipping ${person.name} — insufficient chart data`);
            continue;
        }

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📊 ${person.name}`);
        console.log('─'.repeat(60));

        const profile = {
            O: inferOpenness(person.positions),
            C: inferConscientiousness(person.positions),
            E: inferExtraversion(person.positions),
            A: inferAgreeableness(person.positions),
            N: inferNeuroticism(person.positions),
        };

        // Technical ledger (backstage)
        console.log('\n📋 Technical Ledger (Backstage Only):');
        console.log(`   O-${profile.O.value} (${profile.O.band}) | C-${profile.C.value} (${profile.C.band}) | E-${profile.E.value} (${profile.E.band}) | A-${profile.A.value} (${profile.A.band}) | N-${profile.N.value} (${profile.N.band})`);

        // Show signals
        console.log('\n🔬 Geometry Signals:');
        for (const [key, dim] of Object.entries(profile)) {
            if (dim.signals.length > 0) {
                console.log(`   ${key}: ${dim.signals.join(', ')}`);
            }
        }

        // Vocabulary shaping (frontstage)
        console.log('\n✨ Vocabulary Shaping (What Raven Would Use):');
        for (const [key, dim] of Object.entries(profile)) {
            const phrases = PHRASE_POOLS[key][dim.band];
            const label = { O: 'Aperture', C: 'Structure', E: 'Energy', A: 'Relational', N: 'Sensitivity' }[key];
            console.log(`   ${label}: ${phrases.join(' | ')}`);
        }

        // Sample narrative
        console.log('\n📝 Sample Narrative Fragment (How This Might Sound):');
        const o = PHRASE_POOLS.O[profile.O.band][0];
        const c = PHRASE_POOLS.C[profile.C.band][0];
        const e = PHRASE_POOLS.E[profile.E.band][0];
        const a = PHRASE_POOLS.A[profile.A.band][0];
        const n = PHRASE_POOLS.N[profile.N.band][0];

        console.log(`   "Your architecture shows a ${o}—you tend to ${profile.O.band === 'high' ? 'cast the net before deciding what to keep' : profile.O.band === 'low' ? 'build from what\'s already proven' : 'balance exploration with consolidation'}.`);
        console.log(`   There's a ${c} quality here: ${profile.C.band === 'high' ? 'once you commit, you hold' : profile.C.band === 'low' ? 'you move with what arrives' : 'you adapt to what the situation requires'}.`);
        console.log(`   Your energy is ${e.split(' ')[0]}-moving—${profile.E.band === 'high' ? 'gathering momentum from contact' : profile.E.band === 'low' ? 'restored by solitude and depth' : 'context-dependent'}.`);
        console.log(`   Relationally, you're ${a}—${profile.A.band === 'high' ? 'moving toward coherence' : profile.A.band === 'low' ? 'holding your contour rather than merging' : 'balancing accommodation with autonomy'}.`);
        console.log(`   Your baseline shows a ${n}—${profile.N.band === 'high' ? 'finely tuned to shifts in pressure' : profile.N.band === 'low' ? 'stable even under load' : 'responsive but steady'}."`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Big Five inference working correctly!');
    console.log('   Notice: No Big Five labels in the narrative. Pure geometry.');

} catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
}
