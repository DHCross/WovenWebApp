"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseCoordinates, formatDecimal } from "../../src/coords";
// AuthProvider removed - auth handled globally by HomeHero component
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
  state: string;
  latitude: number | string;
  longitude: number | string;
  timezone: string;
  zodiac_type: "Tropic" | "Sidereal" | string;
};

type ApiResult = Record<string, any> | null;

type ReportMode =
  | 'NATAL_ONLY'
  | 'NATAL_TRANSITS'
  | 'SYNASTRY'
  | 'SYNASTRY_TRANSITS'
  | 'COMPOSITE'
  | 'COMPOSITE_TRANSITS';

const RELATIONAL_MODES: ReportMode[] = [
  'SYNASTRY',
  'SYNASTRY_TRANSITS',
  'COMPOSITE',
  'COMPOSITE_TRANSITS',
];

const TRANSIT_MODES = new Set<ReportMode>([
  'NATAL_TRANSITS',
  'SYNASTRY_TRANSITS',
  'COMPOSITE_TRANSITS',
]);

const toTransitMode = (mode: ReportMode): ReportMode => {
  switch (mode) {
    case 'NATAL_ONLY':
      return 'NATAL_TRANSITS';
    case 'SYNASTRY':
      return 'SYNASTRY_TRANSITS';
    case 'COMPOSITE':
      return 'COMPOSITE_TRANSITS';
    default:
      return mode;
  }
};

const toNatalMode = (mode: ReportMode): ReportMode => {
  switch (mode) {
    case 'NATAL_TRANSITS':
      return 'NATAL_ONLY';
    case 'SYNASTRY_TRANSITS':
      return 'SYNASTRY';
    case 'COMPOSITE_TRANSITS':
      return 'COMPOSITE';
    default:
      return mode;
  }
};

const normalizeReportMode = (value: unknown): ReportMode => {
  if (!value && value !== 0) return 'NATAL_ONLY';
  const token = String(value).trim().toUpperCase();
  switch (token) {
    case 'NATAL_TRANSITS':
      return 'NATAL_TRANSITS';
    case 'SYNASTRY':
      return 'SYNASTRY';
    case 'SYNASTRY_TRANSITS':
      return 'SYNASTRY_TRANSITS';
    case 'COMPOSITE':
      return 'COMPOSITE';
    case 'COMPOSITE_TRANSITS':
      return 'COMPOSITE_TRANSITS';
    case 'DUAL_NATAL_TRANSITS':
      return 'SYNASTRY_TRANSITS';
    case 'DUAL_NATAL':
      return 'SYNASTRY';
    case 'NATAL_ONLY':
    default:
      return 'NATAL_ONLY';
  }
};

// Auth is handled via client-only AuthProvider to avoid hydration mismatches

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
  // Auth0 restored: authentication functionality available

  const today = useMemo(() => new Date(), []);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // Different default date ranges for different report types
  const getDefaultDates = useCallback((reportType: 'balance' | 'mirror') => {
    if (reportType === 'balance') {
      // Balance reports use a 30-day range for better health correlation data
      const start = fmt(today);
      const end = fmt(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));
      return { start, end };
    } else {
      // Mirror reports use a 7-day range
      const start = fmt(today);
      const end = fmt(new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000));
      return { start, end };
    }
  }, [today, fmt]);

  const [personA, setPersonA] = useState<Subject>({
    name: "Dan",
    year: "1973",
    month: "07",
    day: "24",
    hour: "14",
    minute: "30",
    city: "Bryn Mawr",
    state: "PA",
    latitude: 40.0167,
    longitude: -75.3,
    timezone: "US/Eastern",
    zodiac_type: "Tropic",
  });

  // Single-field coordinates (Person A)
  const [aCoordsInput, setACoordsInput] = useState<string>("40°1'N, 75°18'W");
  const [aCoordsError, setACoordsError] = useState<string | null>(null);
  const [aCoordsValid, setACoordsValid] = useState<boolean>(true);

  const [startDate, setStartDate] = useState<string>(() => getDefaultDates('mirror').start);
  const [endDate, setEndDate] = useState<string>(() => getDefaultDates('mirror').end);
  const [mode, setMode] = useState<ReportMode>('NATAL_ONLY');
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
    state: "",
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
  const [contactState, setContactState] = useState<"ACTIVE" | "LATENT">("ACTIVE");
  const [exEstranged, setExEstranged] = useState<boolean>(false);
  const [relationshipNotes, setRelationshipNotes] = useState<string>("");

  // Time policy UI state
  type TimePolicyChoice = 'planetary_only'|'whole_sign'|'sensitivity_scan'|'user_provided';
  const timeUnknown = useMemo(() => isTimeUnknown(personA as any), [personA]);
  const [timePolicy, setTimePolicy] = useState<TimePolicyChoice>(() => (isTimeUnknown(personA as any) ? 'planetary_only' : 'user_provided'));
  const timeUnknownB = useMemo(() => isTimeUnknown(personB as any), [personB]);
  const allowUnknownA = useMemo(() => timeUnknown && timePolicy !== 'user_provided', [timeUnknown, timePolicy]);
  const allowUnknownB = useMemo(() => timeUnknownB && timePolicy !== 'user_provided', [timeUnknownB, timePolicy]);
  useEffect(() => {
    if (!timeUnknown && timePolicy !== 'user_provided') {
      setTimePolicy('user_provided');
    } else if (timeUnknown && timePolicy === 'user_provided') {
      setTimePolicy('planetary_only');
    }
  }, [timeUnknown]);
  // Timezone dropdown options (US-centric + GMT/UTC) - simplified format
  const tzOptions = useMemo(() => [
    'GMT', 'UTC', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific',
    'US/Alaska', 'US/Hawaii'
  ], []);
  // Legacy formatting helpers
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


  type TranslocationOption =
    | 'NONE'
    | 'A_NATAL'
    | 'A_LOCAL'
    | 'B_NATAL'
    | 'B_LOCAL'
    | 'BOTH_LOCAL'
    | 'MIDPOINT';

  const normalizeTranslocationOption = (value: any): TranslocationOption => {
    const token = String(value || '').trim().toUpperCase();
    if (!token) return 'NONE';
    if (
      token === 'NONE' ||
      token === 'NATAL' ||
      token === 'A_NATAL' ||
      token === 'A-NATAL' ||
      token === 'B_NATAL' ||
      token === 'B-NATAL'
    ) {
      return 'NONE';
    }
    if (token === 'A_LOCAL' || token === 'A-LOCAL') return 'A_LOCAL';
    if (token === 'B_LOCAL' || token === 'B-LOCAL') return 'B_LOCAL';
    if (token === 'BOTH_LOCAL' || token === 'BOTH-LOCAL' || token === 'BOTH') return 'BOTH_LOCAL';
    if (token === 'MIDPOINT') return 'MIDPOINT';

    return 'NONE';
  };
  const [translocation, setTranslocation] = useState<TranslocationOption>('A_LOCAL');

  // Relocation coordinates (single-field); default from spec: 30°10'N, 85°40'W
  const [relocInput, setRelocInput] = useState<string>("30°10'N, 85°40'W");
  const [relocError, setRelocError] = useState<string | null>(null);
  const [relocCoords, setRelocCoords] = useState<{ lat: number; lon: number } | null>(() => parseCoordinates("30°10'N, 85°40'W"));
  // Human-readable relocation label + timezone (for summaries/badges)
  const [relocLabel, setRelocLabel] = useState<string>('Panama City, FL');
  const [relocTz, setRelocTz] = useState<string>('US/Central');
  // Auth states removed while Auth0 is paused
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const bNameRef = useRef<HTMLInputElement | null>(null);
  const lastSubmitRef = useRef<number>(0);
  // Lightweight toast for ephemeral notices (e.g., Mirror failure)
  const [toast, setToast] = useState<string | null>(null);
  // Report type: 'balance' (on-screen gauges) | 'mirror' (handoff only)
  const [reportType, setReportType] = useState<'balance' | 'mirror'>('mirror');
  // Persist report type and allow deep-link via ?report=mirror
  useEffect(() => {
    try {
      // Initialize from URL and localStorage
      const url = new URL(window.location.href);

      // Check URL parameter for report type
      const q = url.searchParams.get('report');
      if (q === 'mirror' || q === 'balance') {
        setReportType(q as any);
      } else {
        // Then check localStorage if no URL parameter
        const saved = window.localStorage.getItem('mb.reportType');
        if (saved === 'mirror' || saved === 'balance') {
          setReportType(saved as any);
        }
      }

      // Initialize weeklyAgg from localStorage
      const savedWeeklyAgg = window.localStorage.getItem('weeklyAgg');
      if (savedWeeklyAgg === 'max' || savedWeeklyAgg === 'mean') {
        setWeeklyAgg(savedWeeklyAgg);
      }

      // Initialize debug mode from URL
      setDebugMode(url.searchParams.get('debug') === '1');
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
  const [weeklyAgg, setWeeklyAgg] = useState<'mean' | 'max'>('mean');
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
  const isRelationalMode = RELATIONAL_MODES.includes(mode);
  const isDyadMode = includePersonB && isRelationalMode;
  const includeTransits = TRANSIT_MODES.has(mode);
  const soloModeOption = includeTransits
    ? { value: 'NATAL_TRANSITS' as ReportMode, label: 'Natal + Transits' }
    : { value: 'NATAL_ONLY' as ReportMode, label: 'Natal Only' };
  const relationalModeOptions: { value: ReportMode; label: string }[] = includePersonB
    ? includeTransits
      ? [
          { value: 'SYNASTRY_TRANSITS', label: 'Synastry + Transits' },
          { value: 'COMPOSITE_TRANSITS', label: 'Composite + Transits' },
        ]
      : [
          { value: 'SYNASTRY', label: 'Synastry' },
          { value: 'COMPOSITE', label: 'Composite' },
        ]
    : [];

  useEffect(() => {
    setTranslocation((prev) => {
      if (!includeTransits) {
        return 'NONE';
      }
      if (!isDyadMode && (prev === 'B_LOCAL' || prev === 'BOTH_LOCAL' || prev === 'MIDPOINT')) {
        return 'NONE';
      }
      if (prev === 'MIDPOINT' && (mode !== 'COMPOSITE_TRANSITS' || reportType !== 'balance')) {
        return isDyadMode ? 'BOTH_LOCAL' : 'NONE';
      }
      return prev;
    });
  }, [includeTransits, isDyadMode, mode, reportType]);

  // Track if user has manually set dates to avoid overriding their choices
  const [userHasSetDates, setUserHasSetDates] = useState(false);
  const [initialReportType] = useState(reportType);

  // Update date range when report type changes (but only if user hasn't manually set dates)
  // OR when report type changes from initial - give them fresh defaults for different report types
  useEffect(() => {
    const reportTypeChanged = reportType !== initialReportType;

    if (!userHasSetDates || reportTypeChanged) {
      const defaultDates = getDefaultDates(reportType);
      setStartDate(defaultDates.start);
      setEndDate(defaultDates.end);

      // If report type changed, reset the user flag to allow future report type changes to work
      if (reportTypeChanged) {
        setUserHasSetDates(false);
      }
    }
  }, [reportType, getDefaultDates, userHasSetDates, initialReportType]);

  const relocationSelectLabels: Record<TranslocationOption, string> = useMemo(() => ({
    NONE: 'Birthplace (no relocation)',

    A_NATAL: 'Birthplace (no relocation)',
    A_LOCAL: 'Person A – Current Location',
    B_NATAL: 'Birthplace (no relocation)',
    B_LOCAL: 'Person B – Current Location',

    BOTH_LOCAL: 'Shared Location (custom city)',
    MIDPOINT: 'Midpoint (Composite only)'
  }), []);

  const relocationModeCaption = useMemo(() => ({
    NONE: 'Relocation mode: None (natal locations)',
    A_NATAL: 'Relocation mode: A_natal (houses not recalculated, by design)',
    A_LOCAL: 'Relocation mode: A_local (houses recalculated)',
    B_NATAL: 'Relocation mode: B_natal (houses not recalculated, by design)',
    B_LOCAL: 'Relocation mode: B_local (houses recalculated)',

    BOTH_LOCAL: 'Relocation mode: Both_local (houses recalculated)',
    MIDPOINT: 'Relocation mode: Midpoint (synthetic shared frame, houses recalculated)',

  }), []);

  type RelocationOptionConfig = { value: TranslocationOption; disabled?: boolean; title?: string };

  const relocationOptions = useMemo<RelocationOptionConfig[]>(() => {
    const options: RelocationOptionConfig[] = [
      { value: 'NONE' },
      { value: 'A_LOCAL' },
    ];

    const relationalDisabled = !isDyadMode;
    options.push({
      value: 'B_LOCAL',
      disabled: relationalDisabled,
      title: relationalDisabled ? 'Requires Person B in a relational report.' : undefined,
    });
    options.push({
      value: 'BOTH_LOCAL',
      disabled: relationalDisabled,
      title: relationalDisabled ? 'Requires Person B in a relational report.' : undefined,
    });

    if (mode === 'COMPOSITE_TRANSITS') {
      const midpointDisabled = relationalDisabled || reportType !== 'balance';
      options.push({
        value: 'MIDPOINT',
        disabled: midpointDisabled,
        title: midpointDisabled
          ? (reportType !== 'balance'
              ? 'Midpoint relocation is only supported in Relational Balance reports.'
              : 'Midpoint relocation requires both Person A and Person B.')
          : 'Experimental — bond midpoint, not a physical place.',
      });
    }

    if (!options.some((opt) => opt.value === translocation)) {
      options.push({ value: translocation, disabled: true });
    }

    return options;
  }, [isDyadMode, mode, reportType, translocation]);

  const parseMaybeNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const num = Number(value);
      if (Number.isFinite(num)) return num;
    }
    return null;
  };

  const personBLocationReady = useMemo(() => {
    if (!isDyadMode) return false;
    const lat = parseMaybeNumber(personB.latitude);
    const lon = parseMaybeNumber(personB.longitude);
    const tz = typeof personB.timezone === 'string' ? personB.timezone.trim() : '';
    return lat !== null && lon !== null && tz !== '';
  }, [isDyadMode, personB]);

  const relocationInputReady = useMemo(() => {
    if (!relocCoords || relocError) return false;
    const latReady = Number.isFinite(relocCoords.lat);
    const lonReady = Number.isFinite(relocCoords.lon);
    const tzReady = typeof relocTz === 'string' && relocTz.trim() !== '';
    return latReady && lonReady && tzReady;
  }, [relocCoords, relocError, relocTz]);

  const relocationStatus = useMemo(() => {
    let effectiveMode: TranslocationOption = translocation;
    let notice: string | null = null;

    if (reportType === 'mirror') {
      if (translocation === 'A_LOCAL' && !relocationInputReady) {
        effectiveMode = 'NONE';
        notice = 'Relocation not provided; defaulting to natal houses.';
      } else if (translocation === 'B_LOCAL') {
        if (!isDyadMode) {
          effectiveMode = 'NONE';
          notice = 'Person B is not available; defaulting to natal houses.';
        } else if (!personBLocationReady) {
          effectiveMode = 'NONE';
          notice = 'Relocation not provided; defaulting to natal houses.';
        }
      } else if (translocation === 'BOTH_LOCAL' && !relocationInputReady) {
        effectiveMode = 'NONE';
        notice = 'Shared relocation requires coordinates; defaulting to natal houses.';
      } else if (translocation === 'MIDPOINT') {
        effectiveMode = 'NONE';
        notice = 'Midpoint relocation is only available for Relational Balance reports.';
      }
    } else {
      if (translocation === 'A_LOCAL' && !relocationInputReady) {
        effectiveMode = 'NONE';
        notice = 'Relocation not provided; defaulting to natal houses.';
      } else if (translocation === 'B_LOCAL') {
        if (!isDyadMode) {
          effectiveMode = relocationInputReady ? 'A_LOCAL' : 'NONE';
          notice = 'Person B is not included; select a valid relocation lens.';
        } else if (!personBLocationReady) {
          effectiveMode = 'NONE';
          notice = 'Relocation not provided; defaulting to natal houses.';
        }
      } else if (translocation === 'BOTH_LOCAL') {
        if (!isDyadMode) {
          effectiveMode = relocationInputReady ? 'A_LOCAL' : 'NONE';
          notice = 'Shared relocation requires both Person A and Person B.';
        } else if (!relocationInputReady) {
          effectiveMode = 'NONE';
          notice = 'Relocation not provided; defaulting to natal houses.';
        }
      } else if (translocation === 'MIDPOINT') {
        if (!isDyadMode) {
          effectiveMode = relocationInputReady ? 'A_LOCAL' : 'NONE';
          notice = 'Midpoint relocation requires both Person A and Person B.';
        } else if (reportType !== 'balance') {
          effectiveMode = relocationInputReady ? 'BOTH_LOCAL' : 'NONE';
          notice = 'Midpoint relocation is only available for Relational Balance reports.';
        } else {
          effectiveMode = 'MIDPOINT';
        }
      }
    }

    return { effectiveMode, notice };
  }, [translocation, reportType, relocationInputReady, isDyadMode, personBLocationReady]);

  // If Person B is turned off while a relational mode is selected, reset to a solo mode
  useEffect(() => {
    if (!includePersonB && RELATIONAL_MODES.includes(mode)) {
      setMode((prev) => (TRANSIT_MODES.has(prev) ? 'NATAL_TRANSITS' : 'NATAL_ONLY'));
    }
  }, [includePersonB, mode]);

  useEffect(() => {
    if (!includePersonB && (translocation === 'B_LOCAL' || translocation === 'MIDPOINT' || translocation === 'BOTH_LOCAL')) {
      setTranslocation('NONE');
    }
  }, [includePersonB, translocation]);

  // Auto-focus Person B name input when Person B is enabled
  useEffect(() => {
    if (includePersonB) {
      bNameRef.current?.focus();
    }
  }, [includePersonB]);

  // Auth handled by AuthProvider; no inline initialization here to avoid hydration mismatches.

  function resetSessionMemory() {
    try {
      window.localStorage.removeItem('mb.lastInputs');
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
      if (saved.mode) setMode(normalizeReportMode(saved.mode));
      if (saved.step) setStep(saved.step);
      if (saved.startDate) {
        setStartDate(saved.startDate);
        setUserHasSetDates(true);
      }
      if (saved.endDate) {
        setEndDate(saved.endDate);
        setUserHasSetDates(true);
      }
      if (saved.relationshipType) setRelationshipType(saved.relationshipType);
      if (typeof saved.exEstranged === 'boolean') setExEstranged(saved.exEstranged);
      if (typeof saved.relationshipNotes === 'string') setRelationshipNotes(saved.relationshipNotes);
      if (typeof saved.relationshipTier === 'string') setRelationshipTier(saved.relationshipTier);
      if (typeof saved.relationshipRole === 'string') setRelationshipRole(saved.relationshipRole);

      if (typeof saved.contactState === 'string') setContactState(saved.contactState.toUpperCase() === 'LATENT' ? 'LATENT' : 'ACTIVE');
      if (saved.translocation) {
        setTranslocation(normalizeTranslocationOption(saved.translocation));
      }

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
      state: personA.state,
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
      state: personB.state || prevA.state,
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
      state: personA.state,
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
      state: "",
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
      state: prev.state || '',
      latitude: prev.latitude || '',
      longitude: prev.longitude || '',
    }));
  }

  // Post-generation actions / helpers removed
  // Note: Handoff to Poetic Brain is now manual via file upload only

  function handlePrint() {
    try { window.print(); } catch {/* noop */}
  }

  // Generate a text-based PDF so downstream tools (including Poetic Brain) can parse content
  async function downloadResultPDF() {
    if (!result) {
      setToast('No report available to export');
      setTimeout(() => setToast(null), 2000);
      return;
    }

    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

      const target = reportRef.current;
      let renderedText = '';
      if (target) {
        const clone = target.cloneNode(true) as HTMLElement;
        const printableHidden = clone.querySelectorAll('.print\\:hidden');
        printableHidden.forEach((el) => el.remove());
        clone.querySelectorAll('button, input, textarea, select').forEach((el) => el.remove());
        renderedText = clone.innerText
          .replace(/\u00a0/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      const reportKind = reportType === 'balance' ? 'Balance Meter' : 'Mirror';
      const generatedAt = new Date();
      const sections: Array<{ title: string; body: string; mode: 'regular' | 'mono' }> = [];

      if (renderedText) {
        sections.push({ title: 'Rendered Summary', body: renderedText, mode: 'regular' });
      }
      sections.push({
        title: 'Raw JSON Snapshot',
        body: JSON.stringify(result, null, 2),
        mode: 'mono',
      });

      const pdfDoc = await PDFDocument.create();
      pdfDoc.setTitle(`Woven Web App — ${reportKind} Report`);
      pdfDoc.setSubject('Math Brain geometry export');
      pdfDoc.setAuthor('Woven Web App');
      pdfDoc.setCreationDate(generatedAt);
      pdfDoc.setModificationDate(generatedAt);

      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

      const margin = 48;
      const headerSize = 16;
      const bodySize = 11;
      const monoSize = 9;

      let page = pdfDoc.addPage();
      let { width, height } = page.getSize();
      let cursorY = height - margin;
      let maxWidth = width - margin * 2;

      const ensureSpace = (needed: number) => {
        if (cursorY - needed < margin) {
          page = pdfDoc.addPage();
          ({ width, height } = page.getSize());
          maxWidth = width - margin * 2;
          cursorY = height - margin;
        }
      };

      const drawLine = (
        text: string,
        options: { font: any; size: number; color?: ReturnType<typeof rgb>; gap?: number; xOffset?: number },
      ) => {
        const { font, size, color = rgb(0.1, 0.1, 0.1), gap = 4, xOffset = 0 } = options;
        ensureSpace(size + gap);
        page.drawText(text, { x: margin + xOffset, y: cursorY, size, font, color });
        cursorY -= size + gap;
      };

      const wrapRegular = (input: string) => {
        const lines: string[] = [];
        const text = input.replace(/\s+/g, ' ').trim();
        if (!text) {
          lines.push('');
          return lines;
        }
        const words = text.split(' ');
        let current = '';
        for (const word of words) {
          const candidate = current ? `${current} ${word}` : word;
          if (regularFont.widthOfTextAtSize(candidate, bodySize) <= maxWidth) {
            current = candidate;
          } else {
            if (current) lines.push(current);
            if (regularFont.widthOfTextAtSize(word, bodySize) <= maxWidth) {
              current = word;
            } else {
              let remaining = word;
              const approxCharWidth = regularFont.widthOfTextAtSize('M', bodySize) || bodySize * 0.6;
              const maxChars = Math.max(1, Math.floor(maxWidth / approxCharWidth));
              while (remaining.length > 0) {
                lines.push(remaining.slice(0, maxChars));
                remaining = remaining.slice(maxChars);
              }
              current = '';
            }
          }
        }
        if (current) lines.push(current);
        return lines;
      };

      const writeParagraph = (text: string) => {
        const normalized = text.replace(/\r/g, '');
        const chunks = normalized.split(/\n+/);
        for (const chunk of chunks) {
          const trimmed = chunk.trim();
          if (!trimmed) {
            ensureSpace(bodySize);
            cursorY -= bodySize;
            continue;
          }
          const wrapped = wrapRegular(trimmed);
          for (const line of wrapped) {
            drawLine(line, { font: regularFont, size: bodySize });
          }
          if (cursorY - 2 < margin) {
            ensureSpace(bodySize);
          }
          cursorY -= 2;
        }
      };

      const writeMonospace = (text: string) => {
        const normalized = text.replace(/\r/g, '');
        const lines = normalized.split('\n');
        const charWidth = monoFont.widthOfTextAtSize('M', monoSize) || monoSize * 0.6;
        const maxChars = Math.max(1, Math.floor(maxWidth / charWidth));
        for (const raw of lines) {
          if (!raw) {
            ensureSpace(monoSize);
            cursorY -= monoSize;
            continue;
          }
          let remaining = raw;
          while (remaining.length > 0) {
            const segment = remaining.slice(0, maxChars);
            drawLine(segment, { font: monoFont, size: monoSize, gap: 2 });
            remaining = remaining.slice(segment.length);
          }
        }
      };

      drawLine(`Woven Web App · ${reportKind} Report`, { font: boldFont, size: headerSize, gap: 8 });
      drawLine(`Generated: ${generatedAt.toLocaleString()}`, { font: regularFont, size: 10, color: rgb(0.35, 0.35, 0.35), gap: 12 });

      sections.forEach((section) => {
        drawLine(section.title, { font: boldFont, size: 13, gap: 6 });
        if (section.mode === 'mono') {
          writeMonospace(section.body);
        } else {
          writeParagraph(section.body);
        }
        if (cursorY - 6 < margin) {
          ensureSpace(bodySize);
        }
        cursorY -= 6;
      });

      const pdfBytes = await pdfDoc.save();

      const pdfArrayBuffer = new ArrayBuffer(pdfBytes.byteLength);
      new Uint8Array(pdfArrayBuffer).set(pdfBytes);
      const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      const stamp = generatedAt.toISOString().slice(0, 10);
      link.href = url;
      link.download = `math-brain-report-${stamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast('Downloading PDF report');
      setTimeout(() => setToast(null), 1600);
    } catch (err) {
      console.error('PDF export failed', err);
      setToast('Could not generate PDF');
      setTimeout(() => setToast(null), 2000);
    }
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
      try { setToast('Downloading result JSON'); setTimeout(()=>setToast(null), 1400); } catch {/* noop */}
    } catch {/* noop */}
  }

  // Shared: Save current setup to JSON
  type SaveWhich = 'AUTO' | 'A_ONLY' | 'A_B';
  function handleSaveSetupJSON(which: SaveWhich = 'AUTO') {
    try {
      // portable snapshot (includes Person A & optionally Person B)
      const inputs: any = {
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
        contactState,
        exEstranged,
        relationshipNotes,
      };

      // If Person B isn't included or has no meaningful values, omit it from the snapshot
      const hasMeaningfulB = Boolean(
        includePersonB && personB && (
          (personB as any).name?.toString().trim() ||
          (personB as any).latitude != null ||
          (personB as any).longitude != null ||
          (personB as any).timezone ||
          (personB as any).year || (personB as any).month || (personB as any).day ||
          (personB as any).hour || (personB as any).minute
        )
      );
      const forceExcludeB = which === 'A_ONLY';
      const forceIncludeB = which === 'A_B';
      const shouldIncludeB = forceIncludeB ? includePersonB : hasMeaningfulB;
      if (forceExcludeB || !shouldIncludeB) {
        delete inputs.personB;
        inputs.includePersonB = false;
      }

      const json = JSON.stringify(inputs, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
      const filename = which === 'A_ONLY' ? `math_brain_setup_A_${stamp}.json` : `math_brain_setup_${stamp}.json`;

      // Prefer File System Access API when available (Chrome/Edge)
      const w: any = window as any;
      if (typeof w.showSaveFilePicker === 'function') {
        (async () => {
          try {
            const handle = await w.showSaveFilePicker({
              suggestedName: filename,
              types: [
                {
                  description: 'JSON files',
                  accept: { 'application/json': ['.json'] },
                },
              ],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            try { setToast('Saved setup JSON'); setTimeout(()=>setToast(null), 1800); } catch {/* noop */}
          } catch (e) {
            // If user cancels or API fails, fall back to anchor method
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              setToast('Setup JSON downloaded');
              setTimeout(() => setToast(null), 1800);
            }, 150);
          }
        })();
        return;
      }

      // Fallback: object URL + temporary anchor (works across browsers)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none'; // Hide the link
      document.body.appendChild(a);
      a.click();

      // conservative cleanup to ensure download starts before revoke (Safari)
      setTimeout(() => {
        try { document.body.removeChild(a); } catch {/* noop */}
        try { URL.revokeObjectURL(url); } catch {/* noop */}
        setToast('Setup JSON downloaded');
        setTimeout(() => setToast(null), 1800);
      }, 150);
    } catch (err) {
      console.error('Save setup failed:', err);
      try {
        // Last-resort clipboard fallback to ensure action does something
        navigator?.clipboard?.writeText?.(JSON.stringify({
          mode, step, startDate, endDate, includePersonB, translocation, personA, personB
        }, null, 2)).then(()=>{
          setToast('Saved to clipboard (download blocked)');
          setTimeout(()=>setToast(null), 2200);
        }).catch(()=>{
          setToast('Save setup failed');
          setTimeout(()=>setToast(null), 2200);
        });
      } catch {/* noop */}
    }
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
          const contactRaw = rc.contact_state || rc.contactState || rc.contact_status;
          if (contactRaw) {
            const state = String(contactRaw).toUpperCase();
            setContactState(state === 'LATENT' ? 'LATENT' : 'ACTIVE');
          }
        }

        if (data.period) {
          const pr = data.period;
          if (pr.start) {
            setStartDate(String(pr.start));
            setUserHasSetDates(true);
          }
          if (pr.end) {
            setEndDate(String(pr.end));
            setUserHasSetDates(true);
          }
          if (pr.step) setStep(String(pr.step).toLowerCase());
        }

        if (data.relocation) {
          const rl = data.relocation;
          if (rl.mode) setTranslocation(normalizeTranslocationOption(rl.mode));
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
        if (data.mode) setMode(normalizeReportMode(data.mode));
        if (data.step) setStep(data.step);
        if (data.startDate) {
          setStartDate(data.startDate);
          setUserHasSetDates(true);
        }
        if (data.endDate) {
          setEndDate(data.endDate);
          setUserHasSetDates(true);
        }
        if (typeof data.exEstranged === 'boolean') setExEstranged(data.exEstranged);
        if (typeof data.relationshipNotes === 'string') setRelationshipNotes(data.relationshipNotes);
        if (typeof data.relationshipTier === 'string') setRelationshipTier(data.relationshipTier);
        if (typeof data.relationshipRole === 'string') setRelationshipRole(data.relationshipRole);

        if (typeof data.contactState === 'string') setContactState(data.contactState.toUpperCase() === 'LATENT' ? 'LATENT' : 'ACTIVE');
        if (data.translocation) {
          setTranslocation(normalizeTranslocationOption(data.translocation));
        }

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
    if (e.currentTarget) e.currentTarget.value = '';
  }

  const canSubmit = useMemo(() => {
    // Basic local checks
    const required = [
      personA.name,
      personA.city,
      personA.state,
      personA.timezone,
      personA.zodiac_type,
    ];
    // Allow unknown birth time when user selected a time policy (non-user_provided)
    const allowUnknownA = timeUnknown && timePolicy !== 'user_provided';
    // For Mirror runs, allow city/state/timezone without requiring lat/lon upfront
    const requireCoords = (reportType === 'balance');
    const numbers = [
      Number(personA.year),
      Number(personA.month),
      Number(personA.day),
      ...(allowUnknownA ? [] as number[] : [Number(personA.hour), Number(personA.minute)]),
      ...(requireCoords ? [Number(personA.latitude), Number(personA.longitude)] : [])
    ];
    const allPresent = required.every(Boolean) && numbers.every((n) => !Number.isNaN(n)) && aCoordsValid;

  const isRelational = RELATIONAL_MODES.includes(mode);
    if (!isRelational) {
      // Mirror does not need a date window; Balance Meter does
      if (reportType === 'mirror') return allPresent;
      return allPresent && Boolean(startDate) && Boolean(endDate);
    }

    // For relational modes, Person B must be included and minimally valid
  if (!includePersonB) return false;
  const bRequired = [personB.name, personB.city, personB.state, personB.timezone, personB.zodiac_type];
  const allowUnknownB = timeUnknownB && timePolicy !== 'user_provided';
  const bNums = [
    Number(personB.year), Number(personB.month), Number(personB.day),
    ...(allowUnknownB ? [] as number[] : [Number(personB.hour), Number(personB.minute)]),
    Number(personB.latitude), Number(personB.longitude)
  ];
  const bOk = bRequired.every(Boolean) && bNums.every((n)=>!Number.isNaN(n)) && bCoordsValid;

    // Relationship context soft validation (backend will enforce precisely)
    let relOk = true;
    if (relationshipType === 'PARTNER') relOk = !!relationshipTier;
    if (relationshipType === 'FAMILY') relOk = !!relationshipRole;

    return allPresent && bOk && relOk && Boolean(startDate) && Boolean(endDate);
  }, [personA, personB, includePersonB, relationshipType, relationshipTier, relationshipRole, mode, startDate, endDate, aCoordsValid, bCoordsValid, timeUnknown, timeUnknownB, timePolicy]);
  const submitDisabled = useMemo(() => {
    // Additional relocation/report gate
    const locGate = needsLocation(reportType, false, personA); // includeTransitTag handled in backend; UI enforces for balance only
    if (reportType === 'balance' && !locGate.hasLoc) return true;
    if (!canSubmit || loading) return true;
    return false;
  }, [canSubmit, loading, personA, reportType]);

  // Debug panel toggle (append ?debug=1 to the URL to enable)
  const [debugMode, setDebugMode] = useState(false);

  const debugInfo = useMemo(() => ({
    reportType,
    needsLocation: needsLocation(reportType, false, personA),
    canSubmit,
    submitDisabled,
    aCoordsValid,
    bCoordsValid,
    includePersonB,
    timeUnknown,
    timeUnknownB,
    timePolicy,
    contactState,
    personA_lat_type: typeof (personA as any).latitude,
    personA_lon_type: typeof (personA as any).longitude,
  }), [reportType, canSubmit, submitDisabled, aCoordsValid, bCoordsValid, includePersonB, timeUnknown, timeUnknownB, timePolicy, contactState, personA]);

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
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError("Transit start date must be on or before the end date.");
      return;
    }
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
      const wantsTransits = includeTransits;
      const payload = {
        mode,
        personA: {
          ...personA,
          nation: "US", // Always send "US" as country for API compatibility
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
        ...(wantsTransits ? {
          window: { start: startDate, end: endDate, step },
          transits: { from: startDate, to: endDate, step },
        } : {}),
        transitStartDate: startDate,
        transitEndDate: endDate,
        transitStep: step,
        // Report type drives backend routing semantics (mirror vs balance meter)
        context: {
          mode: reportType === 'balance' ? 'balance_meter' : 'mirror',
        },
        // Pass translocation intent to backend (data-only context)
        translocation: ((): any => {
          if (!includeTransits) {
            return { applies: false, method: 'Natal' };
          }
          const mode = relocationStatus.effectiveMode;
          if (mode === 'NONE' || mode === 'A_NATAL' || mode === 'B_NATAL') {
            return { applies: false, method: 'Natal' };
          }
          if (mode === 'MIDPOINT') {
            return { applies: true, method: 'Midpoint' };
          }
          const methodMap: Record<TranslocationOption, string> = {
            NONE: 'Natal',
            A_NATAL: 'Natal',
            A_LOCAL: 'A_local',
            B_NATAL: 'Natal',
            B_LOCAL: 'B_local',
            BOTH_LOCAL: 'Both_local',
            MIDPOINT: 'Midpoint',
          };
          return {
            applies: true,
            method: methodMap[mode] || 'Custom',
            coords:
              !relocCoords
                ? undefined
                : { latitude: relocCoords.lat, longitude: relocCoords.lon },
            current_location: relocLabel || undefined,
            tz: relocTz || undefined,
          };
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
            contactState,
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
      if (RELATIONAL_MODES.includes(mode) && includePersonB) {
        (payload as any).personB = {
          ...personB,
          nation: "US", // Always send "US" as country for API compatibility
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
          contact_state: contactState,
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
      // No automatic handoff to Poetic Brain - maintaining separation principle
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

  // Duplicate download functions removed - using downloadResultJSON and downloadResultPDF instead

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* Auth handled globally by HomeHero - Math Brain works independently */}

      <header className="text-center print:hidden">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-100">Math Brain</h1>
        <p className="mt-4 text-base md:text-lg text-slate-300">
          Run the geometry first. Then jump into Chat to synthesize the narrative.
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
        <a
          href="/chat"
          className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
        >
          Go to Poetic Brain
        </a>
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
        {debugMode && (
          <div className="mb-4 rounded-md border border-slate-600 bg-slate-900/60 p-3 text-xs text-slate-200">
            <div className="font-medium mb-2">Debug — gating state</div>
            <pre className="whitespace-pre-wrap break-words text-[12px]">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-slate-700 bg-slate-800">
              <button
                type="button"
                onClick={() => handleSaveSetupJSON('A_ONLY')}
                className="px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                title="Save only Person A’s setup to JSON"
                aria-label="Save only Person A setup"
              >
                Save A
              </button>
              <div className="h-6 w-px bg-slate-700 my-1" />
              <button
                type="button"
                onClick={() => handleSaveSetupJSON('A_B')}
                className="px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                title="Save Person A + B (if included)"
                aria-label="Save Person A and B setup"
              >
                Save A+B
              </button>
            </div>
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
              <label
                className={`px-3 py-1.5 text-sm cursor-pointer ${reportType==='mirror' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}
                title="Send to Poetic Brain"
                onClick={() => setReportType('mirror')}
              >
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
              <label
                className={`px-3 py-1.5 text-sm cursor-pointer ${reportType==='balance' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}
                title="Show gauges on screen"
                onClick={() => setReportType('balance')}
              >
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
            <div className="text-xs text-slate-400 max-w-md">
              {reportType === 'mirror' && (
                "Full narrative analysis with geometric handoff to Poetic Brain for interpretive synthesis"
              )}
              {reportType === 'balance' && (
                "Triple-channel readings (Seismograph v1.0 · Balance v1.1 · SFD v1.2) for health data correlation"
              )}
            </div>
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
                    className="mt-1 w-full min-w-[80px] h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={String(personA.year)}
                    onChange={(e) => setPersonA({ ...personA, year: onlyDigits(e.target.value, 4) })}
                    placeholder="YYYY"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="a-month" className="block text-[11px] uppercase tracking-wide text-slate-300">Month</label>
                  <input
                    id="a-month"
                    type="text"
                    inputMode="numeric"
                    className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-center text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={String(personA.month || '')}
                    onChange={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      if (!v) {
                        setPersonA({ ...personA, month: '' });
                        return;
                      }
                      const num = Number(v);
                      // Allow incomplete input (like "0") and valid range (1-12)
                      if (v === "0" || (num >= 1 && num <= 12)) {
                        setPersonA({ ...personA, month: v }); // Keep raw input like "0" or "04"
                      } else {
                        // Only clamp if it's a complete invalid number
                        const clamped = Math.min(12, Math.max(1, num));
                        setPersonA({ ...personA, month: String(clamped) });
                      }
                    }}
                    onBlur={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 1, 12);
                      // Pad on blur for final formatting
                      setPersonA({ ...personA, month: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                    }}
                    placeholder="MM"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="a-day" className="block text-[11px] uppercase tracking-wide text-slate-300">Day</label>
                  <input
                    id="a-day"
                    type="text"
                    inputMode="numeric"
                    className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-center text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={String(personA.day || '')}
                    onChange={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      if (!v) {
                        setPersonA({ ...personA, day: '' });
                        return;
                      }
                      const num = Number(v);
                      if (v === "0" || (num >= 1 && num <= 31)) {
                        setPersonA({ ...personA, day: v });
                      } else {
                        const clamped = Math.min(31, Math.max(1, num));
                        setPersonA({ ...personA, day: String(clamped) });
                      }
                    }}
                    onBlur={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 1, 31);
                      // Pad on blur for final formatting
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
                    value={String(personA.hour || '')}
                    onChange={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 0, 23);
                      // Keep raw input while typing, only clamp if out of bounds
                      setPersonA({ ...personA, hour: Number.isNaN(n) ? v : (n === Number(v) ? v : String(n)) });
                    }}
                    onBlur={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 0, 23);
                      // Pad on blur for final formatting
                      setPersonA({ ...personA, hour: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                    }}
                    placeholder="HH"
                    required={!allowUnknownA}
                  />
                </div>
                <div>
                  <label htmlFor="a-minute" className="block text-[11px] uppercase tracking-wide text-slate-300">Minute</label>
                  <input
                    id="a-minute"
                    type="text"
                    inputMode="numeric"
                    className="mt-1 w-full min-w-[60px] h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={String(personA.minute || '')}
                    onChange={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 0, 59);
                      // Keep raw input while typing, only clamp if out of bounds
                      setPersonA({ ...personA, minute: Number.isNaN(n) ? v : (n === Number(v) ? v : String(n)) });
                    }}
                    onBlur={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 0, 59);
                      // Pad on blur for final formatting
                      setPersonA({ ...personA, minute: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                    }}
                    placeholder="MM"
                    required={!allowUnknownA}
                  />
                </div>
              </div>            <div>
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
              <label htmlFor="a-state" className="block text-[11px] uppercase tracking-wide text-slate-300">State / Province</label>
              <input
                id="a-state"
                className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={personA.state}
                onChange={(e) => setPersonA({ ...personA, state: e.target.value })}
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">Nation assumed “US” for API compatibility.</p>
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
                <label htmlFor="toggle-include-b-a" className="inline-flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
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

            <div className={`mt-4 ${!includePersonB ? 'opacity-50' : ''}`}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="b-name" className="block text-[11px] uppercase tracking-wide text-slate-300">Name</label>
                <input
                  id="b-name"
                  ref={bNameRef}
                  placeholder="Their Name"
                  disabled={!includePersonB}
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  value={personB.name}
                  onChange={(e) => setPersonB({ ...personB, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label htmlFor="b-year" className="block text-[11px] uppercase tracking-wide text-slate-300">Year</label>
                  <input
                    id="b-year"
                    type="text"
                    inputMode="numeric"
                    disabled={!includePersonB}
                    className="mt-1 w-full min-w-[80px] h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={String(personB.year)}
                    onChange={(e) => setPersonB({ ...personB, year: onlyDigits(e.target.value, 4) })}
                    placeholder="YYYY"
                  />
                </div>
                <div>
                  <label htmlFor="b-month" className="block text-[11px] uppercase tracking-wide text-slate-300">Month</label>
                  <input
                    id="b-month"
                    type="text"
                    inputMode="numeric"
                    disabled={!includePersonB}
                    className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-center text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={String(personB.month || '')}
                    onChange={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      if (!v) {
                        setPersonB({ ...personB, month: '' });
                        return;
                      }
                      const num = Number(v);
                      // Allow incomplete input (like "0") and valid range (1-12)
                      if (v === "0" || (num >= 1 && num <= 12)) {
                        setPersonB({ ...personB, month: v }); // Keep raw input like "0" or "04"
                      } else {
                        // Only clamp if it's a complete invalid number
                        const clamped = Math.min(12, Math.max(1, num));
                        setPersonB({ ...personB, month: String(clamped) });
                      }
                    }}
                    onBlur={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 1, 12);
                      // Pad on blur for final formatting
                      setPersonB({ ...personB, month: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                    }}
                    placeholder="MM"
                  />
                </div>
                <div>
                  <label htmlFor="b-day" className="block text-[11px] uppercase tracking-wide text-slate-300">Day</label>
                  <input
                    id="b-day"
                    type="text"
                    inputMode="numeric"
                    disabled={!includePersonB}
                    className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={String(personB.day || '')}
                    onChange={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      if (!v) {
                        setPersonB({ ...personB, day: '' });
                        return;
                      }
                      const num = Number(v);
                      if (v === "0" || (num >= 1 && num <= 31)) {
                        setPersonB({ ...personB, day: v });
                      } else {
                        const clamped = Math.min(31, Math.max(1, num));
                        setPersonB({ ...personB, day: String(clamped) });
                      }
                    }}
                    onBlur={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 1, 31);
                      // Pad on blur for final formatting
                      setPersonB({ ...personB, day: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                    }}
                    placeholder="DD"
                  />
                </div>
                <div>
                  <label htmlFor="b-hour" className="block text-[11px] uppercase tracking-wide text-slate-300">Hour</label>
                  <input
                    id="b-hour"
                    type="text"
                    inputMode="numeric"
                    disabled={!includePersonB}
                    className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={String(personB.hour || '')}
                    onChange={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 0, 23);
                      // Keep raw input while typing, only clamp if out of bounds
                      setPersonB({ ...personB, hour: Number.isNaN(n) ? v : (n === Number(v) ? v : String(n)) });
                    }}
                    onBlur={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 0, 23);
                      // Pad on blur for final formatting
                      setPersonB({ ...personB, hour: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                    }}
                    placeholder="HH"
                  />
                </div>
                <div>
                  <label htmlFor="b-minute" className="block text-[11px] uppercase tracking-wide text-slate-300">Minute</label>
                  <input
                    id="b-minute"
                    type="text"
                    inputMode="numeric"
                    disabled={!includePersonB}
                    className="mt-1 w-full min-w-[60px] h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    value={String(personB.minute || '')}
                    onChange={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 0, 59);
                      // Keep raw input while typing, only clamp if out of bounds
                      setPersonB({ ...personB, minute: Number.isNaN(n) ? v : (n === Number(v) ? v : String(n)) });
                    }}
                    onBlur={(e) => {
                      const v = onlyDigits(e.target.value, 2);
                      const n = clampNum(v, 0, 59);
                      // Pad on blur for final formatting
                      setPersonB({ ...personB, minute: Number.isNaN(n) ? '' : String(n).padStart(2, '0') });
                    }}
                    placeholder="MM"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="b-city" className="block text-[11px] uppercase tracking-wide text-slate-300">City</label>
                <input
                  id="b-city"
                  disabled={!includePersonB}
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={personB.city}
                  onChange={(e) => setPersonB({ ...personB, city: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="b-state" className="block text-[11px] uppercase tracking-wide text-slate-300">State / Province</label>
                <input
                  id="b-state"
                  disabled={!includePersonB}
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={personB.state}
                  onChange={(e) => setPersonB({ ...personB, state: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-slate-500">Nation assumed “US” for API compatibility.</p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="b-coords" className="block text-[11px] uppercase tracking-wide text-slate-300">Birth Coordinates (B)</label>
                <input
                  id="b-coords"
                  type="text"
                  disabled={!includePersonB}
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
                  disabled={!includePersonB}
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  value={personB.timezone}
                  onChange={(e) => setPersonB({ ...personB, timezone: e.target.value })}
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
                  disabled={!includePersonB}
                  className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50"
                  value={personB.zodiac_type}
                  onChange={(e) => setPersonB({ ...personB, zodiac_type: e.target.value })}
                >
                  <option value="Tropic">Tropic</option>
                  <option value="Sidereal">Sidereal</option>
                </select>
              </div>
              </div>
            </div>
          </Section>

          {/* Relationship Context (only when Person B included) */}
          <Section title="Relationship Context">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-slate-400">These fields unlock when Person B is included.</p>
            </div>
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${!includePersonB ? 'opacity-50' : ''}`}>
              <div>
                <label htmlFor="rel-type" className="block text-sm text-slate-300">Type</label>
                <select
                  id="rel-type"
                  disabled={!includePersonB}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                  value={relationshipType}
                  onChange={(e)=>{ setRelationshipType(e.target.value); setRelationshipTier(""); setRelationshipRole(""); }}
                >
                  <option value="PARTNER">Partner</option>
                  <option value="FRIEND">Friend / Acquaintance</option>
                  <option value="FAMILY">Family Member</option>
                </select>
                <div className="mt-2 text-[11px] text-slate-400">
                  <div className="font-medium text-slate-300">Primary Relational Tiers (scope):</div>
                  <div>• Partner — full map access, including intimacy arcs & legacy patterns.</div>
                  <div>• Friend / Acquaintance — emotional, behavioral, social dynamics; intimacy overlays de-emphasized.</div>
                  <div>• Family Member — legacy patterns and behavioral overlays; sexual resonance suppressed.
                    {' '}Select the role to clarify Person B's relationship to Person A.</div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-sm text-slate-300">Contact State</span>
                <div className="mt-2 inline-flex overflow-hidden rounded-md border border-slate-600 bg-slate-900/80">
                  <button
                    type="button"
                    disabled={!includePersonB}
                    onClick={() => setContactState('ACTIVE')}
                    className={`px-3 py-1.5 text-sm transition ${contactState === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'text-slate-200 hover:bg-slate-800'} ${!includePersonB ? 'cursor-not-allowed opacity-70' : ''}`}
                    aria-pressed={contactState === 'ACTIVE'}
                  >
                    Active
                  </button>
                  <div className="h-6 w-px bg-slate-700 my-1" />
                  <button
                    type="button"
                    disabled={!includePersonB}
                    onClick={() => setContactState('LATENT')}
                    className={`px-3 py-1.5 text-sm transition ${contactState === 'LATENT' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-800'} ${!includePersonB ? 'cursor-not-allowed opacity-70' : ''}`}
                    aria-pressed={contactState === 'LATENT'}
                  >
                    Latent
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Active treats overlays as live contact pressure; Latent logs the geometry but marks it dormant until reactivation.
                </p>
              </div>
              {relationshipType === 'PARTNER' && (
                <div>
                  <label htmlFor="rel-tier" className="block text-sm text-slate-300">Intimacy Tier</label>
                  <select
                    id="rel-tier"
                    disabled={!includePersonB}
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                    value={relationshipTier}
                    onChange={(e)=>setRelationshipTier(e.target.value)}
                  >
                    <option value="">Select…</option>
                    <option value="P1">P1 — Platonic partners</option>
                    <option value="P2">P2 — Friends-with-benefits</option>
                    <option value="P3">P3 — Situationship (unclear/unstable)</option>
                    <option value="P4">P4 — Low-commitment romantic or sexual</option>
                    <option value="P5a">P5a — Committed romantic + sexual</option>
                    <option value="P5b">P5b — Committed romantic, non-sexual</option>
                  </select>
                  {includePersonB && RELATIONAL_MODES.includes(mode) && !relationshipTier && (
                    <p className="mt-1 text-xs text-amber-400">Partner relationships require an intimacy tier.</p>
                  )}
                </div>
              )}
              {relationshipType === 'FAMILY' && (
                <div>
                  <label htmlFor="rel-role" className="block text-sm text-slate-300">Role (Person B is…)</label>
                  <select
                    id="rel-role"
                    disabled={!includePersonB}
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                    value={relationshipRole}
                    onChange={(e)=>setRelationshipRole(e.target.value)}
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
                  {includePersonB && RELATIONAL_MODES.includes(mode) && !relationshipRole && (
                    <p className="mt-1 text-xs text-amber-400">Family relationships require selecting a role.</p>
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
                  >
                    <option value="">—</option>
                    <option value="Friend">Friend</option>
                    <option value="Acquaintance">Acquaintance</option>
                    <option value="Colleague">Colleague</option>
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
                  disabled={!includePersonB}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  rows={3}
                  placeholder="Optional context (max 500 chars)"
                  value={relationshipNotes}
                  onChange={(e)=>setRelationshipNotes(e.target.value.slice(0,500))}
                />
              </div>
            </div>
          </Section>

          {/* Right column: Transits + actions */}
          <div className="space-y-6">
            <Section title="Transits">
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-3">
                  <input
                    id="include-transits"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                    checked={includeTransits}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setMode((prev) => (checked ? toTransitMode(prev) : toNatalMode(prev)));
                    }}
                  />
                  <div>
                    <label htmlFor="include-transits" className="block text-sm font-medium text-slate-100">
                      Include Transits
                    </label>
                    <p className="mt-1 text-xs text-slate-400">
                      Unchecked = natal-only modes; checked = natal + symbolic weather.
                    </p>
                  </div>
                </div>

                {includeTransits && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="t-start" className="block text-sm text-slate-300">Start Date</label>
                      <input
                        id="t-start"
                        type="date"
                        className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setUserHasSetDates(true);
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="t-end" className="block text-sm text-slate-300">End Date</label>
                      <input
                        id="t-end"
                        type="date"
                        className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setUserHasSetDates(true);
                        }}
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
                )}

                <div className={`grid grid-cols-1 gap-4 ${includeTransits ? 'sm:grid-cols-2' : ''}`}>
                  <div>
                    <label htmlFor="t-mode" className="block text-sm text-slate-300">Mode</label>
                    <select
                      id="t-mode"
                      className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      value={mode}
                      onChange={(e) => {
                        const normalized = normalizeReportMode(e.target.value);
                        setMode(normalized);
                        if (RELATIONAL_MODES.includes(normalized)) {
                          setIncludePersonB(true);
                        }
                      }}
                    >
                      <optgroup label="Solo">
                        <option value={soloModeOption.value}>{soloModeOption.label}</option>
                      </optgroup>
                      {includePersonB && relationalModeOptions.length > 0 && (
                        <optgroup label="Relational">
                          {relationalModeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {!includePersonB && (
                      <p className="mt-1 text-xs text-slate-400">
                        Enable “Include Person B” to unlock synastry or composite modes.
                      </p>
                    )}
                    {!includePersonB && RELATIONAL_MODES.includes(mode) && (
                      <p className="mt-1 text-xs text-amber-400">
                        Selecting a relational mode will enable “Include Person B”.
                      </p>
                    )}
                  </div>
                  {includeTransits && (
                    <div>
                      <label htmlFor="t-reloc" className="block text-sm text-slate-300">Relocation (angles/houses)</label>
                      <select
                        id="t-reloc"
                        className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        value={translocation}
                        onChange={(e) => setTranslocation(normalizeTranslocationOption(e.target.value))}
                      >
                        {relocationOptions.map((opt) => (
                          <option key={opt.value} value={opt.value} disabled={opt.disabled} title={opt.title}>
                            {relocationSelectLabels[opt.value]}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-400">
                        Relocation remaps houses/angles only; planets stay fixed. Choose the lens that fits this report.
                      </p>
                      {mode === 'COMPOSITE_TRANSITS' && (
                        <p className="mt-1 text-xs text-emerald-300">
                          Experimental — bond midpoint, not a physical place.
                        </p>
                      )}
                      {relocationStatus.notice && (
                        <p className="mt-1 text-xs text-amber-400">{relocationStatus.notice}</p>
                      )}
                      {(() => {
                        const relocActive = ['A_LOCAL', 'B_LOCAL', 'MIDPOINT', 'BOTH_LOCAL'].includes(
                          relocationStatus.effectiveMode
                        );
                        if (!relocActive) {
                          return (
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-200">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                              <span>{relocationModeCaption[relocationStatus.effectiveMode]}</span>
                            </div>
                          );
                        }
                        const lensLabel =
                          relocationStatus.effectiveMode === 'MIDPOINT'
                            ? 'Computed midpoint (A + B)'
                            : relocLabel || 'Custom';
                        const tzLabel =
                          relocationStatus.effectiveMode === 'MIDPOINT'
                            ? personA.timezone || '—'
                            : relocTz || personA.timezone || '—';
                        return (
                          <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-200">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                            <span className="font-medium">{relocationModeCaption[relocationStatus.effectiveMode]}</span>
                            <span className="text-emerald-100">Lens: {lensLabel}</span>
                            <span className="text-emerald-300">({tzLabel})</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {!includeTransits && (
                  <p className="text-xs text-slate-400">
                    Relocation options appear when transits are included.
                  </p>
                )}
              </div>
              {includeTransits && translocation !== 'NONE' && translocation !== 'A_NATAL' && translocation !== 'B_NATAL' && (
                <div className="mt-4">
                  <label htmlFor="t-reloc-coords" className="block text-sm text-slate-300">Relocation Coordinates</label>
                  <input
                    id="t-reloc-coords"
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

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="t-reloc-label" className="block text-sm text-slate-300">Relocation Label</label>
                      <input
                        id="t-reloc-label"
                        type="text"
                        className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        value={relocLabel}
                        onChange={(e)=>setRelocLabel(e.target.value)}
                        placeholder="e.g., Panama City, FL"
                      />
                    </div>
                    <div>
                      <label htmlFor="t-reloc-tz" className="block text-sm text-slate-300">Relocation Timezone</label>
                      <select
                        id="t-reloc-tz"
                        className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        value={relocTz}
                        onChange={(e)=>setRelocTz(e.target.value)}
                      >
                        {tzOptions.map((tz)=> (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {includeTransits && step === 'weekly' && (
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xs text-slate-400">Weekly aggregation</span>
                  <div className="relative group">
                    <button type="button" className="h-5 w-5 rounded-full border border-slate-600 text-[11px] text-slate-300 hover:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Help: Weekly aggregation semantics">?</button>
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg py-3 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none border border-slate-700 shadow-lg z-50" style={{width: '280px'}}>
                      <div>
                        <div className="font-semibold mb-2 text-indigo-300">Weekly Aggregation Methods</div>
                        <div className="space-y-2">
                          <div>
                            <strong className="text-green-300">Mean:</strong> Average of daily values per week
                            <div className="text-slate-400 text-[10px] mt-0.5">Best for understanding typical weekly patterns</div>
                          </div>
                          <div>
                            <strong className="text-orange-300">Max:</strong> Highest daily value per week
                            <div className="text-slate-400 text-[10px] mt-0.5">Best for tracking peak intensity moments</div>
                          </div>
                        </div>
                        <div className="text-slate-400 text-[10px] mt-2 pt-2 border-t border-slate-700">
                          For seismograph analysis: Mean shows flow, Max shows spikes
                        </div>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                  <div role="group" aria-label="Weekly aggregation" className="inline-flex overflow-hidden rounded-md border border-slate-700 bg-slate-800">
                    <button type="button" onClick={()=>setWeeklyAgg('mean')} className={`px-3 py-1 text-xs ${weeklyAgg==='mean' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}>Mean</button>
                    <button type="button" onClick={()=>setWeeklyAgg('max')} className={`px-3 py-1 text-xs ${weeklyAgg==='max' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}>Max</button>
                  </div>
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
            {(RELATIONAL_MODES.includes(mode) && !includePersonB) && (
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
        <div ref={reportRef} className="mt-8 grid grid-cols-1 gap-6">
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
          <div className="flex items-center justify-between gap-4 print:hidden">
            <div className="text-sm text-slate-400">
              <span>Download your report, then visit <a href="/chat" className="text-emerald-400 hover:text-emerald-300 underline">Poetic Brain</a> to upload it for interpretation.</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={downloadResultJSON} className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Download result JSON">Download JSON</button>
              <button type="button" onClick={downloadResultPDF} className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Download PDF">Download PDF</button>
            </div>
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
                              <td className="py-0.5 text-right">{Number(r.valence_bounded ?? r.valence ?? 0).toFixed(2)}</td>
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
                    <div className="text-slate-100">{(() => {
                      const m = String(t.method || 'Natal');
                      if (/^A[_ ]?local$/i.test(m) || m === 'A_local') return 'Person A';
                      if (/^B[_ ]?local$/i.test(m) || m === 'B_local') return 'Person B';
                      if (/^midpoint$/i.test(m)) return 'Person A + B';
                      if (/^natal$/i.test(m)) return 'None (Natal Base)';
                      return m;
                    })()}</div>
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
            const val = Number(summary.valence_bounded ?? summary.valence ?? 0);
            const vol = Number(summary.volatility ?? 0);
            const magnitudeLabel = summary.magnitude_label || (mag >= 3 ? 'Surge' : mag >= 1 ? 'Active' : 'Calm');
            const valenceLabel = summary.valence_label || (val > 0.5 ? 'Supportive' : val < -0.5 ? 'Challenging' : 'Mixed');
            const volatilityLabel = summary.volatility_label || (vol >= 3 ? 'Scattered' : vol >= 1 ? 'Variable' : 'Stable');
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
                    valence: Number(daily[d]?.seismograph?.valence_bounded ?? daily[d]?.seismograph?.valence ?? 0),
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
          </>)}
        </div>
      )}
    </main>
  );
}
