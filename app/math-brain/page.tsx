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

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-700 bg-slate-800/60 p-4 ${className}`}>
      <h2 className="text-lg font-medium text-slate-100">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function MathBrainPage() {
  const showLegacyLink = process.env.NEXT_PUBLIC_ENABLE_LEGACY_LINK === 'true';
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
  const [includePersonB, setIncludePersonB] = useState<boolean>(false);
  const [personB, setPersonB] = useState<Subject>({
    name: "",
    year: "",
    month: "",
    day: "",
    hour: "",
    minute: "",
    city: "",
    nation: "",
    latitude: "",
    longitude: "",
    timezone: "",
    zodiac_type: "Tropic",
  });
  const [relationshipType, setRelationshipType] = useState<string>("PARTNER");
  const [relationshipTier, setRelationshipTier] = useState<string>("");
  const [relationshipRole, setRelationshipRole] = useState<string>("");
  const [exEstranged, setExEstranged] = useState<boolean>(false);
  const [relationshipNotes, setRelationshipNotes] = useState<string>("");
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authEnvOk, setAuthEnvOk] = useState<boolean>(true);
  const [showAuthBanner, setShowAuthBanner] = useState<boolean>(true);
  const authClientRef = useRef<Auth0Client | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const lastSubmitRef = useRef<number>(0);

  // Session memory flags
  const [hasSavedInputs, setHasSavedInputs] = useState<boolean>(false);

  // Weekly aggregation preference: 'mean' | 'max' (for seismograph weekly bars)
  const [weeklyAgg, setWeeklyAgg] = useState<'mean' | 'max'>(() => {
    if (typeof window === 'undefined') return 'mean';
    const saved = window.localStorage.getItem('weeklyAgg');
    return (saved === 'max' || saved === 'mean') ? saved : 'mean';
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('weeklyAgg', weeklyAgg);
    } catch {/* ignore */}
  }, [weeklyAgg]);

  // Check for saved inputs on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('mb.lastInputs');
      setHasSavedInputs(!!saved);
    } catch {
      setHasSavedInputs(false);
    }
  }, []);

  // Relational modes list used for UI guards
  const relationalModes = useMemo(() => ['SYNASTRY','SYNASTRY_TRANSITS','COMPOSITE','DUAL_NATAL_TRANSITS'], []);

  // If Person B is turned off while a relational mode is selected, reset to a solo mode
  useEffect(() => {
    if (!includePersonB && relationalModes.includes(mode)) {
      setMode('NATAL_TRANSITS');
    }
  }, [includePersonB, mode, relationalModes]);

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
          if (!config?.domain || !config?.clientId) {
            if (!cancelled) {
              setAuthEnvOk(false);
              setAuthReady(true);
            }
            return;
          }
          setAuthEnvOk(true);
        } catch (e) {
          // No functions in dev or missing env — auth stays disabled
          if (!cancelled) {
            setAuthEnvOk(false);
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
          const nowAuthed = await client.isAuthenticated();
          if (nowAuthed) {
            window.location.replace('/chat');
            return;
          }
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
      // Build a light summary for handoff
      const summary = result?.person_a?.derived?.seismograph_summary || {};
      const mag = Number(summary.magnitude ?? 0);
      const val = Number(summary.valence ?? 0);
      const vol = Number(summary.volatility ?? 0);
      const magnitudeLabel = mag >= 3 ? 'Surge' : mag >= 1 ? 'Active' : 'Calm';
      const valenceLabel = val > 0.5 ? 'Supportive' : val < -0.5 ? 'Challenging' : 'Mixed';
      const volatilityLabel = vol >= 3 ? 'Scattered' : vol >= 1 ? 'Variable' : 'Stable';
      const handoff = {
        createdAt: new Date().toISOString(),
        from: 'math-brain',
        inputs: {
          mode,
          step,
          startDate,
          endDate,
          includePersonB,
          relationship: {
            type: relationshipType,
            intimacy_tier: relationshipTier,
            role: relationshipRole,
            ex_estranged: exEstranged,
            notes: relationshipNotes,
          },
          personA,
          personB,
        },
        summary: { magnitude: mag, valence: val, volatility: vol, magnitudeLabel, valenceLabel, volatilityLabel },
        resultPreview: {
          hasDaily: Boolean(result?.person_a?.chart?.transitsByDate),
        },
      };
      window.localStorage.setItem('mb.lastSession', JSON.stringify(handoff));
      window.location.href = '/chat?from=math-brain';
    } catch {/* noop */}
  }

  function handlePrint() {
    try {
      window.print();
    } catch {/* noop */}
  }

  function downloadResultJSON() {
    if (!result) return;
    try {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
      a.href = url;
      a.download = `math-brain-result-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {/* noop */}
  }

  function resetSessionMemory() {
    try {
      window.localStorage.removeItem('mb.lastInputs');
      window.localStorage.removeItem('mb.lastSession');
      setHasSavedInputs(false);
    } catch {/* noop */}
  }

  function resumeLastInputs() {
    try {
      const raw = window.localStorage.getItem('mb.lastInputs');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.personA) setPersonA(saved.personA);
      if (saved.personB) setPersonB(saved.personB);
      if (typeof saved.includePersonB === 'boolean') setIncludePersonB(saved.includePersonB);
      if (saved.mode) setMode(saved.mode);
      if (saved.step) setStep(saved.step);
      if (saved.startDate) setStartDate(saved.startDate);
      if (saved.endDate) setEndDate(saved.endDate);
      if (saved.relationshipType) setRelationshipType(saved.relationshipType);
      if (typeof saved.exEstranged === 'boolean') setExEstranged(saved.exEstranged);
      if (typeof saved.relationshipNotes === 'string') setRelationshipNotes(saved.relationshipNotes);
      if (typeof saved.relationshipTier === 'string') setRelationshipTier(saved.relationshipTier);
      if (typeof saved.relationshipRole === 'string') setRelationshipRole(saved.relationshipRole);
    } catch {/* noop */}
  }

  // Quick actions for Person B
  function copyAToB() {
    if (!includePersonB) return;
    setPersonB((prev) => ({
      ...prev,
      // preserve name
      year: String(personA.year),
      month: String(personA.month),
      day: String(personA.day),
      hour: String(personA.hour),
      minute: String(personA.minute),
      city: personA.city,
      nation: personA.nation,
      latitude: String(personA.latitude),
      longitude: String(personA.longitude),
      timezone: personA.timezone,
      zodiac_type: personA.zodiac_type,
    }));
  }

  function swapAB() {
    if (!includePersonB) return;
    setPersonA((prevA) => ({
      ...prevA,
      name: personB.name || prevA.name,
      year: (personB.year as any) ?? prevA.year,
      month: (personB.month as any) ?? prevA.month,
      day: (personB.day as any) ?? prevA.day,
      hour: (personB.hour as any) ?? prevA.hour,
      minute: (personB.minute as any) ?? prevA.minute,
      city: personB.city || prevA.city,
      nation: personB.nation || prevA.nation,
      latitude: (personB.latitude as any) ?? prevA.latitude,
      longitude: (personB.longitude as any) ?? prevA.longitude,
      timezone: personB.timezone || prevA.timezone,
      zodiac_type: (personB.zodiac_type as any) || prevA.zodiac_type,
    }));
    setPersonB((prevB) => ({
      ...prevB,
      // keep Person B name as-is
      year: String(personA.year),
      month: String(personA.month),
      day: String(personA.day),
      hour: String(personA.hour),
      minute: String(personA.minute),
      city: personA.city,
      nation: personA.nation,
      latitude: String(personA.latitude),
      longitude: String(personA.longitude),
      timezone: personA.timezone,
      zodiac_type: personA.zodiac_type,
    }));
  }

  const loginWithGoogle = async () => {
    try {
      if (!authClientRef.current) {
        setError("Sign-in is disabled. Configure AUTH0_DOMAIN and AUTH0_CLIENT_ID.");
        return;
      }
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

    const isRelational = ['SYNASTRY','SYNASTRY_TRANSITS','COMPOSITE','DUAL_NATAL_TRANSITS'].includes(mode);
    if (!isRelational) {
      return allPresent && Boolean(startDate) && Boolean(endDate);
    }

    // For relational modes, Person B must be included and minimally valid
    if (!includePersonB) return false;
    const bRequired = [personB.name, personB.city, personB.nation, personB.timezone, personB.zodiac_type];
    const bNums = [Number(personB.year), Number(personB.month), Number(personB.day), Number(personB.hour), Number(personB.minute), Number(personB.latitude), Number(personB.longitude)];
    const bOk = bRequired.every(Boolean) && bNums.every((n)=>!Number.isNaN(n));

    // Relationship context soft validation (backend will enforce precisely)
    let relOk = true;
    if (relationshipType === 'PARTNER') relOk = !!relationshipTier;
    if (relationshipType === 'FAMILY') relOk = !!relationshipRole;

    return allPresent && bOk && relOk && Boolean(startDate) && Boolean(endDate);
  }, [personA, personB, includePersonB, relationshipType, relationshipTier, relationshipRole, mode, startDate, endDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const nowTs = Date.now();
    if (nowTs - lastSubmitRef.current < 800) {
      return; // debounce rapid re-submits
    }
    lastSubmitRef.current = nowTs;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
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

      // Persist last inputs for resume
      try {
        const inputs = {
          mode,
          step,
          startDate,
          endDate,
          includePersonB,
          relationshipType,
          relationshipTier,
          relationshipRole,
          exEstranged,
          relationshipNotes,
          personA,
          personB,
        };
        window.localStorage.setItem('mb.lastInputs', JSON.stringify(inputs));
        setHasSavedInputs(true);
      } catch {/* ignore */}

      // Attach Person B and relationship context for relational or dual modes
      const relationalModes = ['SYNASTRY','SYNASTRY_TRANSITS','COMPOSITE','DUAL_NATAL_TRANSITS'];
      if (relationalModes.includes(mode) && includePersonB) {
        (payload as any).personB = {
          ...personB,
          year: Number(personB.year),
          month: Number(personB.month),
          day: Number(personB.day),
          hour: Number(personB.hour),
          minute: Number(personB.minute),
          latitude: Number(personB.latitude),
          longitude: Number(personB.longitude),
        };
        (payload as any).relationship_context = {
          type: relationshipType,
          intimacy_tier: relationshipType === 'PARTNER' ? relationshipTier : undefined,
          role: relationshipType !== 'PARTNER' ? relationshipRole : undefined,
          ex_estranged: relationshipType === 'FRIEND' ? undefined : exEstranged,
          notes: relationshipNotes || undefined,
        };
      }

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
      // Save a light lastSession handoff snapshot
      try {
        const summary = data?.person_a?.derived?.seismograph_summary || {};
        const mag = Number(summary.magnitude ?? 0);
        const val = Number(summary.valence ?? 0);
        const vol = Number(summary.volatility ?? 0);
        const magnitudeLabel = mag >= 3 ? 'Surge' : mag >= 1 ? 'Active' : 'Calm';
        const valenceLabel = val > 0.5 ? 'Supportive' : val < -0.5 ? 'Challenging' : 'Mixed';
        const volatilityLabel = vol >= 3 ? 'Scattered' : vol >= 1 ? 'Variable' : 'Stable';
        const handoff = {
          createdAt: new Date().toISOString(),
          from: 'math-brain',
          inputs: {
            mode,
            step,
            startDate,
            endDate,
            includePersonB,
            relationship: {
              type: relationshipType,
              intimacy_tier: relationshipTier,
              role: relationshipRole,
              ex_estranged: exEstranged,
              notes: relationshipNotes,
            },
            personA,
            personB,
          },
          summary: { magnitude: mag, valence: val, volatility: vol, magnitudeLabel, valenceLabel, volatilityLabel },
        };
        window.localStorage.setItem('mb.lastSession', JSON.stringify(handoff));
      } catch {/* ignore */}
      // Telemetry (dev only)
      if (process.env.NODE_ENV !== 'production') {
        const t1 = typeof performance !== 'undefined' ? performance.now() : 0;
        // eslint-disable-next-line no-console
        console.info('[MB] Completed in', Math.round(t1 - t0), 'ms');
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
      if (process.env.NODE_ENV !== 'production') {
        const t1 = typeof performance !== 'undefined' ? performance.now() : 0;
        // eslint-disable-next-line no-console
        console.info('[MB] Failed in', Math.round(t1 - t0), 'ms', '-', err?.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {!authEnvOk && showAuthBanner && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-amber-700 bg-amber-900/30 p-3 text-amber-200">
          <p className="text-sm">Auth0 environment not configured (AUTH0_*). Sign-in is disabled; Poetic Brain gating will be unavailable.</p>
          <button
            type="button"
            onClick={() => setShowAuthBanner(false)}
            className="rounded-md border border-amber-700 px-2 py-1 text-xs text-amber-100 hover:bg-amber-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Dismiss banner"
          >
            Dismiss
          </button>
        </div>
      )}
      <header className="text-center print:hidden">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-100">Math Brain</h1>
        <p className="mt-4 text-base md:text-lg text-slate-300">
          Geometry first. Generate your chart math here, then head to Poetic Brain.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-3 justify-center print:hidden">
        <a
          href="/"
          className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 hover:bg-slate-700"
        >
          Back Home
        </a>
        {showLegacyLink && (
          <a
            href="/index.html"
            className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Legacy Math Brain
          </a>
        )}
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
            disabled={!authReady || !authClientRef.current}
            className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 hover:bg-slate-700 disabled:opacity-50"
            title="Sign in to enable Poetic Brain"
          >
            Sign in to Continue
          </button>
        )}
      </div>

      {hasSavedInputs && (
        <div className="mt-6 flex items-center justify-center gap-3 print:hidden">
          <div className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-200 text-sm">
            A previous session was found.
          </div>
          <button type="button" onClick={resumeLastInputs} className="rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-500 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Resume inputs</button>
          <button type="button" onClick={resetSessionMemory} className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 hover:bg-slate-700 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Reset</button>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-10 print:hidden">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
          {/* Left column: Person A */}
          <Section title="Person A (required)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="a-name" className="block text-sm text-slate-300">Name</label>
              <input
                id="a-name"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={personA.city}
                onChange={(e) => setPersonA({ ...personA, city: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="a-nation" className="block text-sm text-slate-300">Nation</label>
              <input
                id="a-nation"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={personA.longitude}
                onChange={(e) => setPersonA({ ...personA, longitude: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="a-tz" className="block text-sm text-slate-300">Timezone</label>
              <input
                id="a-tz"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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

          {/* Relationship Context (only when Person B included) */}
          <Section title="Relationship Context">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rel-type" className="block text-sm text-slate-300">Type</label>
                <select
                  id="rel-type"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                  value={relationshipType}
                  onChange={(e)=>{ setRelationshipType(e.target.value); setRelationshipTier(""); setRelationshipRole(""); }}
                  disabled={!includePersonB}
                >
                  <option value="PARTNER">Partner</option>
                  <option value="FRIEND">Friend / Colleague</option>
                  <option value="FAMILY">Family</option>
                </select>
              </div>
              {relationshipType === 'PARTNER' && (
                <div>
                  <label htmlFor="rel-tier" className="block text-sm text-slate-300">Intimacy Tier</label>
                  <select
                    id="rel-tier"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                    value={relationshipTier}
                    onChange={(e)=>setRelationshipTier(e.target.value)}
                    disabled={!includePersonB}
                  >
                    <option value="">Select…</option>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                    <option value="P4">P4</option>
                    <option value="P5a">P5a</option>
                    <option value="P5b">P5b</option>
                  </select>
                  {includePersonB && ['SYNASTRY','SYNASTRY_TRANSITS','COMPOSITE','DUAL_NATAL_TRANSITS'].includes(mode) && !relationshipTier && (
                    <p className="mt-1 text-xs text-amber-400">Partner relationships require an intimacy tier.</p>
                  )}
                </div>
              )}
              {relationshipType === 'FAMILY' && (
                <div>
                  <label htmlFor="rel-role" className="block text-sm text-slate-300">Role</label>
                  <select
                    id="rel-role"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                    value={relationshipRole}
                    onChange={(e)=>setRelationshipRole(e.target.value)}
                    disabled={!includePersonB}
                  >
                    <option value="">Select…</option>
                    <option value="Parent">Parent</option>
                    <option value="Offspring">Offspring</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Cousin">Cousin</option>
                    <option value="Extended">Extended</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Mentor">Mentor</option>
                    <option value="Other">Other</option>
                    <option value="Custom">Custom</option>
                  </select>
                  {includePersonB && ['SYNASTRY','SYNASTRY_TRANSITS','COMPOSITE','DUAL_NATAL_TRANSITS'].includes(mode) && !relationshipRole && (
                    <p className="mt-1 text-xs text-amber-400">Family relationships require a role.</p>
                  )}
                </div>
              )}
              {relationshipType === 'FRIEND' && (
                <div>
                  <label htmlFor="rel-role-f" className="block text-sm text-slate-300">Role (optional)</label>
                  <select
                    id="rel-role-f"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                    value={relationshipRole}
                    onChange={(e)=>setRelationshipRole(e.target.value)}
                    disabled={!includePersonB}
                  >
                    <option value="">—</option>
                    <option value="Acquaintance">Acquaintance</option>
                    <option value="Mentor">Mentor</option>
                    <option value="Other">Other</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  id="rel-ex"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  checked={exEstranged}
                  onChange={(e)=>setExEstranged(e.target.checked)}
                  disabled={!includePersonB || relationshipType==='FRIEND'}
                />
                <label htmlFor="rel-ex" className="text-sm text-slate-300">Ex / Estranged</label>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="rel-notes" className="block text-sm text-slate-300">Notes</label>
                <textarea
                  id="rel-notes"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  rows={3}
                  placeholder="Optional context (max 500 chars)"
                  value={relationshipNotes}
                  onChange={(e)=>setRelationshipNotes(e.target.value.slice(0,500))}
                  disabled={!includePersonB}
                />
              </div>
            </div>
          </Section>
          {/* Left column continues: Person B (optional for relational modes) */}
          <Section title="Person B (optional for relational)">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">Add a second person for synastry/composite modes.</p>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-md border border-slate-700 bg-slate-800 p-1">
                  <button type="button" onClick={copyAToB} disabled={!includePersonB} className="px-2 py-1 text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" title="Copy Person A details to Person B (keeps B name)">Copy A→B</button>
                  <div className="mx-1 h-5 w-px bg-slate-700" />
                  <button type="button" onClick={swapAB} disabled={!includePersonB} className="px-2 py-1 text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" title="Swap A/B (relationship settings unchanged)">Swap A/B</button>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  checked={includePersonB}
                  onChange={(e) => setIncludePersonB(e.target.checked)}
                />
                Include Person B
                </label>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="b-name" className="block text-sm text-slate-300">Name</label>
                <input
                  id="b-name"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  value={personB.name}
                  onChange={(e) => setPersonB({ ...personB, name: e.target.value })}
                  disabled={!includePersonB}
                />
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label htmlFor="b-year" className="block text-xs text-slate-300">Year</label>
                  <input
                    id="b-year"
                    type="number"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={personB.year}
                    onChange={(e) => setPersonB({ ...personB, year: e.target.value })}
                    disabled={!includePersonB}
                  />
                </div>
                <div>
                  <label htmlFor="b-month" className="block text-xs text-slate-300">Month</label>
                  <input
                    id="b-month"
                    type="number"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={personB.month}
                    onChange={(e) => setPersonB({ ...personB, month: e.target.value })}
                    min={1}
                    max={12}
                    disabled={!includePersonB}
                  />
                </div>
                <div>
                  <label htmlFor="b-day" className="block text-xs text-slate-300">Day</label>
                  <input
                    id="b-day"
                    type="number"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={personB.day}
                    onChange={(e) => setPersonB({ ...personB, day: e.target.value })}
                    min={1}
                    max={31}
                    disabled={!includePersonB}
                  />
                </div>
                <div>
                  <label htmlFor="b-hour" className="block text-xs text-slate-300">Hour</label>
                  <input
                    id="b-hour"
                    type="number"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={personB.hour}
                    onChange={(e) => setPersonB({ ...personB, hour: e.target.value })}
                    min={0}
                    max={23}
                    disabled={!includePersonB}
                  />
                </div>
                <div>
                  <label htmlFor="b-minute" className="block text-xs text-slate-300">Minute</label>
                  <input
                    id="b-minute"
                    type="number"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={personB.minute}
                    onChange={(e) => setPersonB({ ...personB, minute: e.target.value })}
                    min={0}
                    max={59}
                    disabled={!includePersonB}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="b-city" className="block text-sm text-slate-300">City</label>
                <input
                  id="b-city"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={personB.city}
                  onChange={(e) => setPersonB({ ...personB, city: e.target.value })}
                  disabled={!includePersonB}
                />
              </div>
              <div>
                <label htmlFor="b-nation" className="block text-sm text-slate-300">Nation</label>
                <input
                  id="b-nation"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={personB.nation}
                  onChange={(e) => setPersonB({ ...personB, nation: e.target.value })}
                  disabled={!includePersonB}
                />
              </div>

              <div>
                <label htmlFor="b-lat" className="block text-sm text-slate-300">Latitude</label>
                <input
                  id="b-lat"
                  type="number"
                  step="any"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={personB.latitude}
                  onChange={(e) => setPersonB({ ...personB, latitude: e.target.value })}
                  disabled={!includePersonB}
                />
              </div>
              <div>
                <label htmlFor="b-lon" className="block text-sm text-slate-300">Longitude</label>
                <input
                  id="b-lon"
                  type="number"
                  step="any"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-50"
                  value={personB.longitude}
                  onChange={(e) => setPersonB({ ...personB, longitude: e.target.value })}
                  disabled={!includePersonB}
                />
              </div>

              <div>
                <label htmlFor="b-tz" className="block text-sm text-slate-300">Timezone</label>
                <input
                  id="b-tz"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-50"
                  value={personB.timezone}
                  onChange={(e) => setPersonB({ ...personB, timezone: e.target.value })}
                  placeholder="e.g., GMT or UTC"
                  disabled={!includePersonB}
                />
              </div>
              <div>
                <label htmlFor="b-zodiac" className="block text-sm text-slate-300">Zodiac Type</label>
                <select
                  id="b-zodiac"
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-50"
                  value={personB.zodiac_type}
                  onChange={(e) => setPersonB({ ...personB, zodiac_type: e.target.value })}
                  disabled={!includePersonB}
                >
                  <option value="Tropic">Tropic</option>
                  <option value="Sidereal">Sidereal</option>
                </select>
              </div>
            </div>
          </Section>

          {/* Right column: Transits + actions */}
          <div className="space-y-6">
            <Section title="Transits">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="t-start" className="block text-sm text-slate-300">Start Date</label>
                  <input
                    id="t-start"
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="t-end" className="block text-sm text-slate-300">End Date</label>
                  <input
                    id="t-end"
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="t-step" className="block text-sm text-slate-300">Step</label>
                  <select
                    id="t-step"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    <option value="NATAL_ONLY">Natal only</option>
                    <option value="NATAL_TRANSITS">Natal + Transits</option>
                    <option value="DUAL_NATAL_TRANSITS" disabled={!includePersonB}>Dual Natal + Transits (A & B, no synastry)</option>
                    <option value="SYNASTRY" disabled={!includePersonB}>Synastry (A ↔ B)</option>
                    <option value="SYNASTRY_TRANSITS" disabled={!includePersonB}>Synastry + Transits</option>
                    <option value="COMPOSITE" disabled={!includePersonB}>Composite (midpoint) + Relational Mirror</option>
                  </select>
                  {!includePersonB && (
                    <p className="mt-1 text-xs text-amber-400">Enable “Include Person B” to access relational modes.</p>
                  )}
                </div>
              </div>
              {step === 'weekly' && (
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xs text-slate-400">Weekly aggregation</span>
                  <button type="button" className="h-5 w-5 rounded-full border border-slate-600 text-[11px] text-slate-300 hover:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" title="Mean = average of daily values per week; Max = highest daily value per week" aria-label="Help: Weekly aggregation semantics">?</button>
                  <div role="group" aria-label="Weekly aggregation" className="inline-flex overflow-hidden rounded-md border border-slate-700 bg-slate-800">
                    <button type="button" onClick={()=>setWeeklyAgg('mean')} className={`px-3 py-1 text-xs ${weeklyAgg==='mean' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}>Mean</button>
                    <button type="button" onClick={()=>setWeeklyAgg('max')} className={`px-3 py-1 text-xs ${weeklyAgg==='max' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}>Max</button>
                  </div>
                </div>
              )}
            </Section>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                All processing is geometry-first and non-deterministic. Your data isn’t stored.
              </p>
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? "Computing…" : "Generate Report"}
              </button>
            </div>
            {(['SYNASTRY','SYNASTRY_TRANSITS','COMPOSITE','DUAL_NATAL_TRANSITS'].includes(mode) && !includePersonB) && (
              <p className="mt-2 text-xs text-amber-400">Hint: Toggle “Include Person B” and fill in required fields to enable relational modes.</p>
            )}
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-6 rounded-md border border-red-700 bg-red-900/30 p-4 text-red-200">
          <p className="font-medium">Error</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="mt-8 grid grid-cols-1 gap-6 print:hidden">
          <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
            <div className="h-5 w-40 rounded bg-slate-700 animate-pulse" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="h-16 rounded bg-slate-700/70 animate-pulse" />
              <div className="h-16 rounded bg-slate-700/70 animate-pulse" />
              <div className="h-16 rounded bg-slate-700/70 animate-pulse" />
            </div>
          </section>
          <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
            <div className="h-5 w-56 rounded bg-slate-700 animate-pulse" />
            <div className="mt-4 h-24 rounded bg-slate-700/60 animate-pulse" />
          </section>
        </div>
      )}

      {result && (
        <div className="mt-8 grid grid-cols-1 gap-6">
          {/* Results toolbar */}
          <div className="flex items-center justify-end gap-2 print:hidden">
            <button type="button" onClick={handlePrint} className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Print report">Print</button>
            <button type="button" onClick={downloadResultJSON} className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Download result JSON">Download JSON</button>
            <button type="button" onClick={sendToPoeticBrain} className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Open in Poetic Brain">Open in Poetic Brain →</button>
          </div>
          {(() => {
            const daily = result?.person_a?.chart?.transitsByDate || {};
            const hasAny = Object.keys(daily).length > 0;
            if (!hasAny) {
              return (
                <div className="rounded-md border border-amber-700 bg-amber-900/30 p-3 text-amber-200">
                  <p className="text-sm">
                    No daily series data returned. Double-check your dates, step, and inputs, then try again. If this persists, view the Raw Result (debug) below.
                  </p>
                </div>
              );
            }
            return null;
          })()}
          {(() => {
            const summary = result?.person_a?.derived?.seismograph_summary;
            if (!summary) return null;
            const mag = Number(summary.magnitude ?? 0);
            const val = Number(summary.valence ?? 0);
            const vol = Number(summary.volatility ?? 0);
            const magnitudeLabel = mag >= 3 ? 'Surge' : mag >= 1 ? 'Active' : 'Calm';
            const valenceLabel = val > 0.5 ? 'Supportive' : val < -0.5 ? 'Challenging' : 'Mixed';
            const volatilityLabel = vol >= 3 ? 'Scattered' : vol >= 1 ? 'Variable' : 'Stable';
            return (
              <Section title="Balance Meter">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 rounded bg-slate-700/60 px-3 py-1 text-slate-100">
                    <span>⚡</span>
                    <span>Magnitude</span>
                    <span className="text-slate-300">· {magnitudeLabel}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded bg-slate-700/60 px-3 py-1 text-slate-100">
                    <span>🌓</span>
                    <span>Valence</span>
                    <span className="text-slate-300">· {valenceLabel}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded bg-slate-700/60 px-3 py-1 text-slate-100">
                    <span>🔷</span>
                    <span>Volatility</span>
                    <span className="text-slate-300">· {volatilityLabel}</span>
                  </span>
                </div>

                {(() => {
                  const daily = result?.person_a?.chart?.transitsByDate || {};
                  const dates = Object.keys(daily).sort();
                  if (!dates.length) return null;
                  const series = dates.map(d => ({
                    date: d,
                    magnitude: Number(daily[d]?.seismograph?.magnitude ?? 0),
                    valence: Number(daily[d]?.seismograph?.valence ?? 0),
                    volatility: Number(daily[d]?.seismograph?.volatility ?? 0)
                  }));
                  // Weekly aggregate: group every 7 entries and average each channel
                  const sampled = step === 'weekly'
                    ? (() => {
                        const groups: typeof series[] = [] as any;
                        for (let i = 0; i < series.length; i += 7) {
                          const chunk = series.slice(i, i + 7);
                          if (!chunk.length) continue;
                          const mean = (arr: number[]) => arr.reduce((a,b)=>a+b,0) / arr.length;
                          const max = (arr: number[]) => arr.reduce((a,b)=>Math.max(a,b), -Infinity);
                          const aggFn = weeklyAgg === 'max' ? max : mean;
                          groups.push([{
                            date: chunk[0].date,
                            magnitude: Number(aggFn(chunk.map(c=>c.magnitude)).toFixed(2)),
                            valence: Number(aggFn(chunk.map(c=>c.valence)).toFixed(2)),
                            volatility: Number(aggFn(chunk.map(c=>c.volatility)).toFixed(2)),
                          } as any]);
                        }
                        return groups.map(g => g[0]);
                      })()
                    : series;
                  const maxBars = Math.min(28, sampled.length);
                  const bars = sampled.slice(-maxBars);
                  const H = 96;
                  return (
                    <div className="mt-4">
                      <div className="mb-1 text-[11px] text-slate-400">Legend: ⚡ Magnitude · 🌓 Valence · 🔷 Volatility</div>
                      <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                        <span>Top ≈ 5</span>
                        <span>Date labels show MM-DD</span>
                      </div>
                      {(() => {
                        const first = bars[0]?.date;
                        const last = bars[bars.length-1]?.date;
                        if (!first || !last) return null;
                        return (
                          <div className="mb-1 text-[10px] text-slate-500">{first} | {last}</div>
                        );
                      })()}
                      <div className="flex items-end gap-2 overflow-x-auto rounded border border-slate-700 bg-slate-900/40 p-2">
                        {bars.map((pt, idx) => {
                          const magH = Math.max(0, Math.min(H, Math.round((pt.magnitude/5) * H)));
                          const valH = Math.max(0, Math.min(H, Math.round((Math.min(5, Math.abs(pt.valence))/5) * H)));
                          const volH = Math.max(0, Math.min(H, Math.round((pt.volatility/5) * H)));
                          return (
                            <div key={idx} className="flex w-6 flex-col items-center justify-end gap-0.5">
                              <svg width="16" height="96" viewBox="0 0 16 96" className="block">
                                <rect x="0" y={96 - magH} width="5" height={magH} className="fill-indigo-500 opacity-80" />
                                <rect x="6" y={96 - valH} width="4" height={valH} className="fill-emerald-500 opacity-70" />
                                <rect x="11" y={96 - volH} width="5" height={volH} className="fill-sky-500 opacity-70" />
                              </svg>
                              <div className="text-[10px] text-center text-slate-400 truncate w-full" title={pt.date}>{pt.date.slice(5)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {(() => {
                    const magN = Math.min(1, Math.max(0, mag/5));
                    const volN = Math.min(1, Math.max(0, vol/5));
                    const valN = (Math.max(-2, Math.min(2, val)) + 2) / 4; // map -2..2 -> 0..1
                    const cards = [
                      { name: 'Fertile Field', hint: 'Growth-friendly openings', score: (valN*0.7 + (1-volN)*0.3) },
                      { name: 'Harmonic Resonance', hint: 'Easier flow and alignment', score: (valN*0.6 + (1-volN)*0.4) },
                      { name: 'Expansion Lift', hint: 'Momentum and reach', score: (magN*0.6 + valN*0.4) },
                      { name: 'Combustion Clarity', hint: 'Honest frictions surface', score: (magN*0.5 + volN*0.5) },
                      { name: 'Liberation / Release', hint: 'Letting go, reset', score: (volN*0.7 + (1-valN)*0.3) },
                      { name: 'Integration', hint: 'Synthesis and grounding', score: ((1-volN)*0.6 + valN*0.4) },
                    ];
                    return cards.map((c, i) => {
                      const pct = Math.round(c.score*100);
                      return (
                        <div key={i} className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-slate-100 font-medium">{c.name}</div>
                            <div className="text-xs text-slate-400">{pct}%</div>
                          </div>
                          <svg viewBox="0 0 100 8" className="mt-2 h-2 w-full">
                            <rect x="0" y="0" width="100" height="8" className="fill-slate-700" />
                            <rect x="0" y="0" width={pct} height="8" className="fill-emerald-500" />
                          </svg>
                          <p className="mt-2 text-xs text-slate-400">{c.hint}</p>
                        </div>
                      );
                    })
                  })()}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3 text-center">
                    <div className="text-xs text-slate-400">Magnitude</div>
                    <div className="text-lg text-slate-100">{mag.toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3 text-center">
                    <div className="text-xs text-slate-400">Valence</div>
                    <div className="text-lg text-slate-100">{val.toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3 text-center">
                    <div className="text-xs text-slate-400">Volatility</div>
                    <div className="text-lg text-slate-100">{vol.toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3 text-center">
                    <div className="text-xs text-slate-400">SFD</div>
                    <div className="text-lg text-slate-100">{result?.person_a?.sfd?.sfd ?? '—'}</div>
                  </div>
                </div>
              </Section>
            );
          })()}
          {result?.person_a?.derived?.seismograph_summary && (
            <Section title="Seismograph Summary" className="print:hidden">
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

          {result?.person_b?.derived?.seismograph_summary && (
            <Section title="Person B — Seismograph Summary" className="print:hidden">
              <div className="text-sm text-slate-300">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <p className="text-slate-400">Magnitude</p>
                    <p className="text-slate-100">{result.person_b.derived.seismograph_summary.magnitude}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Valence</p>
                    <p className="text-slate-100">{result.person_b.derived.seismograph_summary.valence}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Volatility</p>
                    <p className="text-slate-100">{result.person_b.derived.seismograph_summary.volatility}</p>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {(result?.synastry_relational_mirror || result?.relational_mirror) && (
            <Section title="Relational Mirror" className="print:hidden">
              <div className="text-sm text-slate-300 space-y-2">
                <p className="text-slate-200 font-medium">Climate</p>
                <p className="text-slate-300">
                  {result?.synastry_relational_mirror?.mirror_voice?.relationship_climate ||
                   result?.relational_mirror?.mirror_voice?.relationship_climate || '—'}
                </p>
                <p className="text-slate-200 font-medium">Polarity</p>
                <p className="text-slate-300">
                  {result?.synastry_relational_mirror?.mirror_voice?.polarity_summary ||
                   result?.relational_mirror?.mirror_voice?.polarity_summary || '—'}
                </p>
              </div>
            </Section>
          )}

          {(() => {
            const daily = result?.person_a?.chart?.transitsByDate || {};
            const dates = Object.keys(daily).sort();
            if (!dates.length) return null;
            const last = daily[dates[dates.length-1]];
            const md = last?.transit_table?.markdown;
            if (!md) return null;
            return (
              <Section title="Raw Geometry (latest day)">
                <pre className="max-h-[24rem] overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-200 whitespace-pre-wrap">{md}</pre>
              </Section>
            );
          })()}

          <Section title="Raw Result (debug)" className="print:hidden">
            <pre className="max-h-[28rem] overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-200">
{JSON.stringify(result, null, 2)}
            </pre>
          </Section>

          <div className="flex items-center justify-end print:hidden">
            <button
              type="button"
              onClick={sendToPoeticBrain}
              className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
            >
              Open in Poetic Brain →
            </button>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-500 print:hidden">
        Poetic Brain at <span className="font-medium text-slate-300">/chat</span> is gated by Auth0 and requires login.
      </p>
    </main>
  );
}
