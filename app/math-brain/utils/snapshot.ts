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
  const domains = [
    { label: 'Self (H1)', houseNumber: 1 },
    { label: 'Connection (H2)', houseNumber: 2 },
    { label: 'Growth (H3)', houseNumber: 3 },
    { label: 'Responsibility (H4)', houseNumber: 4 },
  ];

  const positions = result?.person_a?.chart?.positions || [];

  return domains.map(domain => ({
    ...domain,
    planets: positions
      .filter((p: any) => p.house === domain.houseNumber)
      .map((p: any) => ({
        name: p.name,
        sign: p.sign,
        degree: p.degree,
      })),
  }));
}

/**
 * Extract house cusps from snapshot result
 */
export function extractSnapshotHouses(result: any) {
  const houses = result?.person_a?.chart?.houses || {};
  return {
    asc: houses.asc ? { sign: houses.asc.sign, degree: houses.asc.degree } : undefined,
    mc: houses.mc ? { sign: houses.mc.sign, degree: houses.mc.degree } : undefined,
  };
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
