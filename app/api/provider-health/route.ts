import { NextRequest, NextResponse } from 'next/server';

type ProviderStatus = {
  ok: boolean;
  configured: boolean;
  message?: string;
};

type HealthPayload = {
  success: boolean;
  providers: {
    astrology: ProviderStatus;
    poetic: ProviderStatus;
  };
};

async function tryNetlifyAstrologyHealth(origin: string): Promise<ProviderStatus | null> {
  const url = `${origin}/.netlify/functions/astrology-health?ping=1`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(to);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null) as any;
    const configured = Boolean(data?.rapidapi?.configured);
    const ok = configured && (data?.rapidapi?.ping?.ok !== false);
    const msg = configured ? undefined : 'RAPIDAPI_KEY not configured';
    return { ok, configured, message: msg };
  } catch {
    clearTimeout(to);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });

  try {
    const origin = req.nextUrl?.origin || '';

    // Astrology provider
    const configuredAstro = Boolean(process.env.RAPIDAPI_KEY && String(process.env.RAPIDAPI_KEY).trim());
    let astrology: ProviderStatus = { ok: configuredAstro, configured: configuredAstro };

    // If Netlify dev is running, ask the function for a quick ping result
    const viaFunction = origin ? await tryNetlifyAstrologyHealth(origin) : null;
    if (viaFunction) astrology = viaFunction;
    if (!astrology.configured && !astrology.message) {
      astrology.message = 'Astrology provider not configured (set RAPIDAPI_KEY)';
    }

    // Poetic provider (Chat)
    const poeticConfigured = Boolean(
      (process.env.PERPLEXITY_API_KEY && String(process.env.PERPLEXITY_API_KEY).trim()) ||
      (process.env.PERPLEXITY && String(process.env.PERPLEXITY).trim())
    );
    const poeticEnabled = String(process.env.NEXT_PUBLIC_ENABLE_POETIC_BRAIN || 'true').trim().toLowerCase();
    const poeticOk = poeticEnabled !== 'false' && poeticEnabled !== '0' && poeticEnabled !== 'off' && poeticConfigured;
    const poetic: ProviderStatus = {
      ok: poeticOk,
      configured: poeticConfigured,
      message: poeticConfigured ? undefined : 'Poetic Brain API key not configured',
    };

    const payload: HealthPayload = {
      success: true,
      providers: { astrology, poetic }
    };
    return new NextResponse(JSON.stringify(payload), { headers });
  } catch (e: any) {
    const payload = { success: false, error: e?.message || 'PROVIDER_HEALTH_ERROR' };
    return new NextResponse(JSON.stringify(payload), { status: 500, headers });
  }
}

