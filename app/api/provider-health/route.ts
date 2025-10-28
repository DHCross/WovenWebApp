import { NextResponse } from 'next/server';

type ProviderHealth = {
  ok: boolean;
  configured: boolean;
  message?: string;
  meta?: Record<string, unknown>;
};

type ProviderHealthResponse = {
  success: boolean;
  providers: {
    astrology: ProviderHealth;
    poetic: ProviderHealth;
  };
};

export const dynamic = 'force-dynamic';

async function checkAstrologyProvider(): Promise<ProviderHealth> {
  try {
    const module = await import('../../../netlify/functions/astrology-health.js');
    const handler = module?.handler as undefined | ((event: any) => Promise<any>);
    if (typeof handler !== 'function') {
      return {
        ok: false,
        configured: Boolean(process.env.RAPIDAPI_KEY && String(process.env.RAPIDAPI_KEY).trim()),
        message: 'Astrology health handler unavailable'
      };
    }

    const result = await handler({
      queryStringParameters: { ping: '1' }
    });

    const body = typeof result?.body === 'string' ? JSON.parse(result.body) : {};
    const configured = Boolean(body?.rapidapi?.configured);
    const ping = body?.rapidapi?.ping;
    const ok = configured && (!ping || ping.ok !== false);

    let message: string | undefined;
    if (!configured) {
      message = 'RapidAPI key not configured';
    } else if (ping && ping.ok === false) {
      const detail = typeof ping.status === 'number' ? `HTTP ${ping.status}` : ping.error || 'ping failed';
      message = `RapidAPI ping failed (${detail})`;
    }

    return {
      ok,
      configured,
      message,
      meta: {
        ping
      }
    };
  } catch (error: any) {
    const configured = Boolean(process.env.RAPIDAPI_KEY && String(process.env.RAPIDAPI_KEY).trim());
    return {
      ok: false,
      configured,
      message: error?.message || 'Astrology health check failed'
    };
  }
}

function checkPoeticProvider(): ProviderHealth {
  const key = process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY;
  const configured = Boolean(key && String(key).trim());
  return {
    ok: configured,
    configured,
    message: configured ? undefined : 'Perplexity API key not configured'
  };
}

export async function GET(): Promise<NextResponse<ProviderHealthResponse>> {
  const [astrology, poetic] = await Promise.all([
    checkAstrologyProvider(),
    Promise.resolve(checkPoeticProvider())
  ]);

  return NextResponse.json({
    success: true,
    providers: {
      astrology,
      poetic
    }
  });
}
