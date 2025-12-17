
const { handler } = require('../lib/server/astrology-mathbrain');
require('dotenv').config();

// Define input payload matching the benchmark test
const payload = {
    mode: 'balance_meter',
    report_type: 'solo_balance_meter',
    context: { mode: 'balance_meter' },
    seismograph_config: {
        orbs_profile: 'wm-tight-2025-10',
        aspect_weights_version: '2025-10-30',
    },
    personA: {
        name: 'Dan',
        year: 1973,
        month: 7,
        day: 24,
        hour: 14,
        minute: 30,
        latitude: 40.016700,
        longitude: -75.300000,
        timezone: 'America/New_York',
        city: 'Bryn Mawr',
        nation: 'US',
        zodiac_type: 'Tropic',
    },
    window: { start: '2018-10-10', end: '2018-10-10', step: 'daily' },
    indices: { window: { start: '2018-10-10', end: '2018-10-10', step: 'daily' }, request_daily: true },
    relocation_mode: 'A_local',
    translocation: {
        applies: true,
        method: 'A_local',
        mode: 'A_local',
        label: 'Panama City, FL',
        coords: { latitude: 30.166667, longitude: -85.666667, timezone: 'America/Chicago' },
        tz: 'America/Chicago',
    },
    frontstage_policy: { autogenerate: true, allow_symbolic_weather: true },
};

(async () => {
    console.log('--- Debugging Full Stack (Bypassing route.ts) ---');

    const event = {
        httpMethod: 'POST',
        body: JSON.stringify(payload) // Handler expects stringified body
    };

    try {
        console.time('Handler Execution');
        const response = await handler(event);
        console.timeEnd('Handler Execution');

        if (response.statusCode !== 200) {
            console.error('Handler returned error:', response.statusCode, response.body);
            return;
        }

        const body = JSON.parse(response.body);

        // Extract Seismograph Data
        const personA = body.person_a;
        const seismo = personA?.derived?.seismograph_summary || {};

        console.log('\n--- Balance Meter Result ---');
        console.log('Magnitude:', seismo.magnitude);
        console.log('Directional Bias:', seismo.directional_bias);

        // Check for debug dump if I left it (I removed it, but good to check if aspects were found)
        const transits = personA?.chart?.transitsByDate;
        if (transits) {
            const day = transits['2018-10-10'];
            if (day) {
                console.log('Event Count:', day.counts?.raw || day.event_count); // different formats might apply
                console.log('Aspects Found:', (day.aspects || []).length);
                console.log('Filtered Aspects:', (day.filtered_aspects || []).length);
            } else {
                console.log('No data found for 2018-10-10 in transitsByDate');
            }
        }

    } catch (err) {
        console.error('Fatal error running handler:', err);
    }
})();
