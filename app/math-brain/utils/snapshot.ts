/**
 * Snapshot utility functions for "Snapshot This Moment" feature
 */

export interface SnapshotDisplayData {
  timestamp: string;
  localTime: string;
  utcTime: string;
  location: {
    latitude: number;
    longitude: number;
    label: string;
  };
  houses?: {
    asc?: { sign: string; degree: number };
    mc?: { sign: string; degree: number };
    [key: string]: { sign: string; degree: number } | undefined;
  };
  domains: {
    label: string;
    houseNumber: number;
    planets: Array<{
      name: string;
      sign: string;
      degree: number;
    }>;
  }[];
}

type ChartDomainPlanet = {
  name: string;
  sign: string;
  degree: number;
  house: number;
};

const DOMAIN_CONFIG = [
  { label: 'Self (H1)', houseNumber: 1 },
  { label: 'Connection (H2)', houseNumber: 2 },
  { label: 'Growth (H3)', houseNumber: 3 },
  { label: 'Responsibility (H4)', houseNumber: 4 },
] as const;

const HOUSE_WORD_MAP: Record<string, number> = {
  first: 1,
  '1st': 1,
  one: 1,
  h1: 1,
  house1: 1,
  second: 2,
  '2nd': 2,
  two: 2,
  h2: 2,
  house2: 2,
  third: 3,
  '3rd': 3,
  three: 3,
  h3: 3,
  house3: 3,
  fourth: 4,
  '4th': 4,
  four: 4,
  h4: 4,
  house4: 4,
  fifth: 5,
  '5th': 5,
  five: 5,
  sixth: 6,
  '6th': 6,
  six: 6,
  seventh: 7,
  '7th': 7,
  seven: 7,
  eighth: 8,
  '8th': 8,
  eight: 8,
  ninth: 9,
  '9th': 9,
  nine: 9,
  tenth: 10,
  '10th': 10,
  ten: 10,
  eleventh: 11,
  '11th': 11,
  eleven: 11,
  twelfth: 12,
  '12th': 12,
  twelve: 12,
};

function normalizeHouseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const rounded = Math.round(value);
    return rounded >= 1 && rounded <= 12 ? rounded : null;
  }
  if (typeof value === 'string') {
    const token = value.trim();
    if (!token) return null;

    const numeric = Number.parseInt(token, 10);
    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
      return numeric;
    }

    const lowered = token.toLowerCase();
    if (HOUSE_WORD_MAP[lowered]) return HOUSE_WORD_MAP[lowered];

    const compact = lowered.replace(/[^a-z0-9]/g, '');
    if (HOUSE_WORD_MAP[compact]) return HOUSE_WORD_MAP[compact];

    const parts = lowered.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
    for (const part of parts) {
      if (HOUSE_WORD_MAP[part]) return HOUSE_WORD_MAP[part];
      const partNum = Number.parseInt(part, 10);
      if (!Number.isNaN(partNum) && partNum >= 1 && partNum <= 12) {
        return partNum;
      }
    }
  }
  return null;
}

function toChartKey(name: string): string {
  return name.replace(/[\s-]+/g, '_').toLowerCase();
}

function resolveDegree(point: any): number | null {
  if (!point || typeof point !== 'object') return null;
  const candidates = [
    point.degree,
    point.position,
    typeof point.abs_pos === 'number' ? ((point.abs_pos % 30) + 30) % 30 : null,
    point.longitude,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return null;
}

function extractChartPoint(chart: any, name: string) {
  if (!chart || typeof chart !== 'object') return null;
  const candidates = [
    name,
    name.toLowerCase(),
    toChartKey(name),
    name.replace(/[\s_]/g, '').toLowerCase(),
  ];

  for (const candidate of candidates) {
    if (candidate && candidate in chart) {
      const point = chart[candidate];
      if (point && typeof point === 'object') {
        return point;
      }
    }
  }

  return null;
}

function extractChartPlanets(chart: any): ChartDomainPlanet[] {
  if (!chart || typeof chart !== 'object') return [];

  const positions = Array.isArray(chart.positions) ? chart.positions : null;
  if (positions && positions.length > 0) {
    const mapped: Array<ChartDomainPlanet | null> = positions.map((planet: any) => {
      if (!planet || typeof planet !== 'object') return null;
      const house = normalizeHouseNumber(planet.house ?? planet.house_number);
      const degree = resolveDegree(planet);
      if (!house || typeof degree !== 'number') return null;
      return {
        name: planet.name || '',
        sign: planet.sign || planet.sign_full || '',
        degree,
        house,
      };
    });
    return mapped.filter((value): value is ChartDomainPlanet => Boolean(value));
  }

  const planetNames = Array.isArray(chart.planets_names_list) ? chart.planets_names_list : [];
  const mapped: Array<ChartDomainPlanet | null> = planetNames.map((planetName: string) => {
    const raw = extractChartPoint(chart, planetName);
    if (!raw || typeof raw !== 'object') return null;
    const house = normalizeHouseNumber(raw.house ?? raw.house_number);
    const degree = resolveDegree(raw);
    if (!house || typeof degree !== 'number') return null;
    return {
      name: raw.name || planetName,
      sign: raw.sign_full || raw.sign || '',
      degree,
      house,
    };
  });
  return mapped.filter((value): value is ChartDomainPlanet => Boolean(value));
}

export function buildDomainsFromChart(chart: any): SnapshotDisplayData['domains'] {
  const planets = extractChartPlanets(chart);

  return DOMAIN_CONFIG.map((domain) => ({
    label: domain.label,
    houseNumber: domain.houseNumber,
    planets: planets.filter((planet) => planet.house === domain.houseNumber),
  }));
}

/**
 * Format location coordinates for display
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
}

/**
 * Format timestamp for snapshot display
 */
export function formatSnapshotTimestamp(date: Date): {
  local: string;
  utc: string;
  short: string;
} {
  return {
    local: date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
    utc: date.toISOString(),
    short: date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

/**
 * Extract Woven Map domain data from snapshot result
 */
export function extractSnapshotDomains(result: any): SnapshotDisplayData['domains'] {
  return buildDomainsFromChart(result?.person_a?.chart);
}

/**
 * Extract house cusps from snapshot result
 */
export function extractSnapshotHouses(result: any) {
  const chart = result?.person_a?.chart;
  if (!chart || typeof chart !== 'object') return {};

  const ascPoint = extractChartPoint(chart, 'Ascendant');
  const mcPoint = extractChartPoint(chart, 'Medium_Coeli') || extractChartPoint(chart, 'Midheaven');

  const toHouseEntry = (point: any) => {
    if (!point || typeof point !== 'object') return undefined;
    const sign = point.sign_full || point.sign;
    const degree = resolveDegree(point);
    if (!sign || typeof degree !== 'number') return undefined;
    return { sign, degree };
  };

  const houses: Record<string, { sign: string; degree: number } | undefined> = {};

  // Extract angles
  houses.asc = toHouseEntry(extractChartPoint(chart, 'Ascendant'));
  houses.mc = toHouseEntry(extractChartPoint(chart, 'Medium_Coeli') || extractChartPoint(chart, 'Midheaven'));

  // Extract all 12 cusps
  const houseNames = [
    'First_House', 'Second_House', 'Third_House', 'Fourth_House',
    'Fifth_House', 'Sixth_House', 'Seventh_House', 'Eighth_House',
    'Ninth_House', 'Tenth_House', 'Eleventh_House', 'Twelfth_House'
  ];

  houseNames.forEach((name, index) => {
    const point = extractChartPoint(chart, name);
    if (point) {
      houses[`h${index + 1}`] = toHouseEntry(point);
    }
  });

  return houses;
}

/**
 * Create complete snapshot display data
 */
export function createSnapshotDisplay(
  result: any,
  location: { latitude: number; longitude: number; label?: string },
  timestamp: Date
): SnapshotDisplayData {
  const formattedTime = formatSnapshotTimestamp(timestamp);

  return {
    timestamp: formattedTime.short,
    localTime: formattedTime.local,
    utcTime: formattedTime.utc,
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      label: location.label || formatCoordinates(location.latitude, location.longitude),
    },
    houses: extractSnapshotHouses(result),
    domains: extractSnapshotDomains(result),
  };
}
