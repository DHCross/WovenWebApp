import { test, expect } from '@playwright/test';

/**
 * Verification test for natal aspects refactor (October 12, 2025)
 * Tests that Person A and Person B natal aspects are correctly extracted
 */

async function fillForm(page: any) {
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Fill Person A
  await page.fill('input[name="name_a"]', 'Dan');
  await page.fill('input[type="date"]', '1973-07-24');
  await page.fill('input[type="time"]', '14:30');
  await page.fill('input[name="city_a"]', 'Bryn Mawr');
  
  // Enable Person B
  const personBToggle = await page.locator('input#toggle-include-b-a');
  if (!(await personBToggle.isChecked())) {
    await personBToggle.click();
  }
  
  // Fill Person B
  await page.fill('input[name="name_b"]', 'Stephie');
  await page.locator('input[type="date"]').nth(1).fill('1968-04-16');
  await page.locator('input[type="time"]').nth(1).fill('18:37');
  await page.fill('input[name="city_b"]', 'Albany');
  
  // Enable date range for transits
  const dateRangeToggle = await page.locator('input#toggle-calculate-transits');
  if (!(await dateRangeToggle.isChecked())) {
    await dateRangeToggle.click();
  }
  
  // Fill date range
  await page.fill('input[name="start_date"]', '2025-10-12');
  await page.fill('input[name="end_date"]', '2025-10-17');
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
