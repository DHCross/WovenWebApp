/**
 * Lightweight parser for AstroSeek exports. Converts the plain-text blob
 * into placement and aspect tables that downstream renderers can work with.
 */
export interface AstroSeekPlacement {
  body: string;
  sign?: string;
  degree?: number;
  minute?: number;
  house?: number;
  retrograde?: boolean;
  raw?: string;
}

export interface AstroSeekAspect {
  from: string;
  to: string;
  type: string;
  orb?: number;
  raw?: string;
}

export interface AstroSeekLocation {
  city: string;
  country: string;
  lat: number;
  long: number;
  raw: string;
}

export interface AstroSeekParseResult {
  placements: AstroSeekPlacement[];
  aspects: AstroSeekAspect[];
  location?: AstroSeekLocation;
  transitLocation?: AstroSeekLocation;
  snippet: string;
  raw: string;
}

const SIGN_ALIASES: Record<string, string> = {
  aries: 'Aries',
  ari: 'Aries',
  taurus: 'Taurus',
  tau: 'Taurus',
  gemini: 'Gemini',
  gem: 'Gemini',
  cancer: 'Cancer',
  can: 'Cancer',
  leo: 'Leo',
  virgo: 'Virgo',
  vir: 'Virgo',
  libra: 'Libra',
  lib: 'Libra',
  scorpio: 'Scorpio',
  sco: 'Scorpio',
  sagittarius: 'Sagittarius',
  sag: 'Sagittarius',
  capricorn: 'Capricorn',
  cap: 'Capricorn',
  aquarius: 'Aquarius',
  aqu: 'Aquarius',
  pisces: 'Pisces',
  pis: 'Pisces',
};

const BODY_ALIASES: Record<string, string> = {
  'sun': 'Sun',
  'moon': 'Moon',
  'mercury': 'Mercury',
  'venus': 'Venus',
  'mars': 'Mars',
  'jupiter': 'Jupiter',
  'saturn': 'Saturn',
  'uranus': 'Uranus',
  'neptune': 'Neptune',
  'pluto': 'Pluto',
  'chiron': 'Chiron',
  'ceres': 'Ceres',
  'pallas': 'Pallas',
  'juno': 'Juno',
  'vesta': 'Vesta',
  'north node': 'North Node',
  'true node': 'North Node',
  'node': 'North Node',
  'south node': 'South Node',
  'lilith': 'Lilith',
  'black moon lilith': 'Lilith',
  'mean lilith': 'Lilith',
  'ascendant': 'Ascendant',
  'asc': 'Ascendant',
  'asc.': 'Ascendant',
  'rising': 'Ascendant',
  'descendant': 'Descendant',
  'dsc': 'Descendant',
  'midheaven': 'Midheaven',
  'mc': 'Midheaven',
  'imum coeli': 'Imum Coeli',
  'ic': 'Imum Coeli',
  'part of fortune': 'Part of Fortune',
  'fortune': 'Part of Fortune',
};

const ASPECT_ALIASES: Record<string, string> = {
  conjunction: 'Conjunction',
  conjunct: 'Conjunction',
  conj: 'Conjunction',
  opposition: 'Opposition',
  oppose: 'Opposition',
  opp: 'Opposition',
  square: 'Square',
  sq: 'Square',
  trine: 'Trine',
  tri: 'Trine',
  sextile: 'Sextile',
  sext: 'Sextile',
  quincunx: 'Quincunx',
  inconjunct: 'Quincunx',
  inconj: 'Quincunx',
};

const BODY_ALIAS_ENTRIES = Object.entries(BODY_ALIASES).sort((a, b) => b[0].length - a[0].length);
const SIGN_ALIAS_ENTRIES = Object.entries(SIGN_ALIASES).sort((a, b) => b[0].length - a[0].length);
const BODY_PATTERN = BODY_ALIAS_ENTRIES.map(([alias]) => escapeRegExp(alias)).join('|');

const ASPECT_REGEX = new RegExp(
  `\\b(${BODY_PATTERN})\\b[^\\n]{0,40}?\\b(conjunction|conjunct|conj|opposition|oppose|opp|square|sq|trine|tri|sextile|sext|quincunx|inconjunct|inconj)\\b[^\\n]{0,40}?\\b(${BODY_PATTERN})\\b([^\\n]*)`,
  'gi',
);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normaliseBody(raw: string): string | undefined {
  const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return BODY_ALIASES[key];
}

function normaliseSign(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return SIGN_ALIASES[key];
}

function extractDegree(segment: string): { degree?: number; minute?: number } {
  const degreeMatch = segment.match(/(\d{1,2})\s*[°º]?\s*(\d{1,2})?/);
  if (!degreeMatch) return {};
  const degree = Number.parseInt(degreeMatch[1], 10);
  const minute = degreeMatch[2] ? Number.parseInt(degreeMatch[2], 10) : undefined;
  if (!Number.isFinite(degree)) return {};
  return { degree, minute };
}

function extractHouse(segment: string): number | undefined {
  const houseMatch = segment.match(/(?:house|\bH)(\d{1,2})/i);
  if (houseMatch) {
    const val = Number.parseInt(houseMatch[1], 10);
    if (val >= 1 && val <= 12) return val;
  }
  const ordinalMatch = segment.match(/(\d{1,2})(?:st|nd|rd|th)\s+house/i);
  if (ordinalMatch) {
    const val = Number.parseInt(ordinalMatch[1], 10);
    if (val >= 1 && val <= 12) return val;
  }
  return undefined;
}

function detectBodyFromLine(line: string): string | undefined {
  const lower = line.toLowerCase();
  for (const [alias, canonical] of BODY_ALIAS_ENTRIES) {
    if (!lower.startsWith(alias)) continue;
    const nextChar = lower.charAt(alias.length);
    if (nextChar && /[a-z0-9]/i.test(nextChar)) {
      continue;
    }
    return canonical;
  }
  return undefined;
}

function detectSignFromLine(line: string): string | undefined {
  const lower = line.toLowerCase();
  for (const [alias, canonical] of SIGN_ALIAS_ENTRIES) {
    const index = lower.indexOf(alias);
    if (index === -1) continue;
    const before = index > 0 ? lower.charAt(index - 1) : '';
    const after = lower.charAt(index + alias.length);
    const boundaryBefore = !before || /[^a-z0-9]/i.test(before);
    const boundaryAfter = !after || /[^a-z0-9]/i.test(after);
    if (boundaryBefore && boundaryAfter) {
      return canonical;
    }
  }
  return undefined;
}

function extractOrb(fragment: string): number | undefined {
  const orbMatch = fragment.match(/(\d{1,2})\s*[°º]\s*(\d{1,2})?/);
  if (!orbMatch) return undefined;
  const degree = Number.parseInt(orbMatch[1], 10);
  const minute = orbMatch[2] ? Number.parseInt(orbMatch[2], 10) : 0;
  if (!Number.isFinite(degree)) return undefined;
  return degree + minute / 60;
}

function toDecimal(degree?: number, minute?: number): number | undefined {
  if (degree === undefined) return undefined;
  const deg = Number.isFinite(degree) ? degree : undefined;
  if (deg === undefined) return undefined;
  if (minute === undefined || !Number.isFinite(minute)) return deg;
  return deg + minute / 60;
}

function parseCoordinate(coord: string): number | undefined {
  // 40°1'N or 75°18'W
  const match = coord.match(/(\d+)[°º](\d+)'([NSEW])/i);
  if (!match) return undefined;
  const deg = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const dir = match[3].toUpperCase();
  let val = deg + min / 60;
  if (dir === 'S' || dir === 'W') val = -val;
  return val;
}

function extractLocationFromBlock(block: string): AstroSeekLocation | undefined {
  // Latitude, Longitude:40°1'N, 75°18'W
  const latLongMatch = block.match(/Latitude,\s*Longitude:\s*(\d+[°º]\d+'[NS]),\s*(\d+[°º]\d+'[EW])/i);

  if (!latLongMatch) return undefined;

  const lat = parseCoordinate(latLongMatch[1]);
  const long = parseCoordinate(latLongMatch[2]);

  if (lat === undefined || long === undefined) return undefined;

  let city = 'Unknown';
  let country = 'Unknown';

  // Format 1: City (Country):United States Bryn Mawr (US), PA
  const combinedMatch = block.match(/(?:City\s*\(Country\)|City,\s*Country):\s*([^(\n]+(?:\([^)]+\))?(?:,\s*\w+)?)/i);

  if (combinedMatch) {
    let fullCityRaw = combinedMatch[1].trim();
    // Clean up city string if it has "United States" prefix often seen in AstroSeek
    if (fullCityRaw.startsWith('United States ')) {
      city = fullCityRaw.replace('United States ', '');
      country = 'United States';
    } else {
      city = fullCityRaw;
    }
  } else {
    // Format 2: City:Value \n Country:Value
    const cityMatch = block.match(/City:\s*([^\n\r]+)/i);
    const countryMatch = block.match(/Country:\s*([^\n\r]+)/i);

    if (cityMatch) {
      city = cityMatch[1].trim();
    }
    if (countryMatch) {
      country = countryMatch[1].trim();
    }
  }

  return {
    city,
    country,
    lat,
    long,
    raw: block.trim()
  };
}

/**
 * Parse an AstroSeek export blob into placements and aspects.
 */
export function parseAstroSeekBlob(textBlob: string): AstroSeekParseResult {
  const placements: AstroSeekPlacement[] = [];
  const seenBodies = new Set<string>();
  const lines = textBlob.split(/\r?\n/);

  // Split into blocks to handle natal vs transit sections
  // Transit charts usually start with "Transit chart" or similar
  const transitIndex = lines.findIndex(l => /Transit chart/i.test(l));

  const natalLines = transitIndex === -1 ? lines : lines.slice(0, transitIndex);
  const transitLines = transitIndex === -1 ? [] : lines.slice(transitIndex);

  const natalBlock = natalLines.join('\n');
  const transitBlock = transitLines.join('\n');

  const location = extractLocationFromBlock(natalBlock);
  const transitLocation = extractLocationFromBlock(transitBlock);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const body = detectBodyFromLine(trimmed);
    if (body && !seenBodies.has(body)) {
      const sign = detectSignFromLine(trimmed);
      const vicinity = sign
        ? trimmed.slice(Math.max(0, trimmed.toLowerCase().indexOf(sign.toLowerCase()) - 12), trimmed.length)
        : trimmed;
      const { degree, minute } = extractDegree(vicinity);
      const house = extractHouse(trimmed);
      const retrograde = /(\bR\b|retrograde)/i.test(trimmed);
      placements.push({
        body,
        sign,
        degree: toDecimal(degree, minute),
        minute,
        house,
        retrograde,
        raw: trimmed,
      });
      seenBodies.add(body);
      continue;
    }
  }

  const aspects: AstroSeekAspect[] = [];
  const seenAspects = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = ASPECT_REGEX.exec(textBlob)) !== null) {
    const [, fromRaw, typeRaw, toRaw, trailing] = match;
    const from = normaliseBody(fromRaw);
    const to = normaliseBody(toRaw);
    const type = ASPECT_ALIASES[typeRaw.toLowerCase()] || undefined;
    if (!from || !to || !type) continue;
    const key = [from, type, to].sort().join('|');
    if (seenAspects.has(key)) continue;
    const orb = extractOrb(trailing ?? '');
    aspects.push({ from, to, type, orb, raw: match[0].trim() });
    seenAspects.add(key);
  }

  return {
    placements,
    aspects,
    location,
    transitLocation,
    snippet: textBlob.trim().slice(0, 240),
    raw: textBlob,
  };
}
