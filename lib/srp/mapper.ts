/**
 * SRP Mapper - Aspect Pattern → Blend ID Lookup
 *
 * Maps astrological aspects to SRP blend coordinates.
 * Stateless: extracts planets/aspects from payload, returns enrichment data.
 *
 * Phase 1: Basic pattern matching
 * Phase 2: Orb-based shadow detection
 * Phase 3: PSS event classification
 */

import type { SRPEnrichment, ZodiacDriver } from './types';
import {
  calculateBlendId,
  getLightBlend,
  getShadowBlend
} from './loader';
import { ZODIAC_INDEX } from './ledger';

/**
 * Planet to zodiac sign mapping
 * In production, this would come from Math Brain's chart data
 */
export interface PlanetPosition {
  planet: string;
  sign: ZodiacDriver;
  degree: number;
}

/**
 * Aspect pattern from hook label
 */
export interface AspectPattern {
  planet1: string;
  planet2: string;
  aspect: string; // 'conjunction', 'square', 'trine', etc.
  orb: number;
}

/**
 * Parse aspect label into structured pattern
 * Examples:
 * - "Sun square Mars (2.1°)" → { planet1: 'Sun', planet2: 'Mars', aspect: 'square', orb: 2.1 }
 * - "Venus trine Jupiter" → { planet1: 'Venus', planet2: 'Jupiter', aspect: 'trine', orb: 0 }
 */
export function parseAspectLabel(label: string): AspectPattern | null {
  if (typeof label !== 'string') return null;

  const aspectKeywords = [
    'conjunction',
    'opposition',
    'square',
    'trine',
    'sextile',
    'quincunx'
  ];

  const lower = label.toLowerCase();
  const keyword = aspectKeywords.find(k => lower.includes(` ${k} `));
  if (!keyword) return null;

  const [leftPart, rightPartWithAspect] = lower.split(` ${keyword} `);
  if (!leftPart || !rightPartWithAspect) return null;

  const orbMatch = rightPartWithAspect.match(/\(([0-9.]+)°?\)/);
  const orb = orbMatch ? parseFloat(orbMatch[1]) : 0;

  const rightPart = orbMatch ? rightPartWithAspect.replace(orbMatch[0], '').trim() : rightPartWithAspect.trim();

  const planet1 = label.slice(0, leftPart.length).trim();
  const planet2StartIndex = label.toLowerCase().indexOf(rightPart); // aligns casing
  const planet2 = planet2StartIndex >= 0 ? label.slice(planet2StartIndex, planet2StartIndex + rightPart.length).trim() : rightPart;

  if (!planet1 || !planet2) return null;

  return {
    planet1,
    planet2,
    aspect: keyword,
    orb
  };
}

/**
 * Map planet to zodiac driver archetype
 *
 * This is a simplified heuristic for Phase 1.
 * In production, would use actual chart positions from Math Brain.
 *
 * Rulership associations:
 * - Sun → Leo (Validate)
 * - Moon → Cancer (Nurture)
 * - Mercury → Gemini/Virgo (Connect/Optimize)
 * - Venus → Taurus/Libra (Stabilize/Harmonize)
 * - Mars → Aries (Initiate)
 * - Jupiter → Sagittarius (Inspire)
 * - Saturn → Capricorn (Architect)
 * - Uranus → Aquarius (Reform)
 * - Neptune → Pisces (Empathize)
 * - Pluto → Scorpio (Probe)
 */
export function getPlanetDriver(planet: string): ZodiacDriver | null {
  const rulerships: Record<string, ZodiacDriver> = {
    'Sun': 'Leo',
    'Moon': 'Cancer',
    'Mercury': 'Gemini', // Could also be Virgo
    'Venus': 'Libra',    // Could also be Taurus
    'Mars': 'Aries',
    'Jupiter': 'Sagittarius',
    'Saturn': 'Capricorn',
    'Uranus': 'Aquarius',
    'Neptune': 'Pisces',
    'Pluto': 'Scorpio',
    'North Node': 'Cancer',
    'South Node': 'Capricorn',
    'True Node': 'Cancer',
    'True South Node': 'Capricorn',
    'Mean Node': 'Cancer',
    'Mean South Node': 'Capricorn',
    'Chiron': 'Virgo',
    'Lilith': 'Scorpio',
    'Black Moon Lilith': 'Scorpio',
    'Part of Fortune': 'Sagittarius'
  };

  const normalized = planet.trim();
  if (rulerships[normalized]) return rulerships[normalized];

  const titleCased = normalized
    .toLowerCase()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return rulerships[titleCased] || 'Aquarius'; // default to mutable-air style driver for unmapped bodies
}

/**
 * Map aspect type to manner archetype
 *
 * Aspect → Elemental quality → Manner:
 * - Conjunction → Same element → Driver's own manner
 * - Opposition → Opposite element → Complementary manner
 * - Square → Conflicting element → Challenging manner
 * - Trine → Harmonious element → Supportive manner
 * - Sextile → Cooperative element → Connecting manner
 */
export function getAspectManner(aspect: string, driverSign: ZodiacDriver): ZodiacDriver | null {
  // Simplified mapping for Phase 1
  // In production, would consider actual planetary positions

  const aspectManners: Record<string, (driver: ZodiacDriver) => ZodiacDriver> = {
    'conjunction': (d) => d, // Same sign
    'opposition': (d) => getOppositeSign(d),
    'square': (d) => getSquareSign(d),
    'trine': (d) => getTrineSign(d),
    'sextile': (d) => getSextileSign(d),
    'quincunx': (d) => getQuincunxSign(d),
  };

  const mannerFn = aspectManners[aspect];
  return mannerFn ? mannerFn(driverSign) : null;
}

/**
 * Get opposite sign (180°)
 */
function getOppositeSign(sign: ZodiacDriver): ZodiacDriver {
  const signs: ZodiacDriver[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const idx = signs.indexOf(sign);
  return signs[(idx + 6) % 12];
}

/**
 * Get square sign (90°) - first square
 */
function getSquareSign(sign: ZodiacDriver): ZodiacDriver {
  const signs: ZodiacDriver[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const idx = signs.indexOf(sign);
  return signs[(idx + 3) % 12];
}

/**
 * Get trine sign (120°) - first trine
 */
function getTrineSign(sign: ZodiacDriver): ZodiacDriver {
  const signs: ZodiacDriver[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const idx = signs.indexOf(sign);
  return signs[(idx + 4) % 12];
}

/**
 * Get sextile sign (60°) - first sextile
 */
function getSextileSign(sign: ZodiacDriver): ZodiacDriver {
  const signs: ZodiacDriver[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const idx = signs.indexOf(sign);
  return signs[(idx + 2) % 12];
}

/**
 * Get quincunx sign (150°) - first quincunx
 */
function getQuincunxSign(sign: ZodiacDriver): ZodiacDriver {
  const signs: ZodiacDriver[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const idx = signs.indexOf(sign);
  return signs[(idx + 5) % 12];
}

/**
 * Main mapper: Aspect label → SRP enrichment
 *
 * @param aspectLabel - Raw aspect string from hook (e.g., "Sun square Mars (2.1°)")
 * @param resonanceState - WB/ABE/OSR classification from existing hook
 * @returns SRP enrichment data or null if unmappable
 */
export function mapAspectToSRP(
  aspectLabel: string,
  resonanceState?: 'WB' | 'ABE' | 'OSR'
): SRPEnrichment | null {
  // Parse aspect pattern
  const pattern = parseAspectLabel(aspectLabel);
  if (!pattern) return null;

  // Get driver from first planet
  const driver = getPlanetDriver(pattern.planet1);
  if (!driver) return null;

  // Get manner from aspect type
  const manner = getAspectManner(pattern.aspect, driver);
  if (!manner) return null;

  // Calculate blend ID
  const blendId = calculateBlendId(driver, manner);
  if (!blendId) return null;

  // Get light blend
  const lightBlend = getLightBlend(blendId);
  if (!lightBlend) return null;

  const enrichment: SRPEnrichment = {
    blendId,
    hingePhrase: lightBlend.hingePhrase,
    elementWeave: lightBlend.elementWeave,
  };

  // Add shadow reference if ABE or OSR
  if (resonanceState === 'ABE' || resonanceState === 'OSR') {
    const shadow = getShadowBlend(blendId);
    if (shadow) {
      enrichment.shadowRef = {
        shadowId: shadow.id,
        fracturePhrase: shadow.fracturePhrase,
        restorationCue: shadow.restorationCue,
        collapseMode: shadow.collapseMode,
      };
    }
  }

  return enrichment;
}

/**
 * Batch mapper: Enrich multiple hooks
 */
export function enrichHooks(
  hooks: Array<{ label: string; resonanceState?: 'WB' | 'ABE' | 'OSR' }>
): Array<{ label: string; srpEnrichment: SRPEnrichment | null }> {
  return hooks.map(hook => ({
    label: hook.label,
    srpEnrichment: mapAspectToSRP(hook.label, hook.resonanceState),
  }));
}

/**
 * Format enriched hook for display
 */
export function formatEnrichedHook(
  label: string,
  enrichment: SRPEnrichment | null,
  resonanceState?: 'WB' | 'ABE' | 'OSR'
): string {
  if (!enrichment) return label;

  const parts: string[] = [label];

  // Add hinge phrase
  if (enrichment.hingePhrase) {
    parts.push(`${enrichment.hingePhrase}`);
  }

  // Add resonance state
  if (resonanceState === 'ABE') {
    parts.push('boundary edge');
  } else if (resonanceState === 'OSR') {
    parts.push('non-ping');
  }

  // Add shadow indicator if present
  if (enrichment.shadowRef) {
    parts.push(`⚠ ${enrichment.shadowRef.collapseMode || 'shadow'}`);
  }

  return parts.join(' | ');
}

/**
 * Format shadow restoration for narrative
 */
export function formatShadowRestoration(
  enrichment: SRPEnrichment | null
): string | null {
  if (!enrichment?.shadowRef) return null;

  return `Shadow Pattern: ${enrichment.shadowRef.fracturePhrase}\nRestoration: ${enrichment.shadowRef.restorationCue}`;
}
