/**
 * Test for Person B Relocation Fix
 * Verifies that Person B's relocated chart is used when relocation_mode is BOTH_LOCAL
 * 
 * To run: node test/person-b-relocation-fix.test.js
 */

const { handler } = require('../lib/server/astrology-mathbrain.js');

// Mock Data
const MOCK_NATAL_A = {
    status: "OK",
    data: {
        subject: { name: "Person A" },
        first_house: { abs_pos: 10 }, // Natal Ascendant A
        second_house: { abs_pos: 40 },
        third_house: { abs_pos: 70 },
        fourth_house: { abs_pos: 100 },
        fifth_house: { abs_pos: 130 },
        sixth_house: { abs_pos: 160 },
        seventh_house: { abs_pos: 190 },
        eighth_house: { abs_pos: 220 },
        ninth_house: { abs_pos: 250 },
        tenth_house: { abs_pos: 280 },
        eleventh_house: { abs_pos: 310 },
        twelfth_house: { abs_pos: 340 },
        planets: {
            sun: { abs_pos: 0 },
            moon: { abs_pos: 30 }
        }
    },
    aspects: []
};

const MOCK_NATAL_B = {
    status: "OK",
    data: {
        subject: { name: "Person B" },
        first_house: { abs_pos: 20 }, // Natal Ascendant B
        second_house: { abs_pos: 50 },
        third_house: { abs_pos: 80 },
        fourth_house: { abs_pos: 110 },
        fifth_house: { abs_pos: 140 },
        sixth_house: { abs_pos: 170 },
        seventh_house: { abs_pos: 200 },
        eighth_house: { abs_pos: 230 },
        ninth_house: { abs_pos: 260 },
        tenth_house: { abs_pos: 290 },
        eleventh_house: { abs_pos: 320 },
        twelfth_house: { abs_pos: 350 },
        planets: {
            sun: { abs_pos: 60 },
            moon: { abs_pos: 90 }
        }
    },
    aspects: []
};

const MOCK_RELOCATED_A = {
    status: "OK",
    data: {
        subject: { name: "Person A Relocated" },
        first_house: { abs_pos: 15 }, // Relocated Ascendant A
        second_house: { abs_pos: 45 },
        third_house: { abs_pos: 75 },
        fourth_house: { abs_pos: 105 },
        fifth_house: { abs_pos: 135 },
        sixth_house: { abs_pos: 165 },
        seventh_house: { abs_pos: 195 },
        eighth_house: { abs_pos: 225 },
        ninth_house: { abs_pos: 255 },
        tenth_house: { abs_pos: 285 },
        eleventh_house: { abs_pos: 315 },
        twelfth_house: { abs_pos: 345 },
        planets: {
            sun: { abs_pos: 0 },
            moon: { abs_pos: 30 }
        }
    },
    aspects: []
};

const MOCK_RELOCATED_B = {
    status: "OK",
    data: {
        subject: { name: "Person B Relocated" },
        first_house: { abs_pos: 25 }, // Relocated Ascendant B - THIS IS WHAT WE WANT
        second_house: { abs_pos: 55 },
        third_house: { abs_pos: 85 },
        fourth_house: { abs_pos: 115 },
        fifth_house: { abs_pos: 145 },
        sixth_house: { abs_pos: 175 },
        seventh_house: { abs_pos: 205 },
        eighth_house: { abs_pos: 235 },
        ninth_house: { abs_pos: 265 },
        tenth_house: { abs_pos: 295 },
        eleventh_house: { abs_pos: 325 },
        twelfth_house: { abs_pos: 355 },
        planets: {
            sun: { abs_pos: 60 },
            moon: { abs_pos: 90 }
        }
    },
    aspects: []
};

const MOCK_TRANSITS = {
    status: "OK",
    data: {
        transitsByDate: {
            "2025-10-18": []
        }
    },
    aspects: []
};

// Setup Environment
function setupTestEnvironment() {
    process.env.RAPIDAPI_KEY = 'test-key-person-b-relocation';
    process.env.LOG_LEVEL = 'error';

    global.fetch = async (url, options) => {
        await new Promise(resolve => setTimeout(resolve, 10));

        // Check URL and body to determine which mock to return
        if (url.includes('birth-chart')) {
            const body = JSON.parse(options.body);

            // Person A
            if (body.year === 1973) {
                if (body.latitude === 30.202741997200352) return { ok: true, json: async () => MOCK_RELOCATED_A };
                return { ok: true, json: async () => MOCK_NATAL_A };
            }

            // Person B
            if (body.year === 1968) {
                if (body.latitude === 30.202741997200352) return { ok: true, json: async () => MOCK_RELOCATED_B };
                return { ok: true, json: async () => MOCK_NATAL_B };
            }
        }

        if (url.includes('transit-aspects-data')) {
            return { ok: true, json: async () => MOCK_TRANSITS };
        }

        // Default fallback for other calls (synastry, composite, etc.)
        return { ok: true, json: async () => ({ status: "OK", data: {}, aspects: [] }) };
    };
}

async function testPersonBRelocation() {
    console.log('\n🧪 Test: Person B Relocation in BOTH_LOCAL mode');

    const requestPayload = {
        mode: "SYNASTRY_TRANSITS",
        personA: {
            name: "Dan",
            year: 1973, month: 7, day: 24, hour: 14, minute: 30,
            city: "Bryn Mawr", state: "PA",
            latitude: 40.0259, longitude: -75.3138,
            timezone: "America/New_York", zodiac_type: "Tropic", nation: "US"
        },
        personB: {
            name: "Stephie",
            year: 1968, month: 4, day: 16, hour: 18, minute: 37,
            city: "Albany", state: "GA",
            latitude: 31.5785, longitude: -84.1557,
            timezone: "America/New_York", zodiac_type: "Tropic", nation: "US"
        },
        window: {
            start: "2025-10-18", end: "2025-10-18", step: "daily"
        },
        relocation_mode: "BOTH_LOCAL",
        translocation: {
            applies: true,
            method: "BOTH_LOCAL",
            current_location: {
                latitude: 30.202741997200352,
                longitude: -85.6578987660695,
                timezone: "America/Chicago",
                label: "Relocated Spot"
            }
        },
        relationship_context: {
            type: "PARTNER", intimacy_tier: "P2", contact_state: "ACTIVE"
        }
    };

    const event = {
        httpMethod: 'POST',
        body: JSON.stringify(requestPayload)
    };

    try {
        const response = await handler(event);
        const result = JSON.parse(response.body);

        if (response.statusCode !== 200) {
            throw new Error(`Request failed: ${result.error || result.detail}`);
        }

        // Check the relocated chart data
        // The fix should ensure Person B's relocated chart is fetched and stored in chart_relocated
        console.log('   Result keys:', Object.keys(result));
        console.log('   Person A keys:', Object.keys(result.person_a || {}));
        console.log('   Person B keys:', Object.keys(result.person_b || {}));

        // Check relocated charts were fetched
        const personARelocatedAsc = result.person_a?.chart_relocated?.first_house?.abs_pos;
        const personBRelocatedAsc = result.person_b?.chart_relocated?.first_house?.abs_pos;

        // Also check the active chart (should be relocated)
        const personAActiveAsc = result.person_a?.chart?.first_house?.abs_pos;
        const personBActiveAsc = result.person_b?.chart?.first_house?.abs_pos;

        console.log('   Person A Relocated Ascendant:', personARelocatedAsc);
        console.log('   Person A Active Chart Ascendant:', personAActiveAsc);
        console.log('   Person B Relocated Ascendant:', personBRelocatedAsc);
        console.log('   Person B Active Chart Ascendant:', personBActiveAsc);

        // Assertions - check if relocated charts were fetched
        let hasError = false;

        if (personARelocatedAsc !== 15 && personAActiveAsc !== 15) {
            console.error('❌ FAIL: Person A did not use relocated chart');
            console.error('   Expected: 15, Got relocated=' + personARelocatedAsc + ', active=' + personAActiveAsc);
            hasError = true;
        } else {
            console.log('✅ PASS: Person A used relocated chart');
        }

        if (personBRelocatedAsc !== 25 && personBActiveAsc !== 25) {
            console.error('❌ FAIL: Person B did not use relocated chart');
            console.error('   Expected: 25, Got relocated=' + personBRelocatedAsc + ', active=' + personBActiveAsc);
            console.error('   This confirms the bug: Person B relocation not applied');
            hasError = true;
        } else {
            console.log('✅ PASS: Person B used relocated chart');
        }

        if (hasError) {
            throw new Error('Person B relocation test failed');
        }
        return true;

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        throw error;
    }
}

// Run Test
setupTestEnvironment();
testPersonBRelocation().catch(() => process.exit(1));
