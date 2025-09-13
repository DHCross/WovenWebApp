/** Coordinate parsing utilities (DMS + decimal) */

export type ParsedCoords = { lat: number; lon: number };
export type ParseOptions = {
  rejectZeroZero?: boolean; // optionally reject 0,0 as invalid
};

/**
 * Parse latitude/longitude from a single text input.
 * Accepted examples (case-insensitive, spaces optional):
 *  - 40°1'N, 75°18'W
 *  - 40 1 N, 75 18 W
 *  - 40.7128, -74.006
 */
export function parseCoordinates(input: string, opts: ParseOptions = {}): ParsedCoords | null {
  if (!input) return null;
  const raw = input.trim();

  // Try decimal form first: "lat, lon"
  const dec = raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,\s]+\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (dec) {
    const lat = Number(dec[1]);
    const lon = Number(dec[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    if (opts.rejectZeroZero && lat === 0 && lon === 0) return null;
    return { lat, lon };
  }

  // Normalize degree symbol variants and separators
  const norm = raw
    .replace(/[°º]/g, '°')
    .replace(/'/g, '′')
    .replace(/"/g, '″')
    .replace(/\s+/g, ' ')
    .trim();

  // Split pair by comma or by double-space if user used space separator without comma
  let parts = norm.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length !== 2) {
    // attempt split by multiple spaces
    const tokens = norm.split(' ');
    // Heuristic: lat chunk ends with N/S, lon chunk ends with E/W
    const idxN = tokens.findIndex(t => /[NS]$/i.test(t));
    if (idxN > -1 && idxN < tokens.length - 1) {
      const latStr = tokens.slice(0, idxN + 1).join(' ');
      const lonStr = tokens.slice(idxN + 1).join(' ');
      parts = [latStr, lonStr];
    }
    if (parts.length !== 2) return null;
  }

  const lat = parseDms(parts[0], ['N', 'S']);
  const lon = parseDms(parts[1], ['E', 'W']);
  if (lat == null || lon == null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  if (opts.rejectZeroZero && lat === 0 && lon === 0) return null;
  return { lat, lon };
}

function parseDms(part: string, hemis: [string, string] | string[]): number | null {
  const p = part
    .toUpperCase()
    .replace(/[°º]/g, '°')
    .replace(/'/g, '′')
    .replace(/"/g, '″')
    .replace(/[^0-9NSEW°′″\s\.\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Patterns:
  //  - 40°1′30″N
  //  - 40 1 30 N
  //  - 40°1′N
  //  - 40 1 N
  //  - 40N
  // Extract numbers and hemisphere
  const hemiMatch = p.match(/([NSEW])$/);
  const hemi = hemiMatch ? hemiMatch[1] : undefined;
  const nums = p.replace(/[NSEW]$/, '').trim();

  // Degrees Minutes Seconds separated by non-digits
  const dms = nums.split(/[°′″\s]+/).filter(Boolean).map(Number);
  if (!dms.length) return null;
  const deg = dms[0];
  const min = dms[1] || 0;
  const sec = dms[2] || 0;
  if ([deg, min, sec].some(n => Number.isNaN(n))) return null;
  if (min < 0 || min >= 60 || sec < 0 || sec >= 60) return null;
  let val = Math.abs(deg) + Math.abs(min) / 60 + Math.abs(sec) / 3600;

  if (hemi) {
    if (hemi === 'S' || hemi === 'W') val = -val;
  } else if (deg < 0) {
    // Allow signed degrees without hemisphere
    val = -val;
  }

  // Do not clamp; caller validates ranges strictly
  return val;
}

function clampLat(v: number): number { return Math.max(-90, Math.min(90, v)); }
function clampLon(v: number): number { return Math.max(-180, Math.min(180, v)); }

export function formatDecimal(lat: number, lon: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}
