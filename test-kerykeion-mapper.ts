
import { parseAstroSeekBlob } from './lib/raven/parser';
import { mapAstroSeekToKerykeion } from './lib/kerykeion/mapper';

const TEST_INPUT = `
Here's my Natal Chart: DHCross
Date of Birth (local time):24 July 1973 - 14:30  (EDT, DST)Universal Time (UT/GMT):24 July 1973 - 18:30  Local Sidereal Time (LST):09:38:08House system:Placidus systemLatitude, Longitude:40°1'N, 75°18'WCity:Bryn Mawr
Country:United States United States (US), PA
Sun Leo 1°41'
Moon Taurus 22°34'
Mercury Cancer 24°34' R
Venus Leo 29°36'
Mars Aries 20°40'
Jupiter Aquarius 7°56' R
Saturn Gemini 29°04'
Uranus Libra 19°16'
Neptune Sagittarius 4°48' R
Pluto Libra 2°09'
True Node Capricorn 6°24'
Chiron Aries 20°54'
Ascendant Scorpio 13°13'
Midheaven Virgo 22°10'
Sun Square Moon 0°10
Sun Trine Mars 2°10
`;

async function runTest() {
    console.log('--- Testing Kerykeion Mapper ---');
    const parsed = parseAstroSeekBlob(TEST_INPUT);
    const kerykeionChart = mapAstroSeekToKerykeion(parsed);

    console.log('Mapped Subject (Partial):');
    console.log('Sun:', JSON.stringify(kerykeionChart.subject.sun, null, 2));
    console.log('Moon:', JSON.stringify(kerykeionChart.subject.moon, null, 2));
    console.log('Ascendant:', JSON.stringify(kerykeionChart.subject.ascendant, null, 2));

    console.log('Mapped Aspects:');
    console.log(JSON.stringify(kerykeionChart.aspects, null, 2));

    if (kerykeionChart.subject.sun.name === 'Sun' && kerykeionChart.subject.sun.sign === 'Leo') {
        console.log('SUCCESS: Sun mapped correctly.');
    } else {
        console.log('FAILURE: Sun mapping incorrect.');
    }
}

runTest();
