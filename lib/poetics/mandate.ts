import {
  AspectType,
  ChartMandates,
  MandateAspect,
  MandateBuildOptions,
  MandateDiagnostic,
  PlanetArchetypeData,
} from './types';

interface RawAspect {
  planet_a?: string;
  planet_b?: string;
  type?: AspectType;
  orb?: number;
  applying?: boolean;
  weight?: number;
  houses?: {
    primary?: number;
    secondary?: number;
  };
  [key: string]: any;
}

interface RawChart {
  aspects?: RawAspect[];
  index?: Record<string, number>;
  [key: string]: any;
}

const PLANET_ARCHETYPES: Record<string, PlanetArchetypeData> = {
  Sun: { planet: 'Sun', name: 'Core Identity', essence: 'how you shine and express selfhood' },
  Moon: { planet: 'Moon', name: 'Emotional Nature', essence: 'how you feel and respond' },
  Mercury: { planet: 'Mercury', name: 'Mind & Communication', essence: 'how you think and translate' },
  Venus: { planet: 'Venus', name: 'Values & Connection', essence: 'what you love, attract, and harmonize with' },
  Mars: { planet: 'Mars', name: 'Will & Action', essence: 'how you move, assert, and pursue' },
  Jupiter: { planet: 'Jupiter', name: 'Meaning & Expansion', essence: 'where you grow, believe, and broadcast' },
  Saturn: { planet: 'Saturn', name: 'Structure & Integrity', essence: 'how you build, contain, and commit' },
  Uranus: { planet: 'Uranus', name: 'Innovation & Disruption', essence: 'how you liberate, invert, or break patterns' },
  Neptune: { planet: 'Neptune', name: 'Dreams & Dissolution', essence: 'how you merge, sense, and imagine' },
  Pluto: { planet: 'Pluto', name: 'Power & Transformation', essence: 'how you intensify, regenerate, and transmute' },
  Node: { planet: 'Node', name: 'Destiny Vector', essence: 'where you stretch toward future learning' },
  ASC: { planet: 'ASC', name: 'Persona & Presence', essence: 'how you enter rooms and broadcast first impressions' },
  MC: { planet: 'MC', name: 'Purpose & Authority', essence: 'how you stand in public purpose and vocation' },
};

const DEFAULT_ARCHETYPE: PlanetArchetypeData = {
  planet: 'Unknown',
  name: 'Undocumented Archetype',
  essence: 'geometry logged without reference translation',
};

const PRESSURE_BY_ASPECT: Record<string, string> = {
  conjunction: 'Energy merges and intensifies',
  opposition: 'Energy pulls in opposite directions',
  square: 'Energy creates friction and urgency',
  trine: 'Energy flows with ease and resonance',
  sextile: 'Energy supports and facilitates movement',
};

const MAP_TRANSLATIONS: Record<string, string> = {
  'Sun-Moon-conjunction': 'Your core identity and emotional nature are fused; you feel like yourself when you shine.',
  'Sun-Moon-opposition': 'Your core identity and emotional nature pull apart; integrating both is lifelong practice.',
  'Sun-Moon-square': 'Your core identity and emotional nature generate friction; both want airtime.',
  'Sun-Saturn-conjunction': 'Structure and selfhood are entwined; accountability is a defining feature.',
  'Sun-Saturn-opposition': 'Self-expression and containment negotiate constantly; tension is productive.',
  'Sun-Saturn-square': 'Selfhood meets structural resistance, demanding deliberate pacing.',
  'Moon-Mars-conjunction': 'Feeling and action ignite together; instincts launch quickly into motion.',
  'Moon-Mars-opposition': 'Feeling and action compete; emotional honesty fuels momentum.',
  'Moon-Mars-square': 'Feeling and action clash; channeling impulse into constructive motion is key.',
  'Venus-Mars-conjunction': 'Desire and will align; attraction and pursuit are inseparable.',
  'Venus-Mars-opposition': 'Desire and will oscillate; intimacy and independence trade off.',
  'Venus-Mars-square': 'Desire and will grind; learning to both want and act is ongoing.',
  'Mercury-Neptune-conjunction': 'Mind and imagination merge; you communicate in symbols and subtext.',
  'Mercury-Neptune-opposition': 'Mind seeks clarity, imagination seeks mystery; both must be voiced.',
  'Mercury-Neptune-square': 'Mind and imagination tangle; articulating the ineffable is the work.',
  'Saturn-Pluto-conjunction': 'Structure and power fuse; you build with uncompromising intent.',
  'Saturn-Pluto-opposition': 'Structure and power alternate; containment and release are interdependent.',
  'Saturn-Pluto-square': 'Structure and power strain; deep transformation reshapes commitment.',
};

function getPlanetArchetype(planet?: string): PlanetArchetypeData {
  if (!planet) return DEFAULT_ARCHETYPE;
  return PLANET_ARCHETYPES[planet] ?? { ...DEFAULT_ARCHETYPE, planet };
}

function determineDiagnostic(aspect: RawAspect, allAspects: RawAspect[]): MandateDiagnostic {
  const orb = Math.abs(aspect.orb ?? 0);
  const type = aspect.type ?? 'aspect';
  const isApplying = aspect.applying !== false;

  if ((type === 'opposition' || type === 'square') && orb < 1) {
    return 'Paradox Lock';
  }

  if (type === 'conjunction' && orb < 2) {
    return 'Current';
  }

  if (!isApplying && orb < 3) {
    return 'Hook';
  }

  const planetA = aspect.planet_a;
  if (planetA) {
    const sharedPlanetCount = allAspects.filter(a =>
      a !== aspect && (a.planet_a === planetA || a.planet_b === planetA)
    ).length;
    if (sharedPlanetCount >= 1) {
      return 'Compression';
    }
  }

  return 'Current';
}

function buildFieldPressure(type: AspectType | undefined, diagnostic: MandateDiagnostic): string {
  const base = PRESSURE_BY_ASPECT[type ?? ''] ?? 'Energy creates a particular dynamic';
  switch (diagnostic) {
    case 'Paradox Lock':
      return `${base}—but the contradiction is built in. Live the paradox; do not try to solve it.`;
    case 'Hook':
      return `${base}. The exact contact point is where the tension catches.`;
    case 'Compression':
      return `${base}. Multiple layers of pressure converge in this zone.`;
    case 'Current':
    default:
      return `${base}. This is present-time energy.`;
  }
}

function buildMapTranslation(planetA: string, planetB: string, aspectType: AspectType): string {
  const key = `${planetA}-${planetB}-${aspectType}`;
  const reversedKey = `${planetB}-${planetA}-${aspectType}`;
  return MAP_TRANSLATIONS[key] ?? MAP_TRANSLATIONS[reversedKey] ?? `Your ${planetA.toLowerCase()} and ${planetB.toLowerCase()} create a particular dynamic through ${aspectType}.`;
}

function buildVoiceHook(mapTranslation: string): string {
  return `This often shows up as: ${mapTranslation}`;
}

function calcWeight(orb?: number, provided?: number): number {
  if (typeof provided === 'number' && Number.isFinite(provided)) {
    return provided;
  }
  if (orb === undefined || orb === 0) return 1;
  return Number((1 / Math.abs(orb)).toFixed(4));
}

function normalizeAspect(aspect: RawAspect): MandateAspect['geometry'] {
  const aspectType = aspect.type ?? 'aspect';
  const orbDegrees = Math.abs(aspect.orb ?? 0);
  const applying = aspect.applying !== false;
  const weight = calcWeight(aspect.orb, aspect.weight);
  const geometry: MandateAspect['geometry'] = {
    aspectType,
    orbDegrees,
    applying,
    weight,
  };

  if (aspect.houses && typeof aspect.houses === 'object') {
    geometry.houses = {
      primary: aspect.houses.primary,
      secondary: aspect.houses.secondary,
    };
  }

  return geometry;
}

function buildMandateId(planetA: string, planetB: string, aspectType: AspectType): string {
  const safeA = planetA.replace(/\s+/g, '_');
  const safeB = planetB.replace(/\s+/g, '_');
  return `${safeA}_${aspectType}_${safeB}`;
}

export function translateAspectToMandate(
  aspect: RawAspect,
  allAspects: RawAspect[] = [],
  options: { indexLookup?: Record<string, number> } = {}
): MandateAspect | null {
  const planetA = aspect.planet_a || aspect.p1_name;
  const planetB = aspect.planet_b || aspect.p2_name;
  if (!planetA || !planetB) {
    return null;
  }

  const geometry = normalizeAspect(aspect);
  const diagnostic = determineDiagnostic(aspect, allAspects);
  const archetypeA = getPlanetArchetype(planetA);
  const archetypeB = getPlanetArchetype(planetB);
  const fieldPressure = buildFieldPressure(geometry.aspectType, diagnostic);
  const mapTranslation = buildMapTranslation(planetA, planetB, geometry.aspectType);
  const voiceHook = buildVoiceHook(mapTranslation);
  const id = buildMandateId(planetA, planetB, geometry.aspectType);

  const indexLookup = options.indexLookup ?? {};

  const provenance = {
    source: 'MAP' as const,
    natalIndexA: indexLookup[planetA],
    natalIndexB: indexLookup[planetB],
    rawAspectRef: aspect.id ?? aspect.uuid ?? undefined,
  };

  return {
    id,
    geometry,
    archetypes: {
      a: archetypeA,
      b: archetypeB,
    },
    diagnostic,
    fieldPressure,
    mapTranslation,
    voiceHook,
    provenance,
  };
}

export function buildMandatesForChart(
  personName: string,
  chart: RawChart,
  options: MandateBuildOptions = {}
): ChartMandates {
  const aspects = Array.isArray(chart?.aspects) ? chart.aspects : [];
  const limit = options.limit ?? 5;
  const mandates: MandateAspect[] = [];

  if (aspects.length === 0) {
    return { personName, mandates };
  }

  const indexLookup = chart?.index ?? {};

  for (const aspect of aspects) {
    const mandate = translateAspectToMandate(aspect, aspects, { indexLookup });
    if (mandate) {
      mandates.push(mandate);
    }
  }

  const sorted = mandates
    .sort((a, b) => {
      if (a.geometry.weight !== b.geometry.weight) {
        return b.geometry.weight - a.geometry.weight;
      }
      return a.geometry.orbDegrees - b.geometry.orbDegrees;
    })
    .slice(0, Math.max(limit, 0));

  return {
    personName,
    mandates: sorted,
  };
}
