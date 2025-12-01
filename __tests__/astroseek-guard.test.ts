import { POST as ravenPost } from '@/app/api/raven/route';
// NOTE: chat/route was removed; tests using chatPost are commented out or removed
import {
  ASTROSEEK_REFERENCE_GUIDANCE,
  NO_CONTEXT_GUIDANCE
} from '@/lib/raven/guards';

describe('AstroSeek guard guidance', () => {
  test('raven route returns specialized guard for AstroSeek mentions without geometry', async () => {
    const body = {
      action: 'generate',
      input: 'Can you read me? I have an AstroSeek export but I cannot upload it yet.',
      options: {},
    };

    const req = new Request('http://localhost/api/raven', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await ravenPost(req);
    const payload = await res.json();

    expect(payload.guard).toBe(true);
    expect(payload.guidance).toBe(ASTROSEEK_REFERENCE_GUIDANCE);
    expect(payload.guidance).not.toBe(NO_CONTEXT_GUIDANCE);
    expect(payload.prov?.source).toBe('Conversational Guard (AstroSeek)');
    expect(payload.draft?.picture).toContain('AstroSeek');
  });

  // chat/route was removed; legacy streaming guard tests deleted to keep suite green
});
