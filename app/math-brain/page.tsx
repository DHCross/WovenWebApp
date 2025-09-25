"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseCoordinates, formatDecimal } from "../../src/coords";
// AuthProvider removed - auth handled globally by HomeHero component
import { needsLocation, isTimeUnknown } from "../../lib/relocation";
import { sanitizeReportForPDF, sanitizeForPDF } from "../../src/pdf-sanitizer";
import { ContractLinter } from "../../src/contract-linter";
import { renderShareableMirror } from "../../lib/raven/render";

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
  const fmt = useCallback((d: Date) => d.toISOString().slice(0, 10), []);

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

  // Interactive drill-down state for Resonance Spectrum Source Geometry
  const [selectedPole, setSelectedPole] = useState<{
    date: string;
    type: 'magnitude' | 'volatility' | 'sfd' | 'valence';
    pole: 'wb' | 'abe';
    geometry: string[];
  } | null>(null);
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
  const [saveForNextSession, setSaveForNextSession] = useState<boolean>(false);
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
  const prevReportTypeRef = useRef(reportType);

  // Update date range when report type changes (but only if user hasn't manually set dates)
  // OR when report type changes from initial - give them fresh defaults for different report types
  useEffect(() => {
    const previousReportType = prevReportTypeRef.current;
    const reportTypeChanged = previousReportType !== reportType;

    if (reportTypeChanged) {
      prevReportTypeRef.current = reportType;
    }

    if (!userHasSetDates || reportTypeChanged) {
      const defaultDates = getDefaultDates(reportType);
      setStartDate(defaultDates.start);
      setEndDate(defaultDates.end);

      // If report type changed, reset the user flag to allow future report type changes to work
      if (reportTypeChanged) {
        setUserHasSetDates(false);
      }
    }
  }, [reportType, getDefaultDates, userHasSetDates]);

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

      // Hide the resume prompt after successful load
      setHasSavedInputs(false);
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

  // Generate a PDF specifically focused on Balance Meter graphs and charts
  async function downloadGraphsPDF() {
    if (!result || reportType !== 'balance') {
      setToast('Balance Meter charts not available');
      setTimeout(() => setToast(null), 2000);
      return;
    }

    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

      // Create new PDF document
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

      // Page dimensions
      const PAGE_WIDTH = 612; // 8.5" * 72 DPI
      const PAGE_HEIGHT = 792; // 11" * 72 DPI
      const MARGIN = 50;

      let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let yPosition = PAGE_HEIGHT - MARGIN;

      // Title
      page.drawText(sanitizeForPDF('Balance Meter Dashboard - Visual Charts'), {
        x: MARGIN,
        y: yPosition,
        size: 18,
        font: timesRomanFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 40;

      // Extract data for visualization
      const daily = result?.person_a?.chart?.transitsByDate || {};
      const dates = Object.keys(daily).sort();

      if (dates.length === 0) {
        page.drawText(sanitizeForPDF('No chart data available for visualization.'), {
          x: MARGIN,
          y: yPosition,
          size: 12,
          font: timesRomanFont,
        });
      } else {
        // Create text-based sparkline charts with PDF-safe characters
        const createTextChart = (values: number[], label: string, maxValue = 5) => {
          const chars = ['_', '.', '-', '=', '+', '|', '#', 'X'];
          const sparkline = values.slice(-20).map(val => {
            const normalized = Math.max(0, Math.min(1, val / maxValue));
            const index = Math.floor(normalized * (chars.length - 1));
            return chars[index] || chars[0];
          }).join('');

          return `${label.padEnd(12)} ${sparkline}`;
        };

        const series = dates.map(d => ({
          date: d,
          magnitude: Number(daily[d]?.seismograph?.magnitude ?? 0),
          valence: Number(daily[d]?.seismograph?.valence_bounded ?? daily[d]?.seismograph?.valence ?? 0),
          volatility: Number(daily[d]?.seismograph?.volatility ?? 0),
          sfd: Number(daily[d]?.sfd ?? 0)
        }));

        // Chart section
        page.drawText(sanitizeForPDF('Trend Analysis (Last 20 Days)'), {
          x: MARGIN,
          y: yPosition,
          size: 14,
          font: timesRomanFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        yPosition -= 30;

        const magnitudes = series.map(s => s.magnitude);
        const volatilities = series.map(s => s.volatility);
        const valences = series.map(s => s.valence + 5); // Shift valence to positive range for visualization
        const sfds = series.map(s => Math.abs(s.sfd / 10)); // Scale SFD for visualization

        const charts = [
          createTextChart(magnitudes, '*lightning* Magnitude:', 5),
          createTextChart(volatilities, '*tornado* Volatility:', 5),
          createTextChart(valences, '*sparkles* Valence:', 10),
          createTextChart(sfds, 'SFD Balance:', 10)
        ];

        charts.forEach(chart => {
          const sanitizedChart = sanitizeForPDF(chart);
          page.drawText(sanitizedChart, {
            x: MARGIN,
            y: yPosition,
            size: 10,
            font: courierFont,
            color: rgb(0.1, 0.1, 0.1),
          });
          yPosition -= 20;
        });

        yPosition -= 20;

        // Add daily diagnostic data
        page.drawText(sanitizeForPDF('Recent Daily Diagnostics'), {
          x: MARGIN,
          y: yPosition,
          size: 14,
          font: timesRomanFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        yPosition -= 30;

        // Show last 7 days of data
        dates.slice(-7).forEach(date => {
          const dayData = daily[date];
          const mag = Number(dayData?.seismograph?.magnitude ?? 0);
          const val = Number(dayData?.seismograph?.valence_bounded ?? dayData?.seismograph?.valence ?? 0);
          const vol = Number(dayData?.seismograph?.volatility ?? 0);
          const sfd = Number(dayData?.sfd ?? 0);

          const dateStr = new Date(date).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
          });

          if (yPosition < MARGIN + 100) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            yPosition = PAGE_HEIGHT - MARGIN;
          }

          const dayLine = `${dateStr}: Mag ${mag.toFixed(1)} | Val ${val >= 0 ? '+' : ''}${val.toFixed(1)} | Vol ${vol.toFixed(1)} | SFD ${sfd > 0 ? '+' : ''}${sfd}`;
          page.drawText(sanitizeForPDF(dayLine), {
            x: MARGIN,
            y: yPosition,
            size: 10,
            font: courierFont,
            color: rgb(0.2, 0.2, 0.2),
          });
          yPosition -= 18;
        });
      }

      // Add footer with timestamp
      const timestamp = new Date().toLocaleString();
      const footerText = `Generated: ${timestamp} | Balance Meter Dashboard Charts`;
      page.drawText(sanitizeForPDF(footerText), {
        x: MARGIN,
        y: MARGIN - 20,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `balance-meter-charts-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast('Charts PDF downloaded successfully');
      setTimeout(() => setToast(null), 2500);
    } catch (error) {
      console.error('PDF generation failed:', error);
      setToast('Failed to generate charts PDF');
      setTimeout(() => setToast(null), 2500);
    }
  }

  // Generate a text-based PDF with schema rule-patch compliance and sanitization
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

      // Determine report mode based on type and data
      const reportMode = reportType === 'balance' ? 'balance' : 'natal-only';

      // Apply schema rule-patch validation and compliance
      let processedResult = result;
      let contractCompliant = false;
      let lintReport = '';

      try {
        // Attempt to render with new schema system for compliance
        const mirrorResult = await renderShareableMirror({
          geo: null,
          prov: { source: 'pdf-export' },
          mode: reportMode as any,
          options: {
            mode: reportMode,
            person_a: result.person_a,
            indices: result.person_a?.chart?.transitsByDate ? {
              days: Object.values(result.person_a.chart.transitsByDate).map((entry: any) => ({
                date: entry.date || new Date().toISOString().slice(0, 10),
                magnitude: entry.seismograph?.magnitude,
                volatility: entry.seismograph?.volatility,
                sf_diff: entry.sfd?.sfd_cont
              })).filter(day => day.magnitude || day.volatility || day.sf_diff)
            } : null,
            ...result
          }
        });

        if (mirrorResult.contract && mirrorResult.mode) {
          processedResult = {
            ...result,
            contract_compliance: {
              contract: mirrorResult.contract,
              mode: mirrorResult.mode,
              frontstage_policy: mirrorResult.frontstage_policy,
              backstage: mirrorResult.backstage
            },
            schema_enforced_render: {
              picture: mirrorResult.picture,
              feeling: mirrorResult.feeling,
              container: mirrorResult.container,
              option: mirrorResult.option,
              next_step: mirrorResult.next_step,
              symbolic_weather: mirrorResult.symbolic_weather
            }
          };
          contractCompliant = true;
        }
      } catch (error) {
        console.warn('Schema rule-patch rendering failed, using legacy data:', error);
      }

      // Run contract linting for diagnostics
      try {
        const lintResult = ContractLinter.lint({
          mode: reportMode,
          ...result
        });
        lintReport = ContractLinter.generateReport(lintResult);
      } catch (error) {
        console.warn('Contract linting failed:', error);
      }

      const reportKind = reportType === 'balance' ? 'Balance Meter' : 'Mirror';
      const generatedAt = new Date();

      // Sanitize all text content for PDF
      const sanitizedReport = sanitizeReportForPDF({
        renderedText,
        rawJSON: processedResult,
        title: `Woven Web App — ${reportKind} Report`,
        sections: []
      });

      const sections: Array<{ title: string; body: string; mode: 'regular' | 'mono' }> = [];

      // Add contract compliance section if available
      if (contractCompliant) {
        const complianceText = `
Contract: ${processedResult.contract_compliance?.contract || 'clear-mirror/1.3'}
Mode: ${processedResult.contract_compliance?.mode || reportMode}
Frontstage Policy: ${JSON.stringify(processedResult.contract_compliance?.frontstage_policy || {}, null, 2)}

Schema-Enforced Render:
• Picture: ${processedResult.schema_enforced_render?.picture || 'N/A'}
• Container: ${processedResult.schema_enforced_render?.container || 'N/A'}
• Symbolic Weather: ${processedResult.schema_enforced_render?.symbolic_weather || 'Suppressed in natal-only mode'}
• Option: ${processedResult.schema_enforced_render?.option || 'N/A'}
• Next Step: ${processedResult.schema_enforced_render?.next_step || 'N/A'}

Backstage Notes: ${processedResult.contract_compliance?.backstage ? JSON.stringify(processedResult.contract_compliance.backstage, null, 2) : 'None'}
        `.trim();

        sections.push({
          title: 'Schema Rule-Patch Compliance',
          body: sanitizeForPDF(complianceText),
          mode: 'regular'
        });
      }

      // Add rendered summary if available
      if (sanitizedReport.renderedText) {
        sections.push({
          title: 'Rendered Summary',
          body: sanitizedReport.renderedText,
          mode: 'regular'
        });
      }

      // Add contract lint report if available
      if (lintReport) {
        sections.push({
          title: 'Contract Validation Report',
          body: sanitizeForPDF(lintReport),
          mode: 'regular'
        });
      }

      // Add sanitized raw JSON
      sections.push({
        title: 'Raw JSON Snapshot (Sanitized)',
        body: sanitizedReport.rawJSON || '{}',
        mode: 'mono',
      });

      const pdfDoc = await PDFDocument.create();
      const titleSuffix = contractCompliant ? ' (Schema Compliant)' : '';
      pdfDoc.setTitle(sanitizeForPDF(`Woven Web App — ${reportKind} Report${titleSuffix}`));
      pdfDoc.setSubject(sanitizeForPDF('Math Brain geometry export with schema rule-patch enforcement'));
      pdfDoc.setAuthor('Woven Web App');
      pdfDoc.setCreationDate(generatedAt);
      pdfDoc.setModificationDate(generatedAt);
      if (contractCompliant) {
        pdfDoc.setKeywords([
          'astrology',
          'schema-compliant',
          `mode-${reportMode}`,
          'clear-mirror-1.3',
          'contract-validated'
        ]);
      }

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
        // Sanitize text before drawing to prevent PDF encoding errors
        const sanitizedText = sanitizeForPDF(text);
        page.drawText(sanitizedText, { x: margin + xOffset, y: cursorY, size, font, color });
        cursorY -= size + gap;
      };

      const wrapRegular = (input: string) => {
        const lines: string[] = [];
        const text = sanitizeForPDF(input).replace(/\s+/g, ' ').trim();
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
        const sanitized = sanitizeForPDF(text);
        const normalized = sanitized.replace(/\r/g, '');
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
      const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      const stamp = generatedAt.toISOString().slice(0, 10);
      link.href = url;
      link.download = `math-brain-report-${stamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try { document.body.removeChild(link); } catch {/* noop */}
        try { URL.revokeObjectURL(url); } catch {/* noop */}
      }, 150);
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
      // Create frontstage-only version with normalized values
      const frontStageResult = createFrontStageResult(result);

      const blob = new Blob([JSON.stringify(frontStageResult, null, 2)], { type: 'application/json' });
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

  function downloadBackstageJSON() {
    if (!result) return;
    try {
      // Download raw result with all backstage data for debugging
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
      a.href = url;
      a.download = `math-brain-backstage-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      try { setToast('Downloading backstage JSON for debugging'); setTimeout(()=>setToast(null), 1400); } catch {/* noop */}
    } catch {/* noop */}
  }

  // Create frontstage-only version with normalized Balance Meter values (0-5 scale)
  function createFrontStageResult(rawResult: any) {
    const toNumber = (value: any): number | undefined => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed;
      }
      if (value && typeof value === 'object') {
        if (typeof value.value === 'number' && Number.isFinite(value.value)) return value.value;
        if (typeof value.mean === 'number' && Number.isFinite(value.mean)) return value.mean;
        if (typeof value.score === 'number' && Number.isFinite(value.score)) return value.score;
      }
      return undefined;
    };

    // Normalize raw values to frontstage ranges
    const normalizeToFrontStage = (rawValue: number, type: 'magnitude' | 'valence' | 'volatility'): number => {
      if (type === 'magnitude' || type === 'volatility') {
        // Raw values typically range 0-500+, normalize to 0-5
        return Math.min(5, Math.max(0, Math.round((rawValue / 100) * 10) / 10));
      } else if (type === 'valence') {
        // Raw values typically range -500 to +500, normalize to -5 to +5
        return Math.min(5, Math.max(-5, Math.round((rawValue / 100) * 10) / 10));
      }
      return rawValue;
    };

    const getStateLabel = (value: number, type: 'magnitude' | 'valence' | 'volatility'): string => {
      if (type === 'magnitude') {
        if (value >= 4) return 'High';
        if (value >= 2) return 'Active';
        if (value >= 1) return 'Murmur';
        return 'Latent';
      } else if (type === 'valence') {
        if (value >= 3) return 'High-Positive';
        if (value >= 1) return 'Positive';
        if (value >= -1) return 'Neutral';
        if (value >= -3) return 'Low-Negative';
        return 'High-Negative';
      } else if (type === 'volatility') {
        if (value >= 4) return 'Very High';
        if (value >= 2) return 'High';
        if (value >= 1) return 'Moderate';
        return 'Low';
      }
      return 'Unknown';
    };

    // Create a clean copy with frontstage values
    const frontStageResult: any = {
      ...rawResult,
      _frontstage_notice: "This export shows normalized Balance Meter values in the user-facing 0-5 scale range. Raw backstage calculations have been converted to frontstage presentation format.",
      balance_meter: {}
    };

    // Process person_a summary data
    if (rawResult?.person_a?.summary) {
      const summary = rawResult.person_a.summary;
      const rawMag = toNumber(summary.magnitude);
      const rawVal = toNumber(summary.valence_bounded ?? summary.valence);
      const rawVol = toNumber(summary.volatility);

      frontStageResult.balance_meter = {
        magnitude: rawMag ? normalizeToFrontStage(rawMag, 'magnitude') : undefined,
        valence: rawVal ? normalizeToFrontStage(rawVal, 'valence') : undefined,
        volatility: rawVol ? normalizeToFrontStage(rawVol, 'volatility') : undefined,
        magnitude_label: rawMag ? getStateLabel(normalizeToFrontStage(rawMag, 'magnitude'), 'magnitude') : undefined,
        valence_label: rawVal ? getStateLabel(normalizeToFrontStage(rawVal, 'valence'), 'valence') : undefined,
        volatility_label: rawVol ? getStateLabel(normalizeToFrontStage(rawVol, 'volatility'), 'volatility') : undefined,
        _scale_note: "magnitude: 0-5, valence: -5 to +5, volatility: 0-5"
      };

      // Update the summary in person_a to use frontstage values
      frontStageResult.person_a.summary = {
        ...summary,
        magnitude: frontStageResult.balance_meter.magnitude,
        valence: frontStageResult.balance_meter.valence,
        volatility: frontStageResult.balance_meter.volatility,
        magnitude_label: frontStageResult.balance_meter.magnitude_label,
        valence_label: frontStageResult.balance_meter.valence_label,
        volatility_label: frontStageResult.balance_meter.volatility_label
      };
    }

    // Process daily time series data if present
    if (rawResult?.person_a?.chart?.transitsByDate) {
      const daily = rawResult.person_a.chart.transitsByDate;
      const normalizedDaily: any = {};

      Object.keys(daily).forEach(date => {
        const dayData = daily[date];
        if (dayData?.seismograph) {
          const rawMag = toNumber(dayData.seismograph.magnitude);
          const rawVal = toNumber(dayData.seismograph.valence_bounded ?? dayData.seismograph.valence);
          const rawVol = toNumber(dayData.seismograph.volatility);

          normalizedDaily[date] = {
            ...dayData,
            seismograph: {
              ...dayData.seismograph,
              magnitude: rawMag ? normalizeToFrontStage(rawMag, 'magnitude') : dayData.seismograph.magnitude,
              valence: rawVal ? normalizeToFrontStage(rawVal, 'valence') : dayData.seismograph.valence,
              volatility: rawVol ? normalizeToFrontStage(rawVol, 'volatility') : dayData.seismograph.volatility
            }
          };
        } else {
          normalizedDaily[date] = dayData;
        }
      });

      frontStageResult.person_a.chart.transitsByDate = normalizedDaily;
    }

    // Remove or hide backstage calculation details
    if (frontStageResult.person_a?.sfd) {
      // Keep SFD as it's meant to be shown, but add a note
      frontStageResult.person_a.sfd._note = "SFD (Support-Friction Differential) values are preserved as calculated";
    }

    return frontStageResult;
  }

  function persistSessionArtifacts(data: any) {
    if (typeof window === 'undefined' || !data) return;

    const toNumber = (value: any): number | undefined => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed;
      }
      if (value && typeof value === 'object') {
        if (typeof value.value === 'number' && Number.isFinite(value.value)) return value.value;
        if (typeof value.mean === 'number' && Number.isFinite(value.mean)) return value.mean;
        if (typeof value.score === 'number' && Number.isFinite(value.score)) return value.score;
      }
      return undefined;
    };

    const summarySource =
      data?.balance_meter?.channel_summary ||
      data?.person_a?.derived?.seismograph_summary ||
      data?.summary?.balance_meter ||
      null;

    const magnitude = toNumber(summarySource?.magnitude ?? summarySource?.magnitude_value);
    const valence = toNumber(
      summarySource?.valence_bounded ?? summarySource?.valence ?? summarySource?.valence_mean,
    );
    const volatility = toNumber(summarySource?.volatility);
    const hasSummary =
      summarySource && [magnitude, valence, volatility].some((value) => typeof value === 'number');

    const hasDailySeries = Boolean(
      data?.person_a?.chart?.transitsByDate &&
        Object.keys(data.person_a.chart.transitsByDate || {}).length > 0,
    );

    const summaryForResume = hasSummary && hasDailySeries
      ? {
          magnitude: typeof magnitude === 'number' ? magnitude : 0,
          valence: typeof valence === 'number' ? valence : 0,
          volatility: typeof volatility === 'number' ? volatility : 0,
          magnitudeLabel:
            summarySource?.magnitude_label ??
            (typeof magnitude === 'number'
              ? magnitude >= 3
                ? 'Surge'
                : magnitude >= 1
                  ? 'Active'
                  : 'Calm'
              : undefined),
          valenceLabel:
            summarySource?.valence_label ??
            (typeof valence === 'number'
              ? valence > 0.5
                ? 'Supportive'
                : valence < -0.5
                  ? 'Challenging'
                  : 'Mixed'
              : undefined),
          volatilityLabel:
            summarySource?.volatility_label ??
            (typeof volatility === 'number'
              ? volatility >= 3
                ? 'Scattered'
                : volatility >= 1
                  ? 'Variable'
                  : 'Stable'
              : undefined),
        }
      : undefined;

    try {
      const sessionPayload: Record<string, any> = {
        createdAt: new Date().toISOString(),
        from: 'math-brain',
        inputs: {
          mode,
          step,
          reportType,
          startDate,
          endDate,
          includePersonB,
          includeTransits,
          translocation,
          contactState,
          relationship: {
            type: relationshipType,
            intimacy_tier: relationshipType === 'PARTNER' ? relationshipTier || undefined : undefined,
            role: relationshipType !== 'PARTNER' ? relationshipRole || undefined : undefined,
            contact_state: contactState,
            ex_estranged: relationshipType === 'FRIEND' ? undefined : exEstranged,
            notes: relationshipNotes || undefined,
          },
          personA: {
            name: personA.name,
            timezone: personA.timezone,
            city: personA.city,
            state: personA.state,
          },
          ...(includePersonB
            ? {
                personB: {
                  name: personB.name,
                  timezone: personB.timezone,
                  city: personB.city,
                  state: personB.state,
                },
              }
            : {}),
        },
        resultPreview: { hasDaily: hasDailySeries },
      };
      if (summaryForResume) {
        sessionPayload.summary = summaryForResume;
      }
      window.localStorage.setItem('mb.lastSession', JSON.stringify(sessionPayload));
    } catch (error) {
      console.error('Failed to persist Math Brain session resume data', error);
    }

    if (reportType !== 'mirror') {
      return;
    }

    try {
      const birthDate = (() => {
        const y = Number(personA.year);
        const m = Number(personA.month);
        const d = Number(personA.day);
        if (![y, m, d].every((n) => Number.isFinite(n))) return undefined;
        return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      })();
      const birthTime = (() => {
        if (allowUnknownA) return 'Unknown (planetary-only)';
        const hour = Number(personA.hour);
        const minute = Number(personA.minute);
        if (![hour, minute].every((n) => Number.isFinite(n))) return undefined;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      })();
      const locationParts = [personA.city, personA.state]
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean);
      const baseLocation = locationParts.join(', ');
      const birthLocation = baseLocation
        ? personA.timezone
          ? `${baseLocation} (${personA.timezone})`
          : baseLocation
        : personA.timezone || undefined;

      const contextPieces: string[] = [];
      contextPieces.push('Math Brain mirror geometry');
      if (includeTransits && startDate && endDate) {
        contextPieces.push(`Window ${startDate} → ${endDate}`);
      }
      if (RELATIONAL_MODES.includes(mode)) {
        contextPieces.push(mode.replace(/_/g, ' '));
      }
      if (includePersonB && personB.name) {
        contextPieces.push(`with ${personB.name}`);
      }
      if (translocation && translocation !== 'NONE') {
        contextPieces.push(`Relocation ${translocation}`);
      }
      if (relocLabel) {
        contextPieces.push(relocLabel);
      }

      const meta: Record<string, any> = {
        timestamp: new Date().toISOString(),
        reportType,
        mode,
        context: contextPieces.filter(Boolean).join(' · ') || 'Mirror geometry ready for interpretation',
        person: {
          name: personA.name?.trim() || undefined,
          birthDate,
          birthTime,
          birthLocation,
        },
      };
      if (hasSummary) {
        meta.summary = {
          ...(typeof magnitude === 'number' ? { magnitude } : {}),
          ...(typeof valence === 'number' ? { valence } : {}),
          ...(typeof volatility === 'number' ? { volatility } : {}),
          ...(summarySource?.magnitude_label ? { magnitudeLabel: summarySource.magnitude_label } : {}),
          ...(summarySource?.valence_label ? { valenceLabel: summarySource.valence_label } : {}),
          ...(summarySource?.volatility_label ? { volatilityLabel: summarySource.volatility_label } : {}),
        };
      }
      if (includeTransits && startDate && endDate) {
        meta.window = { start: startDate, end: endDate, step };
      }
      if (includePersonB && personB.name) {
        meta.partner = { name: personB.name?.trim() || undefined };
      }
      if (relocLabel || (translocation && translocation !== 'NONE')) {
        meta.relocation = {
          ...(relocLabel ? { label: relocLabel } : {}),
          ...(relocTz ? { tz: relocTz } : {}),
          ...(translocation && translocation !== 'NONE' ? { mode: translocation } : {}),
        };
      }

      window.sessionStorage.setItem(
        'woven_report_for_raven',
        JSON.stringify({ meta, reportData: data }),
      );
    } catch (error) {
      console.error('Failed to stage Math Brain report for Raven', error);
    }
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
      persistSessionArtifacts(data);
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
                        style={{
                          WebkitAppearance: 'none',
                          appearance: 'none'
                        }}
                        onFocus={(e) => {
                          // iOS Safari fix: ensure the input is interactive
                          e.target.showPicker?.();
                        }}
                        onTouchStart={(e) => {
                          // iOS touch handling improvement
                          e.preventDefault();
                          (e.target as HTMLInputElement).focus();
                          (e.target as HTMLInputElement).showPicker?.();
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
                        style={{
                          WebkitAppearance: 'none',
                          appearance: 'none'
                        }}
                        onFocus={(e) => {
                          // iOS Safari fix: ensure the input is interactive
                          e.target.showPicker?.();
                        }}
                        onTouchStart={(e) => {
                          // iOS touch handling improvement
                          e.preventDefault();
                          (e.target as HTMLInputElement).focus();
                          (e.target as HTMLInputElement).showPicker?.();
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
              <button type="button" onClick={downloadBackstageJSON} className="rounded-md border border-orange-700 bg-orange-800/50 px-3 py-1.5 text-orange-100 hover:bg-orange-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400" aria-label="Download backstage JSON for debugging">🔍 Debug JSON</button>
              <button type="button" onClick={downloadResultPDF} className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Download PDF">Download PDF</button>
              {reportType === 'balance' && (
                <button type="button" onClick={downloadGraphsPDF} className="rounded-md border border-emerald-700 bg-emerald-800/50 px-3 py-1.5 text-emerald-100 hover:bg-emerald-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Download graphs and charts as PDF">
                  📊 Download Graphs PDF
                </button>
              )}
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

                    {/* Trend Sparklines */}
                    {ts.length > 1 && (() => {
                      const createSparkline = (values: number[], maxValue = 5, color = 'text-emerald-400') => {
                        const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
                        return values.slice(-20).map(val => {
                          const normalized = Math.max(0, Math.min(1, val / maxValue));
                          const index = Math.floor(normalized * (chars.length - 1));
                          return chars[index] || chars[0];
                        }).join('');
                      };

                      const createSFDSparkline = (values: number[]) => {
                        return values.slice(-20).map(val => {
                          if (val > 10) return '▇'; // Strong support
                          if (val > 0) return '▅';  // Support
                          if (val === 0) return '▃'; // Neutral
                          if (val > -10) return '▂'; // Friction
                          return '▁'; // Strong friction
                        }).join('');
                      };

                      const calculateResonanceScore = (sfdA: number[], sfdB: number[]) => {
                        if (!sfdA || !sfdB || sfdA.length !== sfdB.length) return [];
                        return sfdA.map((a, i) => Math.abs(a - sfdB[i]) / 20); // Normalized 0-5 scale
                      };

                      // Check for relational data (Person B)
                      const isRelational = result?.person_b?.chart?.transitsByDate || wm?.type?.includes('synastry') || wm?.type?.includes('composite');
                      const tsB = wm?.time_series_b || []; // Assuming person B time series exists

                      const magnitudes = ts.map((r: any) => Number(r.magnitude ?? 0));
                      const valences = ts.map((r: any) => Number(r.valence_bounded ?? r.valence ?? 0));
                      const volatilities = ts.map((r: any) => Number(r.volatility ?? 0));
                      const sfds = ts.map((r: any) => Number(r.sfd ?? 0));

                      let magB: number[] = [], valB: number[] = [], volB: number[] = [], sfdB: number[] = [], resonanceScores: number[] = [];

                      if (isRelational && tsB.length > 0) {
                        magB = tsB.map((r: any) => Number(r.magnitude ?? 0));
                        valB = tsB.map((r: any) => Number(r.valence_bounded ?? r.valence ?? 0));
                        volB = tsB.map((r: any) => Number(r.volatility ?? 0));
                        sfdB = tsB.map((r: any) => Number(r.sfd ?? 0));
                        resonanceScores = calculateResonanceScore(sfds, sfdB);
                      }

                      return (
                        <div className="mt-3 rounded border border-slate-700 bg-slate-900/40 p-3">
                          <div className="text-xs font-medium text-slate-300 mb-2">
                            {isRelational && tsB.length > 0 ? 'Relational Trend Analysis' : 'Trend Analysis'}
                          </div>
                          <div className="space-y-2 text-xs">
                            {/* Magnitude */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 w-16">⚡ Mag:</span>
                              {isRelational && magB.length > 0 ? (
                                <div className="flex items-center gap-1 font-mono text-sm">
                                  <span className="text-emerald-400">{createSparkline(magnitudes)}</span>
                                  <span className="text-slate-600">|</span>
                                  <span className="text-emerald-300">{createSparkline(magB)}</span>
                                </div>
                              ) : (
                                <span className="font-mono text-emerald-400 text-sm">{createSparkline(magnitudes)}</span>
                              )}
                              <span className="text-slate-500 w-12 text-right">
                                {(() => {
                                  const mag = magnitudes.length > 0 ? magnitudes[magnitudes.length - 1] : 0;
                                  const vol = volatilities.length > 0 ? volatilities[volatilities.length - 1] : 0;
                                  const sfd = sfds.length > 0 ? sfds[sfds.length - 1] : 0;

                                  if (mag >= 4.5 && sfd < -50) return '⚫️'; // Pressure Point
                                  if (mag >= 4.5 && vol >= 4.5) return '🌀'; // Vortex
                                  return '';
                                })()}
                              </span>
                            </div>

                            {/* Valence */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 w-16">🌕 Val:</span>
                              {isRelational && valB.length > 0 ? (
                                <div className="flex items-center gap-1 font-mono text-sm">
                                  <span className="text-blue-400">{createSparkline(valences.map((v: number) => Math.abs(v)), 5)}</span>
                                  <span className="text-slate-600">|</span>
                                  <span className="text-blue-300">{createSparkline(valB.map((v: number) => Math.abs(v)), 5)}</span>
                                </div>
                              ) : (
                                <span className="font-mono text-blue-400 text-sm">{createSparkline(valences.map((v: number) => Math.abs(v)), 5)}</span>
                              )}
                              <span className="text-slate-500 w-12 text-right">
                                {(() => {
                                  const mag = magnitudes.length > 0 ? magnitudes[magnitudes.length - 1] : 0;
                                  const vol = volatilities.length > 0 ? volatilities[volatilities.length - 1] : 0;
                                  const sfd = sfds.length > 0 ? sfds[sfds.length - 1] : 0;

                                  if (mag >= 2 && mag <= 4 && vol < 2 && sfd > 50) return '💧'; // Coherent Flow
                                  return '';
                                })()}
                              </span>
                            </div>

                            {/* Volatility */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 w-16">🔀 Vol:</span>
                              {isRelational && volB.length > 0 ? (
                                <div className="flex items-center gap-1 font-mono text-sm">
                                  <span className="text-amber-400">{createSparkline(volatilities)}</span>
                                  <span className="text-slate-600">|</span>
                                  <span className="text-amber-300">{createSparkline(volB)}</span>
                                </div>
                              ) : (
                                <span className="font-mono text-amber-400 text-sm">{createSparkline(volatilities)}</span>
                              )}
                              <span className="text-slate-500 w-12 text-right">
                                {/* Volatility-specific field states would go here if needed */}
                              </span>
                            </div>

                            {/* SFD */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 w-16">SFD:</span>
                              {isRelational && sfdB.length > 0 ? (
                                <div className="flex items-center gap-1 font-mono text-sm">
                                  <span className="text-purple-400">{createSFDSparkline(sfds)}</span>
                                  <span className="text-slate-600">|</span>
                                  <span className="text-purple-300">{createSFDSparkline(sfdB)}</span>
                                </div>
                              ) : (
                                <span className="font-mono text-purple-400 text-sm">{createSFDSparkline(sfds)}</span>
                              )}
                              <span className="text-slate-500 w-12 text-right">
                                {sfds.length > 1 && ((sfds[sfds.length - 2] < 0 && sfds[sfds.length - 1] > 0) || (sfds[sfds.length - 2] > 0 && sfds[sfds.length - 1] < 0)) ? '🌗' : ''}
                              </span>
                            </div>

                            {/* Field Resonance Score (Relational only) */}
                            {isRelational && resonanceScores.length > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 w-16">Res:</span>
                                <span className="font-mono text-cyan-400 text-sm">{createSparkline(resonanceScores, 5)}</span>
                                <span className="text-slate-500 w-12 text-right">
                                  {resonanceScores.length > 0 && resonanceScores[resonanceScores.length - 1] < 0.5 ? '◊' : ''}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-2 text-xs text-slate-500">
                            {isRelational && tsB.length > 0 ? (
                              <>A | B overlay • Field states: ⚫️ Pressure Point, 🌀 Vortex, 💧 Coherent Flow, 🌗 Field Shift, ◊ High resonance</>
                            ) : (
                              <>Field State Markers: ⚫️ Pressure Point, 🌀 Vortex, 💧 Coherent Flow, 🌗 Field Shift</>
                            )}
                          </div>
                        </div>
                      );
                    })()}

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
              <Section title="Balance Meter Dashboard">
                {/* LAYER 1: SUMMARY VIEW (At a Glance) */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-200 mb-3">Summary View</h3>

                  {/* Current Day SFD Balance Bar */}
                  <div className="mb-4 rounded border border-slate-600 bg-slate-900/50 p-4">
                    <div className="text-xs text-slate-400 mb-2">Today's Balance ({new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })})</div>
                    {(() => {
                      const sfdValue = result?.person_a?.sfd?.sfd ?? 0;
                      const sPlus = result?.person_a?.sfd?.s_plus ?? 0;
                      const sMinus = result?.person_a?.sfd?.s_minus ?? 0;
                      const maxValue = Math.max(sPlus, sMinus, 100);

                      const getSFDState = (sfd: number) => {
                        if (sfd > 50) return 'Strong Support';
                        if (sfd >= 1) return 'Supportive';
                        if (sfd >= -50) return 'Frictional';
                        return 'Strong Friction';
                      };

                      return (
                        <div className="space-y-3">
                          {/* Balance Bar */}
                          <div className="relative h-8 rounded bg-slate-800 overflow-hidden">
                            {/* Support (right side) */}
                            <div
                              className="absolute right-0 top-0 h-full bg-emerald-600/80 flex items-center justify-end pr-2"
                              style={{ width: `${(sPlus / maxValue) * 50}%` }}
                            >
                              <span className="text-xs text-emerald-100 font-mono">S+ {sPlus}</span>
                            </div>

                            {/* Friction (left side) */}
                            <div
                              className="absolute left-0 top-0 h-full bg-red-600/80 flex items-center justify-start pl-2"
                              style={{ width: `${(sMinus / maxValue) * 50}%` }}
                            >
                              <span className="text-xs text-red-100 font-mono">S- {sMinus}</span>
                            </div>

                            {/* Center line */}
                            <div className="absolute left-1/2 top-0 h-full w-px bg-slate-300"></div>
                          </div>

                          {/* SFD Score */}
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-100">
                              SFD: {sfdValue > 0 ? '+' : ''}{sfdValue}
                            </div>
                            <div className="text-sm text-slate-400">{getSFDState(sfdValue)}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Trend Sparklines - moved from time series section */}
                  <div className="rounded border border-slate-700 bg-slate-900/40 p-3">
                    <div className="text-xs font-medium text-slate-300 mb-2">Trend Analysis (Last 20 Days)</div>
                    {(() => {
                      const daily = result?.person_a?.chart?.transitsByDate || {};
                      const dates = Object.keys(daily).sort();
                      if (!dates.length) return <div className="text-xs text-slate-500">No trend data available</div>;

                      const series = dates.map(d => ({
                        magnitude: Number(daily[d]?.seismograph?.magnitude ?? 0),
                        valence: Number(daily[d]?.seismograph?.valence_bounded ?? daily[d]?.seismograph?.valence ?? 0),
                        volatility: Number(daily[d]?.seismograph?.volatility ?? 0),
                        sfd: Number(daily[d]?.sfd ?? 0)
                      }));

                      const createSparkline = (values: number[], maxValue = 5) => {
                        const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
                        return values.slice(-20).map(val => {
                          const normalized = Math.max(0, Math.min(1, val / maxValue));
                          const index = Math.floor(normalized * (chars.length - 1));
                          return chars[index] || chars[0];
                        }).join('');
                      };

                      const createSFDSparkline = (values: number[]) => {
                        return values.slice(-20).map(val => {
                          if (val > 10) return '▇'; // Strong support
                          if (val > 0) return '▅';  // Support
                          if (val === 0) return '▃'; // Neutral
                          if (val > -10) return '▂'; // Friction
                          return '▁'; // Strong friction
                        }).join('');
                      };

                      const magnitudes = series.map(s => s.magnitude);
                      const volatilities = series.map(s => s.volatility);
                      const sfds = series.map(s => s.sfd);

                      return (
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 w-16">⚡ Mag:</span>
                            <span className="font-mono text-emerald-400 text-sm">{createSparkline(magnitudes)}</span>
                            <span className="text-slate-500 w-12 text-right">
                              {magnitudes.length > 0 && magnitudes[magnitudes.length - 1] >= 4.5 && sfds[sfds.length - 1] < -50 ? '⚫️' : ''}
                              {magnitudes.length > 0 && magnitudes[magnitudes.length - 1] >= 4.5 && volatilities[volatilities.length - 1] >= 4.5 ? '🌀' : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 w-16">🔀 Vol:</span>
                            <span className="font-mono text-amber-400 text-sm">{createSparkline(volatilities)}</span>
                            <span className="text-slate-500 w-12 text-right"></span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 w-16">SFD:</span>
                            <span className="font-mono text-purple-400 text-sm">{createSFDSparkline(sfds)}</span>
                            <span className="text-slate-500 w-12 text-right">
                              {sfds.length > 1 && ((sfds[sfds.length - 2] < 0 && sfds[sfds.length - 1] > 0) || (sfds[sfds.length - 2] > 0 && sfds[sfds.length - 1] < 0)) ? '🌗' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="mt-2 text-xs text-slate-500">
                      Field State Markers: ⚫️ Pressure Point, 🌀 Vortex, 💧 Coherent Flow, 🌗 Field Shift
                    </div>
                  </div>
                </div>

                {/* LAYER 2: DAILY DIAGNOSTIC CARDS (The Details) */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-200 mb-3">Daily Diagnostic Cards</h3>
                  {(() => {
                    const daily = result?.person_a?.chart?.transitsByDate || {};
                    const dates = Object.keys(daily).sort();
                    if (!dates.length) {
                      return <div className="text-sm text-slate-500 p-4 border border-slate-700 rounded bg-slate-900/20">No daily data available</div>;
                    }

                    // State descriptor functions
                    const getMagnitudeState = (mag: number) => {
                      if (mag <= 1) return 'Latent';
                      if (mag <= 2) return 'Murmur';
                      if (mag <= 4) return 'Active';
                      return 'Threshold';
                    };

                    const getValenceStyle = (valence: number, magnitude: number) => {
                      const magLevel = magnitude <= 2 ? 'low' : 'high'; // For emoji count selection

                      if (valence >= 4.5) {
                        const emojis = magLevel === 'low' ? ['🦋', '🌈'] : ['🦋', '🌈', '🔥'];
                        return { emojis, descriptor: 'Liberation', anchor: '+5', pattern: 'peak openness; breakthroughs / big‑sky view' };
                      } else if (valence >= 3.5) {
                        const emojis = magLevel === 'low' ? ['💎', '🔥'] : ['💎', '🔥', '🦋'];
                        return { emojis, descriptor: 'Expansion', anchor: '+4', pattern: 'widening opportunities; clear insight fuels growth' };
                      } else if (valence >= 2.5) {
                        const emojis = magLevel === 'low' ? ['🧘', '✨'] : ['🧘', '✨', '🌊'];
                        return { emojis, descriptor: 'Harmony', anchor: '+3', pattern: 'coherent progress; both/and solutions' };
                      } else if (valence >= 1.5) {
                        const emojis = magLevel === 'low' ? ['🌊', '🧘'] : ['🌊', '🧘'];
                        return { emojis, descriptor: 'Flow', anchor: '+2', pattern: 'smooth adaptability; things click' };
                      } else if (valence >= 0.5) {
                        const emojis = magLevel === 'low' ? ['🌱', '✨'] : ['🌱', '✨'];
                        return { emojis, descriptor: 'Lift', anchor: '+1', pattern: 'gentle tailwind; beginnings sprout' };
                      } else if (valence >= -0.5) {
                        return { emojis: ['⚖️'], descriptor: 'Equilibrium', anchor: '0', pattern: 'net‑neutral tilt; forces cancel or diffuse' };
                      } else if (valence >= -1.5) {
                        const emojis = magLevel === 'low' ? ['🌪', '🌫'] : ['🌪', '🌫'];
                        return { emojis, descriptor: 'Drag', anchor: '−1', pattern: 'subtle headwind; minor loops or haze' };
                      } else if (valence >= -2.5) {
                        const emojis = magLevel === 'low' ? ['🌫', '🧩'] : ['🌫', '🧩', '⬇️'];
                        return { emojis, descriptor: 'Contraction', anchor: '−2', pattern: 'narrowing options; ambiguity or energy drain' };
                      } else if (valence >= -3.5) {
                        const emojis = magLevel === 'low' ? ['⚔️', '🌊'] : ['⚔️', '🌊', '🌫'];
                        return { emojis, descriptor: 'Friction', anchor: '−3', pattern: 'conflicts or cross‑purposes slow motion' };
                      } else if (valence >= -4.5) {
                        const emojis = magLevel === 'low' ? ['🕰', '⚔️'] : ['🕰', '⚔️', '🌪'];
                        return { emojis, descriptor: 'Grind', anchor: '−4', pattern: 'sustained resistance; heavy duty load' };
                      } else {
                        const emojis = magLevel === 'low' ? ['🌋', '🧩'] : ['🌋', '🧩', '⬇️'];
                        return { emojis, descriptor: 'Collapse', anchor: '−5', pattern: 'maximum restrictive tilt; compression / failure points' };
                      }
                    };

                    const getVolatilityState = (vol: number) => {
                      if (vol <= 2) return 'Coherent';
                      if (vol <= 4) return 'Complex';
                      return 'Dispersed';
                    };

                    const getSFDState = (sfd: number) => {
                      if (sfd > 50) return 'Strong Support';
                      if (sfd >= 1) return 'Supportive';
                      if (sfd >= -50) return 'Frictional';
                      return 'Strong Friction';
                    };

                    return dates.slice(-7).map(date => { // Show last 7 days
                      const dayData = daily[date];
                      const mag = Number(dayData?.seismograph?.magnitude ?? 0);
                      const val = Number(dayData?.seismograph?.valence_bounded ?? dayData?.seismograph?.valence ?? 0);
                      const vol = Number(dayData?.seismograph?.volatility ?? 0);
                      const sfd = Number(dayData?.sfd ?? 0);
                      const valenceStyle = getValenceStyle(val, mag);

                      // Get driver aspects
                      const aspects = dayData?.aspects || [];
                      const drivers = aspects.slice(0, 3).map((a: any) => `${a.from || a.transit} ${a.aspect} ${a.to || a.natal}`);

                      return (
                        <div key={date} className="mb-4 rounded border border-slate-700 bg-slate-900/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-medium text-slate-100">
                              {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                            <button
                              className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                              onClick={() => {/* TODO: Implement modal with Poetic Brain translation */}}
                            >
                              [Translate]
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
                            <div className="text-center">
                              <div className="text-xs text-slate-400">⚡ Magnitude</div>
                              <div className="text-lg font-bold text-slate-100">{mag.toFixed(2)}</div>
                              <div className="text-xs text-slate-500">{getMagnitudeState(mag)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-400">{valenceStyle.emojis.join('')} Valence</div>
                              <div className="text-lg font-bold text-slate-100">{val >= 0 ? '+' : ''}{val.toFixed(2)}</div>
                              <div className="text-xs text-slate-500">{valenceStyle.descriptor} {valenceStyle.anchor}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-400">{vol >= 5.0 ? '🌀' : '🔀'} Volatility</div>
                              <div className="text-lg font-bold text-slate-100">{vol.toFixed(2)}</div>
                              <div className="text-xs text-slate-500">{getVolatilityState(vol)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-400">SFD</div>
                              <div className="text-lg font-bold text-slate-100">{sfd > 0 ? '+' : ''}{sfd}</div>
                              <div className="text-xs text-slate-500">{getSFDState(sfd)}</div>
                            </div>
                          </div>

                          {/* Driver Aspects with Sources of Force indicators */}
                          {drivers.length > 0 && (
                            <div className="text-xs text-slate-400">
                              <span className="font-medium">🎯∠🪐 Sources of Force:</span> {drivers.join(', ')}
                            </div>
                          )}

                          {/* Resonance Spectrum - Interactive Drill-Down showing range of possibility */}
                          <div className="mt-4 rounded border border-slate-600 bg-slate-800/30 p-3">
                            <div className="text-xs font-medium text-slate-300 mb-2">
                              Resonance Spectrum for this Climate
                              <sup className="ml-1 text-slate-500 cursor-help" title="Click any pole to view underlying astrological geometry">¹</sup>
                            </div>
                            <div className="text-xs text-slate-400 mb-3 italic">
                              This symbolic weather often oscillates between two poles of experience. The key is observing which pole most closely matches your lived reality.
                            </div>

                            <div className="space-y-3">
                              {/* Magnitude Spectrum */}
                              {mag >= 4.5 && (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <div
                                    className="text-xs cursor-pointer hover:bg-slate-700/50 rounded p-2 -m-2 transition-colors"
                                    onClick={() => setSelectedPole({
                                      date,
                                      type: 'magnitude',
                                      pole: 'wb',
                                      geometry: drivers
                                    })}
                                  >
                                    <div className="font-medium text-emerald-400">⚡ Paradox Pole (WB) ↗</div>
                                    <div className="text-slate-300">Activation: A powerful, energizing call to action or breakthrough.</div>
                                  </div>
                                  <div
                                    className="text-xs cursor-pointer hover:bg-slate-700/50 rounded p-2 -m-2 transition-colors"
                                    onClick={() => setSelectedPole({
                                      date,
                                      type: 'magnitude',
                                      pole: 'abe',
                                      geometry: drivers
                                    })}
                                  >
                                    <div className="font-medium text-red-400">⚡ Conflict Pole (ABE) ↗</div>
                                    <div className="text-slate-300">Overload: A stressful feeling of being overwhelmed by too much input.</div>
                                  </div>
                                </div>
                              )}

                              {/* Volatility Spectrum */}
                              {vol >= 4.5 && (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <div
                                    className="text-xs cursor-pointer hover:bg-slate-700/50 rounded p-2 -m-2 transition-colors"
                                    onClick={() => setSelectedPole({
                                      date,
                                      type: 'volatility',
                                      pole: 'wb',
                                      geometry: drivers
                                    })}
                                  >
                                    <div className="font-medium text-emerald-400">🌀 Paradox Pole (WB) ↗</div>
                                    <div className="text-slate-300">Dynamic: Engaging with multiple exciting opportunities at once.</div>
                                  </div>
                                  <div
                                    className="text-xs cursor-pointer hover:bg-slate-700/50 rounded p-2 -m-2 transition-colors"
                                    onClick={() => setSelectedPole({
                                      date,
                                      type: 'volatility',
                                      pole: 'abe',
                                      geometry: drivers
                                    })}
                                  >
                                    <div className="font-medium text-red-400">🌀 Conflict Pole (ABE) ↗</div>
                                    <div className="text-slate-300">Scattered: Feeling pulled in too many directions, leading to exhaustion.</div>
                                  </div>
                                </div>
                              )}

                              {/* SFD Spectrum */}
                              {Math.abs(sfd) >= 10 && (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <div
                                    className="text-xs cursor-pointer hover:bg-slate-700/50 rounded p-2 -m-2 transition-colors"
                                    onClick={() => setSelectedPole({
                                      date,
                                      type: 'sfd',
                                      pole: 'wb',
                                      geometry: drivers
                                    })}
                                  >
                                    <div className="font-medium text-emerald-400">SFD Paradox Pole (WB) ↗</div>
                                    <div className="text-slate-300">
                                      {sfd > 0
                                        ? "Flow State: Effortless momentum, things clicking into place naturally."
                                        : "Productive Challenge: Navigating necessary friction to achieve growth."}
                                    </div>
                                  </div>
                                  <div
                                    className="text-xs cursor-pointer hover:bg-slate-700/50 rounded p-2 -m-2 transition-colors"
                                    onClick={() => setSelectedPole({
                                      date,
                                      type: 'sfd',
                                      pole: 'abe',
                                      geometry: drivers
                                    })}
                                  >
                                    <div className="font-medium text-red-400">SFD Conflict Pole (ABE) ↗</div>
                                    <div className="text-slate-300">
                                      {sfd > 0
                                        ? "Complacency: Missing important details due to overconfidence in ease."
                                        : "Resistance: Feeling drained, as if you're running in sand."}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Valence Spectrum - based on the anchor pattern */}
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div
                                  className="text-xs cursor-pointer hover:bg-slate-700/50 rounded p-2 -m-2 transition-colors"
                                  onClick={() => setSelectedPole({
                                    date,
                                    type: 'valence',
                                    pole: 'wb',
                                    geometry: drivers
                                  })}
                                >
                                  <div className="font-medium text-emerald-400">{valenceStyle.emojis.join('')} Paradox Pole (WB) ↗</div>
                                  <div className="text-slate-300">
                                    {(() => {
                                      if (val >= 4) return "Liberation Flow: Peak openness creates breakthrough opportunities and big-sky perspective.";
                                      if (val >= 3) return "Expansion Clarity: Clear insight fuels sustainable growth and widening possibilities.";
                                      if (val >= 2) return "Harmony Integration: Both/and solutions emerge through coherent progress.";
                                      if (val >= 1) return "Lift Momentum: Gentle tailwinds support natural beginnings and growth.";
                                      if (val >= -1) return "Equilibrium Balance: Forces in dynamic balance create space for choice.";
                                      if (val >= -2) return "Contraction Focus: Narrowing options create necessary boundaries and clarity.";
                                      if (val >= -3) return "Friction Catalyst: Conflicts reveal important truths and drive innovation.";
                                      if (val >= -4) return "Grind Persistence: Sustained resistance builds strength and character.";
                                      return "Collapse Reset: Compression breaks down what no longer serves, making space for renewal.";
                                    })()}
                                  </div>
                                </div>
                                <div
                                  className="text-xs cursor-pointer hover:bg-slate-700/50 rounded p-2 -m-2 transition-colors"
                                  onClick={() => setSelectedPole({
                                    date,
                                    type: 'valence',
                                    pole: 'abe',
                                    geometry: drivers
                                  })}
                                >
                                  <div className="font-medium text-red-400">{valenceStyle.emojis.join('')} Conflict Pole (ABE) ↗</div>
                                  <div className="text-slate-300">
                                    {(() => {
                                      if (val >= 4) return "Liberation Overwhelm: Too much openness creates paralysis from infinite options.";
                                      if (val >= 3) return "Expansion Overreach: Growth ambitions exceed capacity, leading to scattered efforts.";
                                      if (val >= 2) return "Harmony Avoidance: Trying to please everyone leads to avoiding necessary decisions.";
                                      if (val >= 1) return "Lift Impatience: Gentle pace feels frustratingly slow when you want quick results.";
                                      if (val >= -1) return "Equilibrium Stagnation: Balanced forces create frustrating lack of clear direction.";
                                      if (val >= -2) return "Contraction Anxiety: Narrowing options create fear and energy drain.";
                                      if (val >= -3) return "Friction Exhaustion: Conflicts slow motion and create stress without resolution.";
                                      if (val >= -4) return "Grind Depletion: Heavy resistance feels overwhelming and unsustainable.";
                                      return "Collapse Crisis: Maximum compression creates panic and sense of failure.";
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Source Geometry Footnote Panel - Interactive Drill-Down */}
                            {selectedPole && selectedPole.date === date && (
                              <div className="mt-4 rounded border border-amber-600/50 bg-amber-900/20 p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-xs font-medium text-amber-300">
                                    Hook_Stack_Geometry → {selectedPole.type.charAt(0).toUpperCase() + selectedPole.type.slice(1)} {selectedPole.pole.toUpperCase()} Pole
                                  </div>
                                  <button
                                    onClick={() => setSelectedPole(null)}
                                    className="text-slate-400 hover:text-slate-200 text-sm"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div className="text-xs text-amber-200 mb-2">
                                  <strong>Source Geometry (Auditable Footnote):</strong>
                                </div>
                                <div className="text-xs text-slate-300 bg-slate-800/50 rounded p-2 font-mono">
                                  {selectedPole.geometry.length > 0
                                    ? selectedPole.geometry.join(', ')
                                    : 'Primary drivers: Transit patterns generating symbolic pressure for this climate.'}
                                </div>
                                <div className="text-xs text-amber-300/70 mt-2 italic">
                                  ¹ The spectrum above maps the inherent duality of these specific geometric configurations, showing how the same astrological forces can manifest as either the WB (Within Boundary/Paradoxical Vitality) or ABE (At Boundary Edge/Conflict-Management) experience depending on lived context.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* LAYER 3: FIELD CONTEXT (Simple Descriptive Language) */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-200 mb-3">Field Context</h3>
                  <div className="rounded border border-slate-700 bg-slate-900/40 p-4">
                    <div className="text-sm text-slate-300 leading-relaxed">
                      {(() => {
                        const sfdValue = result?.person_a?.sfd?.sfd ?? 0;
                        const getMagnitudeState = (mag: number) => {
                          if (mag <= 1) return 'latent';
                          if (mag <= 2) return 'murmur-level';
                          if (mag <= 4) return 'active';
                          return 'threshold-level';
                        };

                        const getVolatilityState = (vol: number) => {
                          if (vol <= 2) return 'coherent';
                          if (vol <= 4) return 'complex';
                          return 'dispersed';
                        };

                        const getValenceStyle = (valence: number, magnitude: number) => {
                          const magLevel = magnitude <= 2 ? 'low' : 'high';
                          if (valence >= 4.5) {
                            const emojis = magLevel === 'low' ? ['🦋', '🌈'] : ['🦋', '🌈', '🔥'];
                            return { emojis, descriptor: 'Liberation', anchor: '+5', pattern: 'peak openness; breakthroughs / big‑sky view' };
                          } else if (valence >= 3.5) {
                            const emojis = magLevel === 'low' ? ['💎', '🔥'] : ['💎', '🔥', '🦋'];
                            return { emojis, descriptor: 'Expansion', anchor: '+4', pattern: 'widening opportunities; clear insight fuels growth' };
                          } else if (valence >= 2.5) {
                            const emojis = magLevel === 'low' ? ['🧘', '✨'] : ['🧘', '✨', '🌊'];
                            return { emojis, descriptor: 'Harmony', anchor: '+3', pattern: 'coherent progress; both/and solutions' };
                          } else if (valence >= 1.5) {
                            const emojis = magLevel === 'low' ? ['🌊', '🧘'] : ['🌊', '🧘'];
                            return { emojis, descriptor: 'Flow', anchor: '+2', pattern: 'smooth adaptability; things click' };
                          } else if (valence >= 0.5) {
                            const emojis = magLevel === 'low' ? ['🌱', '✨'] : ['🌱', '✨'];
                            return { emojis, descriptor: 'Lift', anchor: '+1', pattern: 'gentle tailwind; beginnings sprout' };
                          } else if (valence >= -0.5) {
                            return { emojis: ['⚖️'], descriptor: 'Equilibrium', anchor: '0', pattern: 'net‑neutral tilt; forces cancel or diffuse' };
                          } else if (valence >= -1.5) {
                            const emojis = magLevel === 'low' ? ['🌪', '🌫'] : ['🌪', '🌫'];
                            return { emojis, descriptor: 'Drag', anchor: '−1', pattern: 'subtle headwind; minor loops or haze' };
                          } else if (valence >= -2.5) {
                            const emojis = magLevel === 'low' ? ['🌫', '🧩'] : ['🌫', '🧩', '⬇️'];
                            return { emojis, descriptor: 'Contraction', anchor: '−2', pattern: 'narrowing options; ambiguity or energy drain' };
                          } else if (valence >= -3.5) {
                            const emojis = magLevel === 'low' ? ['⚔️', '🌊'] : ['⚔️', '🌊', '🌫'];
                            return { emojis, descriptor: 'Tension', anchor: '−3', pattern: 'hard choices; competing forces create friction' };
                          } else if (valence >= -4.5) {
                            const emojis = magLevel === 'low' ? ['🌊', '⚔️'] : ['🌊', '⚔️', '💥'];
                            return { emojis, descriptor: 'Disruption', anchor: '−4', pattern: 'systemic challenges; breakdown precedes breakthrough' };
                          } else {
                            const emojis = magLevel === 'low' ? ['💥', '🌊'] : ['💥', '🌊', '⚔️'];
                            return { emojis, descriptor: 'Collapse', anchor: '−5', pattern: 'maximum restrictive tilt; compression / failure points' };
                          }
                        };

                        const magState = getMagnitudeState(mag);
                        const volState = getVolatilityState(vol);
                        const valencePattern = getValenceStyle(val, mag);

                        // Simple descriptive combinations using flavor patterns - NOT predictive
                        let description = `The symbolic field shows ${magState} pressure with ${volState} patterns.`;

                        if (sfdValue > 0) {
                          description += ` The Support-Friction balance leans toward supportive conditions (${sfdValue > 0 ? '+' : ''}${sfdValue}).`;
                        } else if (sfdValue < 0) {
                          description += ` The Support-Friction balance shows frictional conditions (${sfdValue}).`;
                        } else {
                          description += ` The Support-Friction balance is neutral.`;
                        }

                        // Add valence flavor pattern
                        description += ` Valence signature: ${valencePattern.emojis.join('')} ${valencePattern.descriptor} (${valencePattern.anchor}) — ${valencePattern.pattern}.`;

                        return description;
                      })()}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Note: This describes the mathematical field state only. Upload to Poetic Brain for experiential interpretation.
                    </div>
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
