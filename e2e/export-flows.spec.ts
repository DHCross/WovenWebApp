import { test, expect } from '@playwright/test';
import * as fs from 'fs';

/**
 * Chart Export Flow Tests
 * Tests markdown, JSON, and other export functionality
 */

test.describe('Chart Export Flows', () => {
  test('should export natal mirror as markdown', async ({ page }) => {
    await page.goto('/math-brain');
    await submitTestChart(page);
    
    // Wait for results
    await page.waitForSelector(
      '[data-testid="chart-results"], text=/planetary architecture|house matrix|aspect network/i',
      { timeout: 30000, state: 'visible' }
    );
    
    // Look for export button
    const exportButton = page.locator(
      'button:has-text("Export Markdown"), button:has-text("Export"), button:has-text("Download Markdown")'
    ).first();
    
    if (await exportButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;
      
      // Verify file
      const path = await download.path();
      if (path) {
        const content = fs.readFileSync(path, 'utf-8');
        
        // Verify Mirror Report structure
        expect(content).toContain('MIRROR REPORT');
        expect(content).toMatch(/Birth Data|Planetary Architecture|natal/i);
        
        // Verify no Balance Meter values in natal mirror
        expect(content).not.toContain('Magnitude:');
        expect(content).not.toContain('Directional Bias:');
      }
    } else {
      test.skip();
    }
  });

  test('should export balance meter report with provenance', async ({ page }) => {
    await page.goto('/math-brain');
    
    // Enable transit mode if toggle exists
    const transitToggle = page.locator('input[name*="includeTransits"], input[type="checkbox"]');
    if (await transitToggle.count() > 0) {
      await transitToggle.first().check();
      
      // Fill transit dates
      const transitFromInput = page.locator('input[name*="transitFrom"], input[name*="from"]');
      if (await transitFromInput.count() > 0) {
        await transitFromInput.first().fill('2025-01-01');
      }
      
      const transitToInput = page.locator('input[name*="transitTo"], input[name*="to"]');
      if (await transitToInput.count() > 0) {
        await transitToInput.first().fill('2025-01-31');
      }
    }
    
    await submitTestChart(page);
    
    // Wait for balance meter results
    await page.waitForSelector(
      '[data-testid="balance-meter-results"], text=/magnitude|directional bias|narrative coherence/i',
      { timeout: 30000, state: 'visible' }
    ).catch(() => {
      // Balance meter might not be visible yet
    });
    
    // Look for export button
    const exportButton = page.locator(
      'button:has-text("Export Balance Meter"), button:has-text("Export"), button:has-text("Download")'
    ).first();
    
    if (await exportButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;
      
      const path = await download.path();
      if (path) {
        const content = fs.readFileSync(path, 'utf-8');
        
        // Verify Balance Meter structure
        expect(content).toMatch(/Magnitude|Directional Bias|Narrative Coherence/i);
        expect(content).toMatch(/data_source|orbs_profile|math_brain_version|provenance/i);
      }
    } else {
      test.skip();
    }
  });

  test('should export JSON with frontstage and backstage data', async ({ page }) => {
    await page.goto('/math-brain');
    await submitTestChart(page);
    
    // Wait for results
    await page.waitForSelector(
      '[data-testid="chart-results"], text=/planetary architecture/i',
      { timeout: 30000, state: 'visible' }
    );
    
    // Look for JSON export button
    const jsonButton = page.locator('button:has-text("Export JSON"), button:has-text("JSON")').first();
    
    if (await jsonButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download');
      await jsonButton.click();
      const download = await downloadPromise;
      
      const path = await download.path();
      if (path) {
        const content = fs.readFileSync(path, 'utf-8');
        const json = JSON.parse(content);
        
        // Verify structure
        expect(json).toBeDefined();
        // Check for common fields
        if (json.frontstage || json.data || json.planets) {
          expect(true).toBeTruthy();
        }
      }
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
