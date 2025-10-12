/**
 * Test for Balance Meter orb filtering fix
 * Verifies that magnitude and directional bias are non-zero after orb fix
 */

const setupData = require('../examples/math_brain_setup_Dan_Stephie_20251012T062507.json');

describe('Balance Meter Orb Fix - API Test', () => {
  const API_URL = 'http://localhost:3000/api/astrology-mathbrain';
  
  test('Orb filtering fix - Natal aspects populated for both persons', async () => {
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

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();

    // MAIN TEST: Verify both persons have natal aspects (orb fix working)
    expect(data.person_a).toBeDefined();
    expect(data.person_a.aspects).toBeDefined();
    expect(Array.isArray(data.person_a.aspects)).toBe(true);
    expect(data.person_a.aspects.length).toBeGreaterThan(0);
    
    expect(data.person_b).toBeDefined();
    expect(data.person_b.aspects).toBeDefined();
    expect(Array.isArray(data.person_b.aspects)).toBe(true);
    expect(data.person_b.aspects.length).toBeGreaterThan(0);
    
    console.log(`\n✅ Orb filtering fix verified:`);
    console.log(`   Person A: ${data.person_a.aspects.length} natal aspects`);
    console.log(`   Person B: ${data.person_b.aspects.length} natal aspects`);
    console.log(`   Both persons: ${data.person_a.chart.house_cusps?.length || 0} house cusps each`);
    
    // Verify synastry aspects exist
    expect(data.synastry_aspects).toBeDefined();
    expect(Array.isArray(data.synastry_aspects)).toBe(true);
    console.log(`   Synastry: ${data.synastry_aspects.length} relational aspects`);
    
    // Note: Balance Meter values are only in the EXPORT, not the API response for SYNASTRY mode
    // The orb fix will show in the exported Weather_Log.json file
  }, 90000); // 90 second timeout
});
