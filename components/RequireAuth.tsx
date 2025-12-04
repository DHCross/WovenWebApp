"use client";
import React, { useEffect, useState } from 'react';
import { getRedirectUri, normalizeAuth0Audience, normalizeAuth0ClientId, normalizeAuth0Domain } from '../lib/auth';

const AUTH_STATUS_KEY = 'auth.status';
const AUTH_TOKEN_KEY = 'auth.token';

const persistAuthState = (
  state: { authed: boolean; userId?: string | null; token?: string | null },
): void => {
  if (typeof window === 'undefined') return;

  try {
    const payload = {
      authed: state.authed,
      updatedAt: Date.now(),
      ...(state.userId ? { userId: state.userId } : {}),
    };
    window.localStorage.setItem(AUTH_STATUS_KEY, JSON.stringify(payload));
  } catch {
    // Ignore localStorage failures so auth flow can continue
  }

  try {
    if (state.authed && state.token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, state.token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore token storage errors
  }
};

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

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          authorizationParams
        } as Auth0ClientOptions);

        // Handle callback if present
        const qs = window.location.search;
        if (qs.includes('code=') && qs.includes('state=')) {
          await client.handleRedirectCallback();
          // Clean URL after callback
          const url = new URL(window.location.href);
          url.search = '';
          window.history.replaceState({}, '', url.toString());
        }

        const isAuthed = await client.isAuthenticated();
        let userId: string | null = null;
        let token: string | null = null;

        if (isAuthed) {
          try {
            const user = await client.getUser();
            userId = user?.sub ?? null;
          } catch {
            userId = null;
          }

          try {
            token = await client.getTokenSilently({ detailedResponse: false } as any);
          } catch {
            token = null;
          }
        }

        persistAuthState({ authed: isAuthed, userId, token });

        if (!cancelled) {
          setAuthed(isAuthed);
          setReady(true);
        }

        if (!isAuthed) {
          // Redirect to home to login (Math Brain page has the login entry)
          window.location.replace('/');
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Auth error');
          setReady(true);
          persistAuthState({ authed: false });
          // Fallback: send back to home
          window.location.replace('/');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

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
  if (!authed) return null; // we redirected
  if (error) return null;
  return <>{children}</>;
}
