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
