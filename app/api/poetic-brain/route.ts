import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { checkAllowlist } from '@/lib/auth/allowlist';
import { buildRavenSystemPrompt } from '@/lib/raven/protocol';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. No or malformed token provided.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);

    // Server-side allowlist (defense-in-depth). If configured, deny non-allowed accounts.
    const allow = checkAllowlist(decoded);
    if (!allow.allowed) {
      return NextResponse.json({ error: 'Access denied', reason: allow.reason }, { status: 403 });
    }

    // Optional RBAC/scope gate for paywall-style access control
    // Disabled by default. Set POETIC_REQUIRED_SCOPE to enable (e.g., 'read:poetic_brain').
    const requiredScope = process.env.POETIC_REQUIRED_SCOPE || '';
    if (requiredScope && typeof requiredScope === 'string') {
      const scopes: string[] = (() => {
        const s = (decoded as any)?.scope;
        if (typeof s === 'string') return s.split(/\s+/).filter(Boolean);
        const p = (decoded as any)?.permissions;
        if (Array.isArray(p)) return p.map(String);
        return [];
      })();
      if (!scopes.includes(requiredScope)) {
        return NextResponse.json({ error: 'Forbidden: missing permission', required: requiredScope }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const prompt = body?.prompt;
    if (!prompt) {
      return NextResponse.json({ error: 'A "prompt" is required in the request body.' }, { status: 400 });
    }

    const { callPerplexity } = await import('../../../lib/llm');
    
    // Use full Raven protocol with Context Gate → Auto-Execute mandate
    // This ensures Raven executes the reading after identity confirmation
    // instead of punting the conversation back to the user
    const personaHook = buildRavenSystemPrompt();

    const poeticResponse = await callPerplexity(prompt, {
      model: process.env.POETIC_BRAIN_MODEL || 'sonar-pro',
      personaHook,
    });

    if (!poeticResponse || poeticResponse.includes('[ERROR:')) {
      throw new Error('The muse is silent or the connection to the poetic realm is unstable.');
    }

    return NextResponse.json({ response: poeticResponse.trim(), author: 'Raven Calder - Poetic Brain' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'The poetic muse encountered an unexpected disturbance.' }, { status: 500 });
  }
}
