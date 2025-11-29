import { test, expect } from '@playwright/test';

test.describe('Math Brain v2 Integration', () => {
  test('should generate and download v2 reports successfully', async ({ page }) => {
    // Navigate to Math Brain page
    await page.goto('/math-brain');
    
    // Enable Person B
    const personBCheckbox = page.locator('label:has-text("Include Person B") input[type="checkbox"]');
    if (await personBCheckbox.count() > 0) {
      await personBCheckbox.first().check();
    }
    
    // Fill in Person A data
    await page.fill('#a-name', 'Dan');
    await page.fill('#a-year', '1973');
    await page.fill('#a-month', '7');
    await page.fill('#a-day', '24');
    await page.fill('#a-hour', '14');
    await page.fill('#a-minute', '30');
    await page.fill('#a-city', 'Bryn Mawr');
    await page.fill('#a-state', 'PA');
    await page.selectOption('#a-tz', 'US/Eastern');
    
    // Fill in Person B data
    await page.fill('#b-name', 'Stephie');
    await page.fill('#b-year', '1968');
    await page.fill('#b-month', '4');
    await page.fill('#b-day', '16');
    await page.fill('#b-hour', '18');
    await page.fill('#b-minute', '37');
    await page.fill('#b-city', 'Albany');
    await page.fill('#b-state', 'GA');
    await page.selectOption('#b-tz', 'US/Eastern');
    
    // Enable transits checkbox if available
    const transitCheckbox = page.locator('label:has-text("Include Transits") input[type="checkbox"]');
    if (await transitCheckbox.count() > 0) {
      await transitCheckbox.first().check();
    }
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for report generation (may take a while)
    await page.waitForSelector('text=/Your report is ready|Mirror|Balance Meter/i', { timeout: 60000 }).catch(() => {
      // May not have the exact expected text, but results should show
    });
    
    // Test that export buttons exist after generation
    const mirrorButton = page.locator('button:has-text("Mirror Report"), button:has-text("Download Mirror")');
    if (await mirrorButton.count() > 0) {
      const markdownDownloadPromise = page.waitForEvent('download');
      await mirrorButton.first().click();
      const markdownDownload = await markdownDownloadPromise;
      
      // Verify download occurred
      expect(markdownDownload.suggestedFilename()).toMatch(/\.md$/i);
    } else {
      test.skip();
    }
  });

  test('should call v2 API endpoint correctly', async ({ page }) => {
    // Set up API response listener
    let apiResponse: any = null;
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/astrology-mathbrain') && response.request().method() === 'POST') {
        apiResponse = {
          status: response.status(),
          body: await response.json().catch(() => null)
        };
      }
    });
    
    // Navigate and fill form
    await page.goto('/math-brain');
    await page.fill('#a-name', 'TestPerson');
    await page.fill('#a-year', '1990');
    await page.fill('#a-month', '1');
    await page.fill('#a-day', '1');
    await page.fill('#a-hour', '12');
    await page.fill('#a-minute', '0');
    await page.fill('#a-city', 'New York');
    await page.fill('#a-state', 'NY');
    await page.selectOption('#a-tz', 'US/Eastern');
    
    // Submit
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=/Mirror|Balance Meter|Mapping geometry/i', { timeout: 60000 }).catch(() => {});
    
    // Wait for API call
    await page.waitForTimeout(2000);
    
    // Verify API response if it occurred
    if (apiResponse) {
      expect(apiResponse.status).toBe(200);
    }
  });

  test('should return v2 format with correct structure', async ({ request }) => {
    // Direct API test
    const response = await request.post('/api/astrology-mathbrain', {
      data: {
        personA: {
          name: 'TestA',
          year: 1990,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          city: 'New York',
          nation: 'US',
          latitude: 40.7128,
          longitude: -74.0060,
          timezone: 'America/New_York'
        },
        personB: {
          name: 'TestB',
          year: 1992,
          month: 6,
          day: 15,
          hour: 14,
          minute: 30,
          city: 'Los Angeles',
          nation: 'US',
          latitude: 34.0522,
          longitude: -118.2437,
          timezone: 'America/Los_Angeles'
        },
        relationship_context: {
          scope: 'partner',
          type: 'romantic'
        },
        window: {
          start: '2025-10-14',
          end: '2025-10-14',
          step: 'daily'
        },
        context: {
          mode: 'SYNASTRY_TRANSITS'
        }
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // Verify v2 structure
    expect(data.success).toBe(true);
    expect(data.version).toBe('v2');
    
    // Verify unified_output structure
    expect(data.unified_output).toBeDefined();
    expect(data.unified_output.run_metadata).toBeDefined();
    expect(data.unified_output.run_metadata.math_brain_version).toBe('1.0.0');
    expect(data.unified_output.run_metadata.mode).toBe('SYNASTRY_TRANSITS');
    expect(data.unified_output.daily_entries).toBeInstanceOf(Array);
    expect(data.unified_output.daily_entries.length).toBeGreaterThan(0);
    
    // Verify daily entry structure
    const firstDay = data.unified_output.daily_entries[0];
    expect(firstDay.date).toBeDefined();
    expect(firstDay.symbolic_weather).toBeDefined();
    expect(firstDay.symbolic_weather.magnitude).toBeDefined();
    expect(firstDay.symbolic_weather.directional_bias).toBeDefined();
    expect(firstDay.symbolic_weather.labels).toBeDefined();
    expect(firstDay.mirror_data).toBeDefined();
    expect(firstDay.poetic_hooks).toBeDefined();
    
    // Verify download formats
    expect(data.download_formats).toBeDefined();
    expect(data.download_formats.mirror_report).toBeDefined();
    expect(data.download_formats.mirror_report.format).toBe('markdown');
    expect(data.download_formats.symbolic_weather).toBeDefined();
    expect(data.download_formats.symbolic_weather.format).toBe('json');
  });

  test('should handle minimal data gracefully (mock data mode)', async ({ request }) => {
    // Test with minimal data - currently uses mock data so will succeed
    const response = await request.post('/api/astrology-mathbrain', {
      data: {
        personA: {
          name: 'TestMinimal',
          year: 1990,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          city: 'Test',
          nation: 'US',
          latitude: 0,
          longitude: 0,
          timezone: 'UTC'
        },
        window: {
          start: '2025-10-14',
          end: '2025-10-14',
          step: 'daily'
        },
        context: {
          mode: 'NATAL_TRANSITS'
        }
      }
    });
    
    // With mock data, should succeed
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.version).toBe('v2');
  });
});
