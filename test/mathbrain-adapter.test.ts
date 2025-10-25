import { describe, it, expect } from 'vitest';
import { runMathBrain } from '../lib/mathbrain/adapter';

describe('runMathBrain', () => {
  it('should be defined', () => {
    expect(runMathBrain).toBeDefined();
  });

  it('should fetch and process data correctly', async () => {
    const mockResponse = {
      json: () => Promise.resolve({ data: 'test-data' }),
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: 'test-data' })),
    };
    global.fetch = () => Promise.resolve(mockResponse);

    const result = await runMathBrain({
      personA: {
        date: "1990-01-01",
        time: "12:00",
        lat: 0,
        lon: 0,
      },
      reportType: 'NATAL_REPORT',
    });
    expect(result.success).toBe(true);
  });

  it('should throw an error if the fetch fails', async () => {
    const mockResponse = {
      json: () => Promise.resolve({ error: 'test-error' }),
      ok: false,
      text: () => Promise.resolve(JSON.stringify({ error: 'test-error' })),
    };
    global.fetch = () => Promise.resolve(mockResponse);

    const result = await runMathBrain({
      personA: {
        date: "1990-01-01",
        time: "12:00",
        lat: 0,
        lon: 0,
      },
      reportType: 'NATAL_REPORT',
    });
    expect(result.success).toBe(false);
  });
});
