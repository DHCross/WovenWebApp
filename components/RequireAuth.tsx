"use client";
import React, { useEffect, useState } from 'react';
import { createAuth0Client, Auth0Client, Auth0ClientOptions } from '@auth0/auth0-spa-js';
import { getRedirectUri, normalizeAuth0Audience, normalizeAuth0ClientId, normalizeAuth0Domain } from '../lib/auth';

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

        const redirect_uri = getRedirectUri();
        const authorizationParams: Record<string, any> = { redirect_uri };
        if (audience) {
          authorizationParams.audience = audience;
        }

        const client = await createAuth0Client({
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

        if (isAuthed) {
          // Refresh the token to ensure we have a valid one
          try {
            await client.getTokenSilently({
              authorizationParams: {
                audience: audience || undefined,
                scope: 'openid profile email'
              }
            });
          } catch (tokenError) {
            console.warn('Failed to refresh token silently:', tokenError);
            // If silent refresh fails, we might need to re-login, but for now let's proceed
            // or we could set isAuthed = false;
          }
        }

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
