import { describe, expect, test } from 'vitest';
import { POST as ravenPost } from '@/app/api/raven/route';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Raven report upload handling', () => {
  test('acknowledges uploaded Woven JSON reports without failing', async () => {
    const samplePath = join(
      process.cwd(),
      'Sample Output',
      'relational_balance_meter_DH_Stephie_2025-09.json'
    );
    const jsonPayload = readFileSync(samplePath, 'utf8');

    const body = {
      action: 'generate',
      input: jsonPayload,
      options: {
        reportType: 'balance',
        reportId: 'sample-report',
        reportContexts: [
          {
            id: 'sample-report',
            type: 'balance',
            name: 'Sample Balance Report',
            summary: 'Demo upload for Poetic Brain logging.',
            content: jsonPayload,
          },
        ],
      },
    };

    const req = new Request('http://localhost/api/raven', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const res = await ravenPost(req);
    expect(res.status).toBe(200);

    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.intent).toBe('report');
    expect(payload.prov?.source).toBe('Uploaded JSON Report');
    expect(payload.draft?.picture).toContain('A dynamic and growth-oriented climate.');
    expect(payload.error).toBeUndefined();
  });
});
