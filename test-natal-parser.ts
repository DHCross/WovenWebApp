
import { parseAstroSeekBlob } from './lib/raven/parser';

const TEST_INPUT = `
Here's my Natal Chart: DHCross
Date of Birth (local time):24 July 1973 - 14:30  (EDT, DST)Universal Time (UT/GMT):24 July 1973 - 18:30  Local Sidereal Time (LST):09:38:08House system:Placidus systemLatitude, Longitude:40°1'N, 75°18'WCity:Bryn Mawr
Country:United States United States (US), PA
`;

async function runTest() {
    console.log('--- Testing Natal Parsing ---');
    const result = parseAstroSeekBlob(TEST_INPUT);

    console.log('Parsed Result:', JSON.stringify(result, null, 2));

    if (result.location) {
        console.log('Location Found:', result.location);
        if (result.location.city === 'Bryn Mawr') {
            console.log('SUCCESS: City extracted correctly.');
        } else {
            console.log('FAILURE: City mismatch. Got:', result.location.city);
        }
    } else {
        console.log('FAILURE: No location data extracted.');
    }
}

runTest();
