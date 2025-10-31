export interface OverflowDetail {
  magnitude_delta: number | null;
  directional_delta: number | null;
  drivers: string[];
  note: string;
}

const OVERFLOW_NOTE =
  'Raw readings exceeded the ±5 normalized scale; values above are clamped for display.';

const MAX_DRIVERS = 4;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const parseFiniteNumber = (value: unknown): number | null => {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const roundDelta = (value: number): number => {
  // Normalize floating point jitter to four decimals to match export formatting
  return Math.round(value * 10_000) / 10_000;
};

const computeDelta = (
  raw: number | null | undefined,
  clamped: number | null | undefined,
): number | null => {
  if (!isFiniteNumber(raw) || !isFiniteNumber(clamped)) {
    return null;
  }
  const delta = raw - clamped;
  if (!Number.isFinite(delta) || delta === 0) {
    return null;
  }
  const rounded = roundDelta(delta);
  if (rounded === 0) {
    return null;
  }
  return rounded;
};

interface SanitizedName {
  value: string;
  usedFallback: boolean;
}

const sanitizeName = (value: unknown, fallback: string): SanitizedName => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return { value: trimmed, usedFallback: false };
    }
  }
  return { value: fallback, usedFallback: true };
};

const sanitizeOwner = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return '';
};

const aspectLabel = (aspect: any): string | null => {
  const primary = sanitizeName(aspect?.p1_name ?? aspect?.subject, 'Body A');
  const primaryOwner = sanitizeOwner(aspect?.p1_owner);
  const secondary = sanitizeName(aspect?.p2_name ?? aspect?.target, 'Body B');
  const secondaryOwner = sanitizeOwner(aspect?.p2_owner);
  const label = sanitizeName(aspect?.aspect ?? aspect?.type, 'link');

  if (primary.usedFallback && secondary.usedFallback && label.usedFallback) {
    return null;
  }

  const primaryText = primaryOwner ? `${primary.value}(${primaryOwner})` : primary.value;
  const secondaryText = secondaryOwner ? `${secondary.value}(${secondaryOwner})` : secondary.value;

  return `${primaryText} ▻ ${secondaryText} ${label.value}`;
};

const scoreAspect = (aspect: any): number | null => {
  const orbit =
    parseFiniteNumber(aspect?.orbit) ??
    parseFiniteNumber(aspect?.orb) ??
    parseFiniteNumber(aspect?.tightness) ??
    parseFiniteNumber(aspect?.score);

  if (!isFiniteNumber(orbit)) {
    return null;
  }

  // Smaller absolute orbit indicates a tighter influence; invert for ascending sort
  return -Math.abs(orbit);
};

const buildDrivers = (aspects: unknown): string[] => {
  if (!Array.isArray(aspects) || aspects.length === 0) {
    return [];
  }

  const formatted = aspects
    .map((aspect) => {
      if (!aspect || typeof aspect !== 'object') {
        return null;
      }

      const score = scoreAspect(aspect);
      if (score == null || !Number.isFinite(score)) {
        return null;
      }

      const label = aspectLabel(aspect);
      if (!label) {
        return null;
      }

      return { text: label, score };
    })
    .filter((item): item is { text: string; score: number } => !!item);

  const unique = new Map<string, number>();
  for (const item of formatted) {
    if (!unique.has(item.text) || (unique.get(item.text) ?? 0) < item.score) {
      unique.set(item.text, item.score);
    }
  }

  return Array.from(unique.entries())
    .sort((a, b) => a[1] - b[1])
    .slice(0, MAX_DRIVERS)
    .map(([text]) => text);
};

const isValidDrivers = (drivers: string[]): boolean =>
  Array.isArray(drivers) &&
  drivers.length <= MAX_DRIVERS &&
  drivers.every((driver) => typeof driver === 'string' && driver.trim().length > 0);

export const firstFinite = (...values: unknown[]): number | null => {
  for (const candidate of values) {
    const parsed = sanitizeMetricValue(candidate);
    if (parsed != null) {
      return parsed;
    }
  }
  return null;
};

export const isValidOverflowDetail = (detail: OverflowDetail | null): detail is OverflowDetail => {
  if (!detail) return false;

  const { magnitude_delta: mag, directional_delta: dir, drivers, note } = detail;
  const magOk = mag === null || isFiniteNumber(mag);
  const dirOk = dir === null || isFiniteNumber(dir);
  const hasOverflow = (mag ?? 0) !== 0 || (dir ?? 0) !== 0;

  if (!magOk || !dirOk || !hasOverflow) {
    return false;
  }

  if (!isValidDrivers(drivers)) {
    return false;
  }

  return typeof note === 'string' && note.trim().length > 0;
};

export interface OverflowDetailInput {
  rawMagnitude: number | null | undefined;
  clampedMagnitude: number | null | undefined;
  rawDirectionalBias: number | null | undefined;
  clampedDirectionalBias: number | null | undefined;
  aspects?: unknown;
}

export const computeOverflowDetail = ({
  rawMagnitude,
  clampedMagnitude,
  rawDirectionalBias,
  clampedDirectionalBias,
  aspects,
}: OverflowDetailInput): OverflowDetail | null => {
  const magnitude_delta = computeDelta(rawMagnitude, clampedMagnitude);
  const directional_delta = computeDelta(rawDirectionalBias, clampedDirectionalBias);

  if (magnitude_delta == null && directional_delta == null) {
    return null;
  }

  const drivers = buildDrivers(aspects);
  const detail: OverflowDetail = {
    magnitude_delta,
    directional_delta,
    drivers,
    note: OVERFLOW_NOTE,
  };

  return isValidOverflowDetail(detail) ? detail : null;
};

export const sanitizeMetricValue = (value: unknown): number | null => parseFiniteNumber(value);

export const OVERFLOW_NOTE_TEXT = OVERFLOW_NOTE;

export interface SeismographLike {
  magnitude?: unknown;
  rawMagnitude?: unknown;
  magnitude_before_clamp?: unknown;
  originalMagnitude?: unknown;
  directional_bias?: any;
  rawDirectionalBias?: unknown;
  axes?: {
    magnitude?: { raw?: unknown; value?: unknown; scaled?: unknown };
    directional_bias?: { raw?: unknown; value?: unknown };
  };
  aspects?: unknown;
}

export interface DayDataLike {
  seismograph?: SeismographLike | null;
  aspects?: unknown;
}

const extractDirectionalBias = (source: any): number | null => {
  if (!source) return null;
  if (isFiniteNumber(source)) return source;
  if (isFiniteNumber(source?.value)) return source.value;
  return firstFinite(
    source?.abs != null && source?.sign != null ? source.sign * source.abs : null,
    source?.signed,
    source?.bias,
    source?.bias_signed,
    source?.valence,
    source?.valence_bounded,
    source?.axes?.directional_bias?.value,
  );
};

const extractRawDirectionalBias = (source: any): number | null => {
  if (!source) return null;
  if (isFiniteNumber(source)) return source;
  if (isFiniteNumber(source?.raw)) return source.raw;
  if (isFiniteNumber(source?.value)) return source.value;
  if (isFiniteNumber(source?.normalized)) {
    return source.normalized * 5;
  }
  return firstFinite(
    source?.sources?.raw,
    source?.rawDirectionalBias,
    source?.axes?.directional_bias?.raw,
    source?.raw,
  );
};

const extractMagnitude = (source: SeismographLike | null | undefined): number | null => {
  if (!source) return null;
  return firstFinite(
    source.magnitude,
    source?.axes?.magnitude?.value,
    source?.rawMagnitude,
    source?.originalMagnitude,
  );
};

const extractRawMagnitude = (source: SeismographLike | null | undefined): number | null => {
  if (!source) return null;
  return firstFinite(
    source.rawMagnitude,
    source.magnitude_before_clamp,
    source?.axes?.magnitude?.raw,
    source?.axes?.magnitude?.scaled,
  );
};

export const computeOverflowDetailFromDay = (day: DayDataLike | null | undefined): OverflowDetail | null => {
  if (!day || !day.seismograph) {
    return null;
  }

  const seismo = day.seismograph;

  const rawMagnitude = extractRawMagnitude(seismo);
  const clampedMagnitude = extractMagnitude(seismo);

  const rawDirectionalBias = extractRawDirectionalBias(seismo.directional_bias ?? seismo);
  const clampedDirectionalBias = extractDirectionalBias(seismo.directional_bias ?? seismo);

  const aspects = Array.isArray(day.aspects)
    ? day.aspects
    : Array.isArray(seismo.aspects)
    ? seismo.aspects
    : undefined;

  return computeOverflowDetail({
    rawMagnitude,
    clampedMagnitude,
    rawDirectionalBias,
    clampedDirectionalBias,
    aspects,
  });
};
