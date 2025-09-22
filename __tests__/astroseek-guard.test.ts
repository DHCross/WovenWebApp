import { POST as ravenPost } from '@/app/api/raven/route';
import { POST as chatPost } from '@/app/api/chat/route';
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

  test('chat streaming guard emits AstroSeek-specific guidance', async () => {
    const chatBody = {
      persona: 'raven',
      messages: [
        { role: 'raven', content: 'Hello' },
        { role: 'user', content: 'Please read me. I have an AstroSeek export but can\'t upload the file yet.' }
      ],
      reportContexts: [],
    };

    const req: any = {
      json: async () => chatBody,
      headers: new Headers(),
    };

    const res = await chatPost(req);
    const reader = res.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let aggregated = '';
    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        aggregated += decoder.decode(value, { stream: true });
      }
      aggregated += decoder.decode();
    }

    const frames = aggregated
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => JSON.parse(line));

    expect(frames.length).toBeGreaterThan(0);
    const firstFrame = frames[0];
    expect(firstFrame.delta).toContain(ASTROSEEK_REFERENCE_GUIDANCE);
    expect(firstFrame.delta).not.toContain(NO_CONTEXT_GUIDANCE);
  });
});
