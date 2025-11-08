import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Poetic Brain UI', () => {
  let testData: any;

  test.beforeAll(() => {
    // Load test data once before all tests
    const testDataPath = path.join(process.cwd(), 'test-data', 'mirror-symbolic-weather-sample.json');
    testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
  });

  test('should upload and process JSON file', async ({ page }, testInfo) => {
    // Give Firefox extra headroom; others stick to 60s
    if (testInfo.project.name.toLowerCase().includes('firefox')) {
      testInfo.setTimeout(90000);
    } else {
      testInfo.setTimeout(60000);
    }
    
    // Enable request/response logging
    page.on('request', request => 
      console.log('>>', request.method(), request.url()));
    page.on('response', response => 
      console.log('<<', response.status(), response.url()));

    // Navigate to the page with the upload form
    await page.goto('/');
    console.log('Page title:', await page.title());

    // Debug: Log all buttons on the page
    const buttons = await page.$$('button');
    console.log('Buttons on page:', await Promise.all(buttons.map(b => b.textContent())));

    // No interception: let the request go through naturally

    try {
      // Look for any file input, not just a button
      const fileInput = page.locator('input[type="file"]').first();
      const isFileInputVisible = await fileInput.isVisible();
      console.log('File input visible:', isFileInputVisible);
      
      if (!isFileInputVisible) {
        // If no visible file input, look for a button that might trigger file selection
        const uploadButton = page.getByRole('button', { name: /upload|select file|choose file/i }).first();
        console.log('Upload button found:', await uploadButton.isVisible());
        await uploadButton.click();
      }
      
      // Create a temporary file for upload
      const tempFilePath = path.join(process.cwd(), 'temp-upload.json');
      fs.writeFileSync(tempFilePath, JSON.stringify(testData));
      
      // Upload the file
      await fileInput.setInputFiles(tempFilePath);
      console.log('File selected for upload');

      // Firefox-only: nudge event loop so onChange settles reliably
      if (testInfo.project.name.toLowerCase().includes('firefox')) {
        try {
          await fileInput.dispatchEvent('change');
        } catch {}
        await page.waitForTimeout(200);
      }
      
      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);
      
      // Look for success cue and narrative keys in the UI
      const successWait = testInfo.project.name.toLowerCase().includes('firefox') ? 20000 : 15000;
      const successIndicator = await page.getByTestId('upload-success').waitFor({ timeout: successWait }).catch(() => null);
      
      if (successIndicator) {
        console.log('Success indicator found:', await successIndicator.textContent());
      } else {
        console.log('No success indicator found, taking a screenshot');
        await page.screenshot({ path: 'test-results/upload-failed.png', fullPage: true });
      }
      // Verify narrative keys appear in the visible mirror output
      const panel = page.getByTestId('mirror-output');
      const panelTimeout = testInfo.project.name.toLowerCase().includes('firefox') ? 20000 : 15000;
      await expect(panel).toBeVisible({ timeout: panelTimeout });
      await expect(panel).toContainText('picture:', { timeout: panelTimeout });
      await expect(panel).toContainText('feeling:', { timeout: panelTimeout });
      await expect(panel).toContainText('container:', { timeout: panelTimeout });
      await expect(panel).toContainText('option:', { timeout: panelTimeout });
      await expect(panel).toContainText('next_step:', { timeout: panelTimeout });
      
    } catch (error) {
      console.error('Test failed:', error);
      await page.screenshot({ path: `test-results/error-${Date.now()}.png`, fullPage: true });
      throw error;
    }
  });
});
