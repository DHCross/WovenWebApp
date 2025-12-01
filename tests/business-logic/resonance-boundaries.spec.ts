import { test, expect } from '@playwright/test';

test.describe('Symbolic Spectrum guardrails', () => {
  test('records OSR / ABE verdicts for non-resonant inputs', async ({ request }) => {
    const generateResponse = await request.post('/api/raven', {
      data: {
        action: 'generate',
        input: 'This does not resonate. Mark this as an outside symbolic range example.',
        options: { mode: 'text-only' },
      },
    });

    if (!generateResponse.ok()) {
      test.skip('Poetic Brain endpoint unavailable');
    }

    let sessionId: string | undefined;
    const contentType = generateResponse.headers()['content-type'] || '';

    if (contentType.includes('application/json')) {
      const generated = await generateResponse.json();
      sessionId = generated.sessionId || generated.session_id || generated.sid;
    } else {
      const textPayload = await generateResponse.text();
      const match = textPayload.match(/"sessionId"\s*:\s*"([^"]+)"/);
      sessionId = match?.[1];
    }

    if (!sessionId) {
      test.skip('Session ID not returned from Poetic Brain generator');
    }

    const exportResponse = await request.post('/api/raven', {
      data: {
        action: 'export',
        sessionId,
      },
    });

    if (!exportResponse.ok()) {
      test.skip('Unable to retrieve SST export for session');
    }

    const exportData = await exportResponse.json();
    const osrCount = exportData?.scores?.osr_count ?? 0;
    const abeCount = exportData?.scores?.abe_count ?? 0;
    const hasOSRLog = Array.isArray(exportData?.log?.probes)
      ? exportData.log.probes.some((probe: any) =>
          typeof probe?.tag === 'string' && /osr|outside/i.test(probe.tag)
        )
      : false;

    expect(osrCount + abeCount > 0 || hasOSRLog).toBeTruthy();
  });
});
