import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const hasExternalBaseURL = !!process.env.BASE_URL;
const resolvedBaseURL =
  process.env.BASE_URL || (isCI ? 'http://127.0.0.1:8888' : 'http://localhost:3000');

/**
 * Playwright configuration for WovenWebApp
 * Tests Math Brain, Poetic Brain (auth-gated), API endpoints, and export flows
 */
export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'tests/business-logic/**/*.spec.ts'],
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
    baseURL: resolvedBaseURL,
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
  // GitHub Actions workflow starts Netlify dev on port 8888 when CI=true.
  // Locally, Playwright can launch `npm run dev` on port 3000 and reuse it across test runs.
  webServer: isCI || hasExternalBaseURL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
