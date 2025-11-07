"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getRedirectUri, normalizeAuth0Audience, normalizeAuth0ClientId, normalizeAuth0Domain } from '../lib/auth';
import { persistAuthStatus } from '../lib/authStatus';

type Auth0Client = {
  isAuthenticated: () => Promise<boolean>;
  handleRedirectCallback: () => Promise<{ appState?: Record<string, any> } | void>;
  loginWithRedirect: (opts?: any) => Promise<void>;
  getUser: () => Promise<any>;
};

declare global {
  interface Window {
    createAuth0Client?: (config: any) => Promise<Auth0Client>;
    auth0?: {
      createAuth0Client?: (config: any) => Promise<Auth0Client>;
    };
  }
}

const authEnabled = (() => {
  const raw = process.env.NEXT_PUBLIC_ENABLE_AUTH;
  const isProduction = process.env.NODE_ENV === 'production';
  if (typeof raw !== 'string') return isProduction;
  const normalized = raw.trim().toLowerCase();
  if (normalized === '') return isProduction;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return isProduction;
})();

function resolveReturnTo(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      if (parsed.origin !== window.location.origin) {
        return null;
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch (err) {
    console.warn('Failed to normalize Auth0 return path', err);
    return null;
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;
  return normalized || '/';
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);
  const clientRef = useRef<Auth0Client | null>(null);
  const loginAttemptedRef = useRef(false);

  const attemptLogin = useCallback(async () => {
    if (!authEnabled) return;
    const client = clientRef.current;
    if (!client) {
      setError('Auth client not ready.');
      return;
    }

    setError(null);
    setLoginPending(true);
    try {
      const target = `${window.location.pathname}${window.location.search}${window.location.hash}` || '/chat';
      await client.loginWithRedirect({
        authorizationParams: {
          redirect_uri: getRedirectUri(),
        },
        appState: {
          returnTo: target,
        },
      });
    } catch (e: any) {
      console.error('Auth redirect failed', e);
      setError(e?.message || 'Failed to start login');
    } finally {
      setLoginPending(false);
    }
  }, []);

  useEffect(() => {
    if (!authEnabled) return; // Skip auth logic if disabled

    let cancelled = false;

    async function init() {
      try {
        // Load the local Auth0 SPA SDK (served from Next.js public as /vendor)
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
        }

        // Fetch Auth0 config from Netlify function
        const res = await fetch('/api/auth-config');
        if (!res.ok) throw new Error(`Auth config failed: ${res.status}`);
        const config = await res.json();
        const domain = normalizeAuth0Domain(config?.domain);
        const clientId = normalizeAuth0ClientId(config?.clientId);
        const audience = normalizeAuth0Audience(config?.audience ?? null);
        if (!domain || !clientId) {
          throw new Error('Invalid Auth0 config');
        }

        const creator = window.auth0?.createAuth0Client || window.createAuth0Client;
        if (typeof creator !== 'function') {
          throw new Error('Auth0 SDK not available after load');
        }

        const redirect_uri = getRedirectUri();
        const authorizationParams: Record<string, any> = { redirect_uri };
        if (audience) {
          authorizationParams.audience = audience;
        }
        const client = await creator({
          domain,
          clientId,
          cacheLocation: 'localstorage',
          useRefreshTokens: true,
          useRefreshTokensFallback: true,
          authorizationParams,
        } as any);

        clientRef.current = client;

        let returnTo: string | null = null;

        // Handle callback if present
        const qs = window.location.search;
        if (qs.includes('code=') && qs.includes('state=')) {
          const result = await client.handleRedirectCallback();
          const url = new URL(window.location.href);
          url.search = '';
          window.history.replaceState({}, '', url.toString());
          returnTo = resolveReturnTo((result as any)?.appState?.returnTo);
        }

        const isAuthed = await client.isAuthenticated();
        let name: string | null = null;
        if (isAuthed) {
          try {
            const u = await client.getUser();
            name = u?.name || u?.email || null;
          } catch (err) {
            console.warn('Failed to load Auth0 user profile', err);
          }
        }

        if (!cancelled) {
          setAuthed(isAuthed);
          setReady(true);
          persistAuthStatus(isAuthed, name);

          if (isAuthed && returnTo) {
            window.location.replace(returnTo);
            return;
          }
        }

        if (!isAuthed && !cancelled) {
          if (!loginAttemptedRef.current) {
            loginAttemptedRef.current = true;
            await attemptLogin();
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Auth error');
          setReady(true);
          persistAuthStatus(false, null);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [attemptLogin]);

  if (!authEnabled) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="grid place-items-center h-screen text-slate-400">
        Connecting…
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid place-items-center h-screen px-6">
        <div className="max-w-md space-y-4 text-center text-slate-300">
          <h2 className="text-lg font-semibold text-slate-100">Sign-in required</h2>
          <p className="text-sm text-slate-400">
            We could not verify your Auth0 session: {error}. Try signing in again below.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={attemptLogin}
              disabled={loginPending}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${loginPending ? 'bg-slate-700/60 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'}`}
            >
              {loginPending ? 'Redirecting…' : 'Continue with Google'}
            </button>
            <a
              href="/"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Return to Math Brain
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="grid place-items-center h-screen text-slate-400">
        {loginPending ? 'Redirecting to Auth0…' : 'Preparing secure login…'}
      </div>
    );
  }

  return <>{children}</>;
}
