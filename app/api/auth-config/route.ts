import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeAuth0Audience,
  normalizeAuth0ClientId,
  normalizeAuth0Domain,
} from '@/lib/auth';

const logger = {
  info: (msg: string, ctx = {}) => console.log(`[INFO] ${msg}`, ctx),
  warn: (msg: string, ctx = {}) => console.warn(`[WARN] ${msg}`, ctx),
  error: (msg: string, ctx = {}) => console.error(`[ERROR] ${msg}`, ctx)
};

export async function GET(request: NextRequest) {
  const errorId = `auth-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Check if auth is explicitly disabled
  if (process.env.NEXT_PUBLIC_ENABLE_AUTH === 'false') {
    return NextResponse.json({
      success: false,
      code: 'AUTH_DISABLED',
      error: 'Authentication is globally disabled'
    }, {
      headers: new Headers(headers as any)
    });
  }

  try {
    const domain = normalizeAuth0Domain(process.env.AUTH0_DOMAIN);
    const clientId = normalizeAuth0ClientId(process.env.AUTH0_CLIENT_ID);
    // IMPORTANT: Do NOT default to Management API audience. Must be a custom API identifier.
    const audience = normalizeAuth0Audience(process.env.AUTH0_AUDIENCE);

    if (!domain || !clientId) {
      const missing = {
        domain: !domain,
        clientId: !clientId
      };

      logger.warn('Auth0 configuration incomplete', { missing, errorId });

      return NextResponse.json({
        success: false,
        error: 'Auth0 environment not configured. Set AUTH0_DOMAIN and AUTH0_CLIENT_ID.',
        code: 'AUTH0_CONFIG_MISSING',
        errorId,
        details: { missing }
      }, {
        status: 500,
        headers: new Headers(headers as any)
      });
    }

    logger.info('Auth0 configuration retrieved successfully', {
      domain: domain,
      hasAudience: Boolean(audience),
      errorId
    });

    return NextResponse.json({
      success: true,
      domain,
      audience,
      clientId,
      hasAudience: !!audience
    }, {
      headers: new Headers(headers as any)
    });
  } catch (e: any) {
    logger.error('Auth0 config endpoint failed', { error: e.message, errorId });

    return NextResponse.json({
      success: false,
      error: 'Failed to load auth config',
      code: 'AUTH0_CONFIG_ERROR',
      errorId
    }, {
      status: 500,
      headers: new Headers(headers as any)
    });
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  return new NextResponse('', {
    status: 200,
    headers: new Headers(headers as any)
  });
}