import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

type LegacyMathBrainModule = {
  handler: (
    event: any,
    context: any,
  ) => Promise<{
    statusCode?: number;
    headers?: Record<string, string>;
    body?: string;
  }>;
};

type LegacyHandlerResult = Awaited<ReturnType<LegacyMathBrainModule['handler']>>;

const createRequest = (payload: unknown): NextRequest =>
  new Request('https://example.com/api/astrology-mathbrain', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }) as NextRequest;

describe('Astrology Math Brain API route', () => {
  let legacyMathBrain: LegacyMathBrainModule;
  let originalHandler: LegacyMathBrainModule['handler'];

  beforeEach(() => {
    vi.resetModules();
    legacyMathBrain = require('../../lib/server/astrology-mathbrain.js') as LegacyMathBrainModule;
    originalHandler = legacyMathBrain.handler;
  });

  afterEach(() => {
    legacyMathBrain.handler = originalHandler;
  });

  const exercisePostRoute = async (mockResult: LegacyHandlerResult | { body?: object; statusCode?: number }) => {
    const handlerMock = vi.fn(async () => {
      const body =
        typeof mockResult.body === 'string'
          ? mockResult.body
          : JSON.stringify(
              'body' in mockResult && mockResult.body !== undefined ? mockResult.body : { success: false },
            );

      return {
        statusCode: mockResult.statusCode ?? 500,
        headers: { 'content-type': 'application/json' },
        body,
      };
    });

    legacyMathBrain.handler = handlerMock;
    const { POST } = await import('@/app/api/astrology-mathbrain/route');
    const request = createRequest({ personA: { name: 'Demo' } });
    const response = await POST(request);
    const payload = await response.json();

    return { handlerMock, response, payload };
  };

  it('returns 422 when the legacy handler flags invalid birth data', async () => {
    const legacyResponse = {
      statusCode: 400,
      body: {
        success: false,
        code: 'NATAL_CHART_FETCH_FAILED',
        error: 'Legacy handler rejected birth data',
        detail: 'Birth data missing coordinates',
      },
    };

    const { handlerMock, response, payload } = await exercisePostRoute(legacyResponse);

    expect(handlerMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      code: 'BIRTH_DATA_INVALID',
      detail: 'Birth data missing coordinates',
    });
    expect(payload.error).toContain('Birth data appears invalid or incomplete');
    expect(payload.hint).toContain('Verify that the birth date, time');
  });

  it('returns 503 with hint when RapidAPI key is missing', async () => {
    const { response, payload } = await exercisePostRoute({
      statusCode: 500,
      body: {
        success: false,
        code: 'RAPIDAPI_KEY_MISSING',
        error: 'Missing RAPIDAPI_KEY',
      },
    });

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      success: false,
      code: 'RAPIDAPI_KEY_MISSING',
    });
    expect(payload.error).toContain('Math Brain is offline');
    expect(payload.hint).toContain('Add RAPIDAPI_KEY');
  });

  it('returns 503 for RapidAPI subscription/auth failures', async () => {
    const { response, payload } = await exercisePostRoute({
      statusCode: 401,
      body: {
        success: false,
        code: 'RAPIDAPI_SUBSCRIPTION',
        error: 'Subscription invalid',
      },
    });

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      success: false,
      code: 'RAPIDAPI_AUTH_ERROR',
    });
    expect(payload.error).toContain('RapidAPI rejected the request');
  });

  it('returns 503 for RapidAPI rate limiting', async () => {
    const { response, payload } = await exercisePostRoute({
      statusCode: 429,
      body: {
        success: false,
        error: 'Too Many Requests',
      },
    });

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      success: false,
      code: 'RAPIDAPI_RATE_LIMIT',
    });
    expect(payload.error).toContain('RapidAPI rate limit reached');
  });

  it('returns 503 for upstream temporary failures', async () => {
    const { response, payload } = await exercisePostRoute({
      statusCode: 502,
      body: {
        success: false,
        code: 'UPSTREAM_TEMPORARY',
        error: 'Upstream timeout',
      },
    });

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      success: false,
      code: 'UPSTREAM_TEMPORARY',
    });
    expect(payload.error).toContain('Astrologer API is temporarily unavailable');
  });
});
