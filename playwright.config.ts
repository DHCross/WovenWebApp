import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for WovenWebApp
 * Tests Math Brain, Poetic Brain (auth-gated), API endpoints, and export flows
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github']] : []),
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    // Reuse existing server to avoid port conflicts in local dev
    reuseExistingServer: true,
    timeout: 120000,
    // Stdout: 'ignore' prevents npm output from cluttering test results
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
