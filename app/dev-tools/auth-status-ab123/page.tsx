"use client";
export const dynamic = 'force-dynamic';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getRedirectUri } from '../../../lib/auth';

// Hidden diagnostics page for Auth0 SPA SDK integration.
// Access is gated by NEXT_PUBLIC_ENABLE_DEV_TOOLS (client-only) to avoid exposing details in prod.
// This page does not reveal secrets; it only surfaces the same public config returned by /api/auth-config
// and the current client state (isAuthenticated, user profile preview).

// Types kept minimal to avoid importing SDK types
 type Auth0Client = {
  isAuthenticated: () => Promise<boolean>;
  handleRedirectCallback: () => Promise<void>;
  loginWithRedirect: (opts?: any) => Promise<void>;
  getUser: () => Promise<any>;
};

declare global {
  interface Window {
    createAuth0Client?: (config: any) => Promise<Auth0Client>;
    auth0?: { createAuth0Client?: (config: any) => Promise<Auth0Client> };
  }
}

export default function AuthDebugPage() {
  const enabled = typeof window !== 'undefined' && String(process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS) === 'true';
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [clientState, setClientState] = useState<{ created: boolean; authed: boolean; user?: any; error?: string }>({ created: false, authed: false });
  const [source, setSource] = useState<'vendor'|'unknown'>('unknown');
  const [ready, setReady] = useState(false);
  const [devKey, setDevKey] = useState('');
  const [serverEnv, setServerEnv] = useState<any>(null);
  const [serverEnvError, setServerEnvError] = useState<string | null>(null);
  const clientRef = useRef<Auth0Client | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        // Try to detect SDK
        const hasCreate = typeof window.auth0?.createAuth0Client === 'function' || typeof window.createAuth0Client === 'function';
        if (!hasCreate) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = '/vendor/auth0-spa-js.production.js';
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load Auth0 SDK'));
            document.head.appendChild(s);
          });
          setSource('vendor');
        } else {
          setSource('vendor');
        }
        setSdkLoaded(true);

        const res = await fetch('/api/auth-config', { cache: 'no-store' });
        if (!res.ok) throw new Error(`auth-config failed: ${res.status}`);
        const cfg = await res.json();
        if (!cancelled) setConfig(cfg);
        if (!cfg?.domain || !cfg?.clientId) {
          if (!cancelled) {
            setClientState((s) => ({ ...s, error: 'Auth config present but missing domain/clientId' }));
            setReady(true);
          }
          return;
        }

        const creator = window.auth0?.createAuth0Client || window.createAuth0Client;
        if (typeof creator !== 'function') throw new Error('Auth0 SDK not available');
        const client = await creator({
          domain: String(cfg.domain).replace(/^https?:\/\//, ''),
          clientId: cfg.clientId,
          authorizationParams: { redirect_uri: getRedirectUri() },
        });
        clientRef.current = client;
        if (!cancelled) setClientState((s) => ({ ...s, created: true }));

        // Handle callback
        const qs = window.location.search;
        if (qs.includes('code=') && qs.includes('state=')) {
          try { await client.handleRedirectCallback(); } catch {}
          const url = new URL(window.location.href); url.search = ''; window.history.replaceState({}, '', url.toString());
        }

        const authed = await client.isAuthenticated();
        let user: any = undefined;
        if (authed) {
          try { user = await client.getUser(); } catch {}
        }
        if (!cancelled) setClientState((s) => ({ ...s, authed, user }));
      } catch (e: any) {
        if (!cancelled) setClientState((s) => ({ ...s, error: e?.message || 'init failed' }));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  if (!enabled) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-md border border-slate-700 bg-slate-900/50 p-4 text-slate-300">
          Diagnostics disabled. Set NEXT_PUBLIC_ENABLE_DEV_TOOLS=true to enable.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-100">Auth0 Diagnostics</h1>
      <p className="mt-2 text-sm text-slate-400">Hidden page — surface SDK/config/auth state without exposing secrets.</p>

      <section className="mt-6 rounded-md border border-slate-700 bg-slate-800/60 p-4">
        <h2 className="text-sm font-medium text-slate-200">SDK & Config</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <div>SDK Loaded: <span className="font-mono">{String(sdkLoaded)}</span></div>
          <div>SDK Source: <span className="font-mono">{source}</span></div>
          <div>Config success: <span className="font-mono">{String(Boolean(config && (config.domain && config.clientId)))}</span></div>
          <div>Domain: <span className="font-mono">{config?.domain || '—'}</span></div>
          <div>ClientId: <span className="font-mono">{config?.clientId ? String(config.clientId).slice(0,4) + '…' : '—'}</span></div>
          <div>Audience: <span className="font-mono">{config?.audience || '—'}</span></div>
          <div>Ready: <span className="font-mono">{String(ready)}</span></div>
        </div>
      </section>

      <section className="mt-4 rounded-md border border-slate-700 bg-slate-800/60 p-4">
        <h2 className="text-sm font-medium text-slate-200">Client State</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <div>Client Created: <span className="font-mono">{String(clientState.created)}</span></div>
          <div>Authenticated: <span className="font-mono">{String(clientState.authed)}</span></div>
          <div>Error: <span className="font-mono">{clientState.error || '—'}</span></div>
        </div>
        {clientState.user && (
          <pre className="mt-3 max-h-64 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-200">{JSON.stringify(clientState.user, null, 2)}</pre>
        )}
      </section>

      <section className="mt-4 rounded-md border border-slate-700 bg-slate-800/60 p-4">
        <h2 className="text-sm font-medium text-slate-200">Expected Dashboard URLs</h2>
        <ul className="mt-2 list-disc pl-6 text-sm text-slate-300 space-y-1">
          <li>Callback: http://localhost:4000/math-brain, http://localhost:8888/math-brain, https://&lt;site&gt;.netlify.app/math-brain, https://ravencalder.com/math-brain</li>
          <li>Web Origins: http://localhost:4000, http://localhost:8888, https://&lt;site&gt;.netlify.app, https://ravencalder.com</li>
          <li>Logout URLs: http://localhost:4000/, http://localhost:8888/, https://&lt;site&gt;.netlify.app/, https://ravencalder.com/</li>
        </ul>
        <p className="mt-2 text-xs text-slate-400">Compare these with your Auth0 Application settings. Wildcards must cover full subdomains.</p>
      </section>

      <section className="mt-4 rounded-md border border-slate-700 bg-slate-800/60 p-4">
        <h2 className="text-sm font-medium text-slate-200">Computed redirect_uri (login)</h2>
  <div className="mt-2 text-sm text-slate-300 font-mono">{getRedirectUri()}</div>
      </section>

      <section className="mt-4 rounded-md border border-slate-700 bg-slate-800/60 p-4">
        <h2 className="text-sm font-medium text-slate-200">Server env snapshot (secure)</h2>
        <p className="mt-1 text-xs text-slate-400">Requires ENABLE_DEV_TOOLS on server and a valid secret key. Values are redacted.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="password"
            placeholder="Dev tools secret key"
            className="w-full sm:w-80 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            value={devKey}
            onChange={(e)=>setDevKey(e.target.value)}
          />
          <button
            onClick={async ()=>{
              setServerEnv(null);
              setServerEnvError(null);
              try {
                const res = await fetch('/api/debug-env', { headers: { 'x-devtools-key': devKey || '' }, cache: 'no-store' });
                const json = await res.json();
                if (!res.ok || json?.success === false) {
                  throw new Error(json?.error || `Request failed: ${res.status}`);
                }
                setServerEnv(json);
              } catch (e: any) {
                setServerEnvError(e?.message || 'Failed to fetch snapshot');
              }
            }}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            disabled={!devKey}
          >
            Fetch snapshot
          </button>
        </div>
        {serverEnvError && <p className="mt-2 text-xs text-rose-400">{serverEnvError}</p>}
        {serverEnv && (
          <pre className="mt-3 max-h-64 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-200">{JSON.stringify(serverEnv, null, 2)}</pre>
        )}
      </section>
    </main>
  );
}
