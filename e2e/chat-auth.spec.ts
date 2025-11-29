import { test, expect } from '@playwright/test';

/**
 * Chat (Poetic Brain) Auth Gate Tests
 * Tests authentication requirements for /chat endpoint
 */

test.describe('Chat Auth Gate', () => {
  test('should show chat interface or auth prompt when accessing /chat', async ({ page }) => {
    await page.goto('/chat');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const url = page.url();
    const hasAuthInUrl = /auth0|login|sign-in/i.test(url);
    const hasLoginButton = await page.locator('button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login")').count() > 0;
    const hasChatInterface = await page.locator('heading:has-text("Raven"), text=/Raven Calder/i').count() > 0;
    
    // Either auth prompt/redirect OR chat interface should be present
    expect(hasAuthInUrl || hasLoginButton || hasChatInterface).toBeTruthy();
  });

  test('should display chat interface when RequireAuth allows access', async ({ page }) => {
    await page.goto('/chat');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Look for chat UI elements that indicate the page loaded
    const hasRavenTitle = await page.locator('text=/Raven Calder/i').count() > 0;
    const hasWelcomeMessage = await page.locator('text=/Welcome to Raven/i').count() > 0;
    const hasTextbox = await page.locator('textbox').count() > 0;
    
    // If we see any of these, the page is accessible
    if (hasRavenTitle || hasWelcomeMessage || hasTextbox) {
      expect(true).toBeTruthy();
    } else {
      // If not, we should have been redirected or shown login
      expect(page.url()).toMatch(/auth|login/i);
    }
  });

  test.skip('should display chat interface when authenticated', async ({ page, context }) => {
    // This test requires actual Auth0 credentials
    // Mock session for demo purposes
    await context.addCookies([
      {
        name: 'appSession',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);
    
    await page.goto('/chat');
    
    // Should see chat UI
    await expect(
      page.locator('[data-testid="chat-input"]')
        .or(page.locator('textarea'))
        .or(page.locator('input[type="text"]'))
    ).toBeVisible({ timeout: 10000 });
  });

  test.skip('should send and receive chat messages', async ({ page, context }) => {
    // Requires authenticated session
    await setupAuthSession(context);
    await page.goto('/chat');
    
    const input = page.locator('[data-testid="chat-input"], textarea, input[type="text"]').first();
    await input.fill('Tell me about my chart');
    await input.press('Enter');
    
    // Wait for response
    await expect(
      page.locator('[data-testid="message-response"]')
        .or(page.locator('text=/raven|mirror|geometry/i'))
    ).toBeVisible({ timeout: 30000 });
  });
});

async function setupAuthSession(context) {
  await context.addCookies([
    {
      name: 'appSession',
      value: 'mock-session-token',
      domain: 'localhost',
      path: '/',
    },
  ]);
}
