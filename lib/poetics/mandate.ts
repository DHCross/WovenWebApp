import {
  AspectType,
  ChartMandates,
  MandateAspect,
  MandateBuildOptions,
  MandateDiagnostic,
  PlanetArchetypeData,
  RelationalMandates,
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

interface TranslateMandateOptions {
  indexLookup?: Record<string, number>;
  owners?: {
    a?: string;
    b?: string;
  };
  narrativeMode?: 'natal' | 'synastry';
  personAName?: string;
  personBName?: string;
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
  if (!planet) return { ...DEFAULT_ARCHETYPE };
  const base = PLANET_ARCHETYPES[planet] ?? { ...DEFAULT_ARCHETYPE, planet };
  return { ...base };
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

function possessive(name?: string): string {
  const trimmed = (name || 'Person').trim();
  if (!trimmed) return 'Person';
  return trimmed.endsWith('s') ? `${trimmed}'` : `${trimmed}'s`;
}

function buildSynastryMapTranslation(opts: {
  personAName: string;
  personBName: string;
  planetA: string;
  planetB: string;
  aspectType: AspectType;
}): string {
  const { personAName, personBName, planetA, planetB, aspectType } = opts;
  const aLabel = `${possessive(personAName)} ${planetA}`;
  const bLabel = `${possessive(personBName)} ${planetB}`;
  const typeKey = (aspectType || '').toLowerCase();

  switch (typeKey) {
    case 'conjunction':
      return `${aLabel} and ${bLabel} lock onto the same frequency. They amplify each other instantly—when one moves, the other responds.`;
    case 'opposition':
      return `${aLabel} faces ${bLabel} across an axis. You trade roles along this line, passing power back and forth until the tension becomes dialogue.`;
    case 'square':
      return `${aLabel} meets ${bLabel} at right angles. The friction is real and productive—it keeps both of you honest about what each planet needs.`;
    case 'trine':
      return `${aLabel} and ${bLabel} speak the same dialect. Flow is easy; the work is keeping it conscious so you build something with the ease.`;
    case 'sextile':
      return `${aLabel} and ${bLabel} create cooperative pathways when you both reach for them. It's a potential that wakes up through intentional choice.`;
    default:
      return `${aLabel} and ${bLabel} interact through a ${aspectType}. Track how this geometry resurfaces when you're together.`;
  }
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
  // Handle multiple naming conventions for aspect type
  const rawType = aspect.type || aspect.aspect || aspect.aspect_type || 'aspect';
  const aspectType = String(rawType).toLowerCase().trim() as AspectType;
  // Handle multiple naming conventions for orb
  const rawOrb = aspect.orb ?? aspect.orbit ?? aspect.orbDegrees ?? aspect.orb_degrees ?? 0;
  const orbDegrees = Math.abs(typeof rawOrb === 'number' ? rawOrb : 0);
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
  options: TranslateMandateOptions = {}
): MandateAspect | null {
  const {
    indexLookup = {},
    owners,
    narrativeMode = 'natal',
    personAName,
    personBName,
  } = options;

  const planetA = aspect.planet_a || aspect.p1_name;
  const planetB = aspect.planet_b || aspect.p2_name;
  if (!planetA || !planetB) {
    return null;
  }

  const geometry = normalizeAspect(aspect);
  const diagnostic = determineDiagnostic(aspect, allAspects);
  const archetypeA = getPlanetArchetype(planetA);
  const archetypeB = getPlanetArchetype(planetB);
  if (owners?.a) {
    archetypeA.owner = owners.a;
  }
  if (owners?.b) {
    archetypeB.owner = owners.b;
  }
  const fieldPressure = buildFieldPressure(geometry.aspectType, diagnostic);
  const relationalNames = {
    a: personAName || owners?.a || 'Person A',
    b: personBName || owners?.b || 'Person B',
  };
  const mapTranslation =
    narrativeMode === 'synastry'
      ? buildSynastryMapTranslation({
          personAName: relationalNames.a,
          personBName: relationalNames.b,
          planetA,
          planetB,
          aspectType: geometry.aspectType,
        })
      : buildMapTranslation(planetA, planetB, geometry.aspectType);
  const voiceHook = buildVoiceHook(mapTranslation);
  const id = buildMandateId(planetA, planetB, geometry.aspectType);

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
    .sort((a: MandateAspect, b: MandateAspect) => {
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

const PERSON_A_ALIASES = new Set(['persona', 'subjecta', 'partnera', 'firstsubject', 'primary', 'a']);
const PERSON_B_ALIASES = new Set(['personb', 'subjectb', 'partnerb', 'secondsubject', 'secondary', 'b']);

function toTokens(value?: string | null): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .toLowerCase()
    .split(/[\s_/|-]+/)
    .map(token => token.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
}

function matchesPersonIdentity(
  candidate: string | null | undefined,
  personName: string,
  aliases: Set<string>
): boolean {
  if (!candidate) return false;
  const candidateTokens = toTokens(candidate);
  const candidateJoined = candidateTokens.join('');
  if (!candidateJoined) return false;

  const personTokens = toTokens(personName);
  const personJoined = personTokens.join('');
  if (!personJoined) return false;

  if (candidateJoined === personJoined) return true;
  if (candidateJoined.includes(personJoined) || personJoined.includes(candidateJoined)) return true;
  if (aliases.has(candidateJoined)) return true;
  return candidateTokens.some(token => token.length > 2 && personTokens.includes(token));
}

type Getter = (aspect: any) => any;

const PLANET_A_SOURCES: Getter[] = [
  asp => asp?.person_a_planet,
  asp => asp?.planet_a,
  asp => asp?.personAPlanet,
  asp => asp?.person_a?.planet,
  asp => asp?.person_a?.body,
  asp => asp?.p1_name,
  asp => asp?.transit?.body,
  asp => asp?.transit?.planet,
  asp => asp?.from?.body,
  asp => asp?.source?.body,
  asp => asp?.a_body,
];

const PLANET_B_SOURCES: Getter[] = [
  asp => asp?.person_b_planet,
  asp => asp?.planet_b,
  asp => asp?.personBPlanet,
  asp => asp?.person_b?.planet,
  asp => asp?.person_b?.body,
  asp => asp?.p2_name,
  asp => asp?.natal?.body,
  asp => asp?.target?.body,
  asp => asp?.to?.body,
  asp => asp?.b_body,
];

const OWNER_A_SOURCES: Getter[] = [
  asp => asp?.person_a_name,
  asp => asp?.person_a_owner,
  asp => asp?.person_a_label,
  asp => asp?.person_a?.name,
  asp => asp?.personA,
  asp => asp?.p1_owner,
  asp => asp?.transit?.owner,
  asp => asp?.transit?.name,
  asp => asp?.from?.owner,
  asp => asp?.source_owner,
  asp => asp?.owner_a,
];

const OWNER_B_SOURCES: Getter[] = [
  asp => asp?.person_b_name,
  asp => asp?.person_b_owner,
  asp => asp?.person_b_label,
  asp => asp?.person_b?.name,
  asp => asp?.personB,
  asp => asp?.p2_owner,
  asp => asp?.natal?.owner,
  asp => asp?.natal?.name,
  asp => asp?.to?.owner,
  asp => asp?.target?.owner,
  asp => asp?.owner_b,
];

function pickString(aspect: any, getters: Getter[]): string | undefined {
  for (const getter of getters) {
    const value = getter(aspect);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function extractSynastryOrb(aspect: any): number | undefined {
  const candidates = [
    aspect?.orb,
    aspect?.orbit,
    aspect?.orbDeg,
    aspect?.orb_degrees,
    aspect?.orbDegrees,
    aspect?.delta,
    aspect?.deviation,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return Math.abs(candidate);
    }
  }

  if (typeof aspect?.diff === 'number' && typeof aspect?.aspect_degrees === 'number') {
    const diff = Math.abs(Math.abs(aspect.diff) - Math.abs(aspect.aspect_degrees));
    if (Number.isFinite(diff)) {
      return Math.abs(diff);
    }
  }

  return undefined;
}

function normalizeSynastryAspect(
  aspect: any,
  ctx: { personAName: string; personBName: string }
): RawAspect | null {
  if (!aspect || typeof aspect !== 'object') {
    return null;
  }

  const rawType = (aspect.type || aspect.aspect || aspect.aspect_type || '').toString().trim().toLowerCase();
  if (!rawType) {
    return null;
  }

  let planetA = pickString(aspect, PLANET_A_SOURCES);
  let planetB = pickString(aspect, PLANET_B_SOURCES);
  if (!planetA || !planetB) {
    return null;
  }

  const ownerA = pickString(aspect, OWNER_A_SOURCES);
  const ownerB = pickString(aspect, OWNER_B_SOURCES);

  const ownerAMatchesA = matchesPersonIdentity(ownerA, ctx.personAName, PERSON_A_ALIASES);
  const ownerAMatchesB = matchesPersonIdentity(ownerA, ctx.personBName, PERSON_B_ALIASES);
  const ownerBMatchesA = matchesPersonIdentity(ownerB, ctx.personAName, PERSON_A_ALIASES);
  const ownerBMatchesB = matchesPersonIdentity(ownerB, ctx.personBName, PERSON_B_ALIASES);

  let orientation: 'AtoB' | 'BtoA' = 'AtoB';
  if (ownerAMatchesB && ownerBMatchesA) {
    orientation = 'BtoA';
  } else if (ownerAMatchesB && !ownerBMatchesB) {
    orientation = 'BtoA';
  } else if (ownerBMatchesA && !ownerAMatchesA) {
    orientation = 'BtoA';
  } else if (ownerAMatchesA && ownerBMatchesB) {
    orientation = 'AtoB';
  }

  const direction = String(aspect.direction || aspect.flow || aspect.vector || '').toLowerCase();
  if (direction === 'b_to_a' || direction === 'btoa') {
    orientation = 'BtoA';
  } else if (direction === 'a_to_b' || direction === 'atoa') {
    orientation = 'AtoB';
  }

  if (orientation === 'BtoA') {
    [planetA, planetB] = [planetB, planetA];
  }

  if (!planetA || !planetB) {
    return null;
  }

  const houseA = aspect?.p1_house ?? aspect?.person_a_house ?? aspect?.house_a ?? aspect?.from?.house;
  const houseB = aspect?.p2_house ?? aspect?.person_b_house ?? aspect?.house_b ?? aspect?.to?.house;
  const houses =
    houseA !== undefined || houseB !== undefined
      ? {
          primary: houseA,
          secondary: houseB,
        }
      : undefined;

  return {
    planet_a: planetA,
    planet_b: planetB,
    type: rawType,
    orb: extractSynastryOrb(aspect),
    applying: typeof aspect?.applying === 'boolean' ? aspect.applying : undefined,
    weight: aspect?.weight,
    houses,
    id: aspect?.id ?? aspect?.uuid ?? aspect?.aspect_id,
  };
}

export function buildSynastryMandates(
  personAName: string,
  personBName: string,
  synastryAspects: any,
  options: MandateBuildOptions = {}
): RelationalMandates {
  const safePersonA = personAName && personAName.trim().length ? personAName.trim() : 'Person A';
  const safePersonB = personBName && personBName.trim().length ? personBName.trim() : 'Person B';
  const limit = options.limit ?? 5;

  const aspectArray = Array.isArray(synastryAspects)
    ? synastryAspects
    : Array.isArray(synastryAspects?.aspects)
      ? synastryAspects.aspects
      : [];

  const normalizedAspects = aspectArray
    .map((aspect: any) => normalizeSynastryAspect(aspect, { personAName: safePersonA, personBName: safePersonB }))
    .filter((aspect: any): aspect is RawAspect => Boolean(aspect));

  if (!normalizedAspects.length) {
    return {
      pairLabel: `${safePersonA} & ${safePersonB}`,
      personA: safePersonA,
      personB: safePersonB,
      mandates: [],
    };
  }

  const mandates = normalizedAspects
    .map((aspect: RawAspect) =>
      translateAspectToMandate(aspect, normalizedAspects, {
        owners: { a: safePersonA, b: safePersonB },
        narrativeMode: 'synastry',
        personAName: safePersonA,
        personBName: safePersonB,
      })
    )
    .filter((mandate: any): mandate is MandateAspect => Boolean(mandate))
    .sort((a: MandateAspect, b: MandateAspect) => {
      if (a.geometry.weight !== b.geometry.weight) {
        return b.geometry.weight - a.geometry.weight;
      }
      return a.geometry.orbDegrees - b.geometry.orbDegrees;
    })
    .slice(0, Math.max(limit, 0));

  return {
    pairLabel: `${safePersonA} & ${safePersonB}`,
    personA: safePersonA,
    personB: safePersonB,
    mandates,
  };
}
