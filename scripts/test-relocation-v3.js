
const { getTransitsV3, getRelocationChart, buildHeaders } = require('../src/math-brain/api-client');
const { DateTime } = require('luxon');

// Set API Key
process.env.RAPIDAPI_KEY = '40889e2cf0msh5573bf5995e3376p19ffcfjsn815e8406eee3';

async function testRelocation() {
    const headers = buildHeaders();

    // Philadelphia (Natal)
    const natalSubject = {
        name: "Test Subject",
        birth_data: {
            year: 1973, month: 7, day: 24, hour: 14, minute: 30,
            latitude: 40.0259, longitude: -75.3138, timezone: "America/New_York"
        }
    };

    // Panama City (Relocated)
    const targetLocation = {
        latitude: 30.2027,
        longitude: -85.6579,
        city: "Panama City, FL"
    };

    const pass = {
        house_system: 'P',
        active_points: ['Sun', 'Moon']
    };

    console.log('--- TEST 1: Static Relocated Chart ---');
    try {
        const result = await getRelocationChart(natalSubject, targetLocation, headers, pass);
        console.log('DEBUG: Result from getRelocationChart:', JSON.stringify(result, null, 2));
        if (result && result.chart) {
            console.log('✅ Relocation chart fetched successfully.');
            console.log('Ascendant:', result.chart.angles?.Ascendant?.abs_pos);
            console.log('House Cusps:', JSON.stringify(result.chart.house_cusps));
        } else {
            console.error('❌ Relocation chart fetch failed (no chart data).');
        }
    } catch (e) {
        console.error('❌ Relocation chart fetch error:', e.message);
    }

    console.log('\n--- TEST 2: Relocated Transits (Coordinate Swap) ---');

    // Construct swapped subject for transits
    const swappedSubject = {
        ...natalSubject,
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
        city: targetLocation.city,
        timezone: "America/Chicago" // Relocated timezone
    };

    const transitParams = {
        startDate: '2025-10-18',
        endDate: '2025-10-19',
        step: 'daily'
    };

    try {
        const result = await getTransitsV3(swappedSubject, transitParams, headers, pass);

        const dates = Object.keys(result.transitsByDate || {});
        console.log('Found ' + dates.length + ' dates with data.');

        if (dates.length > 0) {
            const firstDate = dates[0];
            const aspects = result.transitsByDate[firstDate];
            console.log('First date (' + firstDate + ') has ' + aspects.length + ' items.');

            const firstItem = aspects[0];
            console.log('First item sample:', JSON.stringify(firstItem, null, 2));

            if (firstItem.house || firstItem.transit_house || firstItem.transiting_house) {
                console.log('✅ House data FOUND in V3 response (Coordinate Swap successful)');
            } else {
                console.log('❌ House data MISSING in V3 response');
            }
        }
    } catch (e) {
        console.error('❌ Relocated transits fetch error:', e);
    }
}

testRelocation();
