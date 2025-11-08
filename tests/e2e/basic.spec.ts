import { test, expect } from '@playwright/test';

test('health check endpoint', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty('status', 'ok');
});
