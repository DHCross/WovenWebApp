import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Poetic Brain API', () => {
  let testData: any;

  test.beforeAll(() => {
    // Load test data once before all tests
    const testDataPath = path.join(process.cwd(), 'test-data', 'mirror-symbolic-weather-sample.json');
    testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
  });

  test('should process valid Mirror+SymbolicWeather JSON', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    // Basic validation of the response
    expect(responseData).toHaveProperty('type', 'mirror');
    expect(responseData).toHaveProperty('version');
  });

  test('should return 400 for invalid input', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: { invalid: 'data' }
    });
    
    expect(response.status()).toBe(400);
    const responseData = await response.json();
    expect(responseData).toHaveProperty('error');
  });

  test('should accept mirror_directive_json (minimal)', async ({ request }) => {
    const directive = {
      _format: 'mirror_directive_json',
      person_a: { name: 'Directive User' },
      mirror_contract: { start_date: '2025-01-01T00:00:00.000Z', end_date: '2025-12-31T23:59:59.999Z' },
    };
    const response = await request.post('/api/poetic-brain', { data: directive });
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('type', 'mirror');
    expect(json).toHaveProperty('draft');
  });

  test('should reject directive-like payload missing markers', async ({ request }) => {
    const badDirective = { person_b: { name: 'Wrong' } };
    const response = await request.post('/api/poetic-brain', { data: badDirective });
    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty('error');
  });
});
