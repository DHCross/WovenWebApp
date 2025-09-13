"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseCoordinates, formatDecimal } from "../../src/coords";
import { getRedirectUri } from "../../lib/auth";
import { needsLocation, isTimeUnknown } from "../../lib/relocation";

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

  // Single-field coordinates (Person A)
  const [aCoordsInput, setACoordsInput] = useState<string>(() => {
    const lat = Number((personA as any).latitude);
    const lon = Number((personA as any).longitude);
    return Number.isFinite(lat) && Number.isFinite(lon) ? formatDecimal(lat, lon) : "";
  });
  const [aCoordsError, setACoordsError] = useState<string | null>(null);
  const [aCoordsValid, setACoordsValid] = useState<boolean>(true);

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
  // Person B single-field coordinates
  const [bCoordsInput, setBCoordsInput] = useState<string>("");
  const [bCoordsError, setBCoordsError] = useState<string | null>(null);
  const [bCoordsValid, setBCoordsValid] = useState<boolean>(true);
  const [relationshipType, setRelationshipType] = useState<string>("PARTNER");
  const [relationshipTier, setRelationshipTier] = useState<string>("");
  const [relationshipRole, setRelationshipRole] = useState<string>("");
  const [exEstranged, setExEstranged] = useState<boolean>(false);
  const [relationshipNotes, setRelationshipNotes] = useState<string>("");
  // Time policy UI state
  type TimePolicyChoice = 'planetary_only'|'whole_sign'|'sensitivity_scan'|'user_provided';
  const timeUnknown = useMemo(() => isTimeUnknown(personA as any), [personA]);
  const [timePolicy, setTimePolicy] = useState<TimePolicyChoice>(() => (isTimeUnknown(personA as any) ? 'planetary_only' : 'user_provided'));
  useEffect(() => {
    if (!timeUnknown && timePolicy !== 'user_provided') {
      setTimePolicy('user_provided');
    } else if (timeUnknown && timePolicy === 'user_provided') {
      setTimePolicy('planetary_only');
    }
  }, [timeUnknown]);
  // Timezone dropdown options (US-centric + GMT/UTC)
  const tzOptions = useMemo(() => [
    'GMT', 'UTC', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific',
    'US/Alaska', 'US/Hawaii', 'America/New_York', 'America/Chicago',
    'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage'
  ], []);
  // Legacy formatting helpers
  const months = useMemo(() => (
    [
      { label: 'January', value: 1 },
      { label: 'February', value: 2 },
      { label: 'March', value: 3 },
      { label: 'April', value: 4 },
      { label: 'May', value: 5 },
      { label: 'June', value: 6 },
      { label: 'July', value: 7 },
      { label: 'August', value: 8 },
      { label: 'September', value: 9 },
      { label: 'October', value: 10 },
      { label: 'November', value: 11 },
      { label: 'December', value: 12 },
    ]
  ), []);
  const onlyDigits = (s: string, maxLen: number) => s.replace(/\D+/g, '').slice(0, maxLen);
  const pad2 = (n: string | number) => {
    const s = String(n ?? '');
    if (!s) return '';
    const d = onlyDigits(s, 2);
    if (!d) return '';
    return d.length === 1 ? '0' + d : d;
  };
  const clampNum = (v: string | number, min: number, max: number) => {
    const n = Number(v);
    if (Number.isNaN(n)) return NaN;
    return Math.min(max, Math.max(min, n));
  };
  // Translocation / Relocation selection (angles/houses reference)
  type TranslocationOption = 'NONE' | 'A_LOCAL' | 'B_LOCAL' | 'MIDPOINT';
  const [translocation, setTranslocation] = useState<TranslocationOption>('NONE');
  // Relocation coordinates (single-field); default from spec: 30°10'N, 85°40'W
  const [relocInput, setRelocInput] = useState<string>("30°10'N, 85°40'W");
  const [relocError, setRelocError] = useState<string | null>(null);
  const [relocCoords, setRelocCoords] = useState<{ lat: number; lon: number } | null>(() => parseCoordinates("30°10'N, 85°40'W"));
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authEnvOk, setAuthEnvOk] = useState<boolean>(true);
  const [authStatus, setAuthStatus] = useState<{domain?: string; clientId?: string} | null>(null);
  const [showAuthBanner, setShowAuthBanner] = useState<boolean>(true);
  const authClientRef = useRef<Auth0Client | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const lastSubmitRef = useRef<number>(0);
  // Lightweight toast for ephemeral notices (e.g., Mirror failure)
  const [toast, setToast] = useState<string | null>(null);
  // Report type: 'balance' (on-screen gauges) | 'mirror' (handoff only)
  const [reportType, setReportType] = useState<'balance' | 'mirror'>(() => {
    if (typeof window === 'undefined') return 'mirror';
    try {
      const saved = window.localStorage.getItem('mb.reportType');
      return saved === 'mirror' || saved === 'balance' ? (saved as any) : 'mirror';
    } catch { return 'mirror'; }
  });
  // Persist report type and allow deep-link via ?report=mirror
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get('report');
      if (q === 'mirror' || q === 'balance') {
        setReportType(q as any);
      }
    } catch {/* noop */}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem('mb.reportType', reportType); } catch {/* ignore */}
  }, [reportType]);

  // Session memory flags
  const [hasSavedInputs, setHasSavedInputs] = useState<boolean>(false);
  const [saveForNextSession, setSaveForNextSession] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Shared file input ref for bottom Session Presets box
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          if (!cancelled) {
            setAuthStatus({ domain: String(config.domain), clientId: String(config.clientId) });
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
          authorizationParams: { redirect_uri: getRedirectUri() },
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
            window.location.replace('/chat?from=math-brain');
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
          translocation,
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

  function downloadResultPDF() {
    // Rely on browser's Print to PDF; prompt users via print dialog
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
      setSaveForNextSession(true);
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
      if (saved.translocation) setTranslocation(saved.translocation);
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

  function clearB() {
    if (!includePersonB) return;
    setPersonB({
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
  }

  function setBNowUTC() {
    if (!includePersonB) return;
    const now = new Date();
    setPersonB((prev) => ({
      ...prev,
      year: String(now.getUTCFullYear()),
      month: String(now.getUTCMonth() + 1),
      day: String(now.getUTCDate()),
      hour: String(now.getUTCHours()),
      minute: String(now.getUTCMinutes()),
      timezone: 'UTC',
      city: prev.city || '',
      nation: prev.nation || '',
      latitude: prev.latitude || '',
      longitude: prev.longitude || '',
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
          redirect_uri: getRedirectUri(),
          connection: "google-oauth2",
        },
      });
    } catch (e) {
      // surface minimal error into the page banner
      setError((e as any)?.message || "Login failed");
    }
  };

  // Shared: Save current setup to JSON
  function handleSaveSetupJSON() {
    try {
      const inputs = {
        schema: 'mb-1',
        mode,
        step,
        startDate,
        endDate,
        includePersonB,
        translocation,
        personA,
        personB,
        relationshipType,
        relationshipTier,
        relationshipRole,
        exEstranged,
        relationshipNotes,
      };
      const blob = new Blob([JSON.stringify(inputs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `math_brain_setup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {/* noop */}
  }

  // Shared: Load setup from JSON file and hydrate form
  async function handleLoadSetupFromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) { return; }
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      setLoadError(null);

      const isMinimal = typeof data === 'object' && !!data && (
        data.personA || data.period || data.relocation
      );
      const isInternal = typeof data === 'object' && !!data && (
        data.personA && (data.personA.latitude != null || data.personA.coords)
      );
      const hasSchema = typeof data?.schema === 'string';

      if (!isMinimal && !isInternal && !hasSchema) {
        throw new Error('Invalid setup shape: expected .math_brain.json minimal schema or internal export.');
      }

      // Support minimal schema
      if ((isMinimal || hasSchema) && !isInternal) {
        const pA = data.personA || {};
        const coordsStr = pA.coords || '';
        const parsedA = coordsStr ? parseCoordinates(String(coordsStr), { rejectZeroZero: true }) : null;
        const [yy, mm, dd] = String(pA.date || '').split('-').map((x:string)=>Number(x));
        const [hh, min] = String(pA.time || '').split(':').map((x:string)=>Number(x));
        if (coordsStr && !parsedA) throw new Error('Invalid personA.coords');
        const nextA = { ...personA } as any;
        if (pA.name) nextA.name = String(pA.name);
        if (Number.isFinite(yy)) nextA.year = yy;
        if (Number.isFinite(mm)) nextA.month = mm;
        if (Number.isFinite(dd)) nextA.day = dd;
        if (Number.isFinite(hh)) nextA.hour = hh;
        if (Number.isFinite(min)) nextA.minute = min;
        if (pA.timezone) nextA.timezone = String(pA.timezone);
        if (parsedA) { nextA.latitude = parsedA.lat; nextA.longitude = parsedA.lon; setACoordsInput(formatDecimal(parsedA.lat, parsedA.lon)); setACoordsError(null); setACoordsValid(true); }
        if (data.zodiacType) nextA.zodiac_type = String(data.zodiacType);
        setPersonA(nextA);

        if (data.personB) {
          const pB = data.personB;
          const parsedB = pB.coords ? parseCoordinates(String(pB.coords), { rejectZeroZero: true }) : null;
          const nextB = { ...personB } as any;
          if (pB.name) nextB.name = String(pB.name);
          if (parsedB) { nextB.latitude = String(parsedB.lat); nextB.longitude = String(parsedB.lon); setBCoordsInput(formatDecimal(parsedB.lat, parsedB.lon)); setBCoordsError(null); setBCoordsValid(true); }
          if (pB.timezone) nextB.timezone = String(pB.timezone);
          setPersonB(nextB);
          setIncludePersonB(true);
        }

        if (data.relationship_context) {
          const rc = data.relationship_context;
          if (rc.type) setRelationshipType(String(rc.type).toUpperCase());
          if (rc.intimacy_tier) setRelationshipTier(String(rc.intimacy_tier));
        }

        if (data.period) {
          const pr = data.period;
          if (pr.start) setStartDate(String(pr.start));
          if (pr.end) setEndDate(String(pr.end));
          if (pr.step) setStep(String(pr.step).toLowerCase());
        }

        if (data.relocation) {
          const rl = data.relocation;
          if (rl.mode) setTranslocation(String(rl.mode) as any);
          if (rl.coords) {
            const rc = parseCoordinates(String(rl.coords), { rejectZeroZero: true });
            if (rc) { setRelocCoords(rc); setRelocInput(String(rl.coords)); }
          }
        }
      } else {
        // Internal shape hydration
        if (data.personA) setPersonA(data.personA);
        if (data.personB) setPersonB(data.personB);
        if (typeof data.includePersonB === 'boolean') setIncludePersonB(data.includePersonB);
        if (data.mode) setMode(data.mode);
        if (data.step) setStep(data.step);
        if (data.startDate) setStartDate(data.startDate);
        if (data.endDate) setEndDate(data.endDate);
        if (typeof data.exEstranged === 'boolean') setExEstranged(data.exEstranged);
        if (typeof data.relationshipNotes === 'string') setRelationshipNotes(data.relationshipNotes);
        if (typeof data.relationshipTier === 'string') setRelationshipTier(data.relationshipTier);
        if (typeof data.relationshipRole === 'string') setRelationshipRole(data.relationshipRole);
        if (data.translocation) setTranslocation(data.translocation);
        // update single-field coord mirrors
        if (data.personA?.latitude != null && data.personA?.longitude != null) {
          setACoordsInput(formatDecimal(Number(data.personA.latitude), Number(data.personA.longitude)));
          setACoordsError(null);
          setACoordsValid(true);
        }
        if (data.personB?.latitude != null && data.personB?.longitude != null) {
          setBCoordsInput(formatDecimal(Number(data.personB.latitude), Number(data.personB.longitude)));
          setBCoordsError(null);
          setBCoordsValid(true);
        }
      }
    } catch {/* noop */}
    // Reset input to allow re-upload same file
    e.currentTarget.value = '';
  }

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
    const allPresent = required.every(Boolean) && numbers.every((n) => !Number.isNaN(n)) && aCoordsValid;

  const isRelational = ['SYNASTRY','SYNASTRY_TRANSITS','COMPOSITE','DUAL_NATAL_TRANSITS'].includes(mode);
    if (!isRelational) {
      return allPresent && Boolean(startDate) && Boolean(endDate);
    }

    // For relational modes, Person B must be included and minimally valid
  if (!includePersonB) return false;
  const bRequired = [personB.name, personB.city, personB.nation, personB.timezone, personB.zodiac_type];
  const bNums = [Number(personB.year), Number(personB.month), Number(personB.day), Number(personB.hour), Number(personB.minute), Number(personB.latitude), Number(personB.longitude)];
  const bOk = bRequired.every(Boolean) && bNums.every((n)=>!Number.isNaN(n)) && bCoordsValid;

    // Relationship context soft validation (backend will enforce precisely)
    let relOk = true;
    if (relationshipType === 'PARTNER') relOk = !!relationshipTier;
    if (relationshipType === 'FAMILY') relOk = !!relationshipRole;

    return allPresent && bOk && relOk && Boolean(startDate) && Boolean(endDate);
  }, [personA, personB, includePersonB, relationshipType, relationshipTier, relationshipRole, mode, startDate, endDate, aCoordsValid, bCoordsValid]);
  const submitDisabled = useMemo(() => {
    // Additional relocation/report gate
    const locGate = needsLocation(reportType, false, personA); // includeTransitTag handled in backend; UI enforces for balance only
    if (reportType === 'balance' && !locGate.hasLoc) return true;
    if (!canSubmit || loading) return true;
    return false;
  }, [canSubmit, loading, personA, reportType]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Frontend relocation gate for Balance Meter
    const locGate = needsLocation(reportType, false, personA);
    if (reportType === 'balance' && !locGate.hasLoc) {
      setToast('Transits need current location to place houses correctly. Add a location or switch to Mirror (no transits).');
      setTimeout(()=>setToast(null), 2500);
      return;
    }
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
        time_policy: ((): TimePolicyChoice => {
          if (!timeUnknown) return 'user_provided';
          return timePolicy;
        })(),
        transitStartDate: startDate,
        transitEndDate: endDate,
        transitStep: step,
        // Report type drives backend routing semantics (mirror vs balance meter)
        context: {
          mode: reportType === 'balance' ? 'balance_meter' : 'mirror',
        },
        // Pass translocation intent to backend (data-only context)
        translocation: ((): any => {
          if (translocation === 'A_LOCAL' || translocation === 'B_LOCAL' || translocation === 'MIDPOINT') {
            return {
              applies: true,
              method: translocation === 'A_LOCAL' ? 'A_local' : translocation === 'B_LOCAL' ? 'B_local' : 'Midpoint',
              coords: relocCoords ? { latitude: relocCoords.lat, longitude: relocCoords.lon } : undefined,
            };
          }
          return { applies: false, method: 'Natal' };
        })(),
      };

      // Persist last inputs for resume (conditional)
      try {
        if (saveForNextSession) {
          const inputs = {
            mode,
            step,
            startDate,
            endDate,
            includePersonB,
            translocation,
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
        }
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
        // Show inline error and brief toast if mirror was selected
        if (reportType === 'mirror') {
          setToast('Mirror preparation failed');
          setTimeout(()=>setToast(null), 2500);
        }
        throw new Error(msg);
      }
      // Always store result to enable downloads for both report types
      setResult(data);
      // Optional: store a quick meta view to guide banners
      try {
        const metaA = (data?.person_a?.meta) || (data?.provenance?.time_meta_a);
        if (metaA) {
          // Reflect server meta back into UI hints (no mutation of inputs)
          // Could update a local banner state here if desired
        }
      } catch {/* noop */}
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
            translocation,
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
          woven_map: (data as any)?.woven_map ? { ...(data as any).woven_map } : undefined,
        };
        window.localStorage.setItem('mb.lastSession', JSON.stringify(handoff));
      } catch {/* ignore */}
      // Mirror no longer auto-redirects; provide separate chat action
      // Telemetry (dev only)
      if (process.env.NODE_ENV !== 'production') {
        const t1 = typeof performance !== 'undefined' ? performance.now() : 0;
        // eslint-disable-next-line no-console
        console.info('[MB] Completed in', Math.round(t1 - t0), 'ms');
      }
    } catch (err: any) {
      if (reportType === 'mirror') {
        setToast('Mirror preparation failed');
        setTimeout(()=>setToast(null), 2500);
      }
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
          Run the geometry first. Then, once you're signed in, jump into Chat to synthesize the narrative.
        </p>
        
        {/* Math Brain: FIELD Layer Only */}
        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <span className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-slate-100">FIELD</span>
            <span className="text-xs">Geometric calculation engine</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className="flex items-center gap-2 opacity-50">
            <span className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-slate-400">MAP</span>
            <span className="text-xs">Raven handles</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className="flex items-center gap-2 opacity-50">
            <span className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-slate-400">VOICE</span>
            <span className="text-xs">Raven handles</span>
          </div>
        </div>
      </header>

      {/* Compact Auth status row (non-blocking) */}
      {authReady && (
        <div className="mt-3 mx-auto max-w-3xl rounded-md border border-slate-700 bg-slate-900/50 p-2 text-[12px] text-slate-300 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${authEnvOk ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden />
              <span className="font-medium">Auth status</span>
              <span className="text-slate-400">{authEnvOk ? 'Configured' : 'Misconfigured'}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <div title="Auth0 Domain (from /api/auth-config)">Domain: <span className="text-slate-200">{authStatus?.domain || '—'}</span></div>
              <div title="Auth0 Client ID (redacted)">Client: <span className="text-slate-200">{authStatus?.clientId ? String(authStatus.clientId).slice(0,4) + '…' : '—'}</span></div>
              <div title="Google connection expected to be enabled in Auth0 app">Google: <span className="text-slate-200">expected</span></div>
            </div>
          </div>
        </div>
      )}

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
            href="/chat?from=math-brain"
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
        {/* Session presets toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-700 bg-slate-900/50 p-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              checked={saveForNextSession}
              onChange={(e)=>setSaveForNextSession(e.target.checked)}
            />
            Save for next session
          </label>
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveSetupJSON}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Save setup…
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Load a setup from a JSON file"
            >
              Load setup…
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleLoadSetupFromFile}
              className="hidden"
              aria-label="Upload setup JSON file"
            />
          </div>
          {loadError && (
            <div className="mt-2 text-xs text-red-400">{loadError}</div>
          )}
        </div>

        {/* Report Type selector (moved above grid) */}
        <section aria-labelledby="report-type-heading" className="mb-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <h3 id="report-type-heading" className="text-sm font-medium text-slate-200">Report Type</h3>
          <div className="mt-3 flex items-center justify-between gap-3">
            <fieldset className="inline-flex overflow-hidden rounded-md border border-slate-700 bg-slate-800 px-0 py-0">
              <legend className="sr-only">Choose report type</legend>
              <label className={`px-3 py-1.5 text-sm cursor-pointer ${reportType==='mirror' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}
                title="Send to Poetic Brain">
                <input
                  type="radio"
                  name="reportType"
                  value="mirror"
                  className="sr-only"
                  checked={reportType==='mirror'}
                  onChange={() => setReportType('mirror')}
                />
                Mirror
                <span className="ml-1 text-[11px] text-slate-300/80">(send to Poetic Brain)</span>
              </label>
              <label className={`px-3 py-1.5 text-sm cursor-pointer ${reportType==='balance' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}
                title="Show gauges on screen">
                <input
                  type="radio"
                  name="reportType"
                  value="balance"
                  className="sr-only"
                  checked={reportType==='balance'}
                  onChange={() => setReportType('balance')}
                />
                Balance Meter
                <span className="ml-1 text-[11px] text-slate-300/80">(gauges on screen)</span>
              </label>
            </fieldset>
            {reportType==='mirror' && (
              <div className="text-xs text-slate-400">
                {authReady && !authed ? 'Sign in to deliver Mirror to Poetic Brain' : 'Handoff only — no on-screen gauges'}
              </div>
            )}
          </div>
        </section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
          {/* Left column: Person A */}
          <Section title="Person A (required)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="a-name" className="block text-[11px] uppercase tracking-wide text-slate-300">Name</label>
              <input
                id="a-name"
                placeholder="Your Name"
                className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-center text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={personA.name}
                onChange={(e) => setPersonA({ ...personA, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-5 gap-2">
              <div>
                <label htmlFor="a-year" className="block text-[11px] uppercase tracking-wide text-slate-300">Year</label>
                <input
                  id="a-year"
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={String(personA.year)}
                  onChange={(e) => setPersonA({ ...personA, year: onlyDigits(e.target.value, 4) })}
                  placeholder="YYYY"
                  required
                />
              </div>
              <div>
                <label htmlFor="a-month" className="block text-[11px] uppercase tracking-wide text-slate-300">Month</label>
                <select
                  id="a-month"
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={Number(personA.month) || 1}
                  onChange={(e) => setPersonA({ ...personA, month: Number(e.target.value) })}
                  required
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="a-day" className="block text-[11px] uppercase tracking-wide text-slate-300">Day</label>
                <input
                  id="a-day"
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={pad2(personA.day as any)}
                  onChange={(e) => {
                    const v = pad2(e.target.value);
                    const n = clampNum(v, 1, 31);
                    setPersonA({ ...personA, day: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                  }}
                  placeholder="DD"
                  required
                />
              </div>
              <div>
                <label htmlFor="a-hour" className="block text-[11px] uppercase tracking-wide text-slate-300">Hour</label>
                <input
                  id="a-hour"
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={pad2(personA.hour as any)}
                  onChange={(e) => {
                    const v = pad2(e.target.value);
                    const n = clampNum(v, 0, 23);
                    setPersonA({ ...personA, hour: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                  }}
                  placeholder="HH"
                  required
                />
              </div>
              <div>
                <label htmlFor="a-minute" className="block text-[11px] uppercase tracking-wide text-slate-300">Minute</label>
                <input
                  id="a-minute"
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={pad2(personA.minute as any)}
                  onChange={(e) => {
                    const v = pad2(e.target.value);
                    const n = clampNum(v, 0, 59);
                    setPersonA({ ...personA, minute: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                  }}
                  placeholder="MM"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="a-city" className="block text-[11px] uppercase tracking-wide text-slate-300">City</label>
              <input
                id="a-city"
                className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={personA.city}
                onChange={(e) => setPersonA({ ...personA, city: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="a-nation" className="block text-[11px] uppercase tracking-wide text-slate-300">Nation</label>
              <input
                id="a-nation"
                className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={personA.nation}
                onChange={(e) => setPersonA({ ...personA, nation: e.target.value })}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="a-coords" className="block text-[11px] uppercase tracking-wide text-slate-300">Birth Coordinates</label>
              <input
                id="a-coords"
                type="text"
                className={`mt-1 w-full rounded-md border bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${aCoordsError ? 'border-red-600' : 'border-slate-600'}`}
                value={aCoordsInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setACoordsInput(v);
                  const parsed = parseCoordinates(v, { rejectZeroZero: true });
                  if (parsed) {
                    setPersonA({ ...personA, latitude: parsed.lat, longitude: parsed.lon });
                    setACoordsError(null);
                    setACoordsValid(true);
                  } else {
                    setACoordsError('Invalid coordinates. Try "40°42′N, 74°0′W" or "40.7128, -74.006".');
                    setACoordsValid(false);
                  }
                }}
                aria-describedby="a-coords-help"
                placeholder="e.g., 40°42′N, 74°0′W or 40.7128, -74.006"
                required
              />
              <p id="a-coords-help" className="mt-1 text-xs text-slate-400">
                Examples: 40°42′N, 74°0′W · 34°3′S, 18°25′E · 40.7128, -74.006
              </p>
              {aCoordsError ? (
                <p className="mt-1 text-xs text-red-400">{aCoordsError}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">
                  Normalized: {formatDecimal(Number(personA.latitude), Number(personA.longitude))}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="a-tz" className="block text-[11px] uppercase tracking-wide text-slate-300">Timezone</label>
              <select
                id="a-tz"
                className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={personA.timezone}
                onChange={(e) => setPersonA({ ...personA, timezone: e.target.value })}
                required
              >
                {tzOptions.map((tz)=> (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="a-zodiac" className="block text-[11px] uppercase tracking-wide text-slate-300">Zodiac Type</label>
              <select
                id="a-zodiac"
                className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100"
                value={personA.zodiac_type}
                onChange={(e) => setPersonA({ ...personA, zodiac_type: e.target.value })}
              >
                <option value="Tropic">Tropic</option>
                <option value="Sidereal">Sidereal</option>
              </select>
            </div>
            {/* Birth time policy (when time unknown) */}
            {timeUnknown && (
              <div className="sm:col-span-2">
                <fieldset className="rounded-md border border-slate-700 bg-slate-900/50 p-3">
                  <legend className="px-1 text-xs font-medium text-slate-200">Birth time policy</legend>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-xs ${timePolicy==='planetary_only' ? 'border-indigo-600 bg-indigo-900/20 text-slate-100' : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'}`}>
                      <input
                        type="radio"
                        name="time-policy"
                        className="mt-0.5"
                        checked={timePolicy==='planetary_only'}
                        onChange={()=>setTimePolicy('planetary_only')}
                      />
                      <div>
                        <div className="font-medium">Planetary-only</div>
                        <div className="text-slate-400">No houses/angles; tightest, falsifiable geometry</div>
                      </div>
                    </label>
                    <label className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-xs ${timePolicy==='whole_sign' ? 'border-indigo-600 bg-indigo-900/20 text-slate-100' : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'}`}>
                      <input
                        type="radio"
                        name="time-policy"
                        className="mt-0.5"
                        checked={timePolicy==='whole_sign'}
                        onChange={()=>setTimePolicy('whole_sign')}
                      />
                      <div>
                        <div className="font-medium">Whole-sign houses</div>
                        <div className="text-slate-400">House semantics without exact time; angles still suppressed</div>
                      </div>
                    </label>
                    <label className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-xs ${timePolicy==='sensitivity_scan' ? 'border-indigo-600 bg-indigo-900/20 text-slate-100' : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'}`}>
                      <input
                        type="radio"
                        name="time-policy"
                        className="mt-0.5"
                        checked={timePolicy==='sensitivity_scan'}
                        onChange={()=>setTimePolicy('sensitivity_scan')}
                      />
                      <div>
                        <div className="font-medium">Sensitivity scan</div>
                        <div className="text-slate-400">Test a window of possible times; house-dependent insights flagged</div>
                      </div>
                    </label>
                  </div>
                </fieldset>
              </div>
            )}
            </div>
            {/* Relocation (Optional) — always visible under Person A */}
            <div className="sm:col-span-2 mt-2">
              <label htmlFor="t-reloc-coords-a" className="block text-[11px] uppercase tracking-wide text-slate-300">Relocation Coordinates (Optional)</label>
              <input
                id="t-reloc-coords-a"
                type="text"
                className={`mt-1 w-full h-10 rounded-md border bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${relocError ? 'border-red-600' : 'border-slate-600'}`}
                value={relocInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setRelocInput(v);
                  const parsed = parseCoordinates(v, { rejectZeroZero: true });
                  if (parsed) {
                    setRelocCoords(parsed);
                    setRelocError(null);
                  } else {
                    setRelocCoords(null);
                    setRelocError('Invalid coordinates');
                  }
                }}
                placeholder="e.g., 30°10′N, 85°40′W"
              />
              <p className="mt-1 text-xs text-slate-400">Default: 30°10′N, 85°40′W · Normalized: {relocCoords ? formatDecimal(relocCoords.lat, relocCoords.lon) : '—'}</p>
              {relocError && <p className="mt-1 text-xs text-red-400">{relocError}</p>}
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
                  <div className="mx-1 h-5 w-px bg-slate-700" />
                  <button type="button" onClick={clearB} disabled={!includePersonB} className="px-2 py-1 text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" title="Clear all Person B fields">Clear B</button>
                  <div className="mx-1 h-5 w-px bg-slate-700" />
                  <button type="button" onClick={setBNowUTC} disabled={!includePersonB} className="px-2 py-1 text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" title="Set Person B date/time to now (UTC)">Set B = Now (UTC)</button>
                </div>
                <label htmlFor="toggle-include-b-a" className="inline-flex items-center gap-2 text-sm text-slate-200">
                  <input
                    id="toggle-include-b-a"
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
                <label htmlFor="b-name" className="block text-[11px] uppercase tracking-wide text-slate-300">Name</label>
                <input
                  id="b-name"
                  placeholder="Their Name"
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  value={personB.name}
                  onChange={(e) => setPersonB({ ...personB, name: e.target.value })}
                  disabled={!includePersonB}
                />
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label htmlFor="b-year" className="block text-[11px] uppercase tracking-wide text-slate-300">Year</label>
                  <input
                    id="b-year"
                    type="text"
                    inputMode="numeric"
                    className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={String(personB.year)}
                    onChange={(e) => setPersonB({ ...personB, year: onlyDigits(e.target.value, 4) })}
                    disabled={!includePersonB}
                    placeholder="YYYY"
                  />
                </div>
                <div>
                  <label htmlFor="b-month" className="block text-[11px] uppercase tracking-wide text-slate-300">Month</label>
                  <select
                    id="b-month"
                    className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={Number(personB.month) || 1}
                    onChange={(e) => setPersonB({ ...personB, month: Number(e.target.value) })}
                    disabled={!includePersonB}
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="b-day" className="block text-[11px] uppercase tracking-wide text-slate-300">Day</label>
                  <input
                    id="b-day"
                    type="text"
                    inputMode="numeric"
                    className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={pad2(personB.day as any)}
                    onChange={(e) => {
                      const v = pad2(e.target.value);
                      const n = clampNum(v, 1, 31);
                      setPersonB({ ...personB, day: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                    }}
                    disabled={!includePersonB}
                    placeholder="DD"
                  />
                </div>
                <div>
                  <label htmlFor="b-hour" className="block text-[11px] uppercase tracking-wide text-slate-300">Hour</label>
                  <input
                    id="b-hour"
                    type="text"
                    inputMode="numeric"
                    className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={pad2(personB.hour as any)}
                    onChange={(e) => {
                      const v = pad2(e.target.value);
                      const n = clampNum(v, 0, 23);
                      setPersonB({ ...personB, hour: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                    }}
                    disabled={!includePersonB}
                    placeholder="HH"
                  />
                </div>
                <div>
                  <label htmlFor="b-minute" className="block text-[11px] uppercase tracking-wide text-slate-300">Minute</label>
                  <input
                    id="b-minute"
                    type="text"
                    inputMode="numeric"
                    className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={pad2(personB.minute as any)}
                    onChange={(e) => {
                      const v = pad2(e.target.value);
                      const n = clampNum(v, 0, 59);
                      setPersonB({ ...personB, minute: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                    }}
                    disabled={!includePersonB}
                    placeholder="MM"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="b-city" className="block text-[11px] uppercase tracking-wide text-slate-300">City</label>
                <input
                  id="b-city"
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={personB.city}
                  onChange={(e) => setPersonB({ ...personB, city: e.target.value })}
                  disabled={!includePersonB}
                />
              </div>
              <div>
                <label htmlFor="b-nation" className="block text-[11px] uppercase tracking-wide text-slate-300">Nation</label>
                <input
                  id="b-nation"
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={personB.nation}
                  onChange={(e) => setPersonB({ ...personB, nation: e.target.value })}
                  disabled={!includePersonB}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="b-coords" className="block text-[11px] uppercase tracking-wide text-slate-300">Birth Coordinates (B)</label>
                <input
                  id="b-coords"
                  type="text"
                  className={`mt-1 w-full rounded-md border bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${bCoordsError ? 'border-red-600' : 'border-slate-600'}`}
                  value={bCoordsInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBCoordsInput(v);
                    if (!includePersonB) return;
                    const parsed = parseCoordinates(v, { rejectZeroZero: true });
                    if (parsed) {
                      setPersonB({ ...personB, latitude: parsed.lat as any, longitude: parsed.lon as any });
                      setBCoordsError(null);
                      setBCoordsValid(true);
                    } else {
                      setBCoordsError('Invalid coordinates');
                      setBCoordsValid(false);
                    }
                  }}
                  disabled={!includePersonB}
                  placeholder="e.g., 34°03′S, 18°25′E or -34.0500, 18.4167"
                />
                <p className="mt-1 text-xs text-slate-400">Examples: 40°42′N, 74°0′W · 34°3′S, 18°25′E · 40.7128, -74.006</p>
                <p className="mt-1 text-xs text-slate-400">Normalized: {Number(personB.latitude) || Number(personB.longitude) ? formatDecimal(Number(personB.latitude), Number(personB.longitude)) : '—'}</p>
                {bCoordsError && <p className="mt-1 text-xs text-red-400">{bCoordsError}</p>}
              </div>

              <div>
                <label htmlFor="b-tz" className="block text-[11px] uppercase tracking-wide text-slate-300">Timezone</label>
                <select
                  id="b-tz"
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={personB.timezone}
                  onChange={(e) => setPersonB({ ...personB, timezone: e.target.value })}
                  disabled={!includePersonB}
                >
                  {tzOptions.map((tz)=> (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="b-zodiac" className="block text-[11px] uppercase tracking-wide text-slate-300">Zodiac Type</label>
                <select
                  id="b-zodiac"
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50"
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

          {/* Relationship Context (only when Person B included) */}
          <Section title="Relationship Context">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-slate-400">These fields unlock when Person B is included.</p>
              <label htmlFor="toggle-include-b-rc" className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  id="toggle-include-b-rc"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  checked={includePersonB}
                  onChange={(e) => setIncludePersonB(e.target.checked)}
                />
                Include Person B
              </label>
            </div>
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
                  {includePersonB && ['SYNASTRY','SYNASTRY_TRANSITS','COMPOSITE','DUAL_NATAL_TRANSITS'].includes(mode) && !relationshipTier && (
                    <p className="mt-1 text-xs text-amber-400">Partner relationships require an intimacy tier.</p>
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
                <div>
                  <label htmlFor="t-reloc" className="block text-sm text-slate-300">Relocation (angles/houses)</label>
                  <select
                    id="t-reloc"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={translocation}
                    onChange={(e) => setTranslocation(e.target.value as TranslocationOption)}
                  >
                    <option value="NONE">None (Natal Base)</option>
                    <option value="A_LOCAL">Person A — Local</option>
                    <option value="B_LOCAL" disabled={!includePersonB}>Person B — Local</option>
                    <option value="MIDPOINT" disabled={!includePersonB}>Midpoint</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-400">Clinical toggle only; no narrative. If not applied, angles/houses remain natal.</p>
                  {translocation !== 'NONE' && (
                    <div className="mt-3 text-xs text-slate-400">
                      Relocation coordinates set under Person A.
                    </div>
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
              {translocation !== 'NONE' && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-200">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                  <span className="font-medium">Relocation</span>
                  <span className="text-emerald-100">{translocation}</span>
                  <span className="text-emerald-300">{relocCoords ? formatDecimal(relocCoords.lat, relocCoords.lon) : '—'}</span>
                </div>
              )}
            </Section>

            {/* Report Type selector moved above */}

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
          All processing is geometry-first and non-deterministic. Your data isn’t stored.
              </p>
              <div className="mr-2 hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5">
                  <span className="text-slate-300">Mode:</span>
                  <span className="text-slate-100">{mode.replace(/_/g,' ')}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5">
                  <span className="text-slate-300">Report:</span>
                  <span className="text-slate-100 capitalize">{reportType}</span>
                </span>
              </div>
              <button
                type="submit"
                disabled={submitDisabled}
                className="inline-flex items-center rounded-md px-4 py-2 text-white disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500"
              >
                {loading ? "Mapping geometry…" : (reportType==='balance' ? 'Generate Report' : 'Prepare Mirror')}
              </button>
            </div>
            {/* Session Presets (bottom box) */}
            <section
              aria-labelledby="session-presets-heading"
              className="mx-auto mt-6 w-full max-w-md rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-sm"
            >
              <h3
                id="session-presets-heading"
                className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700/70">
                  {/* small bookmark icon substitute */}
                  <span className="block h-1.5 w-1.5 rounded-[2px] bg-slate-300" />
                </span>
                Session presets
              </h3>

              <p className="mb-4 text-xs text-slate-400">
                Save your current setup as a file, or load one you saved earlier.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveSetupJSON}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                  aria-label="Save current setup to a JSON file"
                >
                  Save setup…
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                  aria-label="Load a setup from a JSON file"
                >
                  Load setup…
                </button>

                {/* hidden file input for Load */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleLoadSetupFromFile}
                  className="hidden"
                  aria-label="Upload setup JSON file"
                />
              </div>
            </section>
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
          {(() => {
            const meta = (result as any)?.person_a?.meta || (result as any)?.provenance?.time_meta_a;
            if (!meta) return null;
            const suppressed = !!meta.houses_suppressed;
            const precision = String(meta.time_precision || '');
            const eff = meta.effective_time_used as string | undefined;
            return (
              <div className="flex flex-wrap items-center gap-2">
                {suppressed && (
                  <div className="rounded-md border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs text-slate-200">
                    Angles unavailable without birth time; houses suppressed.
                  </div>
                )}
                {eff && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-200">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                    <span className="font-medium">Effective time</span>
                    <span className="text-emerald-100">{eff}</span>
                  </div>
                )}
                {precision === 'unknown' && (timePolicy === 'planetary_only') && (
                  <div className="rounded-md border border-amber-700 bg-amber-900/30 px-3 py-1 text-xs text-amber-200">
                    Using planetary-only mode. You can run a sensitivity scan for house-dependent work.
                  </div>
                )}
              </div>
            );
          })()}
          {/* Post-generation actions */}
          <div className="flex items-center justify-end gap-2 print:hidden">
            <button type="button" onClick={downloadResultJSON} className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Download result JSON">Download JSON</button>
            <button type="button" onClick={downloadResultPDF} className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Download result PDF">Download PDF</button>
            <button
              type="button"
              onClick={sendToPoeticBrain}
              disabled={!authReady || !authed}
              title={!authReady || !authed ? 'Sign in to continue' : undefined}
              aria-label={!authReady || !authed ? 'Talk to Raven Calder (sign in to continue)' : 'Talk to Raven Calder'}
              className={`rounded-md px-3 py-1.5 text-white focus-visible:outline-none focus-visible:ring-2 ${(!authReady || !authed) ? 'bg-emerald-700/60 cursor-not-allowed opacity-60' : 'bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-400'}`}
            >
              Talk to Raven Calder →
            </button>
          </div>
          {reportType==='balance' && (<>
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
            const wm = (result as any)?.woven_map;
            if (!wm?.hook_stack?.hooks?.length) return null;
            const hooks = wm.hook_stack.hooks || [];
            return (
              <Section title="Hook Stack — Recognition Gateway">
                <div className="mb-3 text-sm text-slate-400">
                  Front-door UX: {hooks.length} high-charge patterns from tightest aspects
                  {wm.hook_stack.tier_1_orbs > 0 && ` · ${wm.hook_stack.tier_1_orbs} Tier-1 (≤1°)`}
                  · Coverage: {wm.hook_stack.coverage}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {hooks.map((hook: any, i: number) => (
                    <div key={i} className="rounded-md border border-amber-600/30 bg-amber-900/20 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-amber-100 font-medium leading-tight">
                          {hook.title}
                        </div>
                        {hook.is_tier_1 && (
                          <span className="ml-2 inline-flex items-center rounded bg-amber-600 px-1.5 py-0.5 text-xs font-medium text-amber-100">
                            T1
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-amber-200/70 space-y-1">
                        <div>Orb: {hook.orb?.toFixed(1)}° · Intensity: {Math.round(hook.intensity)}</div>
                        <div>{hook.planets?.join(' ') || ''} {hook.aspect_type}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Purpose: Bypass analysis → trigger "that's me" recognition → open depth work
                </div>
              </Section>
            );
          })()}
          {(() => {
            const wm = (result as any)?.woven_map;
            if (!wm) return null;
            const factors = wm.integration_factors || {};
            const keys: Array<{key: keyof typeof factors, label: string}> = [
              { key: 'fertile_field' as any, label: 'Fertile Field' },
              { key: 'harmonic_resonance' as any, label: 'Harmonic Resonance' },
              { key: 'expansion_lift' as any, label: 'Expansion Lift' },
              { key: 'combustion_clarity' as any, label: 'Combustion Clarity' },
              { key: 'liberation_release' as any, label: 'Liberation / Release' },
              { key: 'integration' as any, label: 'Integration' },
            ];
            const ts = Array.isArray(wm.time_series) ? wm.time_series : [];
            const first = ts[0]?.date; const last = ts[ts.length-1]?.date;
            return (
              <Section title="Woven Map (data-only)">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-sm text-slate-300">Integration Factors</div>
                    <div className="mt-2 space-y-2">
                      {keys.map(({key,label}) => {
                        const pct = Math.max(0, Math.min(100, Number((factors as any)[key] ?? 0)));
                        return (
                          <div key={String(key)}>
                            <div className="flex items-center justify-between text-xs text-slate-400"><span>{label}</span><span>{pct}%</span></div>
                            <svg viewBox="0 0 100 6" className="h-1.5 w-full">
                              <rect x="0" y="0" width="100" height="6" className="fill-slate-700" />
                              <rect x="0" y="0" width={pct} height="6" className="fill-emerald-500" />
                            </svg>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-300">Time Series</div>
                    <div className="mt-2 text-xs text-slate-400">Entries: {ts.length || 0}{first && last ? ` · ${first} → ${last}` : ''}</div>
                    <div className="mt-2 max-h-40 overflow-auto rounded border border-slate-700 bg-slate-900/40 p-2">
                      <table className="w-full text-xs text-slate-300">
                        <thead>
                          <tr className="text-slate-400">
                            <th className="text-left font-medium">Date</th>
                            <th className="text-right font-medium">Mag</th>
                            <th className="text-right font-medium">Val</th>
                            <th className="text-right font-medium">Vol</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ts.slice(-10).map((r:any, i:number) => (
                            <tr key={i}>
                              <td className="py-0.5 pr-2">{r.date}</td>
                              <td className="py-0.5 text-right">{Number(r.magnitude ?? 0).toFixed(2)}</td>
                              <td className="py-0.5 text-right">{Number(r.valence ?? 0).toFixed(2)}</td>
                              <td className="py-0.5 text-right">{Number(r.volatility ?? 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3 text-center">
                    <div className="text-xs text-slate-400">Natal aspects (A)</div>
                    <div className="text-lg text-slate-100">{(wm.natal_summary?.major_aspects?.length ?? 0)}</div>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3 text-center">
                    <div className="text-xs text-slate-400">Polarity cards (hooks)</div>
                    <div className="text-lg text-slate-100">{(Array.isArray(wm.polarity_cards) ? wm.polarity_cards.length : 0)}</div>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3 text-center">
                    <div className="text-xs text-slate-400">Report type</div>
                    <div className="text-lg text-slate-100 capitalize">{wm.type || 'solo'}</div>
                  </div>
                  <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3 text-center">
                    <div className="text-xs text-slate-400">Schema</div>
                    <div className="text-xs text-slate-100">{wm.schema}</div>
                  </div>
                </div>
              </Section>
            );
          })()}
          {(() => {
            const cx = (result as any)?.context;
            if (!cx?.translocation) return null;
            const t = cx.translocation;
            return (
              <Section title="Translocation Context" className="print:hidden">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm text-slate-300">
                  <div>
                    <div className="text-xs text-slate-400">Applies</div>
                    <div className="text-slate-100">{t.applies ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Method</div>
                    <div className="text-slate-100">{t.method || 'Natal'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">House System</div>
                    <div className="text-slate-100">{t.house_system || 'Placidus'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">TZ</div>
                    <div className="text-slate-100">{t.tz || (personA?.timezone || '—')}</div>
                  </div>
                </div>
              </Section>
            );
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
              disabled={!authReady || !authed}
              title={!authReady || !authed ? 'Sign in to continue' : undefined}
              aria-label={!authReady || !authed ? 'Talk to Raven Calder (sign in to continue)' : 'Talk to Raven Calder'}
              className={`inline-flex items-center rounded-md px-4 py-2 text-white ${(!authReady || !authed) ? 'bg-emerald-700/60 cursor-not-allowed opacity-60' : 'bg-emerald-600 hover:bg-emerald-500'}`}
            >
              Talk to Raven Calder →
            </button>
          </div>
          </>)}
        </div>
      )}

      {/* UX banners per relocation rules */}
      {reportType==='balance' && (!Number(personA.latitude) || !Number(personA.longitude) || !personA.timezone) && (
        <div className="mt-4 rounded-md border border-red-700 bg-red-900/30 p-3 text-red-200">
          <p className="text-sm">Transits need current location to place houses correctly. Add a location or switch to Mirror (no transits).</p>
        </div>
      )}

      {/* Gray banner for missing birth time (angles suppressed) */}
      {(!personA.hour && !personA.minute) && (
        <div className="mt-4 rounded-md border border-slate-700 bg-slate-800/70 p-3 text-slate-200">
          <p className="text-sm">Angles unavailable without birth time; houses suppressed.</p>
        </div>
      )}

      {/* Green chip when relocation active */}
      {(() => {
        const relocActive = translocation !== 'NONE' && personA.timezone;
        if (!relocActive) return null;
        return (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-200">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            <span className="font-medium">Relocated to:</span>
            <span className="text-emerald-100">{personA.city || 'Custom'}</span>
            <span className="text-emerald-300">({personA.timezone})</span>
          </div>
        );
      })()}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-red-700 bg-red-900/80 px-4 py-2 text-sm text-red-100 shadow-lg">
          {toast}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-500 print:hidden">
        Poetic Brain at <span className="font-medium text-slate-300">/chat</span> is gated by Auth0 and requires login.
      </p>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md bg-red-600 px-4 py-2 text-white shadow-lg text-sm">
          {toast}
        </div>
      )}
    </main>
  );
}
