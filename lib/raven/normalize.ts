import type { AstroSeekParseResult, AstroSeekPlacement, AstroSeekAspect } from './parser';

export interface NormalizedPlacement {
  body: string;
  sign?: string;
  degree?: number;
  house?: number;
  retrograde?: boolean;
  raw?: string;
}

export interface NormalizedAspect {
  from: string;
  to: string;
  type: string;
  orb?: number;
  raw?: string;
}

export interface GeometrySummary {
  elementTotals: Record<string, number>;
  modalityTotals: Record<string, number>;
  dominantElement?: string;
  dominantModality?: string;
  luminaries: {
    sun?: string;
    moon?: string;
    ascendant?: string;
  };
  retrogradeBodies: string[];
}

export interface NormalizedGeometry {
  placements: NormalizedPlacement[];
  aspects: NormalizedAspect[];
  summary: GeometrySummary;
  snippet: string;
  raw: string;
  normalizedFrom: AstroSeekParseResult;
}

const SIGN_DETAILS: Record<string, { element: 'Fire' | 'Earth' | 'Air' | 'Water'; modality: 'Cardinal' | 'Fixed' | 'Mutable' }> = {
  Aries: { element: 'Fire', modality: 'Cardinal' },
  Taurus: { element: 'Earth', modality: 'Fixed' },
  Gemini: { element: 'Air', modality: 'Mutable' },
  Cancer: { element: 'Water', modality: 'Cardinal' },
  Leo: { element: 'Fire', modality: 'Fixed' },
  Virgo: { element: 'Earth', modality: 'Mutable' },
  Libra: { element: 'Air', modality: 'Cardinal' },
  Scorpio: { element: 'Water', modality: 'Fixed' },
  Sagittarius: { element: 'Fire', modality: 'Mutable' },
  Capricorn: { element: 'Earth', modality: 'Cardinal' },
  Aquarius: { element: 'Air', modality: 'Fixed' },
  Pisces: { element: 'Water', modality: 'Mutable' },
};

const ELEMENTS: Array<'Fire' | 'Earth' | 'Air' | 'Water'> = ['Fire', 'Earth', 'Air', 'Water'];
const MODALITIES: Array<'Cardinal' | 'Fixed' | 'Mutable'> = ['Cardinal', 'Fixed', 'Mutable'];

function normalisePlacement(placement: AstroSeekPlacement): NormalizedPlacement {
  const { body, sign, degree, house, retrograde, raw } = placement;
  const signClean = sign && SIGN_DETAILS[sign] ? sign : undefined;
  const degreeRounded = typeof degree === 'number' && Number.isFinite(degree) ? Number(Number(degree).toFixed(2)) : undefined;
  const houseValid = typeof house === 'number' && house >= 1 && house <= 12 ? house : undefined;
  return {
    body,
    sign: signClean,
    degree: degreeRounded,
    house: houseValid,
    retrograde: retrograde === true,
    raw,
  };
}

function normaliseAspect(aspect: AstroSeekAspect): NormalizedAspect {
  const { from, to, type, orb, raw } = aspect;
  const orbRounded = typeof orb === 'number' && Number.isFinite(orb) ? Number(orb.toFixed(2)) : undefined;
  return {
    from,
    to,
    type,
    orb: orbRounded,
    raw,
  };
}

function computeDominant(values: Record<string, number>): string | undefined {
  const entries = Object.entries(values);
  if (!entries.length) return undefined;
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) return undefined;
  const max = sorted[0][1];
  const top = sorted.filter(([, count]) => count === max).map(([name]) => name);
  if (top.length === 1) return top[0];
  return top.join(' + ');
}

export function normalizeGeometry(parsedData: AstroSeekParseResult): NormalizedGeometry {
  const placements = parsedData.placements.map(normalisePlacement);
  const aspects = parsedData.aspects.map(normaliseAspect);

  const elementTotals: Record<string, number> = Object.fromEntries(ELEMENTS.map((el) => [el, 0]));
  const modalityTotals: Record<string, number> = Object.fromEntries(MODALITIES.map((mod) => [mod, 0]));

  const luminarySigns: GeometrySummary['luminaries'] = {};
  const retrogradeBodies: string[] = [];

  for (const placement of placements) {
    if (placement.sign) {
      const info = SIGN_DETAILS[placement.sign];
      if (info) {
        elementTotals[info.element] += 1;
        modalityTotals[info.modality] += 1;
      }
    }
    if (placement.body === 'Sun') luminarySigns.sun = placement.sign;
    if (placement.body === 'Moon') luminarySigns.moon = placement.sign;
    if (placement.body === 'Ascendant') luminarySigns.ascendant = placement.sign;
    if (placement.retrograde) retrogradeBodies.push(placement.body);
  }

  const summary: GeometrySummary = {
    elementTotals,
    modalityTotals,
    dominantElement: computeDominant(elementTotals),
    dominantModality: computeDominant(modalityTotals),
    luminaries: luminarySigns,
    retrogradeBodies,
  };

  return {
    placements,
    aspects,
    summary,
    snippet: parsedData.snippet,
    raw: parsedData.raw,
    normalizedFrom: parsedData,
  };
}
