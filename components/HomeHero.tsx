"use client";
/* eslint-disable no-console */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getRedirectUri, normalizeAuth0Audience, normalizeAuth0ClientId, normalizeAuth0Domain } from "../lib/auth";

const authEnabled = (() => {
  const raw = process.env.NEXT_PUBLIC_ENABLE_AUTH;
  if (typeof raw !== "string") return true;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "" || normalized === "false" || normalized === "0") {
    return false;
  }
  return true;
})();
const poeticBrainEnabled = (() => {
  const raw = process.env.NEXT_PUBLIC_ENABLE_POETIC_BRAIN;
  if (typeof raw !== 'string') return true;
  const normalized = raw.trim().toLowerCase();
  if (normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  return false;
})();

const AUTH_STATUS_STORAGE_KEY = 'auth.status';
const AUTH_STATUS_EVENT = 'auth-status-change';

export default function HomeHero() {
  const authDisabled = !authEnabled;
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [authCfg, setAuthCfg] = useState<{domain?: string; clientId?: string; audience?: string | null} | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // Tiny debug flags to surface why login might be inert
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [enableDev, setEnableDev] = useState(false);
  const clientRef = useRef<Auth0Client | null>(null);

  const persistAuthState = useCallback((authedValue: boolean, nameValue: string | null) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const payload = {
        authed: authedValue,
        user: nameValue,
        updatedAt: Date.now(),
      };
      window.localStorage.setItem(AUTH_STATUS_STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent(AUTH_STATUS_EVENT, { detail: payload }));
    } catch (err) {
      // Silent failure – auth should still work without persistence
      console.warn('Auth status persistence failed', err);
    }
  }, []);

  // Set dev tools flag on client side only to avoid hydration mismatch
  useEffect(() => {
    setEnableDev(String(process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS) === 'true');
  }, []);

  useEffect(() => {
    if (authDisabled) {
      setReady(true);
      setAuthed(true);
      persistAuthState(true, null);
      return;
    }
    let cancelled = false;
    // Safety timeout so UI doesn't appear stuck if functions or SDK never resolve
    const safety = setTimeout(() => {
      if (!cancelled) {
        setError((prev) => prev || "Auth is taking longer than expected (this is usually normal)");
        setReady(true);
      }
    }, 8000);
    async function init() {
      try {
        const startTime = Date.now();
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
        console.log(`Auth0 SDK loaded in ${Date.now() - startTime}ms`);
        setSdkLoaded(true);

        // Fetch public Auth0 config (proxied to Netlify function)
        let config: any;
        try {
          const configStartTime = Date.now();
          const res = await fetch("/api/auth-config", { cache: "no-store" });
          if (!res.ok) {
            throw new Error(`Auth config failed: ${res.status} ${res.statusText}`);
          }
          config = await res.json();
          const normalizedDomain = normalizeAuth0Domain(config?.domain);
          const normalizedClientId = normalizeAuth0ClientId(config?.clientId);
          const normalizedAudience = normalizeAuth0Audience(config?.audience ?? null);
          if (!normalizedDomain || !normalizedClientId) {
            throw new Error("Invalid Auth0 config - missing domain or clientId");
          }
          console.log(`Auth config fetched in ${Date.now() - configStartTime}ms:`, {
            domain: normalizedDomain,
            clientId: normalizedClientId ? `${normalizedClientId.slice(0, 4)}…` : null,
            hasAudience: Boolean(normalizedAudience),
          });
          if (!cancelled) {
            setAuthCfg({ domain: normalizedDomain, clientId: normalizedClientId, audience: normalizedAudience });
          }
          config = {
            ...config,
            domain: normalizedDomain,
            clientId: normalizedClientId,
            audience: normalizedAudience,
          };
        } catch (fetchError) {
          // Fallback for development when Netlify functions aren't available
          console.warn("Could not fetch auth config, using development fallback:", fetchError);
          if (!cancelled) {
            setError("Auth not available (functions not running)");
            setReady(true);
          }
          return;
        }

        const creator = window.auth0?.createAuth0Client || window.createAuth0Client;
        if (typeof creator !== 'function') {
          throw new Error('Auth0 SDK not available after load');
        }
        const normalizedDomain = normalizeAuth0Domain(config?.domain);
        const normalizedClientId = normalizeAuth0ClientId(config?.clientId);
        const normalizedAudience = normalizeAuth0Audience(config?.audience ?? null);
        if (!normalizedDomain || !normalizedClientId) {
          throw new Error('Invalid Auth0 config - missing domain or clientId');
        }
        const authorizationParams: Record<string, any> = {
          redirect_uri: getRedirectUri(),
        };
        if (normalizedAudience) {
          authorizationParams.audience = normalizedAudience;
        }
        const client = await creator({
          domain: normalizedDomain,
          clientId: normalizedClientId,
          cacheLocation: 'localstorage',
          useRefreshTokens: true,
          useRefreshTokensFallback: true,
          authorizationParams,
        } as Auth0ClientOptions);
        clientRef.current = client;
        setClientReady(true);

        // Handle callback once (if coming back from Auth0)
        const qs = window.location.search;
        if (qs.includes("code=") && qs.includes("state=")) {
          await client.handleRedirectCallback();
          const url = new URL(window.location.href);
          url.search = "";
          window.history.replaceState({}, "", url.toString());
        }

        const isAuthed = await client.isAuthenticated();
        let name: string | null = null;
        if (isAuthed) {
          try {
            const u = await client.getUser();
            name = u?.name || u?.email || null;
          } catch {}
        }

        if (!cancelled) {
          console.log(`Auth initialization completed in ${Date.now() - startTime}ms`);
          setUserName(name);
          setAuthed(isAuthed);
          setReady(true);
          persistAuthState(isAuthed, name);
          clearTimeout(safety); // Clear timeout since we completed successfully
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Auth init failed");
          setReady(true);
        }
      }
    }
    if (!authDisabled) {
      init();
    }
    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, [authDisabled, persistAuthState]);

  const loginWithGoogle = async () => {
    // Guard against inert click if client hasn't initialized yet
    if (authDisabled) {
      window.location.assign('/chat');
      return;
    }
    if (!clientRef.current) {
      setError("Auth not ready yet. One moment, then try again. If this persists, open /debug-auth.");
      return;
    }
    try {
      setIsLoggingIn(true);
      const params: Record<string, any> = {
        redirect_uri: getRedirectUri(),
        // If the Google connection is configured in Auth0, this triggers the Google login directly
        // Remove this line if you prefer the Universal Login page
        connection: "google-oauth2",
      };
      if (authCfg?.audience) {
        params.audience = authCfg.audience;
      }
      await clientRef.current.loginWithRedirect({
        authorizationParams: params,
      });
    } catch (e) {
      setError((e as any)?.message || "Login failed");
    } finally {
      // If we successfully redirected, this won't run. If it failed, we re-enable.
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    if (authDisabled || !clientRef.current) return;
    try {
      await clientRef.current.logout?.({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
      persistAuthState(false, null);
    } catch (e) {
      console.error("Logout failed", e);
      // Fallback: clear local state and reload
      setAuthed(false);
      setUserName(null);
      persistAuthState(false, null);
      window.location.reload();
    }
  };

  return (
    <section className="mt-8">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Start with Math Brain</h2>
        <p className="mt-2 text-slate-400">
          Run the geometry first. Then, once you’re signed in, jump into Chat to synthesize the narrative.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/math-brain?report=mirror"
            className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
            title="Open Math Brain with Mirror"
          >
            Open Math Brain (Astro Reports)
          </a>

          {poeticBrainEnabled ? (
            ready && authed ? (
              <a
                href="/chat"
                className="rounded-md px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500"
                title="Open Poetic Brain (Chat)"
              >
                Open Poetic Brain
              </a>
            ) : null
          ) : (
            <div className="rounded-md border border-slate-700 bg-slate-900/60 px-4 py-2 text-left text-slate-300">
              <p className="text-sm font-medium text-slate-100">Poetic Brain is currently offline.</p>
              <p className="mt-1 text-xs text-slate-400">You can still generate Math Brain reports below; Raven&rsquo;s chat mirror will return once the Gemini/Auth0 integration is stable.</p>
            </div>
          )}

          {authEnabled && !authed && (
            <button
              onClick={loginWithGoogle}
              disabled={!ready || !clientRef.current || isLoggingIn}
              className={`rounded-md border border-slate-700 px-4 py-2 text-slate-100 ${(!ready || !clientRef.current || isLoggingIn) ? 'bg-slate-700/60 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'}`}
              title="Sign in to enable Poetic Brain"
            >
              {isLoggingIn ? 'Redirecting…' : 'Continue with Google'}
            </button>
          )}

          {!ready && (
            <span className="rounded-md bg-slate-800 px-4 py-2 text-slate-400" aria-live="polite">Loading auth…</span>
          )}
        </div>

        {authed && poeticBrainEnabled && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">Signed in{userName ? ` as ${userName}` : ""}. Chat is now enabled.</p>
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-slate-300 underline"
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        )}
        {error && (
          <p className="mt-3 text-xs text-rose-400">{error}</p>
        )}
        {enableDev && (
          <p className="mt-2 text-[11px] text-slate-500">
            Auth init • sdk: <span className="text-slate-300">{String(sdkLoaded)}</span> • client: <span className="text-slate-300">{String(clientReady)}</span>
            {authCfg && (
              <> • domain: <span className="text-slate-300">{authCfg.domain || '—'}</span> • client: <span className="text-slate-300">{authCfg.clientId ? String(authCfg.clientId).slice(0,4) + '…' : '—'}</span>{authCfg.audience ? <> • audience: <span className="text-slate-300">{authCfg.audience}</span></> : null}</>
            )}
            {' '}• <a href="/debug-auth" className="underline hover:text-slate-300">debug-auth</a>
          </p>
        )}
        {enableDev && authCfg && (
          <p className="mt-2 text-[11px] text-slate-500">
            Auth config • domain: <span className="text-slate-300">{authCfg.domain || '—'}</span> • client: <span className="text-slate-300">{authCfg.clientId ? String(authCfg.clientId).slice(0,4) + '…' : '—'}</span>{authCfg.audience ? <> • audience: <span className="text-slate-300">{authCfg.audience}</span></> : null}
          </p>
        )}
      </div>
    </section>
  );
}
