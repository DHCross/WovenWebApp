// Snapshot Payload Validation Test
// Verifies that the snapshot button creates a valid API payload

describe('Snapshot Payload Validation', () => {
  test('snapshot payload should pass server validation', () => {
    // Simulate personA from UI state
    const personA = {
      name: 'Dan',
      year: '1973',
      month: '07',
      day: '24',
      hour: '14',
      minute: '30',
      city: 'Bryn Mawr',
      state: 'PA',
      latitude: 40.0167,
      longitude: -75.3,
      timezone: 'US/Eastern',
      zodiac_type: 'Tropic'
    };

    // Simulate current location (Panama City, FL)
    const location = { latitude: 30.1667, longitude: -85.6667 };
    const timezone = 'US/Central';

    // Build snapshot payload (matching useSnapshot.ts logic)
    const snapshotPersonA = {
      ...personA,
      nation: 'US', // Added by useSnapshot
      year: Number(personA.year),
      month: Number(personA.month),
      day: Number(personA.day),
      hour: Number(personA.hour),
      minute: Number(personA.minute),
      latitude: location.latitude,      // RELOCATED
      longitude: location.longitude,    // RELOCATED
      timezone                          // RELOCATED
    };

    console.log('\n📦 Snapshot Payload (personA):');
    console.log(JSON.stringify(snapshotPersonA, null, 2));

    // Simulate server validation (from astrology-mathbrain.js:1280-1290)
    const baseReq = ['year','month','day','hour','minute','name','zodiac_type'];
    const baseMissing = baseReq.filter(f =>
      snapshotPersonA[f] === undefined ||
      snapshotPersonA[f] === null ||
      snapshotPersonA[f] === ''
    );

    const hasCoords =
      (typeof snapshotPersonA.latitude === 'number') &&
      (typeof snapshotPersonA.longitude === 'number') &&
      Boolean(snapshotPersonA.timezone);

    const hasCity = Boolean(snapshotPersonA.city && snapshotPersonA.nation);
    const okMode = hasCoords || hasCity;

    console.log('\n✅ Validation Check:');
    console.log(`  Required fields: ${baseReq.join(', ')}`);
    console.log(`  Missing fields: ${baseMissing.length ? baseMissing.join(', ') : 'none'}`);
    console.log(`  Has coordinates: ${hasCoords}`);
    console.log(`  Has city+nation: ${hasCity}`);
    console.log(`  Valid location mode: ${okMode}`);

    const isValid = baseMissing.length === 0 && okMode;
    console.log(`  Overall valid: ${isValid}\n`);

    // Assertions
    expect(baseMissing).toHaveLength(0);
    expect(hasCoords).toBe(true);
    expect(isValid).toBe(true);
  });

  test('snapshot with Person B should pass validation', () => {
    const personA = {
      name: 'Dan',
      year: '1973',
      month: '07',
      day: '24',
      hour: '14',
      minute: '30',
      city: 'Bryn Mawr',
      state: 'PA',
      zodiac_type: 'Tropic'
    };

    const personB = {
      name: 'Stephie',
      year: '1965',
      month: '04',
      day: '16',
      hour: '18',
      minute: '37',
      city: 'Albany',
      state: 'GA',
      zodiac_type: 'Tropic'
    };

    const location = { latitude: 30.1667, longitude: -85.6667 };
    const timezone = 'US/Central';

    const snapshotPersonA = {
      ...personA,
      nation: 'US',
      year: Number(personA.year),
      month: Number(personA.month),
      day: Number(personA.day),
      hour: Number(personA.hour),
      minute: Number(personA.minute),
      latitude: location.latitude,
      longitude: location.longitude,
      timezone
    };

    const snapshotPersonB = {
      ...personB,
      nation: 'US',
      year: Number(personB.year),
      month: Number(personB.month),
      day: Number(personB.day),
      hour: Number(personB.hour),
      minute: Number(personB.minute),
      latitude: location.latitude,
      longitude: location.longitude,
      timezone
    };

    console.log('\n👥 Synastry Snapshot Payload:');
    console.log('Person A:', snapshotPersonA.name, '- relocated to', timezone);
    console.log('Person B:', snapshotPersonB.name, '- relocated to', timezone);

    // Validate both
    const validatePerson = (person, label) => {
      const baseReq = ['year','month','day','hour','minute','name','zodiac_type'];
      const baseMissing = baseReq.filter(f =>
        person[f] === undefined || person[f] === null || person[f] === ''
      );
      const hasCoords =
        (typeof person.latitude === 'number') &&
        (typeof person.longitude === 'number') &&
        Boolean(person.timezone);
      const hasCity = Boolean(person.city && person.nation);
      const okMode = hasCoords || hasCity;
      const isValid = baseMissing.length === 0 && okMode;

      console.log(`  ${label} valid: ${isValid}`);
      return { isValid, baseMissing, hasCoords, hasCity };
    };

    const validationA = validatePerson(snapshotPersonA, 'Person A');
    const validationB = validatePerson(snapshotPersonB, 'Person B');

    expect(validationA.isValid).toBe(true);
    expect(validationB.isValid).toBe(true);
  });

  test('identify potential relocation conflict issues', () => {
    // This test checks if the "clever math trick" for relocation
    // causes validation issues when city/coordinates don't match

    const personA = {
      name: 'Dan',
      year: '1973',
      month: '07',
      day: '24',
      hour: '14',
      minute: '30',
      city: 'Bryn Mawr',    // Original city
      state: 'PA',
      nation: 'US',
      latitude: 30.1667,    // RELOCATED coordinates (Panama City)
      longitude: -85.6667,
      timezone: 'US/Central',
      zodiac_type: 'Tropic'
    };

    console.log('\n⚠️ Potential Issue: City/Coordinates Mismatch');
    console.log(`  City: ${personA.city}, ${personA.state} (birth place)`);
    console.log(`  Coords: ${personA.latitude}, ${personA.longitude} (relocated)`);
    console.log(`  Timezone: ${personA.timezone} (relocated)`);

    // The issue: Bryn Mawr has coords ~40°N, 75°W
    // But the payload has coords 30°N, 85°W (Panama City)
    // The city field still says "Bryn Mawr" but coords are relocated

    console.log('\n💡 Recommendation:');
    console.log('  For snapshot/relocation, the API should:');
    console.log('  1. Accept EITHER city OR coords (not require both to match)');
    console.log('  2. Prioritize coords when both are present');
    console.log('  3. OR: Clear/omit the city field when using relocated coords');

    // Current validation allows this (city OR coords, not both required to match)
    const hasCoords =
      (typeof personA.latitude === 'number') &&
      (typeof personA.longitude === 'number') &&
      Boolean(personA.timezone);

    const hasCity = Boolean(personA.city && personA.nation);

    console.log(`\n  Has valid coords: ${hasCoords}`);
    console.log(`  Has valid city+nation: ${hasCity}`);
    console.log(`  Either is sufficient: ${hasCoords || hasCity}`);

    expect(hasCoords).toBe(true);
  });
});
