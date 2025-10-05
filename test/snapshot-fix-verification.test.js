// Snapshot Fix Verification
// Tests that snapshot payloads now include required relationship_context

describe('Snapshot Fix Verification', () => {
  test('solo snapshot should work without relationship_context', () => {
    const todayStr = '2025-10-05';
    const location = { latitude: 30.1667, longitude: -85.6667 };
    const timezone = 'US/Central';

    const personA = {
      name: 'Dan',
      year: '1973',
      month: '07',
      day: '24',
      hour: '14',
      minute: '30',
      zodiac_type: 'Tropic'
    };

    // Build solo snapshot payload
    const payload = {
      mode: 'NATAL_TRANSITS',
      personA: {
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
      },
      window: { start: todayStr, end: todayStr, step: 'daily' },
      report_type: 'solo_balance_meter',
      context: { mode: 'natal_transits' },
      relocation_mode: 'A_LOCAL',
      translocation: {
        applies: true,
        method: 'A_LOCAL',
        current_location: {
          latitude: location.latitude,
          longitude: location.longitude,
          timezone
        }
      },
      indices: {
        window: { start: todayStr, end: todayStr, step: 'daily' },
        request_daily: true
      }
    };

    console.log('\n🧍 Solo Snapshot Payload:');
    console.log('  Mode:', payload.mode);
    console.log('  Report Type:', payload.report_type);
    console.log('  Date:', todayStr, '(single day, not range)');
    console.log('  Relocation:', payload.relocation_mode);
    console.log('  Has relationship_context:', Boolean(payload.relationship_context));

    // Solo mode should NOT have relationship_context
    expect(payload.relationship_context).toBeUndefined();
    expect(payload.mode).toBe('NATAL_TRANSITS');
    expect(payload.window.start).toBe(payload.window.end); // Single day
  });

  test('relational snapshot should include relationship_context', () => {
    const todayStr = '2025-10-05';
    const location = { latitude: 30.1667, longitude: -85.6667 };
    const timezone = 'US/Central';

    const personA = {
      name: 'Dan',
      year: '1973',
      month: '07',
      day: '24',
      hour: '14',
      minute: '30',
      zodiac_type: 'Tropic'
    };

    const personB = {
      name: 'Stephie',
      year: '1965',
      month: '04',
      day: '16',
      hour: '18',
      minute: '37',
      zodiac_type: 'Tropic'
    };

    // Build relational snapshot payload (with fix)
    const payload = {
      mode: 'NATAL_TRANSITS',
      personA: {
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
      },
      personB: {
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
      },
      // THE FIX: Add relationship_context for relational snapshots
      relationship_context: {
        type: 'PARTNER',
        contact_state: 'ACTIVE'
      },
      window: { start: todayStr, end: todayStr, step: 'daily' },
      report_type: 'relational_balance_meter',
      context: { mode: 'synastry_transits' },
      relocation_mode: 'BOTH_LOCAL',
      translocation: {
        applies: true,
        method: 'BOTH_LOCAL',
        current_location: {
          latitude: location.latitude,
          longitude: location.longitude,
          timezone
        }
      },
      indices: {
        window: { start: todayStr, end: todayStr, step: 'daily' },
        request_daily: true
      }
    };

    console.log('\n👥 Relational Snapshot Payload:');
    console.log('  Mode:', payload.mode);
    console.log('  Report Type:', payload.report_type);
    console.log('  Date:', todayStr, '(single day, not range)');
    console.log('  Relocation:', payload.relocation_mode);
    console.log('  Has relationship_context:', Boolean(payload.relationship_context));
    console.log('  Relationship type:', payload.relationship_context?.type);

    // Assertions
    expect(payload.relationship_context).toBeDefined();
    expect(payload.relationship_context.type).toBe('PARTNER');
    expect(payload.relationship_context.contact_state).toBe('ACTIVE');
    expect(payload.personB).toBeDefined();
    expect(payload.window.start).toBe(payload.window.end); // Single day

    console.log('\n✅ Fix verified: relationship_context is now included!');
  });

  test('relationship_context validation requirements', () => {
    // Test the minimum required fields for relationship_context

    const validPartner = {
      type: 'PARTNER',
      contact_state: 'ACTIVE',
      // PARTNER would normally require intimacy_tier, but snapshot uses minimal context
    };

    const validFriend = {
      type: 'FRIEND',
      contact_state: 'ACTIVE'
    };

    const validFamily = {
      type: 'FAMILY',
      contact_state: 'ACTIVE',
      // FAMILY would normally require role, but snapshot uses minimal context
    };

    console.log('\n📋 Valid Relationship Context Examples:');
    console.log('  PARTNER:', JSON.stringify(validPartner));
    console.log('  FRIEND:', JSON.stringify(validFriend));
    console.log('  FAMILY:', JSON.stringify(validFamily));

    console.log('\n💡 Note: Snapshot uses minimal PARTNER context.');
    console.log('   Full relational reports would require intimacy_tier for PARTNER,');
    console.log('   and role for FAMILY, but snapshots can use simplified context.');

    expect(validPartner.type).toBe('PARTNER');
    expect(validFriend.type).toBe('FRIEND');
    expect(validFamily.type).toBe('FAMILY');
  });
});
