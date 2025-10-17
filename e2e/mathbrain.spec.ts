import { test, expect } from '@playwright/test';

test('Math Brain API transit request', async ({ request }) => {
  const payload = {
    mode: 'SYNASTRY_TRANSITS',
    personA: {
      name: 'Dan',
      year: 1973,
      month: 7,
      day: 24,
      hour: 14,
      minute: 30,
      latitude: 40.0167,
      longitude: -75.3,
      timezone: 'America/New_York',
      city: 'Bryn Mawr',
      nation: 'US',
      zodiac_type: 'Tropic'
    },
    time_policy: 'user_provided',
    report_type: 'relational_balance_meter',
    presentation_style: 'conversational',
    context: { mode: 'synastry_transits' },
    wheel_only: false,
    wheel_format: 'png',
    theme: 'classic',
    window: { start: '2025-10-17', end: '2025-10-25', step: 'daily' },
    transits: { from: '2025-10-17', to: '2025-10-25', step: 'daily' },
    transitStartDate: '2025-10-17',
    transitEndDate: '2025-10-25',
    transitStep: 'daily',
    translocation: {
      applies: true,
      method: 'Both_local',
      coords: { latitude: 30.166666666666668, longitude: -85.66666666666667 },
      label: 'Panama City, FL',
      timezone: 'US/Central',
    },
    personB: {
      name: 'Partner',
      year: 1980,
      month: 5,
      day: 15,
      hour: 10,
      minute: 0,
      latitude: 34.0522,
      longitude: -118.2437,
      timezone: 'America/Los_Angeles',
      city: 'Los Angeles',
      nation: 'US',
      zodiac_type: 'Tropic'
    },
    relationship_context: {
      type: 'PARTNER',
      intimacy_tier: 'P2',
      contact_state: 'ACTIVE',
      ex_estranged: false,
    },
  };

  const response = await request.post('https://ravencalder.com/api/astrology-mathbrain', {
    headers: { 'Content-Type': 'application/json' },
    data: payload,
  });

  console.log('Status:', response.status());
  console.log('Body:', await response.text());
  expect(response.ok()).toBeTruthy();
});