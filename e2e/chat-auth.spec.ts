import { test, expect } from '@playwright/test';

/**
 * Chat (Poetic Brain) Auth Gate Tests
 * Tests authentication requirements for /chat endpoint
 */

test.describe('Chat Auth Gate', () => {
  test('should redirect to login when accessing /chat unauthenticated', async ({ page }) => {
    await page.goto('/chat');
    
    // Should be redirected to Auth0 or login page, or see login prompt
    await page.waitForTimeout(2000);
    
    const url = page.url();
    const hasAuthInUrl = /auth0|login|sign-in/i.test(url);
    const hasLoginButton = await page.locator('button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login")').count() > 0;
    
    expect(hasAuthInUrl || hasLoginButton).toBeTruthy();
  });

  test('should display RequireAuth component or redirect for unauthenticated users', async ({ page }) => {
    await page.goto('/chat');
    
    // Look for authentication UI elements
    await expect(
      page.locator('text=/sign in|log in|authenticate|login required/i')
        .or(page.locator('button:has-text("Login")'))
    ).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no login UI, check if redirected
      expect(page.url()).toMatch(/auth|login/i);
    });
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
