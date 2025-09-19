"use client";
import React, { useEffect, useRef, useState } from "react";
import { getRedirectUri } from "../lib/auth";

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

export default function HomeHero() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [authCfg, setAuthCfg] = useState<{domain?: string; clientId?: string} | null>(null);
  const enableDev = typeof window !== 'undefined' && String(process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS) === 'true';
  const clientRef = useRef<Auth0Client | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Safety timeout so UI doesn't appear stuck if functions or SDK never resolve
    const safety = setTimeout(() => {
      if (!cancelled) {
        setError((prev) => prev || "Auth init slow or unavailable");
        setReady(true);
      }
    }, 5000);
    async function init() {
      try {
        // Load Auth0 SPA SDK (served from public/vendor)
        const hasCreate = typeof window.auth0?.createAuth0Client === 'function' || typeof window.createAuth0Client === 'function';
        if (!hasCreate) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "/vendor/auth0-spa-js.production.js";
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load Auth0 SDK"));
            document.head.appendChild(s);
          });
        }

        // Fetch public Auth0 config (proxied to Netlify function)
        let config: any;
        try {
          const res = await fetch("/api/auth-config", { cache: "no-store" });
          if (!res.ok) {
            throw new Error(`Auth config failed: ${res.status} ${res.statusText}`);
          }
          config = await res.json();
          console.log("Auth config received:", config);
          if (!cancelled) setAuthCfg({ domain: config?.domain, clientId: config?.clientId });
        } catch (fetchError) {
          // Fallback for development when Netlify functions aren't available
          console.warn("Could not fetch auth config, using development fallback:", fetchError);
          if (!cancelled) {
            setError("Auth not available (functions not running)");
            setReady(true);
          }
          return;
        }
        
        if (!config?.domain || !config?.clientId) {
          throw new Error("Invalid Auth0 config - missing domain or clientId");
        }

        const creator = window.auth0?.createAuth0Client || window.createAuth0Client;
        if (typeof creator !== 'function') {
          throw new Error('Auth0 SDK not available after load');
        }
        const client = await creator({
          domain: String(config.domain).replace(/^https?:\/\//, ""),
          clientId: config.clientId,
          authorizationParams: { redirect_uri: getRedirectUri() },
        });
        clientRef.current = client;
        console.log('🔐 Auth0 client initialized successfully');

        // Handle callback once (if coming back from Auth0)
        const qs = window.location.search;
        console.log('🔐 Current URL search params:', qs);
        if (qs.includes("code=") && qs.includes("state=")) {
          console.log('🔐 Auth callback detected on HomeHero, attempting to process...');
          try {
            await client.handleRedirectCallback();
            console.log('🔐 Callback handled successfully');
          } catch (callbackError: any) {
            // Do not crash the hero if callback was initiated for a different path or state is missing
            console.warn('🔐 Callback handling failed (non-fatal on HomeHero):', callbackError?.message || callbackError);
          } finally {
            // Always clean URL to remove auth params
            const url = new URL(window.location.href);
            url.search = "";
            window.history.replaceState({}, "", url.toString());
            console.log('🔐 URL cleaned up');
          }
        }

        const isAuthed = await client.isAuthenticated();
        console.log('🔐 Authentication check result:', isAuthed);
        let name: string | null = null;
        if (isAuthed) {
          try {
            const u = await client.getUser();
            name = u?.name || u?.email || null;
            console.log('🔐 User info retrieved:', { name, email: u?.email });
          } catch (userError) {
            console.error('🔐 Failed to get user info:', userError);
          }
        }

        if (!cancelled) {
          setUserName(name);
          setAuthed(isAuthed);
          setReady(true);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Auth init failed");
          setReady(true);
        }
      }
    }
    init();
    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, []);

  const loginWithGoogle = async () => {
    console.log('🔐 Google login clicked');
    console.log('🔐 Client ref:', clientRef.current);
    console.log('🔐 Redirect URI:', getRedirectUri());
    
    if (!clientRef.current) {
      console.error('🔐 Auth0 client not initialized');
      setError('Auth0 client not initialized');
      return;
    }
    
    try {
      console.log('🔐 Calling loginWithRedirect...');
      await clientRef.current.loginWithRedirect({
        authorizationParams: {
          redirect_uri: getRedirectUri(),
          // If the Google connection is configured in Auth0, this triggers the Google login directly
          // Remove this line if you prefer the Universal Login page
          connection: "google-oauth2",
        },
      });
    } catch (e) {
      console.error('🔐 Login error:', e);
      setError((e as any)?.message || "Login failed");
    }
  };

  console.log('🔐 HomeHero render - ready:', ready, 'authed:', authed, 'error:', error);

  return (
    <section className="mt-8">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Start with Math Brain</h2>
        <p className="mt-2 text-slate-400">
          Run the geometry first. Then, once you’re signed in, jump into Chat to synthesize the narrative.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/math-brain?report=balance"
            className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
            title="Open Math Brain with Balance Meter"
          >
            Open Math Brain (Astro Reports)
          </a>

          {ready && authed ? (
            <a
              href="/chat"
              className="rounded-md px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500"
              title="Open Poetic Brain (Chat)"
            >
              Open Poetic Brain
            </a>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 hover:bg-slate-700"
              title="Sign in to enable Poetic Brain"
            >
              Continue with Google
            </button>
          )}

          {!ready && (
            <span className="rounded-md bg-slate-800 px-4 py-2 text-slate-400" aria-live="polite">Loading auth…</span>
          )}
        </div>

        {authed && (
          <p className="mt-3 text-xs text-slate-500">Signed in{userName ? ` as ${userName}` : ""}. Chat is now enabled.</p>
        )}
        {error && (
          <p className="mt-3 text-xs text-rose-400">{error}</p>
        )}
        {enableDev && authCfg && (
          <p className="mt-2 text-[11px] text-slate-500">
            Auth config • domain: <span className="text-slate-300">{authCfg.domain || '—'}</span> • client: <span className="text-slate-300">{authCfg.clientId ? String(authCfg.clientId).slice(0,4) + '…' : '—'}</span>
          </p>
        )}
      </div>
    </section>
  );
}
