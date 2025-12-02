
console.log('Resolved api-client path:', require.resolve('../src/math-brain/api-client'));
const { getSynastryTransits } = require('../src/math-brain/api-client');
const { DateTime } = require('luxon');

// Mock Logger
const logger = {
    info: (msg, ...args) => console.log('[INFO]', msg, ...args),
    error: (msg, ...args) => console.error('[ERROR]', msg, ...args),
    warn: (msg, ...args) => console.warn('[WARN]', msg, ...args),
    debug: (msg, ...args) => console.log('[DEBUG]', msg, ...args),
};

// Mock dependencies
global.logger = logger;

// --- Poetic Brain Extraction Logic (Mirrored from poetic-brain/src/index.ts) ---

function extractSynastryAspects(payload) {
    const candidates = [
        payload.synastry_aspects,
        payload.relationship_context?.synastry_aspects,
        payload.relationship_context?.synastry?.aspects,
        payload.synastry?.aspects,
        payload.relational_engine?.synastry_aspects,
        payload.composite?.synastry_aspects,
        payload.composite?.relational_mirror?.synastry_aspects,
        payload.backstage?.synastry_aspects_raw,
    ];

    for (const source of candidates) {
        if (Array.isArray(source) && source.length > 0) {
            return source;
        }
    }

    return Array.isArray(payload.synastry_aspects) ? payload.synastry_aspects : [];
}

function extractGeometrySummary(chart) {
    if (!chart || typeof chart !== 'object') {
        return 'Chart geometry unavailable.';
    }

    const planets = chart.positions || chart.planets || chart.planetary_positions || {};
    const planetCount = Object.keys(planets).length;

    const aspects = chart.aspects || [];
    const aspectCount = Array.isArray(aspects) ? aspects.length : 0;

    if (planetCount === 0 && aspectCount === 0) {
        return 'Chart geometry present but unparsed.';
    }

    const parts = [];
    if (planetCount > 0) parts.push(`${planetCount} planetary positions`);
    if (aspectCount > 0) parts.push(`${aspectCount} aspects`);

    return parts.join(', ');
}

// --- Test Execution ---

async function runTest() {
    console.log('Starting Poetic Brain Handoff Debug...');

    const personA = {
        name: 'Person A',
        birthDate: '1990-01-01',
        year: 1990,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        birthTime: '12:00',
        birthPlace: 'New York, NY',
        lat: 40.7128,
        lng: -74.0060,
        timezone: 'America/New_York'
    };

    const personB = {
        name: 'Person B',
        birthDate: '1992-05-15',
        year: 1992,
        month: 5,
        day: 15,
        hour: 9,
        minute: 30,
        birthTime: '09:30',
        birthPlace: 'Los Angeles, CA',
        lat: 34.0522,
        lng: -118.2437,
        timezone: 'America/Los_Angeles'
    };

    const startDate = DateTime.now().toISODate();
    const endDate = DateTime.now().plus({ days: 1 }).toISODate();

    const transitParams = {
        startDate,
        endDate,
        days: 2
    };

    // Set API Key
    process.env.RAPIDAPI_KEY = '40889e2cf0msh5573bf5995e3376p19ffcfjsn815e8406eee3';
    const { buildHeaders } = require('../src/math-brain/api-client');
    const headers = buildHeaders();

    try {
        // 1. Fetch Data using fixed api-client
        console.log('Fetching Synastry Transits...');
        const result = await getSynastryTransits(personA, personB, transitParams, headers, {});

        console.log('Fetch Complete. Result Keys:', Object.keys(result));

        // 2. Simulate Route Handler Construction (mimicking app/api/astrology-mathbrain/route.ts)
        // The route handler typically wraps this in a structure like:
        // { geometry: { chartA, chartB, synastry: result.synastry }, ... }

        // Let's assume the payload passed to Poetic Brain looks something like this (based on InputPayload):
        const payload = {
            person_a: {
                chart: result.synastry?.chartA || {}, // Assuming synastry result might contain chartA
                natal_chart: result.synastry?.chartA || {},
            },
            person_b: {
                chart: result.synastry?.chartB || {},
                natal_chart: result.synastry?.chartB || {},
            },
            synastry: result.synastry, // This is what we fixed
            transits: result.transitsA, // Or combined
        };

        // 3. Test Poetic Brain Extraction
        console.log('\n--- Testing Poetic Brain Extraction ---');

        // Check Synastry Aspects
        const extractedSynastry = extractSynastryAspects(payload);
        console.log(`Extracted Synastry Aspects: ${extractedSynastry ? extractedSynastry.length : 0}`);

        if (!extractedSynastry || extractedSynastry.length === 0) {
            console.error('❌ FAILED: Poetic Brain would not find synastry aspects!');
            console.log('Payload.synastry keys:', payload.synastry ? Object.keys(payload.synastry) : 'undefined');
            if (payload.synastry) {
                console.log('Payload.synastry.aspects:', payload.synastry.aspects ? payload.synastry.aspects.length : 'undefined');
                console.log('Payload.synastry.data keys:', payload.synastry.data ? Object.keys(payload.synastry.data) : 'undefined');
            }
        } else {
            console.log('✅ SUCCESS: Synastry aspects found.');
        }

        // Check Geometry Summary (Person A)
        // Note: getSynastryTransits might not return full natal charts for A and B, 
        // usually those come from separate calls or are embedded. 
        // Let's check what `result.synastry` actually contains.
        console.log('\nChecking Synastry Object Structure:');
        if (result.synastry) {
            console.log('Keys:', Object.keys(result.synastry));
            // In v3, does it contain chartA/chartB?
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

runTest();
