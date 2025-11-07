// Playwright configuration tailored for the Woven Web App
// Ensures the development server can be reused during CI runs to avoid port conflicts.

const DEFAULT_PORT = Number.parseInt(process.env.PORT || '3000', 10);
const DEV_COMMAND = process.env.PLAYWRIGHT_WEB_COMMAND || `npm run dev -- --port ${DEFAULT_PORT}`;

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  webServer: {
    command: DEV_COMMAND,
    port: DEFAULT_PORT,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe'
  },
};

module.exports = config;
