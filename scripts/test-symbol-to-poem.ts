
import { generateSymbolToPoem } from '../lib/poetics/symbolToPoem';
import { inferBigFiveFromChart } from '../lib/bigfive/inferBigFiveFromChart';
import { detectTensions } from '../lib/bigfive/tensionSynthesis';

// Mock Data (Abby Cross sample subset)
const mockPositions = {
    Sun: { sign: 'Taurus', house: 2 },
    Moon: { sign: 'Pisces', house: 12 },
    Mercury: { sign: 'Gemini', house: 3 },
    Venus: { sign: 'Aries', house: 1 },
    Mars: { sign: 'Leo', house: 5 },
    Jupiter: { sign: 'Scorpio', house: 8 },
    Saturn: { sign: 'Leo', house: 5 },
    Uranus: { sign: 'Pisces', house: 12 },
    Neptune: { sign: 'Aquarius', house: 11 },
    Pluto: { sign: 'Sagittarius', house: 9 },
    Ascendant: { sign: 'Aries' },
    Midheaven: { sign: 'Capricorn' }
};

const mockAngleSigns = {
    Ascendant: 'Aries',
    Midheaven: 'Capricorn'
};

async function testSymbolToPoem() {
    console.log('--- Testing Symbol To Poem ---');

    // 1. Infer Profile
    console.log('Inferring Big Five...');
    const profile = inferBigFiveFromChart({ positions: mockPositions } as any);

    if (!profile) throw new Error('Failed to infer profile');

    // 2. Detect Tensions
    console.log('Detecting Tensions...');
    const tensions = detectTensions(profile, mockPositions, mockAngleSigns);

    // 3. Generate Poem
    console.log('Generating Poem...');
    const output = generateSymbolToPoem(profile, tensions, mockPositions, 'Test Subject');

    console.log('\n--- POEM OUTPUT ---');
    console.log(output.poem.join('\n'));

    console.log('\n--- FULL MARKDOWN ---');
    console.log(output.formattedMarkdown);

    // Assertions
    if (!output.formattedMarkdown.includes('### 1. Poem')) throw new Error('Missing Poem Section');
    if (!output.formattedMarkdown.includes('### 2. Explanation Table')) throw new Error('Missing Table Section');
    if (!output.formattedMarkdown.includes('### 3. Color/Emoji Legend')) throw new Error('Missing Legend Section');
    if (!output.formattedMarkdown.includes('🔴')) throw new Error('Missing Emojis');

    console.log('\n✅ Verification Passed');
}

testSymbolToPoem().catch(console.error);
