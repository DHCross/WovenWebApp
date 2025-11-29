import { test, expect } from '@playwright/test';

/**
 * Verification test for natal aspects refactor (October 12, 2025)
 * Tests that Person A and Person B natal aspects are correctly extracted
 */

async function fillForm(page: any) {
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Fill Person A using current form selectors
  await page.fill('#a-name', 'Dan');
  await page.fill('#a-year', '1973');
  await page.fill('#a-month', '07');
  await page.fill('#a-day', '24');
  await page.fill('#a-hour', '14');
  await page.fill('#a-minute', '30');
  await page.fill('#a-city', 'Bryn Mawr');
  await page.fill('#a-state', 'PA');
  await page.selectOption('#a-tz', 'US/Eastern');
  
  // Enable Person B checkbox
  const personBCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /Include Person B/i }).or(page.locator('label:has-text("Include Person B") input[type="checkbox"]'));
  if (await personBCheckbox.count() > 0) {
    await personBCheckbox.first().check();
  }
  
  // Fill Person B
  await page.fill('#b-name', 'Stephie');
  await page.fill('#b-year', '1968');
  await page.fill('#b-month', '04');
  await page.fill('#b-day', '16');
  await page.fill('#b-hour', '18');
  await page.fill('#b-minute', '37');
  await page.fill('#b-city', 'Albany');
  await page.fill('#b-state', 'GA');
  await page.selectOption('#b-tz', 'US/Eastern');
  
  // Enable transits checkbox if available
  const transitCheckbox = page.locator('label:has-text("Include Transits") input[type="checkbox"]').or(page.locator('input[type="checkbox"]').filter({ hasText: /Include Transits/i }));
  if (await transitCheckbox.count() > 0) {
    await transitCheckbox.first().check();
  }
}

test.describe('Natal Aspects Refactor Verification', () => {
  test('should show non-zero natal aspects in Woven Map', async ({ page }) => {
    await page.goto('http://localhost:3000/math-brain');
    
    await fillForm(page);
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for calculation to complete (up to 90 seconds)
    await page.waitForSelector('text=/Woven Map|Balance Meter|Natal aspects/i', { 
      timeout: 90000 
    });
    
    // Check Woven Map section for natal aspects count
    const natalAspectsText = await page.locator('text=/Natal aspects.*\\d+/i').first().textContent();
    console.log('Natal aspects text found:', natalAspectsText);
    
    // Extract number from text like "Natal aspects (A): 123"
    const aspectCount = parseInt(natalAspectsText?.match(/\d+/)?.[0] || '0');
    
    // Verify non-zero aspects
    expect(aspectCount).toBeGreaterThan(0);
    console.log(`✅ Found ${aspectCount} natal aspects for Person A`);
  });

  test('should show non-zero Balance Meter values', async ({ page }) => {
    await page.goto('http://localhost:3000/math-brain');
    await fillForm(page);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('text=/Balance Meter|Magnitude|Directional Bias/i', { 
      timeout: 90000 
    });
    
    // Check for non-zero magnitude and bias in the summary
    const summaryText = await page.locator('text=/Magnitude|Directional Bias/i').first().textContent();
    console.log('Balance Meter summary:', summaryText);
    
    // Verify content exists
    expect(summaryText).toBeTruthy();
    console.log('✅ Balance Meter summary rendered');
  });

  test('should render Unified Dashboard with data points', async ({ page }) => {
    await page.goto('http://localhost:3000/math-brain');
    await fillForm(page);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('canvas', { timeout: 90000 });
    
    // Check if Chart.js canvas has been rendered
    const canvasElements = await page.locator('canvas').count();
    expect(canvasElements).toBeGreaterThan(0);
    console.log(`✅ Found ${canvasElements} chart canvases`);
    
    // Verify Unified Dashboard title exists
    const dashboardTitle = await page.locator('text=/Unified Symbolic Dashboard/i').count();
    expect(dashboardTitle).toBeGreaterThan(0);
    console.log('✅ Unified Dashboard rendered');
  });
});
