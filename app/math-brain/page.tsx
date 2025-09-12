"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export const dynamic = "force-dynamic";

type Subject = {
  name: string;
  year: number | string;
  month: number | string;
  day: number | string;
  hour: number | string;
  minute: number | string;
  city: string;
  nation: string;
  latitude: number | string;
  longitude: number | string;
  timezone: string;
  zodiac_type: "Tropic" | "Sidereal" | string;
};

type ApiResult = Record<string, any> | null;

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <h2 className="text-lg font-medium text-slate-100">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function MathBrainPage() {
  const today = useMemo(() => new Date(), []);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const defaultStart = fmt(today);
  const defaultEnd = fmt(new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000));

  const [personA, setPersonA] = useState<Subject>({
    name: "Subject A",
    year: 1990,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    city: "New York",
    nation: "US",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "GMT",
    zodiac_type: "Tropic",
  });

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);
  const [mode, setMode] = useState<string>("NATAL_TRANSITS");
  const [step, setStep] = useState<string>("daily");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const authClientRef = useRef<Auth0Client | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function initAuth() {
      try {
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

        let config: any = null;
        try {
          const res = await fetch("/api/auth-config", { cache: "no-store" });
          if (!res.ok) throw new Error(`Auth config failed: ${res.status}`);
          config = await res.json();
        } catch (e) {
          // No functions in dev or missing env — auth stays disabled
          if (!cancelled) {
            setAuthReady(true);
          }
          return;
        }

        const creator = window.auth0?.createAuth0Client || window.createAuth0Client;
        if (typeof creator !== 'function') throw new Error('Auth0 SDK not available');
        const client = await creator({
          domain: String(config.domain).replace(/^https?:\/\//, ''),
          clientId: config.clientId,
          authorizationParams: { redirect_uri: window.location.origin + "/math-brain" },
        });
        authClientRef.current = client;

        const qs = window.location.search;
        if (qs.includes("code=") && qs.includes("state=")) {
          await client.handleRedirectCallback();
          const url = new URL(window.location.href);
          url.search = "";
          window.history.replaceState({}, "", url.toString());
        }

        const isAuthed = await client.isAuthenticated();
        if (!cancelled) {
          setAuthed(isAuthed);
          setAuthReady(true);
        }
      } catch {
        if (!cancelled) setAuthReady(true);
      }
    }
    initAuth();
    return () => { cancelled = true; };
  }, []);

  function sendToPoeticBrain() {
    if (!result) return;
    try {
      const payload = {
        timestamp: Date.now(),
        meta: {
          person: {
            name: personA.name,
            birthDate: `${personA.year}-${String(personA.month).padStart(2,'0')}-${String(personA.day).padStart(2,'0')}`,
            birthTime: `${String(personA.hour).padStart(2,'0')}:${String(personA.minute).padStart(2,'0')}`,
            birthLocation: `${personA.city}, ${personA.nation}`
          },
          context: `Mode: ${mode}; Transits: ${startDate} → ${endDate} (${step})`
        },
        reportData: result
      };
      sessionStorage.setItem('woven_report_for_raven', JSON.stringify(payload));
      window.location.href = '/chat';
    } catch {/* noop */}
  }

  const loginWithGoogle = async () => {
    try {
      await authClientRef.current?.loginWithRedirect({
        authorizationParams: {
          redirect_uri: window.location.origin + "/math-brain",
          connection: "google-oauth2",
        },
      });
    } catch (e) {
      // surface minimal error into the page banner
      setError((e as any)?.message || "Login failed");
    }
  };

  const canSubmit = useMemo(() => {
    // Basic local checks
    const required = [
      personA.name,
      personA.city,
      personA.nation,
      personA.timezone,
      personA.zodiac_type,
    ];
    const numbers = [
      Number(personA.year),
      Number(personA.month),
      Number(personA.day),
      Number(personA.hour),
      Number(personA.minute),
      Number(personA.latitude),
      Number(personA.longitude),
    ];
    const allPresent = required.every(Boolean) && numbers.every((n) => !Number.isNaN(n));
    return allPresent && Boolean(startDate) && Boolean(endDate);
  }, [personA, startDate, endDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        mode,
        personA: {
          ...personA,
          year: Number(personA.year),
          month: Number(personA.month),
          day: Number(personA.day),
          hour: Number(personA.hour),
          minute: Number(personA.minute),
          latitude: Number(personA.latitude),
          longitude: Number(personA.longitude),
        },
        transitStartDate: startDate,
        transitEndDate: endDate,
        transitStep: step,
      };

      const res = await fetch("/api/astrology-mathbrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        const msg = data?.error || `Request failed (${res.status})`;
        throw new Error(msg);
      }
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Math Brain</h1>
        <p className="mt-3 text-slate-400">
          Geometry first. Generate your chart math here, then head to Poetic Brain.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <a
          href="/"
          className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 hover:bg-slate-700"
        >
          Back Home
        </a>
        <a
          href="/index.html"
          className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Legacy Math Brain
        </a>
        {authReady && authed ? (
          <a
            href="/chat"
            className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
          >
            Continue to Poetic Brain
          </a>
        ) : (
          <button
            type="button"
            onClick={loginWithGoogle}
            className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 hover:bg-slate-700"
            title="Sign in to enable Poetic Brain"
          >
            Sign in to Continue
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-10 grid grid-cols-1 gap-6">
        <Section title="Person A (required)">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="a-name" className="block text-sm text-slate-300">Name</label>
              <input
                id="a-name"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={personA.name}
                onChange={(e) => setPersonA({ ...personA, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-5 gap-2">
              <div>
                <label htmlFor="a-year" className="block text-xs text-slate-300">Year</label>
                <input
                  id="a-year"
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100"
                  value={personA.year}
                  onChange={(e) => setPersonA({ ...personA, year: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="a-month" className="block text-xs text-slate-300">Month</label>
                <input
                  id="a-month"
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100"
                  value={personA.month}
                  onChange={(e) => setPersonA({ ...personA, month: e.target.value })}
                  min={1}
                  max={12}
                  required
                />
              </div>
              <div>
                <label htmlFor="a-day" className="block text-xs text-slate-300">Day</label>
                <input
                  id="a-day"
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100"
                  value={personA.day}
                  onChange={(e) => setPersonA({ ...personA, day: e.target.value })}
                  min={1}
                  max={31}
                  required
                />
              </div>
              <div>
                <label htmlFor="a-hour" className="block text-xs text-slate-300">Hour</label>
                <input
                  id="a-hour"
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100"
                  value={personA.hour}
                  onChange={(e) => setPersonA({ ...personA, hour: e.target.value })}
                  min={0}
                  max={23}
                  required
                />
              </div>
              <div>
                <label htmlFor="a-minute" className="block text-xs text-slate-300">Minute</label>
                <input
                  id="a-minute"
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100"
                  value={personA.minute}
                  onChange={(e) => setPersonA({ ...personA, minute: e.target.value })}
                  min={0}
                  max={59}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="a-city" className="block text-sm text-slate-300">City</label>
              <input
                id="a-city"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                value={personA.city}
                onChange={(e) => setPersonA({ ...personA, city: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="a-nation" className="block text-sm text-slate-300">Nation</label>
              <input
                id="a-nation"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                value={personA.nation}
                onChange={(e) => setPersonA({ ...personA, nation: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="a-lat" className="block text-sm text-slate-300">Latitude</label>
              <input
                id="a-lat"
                type="number"
                step="any"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                value={personA.latitude}
                onChange={(e) => setPersonA({ ...personA, latitude: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="a-lon" className="block text-sm text-slate-300">Longitude</label>
              <input
                id="a-lon"
                type="number"
                step="any"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                value={personA.longitude}
                onChange={(e) => setPersonA({ ...personA, longitude: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="a-tz" className="block text-sm text-slate-300">Timezone</label>
              <input
                id="a-tz"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                value={personA.timezone}
                onChange={(e) => setPersonA({ ...personA, timezone: e.target.value })}
                placeholder="e.g., GMT or UTC"
                required
              />
            </div>
            <div>
              <label htmlFor="a-zodiac" className="block text-sm text-slate-300">Zodiac Type</label>
              <select
                id="a-zodiac"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                value={personA.zodiac_type}
                onChange={(e) => setPersonA({ ...personA, zodiac_type: e.target.value })}
              >
                <option value="Tropic">Tropic</option>
                <option value="Sidereal">Sidereal</option>
              </select>
            </div>
          </div>
        </Section>

        <Section title="Transits">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="t-start" className="block text-sm text-slate-300">Start Date</label>
              <input
                id="t-start"
                type="date"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="t-end" className="block text-sm text-slate-300">End Date</label>
              <input
                id="t-end"
                type="date"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="t-step" className="block text-sm text-slate-300">Step</label>
              <select
                id="t-step"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                value={step}
                onChange={(e) => setStep(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="t-mode" className="block text-sm text-slate-300">Mode</label>
              <select
                id="t-mode"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="NATAL_ONLY">Natal only</option>
                <option value="NATAL_TRANSITS">Natal + Transits</option>
              </select>
            </div>
          </div>
        </Section>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">All processing is geometry-first and non-deterministic. Your data isn’t stored.</p>
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Computing…" : "Generate Report"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 rounded-md border border-red-700 bg-red-900/30 p-4 text-red-200">
          <p className="font-medium">Error</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8 grid grid-cols-1 gap-6">
          {result?.person_a?.derived?.seismograph_summary && (
            <Section title="Seismograph Summary">
              <div className="text-sm text-slate-300">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <p className="text-slate-400">Magnitude</p>
                    <p className="text-slate-100">{result.person_a.derived.seismograph_summary.magnitude}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Valence</p>
                    <p className="text-slate-100">{result.person_a.derived.seismograph_summary.valence}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Volatility</p>
                    <p className="text-slate-100">{result.person_a.derived.seismograph_summary.volatility}</p>
                  </div>
                </div>
              </div>
            </Section>
          )}

          <Section title="Raw Result (debug)">
            <pre className="max-h-[28rem] overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-200">
{JSON.stringify(result, null, 2)}
            </pre>
          </Section>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={sendToPoeticBrain}
              className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
            >
              Send to Poetic Brain →
            </button>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-500">
        Poetic Brain at <span className="font-medium text-slate-300">/chat</span> is gated by Auth0 and requires login.
      </p>
    </main>
  );
}
