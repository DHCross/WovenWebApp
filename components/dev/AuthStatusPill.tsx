"use client";
import React, { useEffect, useState } from 'react';
import { getRedirectUri, normalizeAuth0Audience, normalizeAuth0ClientId, normalizeAuth0Domain } from '../../lib/auth';

type Auth0Client = { isAuthenticated: () => Promise<boolean>; getUser: () => Promise<any> };

export default function AuthStatusPill() {
  const [status, setStatus] = useState<'checking' | 'authed' | 'unauth' | 'error'>('checking');
  const [hint, setHint] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth-config', { cache: 'no-store' });
        if (!res.ok) throw new Error('auth-config failed');
        const cfg = await res.json();
        const domain = normalizeAuth0Domain(cfg?.domain);
        const clientId = normalizeAuth0ClientId(cfg?.clientId);
        const audience = normalizeAuth0Audience(cfg?.audience ?? null);
        if (!domain || !clientId) {
          if (!cancelled) { setStatus('error'); setHint('Missing AUTH0_* env'); }
          return;
        }
        const w: any = window as any;
        const creator = w?.auth0?.createAuth0Client || w?.createAuth0Client;
        if (typeof creator !== 'function') {
          if (!cancelled) { setStatus('error'); setHint('SDK not loaded'); }
          return;
        }
        const client = await creator({
          domain,
          clientId,
          cacheLocation: 'localstorage',
          useRefreshTokens: true,
          useRefreshTokensFallback: true,
          authorizationParams: {
            redirect_uri: getRedirectUri(),
            ...(audience ? { audience } : {}),
          }
        });
        const ok = await client.isAuthenticated();
        if (!cancelled) setStatus(ok ? 'authed' : 'unauth');
      } catch (e: any) {
        if (!cancelled) { setStatus('error'); setHint(e?.message || 'error'); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const cls = status === 'authed' ? 'bg-emerald-600' : status === 'unauth' ? 'bg-slate-600' : status === 'error' ? 'bg-red-700' : 'bg-slate-700';
  const label = status === 'authed' ? 'Auth: ok' : status === 'unauth' ? 'Auth: not signed in' : status === 'error' ? `Auth: error` : 'Auth: checking';

  return (
    <div className="mb-2 flex justify-center print:hidden">
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-white ${cls}`} title={hint}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
        <span>{label}</span>
      </span>
    </div>
  );
}
