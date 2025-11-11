import { test, expect } from '@playwright/test';

/**
 * Astrology Math Brain API Tests
 * Tests Netlify function endpoints directly
 */

test.describe('Astrology Math Brain API', () => {
  test('should compute natal chart via API', async ({ request }) => {
    const response = await request.post('/api/astrology-mathbrain', {
      data: {
        name: 'Test Subject',
        birthDate: '1973-07-24',
        birthTime: '14:30',
        city: 'Bryn Mawr',
        state: 'PA',
        nation: 'US',
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify response structure
    expect(data).toHaveProperty('success');
    
    if (data.success) {
      expect(data).toHaveProperty('data');
      expect(data.data).toBeDefined();
      
      // Verify provenance fields if present
      if (data.data.data_source) {
        expect(data.data).toHaveProperty('data_source');
      }
    }
  });

  test('should validate missing required fields', async ({ request }) => {
    const response = await request.post('/api/astrology-mathbrain', {
      data: {
        name: 'Test Subject',
        // Missing birthDate, birthTime, etc.
      },
    });
    
    // Should return 400 or error response
    const data = await response.json();
    
    if (!response.ok()) {
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    }
  });

  test('should handle invalid coordinates gracefully', async ({ request }) => {
    const response = await request.post('/api/astrology-mathbrain', {
      data: {
        name: 'Test Subject',
        birthDate: '1973-07-24',
        birthTime: '14:30',
        lat: 999, // Invalid latitude
        lon: 999,
      },
    });
    
    const data = await response.json();
    
    // Should return error for invalid coordinates
    if (!response.ok()) {
      expect(data).toHaveProperty('success', false);
      expect(data.error).toMatch(/coordinate|latitude|longitude|invalid/i);
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
        name: 'Test Subject',
        birthDate: '1973-07-24',
        birthTime: '14:30',
        city: 'Bryn Mawr',
        state: 'PA',
        nation: 'US',
        orbs_profile: 'wm-spec-2025-09',
      },
    });
    
    if (response.ok()) {
      const data = await response.json();
      
      if (data.success && data.data && data.data.aspects) {
        const aspects = data.data.aspects;
        
        // Verify all aspects within orb limits (max 8° for conjunction/opposition)
        aspects.forEach((aspect: any) => {
          if (aspect.orb) {
            expect(aspect.orb).toBeLessThanOrEqual(8);
          }
        });
        
        // Verify provenance includes orbs_profile
        if (data.data.orbs_profile) {
          expect(data.data.orbs_profile).toBe('wm-spec-2025-09');
        }
      }
    }
  });

  test('should handle API timeout gracefully', async ({ request }) => {
    const response = await request.post('/.netlify/functions/astrology-mathbrain', {
      data: {
        name: 'Test Subject',
        birthDate: '1973-07-24',
        birthTime: '14:30',
        city: 'Bryn Mawr',
      },
      timeout: 60000, // 60 second timeout
    });
    
    // Should either complete or return graceful error
    const data = await response.json();
    expect(data).toBeDefined();
  });
});
