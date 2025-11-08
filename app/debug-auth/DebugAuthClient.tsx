"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeAuth0Audience, normalizeAuth0ClientId, normalizeAuth0Domain } from "@/lib/auth";

function nowISO() {
  return new Date().toISOString();
}

export default function DebugAuthClient() {
  const [running, setRunning] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState<boolean | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [clientReady, setClientReady] = useState<boolean | null>(null);
  const [callbackHandled, setCallbackHandled] = useState<boolean | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<{ t: string; msg: string; level?: "info" | "warn" | "error" }>>([]);
  const clientRef = useRef<Auth0Client | null>(null);

  const log = useCallback((msg: string, level: "info" | "warn" | "error" = "info") => {
    setLogs((l) => [...l, { t: nowISO(), msg, level }]);
    const line = `[debug-auth] ${msg}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }, []);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    setLogs([]);
    setSdkLoaded(null);
    setClientReady(null);
    setCallbackHandled(null);
    setIsAuthed(null);
    setUser(null);

    try {
      log('Starting debug run…');
      // 1) Load SDK if needed
      const hasCreate = typeof window.auth0?.createAuth0Client === 'function' || typeof window.createAuth0Client === 'function';
      if (!hasCreate) {
        log("Loading Auth0 SPA SDK from /vendor/auth0-spa-js.production.js…");
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = '/vendor/auth0-spa-js.production.js';
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Failed to load Auth0 SDK'));
          document.head.appendChild(s);
        });
      } else {
        log("Auth0 SDK already present");
      }
      setSdkLoaded(true);

      // 2) Fetch config
      log("Fetching /api/auth-config…");
      const res = await fetch('/api/auth-config', { cache: 'no-store' });
      if (!res.ok) throw new Error(`auth-config HTTP ${res.status}`);
      const cfg = await res.json();
      const domain = normalizeAuth0Domain(cfg?.domain);
      const clientId = normalizeAuth0ClientId(cfg?.clientId);
      const audience = normalizeAuth0Audience(cfg?.audience ?? null);
      setConfig({ domain: domain || null, clientId: clientId || null });
      log(`Config: domain=${domain || '—'} clientId=${clientId ? `${clientId.slice(0,4)}…` : '—'}`);
      if (!domain || !clientId) throw new Error('Invalid Auth0 config');

      // 3) Create client
      const creator = window.auth0?.createAuth0Client || window.createAuth0Client;
      if (typeof creator !== 'function') throw new Error('Auth0 SDK not available after load');
      log('Creating Auth0 client…');
      const redirect_uri = window.location.origin + '/math-brain';
      const client = await creator({
        domain,
        clientId,
        authorizationParams: {
          redirect_uri,
          ...(audience ? { audience } : {}),
        }
      } as Auth0ClientOptions);
      clientRef.current = client;
      setClientReady(true);

      // 4) Handle callback if present
      if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        log('Handling redirect callback…');
        await client.handleRedirectCallback();
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url.toString());
        setCallbackHandled(true);
        log('Callback handled');
      } else {
        setCallbackHandled(false);
      }

      // 5) Check session
      log('Checking isAuthenticated()…');
      const authed = await client.isAuthenticated();
      setIsAuthed(authed);
      if (authed) {
        try {
          const u = await client.getUser();
          setUser(u);
          log('User loaded');
        } catch (e: any) {
          log(`getUser failed: ${e?.message || String(e)}`, 'warn');
        }
      } else {
        log('Not authenticated');
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      log(`ERROR: ${msg}`, 'error');
    } finally {
      setRunning(false);
    }
  }, [log, running]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => ({
    timestamp: nowISO(),
    location: typeof window !== 'undefined' ? window.location.href : null,
    sdkLoaded,
    config,
    clientReady,
    callbackHandled,
    isAuthed,
    user,
    error,
    logs
  }), [sdkLoaded, config, clientReady, callbackHandled, isAuthed, user, error, logs]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
    } catch {}
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Auth Debug</h1>
      <p className="text-slate-400 mt-1">Loads SDK, fetches config, creates client, handles callback, and checks session.</p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={run}
          disabled={running}
          className={`rounded-md px-3 py-1.5 border ${running ? 'bg-slate-700/60 cursor-not-allowed border-slate-700 text-slate-300' : 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'}`}
        >{running ? 'Running…' : 'Run again'}</button>
        <button
          onClick={copy}
          className="rounded-md px-3 py-1.5 border bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
        >Copy summary JSON</button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3">
        <Row label="SDK Loaded" value={renderBool(sdkLoaded)} />
        <Row label="Config Domain" value={config?.domain || '—'} />
        <Row label="Config Client" value={config?.clientId ? String(config.clientId).slice(0,4)+'…' : '—'} />
        <Row label="Client Ready" value={renderBool(clientReady)} />
        <Row label="Callback Handled" value={renderBool(callbackHandled)} />
        <Row label="Authenticated" value={renderBool(isAuthed)} />
      </div>

      {!!error && (
        <p className="mt-3 text-sm text-rose-400">{error}</p>
      )}

      <h2 className="mt-6 text-lg font-medium">Details</h2>
      <pre className="mt-2 max-h-[360px] overflow-auto rounded border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-200 whitespace-pre-wrap break-words">{JSON.stringify(summary, null, 2)}</pre>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/40 px-3 py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="text-sm text-slate-100">{value}</span>
    </div>
  );
}

function renderBool(v: boolean | null) {
  if (v === null) return '—';
  return v ? 'true' : 'false';
}
