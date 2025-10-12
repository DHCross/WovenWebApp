/**
 * Direct API test for natal aspects refactor
 * Tests that Person B aspects are correctly extracted by the server
 * Bypasses browser cache issues by hitting API directly
 */

const setupData = require('../examples/math_brain_setup_Dan_Stephie_20251012T062507.json');

describe('Natal Aspects Refactor - Direct API Test', () => {
  const API_URL = 'http://localhost:3000/api/astrology-mathbrain';
  
  test('Person B should have natal aspects populated', async () => {
    // Convert setup file to API payload format
    const payload = {
      person_a: {
        name: setupData.personA.name,
        year: parseInt(setupData.personA.year),
        month: parseInt(setupData.personA.month),
        day: parseInt(setupData.personA.day),
        hour: parseInt(setupData.personA.hour),
        minute: parseInt(setupData.personA.minute),
        city: setupData.personA.city,
        nation: 'US',
        lat: setupData.personA.latitude,
        lng: setupData.personA.longitude,
        tz_str: setupData.personA.timezone,
      },
      person_b: {
        name: setupData.personB.name,
        year: parseInt(setupData.personB.year),
        month: parseInt(setupData.personB.month),
        day: parseInt(setupData.personB.day),
        hour: parseInt(setupData.personB.hour),
        minute: parseInt(setupData.personB.minute),
        city: setupData.personB.city,
        nation: 'US',
        lat: setupData.personB.latitude,
        lng: setupData.personB.longitude,
        tz_str: setupData.personB.timezone,
      },
      mode: setupData.mode,
      date_range: {
        start: setupData.startDate,
        end: setupData.endDate,
        step: setupData.step || 'daily',
      },
      relationship: {
        type: setupData.relationshipType,
        tier: setupData.relationshipTier,
        contact_state: setupData.contactState,
      },
    };

    // Make API request
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();

    // Verify Person A has aspects
    expect(data.person_a).toBeDefined();
    expect(data.person_a.aspects).toBeDefined();
    expect(Array.isArray(data.person_a.aspects)).toBe(true);
    expect(data.person_a.aspects.length).toBeGreaterThan(0);
    console.log(`✅ Person A has ${data.person_a.aspects.length} natal aspects`);

    // Verify Person B has aspects (THIS IS THE FIX)
    expect(data.person_b).toBeDefined();
    expect(data.person_b.aspects).toBeDefined();
    expect(Array.isArray(data.person_b.aspects)).toBe(true);
    expect(data.person_b.aspects.length).toBeGreaterThan(0);
    console.log(`✅ Person B has ${data.person_b.aspects.length} natal aspects`);

    // Verify house cusps are present for both
    expect(data.person_a.chart.house_cusps).toBeDefined();
    expect(Array.isArray(data.person_a.chart.house_cusps)).toBe(true);
    expect(data.person_a.chart.house_cusps.length).toBe(12);
    console.log(`✅ Person A has ${data.person_a.chart.house_cusps.length} house cusps`);

    expect(data.person_b.chart.house_cusps).toBeDefined();
    expect(Array.isArray(data.person_b.chart.house_cusps)).toBe(true);
    expect(data.person_b.chart.house_cusps.length).toBe(12);
    console.log(`✅ Person B has ${data.person_b.chart.house_cusps.length} house cusps`);

    // Verify both have chart data
    expect(data.person_a.chart.sun).toBeDefined();
    expect(data.person_b.chart.sun).toBeDefined();
    console.log(`✅ Both charts have complete planet data`);

    // Log sample aspects for verification
    if (data.person_b.aspects.length > 0) {
      const sampleAspect = data.person_b.aspects[0];
      console.log(`Sample Person B aspect:`, {
        p1: sampleAspect.p1_name,
        aspect: sampleAspect.aspect,
        p2: sampleAspect.p2_name,
        orb: sampleAspect.orbit
      });
    }
  }, 90000); // 90 second timeout for API call
});
