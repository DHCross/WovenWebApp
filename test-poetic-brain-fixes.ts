
import { renderShareableMirror } from './lib/raven/render';
import { normalizeGeometry } from './lib/raven/normalize';

// Mock data
const mockGeo = {
    placements: [
        { body: 'Sun', sign: 'Scorpio', degree: 15, house: 1 },
        { body: 'Moon', sign: 'Taurus', degree: 20, house: 7 }
    ],
    aspects: [
        { from: 'Sun', to: 'Moon', type: 'Opposition', orb: 5 }
    ],
    summary: {
        dominantElement: 'Water',
        dominantModality: 'Fixed'
    }
};

const mockProv = { source: 'Test Script' };
const mockOptions = { geometryValidated: true };

async function testRendering() {
    console.log('--- Testing Relational Mirror Mode ---');
    try {
        const relationalDraft = await renderShareableMirror({
            geo: mockGeo as any,
            prov: mockProv,
            options: mockOptions,
            mode: 'relational-mirror' as any
        });
        console.log('Relational Draft Success:', !!relationalDraft.picture);
        if (!relationalDraft.picture) console.error('Relational Draft Failed:', relationalDraft);
    } catch (e) {
        console.error('Relational Mode Error:', e);
    }

    console.log('\n--- Testing Contextual Mirror Mode (Fallback to Natal-Only) ---');
    try {
        const contextualDraft = await renderShareableMirror({
            geo: mockGeo as any,
            prov: mockProv,
            options: mockOptions,
            mode: 'natal-only' as any // Simulating the fix we applied
        });
        console.log('Contextual Draft Success:', !!contextualDraft.picture);
        if (!contextualDraft.picture) console.error('Contextual Draft Failed:', contextualDraft);
    } catch (e) {
        console.error('Contextual Mode Error:', e);
    }

    console.log('\n--- Testing Invalid Mode (Should Fallback or Error) ---');
    try {
        const invalidDraft = await renderShareableMirror({
            geo: mockGeo as any,
            prov: mockProv,
            options: mockOptions,
            mode: 'invalid-mode' as any
        });
        console.log('Invalid Mode Result:', invalidDraft.picture ? 'Generated (Fallback)' : 'Failed');
    } catch (e) {
        console.error('Invalid Mode Error:', e);
    }
}

testRendering();
