import { test, expect } from '@playwright/test';

/**
 * Math Brain Entry Point Tests
 * Tests the core functionality of the /math-brain page
 */

test.describe('Math Brain Entry Point', () => {
  test('should load /math-brain page', async ({ page }) => {
    await page.goto('/math-brain');
    await expect(page).toHaveTitle(/Math Brain|WovenWebApp|Woven/i);
  });

  test('should display birth data form fields', async ({ page }) => {
    await page.goto('/math-brain');
    
    // Check required form fields exist with current selectors
    await expect(page.locator('#a-name')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#a-year')).toBeVisible();
    await expect(page.locator('#a-month')).toBeVisible();
    await expect(page.locator('#a-day')).toBeVisible();
    await expect(page.locator('#a-hour')).toBeVisible();
    await expect(page.locator('#a-minute')).toBeVisible();
    await expect(page.locator('#a-city')).toBeVisible();
  });

  test('should submit solo natal chart request', async ({ page }) => {
    await page.goto('/math-brain');
    
    // Fill in test data using current form selectors
    await page.fill('#a-name', 'Test Subject');
    await page.fill('#a-year', '1973');
    await page.fill('#a-month', '07');
    await page.fill('#a-day', '24');
    await page.fill('#a-hour', '14');
    await page.fill('#a-minute', '30');
    await page.fill('#a-city', 'Bryn Mawr');
    await page.fill('#a-state', 'PA');
    await page.selectOption('#a-tz', 'US/Eastern');
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for results or loading state (30 second timeout for API calls)
    await expect(
      page.locator('[data-testid="loading-indicator"]')
        .or(page.locator('[data-testid="chart-results"]'))
        .or(page.locator('text=/computing|loading|processing|mapping geometry/i'))
    ).toBeVisible({ timeout: 30000 });
  });

  test('should handle relational chart input if mode exists', async ({ page }) => {
    await page.goto('/math-brain');
    
    // Check if Person B toggle exists
    const personBCheckbox = page.locator('label:has-text("Include Person B") input[type="checkbox"]');
    
    if (await personBCheckbox.count() > 0) {
      await personBCheckbox.first().check();
      
      // Fill Person A
      await page.fill('#a-name', 'Person A');
      await page.fill('#a-year', '1973');
      await page.fill('#a-month', '07');
      await page.fill('#a-day', '24');
      await page.fill('#a-hour', '14');
      await page.fill('#a-minute', '30');
      await page.fill('#a-city', 'Bryn Mawr');
      await page.fill('#a-state', 'PA');
      await page.selectOption('#a-tz', 'US/Eastern');
      
      // Fill Person B
      await page.fill('#b-name', 'Person B');
      await page.fill('#b-year', '1965');
      await page.fill('#b-month', '04');
      await page.fill('#b-day', '18');
      await page.fill('#b-hour', '18');
      await page.fill('#b-minute', '37');
      await page.fill('#b-city', 'Albany');
      await page.fill('#b-state', 'GA');
      await page.selectOption('#b-tz', 'US/Eastern');
      
      await page.locator('button[type="submit"]').click();
      
      // Verify report generation starts
      await expect(
        page.locator('text=/mapping geometry|loading|processing/i')
          .or(page.locator('[data-testid="chart-results"]'))
      ).toBeVisible({ timeout: 30000 });
    } else {
      test.skip();
    }
  });

  test('should export chart data as markdown', async ({ page }) => {
    await page.goto('/math-brain');
    
    // Submit chart
    await submitTestChart(page);
    
    // Wait for results
    await page.waitForSelector('[data-testid="chart-results"], text=/planetary architecture|house matrix|aspect network/i', { 
      timeout: 30000,
      state: 'visible'
    });
    
    // Trigger markdown export
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Markdown"), button:has-text("Download")').first();
    
    if (await exportButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;
      
      // Verify filename
      expect(download.suggestedFilename()).toMatch(/\.md$/i);
    } else {
      test.skip();
    }
  });
});

// Helper function
async function submitTestChart(page) {
  await page.fill('#a-name', 'Test Subject');
  await page.fill('#a-year', '1973');
  await page.fill('#a-month', '07');
  await page.fill('#a-day', '24');
  await page.fill('#a-hour', '14');
  await page.fill('#a-minute', '30');
  await page.fill('#a-city', 'Bryn Mawr');
  await page.fill('#a-state', 'PA');
  await page.selectOption('#a-tz', 'US/Eastern');
  
  await page.locator('button[type="submit"]').click();
}
