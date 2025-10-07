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
    
    // Check required form fields exist
    await expect(page.locator('input[name*="name"], input[id*="name"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name*="date"], input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[name*="time"], input[type="time"]').first()).toBeVisible();
    await expect(page.locator('input[name*="city"]').first()).toBeVisible();
  });

  test('should submit solo natal chart request', async ({ page }) => {
    await page.goto('/math-brain');
    
    // Fill in test data
    await page.locator('input[name*="name"], input[id*="name"]').first().fill('Test Subject');
    await page.locator('input[type="date"]').first().fill('1973-07-24');
    await page.locator('input[type="time"]').first().fill('14:30');
    await page.locator('input[name*="city"]').first().fill('Bryn Mawr');
    
    // Try to find state/country fields if they exist
    const stateInput = page.locator('input[name*="state"]');
    if (await stateInput.count() > 0) {
      await stateInput.first().fill('PA');
    }
    
    const countrySelect = page.locator('select[name*="country"]');
    if (await countrySelect.count() > 0) {
      await countrySelect.first().selectOption('US');
    }
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for results or loading state (30 second timeout for API calls)
    await expect(
      page.locator('[data-testid="loading-indicator"]')
        .or(page.locator('[data-testid="chart-results"]'))
        .or(page.locator('text=/computing|loading|processing/i'))
    ).toBeVisible({ timeout: 30000 });
  });

  test('should handle relational chart input if mode exists', async ({ page }) => {
    await page.goto('/math-brain');
    
    // Check if relational mode toggle exists
    const relationalToggle = page.locator('input[name*="chartMode"][value*="relational"], button:has-text("Relational")');
    
    if (await relationalToggle.count() > 0) {
      await relationalToggle.first().click();
      
      // Fill Person A
      await page.locator('input[name*="nameA"]').first().fill('Person A');
      await page.locator('input[name*="dateA"], input[name*="birthDateA"]').first().fill('1973-07-24');
      await page.locator('input[name*="timeA"], input[name*="birthTimeA"]').first().fill('14:30');
      await page.locator('input[name*="cityA"], input[name*="birthCityA"]').first().fill('Bryn Mawr');
      
      // Fill Person B
      await page.locator('input[name*="nameB"]').first().fill('Person B');
      await page.locator('input[name*="dateB"], input[name*="birthDateB"]').first().fill('1965-04-18');
      await page.locator('input[name*="timeB"], input[name*="birthTimeB"]').first().fill('18:37');
      await page.locator('input[name*="cityB"], input[name*="birthCityB"]').first().fill('Albany');
      
      await page.locator('button[type="submit"]').click();
      
      // Verify relational context appears
      await expect(
        page.locator('text=/relational|parallel|relationship|synastry/i')
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
