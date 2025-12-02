
const { apiCallWithRetry, API_ENDPOINTS, buildHeaders } = require('../src/math-brain/api-client');

process.env.RAPIDAPI_KEY = '40889e2cf0msh5573bf5995e3376p19ffcfjsn815e8406eee3';

async function testPayload() {
    const headers = buildHeaders();
    const subject = {
        name: "Test Subject",
        birth_data: {
            year: 1990, month: 1, day: 1, hour: 12, minute: 0, second: 0,
            latitude: 40.7128, longitude: -74.0060, timezone: "America/New_York"
        }
    };

    const options = {
        house_system: "P",
        zodiac_type: "Tropic",
        active_points: ["Sun", "Moon"],
        precision: 2
    };

    // Test 1: Object Dates
    const payloadObj = {
        subject,
        date_range: {
            start_date: { year: 2025, month: 12, day: 2 },
            end_date: { year: 2025, month: 12, day: 3 }
        },
        options
    };

    console.log('Testing Object Dates...');
    try {
        await apiCallWithRetry(API_ENDPOINTS.NATAL_TRANSITS, {
            method: 'POST', headers, body: JSON.stringify(payloadObj)
        }, 'Test Object Dates');
        console.log('✅ Object Dates SUCCESS');
    } catch (e) {
        console.log('❌ Object Dates FAILED:', e.message);
        if (e.raw) console.log('Response:', e.raw);
    }

    // Test 2: String Dates
    const payloadStr = {
        subject,
        date_range: {
            start_date: "2025-12-02",
            end_date: "2025-12-03"
        },
        options
    };

    console.log('\nTesting String Dates...');
    try {
        await apiCallWithRetry(API_ENDPOINTS.NATAL_TRANSITS, {
            method: 'POST', headers, body: JSON.stringify(payloadStr)
        }, 'Test String Dates');
        console.log('✅ String Dates SUCCESS');
    } catch (e) {
        console.log('❌ String Dates FAILED:', e.message);
        if (e.raw) console.log('Response:', e.raw);
    }

    // Test 3: Flattened Dates
    const payloadFlat = {
        subject,
        start_date: { year: 2025, month: 12, day: 2 },
        end_date: { year: 2025, month: 12, day: 3 },
        options
    };

    console.log('\nTesting Flattened Dates...');
    try {
        await apiCallWithRetry(API_ENDPOINTS.NATAL_TRANSITS, {
            method: 'POST', headers, body: JSON.stringify(payloadFlat)
        }, 'Test Flattened Dates');
        console.log('✅ Flattened Dates SUCCESS');
    } catch (e) {
        console.log('❌ Flattened Dates FAILED:', e.message);
        if (e.raw) console.log('Response:', e.raw);
    }

    // Test 4: Minimal Object Dates (No Options)
    const payloadMin = {
        subject,
        date_range: {
            start_date: { year: 2025, month: 12, day: 2 },
            end_date: { year: 2025, month: 12, day: 3 }
        }
    };

    console.log('\nTesting Minimal Object Dates...');
    try {
        await apiCallWithRetry(API_ENDPOINTS.NATAL_TRANSITS, {
            method: 'POST', headers, body: JSON.stringify(payloadMin)
        }, 'Test Minimal Object Dates');
        console.log('✅ Minimal Object Dates SUCCESS');
    } catch (e) {
        console.log('❌ Minimal Object Dates FAILED:', e.message);
        if (e.raw) console.log('Response:', e.raw);
    }

    // Test 5: Options without Active Points
    const optionsNoPoints = { ...options };
    delete optionsNoPoints.active_points;
    const payloadNoPoints = {
        subject,
        date_range: {
            start_date: { year: 2025, month: 12, day: 2 },
            end_date: { year: 2025, month: 12, day: 3 }
        },
        options: optionsNoPoints
    };

    console.log('\nTesting Options without Active Points...');
    try {
        await apiCallWithRetry(API_ENDPOINTS.NATAL_TRANSITS, {
            method: 'POST', headers, body: JSON.stringify(payloadNoPoints)
        }, 'Test Options No Points');
        console.log('✅ Options without Active Points SUCCESS');
    } catch (e) {
        console.log('❌ Options without Active Points FAILED:', e.message);
        if (e.raw) console.log('Response:', e.raw);
    }

    // Test 6: Options with Active Points (Original)
    const payloadFull = {
        subject,
        date_range: {
            start_date: { year: 2025, month: 12, day: 2 },
            end_date: { year: 2025, month: 12, day: 3 }
        },
        options
    };

    console.log('\nTesting Full Options (Original)...');
    try {
        await apiCallWithRetry(API_ENDPOINTS.NATAL_TRANSITS, {
            method: 'POST', headers, body: JSON.stringify(payloadFull)
        }, 'Test Full Options');
        console.log('✅ Full Options SUCCESS');
    } catch (e) {
        console.log('❌ Full Options FAILED:', e.message);
        if (e.raw) console.log('Response:', e.raw);
    }
}

testPayload();
