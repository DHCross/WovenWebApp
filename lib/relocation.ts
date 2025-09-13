export type SubjectUI = {
  name?: string;
  year: number | string; month: number | string; day: number | string; hour?: number|string|null; minute?: number|string|null;
  city?: string; nation?: string;
  latitude?: number|string; longitude?: number|string; timezone?: string; // IANA preferred
  zodiac_type?: 'Tropic'|'Sidereal'|string;
  houses_system_identifier?: string;
};

export function needsLocation(
  reportType: 'balance'|'mirror',
  includeTransitTag: boolean,
  s?: SubjectUI
) {
  const needsLoc = reportType === 'balance' || (reportType === 'mirror' && includeTransitTag);
  const hasLat = s && typeof (s as any).latitude === 'number' && Number.isFinite(Number((s as any).latitude));
  const hasLon = s && typeof (s as any).longitude === 'number' && Number.isFinite(Number((s as any).longitude));
  const hasTz = !!(s as any)?.timezone;
  const hasLoc = !!s && hasLat && hasLon && hasTz;
  const hasBirthTime = typeof s?.hour === 'number' || typeof s?.minute === 'number';
  return { needsLoc, hasLoc, hasBirthTime, canSubmit: !needsLoc || (needsLoc && hasLoc) };
}
// Relocation ("translocation") utilities
// Keeps aspect + planetary geometry fixed; remaps Houses when lens applies.

export interface TranslocationContext {
  applies: boolean;
  current_location: string;
  house_system?: string;
  tz?: string;
}

export interface NatalContext {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
}

export interface ReportContext {
  type: string;
  natal: NatalContext;
  translocation: TranslocationContext;
}

export interface RelocationSummary {
  active: boolean;
  lens: string; // human readable (e.g. "Chicago, IL (WholeSign)")
  disclosure: string; // short disclosure line
  invariants: string; // reminder that planets/aspects unchanged
}

export function summarizeRelocation(ctx: ReportContext): RelocationSummary {
  const t = ctx.translocation;
  if (!t || !t.applies) {
    return {
      active: false,
      lens: t?.current_location || 'Natal Base',
      disclosure: 'Relocation OFF – natal House mapping in effect',
      invariants: 'Planets, signs, aspects as computed from natal coordinates'
    };
  }
  const lens = `${t.current_location}${t.house_system ? ' ('+t.house_system+')' : ''}`;
  return {
    active: true,
    lens,
    disclosure: `Relocation ON – Houses remapped to ${t.current_location}`,
    invariants: 'Planetary geometry identical; only arena (House channels) shifted'
  };
}

/**
 * Formats a contrast line given a natal vs relocated House channel for a transit or factor.
 */
export function formatHouseContrast(symbol: string, natalHouse: number, relocatedHouse: number): string {
  if (natalHouse === relocatedHouse) return `${symbol}: Same arena (House ${natalHouse}) under relocation.`;
  return `${symbol}: Natal House ${natalHouse} → Relocated House ${relocatedHouse} (channel shift)`;
}

/**
 * Helper to safely read translocation applies flag from arbitrary uploaded JSON.
 */
export function detectRelocation(raw: any): boolean {
  try { return !!raw?.context?.translocation?.applies; } catch { return false; }
}

// --- Time precision helpers (UI ↔ server contract) ---
export type TimePrecision = 'exact' | 'unknown' | 'noon_fallback' | 'range_scan';

export function isTimeUnknown(s?: SubjectUI): boolean {
  if (!s) return true;
  const hasHour = typeof s.hour === 'number' || (typeof s.hour === 'string' && s.hour !== '');
  const hasMinute = typeof s.minute === 'number' || (typeof s.minute === 'string' && s.minute !== '');
  return !(hasHour && hasMinute);
}

export interface TimePolicy {
  birth_time_known: boolean;
  time_precision: TimePrecision;
  effective_time_used?: string; // e.g., "12:00 (local noon)"
  houses_suppressed: boolean;   // UI should hide house/angle language when true
}

export function deriveTimePolicy(s?: SubjectUI, choice?: 'planetary_only'|'whole_sign'|'scan'): TimePolicy {
  const unknown = isTimeUnknown(s);
  if (!unknown) {
    return { birth_time_known: true, time_precision: 'exact', houses_suppressed: false };
  }
  // Default is planetary-only (no houses)
  if (!choice || choice === 'planetary_only') {
    return {
      birth_time_known: false,
      time_precision: 'unknown',
      effective_time_used: undefined,
      houses_suppressed: true,
    };
  }
  if (choice === 'whole_sign') {
    return {
      birth_time_known: false,
      time_precision: 'noon_fallback',
      effective_time_used: '12:00 (local noon fallback)',
      houses_suppressed: false, // allowed with lower confidence banner in UI
    };
  }
  // scan
  return {
    birth_time_known: false,
    time_precision: 'range_scan',
    effective_time_used: '00:00-23:59 (scan)',
    houses_suppressed: true
  };
}
