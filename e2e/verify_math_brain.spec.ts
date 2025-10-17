import { test, expect } from '@playwright/test';

test('Math Brain page loads correctly', async ({ page }) => {
  await page.goto('http://localhost:3000/math-brain');
  await expect(page).to_have_title(/Math Brain/);
  await page.screenshot({ path: 'jules-scratch/verification/verification.png' });
});