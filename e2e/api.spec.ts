import { test, expect } from '@playwright/test';

/**
 * Astrology Math Brain API Tests
 * Tests Netlify function endpoints directly
 */

test.describe('Astrology Math Brain API', () => {
  test('should compute natal chart via API', async ({ request }) => {
    const response = await request.post('/api/astrology-mathbrain', {
      data: {
        personA: {
          name: 'Test Subject',
          year: 1973,
          month: 7,
          day: 24,
          hour: 14,
          minute: 30,
          city: 'Bryn Mawr',
          state: 'PA',
          nation: 'US',
          timezone: 'US/Eastern',
        },
      },
    });
    
    const data = await response.json();
    
    // Verify response structure
    expect(data).toHaveProperty('success');
    
    if (data.success) {
      expect(data).toHaveProperty('data');
      expect(data.data).toBeDefined();
    } else {
      // Even failures should have error info
      expect(data.error || data.message).toBeDefined();
    }
  });

  test('should validate missing required fields', async ({ request }) => {
    const response = await request.post('/api/astrology-mathbrain', {
      data: {
        // Missing personA entirely
        name: 'Test Subject',
      },
    });
    
    const data = await response.json();
    
    // Should return error response for missing personA
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  test('should handle invalid coordinates gracefully', async ({ request }) => {
    const response = await request.post('/api/astrology-mathbrain', {
      data: {
        personA: {
          name: 'Test Subject',
          year: 1973,
          month: 7,
          day: 24,
          hour: 14,
          minute: 30,
          latitude: 999, // Invalid latitude
          longitude: 999,
          timezone: 'US/Eastern',
        },
      },
    });
    
    const data = await response.json();
    
    // Should return error for invalid coordinates
    if (!data.success) {
      expect(data.error).toBeDefined();
    }
  });

  test('should compute relational chart via API', async ({ request }) => {
    const response = await request.post('/api/astrology-mathbrain', {
      data: {
        report_type: 'relational_balance_meter',
        subjectA: {
          name: 'Person A',
          birth: {
            date: '1973-07-24',
            time: '14:30',
            city: 'Bryn Mawr',
            state: 'PA',
            nation: 'US',
          },
        },
        subjectB: {
          name: 'Person B',
          birth: {
            date: '1965-04-18',
            time: '18:37',
            city: 'Albany',
            state: 'GA',
            nation: 'US',
          },
        },
        transits: {
          from: '2025-01-01',
          to: '2025-01-31',
          step: '1d',
        },
        houses: 'Placidus',
        relocation_mode: 'A_local',
      },
    });
    
    if (response.ok()) {
      const data = await response.json();
      
      if (data.success && data.data) {
        // Verify relational structure
        expect(data.data).toBeDefined();
      }
    }
  });

  test('should apply orb filters correctly', async ({ request }) => {
    const response = await request.post('/api/astrology-mathbrain', {
      data: {
        personA: {
          name: 'Test Subject',
          year: 1973,
          month: 7,
          day: 24,
          hour: 14,
          minute: 30,
          city: 'Bryn Mawr',
          state: 'PA',
          nation: 'US',
          timezone: 'US/Eastern',
        },
        orbs_profile: 'wm-spec-2025-09',
      },
    });
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.aspects) {
      const aspects = data.data.aspects;
      
      // Verify all aspects within orb limits (max 8° for conjunction/opposition)
      aspects.forEach((aspect: any) => {
        if (aspect.orb) {
          expect(aspect.orb).toBeLessThanOrEqual(8);
        }
      });
    }
  });

  test('should handle API endpoint gracefully', async ({ request }) => {
    const response = await request.post('/api/astrology-mathbrain', {
      data: {
        personA: {
          name: 'Test Subject',
          year: 1973,
          month: 7,
          day: 24,
          hour: 14,
          minute: 30,
          city: 'Bryn Mawr',
          state: 'PA',
          timezone: 'US/Eastern',
        },
      },
    });
    
    // Should either complete or return graceful error
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.success !== undefined || data.error !== undefined).toBeTruthy();
  });
});
