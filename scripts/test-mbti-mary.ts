
import { inferMbtiFromChart, inferContactResonance } from '../lib/mbti/inferMbtiFromChart';

const chart = {
    positions: {
        Sun: { sign: 'Ari' },
        Moon: { sign: 'Leo' },
        Mercury: { sign: 'Ari' },
        Venus: { sign: 'Tau' },
        Mars: { sign: 'Ari' },
        Jupiter: { sign: 'Sag' },
        Saturn: { sign: 'Sco', retrograde: true }, // v1.4 Test: Retrograde + Water = Gravity Well
        Uranus: { sign: 'Sag', retrograde: true },
        Neptune: { sign: 'Sag' },
        Pluto: { sign: 'Lib', retrograde: true },
        Chiron: { sign: 'Tau' }
    },
    angle_signs: {
        ascendant: 'Aqu',
        mc: 'Sco'
    }
};

const mbti = inferMbtiFromChart(chart);
const contact = inferContactResonance(chart);

console.log('--- MBTI Inference (v1.4 Logic + Voice) ---');
console.log('Code:', mbti?.code);
console.log('Global Summary:', mbti?.globalSummary);
console.log('\n--- Axis Reasoning ---');
console.log('E/I:', JSON.stringify(mbti?.axisReasoning?.EI, null, 2));
console.log('N/S:', JSON.stringify(mbti?.axisReasoning?.NS, null, 2));
console.log('T/F:', JSON.stringify(mbti?.axisReasoning?.TF, null, 2));
console.log('J/P:', JSON.stringify(mbti?.axisReasoning?.JP, null, 2));
console.log('\n--- Raw Scores ---');
console.log(JSON.stringify(mbti?._axes, null, 2));

console.log('\n--- Contact Resonance (Exterior) ---');
console.log(JSON.stringify(contact, null, 2));
