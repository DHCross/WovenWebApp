"use client";
/* eslint-disable no-console */

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import type { FocusEvent, TouchEvent } from "react";
import { parseCoordinates, formatDecimal } from "../../src/coords";
import { getRedirectUri, getAuthConnection, normalizeAuth0Audience, normalizeAuth0ClientId, normalizeAuth0Domain } from "../../lib/auth";
// AuthProvider removed - auth handled globally by HomeHero component
import { needsLocation, isTimeUnknown } from "../../lib/relocation";
import { sanitizeForPDF } from "../../src/pdf-sanitizer";
import { useChartExport, createFrontStageResult } from "./hooks/useChartExport";
import { extractAxisNumber } from "./utils/formatting";
import PersonForm from "./components/PersonForm";
import TransitControls from "./components/TransitControls";
import DownloadControls from "./components/DownloadControls";
import type {
  ModeOption,
  RelocationOptionConfig,
  RelocationStatus,
  ReportContractType,
  ReportMode,
  Subject,
  TimePolicyChoice,
  TranslocationOption,
} from "./types";
import { ContractLinter } from "../../src/contract-linter";
import { ReportHeader, Weather, Blueprint } from "../../lib/ui-types";
import EnhancedDailyClimateCard from "../../components/mathbrain/EnhancedDailyClimateCard";
import BalanceMeterSummary from "../../components/mathbrain/BalanceMeterSummary";
import SymbolicSeismograph from "../components/SymbolicSeismograph";
import WeatherPlots from "../../components/mathbrain/WeatherPlots";
import { transformTransitsByDate, transformFieldFileDaily } from "../../lib/weatherDataTransforms";
import { createMirrorSymbolicWeatherPayload } from "../../lib/export/mirrorSymbolicWeather";
import HealthDataUpload from "../../components/HealthDataUpload";
import SnapshotButton from "./components/SnapshotButton";
import SnapshotDisplay from "./components/SnapshotDisplay";

import { getSavedCharts, saveChart, deleteChart, type SavedChart } from "../../lib/saved-charts";
import type { SeismographMap } from "../../lib/health-data-types";
import { computeOverflowDetailFromDay, firstFinite } from "../../lib/math-brain/overflow-detail";
import { useUserProfiles, type BirthProfile } from "./hooks/useUserProfiles";
import ProfileManager from "./components/ProfileManager";

export const dynamic = "force-dynamic";

type LayerVisibility = {
  balance: boolean;
  diagnostics: boolean;
};

const DEFAULT_LAYER_VISIBILITY: LayerVisibility = Object.freeze({
  balance: false,
  diagnostics: false,
});

type ApiResult = Record<string, any> | null;
type ChartAssetDisplay = {
  id: string;
  url: string;
  label: string;
  contentType: string;
  format?: string;
  subject: string | null;
  chartType: string | null;
  scope: string | null;
  expiresAt?: number;
  size?: number;
};

type ProviderGate = {
  ready: boolean;
  configured: boolean;
  message?: string;
};

type ProviderGateState = {
  astrology: ProviderGate;
  poetic: ProviderGate;
};

const createEmptySubject = (): Subject => ({
  name: "",
  year: "",
  month: "",
  day: "",
  hour: "",
  minute: "",
  city: "",
  state: "",
  nation: "US",
  latitude: "",
  longitude: "",
  timezone: "",
  zodiac_type: "Tropic",
});

const RELATIONAL_MODES: ReportMode[] = [
  'SYNASTRY',
  'SYNASTRY_TRANSITS',
  'COMPOSITE',
  'COMPOSITE_TRANSITS',
];

const sanitizeSlug = (value: string, fallback: string) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
};

type ReportStructure = 'solo' | 'synastry' | 'composite';

const formatReportKind = (contractType: ReportContractType): string => {
  switch (contractType) {
    case 'relational_balance_meter':
      return 'Relational Balance Meter';
    case 'relational_mirror':
      return 'Relational Mirror';
    case 'solo_balance_meter':
      return 'Balance Meter';
    case 'solo_mirror':
    default:
      return 'Mirror';
  }
};

const determineReportContract = (
  structure: ReportStructure,
  includeTransits: boolean
): ReportContractType => {
  const relational = structure !== 'solo';
  if (relational) {
    return includeTransits ? 'relational_balance_meter' : 'relational_mirror';
  }
  return includeTransits ? 'solo_balance_meter' : 'solo_mirror';
};

const determineContextMode = (mode: ReportMode, contract: string): string => {
  switch (mode) {
    case 'SYNASTRY_TRANSITS':
      return 'synastry_transits';
    case 'SYNASTRY':
      return 'synastry';
    case 'COMPOSITE_TRANSITS':
      return 'synastry_transits';
    case 'COMPOSITE':
      return 'synastry';
    case 'NATAL_TRANSITS':
      return 'balance_meter';
    case 'NATAL_ONLY':
      return contract.includes('balance') ? 'balance_meter' : 'mirror';
    default:
      return contract.includes('balance') ? 'balance_meter' : 'mirror';
  }
};

const TRANSIT_MODES = new Set<ReportMode>([
  'NATAL_TRANSITS',
  'SYNASTRY_TRANSITS',
  'COMPOSITE_TRANSITS',
]);

type ParsedJsonResult<T> = {
  data: T | null;
  raw: string;
  parseError: Error | null;
};

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

const parseJsonSafely = async <T = Record<string, unknown>>(
  response: Response
): Promise<ParsedJsonResult<T>> => {
  try {
    const text = await response.text();
    if (!text) {
      return { data: null, raw: '', parseError: null };
    }

    try {
      return { data: JSON.parse(text) as T, raw: text, parseError: null };
    } catch (error) {
      return {
        data: null,
        raw: text,
        parseError: error instanceof Error ? error : new Error(String(error)),
      };
    }
  } catch (error) {
    return {
      data: null,
      raw: '',
      parseError: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

const modeFromStructure = (structure: ReportStructure, includeTransits: boolean): ReportMode => {
  switch (structure) {
    case 'synastry':
      return includeTransits ? 'SYNASTRY_TRANSITS' : 'SYNASTRY';
    case 'composite':
      return includeTransits ? 'COMPOSITE_TRANSITS' : 'COMPOSITE';
    case 'solo':
    default:
      return includeTransits ? 'NATAL_TRANSITS' : 'NATAL_ONLY';
  }
};

const structureFromMode = (mode: ReportMode): ReportStructure => {
  switch (mode) {
    case 'SYNASTRY':
    case 'SYNASTRY_TRANSITS':
      return 'synastry';
    case 'COMPOSITE':
    case 'COMPOSITE_TRANSITS':
      return 'composite';
    case 'NATAL_ONLY':
    case 'NATAL_TRANSITS':
    default:
      return 'solo';
  }
};

const normalizeText = (value: unknown) => (value ?? "").toString().trim().toLowerCase();

const normalizeNumber = (value: unknown) => {
  if (value === null || value === undefined || `${value}`.trim() === "") return "";
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num.toFixed(6) : "";
};

const pad2 = (value: string | number | undefined) => {
  if (value === null || value === undefined) return "";
  const stringValue = value.toString();
  return stringValue.length === 0 ? "" : stringValue.padStart(2, "0");
};

const buildProfileSignature = (profile: BirthProfile) => {
  return [
    normalizeText(profile.name),
    profile.birthDate || "",
    profile.birthTime || "",
    normalizeText(profile.birthCity),
    normalizeText(profile.birthState),
    normalizeText(profile.birthCountry),
    normalizeText(profile.timezone),
    normalizeNumber(profile.lat ?? profile.latitude),
    normalizeNumber(profile.lng ?? profile.longitude),
  ].join("|");
};

const buildPersonSignature = (person: Subject) => {
  if (!person?.name || !person.year || !person.month || !person.day) return "";

  const birthDate = `${person.year}-${pad2(person.month)}-${pad2(person.day)}`;
  const birthTime = `${pad2(person.hour)}:${pad2(person.minute)}`;

  return [
    normalizeText(person.name),
    birthDate,
    birthTime,
    normalizeText(person.city),
    normalizeText((person as any).state),
    normalizeText((person as any).nation),
    normalizeText(person.timezone),
    normalizeNumber((person as any).latitude),
    normalizeNumber((person as any).longitude),
  ].join("|");
};

const toFiniteNumber = (value: unknown): number => {
  if (value == null) return Number.NaN;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return Number.NaN;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
};

const POETIC_BRAIN_ENABLED = (() => {
  const raw = process.env.NEXT_PUBLIC_ENABLE_POETIC_BRAIN;
  if (typeof raw !== 'string') return true;
  const normalized = raw.trim().toLowerCase();
  if (normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  return false;
})();

const AUTH_ENABLED = (() => {
  const raw = process.env.NEXT_PUBLIC_ENABLE_AUTH;
  if (typeof raw !== 'string') return true;
  const normalized = raw.trim().toLowerCase();
  if (normalized === '' || normalized === 'false' || normalized === '0' || normalized === 'off') {
    return false;
  }
  return true;
})();

// Dev helper: bypass provider readiness checks (astrology/poetic) when true
const PROVIDER_BYPASS = String(process.env.NEXT_PUBLIC_BYPASS_PROVIDER_CHECK) === 'true';

const AUTH_STATUS_STORAGE_KEY = 'auth.status';
const AUTH_STATUS_EVENT = 'auth-status-change';

const RAVEN_RELOCATION_RECIPE = String.raw`///////////////////////////////////////////////////////////////
// RAVEN CALDER -- INTERNAL PROCEDURE: RELOCATED HOUSES ENGINE //
///////////////////////////////////////////////////////////////

UNIVERSAL RELOCATION DIRECTIVE
This procedure works for ANY coordinates worldwide. The user may relocate to:
  - Any city (New York, London, Tokyo, Sydney, etc.)
  - Any latitude from 85°N to 85°S (polar regions excluded due to house instability)
  - Any longitude from 180°W to 180°E (full global coverage)
  - Any timezone (algorithm auto-converts to UT for calculations)

INPUT:
  birth_date        // YYYY-MM-DD
  birth_time_local  // HH:MM:SS (local civil time at birth place)
  birth_tz_offset   // hours from UTC at birth place (including DST if applicable)
  birth_lat         // degrees (+N, -S, range: -85 to +85)
  birth_lon         // degrees (+E, -W, range: -180 to +180)
  relocate_lat      // degrees (+N, -S, range: -85 to +85) -- CURRENT LOCATION
  relocate_lon      // degrees (+E, -W, range: -180 to +180) -- CURRENT LOCATION
  relocate_tz_offset// hours from UTC at relocate place (display only; do not alter UT)
  house_system      // "WHOLE_SIGN" | "EQUAL" | "PLACIDUS" | "PORPHYRY"
  zodiac            // "TROPICAL" or "SIDEREAL" (sidereal requires ayanamsa)
  planets[]         // natal planetary ecliptic longitudes (lambda, deg) and latitudes (beta, deg) if needed

OUTPUT:
  asc, mc                   // relocated Ascendant and Midheaven (ecliptic longitudes, deg)
  houses[1..12]             // 12 relocated house cusps (ecliptic longitudes, deg)
  placements[planet]        // planet -> house index (1..12) under relocated houses

GLOBAL CONVENTIONS:
  - Angles in degrees unless noted; normalize with norm360(x) = (x % 360 + 360) % 360
  - Longitudes: East-positive standard (0° = Greenwich, +180° = International Date Line)
  - Latitudes: North-positive standard (0° = Equator, +90° = North Pole, -90° = South Pole)
  - Time: Universal Time (UT) drives sidereal calculations; local time zones are for display only
  - Polar regions (|lat| > 85°): Fall back to Whole Sign houses if Placidus fails
  - For sidereal zodiac, subtract ayanamsa from tropical longitudes after computing ASC/MC/houses

/////////////////////////////////////
// 1) TIMEBASE -> UT -> JULIAN DAY //
/////////////////////////////////////
function toUT(birth_time_local, birth_tz_offset):
  // local -> UT
  return birth_time_local - birth_tz_offset hours

JD = julianDay(birth_date, toUT(birth_time_local, birth_tz_offset))
T = (JD - 2451545.0) / 36525.0

//////////////////////////////////////////////////////
// 2) EARTH ORIENTATION -> GMST -> LST (RELOCATION) //
//////////////////////////////////////////////////////
function gmst_deg(JD):
  // IAU 1982 approximation (sufficient for astrology):
  // GMST (hours) = 6.697374558 + 0.06570982441908*(JD0-2451545.0)
  //                + 1.00273790935*UT_in_hours + 0.000026*T^2
  // Convert to degrees: * 15
  return norm360( 280.46061837 + 360.98564736629*(JD - 2451545.0)
                  + 0.000387933*T*T - (T*T*T)/38710000.0 )

GMST = gmst_deg(JD)
LST  = norm360( GMST + relocate_lon )

//////////////////////////////////////////////////////
// 3) OBLIQUITY OF ECLIPTIC (epsilon) -- TROPICAL   //
//////////////////////////////////////////////////////
function meanObliquity_deg(T):
  // IAU 2006 series (compact form):
  return 23.43929111 - 0.0130041667*T - 1.6667e-7*T*T + 5.02778e-7*T*T*T

epsilon = meanObliquity_deg(T)
eps = deg2rad(epsilon)

//////////////////////////////////////////////////////
// 4) MC (ECLIPTIC LONGITUDE) FROM LST              //
//////////////////////////////////////////////////////
theta = deg2rad(LST)
lambda_mc = atan2( sin(theta)/cos(eps), cos(theta) )
mc = norm360( rad2deg(lambda_mc) )

//////////////////////////////////////////////////////
// 5) ASC (ECLIPTIC LONGITUDE) FROM LST, LATITUDE   //
//////////////////////////////////////////////////////
phi = deg2rad(relocate_lat)
numer = -cos(theta)*sin(eps) - sin(theta)*tan(phi)*cos(eps)
denom =  cos(theta)
lambda_asc = atan2( sin(theta)*cos(eps) - tan(phi)*sin(eps), cos(theta) )
asc = norm360( rad2deg(lambda_asc) )

//////////////////////////////////////////////////////
// 6) HOUSE CUSPS                                   //
//////////////////////////////////////////////////////
switch (house_system):
  case "WHOLE_SIGN":
    sign_index = floor(asc / 30)
    for i in 0..11:
      houses[i+1] = norm360( (sign_index + i) * 30 )
    break

  case "EQUAL":
    for i in 0..11:
      houses[i+1] = norm360( asc + 30*i )
    break

  case "PLACIDUS":
    RA_MC = LST
    function placidus_cusp(n):
      // Iteratively solve hour angle for cusp n (semi-arc division)
      // Then convert resulting right ascension to ecliptic longitude
      return lambda_cusp_deg

    houses[10] = mc
    houses[1]  = asc
    houses[11] = placidus_cusp(11)
    houses[12] = placidus_cusp(12)
    houses[2]  = placidus_cusp(2)
    houses[3]  = placidus_cusp(3)
    houses[4]  = norm360( houses[10] + 180 )
    houses[5]  = norm360( houses[11] + 180 )
    houses[6]  = norm360( houses[12] + 180 )
    houses[7]  = norm360( houses[1]  + 180 )
    houses[8]  = norm360( houses[2]  + 180 )
    houses[9]  = norm360( houses[3]  + 180 )
    break

//////////////////////////////////////////////////////
// 7) ZODIAC MODE (OPTIONAL SIDEREAL)               //
//////////////////////////////////////////////////////
if zodiac == "SIDEREAL":
  ayan = getAyanamsa(JD)
  asc  = norm360( asc  - ayan )
  mc   = norm360( mc   - ayan )
  for i in 1..12:
    houses[i] = norm360( houses[i] - ayan )
  // Planets must also subtract ayanamsa

//////////////////////////////////////////////////////
// 8) PLANET -> HOUSE ASSIGNMENT                    //
//////////////////////////////////////////////////////
function houseIndex(lambda, houses[1..12]):
  seq = unwrapCircular(houses)
  lam = unwrapToNear(lambda, seq[1])
  for h in 1..12:
    hi = h % 12 + 1
    if lam >= seq[h] && lam < seq[hi]:
      return h
  return 12

for each planet p in planets:
  placements[p] = houseIndex(planets[p].lambda, houses)

//////////////////////////////////////////////////////
// 9) REPORT MERGE                                  //
//////////////////////////////////////////////////////
return { asc, mc, houses, placements }

//////////////////////////////////////////////////////
// 10) VALIDATION / SANITY TESTS                    //
//////////////////////////////////////////////////////
assert planets_natal_unchanged()
assert asc != null && mc != null
assert houses[1] == asc for EQUAL system
assert houses[10] == mc for all systems
assert relocate_lat >= -85 && relocate_lat <= 85   // polar check
assert relocate_lon >= -180 && relocate_lon <= 180 // longitude bounds

//////////////////////////////////////////////////////
// 11) GLOBAL EDGE CASES & EXAMPLES                 //
//////////////////////////////////////////////////////

HIGH LATITUDE LOCATIONS (approaching polar regions):
  - If |relocate_lat| > 85°: automatically fall back to WHOLE_SIGN houses
  - Examples: Svalbard (78°N), McMurdo Station (-77°S), northern Alaska/Canada
  - Disclosure: "Polar latitude detected; using Whole Sign houses for stability"

INTERNATIONAL DATE LINE CROSSING:
  - Longitude normalization: ensure -180° ≤ lon ≤ +180°
  - Examples: Fiji (+178°E), Samoa (-172°W), Kamchatka (+160°E)
  - No special handling needed; standard LST calculation applies

EXTREME TIMEZONE OFFSETS:
  - Handle UTC-12 (Baker Island) to UTC+14 (Kiribati)
  - Examples: Honolulu (UTC-10), Auckland (UTC+12), Chatham Islands (UTC+12:45)
  - Remember: timezone offset affects DISPLAY only, not house calculations

EQUATORIAL LOCATIONS:
  - Near 0° latitude: standard calculations apply
  - Examples: Quito (0°S), Singapore (1°N), Nairobi (-1°S)
  - No special handling required

COMMON RELOCATION EXAMPLES:
  - NYC: 40.7°N, -74.0°W (UTC-5/-4)
  - London: 51.5°N, -0.1°W (UTC+0/+1)
  - Tokyo: 35.7°N, 139.7°E (UTC+9)
  - Sydney: -33.9°S, 151.2°E (UTC+10/+11)
  - Mumbai: 19.1°N, 72.8°E (UTC+5:30)

Notes for the human reading this PDF:
  - This algorithm works globally for any Earth coordinates within habitable latitudes
  - The relocation timezone is only for displaying local clock times; all math runs on UT
  - Whole Sign and Equal implementations are direct; Placidus requires the semi-diurnal arc solver
  - Lock natal planet longitudes, signs, and aspects; only houses/angles relocate to the new frame
  - When in doubt, test with known coordinates: your relocated ASC should match astro software
`;

// Helper functions to extract UI/UX Contract types from existing data
function extractReportHeader(
  mode: ReportMode,
  startDate: string,
  endDate: string,
  step: string,
  relocationStatus: any,
  relocLabel?: string | null
): ReportHeader {
  const normalizedMode = (() => {
    switch (mode) {
      case 'NATAL_ONLY': return 'NATAL';
      case 'NATAL_TRANSITS': return 'TRANSITS';
      case 'SYNASTRY': return 'SYNASTRY';
      case 'SYNASTRY_TRANSITS': return 'SYNASTRY_TRANSITS';
      case 'COMPOSITE': return 'SYNASTRY'; // Treat composite as synastry for UI purposes
      case 'COMPOSITE_TRANSITS': return 'SYNASTRY_TRANSITS';
      default: return 'NATAL';
    }
  })() as ReportHeader['mode'];

  return {
    mode: normalizedMode,
    window: startDate && endDate ? {
      start: startDate,
      end: endDate,
      step: step as "daily" | "hourly" | "none"
    } : undefined,
    relocated: {
      active: relocationStatus.effectiveMode !== 'NONE',
      label:
        relocationStatus.effectiveMode !== 'NONE'
          ? (relocLabel?.trim() ? relocLabel.trim() : undefined)
          : undefined
    }
  };
}

function extractWeather(startDate: string, endDate: string, result: any): Weather {
  // hasWindow computed once: valid start+end+step
  const hasWindow = !!(
    startDate &&
    endDate &&
    startDate.trim() &&
    endDate.trim() &&
    startDate.match(/^\d{4}-\d{2}-\d{2}$/) &&
    endDate.match(/^\d{4}-\d{2}-\d{2}$/)
  );

  // Extract balance meter data if available
  let balanceMeter: Weather['balanceMeter'] | undefined;
  const AXIS_VALUE_KEYS = ['value', 'display', 'final', 'scaled', 'score', 'mean'];
  const pickFinite = (...candidates: any[]): number | undefined => {
    for (const candidate of candidates) {
      const numeric = toFiniteNumber(candidate);
      if (Number.isFinite(numeric)) return numeric;
      if (candidate && typeof candidate === 'object') {
        for (const key of AXIS_VALUE_KEYS) {
          const nestedCandidate = (candidate as any)[key];
          const nested = toFiniteNumber(nestedCandidate);
          if (Number.isFinite(nested)) return nested;
        }
      }
    }
    return undefined;
  };

  const resolveAxis = (
    source: any,
    axis: 'magnitude' | 'directional_bias' | 'volatility'
  ): number | undefined => {
    const extracted = extractAxisNumber(source, axis);
    if (typeof extracted === 'number' && Number.isFinite(extracted)) {
      return extracted;
    }
    if (!source || typeof source !== 'object') return pickFinite(source);
    const typed = source as any;
    if (axis === 'magnitude') {
      return pickFinite(
        typed.magnitude,
        typed.axes?.magnitude,
        typed.balance?.magnitude,
        typed.balance_meter?.magnitude
      );
    }
    if (axis === 'directional_bias') {
      return pickFinite(
        typed.directional_bias,
        typed.bias_signed,
        typed.valence,
        typed.valence_bounded,
        typed.balance?.directional_bias,
        typed.balance_meter?.directional_bias,
        typed.balance_meter?.bias_signed
      );
    }
    const coherenceFallback =
      typeof typed.coherence === 'number' && Number.isFinite(typed.coherence)
        ? Math.max(0, Math.min(5, 5 - typed.coherence))
        : undefined;
    return pickFinite(
      typed.volatility,
      coherenceFallback,
      typed.axes?.volatility,
      typed.balance?.volatility,
      typed.balance_meter?.volatility
    );
  };

  const summary =
    result?.balance_meter ??
    result?.person_a?.summary ??
    result?.person_a?.balance_meter ??
    result?.person_a?.derived?.balance_meter ??
    result?.person_a?.derived?.seismograph_summary;

  // Calculate daily ranges to show texture (not just averages)
  const transitsByDate = result?.person_a?.chart?.transitsByDate || {};
  const dailyBiasValues: number[] = [];
  const dailyMagnitudeValues: number[] = [];
  const dailyVolatilityValues: number[] = [];

  Object.values(transitsByDate).forEach((dayData: any) => {
    const seismo = dayData?.seismograph || {};
    const balance = dayData?.balance || {};
    const frontStage = dayData?.balance_meter || {};

    // v5.0: directional_bias.value is canonical structure
    const bias = pickFinite(
      frontStage.directional_bias,
      seismo.directional_bias?.value,
      frontStage.bias_signed,
      frontStage.valence,
      seismo.bias_signed,
      seismo.valence,
      balance.directional_bias?.value,
      balance.bias_signed
    );
    const mag = pickFinite(
      frontStage.magnitude,
      seismo.magnitude,
      balance.magnitude
    );
    const vol = pickFinite(
      frontStage.volatility,
      seismo.volatility
    );

    if (bias !== undefined) dailyBiasValues.push(bias);
    if (mag !== undefined) dailyMagnitudeValues.push(mag);
    if (vol !== undefined) dailyVolatilityValues.push(vol);
  });

  if (summary) {
    const magValue = resolveAxis(summary, 'magnitude');
    const biasValue = resolveAxis(summary, 'directional_bias');
    const volValue = resolveAxis(summary, 'volatility');

    const mag = Number.isFinite(magValue) ? (magValue as number) : 0;
    const val = Number.isFinite(biasValue) ? (biasValue as number) : 0;
    const vol = Number.isFinite(volValue) ? (volValue as number) : 0;

    // Calculate ranges
    const biasMin = dailyBiasValues.length > 0 ? Math.min(...dailyBiasValues) : val;
    const biasMax = dailyBiasValues.length > 0 ? Math.max(...dailyBiasValues) : val;
    const magMin = dailyMagnitudeValues.length > 0 ? Math.min(...dailyMagnitudeValues) : mag;
    const magMax = dailyMagnitudeValues.length > 0 ? Math.max(...dailyMagnitudeValues) : mag;

    balanceMeter = {
      magnitude: mag >= 3 ? 'High' : mag >= 1.5 ? 'Moderate' : 'Low',
      valence: val > 0.5 ? 'Harmonious' : val < -0.5 ? 'Tense' : 'Complex',
      volatility: vol >= 3 ? 'Unstable' : vol >= 1 ? 'Variable' : 'Stable',
      // Add range data
      biasRange: { min: biasMin, max: biasMax, average: val },
      magnitudeRange: { min: magMin, max: magMax, average: mag },
      volatilityRange: {
        min: dailyVolatilityValues.length > 0 ? Math.min(...dailyVolatilityValues) : vol,
        max: dailyVolatilityValues.length > 0 ? Math.max(...dailyVolatilityValues) : vol,
        average: vol
      }
    };
  }

  // Extract tier-1 hooks with plain language explanations (no bare counts)
  const tier1Hooks: Weather['tier1Hooks'] = [];
  const wovenMap = result?.person_a?.derived?.woven_map ?? (result as any)?.woven_map ?? null;
  const hooks = wovenMap?.hook_stack?.hooks || [];

  const pushHook = (hook: any) => {
    if (!hook) return;
    const planetA = hook.planet_a || hook.p1_name || '';
    const planetB = hook.planet_b || hook.p2_name || '';
    const aspect = hook.aspect || hook.type || '';
    const houseRaw = hook.house || hook.houseTag || hook.house_label || null;
    const houseNum = houseRaw != null ? String(houseRaw).padStart(2, '0') : null;

    tier1Hooks.push({
      label: `${planetA} ↔ ${planetB}`.trim(),
      why: generatePlainLanguageExplanation(planetA, planetB, aspect),
      houseTag: houseNum ? `A:${houseNum}` : undefined
    });
  };

  hooks.filter((hook: any) => (hook.orb || hook.orbit || 0) <= 1.0).slice(0, 3).forEach(pushHook);

  if (tier1Hooks.length === 0 && hooks.length > 0) {
    hooks.slice(0, 2).forEach(pushHook);
  }

  return {
    hasWindow,
    balanceMeter,
    tier1Hooks
  };
}

function extractBlueprint(result: any): Blueprint {
  // Extract thesis - must be non-empty per contract
  const wovenMap = result?.person_a?.derived?.woven_map ?? (result as any)?.woven_map ?? null;
  const voice = wovenMap?.voice;
  const tier1Count = wovenMap?.hook_stack?.tier_1_orbs || 0;

  let thesis = voice || '';
  if (!thesis) {
    // Friendly, plain fallback language for all users
    thesis = tier1Count > 0
      ? `You have ${tier1Count} standout patterns in your chart. These shape how you connect, grow, and make choices every day.`
      : `Your chart is steady and balanced, offering gentle support and clear direction for your life.`;
  }

  return { thesis };
}

function generatePlainLanguageExplanation(planetA: string, planetB: string, aspect: string): string {
  // Simple explanations that newcomers can understand
  const explanations: Record<string, string> = {
    'Sun opposition Saturn': 'tests the balance between personal expression and responsibility',
    'Moon square Mars': 'creates tension between emotional needs and taking action',
    'Venus trine Jupiter': 'opens opportunities for growth, relationships, and abundance',
    'Mercury conjunction Pluto': 'intensifies communication and brings depth to thinking',
    'Mars square Jupiter': 'challenges you to balance ambition with realistic limits',
    'Sun conjunct Moon': 'aligns your identity with your emotional nature',
    'Venus square Mars': 'creates dynamic tension between attraction and assertion'
  };

  const key = `${planetA} ${aspect} ${planetB}`;
  return explanations[key] || `creates important interaction between ${planetA.toLowerCase()} and ${planetB.toLowerCase()} themes`;
}

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
  const [isAdmin, setIsAdmin] = useState(false);

  const isIOS = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const { userAgent = '', platform = '' } = window.navigator || {};
    return /iPad|iPhone|iPod/i.test(userAgent) || /iPad|iPhone|iPod/i.test(platform);
  }, []);

  const handleDateFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    if (isIOS) {
      return;
    }
    event.currentTarget.showPicker?.();
  }, [isIOS]);

  const handleDateTouchStart = useCallback((event: TouchEvent<HTMLInputElement>) => {
    if (isIOS) {
      return;
    }
    event.preventDefault();
    const input = event.currentTarget;
    input.focus();
    input.showPicker?.();
  }, [isIOS]);

  const today = useMemo(() => new Date(), []);
  const fmt = useCallback((d: Date) => d.toISOString().slice(0, 10), []);

  // Default date ranges differ based on whether symbolic weather (transits) are enabled
  // - Transits default to a single-day window that users can expand as needed
  // - Natal-only defaults to a week-long planning window
  const getDefaultDates = useCallback((withTransits: boolean) => {
    const start = fmt(today);
    if (withTransits) {
      return { start, end: start };
    }
    const end = fmt(new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000));
    return { start, end };
  }, [today, fmt]);

  const [personA, setPersonA] = useState<Subject>(() => createEmptySubject());
  const [personB, setPersonB] = useState<Subject>(() => createEmptySubject());

  // Single-field coordinates (Person A)
  const [aCoordsInput, setACoordsInput] = useState<string>("");
  const [aCoordsError, setACoordsError] = useState<string | null>(null);
  const [aCoordsValid, setACoordsValid] = useState<boolean>(true);

  const [startDate, setStartDate] = useState<string>(() => getDefaultDates(false).start);
  const [endDate, setEndDate] = useState<string>(() => getDefaultDates(false).end);
  const [reportStructure, setReportStructure] = useState<ReportStructure>('solo');
  // reportFormat removed - Raven Calder always uses conversational voice per corpus/persona
  const [includeTransits, setIncludeTransits] = useState<boolean>(false);
  const [graphsPdfGenerating, setGraphsPdfGenerating] = useState<boolean>(false);
  const [includePersonB, setIncludePersonB] = useState<boolean>(false);
  const mode = useMemo<ReportMode>(() => modeFromStructure(reportStructure, includeTransits), [reportStructure, includeTransits]);
  const applyMode = useCallback((nextMode: ReportMode) => {
    const nextStructure = structureFromMode(nextMode);
    setReportStructure(nextStructure);
    setIncludeTransits(TRANSIT_MODES.has(nextMode));
    if (nextStructure !== 'solo') {
      // Do not auto-enable Person B when switching to relational mode
      // Only activate if user explicitly enables or provides Person B data
    }
  }, []);

  // Mode dropdown options

  const soloModeOption: ModeOption = useMemo(() => {
    const baseMode = includeTransits ? 'NATAL_TRANSITS' : 'NATAL_ONLY';
    const label = includeTransits ? 'Natal with Transits' : 'Natal Only';
    return { value: baseMode, label };
  }, [includeTransits]);

  const relationalModeOptions = useMemo<ModeOption[]>(() => {
    if (!includePersonB) return [];

    return [
      {
        value: includeTransits ? 'SYNASTRY_TRANSITS' : 'SYNASTRY',
        label: includeTransits ? 'Synastry with Transits' : 'Synastry'
      },
      {
        value: includeTransits ? 'COMPOSITE_TRANSITS' : 'COMPOSITE',
        label: includeTransits ? 'Composite with Transits' : 'Composite'
      },
    ];
  }, [includePersonB, includeTransits]);

  const [step, setStep] = useState<string>("daily");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !AUTH_ENABLED);
  const [authReady, setAuthReady] = useState(() => !AUTH_ENABLED);
  const [userId, setUserId] = useState<string | null>(null);

  // User profiles hook
  const {
    profiles,
    loading: profilesLoading,
    error: profilesError,
    saveProfile,
    deleteProfile
  } = useUserProfiles(userId);

  const personASignature = useMemo(() => buildPersonSignature(personA), [personA]);
  const personBSignature = useMemo(() => buildPersonSignature(personB), [personB]);

  const existingProfileForPersonA = useMemo(() => {
    if (!personASignature) return null;
    return profiles.find((profile) => buildProfileSignature(profile) === personASignature) ?? null;
  }, [personASignature, profiles]);

  const existingProfileForPersonB = useMemo(() => {
    if (!personBSignature) return null;
    return profiles.find((profile) => buildProfileSignature(profile) === personBSignature) ?? null;
  }, [personBSignature, profiles]);

  const frontStageResult = useMemo(() => {
    if (!result) return null;
    try {
      return createFrontStageResult(result);
    } catch (error) {
      console.warn('[MathBrain] Failed to create frontstage result', error);
      return null;
    }
  }, [result]);

  const displayResult = frontStageResult ?? result;

  const frontStageTransitsByDate = useMemo(() => {
    if (frontStageResult?.person_a?.chart?.transitsByDate) {
      return frontStageResult.person_a.chart.transitsByDate;
    }
    return result?.person_a?.chart?.transitsByDate || {};
  }, [frontStageResult, result]);

  // Snapshot state
  const [snapshotResult, setSnapshotResult] = useState<any>(null);
  const [snapshotLocation, setSnapshotLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<Date | null>(null);

  const broadcastAuthStatus = useCallback((authedValue: boolean) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const payload = {
        authed: authedValue,
        updatedAt: Date.now(),
      };
      window.localStorage.setItem(AUTH_STATUS_STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent(AUTH_STATUS_EVENT, { detail: payload }));
    } catch (err) {
      console.warn('Failed to broadcast auth status from Math Brain', err);
    }
  }, []);

  // Snapshot handlers
  const handleSnapshotCapture = useCallback((result: any, location: any, timestamp: Date) => {
    setSnapshotResult(result);
    setSnapshotLocation(location);
    setSnapshotTimestamp(timestamp);
  }, []);

  const ensureSdk = async () => {
    const win = window as any;
    const hasCreate = typeof win?.auth0?.createAuth0Client === 'function' || typeof win?.createAuth0Client === 'function';
    if (hasCreate) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/auth0-spa-js.production.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Auth0 SDK'));
      document.head.appendChild(script);
    });
  };

  // Handle Auth0 redirect callback on /math-brain so login initiated from Home works
  useEffect(() => {
    if (!AUTH_ENABLED || typeof window === 'undefined') return;
    const qs = window.location.search;
    if (!qs.includes('code=') || !qs.includes('state=')) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureSdk();
        const res = await fetch('/api/auth-config', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Auth config fetch failed: ${res.status}`);
        const cfg = await res.json();
        const domain = normalizeAuth0Domain(cfg?.domain);
        const clientId = normalizeAuth0ClientId(cfg?.clientId);
        const audience = normalizeAuth0Audience(cfg?.audience ?? null);
        if (!domain || !clientId) throw new Error('Auth0 config missing');

        const win = window as any;
        const creator = win?.auth0?.createAuth0Client || win?.createAuth0Client;
        if (typeof creator !== 'function') throw new Error('Auth0 SDK not available');

        const client = await creator({
          domain,
          clientId,
          authorizationParams: {
            redirect_uri: getRedirectUri(),
            ...(audience ? { audience } : {}),
          },
        });

        await client.handleRedirectCallback();
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url.toString());
        const authed = await client.isAuthenticated();
        if (!cancelled) {
          setIsAuthenticated(authed);
          setAuthReady(true);
          broadcastAuthStatus(authed);
        }
      } catch (err) {
        console.error('Auth callback handling failed on /math-brain', err);
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSnapshotAuthRequired = useCallback(async () => {
    try {
      await ensureSdk();
      const res = await fetch('/api/auth-config', { cache: 'no-store' });
      if (!res.ok) throw new Error('Auth config fetch failed');
      const cfg = await res.json();
      const domain = normalizeAuth0Domain(cfg?.domain);
      const clientId = normalizeAuth0ClientId(cfg?.clientId);
      const audience = normalizeAuth0Audience(cfg?.audience ?? null);
      if (!domain || !clientId) throw new Error('Auth0 config missing');

      const win = window as any;
      const creator = win?.auth0?.createAuth0Client || win?.createAuth0Client;
      if (typeof creator !== 'function') throw new Error('Auth0 SDK not available');

      const client = await creator({
        domain,
        clientId,
        authorizationParams: {
          redirect_uri: getRedirectUri(),
          ...(audience ? { audience } : {}),
        },
      });

      const params: Record<string, any> = {
        redirect_uri: getRedirectUri(),
        ...(audience ? { audience } : {}),
      };
      const connection = getAuthConnection();
      if (connection) params.connection = connection;
      await client.loginWithRedirect({ authorizationParams: params });
    } catch (err) {
      console.error('Login failed', err);
      setError('Login failed. Please try again.');
    }
  }, []);

  const [showChartAssets, setShowChartAssets] = useState(false);
  const [showSeismographCharts, setShowSeismographCharts] = useState(false);
  const chartAssets = useMemo<ChartAssetDisplay[]>(() => {
    if (!result) return [];

    // Debug: Check if chart_assets exist in result
    console.log('[Chart Assets Debug]', {
      person_a_assets: (result as any)?.person_a?.chart_assets,
      person_b_assets: (result as any)?.person_b?.chart_assets,
      synastry_assets: (result as any)?.synastry_chart_assets,
      composite_assets: (result as any)?.composite?.chart_assets,
      top_level_assets: (result as any)?.chart_assets
    });

    const seen = new Set<string>();
    const items: ChartAssetDisplay[] = [];

    const formatToken = (input?: string | null) => {
      if (!input) return '';
      return String(input)
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    };

    const subjectAliases: Record<string, string> = {
      person_a: 'Person A',
      person_b: 'Person B',
      synastry: 'Synastry',
      composite: 'Composite',
      transit: 'Transit',
    };

    const addAssets = (list: any, defaultSubject?: string, defaultScope?: string) => {
      if (!list) return;

      if (Array.isArray(list)) {
        list.forEach((raw: any) => {
          if (!raw || typeof raw !== 'object') return;
          const idValue = raw.id ?? raw.key ?? raw.url;
          const id = typeof idValue === 'string' ? idValue.trim() : String(idValue || '').trim();
          if (!id || seen.has(id)) return;
          seen.add(id);

          const subjectKeyRaw = typeof raw.subject === 'string' ? raw.subject : defaultSubject;
          const subjectKey = subjectKeyRaw ? String(subjectKeyRaw) : null;
          const normalizedSubject = subjectKey ? subjectKey.toLowerCase() : '';
          const subjectLabel = subjectKey
            ? subjectAliases[normalizedSubject] || formatToken(subjectKey)
            : (defaultSubject ? formatToken(defaultSubject) : '');

          const chartTokenRaw = typeof raw.chartType === 'string'
            ? raw.chartType
            : (typeof raw.scope === 'string' ? raw.scope : (defaultScope || (raw.key ? String(raw.key) : '')));
          const chartToken = chartTokenRaw ? String(chartTokenRaw) : '';

          let chartLabel = chartToken ? formatToken(chartToken) : '';
          if (/wheel/i.test(chartToken)) {
            chartLabel = 'Wheel';
          } else if (chartLabel && !/wheel|chart/i.test(chartLabel)) {
            chartLabel = `${chartLabel} Chart`;
          } else if (!chartLabel) {
            chartLabel = subjectLabel ? '' : 'Chart';
          }

          const labelParts = [subjectLabel, chartLabel].filter(Boolean);
          const label = labelParts.length ? labelParts.join(' · ') : 'Chart';

          const rawUrl = typeof raw.url === 'string' ? raw.url.trim() : '';
          const url = rawUrl || `/api/chart/${encodeURIComponent(id)}`;
          const contentType = typeof raw.contentType === 'string' ? raw.contentType : 'application/octet-stream';
          const format = typeof raw.format === 'string' ? raw.format : undefined;

          items.push({
            id,
            url,
            label,
            contentType,
            format,
            subject: subjectKey,
            chartType: typeof raw.chartType === 'string' ? raw.chartType : chartToken || null,
            scope: typeof raw.scope === 'string' ? raw.scope : defaultScope || null,
            expiresAt: typeof raw.expiresAt === 'number' ? raw.expiresAt : undefined,
            size: typeof raw.size === 'number' ? raw.size : undefined,
          });
        });
        return;
      }

      if (typeof list === 'object') {
        Object.values(list).forEach((value) => addAssets(value, defaultSubject, defaultScope));
      }
    };

    addAssets((result as any)?.person_a?.chart_assets, 'person_a', 'natal');
    addAssets((result as any)?.person_b?.chart_assets, 'person_b', 'natal');
    addAssets((result as any)?.synastry_chart_assets, 'synastry', 'synastry');
    addAssets((result as any)?.composite?.chart_assets, 'composite', 'composite');
    addAssets((result as any)?.chart_assets);

    return items;
  }, [result]);
  useEffect(() => {
    if (!chartAssets.length) {
      setShowChartAssets(false);
    }
  }, [chartAssets]);

  useEffect(() => {
    const transitEntries = frontStageTransitsByDate;
    const hasTransitData = includeTransits && transitEntries && Object.keys(transitEntries).length > 0;
    if (!hasTransitData) {
      setShowSeismographCharts(false);
    }
  }, [frontStageTransitsByDate, includeTransits]);

  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(() => {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_LAYER_VISIBILITY };
    }
    try {
      const saved = window.localStorage.getItem('mb.layerVisibility');
      if (!saved) return { ...DEFAULT_LAYER_VISIBILITY };
      const parsed = JSON.parse(saved);
      return {
        balance: !!parsed?.balance,
        diagnostics: !!parsed?.diagnostics,
      } as LayerVisibility;
    } catch {
      return { ...DEFAULT_LAYER_VISIBILITY };
    }
  });
  const [providerHealth, setProviderHealth] = useState<ProviderGateState>({
    astrology: { ready: true, configured: true },
    poetic: { ready: true, configured: true }
  });
  const [providerCheckPending, setProviderCheckPending] = useState<boolean>(() => !PROVIDER_BYPASS);
  const canVisitPoetic = POETIC_BRAIN_ENABLED && providerHealth.poetic.ready;

  // Person B subject state (declared earlier near Person A)
  // Person B single-field coordinates
  const [bCoordsInput, setBCoordsInput] = useState<string>("");
  const [bCoordsError, setBCoordsError] = useState<string | null>(null);
  const [bCoordsValid, setBCoordsValid] = useState<boolean>(true);
  const [relationshipType, setRelationshipType] = useState<string>("PARTNER");
  const [relationshipTier, setRelationshipTier] = useState<string>("");
  const [relationshipRole, setRelationshipRole] = useState<string>("");
  const [contactState, setContactState] = useState<"ACTIVE" | "LATENT">("LATENT");
  const [exEstranged, setExEstranged] = useState<boolean>(false);
  const [relationshipNotes, setRelationshipNotes] = useState<string>("");
  const [savedSession, setSavedSession] = useState<any>(null);
  const [showSessionResumePrompt, setShowSessionResumePrompt] = useState<boolean>(false);
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [showSaveChartModal, setShowSaveChartModal] = useState<boolean>(false);
  const [saveChartName, setSaveChartName] = useState<string>("");

  const personASlug = useMemo(() => {
    const sourceName =
      (result as any)?.person_a?.details?.name ||
      (result as any)?.person_a?.name ||
      personA.name ||
      'person-a';
    return sanitizeSlug(String(sourceName), 'person-a');
  }, [result, personA.name]);

  const personBSlug = useMemo(() => {
    const sourceName =
      (result as any)?.person_b?.details?.name ||
      (result as any)?.person_b?.name ||
      personB.name ||
      'person-b';
    return sanitizeSlug(String(sourceName), 'person-b');
  }, [result, personB.name]);

  const dateRangeSlug = useMemo(() => {
    const directRange = () => {
      if (startDate && endDate) {
        return `${startDate}_to_${endDate}`;
      }
      return null;
    };

    const fromPeriod = (period: any) => {
      if (period?.start && period?.end) {
        return `${period.start}_to_${period.end}`;
      }
      return null;
    };

    const fromTransits = () => {
      const entries = (result as any)?.person_a?.chart?.transitsByDate;
      if (entries && typeof entries === 'object') {
        const keys = Object.keys(entries).filter(Boolean).sort();
        if (keys.length >= 2) {
          return `${keys[0]}_to_${keys[keys.length - 1]}`;
        }
      }
      return null;
    };

    const fallback = new Date().toISOString().slice(0, 10);

    return (
      directRange() ||
      fromPeriod((result as any)?.balance_meter?.period) ||
      fromPeriod((result as any)?.context?.period) ||
      fromPeriod((result as any)?.woven_map?.context?.period) ||
      fromTransits() ||
      fallback
    ).replace(/[^0-9a-zA-Z_\-]+/g, '-');
  }, [startDate, endDate, result]);

  const reportContractType = useMemo(
    () => determineReportContract(reportStructure, includeTransits),
    [reportStructure, includeTransits]
  );

  const filenameBase = useCallback(
    (prefix: string) => {
      const reportSlug = sanitizeSlug(reportContractType.replace(/_/g, '-'), 'report');
      const duo = includePersonB
        ? `${personASlug}-${personBSlug}`
        : personASlug;
      return [prefix, reportSlug, duo, dateRangeSlug].filter(Boolean).join('-');
    },
    [reportContractType, includePersonB, personASlug, personBSlug, dateRangeSlug]
  );

  // User-friendly filename helper (Raven Calder naming system)
  const friendlyFilename = useCallback(
    (type: 'directive' | 'dashboard' | 'symbolic-weather' | 'weather-log' | 'engine-config' | 'ai-bundle') => {
      const duo = includePersonB
        ? `${personASlug}-${personBSlug}`
        : personASlug;
      const dateStr = dateRangeSlug || 'no-dates';

      const nameMap = {
        'directive': 'Mirror_Directive',
        'dashboard': 'Weather_Dashboard',
        'symbolic-weather': 'Symbolic_Weather_Dashboard',
        'weather-log': 'Weather_Log',
        'engine-config': 'Engine_Configuration',
        'ai-bundle': 'AI_Bundle',
      };

      return `${nameMap[type]}_${duo}_${dateStr}`;
    },
    [includePersonB, personASlug, personBSlug, dateRangeSlug]
  );

  const toggleLayerVisibility = useCallback((key: keyof LayerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Time policy UI state
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
  }, [timeUnknown, timePolicy]);
  // Timezone dropdown options (US-centric + GMT/UTC) - simplified format
  const tzOptions = useMemo(() => [
    'GMT', 'UTC', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific',
    'US/Alaska', 'US/Hawaii'
  ], []);
  // Legacy formatting helpers
  // Translocation / Relocation selection (angles/houses reference)


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
  const balanceGraphsRef = useRef<HTMLDivElement | null>(null);
  const bNameRef = useRef<HTMLInputElement | null>(null);
  const lastSubmitRef = useRef<number>(0);
  // Lightweight toast for ephemeral notices (e.g., Mirror failure)
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;

    async function probeProviders() {
      if (PROVIDER_BYPASS) {
        setProviderHealth({ astrology: { ready: true, configured: true }, poetic: { ready: true, configured: true } });
        setProviderCheckPending(false);
        return;
      }
      try {
        const response = await fetch('/api/provider-health', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Health check failed with status ${response.status}`);
        }
        const data = await response.json();
        if (cancelled) return;

        const astrology = {
          ready: Boolean(data?.providers?.astrology?.ok),
          configured: Boolean(data?.providers?.astrology?.configured),
          message: data?.providers?.astrology?.message || undefined
        };
        const poetic = {
          ready: Boolean(data?.providers?.poetic?.ok),
          configured: Boolean(data?.providers?.poetic?.configured),
          message: data?.providers?.poetic?.message || undefined
        };

        setProviderHealth({ astrology, poetic });

        const offlineMessages: string[] = [];
        if (!astrology.ready && astrology.message) offlineMessages.push(astrology.message);
        if (!poetic.ready && poetic.message) offlineMessages.push(poetic.message);
        if (offlineMessages.length) {
          setToast(offlineMessages.join(' • '));
          setTimeout(() => setToast(null), 3500);
        }
      } catch (error: any) {
        if (cancelled) return;
        const fallbackMessage = 'Unable to verify provider health. Services may be offline.';
        setProviderHealth({
          astrology: { ready: false, configured: false, message: fallbackMessage },
          poetic: { ready: false, configured: false, message: fallbackMessage }
        });
        setToast(fallbackMessage);
        setTimeout(() => setToast(null), 3500);
      } finally {
        if (!cancelled) {
          setProviderCheckPending(false);
        }
      }
    }

    probeProviders();

    return () => {
      cancelled = true;
    };
  }, [setProviderHealth, setProviderCheckPending, setToast]);
  useEffect(() => {
    try {
      // Initialize from URL and localStorage
      const url = new URL(window.location.href);

      // Initialize weeklyAgg from localStorage
      const savedWeeklyAgg = window.localStorage.getItem('weeklyAgg');
      if (savedWeeklyAgg === 'max' || savedWeeklyAgg === 'mean') {
        setWeeklyAgg(savedWeeklyAgg);
      }

      // Initialize debug mode from URL
      setDebugMode(url.searchParams.get('debug') === '1');

      // Check for saved session
      try {
        const savedSessionStr = window.localStorage.getItem('mb.lastSession');
        if (savedSessionStr) {
          const parsed = JSON.parse(savedSessionStr);
          setSavedSession(parsed);
          setShowSessionResumePrompt(true);
        }
      } catch (e) {
        // Silently fail - not critical
      }

      // Load saved charts
      try {
        const charts = getSavedCharts(); // TODO: Pass userId when Auth0 is integrated
        setSavedCharts(charts);
      } catch (e) {
        // Silently fail - not critical
      }
    } catch {/* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session memory flags
  const [hasSavedInputs, setHasSavedInputs] = useState<boolean>(false);
  const [saveForNextSession, setSaveForNextSession] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = window.localStorage.getItem('mb.saveInputsPreference');
      if (stored === 'false') return false;
      if (stored === 'true') return true;
    } catch {/* ignore */ }
    return true;
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  // Shared file input ref for bottom Session Presets box
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setupUploadId = useId();

  // Weekly aggregation preference: 'mean' | 'max' (for seismograph weekly bars)
  const [weeklyAgg, setWeeklyAgg] = useState<'mean' | 'max'>('mean');
  // Sampling frequency for Balance Meter / seismograph resolution: 'weekly' | 'daily'
  // Default is 'weekly' to preserve historical behavior (5 pulses month effect)
  const [samplingFrequency, setSamplingFrequency] = useState<'weekly' | 'daily'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('mb.samplingFrequency') : null;
      if (saved === 'weekly' || saved === 'daily') return saved;
    } catch {/* ignore */ }
    return 'weekly';
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('weeklyAgg', weeklyAgg);
    } catch {/* ignore */ }
  }, [weeklyAgg]);
  useEffect(() => {
    try {
      window.localStorage.setItem('mb.samplingFrequency', samplingFrequency);
    } catch {/* ignore */ }
  }, [samplingFrequency]);
  useEffect(() => {
    try {
      window.localStorage.setItem('mb.layerVisibility', JSON.stringify(layerVisibility));
    } catch {/* ignore */ }
  }, [layerVisibility]);

  // Check for saved inputs on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('mb.lastInputs');
      setHasSavedInputs(!!saved);
    } catch {
      setHasSavedInputs(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('mb.saveInputsPreference', String(saveForNextSession));
    } catch {/* ignore */ }
  }, [saveForNextSession]);

  // Relational modes list used for UI guards
  const isRelationalStructure = reportStructure !== 'solo';
  const isDyadMode = includePersonB && isRelationalStructure;
  const reportContractKind: 'balance' | 'mirror' = reportContractType.includes('balance') ? 'balance' : 'mirror';
  const reportType = reportContractKind; // Legacy alias for reportContractKind

  const {
    downloadResultPDF,
    downloadResultJSON,
    downloadBackstageJSON,
    downloadMirrorSymbolicWeatherJSON,
    downloadMirrorDirectiveJSON,
    downloadFieldMapFile,
    downloadAstroFileJSON,
    downloadMapFile,
    downloadFieldFile,
    pdfGenerating,
    cleanJsonGenerating,
    engineConfigGenerating,
    astroFileJsonGenerating,
    downloadWovenAIPacket,
  } = useChartExport({
    result,
    reportType,
    reportContractType,
    reportRef,
    friendlyFilename,
    filenameBase,
    setToast,
  });

  const weather = useMemo(() =>
    extractWeather(startDate, endDate, displayResult),
    [startDate, endDate, displayResult]
  );

  const blueprint = useMemo(() =>
    extractBlueprint(result),
    [result]
  );

  // Build seismograph map for health data correlation
  const seismographMap = useMemo<SeismographMap>(() => {
    if (!result && !frontStageResult) return {};
    const transitsByDate = frontStageTransitsByDate;
    const map: SeismographMap = {};

    Object.entries(transitsByDate).forEach(([date, dayData]: [string, any]) => {
      const seismo = dayData?.seismograph || dayData?.balance || {};
      if (seismo.magnitude !== undefined) {
        map[date] = {
          magnitude: Number(seismo.magnitude ?? 0),
          valence: Number(seismo.valence ?? seismo.valence_bounded ?? 0),
          valence_bounded: Number(seismo.valence_bounded ?? seismo.valence ?? 0),
          volatility: Number(seismo.volatility ?? 0),
          coherence: Number(seismo.coherence ?? 0),
        };
      }
    });

    return map;
  }, [frontStageResult, frontStageTransitsByDate, result]);

  useEffect(() => {
    setTranslocation((prev) => {
      if (!isDyadMode && (prev === 'B_LOCAL' || prev === 'MIDPOINT')) {
        return 'NONE';
      }
      if (prev === 'MIDPOINT' && (reportStructure !== 'composite' || !includeTransits)) {
        return isDyadMode ? 'BOTH_LOCAL' : 'NONE';
      }
      return prev;
    });
  }, [includeTransits, isDyadMode, reportStructure]);

  // Automatically enable includePersonB when a relationship type is selected
  useEffect(() => {
    // Do not auto-enable Person B when relationshipType changes
  }, [relationshipType]);

  useEffect(() => {
    if (!includeTransits && layerVisibility.balance) {
      setLayerVisibility((prev) => ({ ...prev, balance: false }));
    }
  }, [includeTransits, layerVisibility.balance]);

  useEffect(() => {
    if (!AUTH_ENABLED || typeof window === 'undefined') {
      return;
    }

    const applyAuthStatus = (payload: { authed?: boolean | null }) => {
      if (typeof payload?.authed === 'boolean') {
        setIsAuthenticated(payload.authed);
        setAuthReady(true);
      }
    };

    try {
      const raw = window.localStorage.getItem(AUTH_STATUS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        applyAuthStatus(parsed);
      }
    } catch (err) {
      console.warn('Failed to read stored auth status', err);
    }

    const handleCustom = (event: Event) => {
      const custom = event as CustomEvent<{ authed?: boolean | null }>;
      if (custom?.detail) {
        applyAuthStatus(custom.detail);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_STATUS_STORAGE_KEY) return;
      if (event.newValue) {
        try {
          applyAuthStatus(JSON.parse(event.newValue));
        } catch (err) {
          console.warn('Failed to parse auth status from storage event', err);
        }
      }
    };

    window.addEventListener(AUTH_STATUS_EVENT, handleCustom as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(AUTH_STATUS_EVENT, handleCustom as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Check if user is admin and authentication status
  useEffect(() => {
    if (!AUTH_ENABLED) {
      setIsAuthenticated(true);
      setIsAdmin(false);
      setAuthReady(true);
      broadcastAuthStatus(true);
      return;
    }

    let cancelled = false;

    const ensureSdk = () => {
      if (typeof window === 'undefined') return Promise.resolve();
      const win = window as any;
      const hasCreate = typeof win?.auth0?.createAuth0Client === 'function' || typeof win?.createAuth0Client === 'function';
      if (hasCreate) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/vendor/auth0-spa-js.production.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Auth0 SDK'));
        document.head.appendChild(script);
      });
    };

    const checkAdminStatus = async () => {
      try {
        if (typeof window === 'undefined') return;
        await ensureSdk();

        const res = await fetch('/api/auth-config', { cache: 'no-store' });
        if (!res.ok) throw new Error('Auth config fetch failed');
        const cfg = await res.json();
        const domain = normalizeAuth0Domain(cfg?.domain);
        const clientId = normalizeAuth0ClientId(cfg?.clientId);
        const audience = normalizeAuth0Audience(cfg?.audience ?? null);
        if (!domain || !clientId) throw new Error('Auth0 config missing domain/clientId');

        const win = window as any;
        const creator = win?.auth0?.createAuth0Client || win?.createAuth0Client;
        if (typeof creator !== 'function') throw new Error('Auth0 SDK not available');

        const client = await creator({
          domain,
          clientId,
          cacheLocation: 'localstorage',
          useRefreshTokens: true,
          useRefreshTokensFallback: true,
          authorizationParams: {
            redirect_uri: getRedirectUri(),
            ...(audience ? { audience } : {}),
          },
        });

        let authed = false;
        try {
          authed = await client.isAuthenticated();
          if (!authed && typeof client.checkSession === 'function') {
            await client.checkSession();
            authed = await client.isAuthenticated();
          }
        } catch (authError) {
          if (!cancelled) {
            console.warn('Math Brain auth check failed, continuing with stored state', authError);
          }
        }

        if (cancelled) return;

        setIsAuthenticated(authed);
        setAuthReady(true);
        broadcastAuthStatus(authed);

        if (authed) {
          try {
            const user = await client.getUser();
            if (!cancelled) {
              setIsAdmin(user?.email === 'nathal@gmail.com');
              setUserId(user?.sub || null);
            }
          } catch {
            if (!cancelled) {
              setIsAdmin(false);
              setUserId(null);
            }
          }
        } else {
          setIsAdmin(false);
          setUserId(null);
        }
      } catch (err) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setAuthReady(true);
          broadcastAuthStatus(false);
          console.warn('Math Brain auth initialization failed', err);
        }
      }
    };

    checkAdminStatus();

    return () => {
      cancelled = true;
    };
  }, [broadcastAuthStatus]);

  // Track if user has manually set dates to avoid overriding their choices
  const [userHasSetDates, setUserHasSetDates] = useState(false);
  const prevTransitFlagRef = useRef(includeTransits);

  // Update date range when transit inclusion toggles (unless the user already picked custom dates)
  useEffect(() => {
    const previousValue = prevTransitFlagRef.current;
    const toggled = previousValue !== includeTransits;

    if (toggled) {
      prevTransitFlagRef.current = includeTransits;
    }

    if (!userHasSetDates || toggled) {
      const defaultDates = getDefaultDates(includeTransits);
      setStartDate(defaultDates.start);
      setEndDate(defaultDates.end);

      // If the transit toggle changed, reset the user flag to allow future toggles to apply defaults
      if (toggled) {
        setUserHasSetDates(false);
      }
    }
  }, [includeTransits, getDefaultDates, userHasSetDates]);

  const relocationSelectLabels: Record<TranslocationOption, string> = useMemo(() => ({
    NONE: 'Birthplace (no relocation)',

    A_NATAL: 'Birthplace (no relocation)',
    A_LOCAL: 'Person A – Current Location',
    B_NATAL: 'Birthplace (no relocation)',
    B_LOCAL: 'Person B – Current Location',

    BOTH_LOCAL: isDyadMode ? 'Both Relocated (Custom Location)' : 'Custom Location (manual lens)',
    MIDPOINT: 'Midpoint (Composite only)'
  }), [isDyadMode]);

  const relocationModeCaption = useMemo(() => ({
    NONE: 'Relocation mode: None (natal locations)',
    A_NATAL: 'Relocation mode: A_natal (houses not recalculated, by design)',
    A_LOCAL: 'Relocation mode: A_local (houses recalculated)',
    B_NATAL: 'Relocation mode: B_natal (houses not recalculated, by design)',
    B_LOCAL: 'Relocation mode: B_local (houses recalculated)',

    BOTH_LOCAL: 'Relocation mode: Both_local (houses recalculated)',
    MIDPOINT: 'Relocation mode: Midpoint (synthetic shared frame, houses recalculated)',

  }), []);

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
      disabled: false,
      title: relationalDisabled
        ? 'Enter custom relocation coordinates to apply this lens for Person A.'
        : 'Requires custom coordinates to relocate both charts.',
    });

    if (reportStructure === 'composite' && includeTransits) {
      const midpointDisabled = relationalDisabled || !includeTransits;
      options.push({
        value: 'MIDPOINT',
        disabled: midpointDisabled,
        title: midpointDisabled
          ? (!includeTransits
            ? 'Midpoint relocation is only supported in Relational Balance reports.'
            : 'Midpoint relocation requires both Person A and Person B.')
          : 'Experimental — bond midpoint, not a physical place.',
      });
    }

    if (!options.some((opt) => opt.value === translocation)) {
      options.push({ value: translocation, disabled: true });
    }

    return options;
  }, [isDyadMode, includeTransits, reportStructure, translocation]);

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

  const relocationStatus = useMemo<RelocationStatus>(() => {
    let effectiveMode: TranslocationOption = translocation;
    let notice: string | null = null;

    if (!includeTransits) {
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
          if (relocationInputReady) {
            effectiveMode = 'A_LOCAL';
          } else {
            effectiveMode = 'NONE';
            notice = 'Enter relocation coordinates to activate this lens.';
          }
        } else if (!relocationInputReady) {
          effectiveMode = 'NONE';
          notice = 'Relocation not provided; defaulting to natal houses.';
        }
      } else if (translocation === 'MIDPOINT') {
        if (!isDyadMode) {
          effectiveMode = relocationInputReady ? 'A_LOCAL' : 'NONE';
          notice = 'Midpoint relocation requires both Person A and Person B.';
        } else if (!includeTransits) {
          effectiveMode = relocationInputReady ? 'BOTH_LOCAL' : 'NONE';
          notice = 'Midpoint relocation is only available for Relational Balance reports.';
        } else {
          effectiveMode = 'MIDPOINT';
        }
      }
    }

    // UX guard: if relocation coordinates effectively match birth place, call it out
    if (
      includeTransits &&
      relocationInputReady &&
      relocCoords &&
      !notice &&
      (translocation === 'A_LOCAL' || (isDyadMode && translocation === 'B_LOCAL'))
    ) {
      const epsilon = 1e-4; // ~11m — close enough to treat as same place
      const source = translocation === 'A_LOCAL' ? personA : personB;
      const latBirth = parseMaybeNumber((source as any).latitude);
      const lonBirth = parseMaybeNumber((source as any).longitude);

      if (latBirth !== null && lonBirth !== null) {
        const latDiff = Math.abs(latBirth - relocCoords.lat);
        const lonDiff = Math.abs(lonBirth - relocCoords.lon);
        if (latDiff <= epsilon && lonDiff <= epsilon) {
          notice =
            translocation === 'A_LOCAL'
              ? 'Relocation matches Person A birth place; symbolic weather will match natal houses.'
              : 'Relocation matches Person B birth place; symbolic weather will match natal houses.';
        }
      }
    }

    return { effectiveMode, notice };
  }, [
    includeTransits,
    translocation,
    relocationInputReady,
    isDyadMode,
    personBLocationReady,
    relocCoords,
    personA,
    personB,
  ]);

  // Extract UI/UX Contract types (computed once, passed down to children)
  const reportHeader = useMemo(
    () => extractReportHeader(mode, startDate, endDate, step, relocationStatus, relocLabel),
    [mode, startDate, endDate, step, relocationStatus, relocLabel]
  );

  const isTransitLensMode =
    reportHeader.mode === "TRANSITS" || reportHeader.mode === "SYNASTRY_TRANSITS";
  const lensStripeText =
    isTransitLensMode && reportHeader.relocated.active
      ? `Lens: ${reportHeader.relocated.label || "Relocated (label missing)."}`
      : "Lens: Natal houses (no relocation).";

  // If Person B is turned off while a relational mode is selected, reset to a solo mode
  useEffect(() => {
    if (!includePersonB && reportStructure !== 'solo') {
      setReportStructure('solo');
    }
  }, [includePersonB, reportStructure]);

  useEffect(() => {
    if (!includePersonB && (translocation === 'B_LOCAL' || translocation === 'MIDPOINT')) {
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

  function clearReport() {
    setResult(null);
    setError(null);
    setLoading(false);
  }

  function resetSessionMemory() {
    try {
      window.localStorage.removeItem('mb.lastInputs');
      setHasSavedInputs(false);
      setSaveForNextSession(true);
      // Also clear any existing report
      clearReport();
    } catch {/* noop */ }
  }

  function resumeLastInputs() {
    try {
      const raw = window.localStorage.getItem('mb.lastInputs');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.personA) setPersonA(saved.personA);
      if (saved.personB) setPersonB(saved.personB);
      if (typeof saved.aCoordsInput === 'string') setACoordsInput(saved.aCoordsInput);
      if (typeof saved.bCoordsInput === 'string') setBCoordsInput(saved.bCoordsInput);
      if (typeof saved.includePersonB === 'boolean') setIncludePersonB(saved.includePersonB);
      if (saved.mode) applyMode(normalizeReportMode(saved.mode));
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
      if (typeof saved.includeTransits === 'boolean') {
        setIncludeTransits(saved.includeTransits);
      }
      if (typeof saved.reportStructure === 'string' && ['solo', 'synastry', 'composite'].includes(saved.reportStructure)) {
        setReportStructure(saved.reportStructure as ReportStructure);
      }
      if (typeof saved.relocInput === 'string') setRelocInput(saved.relocInput);
      if (typeof saved.relocLabel === 'string') setRelocLabel(saved.relocLabel);
      if (typeof saved.relocTz === 'string') setRelocTz(saved.relocTz);
      if (saved.relocCoords && typeof saved.relocCoords === 'object') {
        const { lat, lon } = saved.relocCoords as { lat?: unknown; lon?: unknown };
        if (typeof lat === 'number' && typeof lon === 'number') {
          setRelocCoords({ lat, lon });
        }
      }
      if (typeof saved.timePolicy === 'string') {
        const validPolicies: TimePolicyChoice[] = ['planetary_only', 'whole_sign', 'sensitivity_scan', 'user_provided'];
        if ((validPolicies as string[]).includes(saved.timePolicy)) {
          setTimePolicy(saved.timePolicy as TimePolicyChoice);
        }
      }
      if (typeof saved.saveForNextSession === 'boolean') {
        setSaveForNextSession(saved.saveForNextSession);
      }

      // Hide the resume prompt after successful load
      setHasSavedInputs(false);
    } catch {/* noop */ }
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

  // Profile management functions
  const handleLoadProfile = useCallback((profile: BirthProfile, slot: 'A' | 'B') => {
    const rawLat = profile.lat ?? (profile as any).latitude;
    const rawLng = profile.lng ?? (profile as any).longitude;

    const lat = rawLat != null ? Number(rawLat) : undefined;
    const lng = rawLng != null ? Number(rawLng) : undefined;
    const hasCoords = Number.isFinite(lat as number) && Number.isFinite(lng as number);

    const person = {
      name: profile.name,
      year: profile.birthDate.split('-')[0] || '',
      month: profile.birthDate.split('-')[1] || '',
      day: profile.birthDate.split('-')[2] || '',
      hour: profile.birthTime.split(':')[0] || '',
      minute: profile.birthTime.split(':')[1] || '',
      city: profile.birthCity,
      state: profile.birthState || '',
      latitude: hasCoords && typeof lat === 'number' ? String(lat) : '',
      longitude: hasCoords && typeof lng === 'number' ? String(lng) : '',
      timezone: profile.timezone || '',
      nation: profile.birthCountry || 'US',
      zodiac_type: 'Tropic' as const,
    };

    if (slot === 'A') {
      setPersonA(person);
      if (hasCoords && typeof lat === 'number' && typeof lng === 'number') {
        setACoordsInput(formatDecimal(lat, lng));
        setACoordsError(null);
        setACoordsValid(true);
      } else {
        setACoordsInput('');
        setACoordsError(null);
        setACoordsValid(true);
      }
    } else {
      setPersonB(person);
      if (hasCoords && typeof lat === 'number' && typeof lng === 'number') {
        setBCoordsInput(formatDecimal(lat, lng));
        setBCoordsError(null);
        setBCoordsValid(true);
      } else {
        setBCoordsInput('');
        setBCoordsError(null);
        setBCoordsValid(true);
      }
    }
  }, []);

  const handleSaveCurrentProfile = useCallback(async (slot: 'A' | 'B', name: string) => {
    const person = slot === 'A' ? personA : personB;
    const existing = slot === 'A' ? existingProfileForPersonA : existingProfileForPersonB;

    if (!person.year || !person.month || !person.day) {
      alert('Please fill in birth date before saving');
      return;
    }

    if (existing) {
      alert(`This profile is already saved as "${existing.name}".`);
      return;
    }

    const latRaw = (person as any).latitude ?? (person as any).lat;
    const lngRaw = (person as any).longitude ?? (person as any).lng;
    const latParsed = latRaw !== undefined && latRaw !== null && `${latRaw}`.trim() !== ''
      ? Number(latRaw)
      : undefined;
    const lngParsed = lngRaw !== undefined && lngRaw !== null && `${lngRaw}`.trim() !== ''
      ? Number(lngRaw)
      : undefined;
    const lat = Number.isFinite(latParsed as number) ? (latParsed as number) : undefined;
    const lng = Number.isFinite(lngParsed as number) ? (lngParsed as number) : undefined;

    const profile: BirthProfile = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      birthDate: `${person.year}-${String(person.month).padStart(2, '0')}-${String(person.day).padStart(2, '0')}`,
      birthTime: `${String(person.hour).padStart(2, '0')}:${String(person.minute).padStart(2, '0')}`,
      birthCity: person.city,
      birthState: person.state,
      birthCountry: person.nation,
      timezone: person.timezone,
      lat,
      lng,
      latitude: lat,
      longitude: lng,
    };

    const success = await saveProfile(profile);
    if (success) {
      alert(`✅ Profile "${name}" saved successfully!`);
    } else {
      alert(`❌ Failed to save profile: ${profilesError || 'Unknown error'}`);
    }
  }, [personA, personB, saveProfile, profilesError, existingProfileForPersonA, existingProfileForPersonB]);

  const handleDeleteProfile = useCallback(async (profileId: string) => {
    const success = await deleteProfile(profileId);
    if (success) {
      alert('✅ Profile deleted successfully');
    } else {
      alert(`❌ Failed to delete profile: ${profilesError || 'Unknown error'}`);
    }
  }, [deleteProfile, profilesError]);

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

  function persistTrimmedLastPayload(rawPayload: any): 'success' | 'fallback' | 'error' {
    if (typeof window === 'undefined') {
      return 'error';
    }

    const reportType = rawPayload?.reportType as ReportContractType | undefined;
    let basePayload = rawPayload?.payload;
    if (typeof basePayload === 'string') {
      try {
        basePayload = JSON.parse(basePayload);
      } catch {
        basePayload = rawPayload?.payload;
      }
    }

    const mirrorSymbolicWeather =
      reportType && basePayload
        ? createMirrorSymbolicWeatherPayload(basePayload, reportType, {
          relationship: rawPayload?.relationship,
          translocation: rawPayload?.translocation,
        })
        : null;

    const trimmedPayload = mirrorSymbolicWeather
      ? {
        ...rawPayload,
        payload: mirrorSymbolicWeather.payload,
        payloadFormat: 'mirror-symbolic-weather-v1',
        poeticBrainCompatible: mirrorSymbolicWeather.hasChartGeometry,
      }
      : {
        ...rawPayload,
        payload: {
          person_a: basePayload?.person_a
            ? {
              name: basePayload.person_a.name,
              summary: basePayload.person_a.summary,
            }
            : undefined,
          woven_map: basePayload?.woven_map,
          _trimmed: true,
          _note: 'Payload trimmed for localStorage; full data in session export',
        },
      };

    try {
      window.localStorage.setItem('mb.lastPayload', JSON.stringify(trimmedPayload));
      return 'success';
    } catch (error: any) {
      const minimalPayload = {
        savedAt: rawPayload?.savedAt ?? new Date().toISOString(),
        from: rawPayload?.from ?? 'math-brain',
        payload: { _note: 'Payload too large; fetch from chat history' },
      };

      if (error?.name === 'QuotaExceededError' || error?.code === 22) {
        // eslint-disable-next-line no-console
        console.warn('localStorage quota exceeded; storing minimal payload', error);
      } else if (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to persist Math Brain payload for Poetic Brain reuse', error);
      }

      try {
        window.localStorage.setItem('mb.lastPayload', JSON.stringify(minimalPayload));
        return 'fallback';
      } catch (fallbackError) {
        // eslint-disable-next-line no-console
        console.error('Failed to persist Math Brain payload for Poetic Brain reuse', fallbackError);
        return 'error';
      }
    }
  }

  const handleNavigateToPoetic = () => {
    const hasReport = Boolean(result);
    if (hasReport) {
      // Store the report data in localStorage so Poetic Brain can retrieve it
      const payload: Record<string, any> = {
        savedAt: new Date().toISOString(),
        reportType: reportContractType,
        mode,
        includeTransits: TRANSIT_MODES.has(mode),
        window: {
          start: startDate || undefined,
          end: endDate || undefined,
        },
        subjects: {
          personA: personA
            ? {
              name: personA.name,
              timezone: personA.timezone,
              city: personA.city,
              state: personA.state,
            }
            : null,
          personB: personB
            ? {
              name: personB.name,
              timezone: personB.timezone,
              city: personB.city,
              state: personB.state,
            }
            : null,
        },
        relationship: {
          type: relationshipType,
          intimacy_tier: relationshipType === 'PARTNER' ? relationshipTier || undefined : undefined,
          role: relationshipType !== 'PARTNER' ? relationshipRole || undefined : undefined,
          contact_state: contactState,
          ex_estranged: relationshipType === 'FRIEND' ? undefined : exEstranged,
          notes: relationshipNotes || undefined,
        },
        payload: result,
      };

      const persistStatus = persistTrimmedLastPayload(payload);
      if (persistStatus === 'success') {
        setToast('📤 Report saved to Poetic Brain. Navigating…');
        setTimeout(() => setToast(null), 1200);
      } else if (persistStatus === 'fallback') {
        setToast('📤 Report trimmed for Poetic Brain. Navigating…');
        setTimeout(() => setToast(null), 1500);
      } else {
        // eslint-disable-next-line no-console
        console.error('Failed to save report to localStorage for Poetic Brain handoff');
        setToast('⚠️ Could not save report locally. Try downloading instead.');
        setTimeout(() => setToast(null), 2000);
      }

      const confirmNav = window.confirm(
        '✅ Report ready for Poetic Brain!\n\n' +
        'Your Math Brain report has been saved. You can now navigate to Poetic Brain for AI analysis.\n\n' +
        'Continue to Poetic Brain?'
      );
      if (confirmNav) {
        window.location.href = '/chat';
      }
    } else {
      window.location.href = '/chat';
    }
  };

  function handlePrint() {
    try { window.print(); } catch {/* noop */ }
  }


  // Generate condensed Markdown summary export (limited to ~29,000 tokens for ChatGPT compatibility)
  async function downloadMarkdownSummary() {
    if (!result) {
      setToast('No report available to export');
      setTimeout(() => setToast(null), 2000);
      return;
    }

    try {
      const exportResult = frontStageResult ?? result;
      const personAName = personA?.name || 'PersonA';
      const personBName = personB?.name || (mode === 'NATAL_ONLY' ? '' : 'PersonB');
      const exportDate = new Date();
      const reportTypeTitle = (() => {
        switch (reportContractType) {
          case 'relational_balance_meter':
            return 'Relational Balance Meter Report';
          case 'relational_mirror':
            return 'Relational Mirror Report';
          case 'solo_balance_meter':
            return 'Balance Meter Report';
          default:
            return 'Mirror Report';
        }
      })();

      let markdown = '';

      // Header
      markdown += `# ${reportTypeTitle}\n\n`;
      markdown += `**Generated:** ${exportDate.toLocaleDateString()} ${exportDate.toLocaleTimeString()}\n`;
      markdown += `**Subject:** ${personAName}`;
      if (personBName && mode !== 'NATAL_ONLY') {
        markdown += ` & ${personBName}`;
      }
      markdown += `\n`;
      markdown += `**Report Type:** ${reportTypeTitle}\n`;
      markdown += `**Session ID:** ${result.sessionId?.slice(-8) || 'N/A'}\n\n`;

      // Executive Summary
      markdown += `## Executive Summary\n\n`;
      if (reportType === 'balance') {
        markdown += `This Balance Meter report analyzes energetic patterns and trends using astrological calculations. `;
        markdown += `The data reveals the interplay between magnitude (intensity), valence (positive/negative tilt), `;
        markdown += `volatility (instability).\n\n`;
      } else {
        markdown += `This Mirror report provides insights into archetypal patterns and behavioral dynamics `;
        markdown += `through astrological analysis, revealing the Actor/Role composite and confidence metrics.\n\n`;
      }

      if (reportType === 'balance') {
        // Balance Meter specific data
        const daily = frontStageTransitsByDate;
        const dates = Object.keys(daily)
          .filter(d => d && d.match(/^\d{4}-\d{2}-\d{2}$/))
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        if (dates.length > 0) {
          markdown += `### Analysis Period\n\n`;
          // Format dates without timezone conversion to avoid date shifts
          const formatDateString = (dateStr: string) => {
            const [year, month, day] = dateStr.split('-');
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
          };
          markdown += `**Date Range:** ${formatDateString(dates[0])} - ${formatDateString(dates[dates.length - 1])}\n`;
          markdown += `**Total Days:** ${dates.length}\n\n`;

          // Summary statistics
          const series = dates.map(d => ({
            date: d,
            magnitude: Number(daily[d]?.seismograph?.magnitude ?? 0),
            valence: Number(daily[d]?.seismograph?.valence_bounded ?? daily[d]?.seismograph?.valence ?? 0),
            volatility: Number(daily[d]?.seismograph?.volatility ?? 0)
          }));

          const avgMagnitude = series.reduce((sum, s) => sum + s.magnitude, 0) / series.length;
          const avgValence = series.reduce((sum, s) => sum + s.valence, 0) / series.length;
          const avgVolatility = series.reduce((sum, s) => sum + s.volatility, 0) / series.length;
          markdown += `### Key Metrics Summary\n\n`;
          markdown += `| Metric | Average | Range |\n`;
          markdown += `|--------|---------|-------|\n`;
          markdown += `| **Magnitude** | ${avgMagnitude.toFixed(2)} | ${Math.min(...series.map(s => s.magnitude)).toFixed(1)} - ${Math.max(...series.map(s => s.magnitude)).toFixed(1)} |\n`;
          markdown += `| **Valence** | ${avgValence >= 0 ? '+' : ''}${avgValence.toFixed(2)} | ${Math.min(...series.map(s => s.valence)).toFixed(1)} - ${Math.max(...series.map(s => s.valence)).toFixed(1)} |\n`;
          markdown += `| **Volatility** | ${avgVolatility.toFixed(2)} | ${Math.min(...series.map(s => s.volatility)).toFixed(1)} - ${Math.max(...series.map(s => s.volatility)).toFixed(1)} |\n`;
          // SFD metric removed (deprecated)

          // Recent daily data (last 7 days)
          markdown += `### Recent Daily Data (Last 7 Days)\n\n`;
          markdown += `| Date | Magnitude | Valence | Volatility |\n`;
          markdown += `|------|-----------|---------|------------|\n`;

          dates.slice(-7).forEach(date => {
            const dayData = daily[date];
            const mag = Number(dayData?.seismograph?.magnitude ?? 0);
            const val = Number(dayData?.seismograph?.valence_bounded ?? dayData?.seismograph?.valence ?? 0);
            const vol = Number(dayData?.seismograph?.volatility ?? 0);
            // SFD removed — use directional bias / integration factors if available

            const dateStr = new Date(date).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric'
            });

            markdown += `| ${dateStr} | ${mag.toFixed(1)} | ${val >= 0 ? '+' : ''}${val.toFixed(1)} | ${vol.toFixed(1)} |\n`;
          });
          markdown += `\n`;

          // Additional Balance Report details
          const wm = (exportResult as any)?.woven_map;
          if (wm) {
            // Seismograph patterns and trends
            markdown += `### Seismograph Analysis\n\n`;

            // Trend analysis
            const recent = series.slice(-7);
            const older = series.slice(0, -7);
            if (older.length > 0 && recent.length > 0) {
              const recentAvgMag = recent.reduce((sum, s) => sum + s.magnitude, 0) / recent.length;
              const olderAvgMag = older.reduce((sum, s) => sum + s.magnitude, 0) / older.length;
              const magTrend = recentAvgMag - olderAvgMag;

              const recentAvgVal = recent.reduce((sum, s) => sum + s.valence, 0) / recent.length;
              const olderAvgVal = older.reduce((sum, s) => sum + s.valence, 0) / older.length;
              const valTrend = recentAvgVal - olderAvgVal;

              markdown += `**Recent Trends (Last 7 vs Previous):**\n`;
              markdown += `- Magnitude: ${magTrend >= 0 ? '↗' : '↘'} ${magTrend >= 0 ? '+' : ''}${magTrend.toFixed(2)} (${recentAvgMag.toFixed(2)} recent vs ${olderAvgMag.toFixed(2)} previous)\n`;
              markdown += `- Valence: ${valTrend >= 0 ? '↗' : '↘'} ${valTrend >= 0 ? '+' : ''}${valTrend.toFixed(2)} (${recentAvgVal.toFixed(2)} recent vs ${olderAvgVal.toFixed(2)} previous)\n`;
            }

            // Peak and valley identification
            const maxMag = Math.max(...series.map(s => s.magnitude));
            const minMag = Math.min(...series.map(s => s.magnitude));
            const maxVal = Math.max(...series.map(s => s.valence));
            const minVal = Math.min(...series.map(s => s.valence));

            const peakMagDate = series.find(s => s.magnitude === maxMag)?.date;
            const valleyMagDate = series.find(s => s.magnitude === minMag)?.date;
            const peakValDate = series.find(s => s.valence === maxVal)?.date;
            const valleyValDate = series.find(s => s.valence === minVal)?.date;

            markdown += `\n**Notable Points:**\n`;
            markdown += `- Highest Magnitude: ${maxMag.toFixed(1)} on ${peakMagDate ? new Date(peakMagDate).toLocaleDateString() : 'N/A'}\n`;
            markdown += `- Lowest Magnitude: ${minMag.toFixed(1)} on ${valleyMagDate ? new Date(valleyMagDate).toLocaleDateString() : 'N/A'}\n`;
            markdown += `- Peak Valence: ${maxVal >= 0 ? '+' : ''}${maxVal.toFixed(1)} on ${peakValDate ? new Date(peakValDate).toLocaleDateString() : 'N/A'}\n`;
            markdown += `- Valley Valence: ${minVal >= 0 ? '+' : ''}${minVal.toFixed(1)} on ${valleyValDate ? new Date(valleyValDate).toLocaleDateString() : 'N/A'}\n\n`;

            // Volatility patterns
            const highVolDays = series.filter(s => s.volatility > avgVolatility + 1).length;
            const lowVolDays = series.filter(s => s.volatility < avgVolatility - 1).length;
            if (highVolDays > 0 || lowVolDays > 0) {
              markdown += `**Volatility Patterns:**\n`;
              markdown += `- High volatility days (>${(avgVolatility + 1).toFixed(1)}): ${highVolDays}/${series.length}\n`;
              markdown += `- Low volatility days (<${(avgVolatility - 1).toFixed(1)}): ${lowVolDays}/${series.length}\n\n`;
            }
          }

          // Integration factors and quality metrics
          if (wm?.integration_factors) {
            markdown += `### Integration Factors\n\n`;
            const factors = wm.integration_factors;
            const factorKeys = [
              'fertile_field', 'harmonic_resonance', 'expansion_lift',
              'combustion_clarity', 'liberation_release', 'integration'
            ];

            markdown += `**Quality Metrics:**\n`;
            factorKeys.forEach(key => {
              if (factors[key] !== undefined) {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                markdown += `- ${label}: ${factors[key]}\n`;
              }
            });
            markdown += `\n`;
          }

          // Session metadata
          if (result?.sessionId || wm?.context) {
            markdown += `### Session Details\n\n`;
            if (result?.sessionId) {
              markdown += `**Session ID:** ${result.sessionId.slice(-8)}\n`;
            }
            if (wm?.context?.mode) {
              markdown += `**Analysis Mode:** ${wm.context.mode}\n`;
            }
            if (wm?.context?.period?.step) {
              markdown += `**Step Size:** ${wm.context.period.step}\n`;
            }
            if (wm?.provenance?.math_brain_version) {
              markdown += `**Engine Version:** ${wm.provenance.math_brain_version}\n`;
            }
            if (wm?.provenance?.house_system_name) {
              markdown += `**House System:** ${wm.provenance.house_system_name}\n`;
            }
            markdown += `\n`;
          }

          // Statistical insights
          markdown += `### Statistical Insights\n\n`;

          // Stability metrics
          const magStdev = Math.sqrt(series.reduce((sum, s) => sum + Math.pow(s.magnitude - avgMagnitude, 2), 0) / series.length);
          const valStdev = Math.sqrt(series.reduce((sum, s) => sum + Math.pow(s.valence - avgValence, 2), 0) / series.length);
          const volStdev = Math.sqrt(series.reduce((sum, s) => sum + Math.pow(s.volatility - avgVolatility, 2), 0) / series.length);

          markdown += `**Stability Metrics (Standard Deviation):**\n`;
          markdown += `- Magnitude stability: ${magStdev.toFixed(2)} (lower = more stable)\n`;
          markdown += `- Valence stability: ${valStdev.toFixed(2)} (lower = more stable)\n`;
          markdown += `- Volatility stability: ${volStdev.toFixed(2)} (lower = more consistent)\n\n`;

          // Balance meter climate assessment
          let climate = 'Neutral';
          if (avgValence > 2) climate = 'Expansive';
          else if (avgValence > 0.5) climate = 'Positive';
          else if (avgValence < -2) climate = 'Contractive';
          else if (avgValence < -0.5) climate = 'Challenging';

          let intensity = 'Moderate';
          if (avgMagnitude > 3.5) intensity = 'High';
          else if (avgMagnitude > 2.5) intensity = 'Elevated';
          else if (avgMagnitude < 1.5) intensity = 'Low';

          markdown += `**Climate Assessment:**\n`;
          markdown += `- Overall Climate: ${climate} (avg valence: ${avgValence >= 0 ? '+' : ''}${avgValence.toFixed(2)})\n`;
          markdown += `- Intensity Level: ${intensity} (avg magnitude: ${avgMagnitude.toFixed(2)})\n`;

          if (avgVolatility > 2.5) {
            markdown += `- Stability: High turbulence (avg volatility: ${avgVolatility.toFixed(2)})\n`;
          } else if (avgVolatility > 1.5) {
            markdown += `- Stability: Moderate fluctuation (avg volatility: ${avgVolatility.toFixed(2)})\n`;
          } else {
            markdown += `- Stability: Relatively stable (avg volatility: ${avgVolatility.toFixed(2)})\n`;
          }
          markdown += `\n`;
        }
      } else {
        // Mirror Report specific data
        const wm = (result as any)?.woven_map;
        if (wm) {
          markdown += `### Mirror Report Summary\n\n`;

          // Actor/Role composite with confidence and sample size
          if (wm.mirror_voice || wm.polarity_cards) {
            markdown += `### Actor/Role Composite\n\n`;

            // Extract Actor/Role information from mirror_voice or derived data
            if (wm.mirror_voice) {
              markdown += `**Mirror Voice:** ${wm.mirror_voice?.slice(0, 200) || 'N/A'}...\n\n`;
            }

            // Polarity cards summary
            if (wm.polarity_cards && Array.isArray(wm.polarity_cards)) {
              const cardCount = wm.polarity_cards.length;
              markdown += `**Polarity Cards:** ${cardCount} active cards\n`;
              if (cardCount > 0) {
                const activeCards = wm.polarity_cards.filter((card: any) => card?.field_tone || card?.voice_slot);
                markdown += `**Active Fields:** ${activeCards.length}/${cardCount}\n`;
              }
            }

            // Actor/Role drift tracking if available
            if (wm.vector_integrity?.drift_index || wm.integration_factors?.drift) {
              const driftIndex = wm.vector_integrity?.drift_index || wm.integration_factors?.drift || 0;
              markdown += `**Drift Index:** ${typeof driftIndex === 'number' ? driftIndex.toFixed(2) : 'N/A'}\n`;
            }
            markdown += `\n`;
          }

          // Session Statistics (WB, ABE, OSR counts)
          if (wm.hook_stack || wm.integration_factors) {
            markdown += `### Session Statistics\n\n`;

            // Hook stack summary
            if (wm.hook_stack) {
              const hooks = wm.hook_stack.hooks || [];
              const tier1Count = wm.hook_stack.tier_1_orbs || 0;
              const totalIntensity = wm.hook_stack.total_intensity || 0;
              const coverage = wm.hook_stack.coverage || 'unknown';

              markdown += `**Key Patterns:** ${hooks.length} significant connections\n`;
              markdown += `**Total Intensity:** ${totalIntensity}\n`;
              markdown += `**Coverage:** ${coverage}\n`;

              // Add named tier-1 hooks instead of bare counts
              if (tier1Count > 0) {
                markdown += `\n**Top Activations:**\n`;
                const topHooks = hooks.filter((hook: any) => (hook.orb || 0) <= 1.0).slice(0, 3);
                topHooks.forEach((hook: any) => {
                  const planetA = hook.planet_a || hook.p1_name || '';
                  const planetB = hook.planet_b || hook.p2_name || '';
                  const aspect = hook.aspect || hook.type || '';
                  markdown += `- ${planetA} ↔ ${planetB}: ${generatePlainLanguageExplanation(planetA, planetB, aspect)}\n`;
                });
              }
            }

            // Integration factors (resonance fidelity approximation)
            if (wm.integration_factors) {
              const factors = wm.integration_factors;
              const resonanceKeys = ['harmonic_resonance', 'fertile_field', 'integration'];
              markdown += `**Resonance Factors:**\n`;
              resonanceKeys.forEach(key => {
                if (factors[key] !== undefined) {
                  markdown += `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${factors[key]}\n`;
                }
              });
            }
            markdown += `\n`;
          }

          // Notable patterns and special flags
          if (wm.vector_integrity || wm.context) {
            markdown += `### Notable Patterns\n\n`;

            // Vector integrity patterns
            if (wm.vector_integrity) {
              const latent = wm.vector_integrity.latent || [];
              const suppressed = wm.vector_integrity.suppressed || [];
              if (latent.length > 0 || suppressed.length > 0) {
                markdown += `**Vector Integrity:**\n`;
                if (latent.length > 0) markdown += `- Latent influences: ${latent.length}\n`;
                if (suppressed.length > 0) markdown += `- Suppressed influences: ${suppressed.length}\n`;
              }
            }

            // Sidereal drift detection
            if (wm.context?.sidereal_drift || wm.provenance?.zodiac_type === 'Sidereal') {
              markdown += `**Special Flags:**\n`;
              if (wm.context?.sidereal_drift) {
                markdown += `- Sidereal drift detected: ${wm.context.sidereal_drift}\n`;
              }
              if (wm.provenance?.zodiac_type === 'Sidereal') {
                markdown += `- Zodiac system: Sidereal\n`;
              }
            }

            markdown += `\n`;
          }

          // Date range and session notes for Mirror reports
          if (wm.context?.period || result?.sessionId) {
            markdown += `### Session Details\n\n`;

            if (wm.context?.period) {
              const period = wm.context.period;
              if (period.start && period.end) {
                // Format dates without timezone conversion for Mirror reports too
                const formatDateString = (dateStr: string) => {
                  const [year, month, day] = dateStr.split('-');
                  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
                };
                markdown += `**Date Range:** ${formatDateString(period.start)} - ${formatDateString(period.end)}\n`;

                // Calculate days between dates
                const startDate = new Date(period.start);
                const endDate = new Date(period.end);
                const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
                markdown += `**Total Days:** ${diffDays}\n`;
              }
              if (period.step) {
                markdown += `**Step:** ${period.step}\n`;
              }
            }

            if (result?.sessionId) {
              markdown += `**Session ID:** ${result.sessionId.slice(-8)}\n`;
            }

            // Report type and mode
            if (wm.type) {
              markdown += `**Report Mode:** ${wm.type}\n`;
            }

            markdown += `\n`;
          }

          // Rubric scores if available
          if (wm.integration_factors) {
            markdown += `### Quality Metrics\n\n`;
            const factors = wm.integration_factors;
            const rubricKeys = ['expansion_lift', 'combustion_clarity', 'liberation_release'];

            markdown += `**Rubric Scores:**\n`;
            rubricKeys.forEach(key => {
              if (factors[key] !== undefined) {
                markdown += `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${factors[key]}\n`;
              }
            });
            markdown += `\n`;
          }
        }
      }

      // Interpretation guide (condensed)
      markdown += `## Quick Reference\n\n`;

      if (reportType === 'balance') {
        markdown += `### Balance Meter Metrics\n\n`;
        markdown += `- **Magnitude (0-5):** Overall intensity of energetic patterns\n`;
        markdown += `- **Valence (-5 to +5):** Positive (expansion/opportunity) vs Negative (contraction/challenge)\n`;
        markdown += `- **Volatility (0-5):** Instability and unpredictability level\n`;
        // SFD deprecated and removed from exports

        markdown += `### Valence Scale\n\n`;
        markdown += `- **+5 Liberation:** Peak openness, breakthroughs\n`;
        markdown += `- **+4 Expansion:** Widening opportunities, growth\n`;
        markdown += `- **+3 Harmony:** Coherent progress, solutions\n`;
        markdown += `- **+2 Flow:** Smooth adaptability\n`;
        markdown += `- **+1 Lift:** Gentle tailwind, beginnings\n`;
        markdown += `- **0 Equilibrium:** Net-neutral, balanced\n`;
        markdown += `- **-1 Drag:** Subtle resistance, minor obstacles\n`;
        markdown += `- **-2 Contraction:** Narrowing options, energy drain\n`;
        markdown += `- **-3 Friction:** Conflicts, slow progress\n`;
        markdown += `- **-4 Grind:** Sustained resistance, heavy load\n`;
        markdown += `- **-5 Compression:** Maximum restrictive tilt, deep inward compression\n\n`;
      } else {
        // Mirror Report interpretation guide
        markdown += `### Mirror Report Components\n\n`;
        markdown += `- **Core Insights:** High-intensity patterns from tightest aspects that serve as recognition gateways\n`;
        markdown += `- **Polarity Cards:** Three-card field mapping using FIELD → MAP → VOICE progression\n`;
        markdown += `- **Integration Factors:** Quality metrics including harmonic resonance, fertile field, and integration scores\n`;
        markdown += `- **Vector Integrity:** Analysis of latent vs suppressed influences in the symbolic field\n`;
        markdown += `- **Drift Index:** Measures Actor (driver) vs Role (style) weighting balance\n\n`;

        markdown += `### SST Classification\n\n`;
        markdown += `- **WB (Works Beautifully):** Full resonance, 1.0 weight - feeds both Actor and Role\n`;
        markdown += `- **ABE (At Boundary Edge):** Partial/inverted/off-tone resonance, 0.5 weight\n`;
        markdown += `- **OSR (Outside Symbolic Range):** No resonance, 0 weight - valuable null data\n\n`;

        markdown += `### Pattern Strength Guide\n\n`;
        markdown += `- **Top Activations:** Very close connections (≤1° apart), highest impact\n`;
        markdown += `- **Minimum Significance:** 8+ threshold for meaningful patterns\n`;
        markdown += `- **Coverage Levels:** minimal | adequate | comprehensive | saturated\n\n`;
      }

      markdown += `## Usage Notes\n\n`;
      markdown += `This condensed summary is optimized for ChatGPT analysis (~29k tokens). `;
      markdown += `For complete data, use the JSON export. This system combines traditional astrological `;
      markdown += `principles with modern data analysis for timing and decision-making insights.\n\n`;
      markdown += `**Generated by:** Raven Calder • Woven Web Application\n`;
      markdown += `**Export Date:** ${exportDate.toISOString()}\n`;

      // Copy to clipboard instead of downloading
      try {
        await navigator.clipboard.writeText(markdown);
        setToast('Markdown summary copied to clipboard! Ready to paste into ChatGPT.');
        setTimeout(() => setToast(null), 3000);
      } catch (clipboardError) {
        // Fallback for mobile or restricted environments: open in a new tab
        const encodedContent = encodeURIComponent(markdown);
        const dataUri = `data:text/markdown;charset=utf-8,${encodedContent}`;
        const newTab = window.open(dataUri, '_blank');
        if (newTab) {
          newTab.document.title = `${friendlyFilename('directive')}.md`;
          setToast('Report is opening in a new tab for you to copy.');
        } else {
          setToast('Could not copy to clipboard or open a new tab.');
        }
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Markdown export failed:', error);
      setToast('Markdown export failed. Please try again.');
      setTimeout(() => setToast(null), 2500);
    }
  }

  // Generate a PDF specifically focused on Balance Meter graphs and charts
  // ARCHIVAL MODE: Native PDF generation (no html2canvas screenshot)
  async function downloadGraphsPDF() {
    if (!result || reportType !== 'balance') {
      setToast('Balance Meter charts not available');
      setTimeout(() => setToast(null), 2000);
      return;
    }

    setGraphsPdfGenerating(true);

    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

      const PAGE_WIDTH = 612; // 8.5" * 72 DPI
      const PAGE_HEIGHT = 792; // 11" * 72 DPI
      const MARGIN = 50;
      const PRINTABLE_WIDTH = PAGE_WIDTH - (2 * MARGIN); // 7.5" - Archival Mode spec

      const daily = frontStageTransitsByDate;
      const dates = Object.keys(daily)
        .filter((d) => d && d.match(/^\d{4}-\d{2}-\d{2}$/))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      const dateRangeText = dates.length > 0
        ? `${new Date(dates[0]).toLocaleDateString()} - ${new Date(dates[dates.length - 1]).toLocaleDateString()}`
        : 'Complete Analysis Report';

      const exportTimestamp = new Date();

      // ARCHIVAL MODE: Visual Overview Page with Dashboard Header
      const graphPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let visualY = PAGE_HEIGHT - MARGIN;

      // Title
      graphPage.drawText(sanitizeForPDF('Poetic Brain Reading Log - Visual Overview'), {
        x: MARGIN,
        y: visualY,
        size: 18,
        font: timesRomanFont,
        color: rgb(0, 0, 0), // Black ink for Archival Mode
      });
      visualY -= 30;

      graphPage.drawText(sanitizeForPDF(`Analysis Period: ${dateRangeText}`), {
        x: MARGIN,
        y: visualY,
        size: 12,
        font: timesRomanFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      visualY -= 50;

      // Dashboard Header: Two-Column Layout (60/40 split)
      const leftColumnWidth = PRINTABLE_WIDTH * 0.6;
      const rightColumnX = MARGIN + leftColumnWidth + 20;

      // Left Column: Seismograph Strip Header
      graphPage.drawText('SYMBOLIC SEISMOGRAPH', {
        x: MARGIN,
        y: visualY,
        size: 10,
        font: courierFont,
        color: rgb(0, 0, 0),
      });
      visualY -= 20;

      // Draw seismograph bar (simplified visual representation)
      if (dates.length > 0) {
        const barHeight = 40;
        const barY = visualY - barHeight;

        // Background bar
        graphPage.drawRectangle({
          x: MARGIN,
          y: barY,
          width: leftColumnWidth,
          height: barHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Draw magnitude line as simplified path
        const extractBias = (entry: any): number => {
          const seismo = entry?.seismograph;
          if (!seismo) return 0;
          if (typeof seismo.directional_bias === 'number') return seismo.directional_bias;
          if (typeof seismo.bias === 'number') return seismo.bias;
          if (typeof seismo.valence === 'number') return seismo.valence;
          return 0;
        };

        dates.slice(0, 20).forEach((date, i) => {
          const dayData = daily[date];
          const mag = Number(dayData?.seismograph?.magnitude ?? 0);
          const bias = extractBias(dayData);

          const x = MARGIN + (i / Math.min(20, dates.length)) * leftColumnWidth;
          const y = barY + (mag / 5) * barHeight;

          // Draw point
          graphPage.drawCircle({
            x,
            y,
            size: 2,
            color: bias > 0 ? rgb(1, 0.7, 0) : rgb(0, 0.2, 0.4), // Amber or Blue
          });
        });

        visualY = barY - 15;
      }

      // Right Column: Status Stamps
      let rightY = PAGE_HEIGHT - MARGIN - 60;

      graphPage.drawText('STATUS', {
        x: rightColumnX,
        y: rightY,
        size: 10,
        font: courierFont,
        color: rgb(0, 0, 0),
      });
      rightY -= 20;

      const startDate = dates[0] ? new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
      const endDate = dates[dates.length - 1] ? new Date(dates[dates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';

      graphPage.drawText(`START: ${startDate}`, {
        x: rightColumnX,
        y: rightY,
        size: 8,
        font: courierFont,
        color: rgb(0, 0, 0),
      });
      rightY -= 15;

      graphPage.drawText(`END: ${endDate}`, {
        x: rightColumnX,
        y: rightY,
        size: 8,
        font: courierFont,
        color: rgb(0, 0, 0),
      });
      rightY -= 15;

      // Location stamp (if available)
      const location = result?.provenance?.location ||
        result?.person_a?.details?.location?.label ||
        'Location not specified';
      graphPage.drawText(`LOC: ${sanitizeForPDF(location.substring(0, 20))}`, {
        x: rightColumnX,
        y: rightY,
        size: 8,
        font: courierFont,
        color: rgb(0, 0, 0),
      });
      rightY -= 20;

      // SST Status Stamp (WB = Within Bounds)
      graphPage.drawRectangle({
        x: rightColumnX,
        y: rightY - 12,
        width: 40,
        height: 16,
        borderColor: rgb(0, 0, 0),
        borderWidth: 2,
      });
      graphPage.drawText('WB', {
        x: rightColumnX + 10,
        y: rightY - 8,
        size: 10,
        font: courierFont,
        color: rgb(0, 0, 0),
      });

      visualY -= 30;

      // Field Summary
      if (dates.length > 0) {
        const extractBias = (entry: any): number => {
          const seismo = entry?.seismograph;
          if (!seismo) return 0;
          if (typeof seismo.directional_bias === 'number') return seismo.directional_bias;
          if (typeof seismo.bias === 'number') return seismo.bias;
          return 0;
        };

        const avgMag = dates.reduce((sum, d) => sum + Number(daily[d]?.seismograph?.magnitude ?? 0), 0) / dates.length;
        const avgBias = dates.reduce((sum, d) => sum + extractBias(daily[d]), 0) / dates.length;

        graphPage.drawText('FIELD SUMMARY', {
          x: MARGIN,
          y: visualY,
          size: 14,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        visualY -= 25;

        graphPage.drawText(`Average Magnitude: ${avgMag.toFixed(2)}`, {
          x: MARGIN,
          y: visualY,
          size: 10,
          font: courierFont,
          color: rgb(0, 0, 0),
        });
        visualY -= 15;

        graphPage.drawText(`Average Directional Bias: ${avgBias >= 0 ? '+' : ''}${avgBias.toFixed(2)}`, {
          x: MARGIN,
          y: visualY,
          size: 10,
          font: courierFont,
          color: rgb(0, 0, 0),
        });
        visualY -= 15;

        graphPage.drawText(`Days Analyzed: ${dates.length}`, {
          x: MARGIN,
          y: visualY,
          size: 10,
          font: courierFont,
          color: rgb(0, 0, 0),
        });
        visualY -= 30;
      }

      // Interpretive Note (VOICE channel - serif)
      const noteLines = [
        'This is a field report, not a forecast. The seismograph measures',
        'structural climate—the geometry of pressure and possibility—not',
        'predetermined outcomes. Use as one reference among many when',
        'orienting to lived patterns.'
      ];

      noteLines.forEach(line => {
        graphPage.drawText(line, {
          x: MARGIN,
          y: visualY,
          size: 10,
          font: timesRomanFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        visualY -= 14;
      });

      // Footer
      graphPage.drawText(sanitizeForPDF(`Generated: ${exportTimestamp.toLocaleString()} | Archival Mode v1.0`), {
        x: MARGIN,
        y: MARGIN - 20,
        size: 8,
        font: courierFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Add natal chart wheels if available
      if (chartAssets.length > 0) {
        for (const asset of chartAssets) {
          try {
            // Only include natal charts for the primary person
            if (asset.scope !== 'natal' || (asset.subject !== 'person_a' && asset.subject !== 'person_b')) {
              continue;
            }

            const response = await fetch(asset.url);
            if (!response.ok) continue;

            const imageBytes = await response.arrayBuffer();
            let chartImage;
            if (asset.format === 'png') {
              chartImage = await pdfDoc.embedPng(imageBytes);
            } else if (asset.format === 'jpg' || asset.format === 'jpeg') {
              chartImage = await pdfDoc.embedJpg(imageBytes);
            } else {
              continue;
            }

            const chartPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            let chartY = PAGE_HEIGHT - MARGIN;

            const subjectLabel = asset.subject === 'person_a' ?
              (personA.name || 'Person A') :
              (includePersonB ? (personB.name || 'Person B') : 'Person B');

            chartPage.drawText(sanitizeForPDF(`Natal Chart: ${subjectLabel}`), {
              x: MARGIN,
              y: chartY,
              size: 16,
              font: timesRomanFont,
              color: rgb(0.2, 0.2, 0.2),
            });
            chartY -= 35;

            const availableChartHeight = chartY - MARGIN - 30;
            const chartDimensions = chartImage.scaleToFit(PAGE_WIDTH - 2 * MARGIN, availableChartHeight);
            const chartImageY = chartY - chartDimensions.height;

            chartPage.drawImage(chartImage, {
              x: MARGIN + (PAGE_WIDTH - 2 * MARGIN - chartDimensions.width) / 2,
              y: chartImageY,
              width: chartDimensions.width,
              height: chartDimensions.height,
            });

            chartPage.drawText(sanitizeForPDF(`Generated: ${exportTimestamp.toLocaleString()} | Natal Chart Wheel`), {
              x: MARGIN,
              y: MARGIN - 20,
              size: 8,
              font: timesRomanFont,
              color: rgb(0.5, 0.5, 0.5),
            });
          } catch (error) {
            console.error('Failed to embed chart asset:', asset.id, error);
          }
        }
      }

      let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let yPosition = PAGE_HEIGHT - MARGIN;

      page.drawText(sanitizeForPDF('Poetic Brain Reading Log - Complete Analysis Report'), {
        x: MARGIN,
        y: yPosition,
        size: 18,
        font: timesRomanFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 30;

      page.drawText(sanitizeForPDF(dateRangeText), {
        x: MARGIN,
        y: yPosition,
        size: 12,
        font: timesRomanFont,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 40;

      page.drawText(sanitizeForPDF('EXECUTIVE SUMMARY'), {
        x: MARGIN,
        y: yPosition,
        size: 14,
        font: timesRomanFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      yPosition -= 25;
      const summaryText = [
        'This Poetic Brain Reading Log provides a comprehensive analysis of geometric patterns',
        'and trends over time, using astrological calculations mapped to a diagnostic framework.',
        'The data shows the interplay between Magnitude (0–5), Directional Bias (−5…+5),',
        'and Coherence (0–5, formerly Volatility) to map the structural climate of each day.',
        'These metrics are the Symbolic Weather / FIELD layer that Raven reads from.',
        'This is a field report, not a forecast.'
      ];

      summaryText.forEach(line => {
        page.drawText(sanitizeForPDF(line), {
          x: MARGIN,
          y: yPosition,
          size: 10,
          font: timesRomanFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        yPosition -= 16;
      });
      yPosition -= 20;

      if (dates.length === 0) {
        page.drawText(sanitizeForPDF('No chart data available for visualization.'), {
          x: MARGIN,
          y: yPosition,
          size: 12,
          font: timesRomanFont,
        });
      } else {
        const createTextChart = (values: number[], label: string, maxValue = 5) => {
          const chars = ['_', '.', '-', '=', '+', '|', '#', 'X'];
          const sparkline = values.slice(-20).map(val => {
            const normalized = Math.max(0, Math.min(1, val / maxValue));
            const index = Math.floor(normalized * (chars.length - 1));
            return chars[index] || chars[0];
          }).join('');

          return `${label.padEnd(12)} ${sparkline}`;
        };

        const extractBias = (entry: any): number => {
          const seismo = entry?.seismograph;
          if (!seismo) return 0;
          if (typeof seismo.directional_bias === 'number') return seismo.directional_bias;
          if (typeof seismo.bias === 'number') return seismo.bias;
          if (typeof seismo.valence === 'number') return seismo.valence;
          if (typeof seismo.valence_bounded === 'number') return seismo.valence_bounded;
          if (typeof seismo.directional_bias?.value === 'number') return seismo.directional_bias.value;
          return 0;
        };

        const series = dates.map(d => ({
          date: d,
          magnitude: Number(daily[d]?.seismograph?.magnitude ?? 0),
          bias: extractBias(daily[d]),
          volatility: Number(daily[d]?.seismograph?.volatility ?? 0)
        }));

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
        const biasesShifted = series.map(s => s.bias + 5);

        const charts = [
          createTextChart(magnitudes, 'Magnitude:', 5),
          createTextChart(volatilities, 'Coherence:', 5),
          createTextChart(biasesShifted, 'Dir. Bias:', 10)
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

        page.drawText(sanitizeForPDF('Symbolic Reading (Field Layer)'), {
          x: MARGIN,
          y: yPosition,
          size: 14,
          font: timesRomanFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        yPosition -= 30;

        dates.slice(-7).forEach(date => {
          const dayData = daily[date];
          const mag = Number(dayData?.seismograph?.magnitude ?? 0);
          const biasValue = extractBias(dayData);
          const vol = Number(dayData?.seismograph?.volatility ?? 0);

          const dateStr = new Date(date).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
          });

          if (yPosition < MARGIN + 100) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            yPosition = PAGE_HEIGHT - MARGIN;
          }

          const dayLine = `${dateStr}: Mag ${mag.toFixed(1)} | Bias ${biasValue >= 0 ? '+' : ''}${biasValue.toFixed(1)} | Coh ${vol.toFixed(1)}`;
          page.drawText(sanitizeForPDF(dayLine), {
            x: MARGIN,
            y: yPosition,
            size: 10,
            font: courierFont,
            color: rgb(0.1, 0.1, 0.1),
          });
          yPosition -= 18;
        });

        yPosition -= 20;

        const weeklySummary = (() => {
          const chunks: string[] = [];
          if (series.length === 0) return chunks;
          const chunkSize = Math.max(1, Math.floor(series.length / 4));
          for (let i = 0; i < series.length; i += chunkSize) {
            const segment = series.slice(i, i + chunkSize);
            if (segment.length === 0) continue;
            const peak = segment.reduce((max, current) => current.magnitude > max.magnitude ? current : max, segment[0]);
            const strongestBias = segment.reduce((chosen, current) => Math.abs(current.bias) > Math.abs(chosen.bias) ? current : chosen, segment[0]);
            const highVol = segment.reduce((max, current) => current.volatility > max.volatility ? current : max, segment[0]);
            chunks.push(`Segment ${Math.floor(i / chunkSize) + 1}: peak magnitude ${peak.magnitude.toFixed(1)}, strongest bias ${strongestBias.bias.toFixed(1)}, coherence divergence ${highVol.volatility.toFixed(1)}`);
          }
          return chunks;
        })();

        if (weeklySummary.length > 0) {
          page.drawText(sanitizeForPDF('Window Summary Highlights'), {
            x: MARGIN,
            y: yPosition,
            size: 14,
            font: timesRomanFont,
            color: rgb(0.3, 0.3, 0.3),
          });
          yPosition -= 25;

          weeklySummary.forEach((summary) => {
            if (yPosition < MARGIN + 60) {
              page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
              yPosition = PAGE_HEIGHT - MARGIN;
            }

            page.drawText(sanitizeForPDF(`• ${summary}`), {
              x: MARGIN,
              y: yPosition,
              size: 10,
              font: timesRomanFont,
              color: rgb(0.3, 0.3, 0.3),
            });
            yPosition -= 16;
          });

          yPosition -= 20;
        }

        if (yPosition < MARGIN + 120) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          yPosition = PAGE_HEIGHT - MARGIN;
        }

        page.drawText(sanitizeForPDF('Key Interpretation Guide'), {
          x: MARGIN,
          y: yPosition,
          size: 14,
          font: timesRomanFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        yPosition -= 25;

        const magnitudeLevels = [
          { level: 5, description: 'Breakpoint — full system engagement, maximum vector density.' },
          { level: 4, description: 'High charge — concentrated field, elevated load.' },
          { level: 3, description: 'Sustained drive — stable momentum, persistent activation.' },
          { level: 2, description: 'Moderate charge — manageable load, incremental motion.' },
          { level: 1, description: 'Gentle signal — minimal activation, background hum.' },
          { level: 0, description: 'Baseline — quiescent field, no detectable drive.' },
        ];

        magnitudeLevels.forEach(level => {
          if (yPosition < MARGIN + 40) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            yPosition = PAGE_HEIGHT - MARGIN;
          }

          const levelLine = `${level.level.toString().padStart(2)}  ${level.description}`;
          page.drawText(sanitizeForPDF(levelLine), {
            x: MARGIN,
            y: yPosition,
            size: 9,
            font: courierFont,
            color: rgb(0.2, 0.2, 0.2),
          });
          yPosition -= 16;
        });

        yPosition -= 15;

        const valenceLevels = [
          { level: 5, anchor: 'Liberation', description: 'Peak expansive tilt, unrestricted field, maximum openness.' },
          { level: 4, anchor: 'Expansion', description: 'Widening vectors, accelerated outward motion, reinforcing angles.' },
          { level: 3, anchor: 'Stable Flow', description: 'Coherent outward bias, aligned geometry, smooth momentum.' },
          { level: 2, anchor: 'Mild Expansion', description: 'Gentle outward tilt, incremental widening, favorable drift.' },
          { level: 1, anchor: 'Slight Lift', description: 'Minimal outward bias, barely detectable assist.' },
          { level: 0, anchor: 'Equilibrium', description: 'Net-neutral tilt; forces cancel or balance.' },
          { level: -1, anchor: 'Slight Drag', description: 'Minimal inward bias, subtle resistance gradient.' },
          { level: -2, anchor: 'Mild Contraction', description: 'Narrowing field, incremental restriction, tightening geometry.' },
          { level: -3, anchor: 'Friction', description: 'Cross-pressure, conflicting vectors, impeded momentum.' },
          { level: -4, anchor: 'Sustained Restriction', description: 'Heavy inward tilt, persistent load, grinding angles.' },
          { level: -5, anchor: 'Compression', description: 'Maximum restrictive tilt, collapsed field, critical density.' },
        ];

        valenceLevels.forEach(level => {
          if (yPosition < MARGIN + 40) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            yPosition = PAGE_HEIGHT - MARGIN;
          }

          const levelStr = level.level >= 0 ? `+${level.level}` : level.level.toString();
          const levelLine = `${levelStr.padStart(3)} ${level.anchor.padEnd(12)} ${level.description}`;

          page.drawText(sanitizeForPDF(levelLine), {
            x: MARGIN,
            y: yPosition,
            size: 9,
            font: courierFont,
            color: level.level === 0 ? rgb(0.3, 0.3, 0.7) : (level.level > 0 ? rgb(0.2, 0.6, 0.2) : rgb(0.6, 0.2, 0.2)),
          });
          yPosition -= 16;
        });

        yPosition -= 20;

        if (yPosition < MARGIN + 150) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          yPosition = PAGE_HEIGHT - MARGIN;
        }

        page.drawText(sanitizeForPDF('DIAGNOSTIC FRAMEWORK'), {
          x: MARGIN,
          y: yPosition,
          size: 14,
          font: timesRomanFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        yPosition -= 25;

        const practicalContent = [
          'FIELD LAYER — Geometry and Raw Data',
          'Planetary positions, aspects, and house placements. No interpretation; just',
          'coordinates. Orbs and degrees define the geometric skeleton.',
          '',
          'MAP LAYER — Transformations',
          'Scale: Raw aspect scores × 50. Clamp: Cap at [0,500] for Magnitude/Coherence,',
          '[-500,+500] for Directional Bias. Round: Nearest 0.1. Invert: Trine/sextile = +,',
          'square/opposition = −. This converts geometry into diagnostic axes.',
          '',
          'VOICE LAYER — Symbolic Translation',
          'Magnitude (0–5): Energy density. Directional Bias (−5…+5): Expansive vs. restrictive',
          'tilt. Coherence (0–5): Field stability (formerly Volatility).',
          'These axes map lived patterns, not outcomes.',
          '',
          'PROVENANCE LAYER — Metadata and Null Handling',
          'Missing data registers as NULL, not zero. Suppression thresholds prevent noise.',
          'Timestamps and source attribution track lineage. This layer ensures traceability.',
          '',
          'INTERPRETIVE AFFORDANCES',
          'High Magnitude + expansive Bias: Field shows widening vectors and reinforcing angles.',
          'High Magnitude + restrictive Bias: Field shows compression and cross-pressure.',
          'Low Coherence (3+): Dispersed geometry; maintaining flexibility stabilizes navigation.',
          '',
          'Note: This system maps astrological geometry to diagnostic coordinates. It registers',
          'structural climate, not fixed outcomes. Use as one reference among many when',
          'orienting to lived patterns and making falsifiable reflections.'
        ];

        practicalContent.forEach(line => {
          if (yPosition < MARGIN + 40) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            yPosition = PAGE_HEIGHT - MARGIN;
          }

          page.drawText(sanitizeForPDF(line), {
            x: MARGIN,
            y: yPosition,
            size: 9,
            font: timesRomanFont,
            color: rgb(0.4, 0.4, 0.4),
          });
          yPosition -= 13;
        });
      }
      const footerText = `Generated: ${exportTimestamp.toLocaleString()} | Poetic Brain Reading Log Charts`;
      page.drawText(sanitizeForPDF(footerText), {
        x: MARGIN,
        y: MARGIN - 20,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${friendlyFilename('symbolic-weather')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast('✅ Archival Mode PDF downloaded successfully');
      setTimeout(() => setToast(null), 2500);
    } catch (error) {
      console.error('PDF generation failed:', error);
      setToast('Failed to generate charts PDF');
      setTimeout(() => setToast(null), 2500);
    } finally {
      setGraphsPdfGenerating(false);
    }
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
      data?.balance_meter?.channel_summary_canonical ||
      data?.balance_meter?.channel_summary ||
      data?.person_a?.derived?.seismograph_summary_canonical ||
      data?.person_a?.derived?.seismograph_summary ||
      data?.summary?.balance_meter ||
      null;

    const magnitude = toNumber(
      (summarySource?.axes?.magnitude ?? summarySource?.magnitude) ??
      summarySource?.magnitude_value,
    );
    const valence = toNumber(
      (summarySource?.axes?.directional_bias ??
        summarySource?.directional_bias ??
        summarySource?.bias_signed) ??
      summarySource?.valence_bounded ??
      summarySource?.valence ??
      summarySource?.valence_mean,
    );
    const volatilityDirect = toNumber(
      (summarySource?.axes?.volatility ?? summarySource?.volatility) ?? undefined,
    );
    const coherenceForVol = toNumber(
      (summarySource?.axes?.coherence ?? summarySource?.coherence) ??
      summarySource?.coherence_value,
    );
    const volatility = typeof volatilityDirect === 'number'
      ? volatilityDirect
      : (typeof coherenceForVol === 'number' ? Math.max(0, Math.min(5, 5 - coherenceForVol)) : undefined);
    const hasSummary =
      summarySource &&
      [magnitude, valence, volatility].some((value) => typeof value === 'number');

    const hasDailySeries = Boolean(
      data?.person_a?.chart?.transitsByDate &&
      Object.keys(data.person_a.chart.transitsByDate || {}).length > 0,
    );

    const summaryForResume = hasSummary && hasDailySeries
      ? {
        magnitude: typeof magnitude === 'number' ? magnitude : 0,
        valence: typeof valence === 'number' ? valence : 0,
        volatility: typeof volatility === 'number' ? volatility : undefined,
        magnitudeLabel:
          summarySource?.labels?.magnitude ??
          summarySource?.magnitude_label ??
          (typeof magnitude === 'number'
            ? magnitude >= 3
              ? 'Surge'
              : magnitude >= 1
                ? 'Active'
                : 'Calm'
            : undefined),
        valenceLabel:
          summarySource?.labels?.directional_bias ??
          summarySource?.valence_label ??
          summarySource?.bias_label ??
          (typeof valence === 'number'
            ? valence > 0.5
              ? 'Supportive'
              : valence < -0.5
                ? 'Challenging'
                : 'Mixed'
            : undefined),
        volatilityLabel:
          summarySource?.labels?.volatility ??
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
            nation: personA.nation || "US",
          },
          ...(includePersonB
            ? {
              personB: {
                name: personB.name,
                timezone: personB.timezone,
                city: personB.city,
                state: personB.state,
                nation: personB.nation || "US",
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
      setSavedSession(sessionPayload);
      setShowSessionResumePrompt(true);
    } catch (error) {
      console.error('Failed to persist Math Brain session resume data', error);
    }

    try {
      const lastPayload = {
        savedAt: new Date().toISOString(),
        from: 'math-brain',
        reportType,
        mode,
        includeTransits,
        window:
          includeTransits && startDate && endDate ? { start: startDate, end: endDate, step } : undefined,
        subjects: {
          personA: {
            name: personA.name?.trim() || undefined,
            timezone: personA.timezone || undefined,
            city: personA.city || undefined,
            state: personA.state || undefined,
          },
          personB:
            includePersonB && personB
              ? {
                name: personB.name?.trim() || undefined,
                timezone: personB.timezone || undefined,
                city: personB.city || undefined,
                state: personB.state || undefined,
              }
              : undefined,
        },
        // Relationship context for Poetic Brain
        relationship: includePersonB ? {
          type: relationshipType,
          intimacy_tier: relationshipType === 'PARTNER' ? relationshipTier || undefined : undefined,
          role: relationshipType !== 'PARTNER' ? relationshipRole || undefined : undefined,
          contact_state: contactState,
          ex_estranged: relationshipType === 'FRIEND' ? undefined : exEstranged,
          notes: relationshipNotes || undefined,
        } : undefined,
        // Relocation/translocation context for Poetic Brain
        translocation: relocationStatus.effectiveMode !== 'NONE' ? {
          mode: relocationStatus.effectiveMode,
          label: relocLabel || undefined,
          coordinates: relocCoords || undefined,
          timezone: relocTz || undefined,
        } : undefined,
        payload: data,
      };

      persistTrimmedLastPayload(lastPayload);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to persist Math Brain payload for Poetic Brain reuse', error);
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
        relationship: {
          type: relationshipType,
          intimacy_tier: relationshipType === 'PARTNER' ? relationshipTier || undefined : undefined,
          role: relationshipType !== 'PARTNER' ? relationshipRole || undefined : undefined,
          contact_state: contactState,
          ex_estranged: relationshipType === 'FRIEND' ? undefined : exEstranged,
          notes: relationshipNotes || undefined,
        },
      };
      if (hasSummary) {
        meta.summary = {
          ...(typeof magnitude === 'number' ? { magnitude } : {}),
          ...(typeof valence === 'number' ? { valence } : {}),
          ...(typeof volatility === 'number' ? { volatility } : {}),
          ...(summarySource?.labels?.magnitude
            ? { magnitudeLabel: summarySource.labels.magnitude }
            : summarySource?.magnitude_label
              ? { magnitudeLabel: summarySource.magnitude_label }
              : {}),
          ...(summarySource?.labels?.directional_bias
            ? { valenceLabel: summarySource.labels.directional_bias }
            : summarySource?.valence_label
              ? { valenceLabel: summarySource.valence_label }
              : summarySource?.bias_label
                ? { valenceLabel: summarySource.bias_label }
                : {}),
          ...(summarySource?.labels?.volatility
            ? { volatilityLabel: summarySource.labels.volatility }
            : summarySource?.volatility_label
              ? { volatilityLabel: summarySource.volatility_label }
              : {}),
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
        reportStructure, // ADDED: Save report type (solo/synastry/composite)
        // reportFormat removed - always conversational
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
      // Sanitize names for filename safety
      function sanitizeName(name: string) {
        return (name || 'Unknown').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
      }
      let filename = '';
      if (which === 'A_ONLY') {
        filename = `math_brain_setup_A_${stamp}.json`;
      } else if (which === 'A_B') {
        const nameA = sanitizeName(personA?.name);
        const nameB = sanitizeName(personB?.name);
        filename = `math_brain_setup_${nameA}_${nameB}_${stamp}.json`;
      } else {
        filename = `math_brain_setup_${stamp}.json`;
      }

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
            try { setToast('Saved setup JSON'); setTimeout(() => setToast(null), 1800); } catch {/* noop */ }
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
        try { document.body.removeChild(a); } catch {/* noop */ }
        try { URL.revokeObjectURL(url); } catch {/* noop */ }
        setToast('Setup JSON downloaded');
        setTimeout(() => setToast(null), 1800);
      }, 150);
    } catch (err) {
      console.error('Save setup failed:', err);
      try {
        // Last-resort clipboard fallback to ensure action does something
        navigator?.clipboard?.writeText?.(JSON.stringify({
          mode, step, startDate, endDate, includePersonB, translocation, personA, personB
        }, null, 2)).then(() => {
          setToast('Saved to clipboard (download blocked)');
          setTimeout(() => setToast(null), 2200);
        }).catch(() => {
          setToast('Save setup failed');
          setTimeout(() => setToast(null), 2200);
        });
      } catch {/* noop */ }
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
        const [yy, mm, dd] = String(pA.date || '').split('-').map((x: string) => Number(x));
        const [hh, min] = String(pA.time || '').split(':').map((x: string) => Number(x));
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

        const relationshipImport = data.relationship_context || data.relationship;
        if (relationshipImport) {
          const rc = relationshipImport;
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
        if (data.mode) applyMode(normalizeReportMode(data.mode));
        if (data.step) setStep(data.step);
        if (data.startDate) {
          setStartDate(data.startDate);
          setUserHasSetDates(true);
        }
        if (data.endDate) {
          setEndDate(data.endDate);
          setUserHasSetDates(true);
        }
        // ADDED: Load report structure (solo/synastry/composite)
        if (typeof data.reportStructure === 'string' && ['solo', 'synastry', 'composite'].includes(data.reportStructure)) {
          setReportStructure(data.reportStructure as ReportStructure);
        }
        // ADDED: Load report format preference
        // reportFormat removed - always conversational
        if (typeof data.exEstranged === 'boolean') setExEstranged(data.exEstranged);
        if (typeof data.relationshipNotes === 'string') setRelationshipNotes(data.relationshipNotes);
        if (typeof data.relationshipTier === 'string') setRelationshipTier(data.relationshipTier);
        if (typeof data.relationshipRole === 'string') setRelationshipRole(data.relationshipRole);
        if (data.relationship && !data.relationship_context) {
          const rc = data.relationship;
          if (rc.type) setRelationshipType(String(rc.type).toUpperCase());
          if (rc.intimacy_tier) setRelationshipTier(String(rc.intimacy_tier));
          if (rc.role) setRelationshipRole(rc.role);
          if (rc.contact_state) setContactState(String(rc.contact_state).toUpperCase() === 'LATENT' ? 'LATENT' : 'ACTIVE');
          if (typeof rc.notes === 'string') setRelationshipNotes(rc.notes);
        }

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
    } catch {/* noop */ }
    // Reset input to allow re-upload same file
    if (e.currentTarget) e.currentTarget.value = '';
  }

  const handleResumePrompt = useCallback(() => {
    if (!savedSession) {
      setToast('No saved session found yet. Run a report to create one.');
      setTimeout(() => setToast(null), 2500);
      return;
    }
    setShowSessionResumePrompt(true);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame?.(() => {
        const el = document.getElementById('mb-resume-card');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [savedSession, setShowSessionResumePrompt, setToast]);

  const loadSavedSession = () => {
    if (!savedSession?.inputs) return;

    const { inputs } = savedSession;
    try {
      if (inputs.mode) applyMode(normalizeReportMode(inputs.mode));
      if (inputs.step) setStep(inputs.step);
      if (inputs.startDate) setStartDate(inputs.startDate);
      if (inputs.endDate) setEndDate(inputs.endDate);
      if (typeof inputs.includePersonB === 'boolean') setIncludePersonB(inputs.includePersonB);
      if (inputs.translocation) setTranslocation(normalizeTranslocationOption(inputs.translocation));
      // ADDED: Restore report structure from session
      if (typeof inputs.reportStructure === 'string' && ['solo', 'synastry', 'composite'].includes(inputs.reportStructure)) {
        setReportStructure(inputs.reportStructure as ReportStructure);
      }
      // ADDED: Restore report format from session
      // reportFormat removed - always conversational

      if (inputs.relationship) {
        const rel = inputs.relationship;
        if (rel.type) setRelationshipType(rel.type);
        if (rel.intimacy_tier) setRelationshipTier(rel.intimacy_tier);
        if (rel.role) setRelationshipRole(rel.role);
        if (typeof rel.ex_estranged === 'boolean') setExEstranged(rel.ex_estranged);
        if (typeof rel.notes === 'string') setRelationshipNotes(rel.notes);
        if (rel.contact_state) setContactState(rel.contact_state);
      }

      // Note: We don't restore full person data because session only saves partial data
      // Users will need to re-enter birth details
      setShowSessionResumePrompt(false);
      setToast('Session settings restored! Please verify person details.');
    } catch (e) {
      setToast('Failed to restore session: ' + String(e));
    }
  };

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
    const requireCoords = includeTransits;
    const numbers = [
      toFiniteNumber(personA.year),
      toFiniteNumber(personA.month),
      toFiniteNumber(personA.day),
      ...(allowUnknownA ? [] as number[] : [toFiniteNumber(personA.hour), toFiniteNumber(personA.minute)]),
      ...(requireCoords ? [toFiniteNumber(personA.latitude), toFiniteNumber(personA.longitude)] : [])
    ];
    const allPresent = required.every(Boolean) && numbers.every((n) => !Number.isNaN(n)) && aCoordsValid;

    const isRelational = RELATIONAL_MODES.includes(mode);
    if (!isRelational) {
      // Natal-only runs (no transits) do not require a date window
      if (!includeTransits) return allPresent;
      return allPresent && Boolean(startDate) && Boolean(endDate);
    }

    // For relational modes, Person B must be included and minimally valid
    if (!includePersonB) return false;
    const bRequired = [personB.name, personB.city, personB.state, personB.timezone, personB.zodiac_type];
    const allowUnknownB = timeUnknownB && timePolicy !== 'user_provided';
    const bNums = [
      toFiniteNumber(personB.year), toFiniteNumber(personB.month), toFiniteNumber(personB.day),
      ...(allowUnknownB ? [] as number[] : [toFiniteNumber(personB.hour), toFiniteNumber(personB.minute)]),
      toFiniteNumber(personB.latitude), toFiniteNumber(personB.longitude)
    ];
    const bOk = bRequired.every(Boolean) && bNums.every((n) => !Number.isNaN(n)) && bCoordsValid;

    // Relationship context soft validation (backend will enforce precisely)
    let relOk = true;
    if (relationshipType === 'PARTNER') relOk = !!relationshipTier;
    if (relationshipType === 'FAMILY') relOk = !!relationshipRole;

    return allPresent && bOk && relOk && Boolean(startDate) && Boolean(endDate);
  }, [personA, personB, includePersonB, relationshipType, relationshipTier, relationshipRole, mode, startDate, endDate, aCoordsValid, bCoordsValid, timeUnknown, timeUnknownB, timePolicy, includeTransits]);
  const submitDisabled = useMemo(() => {
    if (!PROVIDER_BYPASS && providerCheckPending) return true;
    if (!PROVIDER_BYPASS && !providerHealth.astrology.ready) return true;
    // Additional relocation/report gate
    const locGate = needsLocation(reportType, includeTransits, personA);
    if (includeTransits && !locGate.hasLoc) return true;
    if (!canSubmit || loading) return true;
    return false;
  }, [canSubmit, loading, personA, reportType, includeTransits, providerCheckPending, providerHealth.astrology.ready]);

  // Debug panel toggle (append ?debug=1 to the URL to enable)
  const [debugMode, setDebugMode] = useState(false);

  const debugInfo = useMemo(() => ({
    reportType,
    needsLocation: needsLocation(reportType, includeTransits, personA),
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
  }), [reportType, includeTransits, canSubmit, submitDisabled, aCoordsValid, bCoordsValid, includePersonB, timeUnknown, timeUnknownB, timePolicy, contactState, personA]);

  // Helper: Split date range into chunks to avoid API timeouts
  function splitDateRangeIntoChunks(start: string, end: string, maxDaysPerChunk: number = 6): Array<{ start: string, end: string }> {
    const chunks: Array<{ start: string, end: string }> = [];
    // Force UTC to avoid timezone shifts when calculating chunks
    const startDate = new Date(start.includes('T') ? start : `${start}T00:00:00Z`);
    const endDate = new Date(end.includes('T') ? end : `${end}T00:00:00Z`);

    let currentStart = new Date(startDate);
    while (currentStart <= endDate) {
      const currentEnd = new Date(currentStart);
      currentEnd.setUTCDate(currentEnd.getUTCDate() + maxDaysPerChunk - 1);

      if (currentEnd > endDate) {
        chunks.push({
          start: currentStart.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        });
        break;
      } else {
        chunks.push({
          start: currentStart.toISOString().split('T')[0],
          end: currentEnd.toISOString().split('T')[0]
        });
        // Advance to next day
        currentStart.setUTCDate(currentEnd.getUTCDate() + 1);
      }
    }

    return chunks;
  }

  // Helper: Merge multiple Math Brain results into one
  function mergeChunkedResults(results: Array<any>): any {
    if (results.length === 0) return null;
    if (results.length === 1) return results[0];

    // Deep copy first result as base
    const merged = JSON.parse(JSON.stringify(results[0]));

    // Merge unified_output.daily_entries
    if (merged.unified_output?.daily_entries) {
      const allEntries = results.flatMap(r => r.unified_output?.daily_entries || []);
      merged.unified_output.daily_entries = allEntries;

      // Update date_range in metadata
      if (allEntries.length > 0) {
        const dates = allEntries.map((e: any) => e.date).sort();
        merged.unified_output.run_metadata.date_range = [dates[0], dates[dates.length - 1]];
      }
    }

    // Merge markdown_reading (concatenate with separators)
    if (merged.markdown_reading) {
      merged.markdown_reading = results.map(r => r.markdown_reading).filter(Boolean).join('\n\n---\n\n');
    }

    // Merge transitsByDate for Person A
    if (merged.person_a?.chart?.transitsByDate) {
      const allTransitsA = results.reduce((acc, r) => ({
        ...acc,
        ...(r.person_a?.chart?.transitsByDate || {})
      }), {});
      merged.person_a.chart.transitsByDate = allTransitsA;
    }

    // Merge transitsByDate for Person B
    if (merged.person_b?.chart?.transitsByDate) {
      const allTransitsB = results.reduce((acc, r) => ({
        ...acc,
        ...(r.person_b?.chart?.transitsByDate || {})
      }), {});
      merged.person_b.chart.transitsByDate = allTransitsB;
    }

    return merged;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Frontend relocation gate for Balance Meter
    const locGate = needsLocation(reportType, includeTransits, personA);
    if (includeTransits && !locGate.hasLoc) {
      setToast('Transits need current location to place houses correctly. Add a location or switch to natal-only mode.');
      setTimeout(() => setToast(null), 2500);
      return;
    }
    if (providerCheckPending) {
      setToast('Checking provider readiness…');
      setTimeout(() => setToast(null), 2500);
      return;
    }
    if (!providerHealth.astrology.ready) {
      const outageMessage = providerHealth.astrology.message || 'Math Brain is currently unavailable.';
      setError(outageMessage);
      setToast(outageMessage);
      setTimeout(() => setToast(null), 3500);
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
      // Check if we need to chunk the request
      const needsChunking = includeTransits && startDate && endDate;
      const daysDiff = needsChunking ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
      const chunks = (needsChunking && daysDiff > 6) ? splitDateRangeIntoChunks(startDate, endDate, 6) : null;

      if (chunks && chunks.length > 1) {
        setToast(`Processing ${daysDiff} days in ${chunks.length} chunks...`);
      }
      // Build unified request payload
      const payload: Record<string, any> = {
        mode,
        personA: {
          ...personA,
          nation: personA.nation || "US",
          year: Number(personA.year),
          month: Number(personA.month),
          day: Number(personA.day),
          hour: Number(personA.hour),
          minute: Number(personA.minute),
          latitude: Number(personA.latitude),
          longitude: Number(personA.longitude),
        },
        time_policy: timeUnknown ? timePolicy : 'user_provided',
        report_type: reportContractType,
        presentation_style: 'conversational',
        context: {
          mode: determineContextMode(mode, reportContractType),
        },
        wheel_only: false,
        wheel_format: 'png',
        theme: 'classic',
      };

      // Add transit window if requested
      if (includeTransits && startDate && endDate) {
        payload.window = { start: startDate, end: endDate, step };
        payload.transits = { from: startDate, to: endDate, step };
        payload.transitStartDate = startDate;
        payload.transitEndDate = endDate;
        payload.transitStep = step;
        payload.translocation = ((): any => {
          const relocationMode = relocationStatus.effectiveMode;
          if (relocationMode === 'NONE' || relocationMode === 'A_NATAL' || relocationMode === 'B_NATAL') {
            return { applies: false, method: 'Natal' };
          }
          const methodMap: Record<TranslocationOption, string> = {
            NONE: 'Natal', A_NATAL: 'Natal', A_LOCAL: 'A_local',
            B_NATAL: 'Natal', B_LOCAL: 'B_local', BOTH_LOCAL: 'Both_local',
            MIDPOINT: 'Midpoint',
          };
          return {
            applies: true,
            method: methodMap[relocationMode] || 'Custom',
            coords: relocCoords ? { latitude: relocCoords.lat, longitude: relocCoords.lon } : undefined,
            label: relocLabel || undefined,
            timezone: relocTz || undefined,
          };
        })();
      } else {
        payload.translocation = { applies: false, method: 'Natal' };
      }

      // Add Person B and relationship context for relational modes
      if (RELATIONAL_MODES.includes(mode) && includePersonB) {
        payload.personB = {
          ...personB,
          nation: personB.nation || "US",
          year: Number(personB.year),
          month: Number(personB.month),
          day: Number(personB.day),
          hour: Number(personB.hour),
          minute: Number(personB.minute),
          latitude: Number(personB.latitude),
          longitude: Number(personB.longitude),
        };
        payload.relationship_context = {
          type: relationshipType,
          intimacy_tier: relationshipType === 'PARTNER' ? relationshipTier : undefined,
          role: relationshipType !== 'PARTNER' ? relationshipRole : undefined,
          contact_state: contactState,
          ex_estranged: relationshipType === 'FRIEND' ? undefined : exEstranged,
          notes: relationshipNotes || undefined,
        };
      }

      // Send request(s) - chunked if needed
      let finalData: any;

      if (chunks && chunks.length > 1) {
        // Chunked mode: process each chunk sequentially
        const results: any[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          setToast(`Processing chunk ${i + 1} of ${chunks.length} (${chunk.start} to ${chunk.end})...`);

          const chunkPayload = {
            ...payload,
            window: { start: chunk.start, end: chunk.end, step },
            transits: { from: chunk.start, to: chunk.end, step },
            transitStartDate: chunk.start,
            transitEndDate: chunk.end,
          };

          const response = await fetch("/api/astrology-mathbrain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chunkPayload),
          });

          const parsed = await parseJsonSafely<Record<string, any>>(response);
          const chunkData = parsed.data;

          if (!response.ok || parsed.parseError || !isRecord(chunkData) || chunkData.success === false) {
            const errorDetail = chunkData?.error || parsed.parseError?.message || `Request failed with status ${response.status}`;
            setToast(`Chunk ${i + 1} failed: ${errorDetail}`);
            setTimeout(() => setToast(null), 2500);
            throw new Error(errorDetail);
          }

          results.push(chunkData);
        }

        // Merge all chunks
        setToast('Merging results...');
        finalData = mergeChunkedResults(results);
      } else {
        // Single request mode (no chunking needed)
        setToast(includeTransits ? 'Generating report with transits...' : 'Generating report...');
        let response;
        try {
          response = await fetch("/api/astrology-mathbrain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (networkError) {
          console.error('Network error during API request:', networkError);
          const errorMessage = networkError instanceof Error ? networkError.message : String(networkError);
          setError(`Network error: ${errorMessage}`);
          setToast('Failed to connect to the server. Please check your connection.');
          setTimeout(() => setToast(null), 2500);
          setLoading(false);
          return;
        }

        let parsed;
        try {
          parsed = await parseJsonSafely<Record<string, any>>(response);
          finalData = parsed.data;
        } catch (parseError) {
          console.error('Error parsing API response:', parseError);
          const parseMessage = parseError instanceof Error ? parseError.message : String(parseError);
          setError(`Invalid response from server: ${parseMessage}`);
          setToast('Failed to process server response.');
          setTimeout(() => setToast(null), 2500);
          setLoading(false);
          return;
        }

        if (!response.ok || parsed.parseError || !isRecord(finalData) || finalData.success === false) {
          const errorDetail = finalData?.error ||
            parsed.parseError?.message ||
            response.statusText ||
            `Request failed with status ${response.status}`;
          console.error('API Error:', {
            status: response.status,
            error: finalData?.error,
            parseError: parsed.parseError,
            response: finalData
          });
          setError(`Report generation failed: ${errorDetail}`);
          setToast('Report generation failed. See error for details.');
          setTimeout(() => setToast(null), 2500);
          throw new Error(errorDetail);
        }
      }

      // Persist last inputs for resume (conditional)
      try {
        if (saveForNextSession) {
          const inputs = {
            mode,
            step,
            startDate,
            endDate,
            includePersonB,
            includeTransits,
            reportStructure,
            translocation: relocationStatus.effectiveMode,
            relationshipType,
            relationshipTier,
            relationshipRole,
            contactState,
            exEstranged,
            relationshipNotes,
            personA,
            personB,
            aCoordsInput,
            bCoordsInput,
            relocInput,
            relocLabel,
            relocTz,
            relocCoords,
            timePolicy,
            saveForNextSession,
          };
          window.localStorage.setItem('mb.lastInputs', JSON.stringify(inputs));
          setHasSavedInputs(true);
        }
      } catch {/* ignore */ }

      // Store result
      setResult(finalData);
      setLayerVisibility({ ...DEFAULT_LAYER_VISIBILITY });
      persistSessionArtifacts(finalData);
      setToast(includeTransits ? 'Report with transits complete!' : 'Report complete!');

      // Telemetry (dev only)
      if (process.env.NODE_ENV !== 'production') {
        const t1 = typeof performance !== 'undefined' ? performance.now() : 0;
        // eslint-disable-next-line no-console
        console.info('[MB] Completed in', Math.round(t1 - t0), 'ms');
      }
    } catch (err: any) {
      setToast('Report preparation failed.');
      setTimeout(() => setToast(null), 2500);
      setError(err?.message || "Unexpected error");
      if (process.env.NODE_ENV !== 'production') {
        console.error('[MB] Submit error:', err);
      }
    } finally {
      setLoading(false);
    }
  }

  // Duplicate download functions removed - using downloadResultJSON and downloadResultPDF instead

  return (
    <main className="relative mx-auto max-w-6xl px-6 py-12">
      {/* Subtle background image - The Silent Architect */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.08]"
        style={{
          backgroundImage: 'url(/art/math-brain.png)',
          backgroundSize: 'contain',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          mixBlendMode: 'lighten'
        }}
      />

      {/* Content layer */}
      <div className="relative z-10">
        {/* Auth handled globally by HomeHero - Math Brain works independently */}

        <header className="text-center print:hidden">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-100">Math Brain</h1>
          <p className="mt-2 text-sm text-slate-400 font-medium tracking-wide uppercase">The Silent Architect</p>
          <p className="mt-4 text-base md:text-lg text-slate-300">
            Calculate precise astrological geometry, then synthesize meaning in Poetic Brain.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleNavigateToPoetic}
              disabled={!canVisitPoetic}
              aria-disabled={!canVisitPoetic}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition ${canVisitPoetic
                ? 'bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'
                : 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-400'
                }`}
            >
              Enter Poetic Brain
            </button>
            <p className={`text-xs ${canVisitPoetic ? 'text-slate-400' : 'text-amber-300'}`}>
              {canVisitPoetic
                ? "Explore Raven's narrative space even without generating a Math Brain report first."
                : 'Poetic Brain is offline - check provider status below.'}
            </p>
          </div>

          {/* Resume from Past Session Prompt */}
          {showSessionResumePrompt && savedSession && (
            <div
              id="mb-resume-card"
              className="mt-6 mx-auto max-w-2xl rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-medium text-indigo-200">Resume from past session?</h3>
                  <p className="mt-1 text-xs text-slate-300">
                    Last session: {savedSession.createdAt ? new Date(savedSession.createdAt).toLocaleString() : 'Unknown date'}
                    {savedSession.summary && typeof savedSession.summary === 'object' && (
                      <span>
                        {' • '}
                        {savedSession.summary.magnitudeLabel || 'Activity'}: {savedSession.summary.valenceLabel || 'Mixed'}
                      </span>
                    )}
                    {savedSession.summary && typeof savedSession.summary === 'string' && ` • ${savedSession.summary}`}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={loadSavedSession}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    >
                      Resume Session
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSessionResumePrompt(false)}
                      className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    >
                      Start Fresh
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

        {/* Lens stripe - exact microcopy per UI/UX contract */}
        <div className="mt-6 mb-8 rounded-lg border border-slate-600 bg-slate-800/40 px-4 py-3 text-center print:hidden">
          <div className="text-sm text-slate-200">
            {lensStripeText}
          </div>
        </div>


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
                onChange={(e) => setSaveForNextSession(e.target.checked)}
              />
              Save for next session
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveSetupJSON()}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                title="Save the current setup (people, dates, mode, relationship) to JSON"
                aria-label="Save current setup to JSON"
              >
                Save Setup
              </button>
              <label
                htmlFor={setupUploadId}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                Load Setup…
              </label>
              <input
                ref={fileInputRef}
                id={setupUploadId}
                type="file"
                accept="application/json"
                onChange={handleLoadSetupFromFile}
                className="sr-only"
                aria-label="Upload setup JSON file"
              />
            </div>
            {loadError && (
              <div className="mt-2 text-xs text-red-400">{loadError}</div>
            )}
          </div>

          {/* Session framing copy replaces the old Mirror vs Balance fork */}
          <section aria-labelledby="session-path-heading" className="mb-6 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
            <h3 id="session-path-heading" className="text-sm font-medium text-slate-200">Dynamic Report Flow</h3>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <p className="text-sm text-slate-300 md:max-w-xl">
                Math Brain now runs a single dynamic report. Every session opens with a Mirror-first summary and then lets you reveal
                Balance metrics, key geometries, and audits step-by-step after the geometry is ready.
              </p>
              <div className="flex flex-col gap-2 text-xs text-slate-400 md:text-right">
                <div className="inline-flex items-center gap-2 self-start rounded-full border border-indigo-500/70 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-200 md:self-end">
                  <span>Field → Map → Voice</span>
                </div>
                <span>
                  Toggle <strong>Include Transits</strong> on the right to add symbolic weather. Leave it off for natal baseline runs.
                </span>
              </div>
            </div>
          </section>

          {/* Profile Manager */}
          <Section title="📚 Saved Profiles">
            <ProfileManager
              profiles={profiles}
              loading={profilesLoading}
              onLoadProfile={handleLoadProfile}
              onSaveCurrentProfile={handleSaveCurrentProfile}
              onDeleteProfile={handleDeleteProfile}
              currentPersonA={personA}
              currentPersonB={personB}
              isAuthenticated={isAuthenticated}
              existingProfileForPersonA={existingProfileForPersonA}
              existingProfileForPersonB={existingProfileForPersonB}
            />
          </Section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
            {/* Left column: Person A */}
            <Section title="Person A (required)">
              <PersonForm
                idPrefix="a"
                person={personA}
                setPerson={setPersonA}
                coordsInput={aCoordsInput}
                setCoordsInput={setACoordsInput}
                coordsError={aCoordsError}
                setCoordsError={setACoordsError}
                setCoordsValid={setACoordsValid}
                timezoneOptions={tzOptions}
                allowUnknownTime={allowUnknownA}
                showTimePolicy={timeUnknown}
                timePolicy={timePolicy}
                onTimePolicyChange={setTimePolicy}
                timePolicyScopeLabel={personA.name ? `${personA.name} (Person A)` : 'Person A'}
                requireName
                requireBirthDate
                requireTime
                requireLocation
                requireTimezone
              />

              {/* Save Person A Profile Button */}
              {isAuthenticated && personA.year && personA.month && personA.day && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  {existingProfileForPersonA ? (
                    <div className="rounded-md border border-emerald-700/60 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-100 text-center">
                      <p className="font-medium text-emerald-200">Already saved</p>
                      <p className="text-xs text-emerald-100/80">{existingProfileForPersonA.name} is already in your saved roster with these details.</p>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const name = prompt('Enter a name for this profile:', personA.name || 'Person A');
                          if (name) {
                            handleSaveCurrentProfile('A', name);
                          }
                        }}
                        className="w-full rounded-md bg-emerald-700/30 border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-700/40 transition-colors flex items-center justify-center gap-2"
                      >
                        <span>💾</span>
                        <span>Save Person A to Profile Database</span>
                      </button>
                      <p className="mt-2 text-xs text-slate-400 text-center">
                        Save this person's birth data for quick loading later
                      </p>
                    </>
                  )}
                </div>
              )}

              {!isAuthenticated && personA.year && personA.month && personA.day && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="rounded-md bg-amber-900/30 border border-amber-700 p-3 text-amber-200 text-sm">
                    <p className="font-medium">Sign in to save profiles</p>
                    <p className="text-xs mt-1 text-amber-300">
                      Sign in with Google (top of page) to save Person A for later
                    </p>
                  </div>
                </div>
              )}
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
                  <label htmlFor="include-person-b" className="inline-flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                    <input
                      id="include-person-b"
                      data-testid="include-person-b"
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
                <PersonForm
                  idPrefix="b"
                  person={personB}
                  setPerson={setPersonB}
                  coordsInput={bCoordsInput}
                  setCoordsInput={setBCoordsInput}
                  coordsError={bCoordsError}
                  setCoordsError={setBCoordsError}
                  setCoordsValid={setBCoordsValid}
                  timezoneOptions={tzOptions}
                  allowUnknownTime={allowUnknownB}
                  showTimePolicy={includePersonB && timeUnknownB}
                  timePolicy={timePolicy}
                  onTimePolicyChange={setTimePolicy}
                  timePolicyScopeLabel={personB.name ? `${personB.name} (Person B)` : 'Person B'}
                  disabled={!includePersonB}
                  coordinateLabel="Birth Coordinates (B)"
                  coordinatePlaceholder="e.g., 34°03′S, 18°25′E or -34.0500, 18.4167"
                  normalizedFallback="—"
                  nameInputRef={bNameRef}
                  skipParseWhenDisabled
                />

                {/* Save Person B Profile Button */}
                {isAuthenticated && includePersonB && personB.year && personB.month && personB.day && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    {existingProfileForPersonB ? (
                      <div className="rounded-md border border-emerald-700/60 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-100 text-center">
                        <p className="font-medium text-emerald-200">Already saved</p>
                        <p className="text-xs text-emerald-100/80">{existingProfileForPersonB.name} is already in your saved roster with these details.</p>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const name = prompt('Enter a name for this profile:', personB.name || 'Person B');
                            if (name) {
                              handleSaveCurrentProfile('B', name);
                            }
                          }}
                          className="w-full rounded-md bg-emerald-700/30 border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-700/40 transition-colors flex items-center justify-center gap-2"
                        >
                          <span>💾</span>
                          <span>Save Person B to Profile Database</span>
                        </button>
                        <p className="mt-2 text-xs text-slate-400 text-center">
                          Save this person's birth data for quick loading later
                        </p>
                      </>
                    )}
                  </div>
                )}

                {!isAuthenticated && includePersonB && personB.year && personB.month && personB.day && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="rounded-md bg-amber-900/30 border border-amber-700 p-3 text-amber-200 text-sm">
                      <p className="font-medium">Sign in to save profiles</p>
                      <p className="text-xs mt-1 text-amber-300">
                        Sign in with Google (top of page) to save Person B for later
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Section>
            {/* Relationship Context (only when Person B included) */}
            <Section title="Relationship Context" className="md:-mt-4">
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
                    onChange={(e) => { setRelationshipType(e.target.value); setRelationshipTier(""); setRelationshipRole(""); }}
                  >
                    <option value="PARTNER">Partner</option>
                    <option value="FRIEND">Friend / Acquaintance</option>
                    <option value="FAMILY">Family Member</option>
                  </select>
                  <div className="mt-2 text-[11px] text-slate-400">
                    <div className="font-medium text-slate-300">Primary Relational Tiers (scope):</div>
                    <div>• Partner — full map access, including intimacy arcs & legacy patterns.</div>
                    <div>• Friend / Acquaintance — emotional, behavioral, social dynamics; intimacy overlays de-emphasized.</div>
                    <div>• Family Member — legacy patterns and behavioral overlays.
                      {' '}Select the role to clarify Person B's relationship to Person A.</div>
                  </div>
                </div>
                {includePersonB && (
                  <div className="sm:col-span-2">
                    <span className="block text-sm text-slate-300">Contact State</span>
                    <div className="mt-2 inline-flex overflow-hidden rounded-md border border-slate-600 bg-slate-900/80">
                      <button
                        type="button"
                        onClick={() => setContactState('ACTIVE')}
                        className={`px-3 py-1.5 text-sm transition ${contactState === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'text-slate-200 hover:bg-slate-800'}`}
                        aria-pressed={contactState === 'ACTIVE'}
                      >
                        Active
                      </button>
                      <div className="h-6 w-px bg-slate-700 my-1" />
                      <button
                        type="button"
                        onClick={() => setContactState('LATENT')}
                        className={`px-3 py-1.5 text-sm transition ${contactState === 'LATENT' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-800'}`}
                        aria-pressed={contactState === 'LATENT'}
                      >
                        Latent
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Active treats overlays as live contact pressure; Latent logs the geometry but marks it dormant until reactivation.
                    </p>
                  </div>
                )}
                {relationshipType === 'PARTNER' && (
                  <div>
                    <label htmlFor="rel-tier" className="block text-sm text-slate-300">Intimacy Tier</label>
                    <select
                      id="rel-tier"
                      disabled={!includePersonB}
                      className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                      value={relationshipTier}
                      onChange={(e) => setRelationshipTier(e.target.value)}
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
                      onChange={(e) => setRelationshipRole(e.target.value)}
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
                      onChange={(e) => setRelationshipRole(e.target.value)}
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
                    onChange={(e) => setExEstranged(e.target.checked)}
                    disabled={!includePersonB || relationshipType === 'FRIEND'}
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
                    onChange={(e) => setRelationshipNotes(e.target.value.slice(0, 500))}
                  />
                </div>
              </div>
            </Section>

            {/* Right column: Transits + actions */}
            <div className="space-y-6">
              {/* Report Type Radio Group */}
              <Section title="Report Type">
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">Choose the astrological report structure</p>
                  <div className="flex flex-col gap-2">
                    {(['solo', 'synastry', 'composite'] as const).map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2.5 cursor-pointer hover:bg-slate-800 transition"
                      >
                        <input
                          type="radio"
                          name="report-type"
                          value={type}
                          checked={reportStructure === type}
                          onChange={(e) => {
                            const newStructure = e.target.value as ReportStructure;
                            setReportStructure(newStructure);
                            // Automatically enable Person B for relational modes
                            // Do not auto-enable Person B for relational modes
                          }}
                          className="h-4 w-4 border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="block text-sm font-medium text-slate-100 capitalize">{type}</span>
                          <span className="block text-xs text-slate-400">
                            {type === 'solo' && 'Individual natal chart analysis'}
                            {type === 'synastry' && 'Relationship dynamics between two charts'}
                            {type === 'composite' && 'Blended chart representing the relationship itself'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </Section>

              <Section title="Symbolic Weather (Transits)">
                <TransitControls
                  includeTransits={includeTransits}
                  onIncludeTransitsChange={setIncludeTransits}
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  onUserHasSetDatesChange={setUserHasSetDates}
                  onDateFocus={handleDateFocus}
                  onDateTouchStart={handleDateTouchStart}
                  step={step}
                  onStepChange={setStep}
                  mode={mode}
                  onModeChange={(value) => applyMode(normalizeReportMode(value))}
                  soloModeOption={soloModeOption}
                  relationalModeOptions={relationalModeOptions}
                  includePersonB={includePersonB}
                  isRelationalMode={RELATIONAL_MODES.includes(mode)}
                  translocation={translocation}
                  onTranslocationChange={(value) => setTranslocation(normalizeTranslocationOption(value))}
                  relocationOptions={relocationOptions}
                  relocationLabels={relocationSelectLabels}
                  relocationStatus={relocationStatus}
                  relocationModeCaption={relocationModeCaption}
                  relocInput={relocInput}
                  onRelocInputChange={setRelocInput}
                  relocCoords={relocCoords}
                  onRelocCoordsChange={setRelocCoords}
                  relocError={relocError}
                  onRelocErrorChange={setRelocError}
                  relocLabel={relocLabel}
                  onRelocLabelChange={setRelocLabel}
                  relocTz={relocTz}
                  onRelocTzChange={setRelocTz}
                  tzOptions={tzOptions}
                  weeklyAgg={weeklyAgg}
                  onWeeklyAggChange={setWeeklyAgg}
                  personATimezone={personA.timezone}
                />
              </Section>

              {/* Snapshot Button */}
              <div className="mb-4">
                <SnapshotButton
                  personA={personA}
                  personB={includePersonB ? personB : undefined}
                  mode={mode}
                  isAuthenticated={isAuthenticated}
                  disabled={loading}
                  includePersonB={includePersonB}
                  includeTransits={includeTransits}
                  startDate={startDate}
                  endDate={endDate}
                  reportType={reportType}
                  onSnapshot={handleSnapshotCapture}
                  onAuthRequired={handleSnapshotAuthRequired}
                  onDateChange={(date) => {
                    setStartDate(date);
                    setEndDate(date);
                  }}
                />
                {snapshotResult && snapshotLocation && snapshotTimestamp && (
                  <div className="mt-4">
                    <SnapshotDisplay
                      result={snapshotResult}
                      location={snapshotLocation}
                      timestamp={snapshotTimestamp}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  All processing is geometry-first and non-deterministic. Your data isn't stored.
                </p>
                <div className="mr-2 hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5">
                    <span className="text-slate-300">Mode:</span>
                    <span className="text-slate-100">{mode.replace(/_/g, ' ')}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5">
                    <span className="text-slate-300">Report:</span>
                    <span className="text-slate-100 capitalize">{reportType}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(result || loading) && (
                    <button
                      type="button"
                      onClick={clearReport}
                      className="inline-flex items-center rounded-md px-3 py-2 text-sm text-slate-300 border border-slate-600 bg-slate-800 hover:bg-slate-700 hover:text-slate-100 transition"
                    >
                      {loading ? "Cancel" : "Clear Report"}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitDisabled}
                    className="inline-flex items-center rounded-md px-4 py-2 text-white disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500"
                  >
                    {loading ? "Mapping geometry…" : (includeTransits ? 'Generate Report' : 'Prepare Mirror')}
                  </button>
                </div>
              </div>
              {(RELATIONAL_MODES.includes(mode) && !includePersonB) && (
                <p className="mt-2 text-xs text-amber-400">Hint: Toggle "Include Person B" and fill in required fields to enable relational modes.</p>
              )}
              {submitDisabled && !loading && (() => {
                if (!PROVIDER_BYPASS && providerCheckPending) {
                  return <p className="mt-2 text-xs text-amber-400">⚠️ Checking provider readiness…</p>;
                }
                if (!PROVIDER_BYPASS && !providerHealth.astrology.ready) {
                  const outageMessage = providerHealth.astrology.message || 'Math Brain services are currently unavailable.';
                  return <p className="mt-2 text-xs text-amber-400">⚠️ {outageMessage}</p>;
                }
                const locGate = needsLocation(reportType, includeTransits, personA);
                if (includeTransits && !locGate.hasLoc) {
                  return <p className="mt-2 text-xs text-amber-400">⚠️ Transits require location data. Please enter coordinates or city/state for Person A.</p>;
                }
                if (!aCoordsValid && (personA.latitude || personA.longitude)) {
                  return <p className="mt-2 text-xs text-amber-400">⚠️ Invalid coordinates for Person A. Please check latitude/longitude format.</p>;
                }
                if (includePersonB && !bCoordsValid && (personB.latitude || personB.longitude)) {
                  return <p className="mt-2 text-xs text-amber-400">⚠️ Invalid coordinates for Person B. Please check latitude/longitude format.</p>;
                }
                const missing: string[] = [];
                if (!personA.name) missing.push('Name');
                if (!personA.city) missing.push('City');
                if (!personA.state) missing.push('State');
                if (!personA.timezone) missing.push('Timezone');
                if (missing.length > 0) {
                  return <p className="mt-2 text-xs text-amber-400">⚠️ Missing required fields for Person A: {missing.join(', ')}</p>;
                }
                return <p className="mt-2 text-xs text-amber-400">⚠️ Please complete all required fields to generate report.</p>;
              })()}
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
                  {precision === 'unknown' && (timePolicy === 'planetary_only') && (
                    <div className="rounded-md border border-amber-700 bg-amber-900/30 px-3 py-1 text-xs text-amber-200">
                      Using planetary-only mode. You can run a sensitivity scan for house-dependent work.
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Chart Wheels Section temporarily disabled due to unreliable upstream asset generation */}
            {null}
            {/* Layer progression + toggle controls */}
            <div className="print:hidden">
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-700 bg-slate-900/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                <span className="text-indigo-200">Mirror Summary</span>
                <span className="text-slate-600">→</span>
                <span className={weather.hasWindow ? (layerVisibility.balance ? 'text-indigo-200' : 'text-slate-500') : 'text-slate-700'}>
                  Balance Metrics
                </span>
                <span className="text-slate-600">→</span>
                <span className={layerVisibility.diagnostics ? 'text-indigo-200' : (includeTransits ? 'text-slate-500' : 'text-slate-700')}>
                  Full Diagnostics
                </span>
                <span className="text-slate-600">→</span>
                {canVisitPoetic ? (
                  <a
                    href="/chat"
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavigateToPoetic();
                    }}
                    className="text-emerald-300 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-sm"
                  >
                    Poetic Brain
                  </a>
                ) : (
                  <span className="text-slate-500">Poetic Brain</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {weather.hasWindow ? (
                  <button
                    type="button"
                    onClick={() => toggleLayerVisibility('balance')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${layerVisibility.balance ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'border border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800'}`}
                  >
                    {layerVisibility.balance ? 'Hide Balance Metrics' : 'Show Balance Metrics'}
                  </button>
                ) : (
                  <div className="relative group">
                    <button
                      type="button"
                      className="h-6 w-6 rounded-full border border-slate-600 text-xs text-slate-400 hover:bg-slate-700/60 cursor-help"
                      aria-describedby="balance-info-tooltip"
                      tabIndex={0}
                    >
                      i
                    </button>
                    <div
                      id="balance-info-tooltip"
                      className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 pointer-events-none border border-slate-700 shadow-lg z-50 whitespace-nowrap"
                    >
                      Add dates to see activations.
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => includeTransits ? toggleLayerVisibility('diagnostics') : undefined}
                  disabled={!includeTransits}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${!includeTransits ? 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500' : layerVisibility.diagnostics ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'border border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800'}`}
                >
                  {layerVisibility.diagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}
                </button>
              </div>
            </div>

            {/* Post-generation actions - Restructured for clarity */}
            <DownloadControls
              includeTransits={includeTransits}
              pdfGenerating={pdfGenerating}
              graphsPdfGenerating={graphsPdfGenerating}
              astroFileJsonGenerating={astroFileJsonGenerating}
              engineConfigGenerating={engineConfigGenerating}
              cleanJsonGenerating={cleanJsonGenerating}
              onDownloadPDF={downloadResultPDF}
              onDownloadAstroFile={downloadAstroFileJSON}
              onDownloadGraphsPDF={downloadGraphsPDF}
              onDownloadEngineConfig={downloadBackstageJSON}
              onDownloadCleanJSON={downloadResultJSON}
              onDownloadMapFile={downloadMapFile}
              onDownloadFieldFile={downloadFieldFile}
              onDownloadWovenAIPacket={downloadWovenAIPacket}
              seismographMap={seismographMap}
              authReady={authReady}
              isAuthenticated={isAuthenticated}
              canVisitPoetic={canVisitPoetic}
              onNavigateToPoetic={handleNavigateToPoetic}
            />
            {weather.hasWindow && layerVisibility.balance && (
              <>
                {(() => {
                  const daily = frontStageTransitsByDate;
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
                  const summary = frontStageResult?.person_a?.summary
                    ?? result?.person_a?.summary
                    ?? result?.person_a?.derived?.seismograph_summary;
                  if (!summary) return null;

                  const mag = Number(
                    summary.axes?.magnitude?.value ??
                    summary.magnitude_calibrated ??
                    summary.magnitude ??
                    0
                  );
                  const val = Number(
                    summary.axes?.directional_bias?.value ??
                    summary.valence_bounded ??
                    summary.valence ??
                    0
                  );
                  const vol = Number(summary.volatility ?? 0);

                  // Calculate daily ranges from transitsByDate
                  const transitsByDate = frontStageTransitsByDate;
                  const dailyBiasValues: number[] = [];
                  const dailyMagValues: number[] = [];

                  Object.values(transitsByDate).forEach((dayData: any) => {
                    const seismo = dayData?.seismograph || {};
                    const balance = dayData?.balance || {};
                    // v5.0: Use canonical directional_bias structure
                    const bias = Number(seismo.directional_bias?.value ?? seismo.bias_signed ?? balance.directional_bias?.value ?? balance.bias_signed ?? 0);
                    const dayMag = Number(seismo.magnitude ?? balance.magnitude ?? 0);
                    if (Number.isFinite(bias)) dailyBiasValues.push(bias);
                    if (Number.isFinite(dayMag)) dailyMagValues.push(dayMag);
                  });

                  const biasMin = dailyBiasValues.length > 0 ? Math.min(...dailyBiasValues) : val;
                  const biasMax = dailyBiasValues.length > 0 ? Math.max(...dailyBiasValues) : val;
                  const magMin = dailyMagValues.length > 0 ? Math.min(...dailyMagValues) : mag;
                  const magMax = dailyMagValues.length > 0 ? Math.max(...dailyMagValues) : mag;

                  const magnitudeLabel = summary.magnitude_label || (mag >= 3 ? 'Surge' : mag >= 1 ? 'Active' : 'Calm');
                  const valenceLabel = summary.valence_label || (val > 0.5 ? 'Supportive' : val < -0.5 ? 'Challenging' : 'Mixed');
                  const volatilityLabel = summary.volatility_label || (vol >= 3 ? 'Scattered' : vol >= 1 ? 'Variable' : 'Stable');

                  const symbolicDrivers = (() => {
                    const drivers = new Set<string>();

                    const addDrivers = (list: unknown) => {
                      if (!Array.isArray(list)) return;
                      list.forEach((item) => {
                        if (typeof item === 'string' && item.trim()) {
                          drivers.add(item.trim());
                        }
                      });
                    };

                    addDrivers((summary as any)?.drivers);
                    addDrivers((summary as any)?.diagnostics?.drivers);

                    const daily = frontStageTransitsByDate || {};
                    Object.values(daily).forEach((dayData: any) => {
                      addDrivers(dayData?.balance?.drivers);
                      addDrivers(dayData?.drivers);
                      const overflowDetail = computeOverflowDetailFromDay(dayData);
                      addDrivers(overflowDetail?.drivers);
                    });

                    return Array.from(drivers).slice(0, 12);
                  })();

                  return (
                    <div ref={balanceGraphsRef} data-balance-export="true">
                      <Section title="Poetic Brain Reading Log">
                        {/* LAYER 1: SUMMARY VIEW (At a Glance) */}
                        <BalanceMeterSummary
                          dateRange={{
                            start: startDate || 'Unknown',
                            end: endDate || 'Unknown'
                          }}
                          location={relocationStatus.effectiveMode !== 'NONE'
                            ? (relocLabel || `${personA.city || 'Unknown'}, ${personA.state || 'Unknown'}`)
                            : `${personA.city || 'Unknown'}, ${personA.state || 'Unknown'}`
                          }
                          mode={RELATIONAL_MODES.includes(mode) ? 'relational' : 'single'}
                          names={RELATIONAL_MODES.includes(mode)
                            ? [personA.name || 'Person A', personB.name || 'Person B']
                            : undefined
                          }
                          overallClimate={{
                            magnitude: mag,
                            valence: val,
                            volatility: vol,
                            ...(symbolicDrivers.length ? { drivers: symbolicDrivers } : {}),
                          }}
                          dailyRanges={{
                            biasMin,
                            biasMax,
                            magnitudeMin: magMin,
                            magnitudeMax: magMax
                          }}
                          totalDays={(() => {
                            const daily = frontStageTransitsByDate;
                            return Object.keys(daily).filter(d => d && d.match(/^\d{4}-\d{2}-\d{2}$/)).length;
                          })()}
                          isLatentField={exEstranged}
                        />

                        {/* LAYER 2: SYMBOLIC SEISMOGRAPH (Plot Charts) */}
                        {(() => {
                          const transitsByDate = frontStageTransitsByDate;
                          const dates = Object.keys(transitsByDate).sort();
                          const hasTransitData = dates.length > 0 && includeTransits;

                          if (!hasTransitData) {
                            return (
                              <div className="mt-6 rounded-md border border-slate-600 bg-slate-900/40 p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-sm font-medium text-slate-300">Symbolic Plot Charts</h3>
                                    <p className="mt-1 text-xs text-slate-400">
                                      Not available - transits were not included in this report
                                    </p>
                                  </div>
                                  <span className="text-slate-600">📊</span>
                                </div>
                              </div>
                            );
                          }

                          // Transform transitsByDate into SymbolicSeismograph data format
                          const seismographData = dates.map(date => {
                            const dayData = transitsByDate[date];
                            const seismo = dayData?.seismograph || {};
                            const balance = dayData?.balance || {};
                            // SFD deprecated — no longer included in daily seismograph payload

                            const biasValue = (() => {
                              if (typeof seismo.directional_bias === 'number') return seismo.directional_bias;
                              if (typeof seismo.directional_bias?.value === 'number') return seismo.directional_bias.value;
                              if (typeof seismo.bias === 'number') return seismo.bias;
                              if (typeof seismo.bias_signed === 'number') return seismo.bias_signed;
                              if (typeof balance.bias_signed === 'number') return balance.bias_signed;
                              if (typeof seismo.valence === 'number') return seismo.valence;
                              if (typeof seismo.valence_bounded === 'number') return seismo.valence_bounded;
                              if (typeof seismo.axes?.directional_bias?.value === 'number') return seismo.axes.directional_bias.value;
                              return 0;
                            })();

                            return {
                              date,
                              magnitude_0to5: seismo.magnitude ?? balance.magnitude ?? 0,
                              bias_signed_minus5to5: biasValue,
                              coherence_0to5: (() => {
                                if (typeof seismo.coherence === 'number') return seismo.coherence;
                                const vol = typeof seismo.volatility === 'number'
                                  ? seismo.volatility
                                  : (typeof seismo.axes?.volatility?.value === 'number' ? seismo.axes.volatility.value : 0);
                                return Math.max(0, Math.min(5, 5 - vol));
                              })(),
                              schema_version: 'BM-v3',
                              orbs_profile: displayResult?.provenance?.orbs_profile || 'wm-spec-2025-09',
                              house_frame: 'natal',
                              relocation_supported: false,
                              ...(relocationStatus.effectiveMode !== 'NONE' && {
                                relocation_overlay: {
                                  user_place: relocLabel || `${personA.city || 'Unknown'}, ${personA.state || 'Unknown'}`,
                                  advisory: 'Same sky, natal rooms only. Local guidance is author-authored overlay, not computed houses.',
                                  confidence: 'author_note' as const,
                                  notes: [
                                    'Houses are derived from natal frame only.',
                                    'The API does not recalc for relocation.',
                                    'Any "place" guidance is human-authored overlay, not computed houses.'
                                  ]
                                }
                              }),
                              provenance: {
                                house_system: `${result?.provenance?.house_system || 'Placidus'} (natal)`,
                                relocation_mode: 'not_applied',
                                orbs_profile: result?.provenance?.orbs_profile || 'wm-spec-2025-09',
                                math_brain_version: result?.provenance?.math_brain_version || '3.1.4',
                                tz: result?.provenance?.tz || result?.provenance?.timezone || 'UTC',
                                bias_method: seismo.bias_method || balance.bias_method || 'signed_z_to_[-5,5]',
                                mag_method: seismo.magnitude_method || balance.magnitude_method || 'z_to_[0,5]'
                              }
                            };
                          });

                          return (
                            <div className="my-6">
                              <div className="mb-4 flex items-center justify-between">
                                <div>
                                  <h3 className="text-sm font-medium text-slate-200">Symbolic Plot Charts</h3>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Time-series visualization of daily symbolic weather patterns
                                  </p>
                                </div>
                                <button
                                  onClick={() => setShowSeismographCharts((prev) => !prev)}
                                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors flex items-center gap-2"
                                >
                                  {showSeismographCharts ? '👁️ Hide Charts' : '📊 Reveal Plot Charts'}
                                  <span className="rounded-full bg-blue-400 px-2 py-0.5 text-xs">
                                    {dates.length} days
                                  </span>
                                </button>
                              </div>

                              {showSeismographCharts && (
                                <>
                                  <SymbolicSeismograph
                                    data={seismographData}
                                    showProvenance={true}
                                    className="symbolic-seismograph-section"
                                  />

                                  {/* Scatter Chart Visualization */}
                                  {(() => {
                                    try {
                                      const fieldFile =
                                        displayResult?.unified_output?._field_file ||
                                        displayResult?._field_file ||
                                        result?.unified_output?._field_file;

                                      let weatherRecords =
                                        (fieldFile?.daily && transformFieldFileDaily(fieldFile)) || {};

                                      if (!weatherRecords || Object.keys(weatherRecords).length === 0) {
                                        weatherRecords = transformTransitsByDate(transitsByDate);
                                      }

                                      const weatherDates = Object.keys(weatherRecords);
                                      if (weatherDates.length === 0) {
                                        return null;
                                      }

                                      const weatherArray = weatherDates
                                        .sort()
                                        .map((date) => ({
                                          date,
                                          weather: weatherRecords[date],
                                        }))
                                        .filter((entry) => entry.weather);

                                      if (!weatherArray.length) {
                                        return null;
                                      }
                                      return (
                                        <div className="mt-6">
                                          <WeatherPlots
                                            data={weatherArray}
                                            result={result}
                                            showScatter={true}
                                            enableUnified={true}
                                          />
                                        </div>
                                      );
                                    } catch (error) {
                                      console.warn('[MathBrain] Failed to transform weather data for scatter plots', error);
                                      return null;
                                    }
                                  })()}
                                </>
                              )}
                            </div>
                          );
                        })()}

                        {layerVisibility.diagnostics && (
                          <div className="mb-6">
                            <h3 className="text-sm font-medium text-slate-200 mb-3">Daily Symbolic Weather Cards</h3>
                            {(() => {
                              const daily = frontStageTransitsByDate;
                              const dates = Object.keys(daily).sort();
                              if (!dates.length) {
                                return <div className="text-sm text-slate-500 p-4 border border-slate-700 rounded bg-slate-900/20">No daily data available</div>;
                              }

                              // Determine default expanded state (Today, or first day if today not present)
                              const today = new Date().toISOString().split('T')[0];
                              const hasToday = dates.includes(today);

                              // State descriptor functions
                              const getMagnitudeState = (mag: number) => {
                                if (mag <= 1) return 'Latent';
                                if (mag <= 2) return 'Murmur';
                                if (mag <= 4) return 'Active';
                                return 'Threshold';
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
                                  return { emojis, descriptor: 'Friction', anchor: '−3', pattern: 'conflicts or cross‑purposes slow motion' };
                                } else if (valence >= -4.5) {
                                  const emojis = magLevel === 'low' ? ['🕰', '⚔️'] : ['🕰', '⚔️', '🌪'];
                                  return { emojis, descriptor: 'Grind', anchor: '−4', pattern: 'sustained resistance; heavy duty load' };
                                } else {
                                  const emojis = magLevel === 'low' ? ['🌋', '🧩'] : ['🌋', '🧩', '⬇️'];
                                  return { emojis, descriptor: 'Compression', anchor: '−5', pattern: 'maximum restrictive tilt; deep inward compression' };
                                }
                              };

                              const getVolatilityState = (vol: number) => {
                                if (vol <= 2) return 'Coherent';
                                if (vol <= 4) return 'Complex';
                                return 'Dispersed';
                              };

                              // SFD state helper removed (deprecated)

                              const classifyMagnitude = (mag: number) => {
                                if (mag <= 2) {
                                  return { key: 'low' as const, label: 'Low', badge: 'Low Intensity' };
                                }
                                if (mag <= 4) {
                                  return { key: 'medium' as const, label: 'Medium', badge: 'Medium Intensity' };
                                }
                                return { key: 'high' as const, label: 'High', badge: 'High Intensity' };
                              };

                              const classifyValence = (val: number) => {
                                if (val >= 1.5) {
                                  return {
                                    key: 'supportive' as const,
                                    label: 'Supportive',
                                    badge: 'Positive Tilt',
                                  };
                                }
                                if (val <= -1.5) {
                                  return {
                                    key: 'tense' as const,
                                    label: 'Tense',
                                    badge: 'Tense Tilt',
                                  };
                                }
                                return {
                                  key: 'mixed' as const,
                                  label: 'Mixed',
                                  badge: 'Mixed Tilt',
                                };
                              };

                              const classifyVolatility = (vol: number) => {
                                if (vol <= 2) {
                                  return { key: 'stable' as const, label: 'Stable', badge: 'Stable Distribution' };
                                }
                                if (vol <= 4) {
                                  return { key: 'variable' as const, label: 'Variable', badge: 'Variable Distribution' };
                                }
                                return { key: 'scattered' as const, label: 'Scattered', badge: 'Scattered Distribution' };
                              };

                              const magnitudeForkText = (mag: number) => {
                                if (mag >= 4) {
                                  return {
                                    wb: 'Breakthrough wave: high charge favors bold moves and outreach.',
                                    abe: 'Overload wave: same charge can oversaturate the schedule or nervous system.',
                                  };
                                }
                                if (mag >= 2) {
                                  return {
                                    wb: 'Productive surge: solid momentum to advance priority work.',
                                    abe: 'Overextension risk: adding too much can fragment focus.',
                                  };
                                }
                                return {
                                  wb: 'Integration window: gentle charge supports rest or soft starts.',
                                  abe: 'Stagnation risk: low voltage may feel stuck without intentional sparks.',
                                };
                              };

                              const valenceForkText = (val: number) => {
                                if (val >= 4) {
                                  return {
                                    wb: 'Liberation flow: peak openness creates breakthrough possibilities.',
                                    abe: 'Open-field sprawl: infinite options can stall momentum until you set constraints.',
                                  };
                                }
                                if (val >= 3) {
                                  return {
                                    wb: 'Expansion clarity: widening opportunities land with clarity.',
                                    abe: 'Expansion overreach: ambition outruns capacity and scatters energy.',
                                  };
                                }
                                if (val >= 2) {
                                  return {
                                    wb: 'Harmony integration: both/and solutions emerge through coherent progress.',
                                    abe: 'Harmony avoidance: pleasing everyone delays necessary calls.',
                                  };
                                }
                                if (val >= 1) {
                                  return {
                                    wb: 'Lift momentum: gentle tailwinds back natural beginnings.',
                                    abe: 'Lift impatience: slow build can feel frustrating when you want speed.',
                                  };
                                }
                                if (val >= -1) {
                                  return {
                                    wb: 'Equilibrium balance: forces offset, leaving space for discernment.',
                                    abe: 'Equilibrium stall: neutrality can feel like treading water.',
                                  };
                                }
                                if (val >= -2) {
                                  return {
                                    wb: 'Contraction focus: narrowing options create useful boundaries.',
                                    abe: 'Contraction anxiety: tightening scope can spark scarcity thinking.',
                                  };
                                }
                                if (val >= -3) {
                                  return {
                                    wb: 'Friction catalyst: tension reveals truths that unlock progress.',
                                    abe: 'Friction exhaustion: unresolved cross-currents burn energy fast.',
                                  };
                                }
                                if (val >= -4) {
                                  return {
                                    wb: 'Grind stamina: disciplined effort builds staying power.',
                                    abe: 'Grind depletion: sustained resistance can drain capacity unless paced.',
                                  };
                                }
                                return {
                                  wb: 'Compression focus: maximum density creates clarity through constraint.',
                                  abe: 'Compression overload: extreme restriction can trigger shutdown.',
                                };
                              };

                              return dates.map(date => { // Show all requested days
                                const dayData = daily[date];
                                const seismo = dayData?.seismograph || dayData;

                                const overflowDetail = computeOverflowDetailFromDay(dayData);

                                const mag = firstFinite(
                                  seismo?.magnitude,
                                  seismo?.axes?.magnitude?.value,
                                  seismo?.rawMagnitude,
                                ) ?? 0;

                                const val = firstFinite(
                                  seismo?.directional_bias,
                                  seismo?.directional_bias?.value,
                                  seismo?.bias,
                                  seismo?.bias_signed,
                                  seismo?.valence_bounded,
                                  seismo?.valence,
                                  seismo?.axes?.directional_bias?.value,
                                ) ?? 0;

                                const vol = firstFinite(
                                  seismo?.volatility,
                                  seismo?.axes?.volatility?.value,
                                ) ?? 0;

                                // SFD removed — use magnitude/valence/volatility for cards
                                const valenceStyle = getValenceStyle(val, mag);

                                const magnitudeClass = classifyMagnitude(mag);
                                const valenceClass = classifyValence(val);
                                const volatilityClass = classifyVolatility(vol);
                                const magnitudeFork = magnitudeForkText(mag);
                                const valenceFork = valenceForkText(val);
                                const badgeLine = `${magnitudeClass.badge} / ${valenceClass.badge} / ${volatilityClass.badge}`;

                                const dateLabel = new Date(date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                });

                                const baseLocation = [personA.city, personA.state].filter(Boolean).join(', ') || personA.city || '';
                                const locationLabel = relocationStatus.effectiveMode !== 'NONE'
                                  ? (relocLabel || baseLocation || 'Relocation lens active')
                                  : (baseLocation || 'Location not specified');

                                const modeKind = RELATIONAL_MODES.includes(mode) ? 'relational' : 'single';
                                const relationalNames: [string, string] | undefined = modeKind === 'relational'
                                  ? [personA.name || 'Person A', personB.name || 'Person B']
                                  : undefined;

                                const isDefaultExpanded = hasToday ? date === today : date === dates[0];

                                return (
                                  <EnhancedDailyClimateCard
                                    key={date}
                                    date={dateLabel}
                                    location={locationLabel}
                                    mode={modeKind}
                                    names={relationalNames}
                                    climate={{
                                      magnitude: mag,
                                      valence_bounded: val,
                                      volatility: vol,
                                      drivers: overflowDetail?.drivers,
                                    }}
                                    overflowDetail={overflowDetail}
                                    defaultExpanded={isDefaultExpanded}
                                  />
                                );
                              });
                            })()}
                          </div>
                        )}

                        {/* LAYER 3: FIELD CONTEXT (Simple Descriptive Language) */}
                        {layerVisibility.diagnostics && (
                          <div className="mb-4">
                            <h3 className="text-sm font-medium text-slate-200 mb-3">Field Context</h3>
                            <div className="rounded border border-slate-700 bg-slate-900/40 p-4">
                              <div className="text-sm text-slate-300 leading-relaxed">
                                {(() => {
                                  // SFD deprecated and removed from summary — omitted
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
                                      return { emojis, descriptor: 'Compression', anchor: '−5', pattern: 'maximum restrictive tilt; deep inward compression' };
                                    }
                                  };

                                  const magState = getMagnitudeState(mag);
                                  const volState = getVolatilityState(vol);
                                  const valencePattern = getValenceStyle(val, mag);

                                  // Simple descriptive combinations using flavor patterns - NOT predictive
                                  let description = `The symbolic field shows ${magState} pressure with ${volState} patterns.`;

                                  // Add valence flavor pattern
                                  description += ` Valence signature: ${valencePattern.emojis.join('')} ${valencePattern.descriptor} (${valencePattern.anchor}) — ${valencePattern.pattern}.`;

                                  return description;
                                })()}
                              </div>
                              <div className="mt-3 text-xs text-slate-500">
                                Note: This describes the mathematical field state only. Pair it with your preferred narrative layer for lived interpretation.
                              </div>
                            </div>
                          </div>
                        )}
                      </Section>
                    </div>
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
              </>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
