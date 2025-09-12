import { NextRequest, NextResponse } from 'next/server';

const logger = {
  info: (msg: string, ctx = {}) => console.log(`[INFO] ${msg}`, ctx),
  warn: (msg: string, ctx = {}) => console.warn(`[WARN] ${msg}`, ctx),
  error: (msg: string, ctx = {}) => console.error(`[ERROR] ${msg}`, ctx)
};

export async function GET(request: NextRequest) {
  const errorId = `auth-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  try {
    const rawDomain = process.env.AUTH0_DOMAIN;
    const domain = (rawDomain || '').replace(/^https?:\/\//, '');
    const clientId = process.env.AUTH0_CLIENT_ID;
    // IMPORTANT: Do NOT default to Management API audience. Must be a custom API identifier.
    const audience = process.env.AUTH0_AUDIENCE || null;

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