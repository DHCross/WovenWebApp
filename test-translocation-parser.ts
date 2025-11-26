
import { parseAstroSeekBlob } from './lib/raven/parser';

const TEST_INPUT = `
Let me show you a true translocated wheel chart. This for me : DHCross:24 July 1973 - 14:30  (EDT, DST)Universal Time (UT/GMT):24 July 1973 - 18:30  House system:Placidus systemLatitude, Longitude:40°1'N, 75°18'WCity (Country):United States Bryn Mawr (US), PA
Transit chart (local time):26 Nov 2025 - 06:47  (CST)Universal Time (UT/GMT):26 Nov 2025 - 12:47  (PROG, PW)Latitude, Longitude:30°10'N, 85°40'WCity, Country:United States Panama City (US)
`;

async function runTest() {
    console.log('--- Testing Translocation Parsing ---');
    const result = parseAstroSeekBlob(TEST_INPUT);

    console.log('Parsed Result:', JSON.stringify(result, null, 2));

    // Check for location data (currently expected to be missing)
    if ((result as any).location || (result as any).transitLocation) {
        console.log('SUCCESS: Location data found.');
    } else {
        console.log('FAILURE: No location data extracted.');
    }
}

runTest();
