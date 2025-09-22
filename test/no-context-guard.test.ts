import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNoContextGuardCopy, type NoContextGuardCopy } from '@/lib/guard/no-context';
import * as guardModule from '@/lib/guard/no-context';
import { POST as ravenPost } from '@/app/api/raven/route';
import { POST as chatPost } from '@/app/api/chat/route';

function makeGuard(label: string): NoContextGuardCopy {
  const feeling = `${label} feeling about context.`;
  const primary = `${label} primary option`;
  const secondary = `${label} secondary option`;
  const nextStep = `${label} next step`;

  return {
    picture: `${label} picture prompt`,
    feeling,
    container: `Option 1 · ${primary}`,
    option: `Option 2 · ${secondary}`,
    next_step: nextStep,
    guidance: `${feeling}\n${label} intro guidance\n\n• ${primary}\n• ${secondary}\n\n${nextStep}`
  };
}

function parseDelta(streamText: string): string {
  const lines = streamText.trim().split('\n').filter(Boolean);
  expect(lines.length).toBeGreaterThan(0);
  const parsed = JSON.parse(lines[0]);
  return parsed.delta as string;
}

describe('buildNoContextGuardCopy', () => {
  it('produces varied guidance when the random source changes', () => {
    const first = buildNoContextGuardCopy({ rng: () => 0 });
    const second = buildNoContextGuardCopy({ rng: () => 0.99 });

    expect(first.guidance).not.toEqual(second.guidance);
    expect(first.picture).not.toEqual(second.picture);
  });
});

describe('Raven API guard response', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces varied guard copy across invocations', async () => {
    const guardOne = makeGuard('Alpha');
    const guardTwo = makeGuard('Beta');
    const spy = vi.spyOn(guardModule, 'buildNoContextGuardCopy');
    spy.mockReturnValueOnce(guardOne);
    spy.mockReturnValueOnce(guardTwo);

    const requestPayload = {
      input: 'Can you read me right now?',
      options: {}
    };

    const responseOne = await ravenPost(new Request('http://localhost/api/raven', {
      method: 'POST',
      body: JSON.stringify(requestPayload)
    }));
    const jsonOne = await responseOne.json();

    const responseTwo = await ravenPost(new Request('http://localhost/api/raven', {
      method: 'POST',
      body: JSON.stringify(requestPayload)
    }));
    const jsonTwo = await responseTwo.json();

    expect(jsonOne.guard).toBe(true);
    expect(jsonTwo.guard).toBe(true);
    expect(jsonOne.draft.picture).toBe(guardOne.picture);
    expect(jsonTwo.draft.picture).toBe(guardTwo.picture);
    expect(jsonOne.guidance).toBe(guardOne.guidance);
    expect(jsonTwo.guidance).toBe(guardTwo.guidance);
    expect(jsonOne.draft.picture).not.toEqual(jsonTwo.draft.picture);
    expect(jsonOne.draft.next_step).not.toEqual(jsonTwo.draft.next_step);
  });
});

describe('Chat API guard response', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams different guard copy when invoked twice', async () => {
    const guardOne = makeGuard('Alpha');
    const guardTwo = makeGuard('Beta');
    const spy = vi.spyOn(guardModule, 'buildNoContextGuardCopy');
    spy.mockReturnValueOnce(guardOne);
    spy.mockReturnValueOnce(guardTwo);

    const makeRequest = () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '127.0.0.1');
      return {
        json: async () => ({
          messages: [{ role: 'user', content: 'Can you read me without my chart?' }],
          reportContexts: []
        }),
        headers
      } as any;
    };

    const responseOne = await chatPost(makeRequest());
    const responseTwo = await chatPost(makeRequest());

    const textOne = await responseOne.text();
    const textTwo = await responseTwo.text();

    const deltaOne = parseDelta(textOne);
    const deltaTwo = parseDelta(textTwo);

    expect(deltaOne).toContain(guardOne.picture);
    expect(deltaTwo).toContain(guardTwo.picture);
    expect(deltaOne).toContain(guardOne.guidance);
    expect(deltaTwo).toContain(guardTwo.guidance);
    expect(deltaOne).not.toEqual(deltaTwo);
  });
});
