// Thin integration layer so the main app doesn’t import deep module internals directly.
// This preserves future flexibility (e.g., swapping build output, adding caching, validation).

import { generateSection, SectionType, InputPayload, HookObject } from '../poetic-brain/src/index';
import { validatePoeticBrainPayload } from './poetic-brain-schema';

export interface PoeticBrainAdapterOptions {
  sectionType: SectionType;
  payload: InputPayload;
}

export interface PoeticBrainAdapterResult {
  text: string;
  section: SectionType;
  generatedAt: string;
}

export function invokePoeticBrain(opts: PoeticBrainAdapterOptions): PoeticBrainAdapterResult {
  const { sectionType, payload } = opts;
  let validated: InputPayload;
  try {
    validated = validatePoeticBrainPayload(payload);
  } catch (e: any) {
    return {
      text: `[Poetic Brain validation error] ${e.message}`,
      section: sectionType,
      generatedAt: new Date().toISOString()
    };
  }
  const enrichedPayload = enrichPayload(validated);
  const text = generateSection(sectionType, enrichedPayload);
  return { text, section: sectionType, generatedAt: new Date().toISOString() };
}

function enrichPayload(payload: InputPayload): InputPayload {
  const cloned: InputPayload = { ...payload };

  if (payload.person_a) {
    cloned.person_a = enrichPerson(payload.person_a);
  }

  if (payload.person_b) {
    cloned.person_b = enrichPerson(payload.person_b);
  }

  const blueprintLine = buildBlueprintSummary(cloned);
  if (blueprintLine) {
    cloned.constitutionalClimate = blueprintLine;
  }

  const dailyReadings = Array.isArray(payload.symbolic_weather_context?.daily_readings)
    ? payload.symbolic_weather_context!.daily_readings!
    : Array.isArray((payload as any).daily_readings)
      ? (payload as any).daily_readings as any[]
      : [];

  const hookCandidates = buildHooksFromDaily(dailyReadings);
  if (hookCandidates.length) {
    cloned.hooks = hookCandidates;
  }

  if (!cloned.climateLine) {
    const climateLine = buildClimateLine(dailyReadings, hookCandidates);
    if (climateLine) {
      cloned.climateLine = climateLine;
    }
  }

  const seismograph = buildSeismograph(cloned, dailyReadings);
  if (seismograph) {
    cloned.seismograph = { ...(cloned.seismograph || {}), ...seismograph };
  }

  if (cloned.person_a && cloned.person_a.natal_chart && !cloned.person_a.chart) {
    cloned.person_a = { ...cloned.person_a, chart: cloned.person_a.natal_chart };
  }

  if (cloned.person_b && cloned.person_b.natal_chart && !cloned.person_b.chart) {
    cloned.person_b = { ...cloned.person_b, chart: cloned.person_b.natal_chart };
  }

  return cloned;
}

function enrichPerson(person: NonNullable<InputPayload['person_a']>): NonNullable<InputPayload['person_a']> {
  const enriched = { ...person };
  if (enriched.natal_chart && !enriched.chart) {
    enriched.chart = enriched.natal_chart;
  }
  if (!enriched.aspects && enriched.natal_chart && Array.isArray((enriched.natal_chart as any).aspects)) {
    enriched.aspects = (enriched.natal_chart as any).aspects;
  }
  return enriched;
}

function buildBlueprintSummary(payload: InputPayload): string | undefined {
  const segments: string[] = [];

  const personA = payload.person_a;
  const personB = payload.person_b;

  const aSummary = personA ? formatPrimaryPlacements(personA.natal_chart ?? personA.chart, personA.name || 'Person A') : undefined;
  if (aSummary) segments.push(aSummary);

  const bSummary = personB ? formatPrimaryPlacements(personB.natal_chart ?? personB.chart, personB.name || 'Person B') : undefined;
  if (bSummary) segments.push(bSummary);

  if (!segments.length) return undefined;
  return segments.join(' | ');
}

function formatPrimaryPlacements(chart: any, label: string): string | undefined {
  if (!chart || typeof chart !== 'object') return undefined;

  const placements: string[] = [];
  const sun = pickPlacement(chart, 'sun') || pickPlacement(chart, 'Sun');
  const moon = pickPlacement(chart, 'moon') || pickPlacement(chart, 'Moon');
  const ascendant = pickPlacement(chart, 'ascendant') || pickPlacement(chart, 'Ascendant') || pickPlacement(chart, 'rising');

  const sunLine = describePlacement('Sun', sun);
  if (sunLine) placements.push(sunLine);
  const moonLine = describePlacement('Moon', moon);
  if (moonLine) placements.push(moonLine);
  const risingLine = describePlacement('Rising', ascendant);
  if (risingLine) placements.push(risingLine);

  if (!placements.length) return undefined;
  return `${label} — ${placements.join(', ')}`;
}

function pickPlacement(chart: any, key: string): any {
  if (!chart || typeof chart !== 'object') return undefined;
  if (chart[key] !== undefined) return chart[key];
  const lowerKey = key.toLowerCase();
  if (chart[lowerKey] !== undefined) return chart[lowerKey];
  const planets = chart.planets || chart.planetary_positions;
  if (planets && typeof planets === 'object') {
    if (planets[key] !== undefined) return planets[key];
    if (planets[lowerKey] !== undefined) return planets[lowerKey];
    const capitalized = capitalizeFirst(lowerKey);
    if (planets[capitalized] !== undefined) return planets[capitalized];
  }
  return undefined;
}

function describePlacement(label: string, data: any): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const sign = expandSign(data.sign || data.zodiac || data.sign_name || data.signSymbol || data.signText);
  const degree = extractDegree(data);

  if (!sign && degree === undefined) {
    return undefined;
  }

  const parts: string[] = [];
  if (sign) parts.push(sign);
  if (degree !== undefined) parts.push(formatDegree(degree));

  if (!parts.length) {
    return undefined;
  }

  const retrograde = typeof data.retrograde === 'boolean' && data.retrograde ? ' (retrograde)' : '';
  return `${label} ${parts.join(' ')}${retrograde}`.trim();
}

function expandSign(sign: unknown): string | undefined {
  if (!sign || typeof sign !== 'string') return undefined;
  const key = sign.trim().toLowerCase();
  const mapping: Record<string, string> = {
    ari: 'Aries', aries: 'Aries',
    tau: 'Taurus', taurus: 'Taurus',
    gem: 'Gemini', gemini: 'Gemini',
    can: 'Cancer', cancer: 'Cancer',
    leo: 'Leo',
    vir: 'Virgo', virgo: 'Virgo',
    lib: 'Libra', libra: 'Libra',
    sco: 'Scorpio', scorpio: 'Scorpio',
    sag: 'Sagittarius', sagittarius: 'Sagittarius',
    cap: 'Capricorn', capricorn: 'Capricorn',
    aqu: 'Aquarius', aquarius: 'Aquarius',
    pis: 'Pisces', pisces: 'Pisces'
  };
  return mapping[key] || capitalizeFirst(sign.trim());
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function extractDegree(data: any): number | undefined {
  const candidateKeys = ['degree', 'degree_decimal', 'degree_float', 'position'];
  for (const key of candidateKeys) {
    const value = data?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return normalizeDegree(value);
    }
  }
  const abs = data?.abs_pos;
  if (typeof abs === 'number' && Number.isFinite(abs)) {
    return normalizeDegree(abs % 30);
  }
  return undefined;
}

function normalizeDegree(value: number): number {
  if (!Number.isFinite(value)) return value;
  if (value >= 360 || value <= -360) {
    return normalizeDegree(value % 360);
  }
  if (value >= 30 || value <= -30) {
    const mod = value % 30;
    return mod < 0 ? mod + 30 : mod;
  }
  return value < 0 ? value + 30 : value;
}

function formatDegree(value: number): string {
  return `${value.toFixed(1)}°`;
}

interface HookCandidate {
  hook: HookObject;
  potency?: number;
  orb?: number;
}

function buildHooksFromDaily(readings: Array<Record<string, any>>): HookObject[] {
  const candidates: HookCandidate[] = [];

  for (const reading of readings) {
    const date = typeof reading?.date === 'string' ? reading.date : undefined;
    const aspects = Array.isArray(reading?.aspects) ? reading.aspects : [];

    for (const aspect of aspects) {
      const label = formatAspectLabel(date, aspect);
      if (!label) continue;

      const orbValue = extractNumber(aspect, ['orb', 'orb_degrees', 'orb_deg', 'orb_abs']);
      const potency = extractNumber(aspect, ['potency', 'weight', 'strength', 'score']);
      const exact = typeof orbValue === 'number' ? Math.abs(orbValue) < 0.2 : undefined;
      const retrograde = aspect?.retrograde_involved ?? aspect?.retrograde ?? aspect?.is_retrograde;

      const hook: HookObject = { label };
      if (typeof orbValue === 'number' && Number.isFinite(orbValue)) {
        hook.orb = Math.abs(orbValue);
      }
      if (exact) hook.exact = true;
      if (typeof retrograde === 'boolean') hook.retrograde_involved = retrograde;

      candidates.push({ hook, potency, orb: typeof hook.orb === 'number' ? hook.orb : undefined });
    }
  }

  candidates.sort((a, b) => {
    if (b.potency !== undefined && a.potency !== undefined && b.potency !== a.potency) {
      return (b.potency ?? 0) - (a.potency ?? 0);
    }
    if (b.potency !== undefined && a.potency === undefined) return 1;
    if (a.potency !== undefined && b.potency === undefined) return -1;
    if (a.orb !== undefined && b.orb !== undefined && a.orb !== b.orb) {
      return a.orb - b.orb;
    }
    return a.hook.label.localeCompare(b.hook.label);
  });

  return candidates.slice(0, 3).map((candidate) => candidate.hook);
}

function formatAspectLabel(date: string | undefined, aspect: Record<string, any>): string | undefined {
  const from = aspect?.planet_1 || aspect?.from || aspect?.transit || aspect?.transit_body || aspect?.transitPlanet || aspect?.transit_source;
  const to = aspect?.planet_2 || aspect?.to || aspect?.natal || aspect?.natal_body || aspect?.natalPlanet || aspect?.target;
  const symbolRaw = aspect?.symbol || aspect?.type || aspect?.aspect || aspect?.angle;

  if (!from || !to) {
    return undefined;
  }

  const symbol = describeAspectSymbol(symbolRaw);
  const datePrefix = date ? `${date} — ` : '';

  const orbValue = extractNumber(aspect, ['orb', 'orb_degrees', 'orb_deg', 'orb_abs']);
  const orbText = typeof orbValue === 'number' && Number.isFinite(orbValue)
    ? ` (${Math.abs(orbValue).toFixed(1)}°)`
    : '';

  return `${datePrefix}${from} ${symbol} ${to}${orbText}`.trim();
}

function describeAspectSymbol(symbol: unknown): string {
  if (!symbol || typeof symbol !== 'string') return 'links';
  const trimmed = symbol.trim();
  const lower = trimmed.toLowerCase();
  const mappings: Record<string, string> = {
    '□': 'square', 'square': 'square', 'sq': 'square',
    '△': 'trine', '∆': 'trine', 'trine': 'trine', 'tri': 'trine',
    '⚹': 'sextile', 'sextile': 'sextile', 'sex': 'sextile',
    '☌': 'conjunction', 'conjunction': 'conjunction', 'cnj': 'conjunction',
    '☍': 'opposition', 'opposition': 'opposition', 'opp': 'opposition',
    'quincunx': 'quincunx', 'qun': 'quincunx', 'inc': 'quincunx'
  };
  return mappings[lower] || mappings[trimmed] || trimmed;
}

function extractNumber(source: Record<string, any>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function buildClimateLine(readings: Array<Record<string, any>>, hooks: HookObject[]): string | undefined {
  if (hooks.length) {
    return `Symbolic weather centers on ${hooks[0].label}.`;
  }

  const first = readings.find((day) => typeof day?.date === 'string' && typeof day?.magnitude === 'number');
  if (!first) return undefined;

  const mag = typeof first.magnitude === 'number' ? first.magnitude.toFixed(1) : '—';
  const bias = typeof first.directional_bias === 'number'
    ? first.directional_bias.toFixed(1)
    : typeof first.directional_bias_x10 === 'number'
      ? (first.directional_bias_x10 / 10).toFixed(1)
      : '—';
  return `Symbolic weather snapshot for ${first.date}: magnitude ${mag}, directional bias ${bias}.`;
}

function buildSeismograph(payload: InputPayload, readings: Array<Record<string, any>>): Record<string, any> | undefined {
  const existing = { ...(payload.seismograph || {}) };

  const meter = payload.balance_meter;
  if (meter) {
    if (existing.magnitude === undefined) existing.magnitude = pickNumber(meter.magnitude, meter.magnitude_0to5);
    const bias = pickNumber(meter.directional_bias, meter.directional_bias_x10 !== undefined ? meter.directional_bias_x10 / 10 : undefined);
    if (existing.valence === undefined && bias !== undefined) {
      existing.valence = bias;
    }
    if (existing.coherence === undefined) {
      existing.coherence = pickNumber(meter.coherence, meter.coherence_0to5);
    }
  }

  const firstReading = readings.find((day) => typeof day?.magnitude === 'number' || typeof day?.directional_bias === 'number');
  if (firstReading) {
    if (existing.magnitude === undefined && typeof firstReading.magnitude === 'number') {
      existing.magnitude = firstReading.magnitude;
    }
    const dirBias = pickNumber(
      typeof firstReading.directional_bias === 'number' ? firstReading.directional_bias : undefined,
      typeof firstReading.directional_bias_x10 === 'number' ? firstReading.directional_bias_x10 / 10 : undefined
    );
    if (existing.valence === undefined && dirBias !== undefined) {
      existing.valence = dirBias;
    }
    const coherence = pickNumber(
      typeof firstReading.coherence === 'number' ? firstReading.coherence : undefined,
      typeof firstReading.coherence_x10 === 'number' ? firstReading.coherence_x10 / 10 : undefined
    );
    if (existing.coherence === undefined && coherence !== undefined) {
      existing.coherence = coherence;
    }
  }

  return Object.keys(existing).length ? existing : undefined;
}

function pickNumber(...values: Array<number | undefined>): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}
