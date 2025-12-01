import { test, expect, APIResponse } from '@playwright/test';

const canonicalPersonA = {
  name: 'Test Subject',
  year: 1988,
  month: 12,
  day: 4,
  hour: 10,
  minute: 15,
  city: 'Boston',
  state: 'MA',
  nation: 'US',
  timezone: 'US/Eastern',
};

test.describe('Math Brain contract enforcement', () => {
  async function expectBadRequest(response: APIResponse, scenario: string) {
    const status = response.status();
    expect(status, `Expected 400 for ${scenario}, received ${status}`).toBe(400);
    const payload = await response.json().catch(() => ({ success: false }));
    expect(payload.success === false || payload.error).toBeTruthy();
  }

  test('rejects malformed inputs and enforces provenance contract', async ({ request }) => {
    const invalidRequests = [
      {
        label: 'missing body',
        data: null,
      },
      {
        label: 'out-of-range transit window',
        data: {
          personA: canonicalPersonA,
          window: {
            start: '2025-01-01',
            end: '2025-03-15',
          },
        },
      },
      {
        label: 'missing provenance stamp requirements',
        data: {
          personA: canonicalPersonA,
          report_type: 'solar_return',
          solar_return_year: 'not-a-number',
          orbs_profile: undefined,
          aspect_weights_version: undefined,
        },
      },
    ];

    for (const scenario of invalidRequests) {
      const response = await request.post('/api/astrology-mathbrain', {
        data: scenario.data as any,
      });
      await expectBadRequest(response, scenario.label);
    }
  });
});
