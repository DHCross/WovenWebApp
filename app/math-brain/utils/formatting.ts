import type { ReportContractType } from '../types';
import { fmtAxis, fmtAxisLabel } from '../../../lib/ui/format';

type AxisName = 'magnitude' | 'directional_bias' | 'volatility';

// Balance Meter v4: Canonical field resolution
// Note: Legacy fallbacks kept for backward compatibility with old cached data
const AXIS_FIELD_MAP: Record<AxisName, string[]> = {
  magnitude: ['magnitude_calibrated', 'magnitude_bounded', 'magnitude'],
  directional_bias: ['directional_bias', 'bias_signed', 'valence_bounded', 'valence'],
  volatility: ['volatility_calibrated', 'volatility', 'coherence'], // coherence is inverse of volatility
};

const AXIS_NUMBER_KEYS = ['value', 'display', 'final', 'scaled', 'score', 'mean'];

const toAxisNumber = (candidate: any): number | undefined => {
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  if (typeof candidate === 'string') {
    const parsed = Number(candidate);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (candidate && typeof candidate === 'object') {
    for (const key of AXIS_NUMBER_KEYS) {
      const value = (candidate as Record<string, unknown>)[key];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed;
      }
    }
  }
  return undefined;
};

const convertAxisValue = (axis: AxisName, value: number | undefined, sourceKey?: string): number | undefined => {
  if (value === undefined) return undefined;

  if (axis === 'volatility') {
    const key = sourceKey?.toLowerCase() ?? '';
    if (key.includes('coherence')) {
      if (!Number.isFinite(value)) return undefined;
      const converted = 5 - value;
      const clamped = Math.max(0, Math.min(5, converted));
      return clamped;
    }
  }

  return value;
};

const extractAxisNumber = (source: any, axis: AxisName): number | undefined => {
  if (!source || typeof source !== 'object') return toAxisNumber(source);

  const axesBlock = source.axes || source.balance_meter?.axes;
  if (axesBlock && typeof axesBlock === 'object') {
    for (const key of AXIS_FIELD_MAP[axis]) {
      const axisCandidate = (axesBlock as Record<string, unknown>)[key];
      const value = convertAxisValue(axis, toAxisNumber(axisCandidate), key);
      if (value !== undefined) return value;
      if (axisCandidate && typeof axisCandidate === 'object') {
        for (const innerKey of AXIS_NUMBER_KEYS) {
          const nested = (axisCandidate as Record<string, unknown>)[innerKey];
          const nestedValue = convertAxisValue(axis, toAxisNumber(nested), key);
          if (nestedValue !== undefined) return nestedValue;
        }
      }
    }
  }

  for (const key of AXIS_FIELD_MAP[axis]) {
    const direct = (source as Record<string, unknown>)[key];
    const directValue = convertAxisValue(axis, toAxisNumber(direct), key);
    if (directValue !== undefined) return directValue;
  }

  if (axis === 'directional_bias') {
    const channel = (source as Record<string, unknown>).balance_channel;
    const channelValue = toAxisNumber(channel);
    if (channelValue !== undefined) return channelValue;
  }

  return undefined;
};

export { extractAxisNumber };

export const formatReportKind = (contractType: ReportContractType): string => {
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

export function formatNatalSummaryForPDF(natalSummary: any, personContext: any): string {
  const lines: string[] = [];

  if (personContext) {
    lines.push(`Name: ${personContext.name || 'Unknown'}`);
    lines.push(`Birth Date: ${personContext.birth_date || 'Unknown'}`);
    lines.push(
      `Birth Time: ${personContext.birth_time || 'Unknown'}${personContext.birth_time_exact ? ' (exact)' : ' (approximate)'}`,
    );

    if (personContext.birthplace) {
      const bp = personContext.birthplace;
      lines.push(`Birthplace: ${[bp.city, bp.state, bp.country].filter(Boolean).join(', ')}`);
      if (bp.coordinates) {
        lines.push(`Coordinates: ${bp.coordinates.lat.toFixed(4)}°, ${bp.coordinates.lon.toFixed(4)}°`);
      }
    }

    lines.push(`House System: ${personContext.house_system || 'Placidus'}`);
    lines.push(`Zodiac Type: ${personContext.zodiac_type || 'Tropical'}`);
    lines.push('');
  }

  if (natalSummary.placements) {
    lines.push('KEY PLACEMENTS:');
    const pl = natalSummary.placements;
    if (pl.core && pl.core.length) {
      lines.push(`Core: ${pl.core.map((p: any) => `${p.name} in ${p.sign}`).join(', ')}`);
    }
    if (pl.supporting && pl.supporting.length) {
      lines.push(`Supporting: ${pl.supporting.map((p: any) => `${p.name} in ${p.sign}`).join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function formatPersonBBlueprintForPDF(blueprint: any, personBContext: any): string {
  const lines: string[] = [];

  if (personBContext) {
    lines.push(`Name: ${personBContext.name || 'Unknown'}`);
    lines.push(`Birth Date: ${personBContext.birth_date || 'Unknown'}`);
    lines.push(
      `Birth Time: ${personBContext.birth_time || 'Unknown'}${personBContext.birth_time_exact ? ' (exact)' : ' (approximate)'}`,
    );

    if (personBContext.birthplace) {
      const bp = personBContext.birthplace;
      lines.push(`Birthplace: ${[bp.city, bp.state, bp.country].filter(Boolean).join(', ')}`);
    }

    lines.push(`House System: ${personBContext.house_system || 'Placidus'}`);
    lines.push('');
  }

  if (blueprint.person_b_modes) {
    const modes = blueprint.person_b_modes;
    if (modes.primary_mode) {
      lines.push(`Primary Mode: ${modes.primary_mode.function}`);
    }
    if (modes.secondary_mode) {
      lines.push(`Secondary Mode: ${modes.secondary_mode.function}`);
    }
  }

  return lines.join('\n');
}

export function formatSynastrySummaryForPDF(synastry: any): string {
  const lines: string[] = [];

  if (synastry.connection_type) {
    lines.push(`Connection Type: ${synastry.connection_type}`);
  }

  if (synastry.major_themes && Array.isArray(synastry.major_themes)) {
    lines.push('\nMAJOR THEMES:');
    synastry.major_themes.forEach((theme: any) => {
      lines.push(`- ${theme}`);
    });
  }

  if (synastry.strengths && Array.isArray(synastry.strengths)) {
    lines.push('\nSTRENGTHS:');
    synastry.strengths.forEach((strength: any) => {
      lines.push(`- ${strength}`);
    });
  }

  if (synastry.challenges && Array.isArray(synastry.challenges)) {
    lines.push('\nCHALLENGES:');
    synastry.challenges.forEach((challenge: any) => {
      lines.push(`- ${challenge}`);
    });
  }

  return lines.join('\n');
}

export function formatPlanetaryPositionsTable(positions: any[]): string {
  if (!positions || !positions.length) return 'No planetary positions available.';

  const lines: string[] = [];
  lines.push('BODY           SIGN          DEGREE      HOUSE    RETROGRADE');
  lines.push('─'.repeat(65));

  positions.forEach((pos) => {
    const body = (pos.body || '').padEnd(14);
    const sign = (pos.sign || '').padEnd(13);
    const degree = (pos.degree || '').padEnd(11);
    const house = (pos.house || '').padEnd(8);
    const retro = pos.retrograde || '';

    lines.push(`${body} ${sign} ${degree} ${house} ${retro}`);
  });

  return lines.join('\n');
}

export function formatAspectsTable(aspects: any[]): string {
  if (!aspects || !aspects.length) return 'No aspects available.';

  const lines: string[] = [];
  lines.push('PLANET 1    ASPECT        PLANET 2    ORB        APPLYING');
  lines.push('─'.repeat(60));

  aspects.forEach((asp) => {
    const p1 = (asp.planet1 || '').padEnd(11);
    const aspect = (asp.aspect || '').padEnd(13);
    const p2 = (asp.planet2 || '').padEnd(11);
    const orb = (asp.orb || '').padEnd(10);
    const applying = asp.applying || '';

    lines.push(`${p1} ${aspect} ${p2} ${orb} ${applying}`);
  });

  return lines.join('\n');
}

export function formatHouseCuspsTable(cusps: any[]): string {
  if (!cusps || !cusps.length) return 'No house cusps available.';

  const lines: string[] = [];
  lines.push('HOUSE                    SIGN          DEGREE      QUALITY    ELEMENT');
  lines.push('─'.repeat(75));

  cusps.forEach((cusp) => {
    const house = (cusp.house || '').padEnd(24);
    const sign = (cusp.sign || '').padEnd(13);
    const degree = (cusp.degree || '').padEnd(11);
    const quality = (cusp.quality || '').padEnd(10);
    const element = cusp.element || '';

    lines.push(`${house} ${sign} ${degree} ${quality} ${element}`);
  });

  return lines.join('\n');
}

export function formatDailyReadingsTable(dailyReadings: any[]): string {
  if (!dailyReadings || !dailyReadings.length) return 'No daily readings available.';

  const lines: string[] = [];
  lines.push('DATE         MAGNITUDE  VALENCE    VOLATILITY  NOTES');
  lines.push('─'.repeat(80));

  dailyReadings.forEach((day) => {
    const date = (day.date || '').padEnd(12);
    const mag = fmtAxis(day.magnitude).padEnd(10);
    const val = fmtAxis(day.valence ?? day.directional_bias).padEnd(10);
    const vol = fmtAxis(day.volatility).padEnd(11);
  const notes = day.notes || day.label || '';

  lines.push(`${date} ${mag} ${val} ${vol} ${notes}`);
  });

  return lines.join('\n');
}

export function formatSymbolicWeatherSummary(symbolicWeather: any): string {
  if (!symbolicWeather) return '';

  const lines: string[] = [];

  if (symbolicWeather.balance_meter) {
    const bm = symbolicWeather.balance_meter;
    lines.push('BALANCE METER SUMMARY');
    lines.push('─'.repeat(40));
    const magnitudeValue = extractAxisNumber(bm, 'magnitude');
    if (magnitudeValue !== undefined || bm.magnitude_label !== undefined || bm.magnitude !== undefined) {
      const magnitudeSource = magnitudeValue ?? bm.magnitude;
      lines.push(
        `Numinosity (Magnitude): ${fmtAxisLabel(bm.magnitude_label, magnitudeSource)} (${fmtAxis(
          magnitudeSource,
        )}/5)`,
      );
    }
    if (
      bm.bias_signed !== undefined ||
      bm.valence !== undefined ||
      bm.bias_label !== undefined ||
      bm.valence_label !== undefined
    ) {
      const biasAxis = extractAxisNumber(bm, 'directional_bias');
      const biasNum = biasAxis ?? bm.bias_signed ?? bm.directional_bias ?? bm.valence;
      const biasLabel =
        bm.directional_bias_label ?? bm.bias_label ?? bm.valence_label ?? bm.bias_motion;
      const biasDisp = fmtAxisLabel(biasLabel, biasNum);
      const biasNumDisp = fmtAxis(biasNum);
      lines.push(`Valence: ${biasDisp} (${biasNumDisp})`);
    }
    const volatilityValue = extractAxisNumber(bm, 'volatility');
    if (volatilityValue !== undefined || bm.volatility !== undefined || bm.volatility_label !== undefined) {
      const volatilitySource = volatilityValue ?? bm.volatility;
      lines.push(
        `Narrative Coherence (Volatility): ${fmtAxisLabel(
          bm.volatility_label,
          volatilitySource,
        )} (${fmtAxis(volatilitySource)}/5)`,
      );
    }
    // SFD deprecated: fall back to directional bias/valence when available
    const biasAxis = extractAxisNumber(bm, 'directional_bias');
    const biasNum = biasAxis ?? bm.bias_signed ?? bm.directional_bias ?? bm.valence;
    if (biasNum !== undefined && biasNum !== null) {
      lines.push(`Integration Bias (approx): ${fmtAxis(biasNum, 2)}`);
    }
    lines.push('');
  }

  if (symbolicWeather.transit_context) {
    const tc = symbolicWeather.transit_context;
    lines.push('TRANSIT CONTEXT');
    lines.push('─'.repeat(40));
    if (tc.date_range) lines.push(`Date Range: ${tc.date_range.start} to ${tc.date_range.end}`);
    if (tc.peak_dates && tc.peak_dates.length) {
      lines.push(`Peak Activity Dates: ${tc.peak_dates.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

const ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

const HOUSE_ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

const HOUSE_NAME_LOOKUP: Record<string, string> = {
  first: '1st',
  first_house: '1st House',
  second: '2nd',
  second_house: '2nd House',
  third: '3rd',
  third_house: '3rd House',
  fourth: '4th',
  fourth_house: '4th House',
  fifth: '5th',
  fifth_house: '5th House',
  sixth: '6th',
  sixth_house: '6th House',
  seventh: '7th',
  seventh_house: '7th House',
  eighth: '8th',
  eighth_house: '8th House',
  ninth: '9th',
  ninth_house: '9th House',
  tenth: '10th',
  tenth_house: '10th House',
  eleventh: '11th',
  eleventh_house: '11th House',
  twelfth: '12th',
  twelfth_house: '12th House',
};

function normalizeAngle(value: number): number {
  const mod = value % 360;
  return mod < 0 ? mod + 360 : mod;
}

function deriveSignFromDegree(degree: number | undefined, fallback?: string | null): string | null {
  if (typeof degree !== 'number' || !Number.isFinite(degree)) {
    return fallback ?? null;
  }
  const normalized = normalizeAngle(degree);
  const index = Math.floor(normalized / 30);
  return ZODIAC_SIGNS[index] || fallback || null;
}

function houseOrdinal(index: number): string {
  return HOUSE_ORDINALS[index] || `${index + 1}th`;
}

function normalizeHouseLabel(raw: any, index: number): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return `${houseOrdinal(Math.max(raw - 1, 0))} House`;
  }
  if (typeof raw !== 'string') {
    return `${houseOrdinal(index)} House`;
  }

  const cleaned = raw.trim().replace(/_/g, ' ');
  const key = cleaned.toLowerCase().replace(/\s+/g, '_');
  if (HOUSE_NAME_LOOKUP[key]) {
    const mapped = HOUSE_NAME_LOOKUP[key];
    return mapped.endsWith('House') ? mapped : `${mapped} House`;
  }
  const firstToken = key.split('_')[0];
  if (HOUSE_NAME_LOOKUP[firstToken]) {
    const mapped = HOUSE_NAME_LOOKUP[firstToken];
    return mapped.endsWith('House') ? mapped : `${mapped} House`;
  }
  return cleaned;
}

function generateKeyCandidates(rawName: string): string[] {
  const variants = new Set<string>();
  const base = rawName || '';
  variants.add(base);
  variants.add(base.replace(/\s+/g, '_'));
  variants.add(base.replace(/[\s-]+/g, '_'));
  variants.add(base.replace(/[\s-]+/g, '').toLowerCase());
  variants.add(base.toLowerCase());
  variants.add(base.toLowerCase().replace(/\s+/g, '_'));
  variants.add(base.toLowerCase().replace(/[\s-]+/g, '_'));
  variants.add(base.toLowerCase().replace(/[\s-_]+/g, ''));
  return Array.from(variants);
}

function findChartEntry(chart: any, rawName: string): any {
  if (!chart || typeof chart !== 'object') return undefined;
  const candidates = generateKeyCandidates(rawName);
  for (const candidate of candidates) {
    if (candidate in chart) {
      return chart[candidate];
    }
    const camelCandidate = candidate.replace(/_([a-z])/g, (_, chr: string) => chr.toUpperCase());
    if (camelCandidate in chart) {
      return chart[camelCandidate];
    }
  }
  return undefined;
}

function derivePositionsFromChart(chart: any): Record<string, any> | null {
  if (!chart || typeof chart !== 'object') return null;

  const rawNames: string[] = [];
  if (Array.isArray(chart.planets_names_list)) {
    rawNames.push(...chart.planets_names_list);
  }
  if (Array.isArray(chart.axial_cusps_names_list)) {
    rawNames.push(...chart.axial_cusps_names_list);
  }

  const supplementalNames = [
    'True_Node',
    'Mean_Node',
    'True_South_Node',
    'Mean_South_Node',
    'Chiron',
    'Lilith',
  ];

  supplementalNames.forEach((name) => {
    if (findChartEntry(chart, name)) {
      rawNames.push(name);
    }
  });

  const uniqueNames = Array.from(new Set(rawNames));
  const positions: Record<string, any> = {};

  uniqueNames.forEach((rawName, index) => {
    const entry = findChartEntry(chart, rawName);
    if (!entry || typeof entry !== 'object') return;

    const absPos =
      typeof entry.abs_pos === 'number'
        ? entry.abs_pos
        : typeof entry.absolute_position === 'number'
          ? entry.absolute_position
          : undefined;
    const withinSign =
      typeof entry.position === 'number'
        ? entry.position
        : typeof absPos === 'number'
          ? normalizeAngle(absPos) % 30
          : undefined;

    const sign = entry.sign || deriveSignFromDegree(absPos, null);
    const house = normalizeHouseLabel(entry.house ?? entry.house_name, index);

    positions[rawName] = {
      sign,
      degree: withinSign ?? absPos ?? null,
      house: house ?? null,
      element: entry.element || null,
      quality: entry.quality || null,
      retrograde: Boolean(
        entry.retrograde ||
          (typeof entry.motion === 'string' && entry.motion.toLowerCase().includes('retro')),
      ),
    };
  });

  return Object.keys(positions).length ? positions : null;
}

function deriveHousesFromChart(chart: any): Record<string, any> | null {
  if (!chart || typeof chart !== 'object' || !Array.isArray(chart.house_cusps)) {
    return null;
  }

  const houses: Record<string, any> = {};
  const names = Array.isArray(chart.houses_names_list) ? chart.houses_names_list : [];

  chart.house_cusps.forEach((degree: any, index: number) => {
    if (typeof degree !== 'number' || !Number.isFinite(degree)) return;
    const sign = deriveSignFromDegree(degree, null);
    const label = names[index] ? normalizeHouseLabel(names[index], index) : `${houseOrdinal(index)} House`;
    houses[label ?? `${houseOrdinal(index)} House`] = {
      sign,
      degree,
    };
  });

  return Object.keys(houses).length ? houses : null;
}

export function formatChartTables(chart: any): string {
  let md = '';

  const positions = chart?.positions ?? derivePositionsFromChart(chart);
  if (positions) {
    md += `### Planetary Positions\n\n`;
    md += `| Planet | Sign | Degree | House | Element | Quality | Retro |\n`;
    md += `|--------|------|--------|-------|---------|---------|-------|\n`;
    Object.entries(positions).forEach(([planet, data]: [string, any]) => {
      const retro = (data as any).retrograde ? 'R' : '';
      const degree = (data as any).degree;
      const degreeValue =
        typeof degree === 'number' && Number.isFinite(degree)
          ? degree
          : (data as any).abs_pos;
      md += `| ${planet} | ${(data as any).sign || '—'} | ${
        typeof degreeValue === 'number' && Number.isFinite(degreeValue)
          ? degreeValue.toFixed(2)
          : '—'
      } | ${(data as any).house || '—'} | ${(data as any).element || '—'} | ${(data as any).quality || '—'} | ${retro} |\n`;
    });
    md += `\n`;
  }

  const aspectsSource =
    Array.isArray(chart?.aspects) && chart.aspects.length > 0
      ? chart.aspects
      : Array.isArray(chart?.natal_aspects) && chart.natal_aspects.length > 0
        ? chart.natal_aspects
        : [];

  if (aspectsSource.length > 0) {
    md += `### Aspects\n\n`;
    md += `| Body 1 | Aspect | Body 2 | Orb | Type |\n`;
    md += `|--------|--------|--------|-----|------|\n`;
    aspectsSource.slice(0, 50).forEach((asp: any) => {
      const body1 = asp.body1 || asp.planet1 || asp.p1_name || asp.a_body || asp.a || '—';
      const body2 = asp.body2 || asp.planet2 || asp.p2_name || asp.b_body || asp.b || '—';
      const aspectName = asp.aspect || asp.type || asp.aspect_name || '—';
      const orbValue =
        typeof asp.orb === 'number'
          ? asp.orb
          : typeof asp.orbit === 'number'
            ? asp.orbit
            : typeof asp.orbDeg === 'number'
              ? asp.orbDeg
              : undefined;
      const aspectType = asp.type || asp.aspect_type || asp.classification || '';
      md += `| ${body1} | ${aspectName} | ${body2} | ${
        typeof orbValue === 'number' && Number.isFinite(orbValue) ? orbValue.toFixed(2) : '—'
      }° | ${aspectType || '—'} |\n`;
    });
    if (aspectsSource.length > 50) {
      md += `\n*... and ${aspectsSource.length - 50} more aspects*\n`;
    }
    md += `\n`;
  }

  const houses = chart?.houses ?? deriveHousesFromChart(chart);
  if (houses) {
    md += `### House Cusps\n\n`;
    md += `| House | Sign | Degree |\n`;
    md += `|-------|------|--------|\n`;
    Object.entries(houses).forEach(([house, data]: [string, any]) => {
      const degreeValue = (data as any).degree;
      md += `| ${house} | ${(data as any).sign || '—'} | ${
        typeof degreeValue === 'number' && Number.isFinite(degreeValue)
          ? degreeValue.toFixed(2)
          : '—'
      } |\n`;
    });
    md += `\n`;
  }

  return md;
}
