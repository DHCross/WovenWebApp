import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Poetic Brain Integration', () => {
  test('should process combined Mirror+SymbolicWeather JSON and render full mirror', async ({ page }) => {
    // Navigate to the page with the upload form
    await page.goto('/');

    // Get the test data file
    const testDataPath = path.join(process.cwd(), 'test-data', 'mirror-symbolic-weather-sample.json');
    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));

    // Mock the API response if needed, or test against a real endpoint
    await page.route('**/api/poetic-brain', async (route) => {
      // For now, just pass through to the real endpoint
      // In a real test, you might want to mock this
      const response = await route.fetch();
      const json = await response.json();
      await route.fulfill({ response, json });
    });

    // Find and click the upload button
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /upload/i }).click();
    const fileChooser = await fileChooserPromise;
    
    // Upload the test file
    await fileChooser.setFiles({
      name: 'test-mirror.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(testData))
    });

    // Verify the response contains the expected data
    const response = await page.waitForResponse('**/api/poetic-brain');
    const responseData = await response.json();

    // Basic validation of the response + narrative keys
    expect(responseData).toHaveProperty('type', 'mirror');
    expect(responseData).toHaveProperty('version');
    expect(responseData).toHaveProperty('draft');
    expect(responseData.draft).toHaveProperty('picture');
    expect(responseData.draft).toHaveProperty('feeling');
    expect(responseData.draft).toHaveProperty('container');
    expect(responseData.draft).toHaveProperty('option');
    expect(responseData.draft).toHaveProperty('next_step');
    
    // Verify the UI updates to show the mirror content and narrative keys
    const panel = page.getByTestId('mirror-output');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('picture:');
    await expect(panel).toContainText('feeling:');
    await expect(panel).toContainText('container:');
    await expect(panel).toContainText('option:');
    await expect(panel).toContainText('next_step:');
    
    // Verify no OSR (Off-Site Redirect) occurred
    expect(page.url()).toContain('localhost:3000');
  });
});
