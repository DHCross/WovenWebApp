"use client";
import React, { useEffect, useState } from 'react';

type Auth0Client = {
  isAuthenticated: () => Promise<boolean>;
  handleRedirectCallback: () => Promise<void>;
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

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        const config = await res.json();
        if (!config?.domain || !config?.clientId) {
          throw new Error('Invalid Auth0 config');
        }

        const creator = window.auth0?.createAuth0Client || window.createAuth0Client;
        if (typeof creator !== 'function') {
          throw new Error('Auth0 SDK not available after load');
        }

        const redirect_uri = window.location.origin + '/chat';
        const client = await creator({
          domain: (config.domain as string).replace(/^https?:\/\//, ''),
          clientId: config.clientId,
          authorizationParams: { redirect_uri }
        });

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
