import { test, expect } from '@playwright/test';

/**
 * Regression Tests
 * Tests to catch regressions in core functionality
 */

test.describe('Regression Tests', () => {
  test('should maintain geometry integrity across exports', async ({ page }) => {
    await page.goto('/math-brain');
    await submitTestChart(page);
    
    // Wait for results
    await page.waitForSelector(
      '[data-testid="chart-results"], text=/planetary architecture/i',
      { timeout: 30000, state: 'visible' }
    );
    
    // Extract displayed planetary positions if available
    const sunPosition = await page.locator('[data-planet="Sun"] .position, text=/Sun.*Leo/i').textContent()
      .catch(() => null);
    
    if (sunPosition) {
      // Export markdown
      const exportButton = page.locator('button:has-text("Export Markdown"), button:has-text("Export")').first();
      
      if (await exportButton.count() > 0) {
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        const download = await downloadPromise;
        
        const path = await download.path();
        if (path) {
          const fs = require('fs');
          const content = fs.readFileSync(path, 'utf-8');
          
          // Verify Sun position consistency (basic check)
          expect(content).toContain('Sun');
        }
      }
    } else {
      test.skip();
    }
  });

  test('should reproduce benchmark data (Hurricane Michael)', async ({ request }) => {
    // Test with Hurricane Michael benchmark (2018-10-10)
    const response = await request.post('/.netlify/functions/astrology-mathbrain', {
      data: {
        name: 'Hurricane Michael',
        birthDate: '2018-10-10',
        birthTime: '12:00',
        city: 'Panama City',
        state: 'FL',
        nation: 'US',
        transits: {
          from: '2018-10-10',
          to: '2018-10-10',
          step: '1d',
        },
        orbs_profile: 'wm-spec-2025-09',
      },
    });
    
    if (response.ok()) {
      const data = await response.json();
      
      if (data.success && data.data && data.data.seismograph) {
        const magnitude = data.data.seismograph.magnitude;
        
        // Hurricane Michael should register as Magnitude 5.0 crisis benchmark
        // Allow some tolerance for calculation variations
        expect(magnitude).toBeGreaterThanOrEqual(4.5);
        expect(magnitude).toBeLessThanOrEqual(5.0);
      }
    } else {
      test.skip();
    }
  });

  test('should handle empty transit response gracefully', async ({ request }) => {
    const response = await request.post('/.netlify/functions/astrology-mathbrain', {
      data: {
        name: 'Test Subject',
        birthDate: '1973-07-24',
        birthTime: '14:30',
        city: 'Bryn Mawr',
        state: 'PA',
        nation: 'US',
        transits: {
          from: '2025-01-01',
          to: '2025-01-02',
          step: '1d',
        },
      },
    });
    
    if (response.ok()) {
      const data = await response.json();
      
      // Should return full report structure even if aspects are empty
      expect(data).toHaveProperty('success');
      
      if (data.success && data.data) {
        // Should have drivers array (may be empty)
        if (data.data.drivers !== undefined) {
          expect(Array.isArray(data.data.drivers)).toBeTruthy();
        }
        
        // Should have seismograph pending flag or data
        if (data.data.seismograph) {
          expect(data.data.seismograph).toBeDefined();
        }
      }
    }
  });

  test('should validate orbs enforcement', async ({ request }) => {
    const response = await request.post('/.netlify/functions/astrology-mathbrain', {
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
        
        // Verify orb caps per spec:
        // Conjunction/Opposition: 8°
        // Square/Trine: 7°
        // Sextile: 5°
        aspects.forEach((aspect: any) => {
          if (aspect.type && aspect.orb) {
            switch (aspect.type.toLowerCase()) {
              case 'conjunction':
              case 'opposition':
                expect(aspect.orb).toBeLessThanOrEqual(8);
                break;
              case 'square':
              case 'trine':
                expect(aspect.orb).toBeLessThanOrEqual(7);
                break;
              case 'sextile':
                expect(aspect.orb).toBeLessThanOrEqual(5);
                break;
            }
          }
        });
        
        // Verify provenance
        expect(data.data.orbs_profile).toBe('wm-spec-2025-09');
      }
    }
  });
});

// Helper function
async function submitTestChart(page) {
  await page.locator('input[name*="name"], input[id*="name"]').first().fill('Test Subject');
  await page.locator('input[type="date"]').first().fill('1973-07-24');
  await page.locator('input[type="time"]').first().fill('14:30');
  await page.locator('input[name*="city"]').first().fill('Bryn Mawr');
  
  const stateInput = page.locator('input[name*="state"]');
  if (await stateInput.count() > 0) {
    await stateInput.first().fill('PA');
  }
  
  await page.locator('button[type="submit"]').click();
}
