import { NextResponse } from 'next/server';

// Secure diagnostics endpoint to verify server-side env configuration without exposing secrets.
// Access is controlled by two gates:
// 1) process.env.ENABLE_DEV_TOOLS === 'true'
// 2) A shared secret in header: 'x-devtools-key' must equal process.env.DEV_TOOLS_SECRET
//
// Response only returns booleans and redacted values.

export async function GET(request: Request) {
  const enable = process.env.ENABLE_DEV_TOOLS === 'true';
  if (!enable) {
    return NextResponse.json({ success: false, error: 'Disabled' }, { status: 404 });
  }
  try {
    const key = request.headers.get('x-devtools-key') || '';
    const expected = process.env.DEV_TOOLS_SECRET || '';
    if (!expected || key !== expected) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const redact = (v?: string) => {
      if (!v) return '—';
      if (v.length <= 8) return v[0] + '…';
      return v.slice(0, 4) + '…' + v.slice(-2);
    };

    const snapshot = {
      success: true,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        AUTH0_DOMAIN_set: Boolean(process.env.AUTH0_DOMAIN),
        AUTH0_CLIENT_ID_set: Boolean(process.env.AUTH0_CLIENT_ID),
        AUTH0_AUDIENCE_set: Boolean(process.env.AUTH0_AUDIENCE),
        AUTH0_CLIENT_SECRET_set: Boolean(process.env.AUTH0_CLIENT_SECRET),
        AUTH0_ISSUER_BASE_URL_set: Boolean(process.env.AUTH0_ISSUER_BASE_URL),
        // Redacted previews for sanity checks
        AUTH0_DOMAIN_preview: redact(process.env.AUTH0_DOMAIN),
        AUTH0_CLIENT_ID_preview: redact(process.env.AUTH0_CLIENT_ID),
      },
    } as const;

    return NextResponse.json(snapshot, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'error' }, { status: 500 });
  }
}
