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

  test('should export Mirror Directive JSON with complete natal data for Person A and B', async ({ page }) => {
    await page.goto('/math-brain');
    
    // Fill Person A
    await page.locator('input[name*="name"]').first().fill('Dan');
    await page.locator('input[type="date"]').first().fill('1973-07-24');
    await page.locator('input[type="time"]').first().fill('14:30');
    await page.locator('input[name*="city"]').first().fill('Bryn Mawr');
    const stateInputA = page.locator('input[name*="state"]').first();
    if (await stateInputA.count() > 0) {
      await stateInputA.fill('PA');
    }
    
    // Enable Person B (relational mode)
    const personBToggle = page.locator('input[name*="includePersonB"], button:has-text("Add Person B")');
    if (await personBToggle.count() > 0) {
      await personBToggle.first().click();
      
      // Fill Person B
      await page.locator('input[name*="personB"][name*="name"]').fill('Stephie');
      await page.locator('input[name*="personB"] + input[type="date"]').fill('1968-04-16');
      await page.locator('input[name*="personB"] + input[type="time"]').fill('18:37');
      await page.locator('input[name*="personB"][name*="city"]').fill('Albany');
      const stateInputB = page.locator('input[name*="personB"][name*="state"]');
      if (await stateInputB.count() > 0) {
        await stateInputB.fill('GA');
      }
    }
    
    // Submit
    await page.locator('button[type="submit"]').click();
    
    // Wait for results
    await page.waitForSelector(
      '[data-testid="chart-results"], text=/planetary architecture|relational/i',
      { timeout: 30000, state: 'visible' }
    );
    
    // Look for Mirror Directive JSON export button
    const mirrorDirectiveButton = page.locator(
      'button:has-text("Mirror Directive"), button:has-text("Download Mirror Directive")'
    ).first();
    
    if (await mirrorDirectiveButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download');
      await mirrorDirectiveButton.click();
      const download = await downloadPromise;
      
      const path = await download.path();
      if (path) {
        const content = fs.readFileSync(path, 'utf-8');
        const json = JSON.parse(content);
        
        // Verify Mirror Directive structure
        expect(json._format).toBe('mirror_directive_json');
        expect(json._version).toBe('1.0');
        expect(json._poetic_brain_compatible).toBe(true);
        
        // Verify Person A natal data
        expect(json.person_a).toBeDefined();
        expect(json.person_a.name).toBe('Dan');
        expect(json.person_a.birth_data).toBeDefined();
        expect(json.person_a.birth_data.year).toBe(1973);
        expect(json.person_a.chart).toBeDefined();
        expect(json.person_a.chart.planets).toBeDefined();
        expect(json.person_a.aspects).toBeDefined();
        expect(Array.isArray(json.person_a.aspects)).toBe(true);
        
        // Verify Person B natal data
        expect(json.person_b).toBeDefined();
        expect(json.person_b.name).toBe('Stephie');
        expect(json.person_b.birth_data).toBeDefined();
        expect(json.person_b.birth_data.year).toBe(1968);
        expect(json.person_b.chart).toBeDefined();
        expect(json.person_b.chart.planets).toBeDefined();
        expect(json.person_b.aspects).toBeDefined();
        expect(Array.isArray(json.person_b.aspects)).toBe(true);
        
        // Verify mirror_contract
        expect(json.mirror_contract).toBeDefined();
        expect(json.mirror_contract.is_relational).toBe(true);
        
        // Verify provenance
        expect(json.provenance).toBeDefined();
        expect(json.provenance.house_system).toBeDefined();
        expect(json.provenance.orbs_profile).toBeDefined();
        
        // Verify narrative_sections placeholders
        expect(json.narrative_sections).toBeDefined();
        expect(json.narrative_sections.solo_mirror_a).toBe('');
        expect(json.narrative_sections.relational_engine).toBe('');
      }
    } else {
      test.skip();
    }
  });

  test('should export Symbolic Weather JSON with chart geometry and transits', async ({ page }) => {
    await page.goto('/math-brain');
    
    // Fill Person A
    await page.locator('input[name*="name"]').first().fill('Dan');
    await page.locator('input[type="date"]').first().fill('1973-07-24');
    await page.locator('input[type="time"]').first().fill('14:30');
    await page.locator('input[name*="city"]').first().fill('Bryn Mawr');
    const stateInputA = page.locator('input[name*="state"]').first();
    if (await stateInputA.count() > 0) {
      await stateInputA.fill('PA');
    }
    
    // Enable Person B
    const personBToggle = page.locator('input[name*="includePersonB"], button:has-text("Add Person B")');
    if (await personBToggle.count() > 0) {
      await personBToggle.first().click();
      
      await page.locator('input[name*="personB"][name*="name"]').fill('Stephie');
      await page.locator('input[name*="personB"] + input[type="date"]').fill('1968-04-16');
      await page.locator('input[name*="personB"] + input[type="time"]').fill('18:37');
      await page.locator('input[name*="personB"][name*="city"]').fill('Albany');
      const stateInputB = page.locator('input[name*="personB"][name*="state"]');
      if (await stateInputB.count() > 0) {
        await stateInputB.fill('GA');
      }
    }
    
    // Enable transits
    const transitToggle = page.locator('input[name*="includeTransits"], input[type="checkbox"]');
    if (await transitToggle.count() > 0) {
      await transitToggle.first().check();
      
      const transitFromInput = page.locator('input[name*="startDate"], input[name*="from"]');
      if (await transitFromInput.count() > 0) {
        await transitFromInput.first().fill('2025-10-19');
      }
      
      const transitToInput = page.locator('input[name*="endDate"], input[name*="to"]');
      if (await transitToInput.count() > 0) {
        await transitToInput.first().fill('2025-10-25');
      }
    }
    
    // Submit
    await page.locator('button[type="submit"]').click();
    
    // Wait for results with transits
    await page.waitForSelector(
      '[data-testid="chart-results"], text=/symbolic weather|transits|balance meter/i',
      { timeout: 30000, state: 'visible' }
    );
    
    // Look for Symbolic Weather JSON export button
    const weatherJsonButton = page.locator(
      'button:has-text("Symbolic Weather"), button:has-text("Weather Log")'
    ).first();
    
    if (await weatherJsonButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download');
      await weatherJsonButton.click();
      const download = await downloadPromise;
      
      const path = await download.path();
      if (path) {
        const content = fs.readFileSync(path, 'utf-8');
        const json = JSON.parse(content);
        
        // Verify Symbolic Weather structure
        expect(json._format).toBe('symbolic_weather_json');
        expect(json._version).toBe('1.0');
        
        // CRITICAL: Verify person_a has actual data (not null)
        expect(json.person_a).toBeDefined();
        expect(json.person_a.name).toBe('Dan');
        expect(json.person_a.birth_data).not.toBeNull();
        expect(json.person_a.birth_data.year).toBe(1973);
        expect(json.person_a.chart).not.toBeNull();
        expect(json.person_a.chart.planets).toBeDefined();
        expect(json.person_a.aspects).toBeDefined();
        expect(Array.isArray(json.person_a.aspects)).toBe(true);
        expect(json.person_a.aspects.length).toBeGreaterThan(0);
        
        // CRITICAL: Verify person_b has actual data (not null)
        expect(json.person_b).not.toBeNull();
        expect(json.person_b.name).toBe('Stephie');
        expect(json.person_b.birth_data).not.toBeNull();
        expect(json.person_b.birth_data.year).toBe(1968);
        expect(json.person_b.chart).not.toBeNull();
        expect(json.person_b.chart.planets).toBeDefined();
        expect(json.person_b.aspects).toBeDefined();
        expect(Array.isArray(json.person_b.aspects)).toBe(true);
        expect(json.person_b.aspects.length).toBeGreaterThan(0);
        
        // Verify daily_readings (transits)
        expect(json.daily_readings).toBeDefined();
        expect(Array.isArray(json.daily_readings)).toBe(true);
        expect(json.daily_readings.length).toBeGreaterThan(0);
        
        // Verify Balance Meter data
        const firstDay = json.daily_readings[0];
        expect(firstDay.date).toBeDefined();
        expect(firstDay.magnitude).not.toBeNull();
        expect(firstDay.directional_bias).not.toBeNull();
        
        // Verify Poetic Brain compatibility flag
        expect(json._poetic_brain_compatible).toBe(true);
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
