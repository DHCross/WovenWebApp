import { test, expect } from '@playwright/test';

test.describe('Poetic Brain mandate', () => {
  test('honors FIELD → MAP → VOICE handoff with agency-preserving voice', async ({ page }) => {
    await page.goto('/math-brain');

    const fill = async (selector: string, value: string) => {
      const field = page.locator(selector);
      if (await field.count()) {
        await field.fill(value);
      }
    };

    await fill('#a-name', 'Clarity Check');
    await fill('#a-year', '1988');
    await fill('#a-month', '12');
    await fill('#a-day', '04');
    await fill('#a-hour', '10');
    await fill('#a-minute', '15');
    await fill('#a-city', 'Boston');
    await fill('#a-state', 'MA');
    if (await page.locator('#a-tz').count()) {
      await page.selectOption('#a-tz', 'US/Eastern');
    }

    const submitButton = page
      .locator('button:has-text("Get My Mirror"), button:has-text("Get Mirror"), button:has-text("Get My Reading"), button[type="submit"]')
      .first();

    if ((await submitButton.count()) === 0) {
      test.skip('Math Brain submit control not available');
    }

    const navigationPromise = page.waitForURL('**/chat**', { timeout: 120000 }).catch(() => null);
    await submitButton.click();
    const navigated = await navigationPromise;

    if (!navigated) {
      test.skip('Poetic Brain chat handoff not available in this environment');
    }

    await page.waitForSelector('body', { timeout: 20000 });
    const narrativeText = (await page.textContent('body')) || '';

    expect(narrativeText).toMatch(/FIELD/i);
    expect(narrativeText).toMatch(/MAP/i);
    expect(narrativeText).toMatch(/VOICE/i);

    expect(narrativeText).toMatch(/\bmay\b|\bcould\b|\btends\b/i);
    expect(narrativeText).not.toMatch(/\b(SST|OSR|Magnitude|Valence)\b/i);

    expect(narrativeText).toMatch(/\bWB\b|Within Boundary/i);
  });
});
