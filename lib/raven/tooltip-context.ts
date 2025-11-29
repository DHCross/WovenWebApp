/**
 * Balance Meter Tooltip Context Builder
 * 
 * Transforms scored aspects from the seismograph into human-readable
 * tooltip content following the FIELD → MAP → VOICE protocol.
 * 
 * FRONTSTAGE VOICE RULES:
 * - ❌ NO planet names, signs, houses, aspects, degrees
 * - ✅ Conversational, agency-preserving language
 * - ✅ Symbolic weather metaphors (pressure, friction, flow, ease)
 * 
 * @see lib/raven/aspects-legend.ts - Aspect definitions and directional bias
 * @see lib/raven/balance-tooltip-types.ts - Type definitions
 * @see docs/CLEAR_MIRROR_VOICE.md - Voice guidelines
 */

import {
  type ScoredAspect,
  type BalanceTooltipEntry,
  sortByImpact,
  getTopDrivers,
  partitionByValence,
  calculateAspectStats,
} from './balance-tooltip-types';

import {
  getAspectDefinition,
  type AspectDefinition,
} from './aspects-legend';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Human-readable tooltip content for the Balance Meter.
 * Uses symbolic weather language (no astrological jargon).
 */
export interface TooltipContent {
  /** One-line summary of the energy pattern */
  headline: string;
  /** Brief explanation of what's driving the reading */
  drivers: DriverSummary[];
  /** Overall energy quality description */
  energyQuality: 'friction' | 'flow' | 'mixed' | 'quiet';
  /** Intensity descriptor */
  intensity: 'strong' | 'moderate' | 'subtle' | 'quiet';
  /** Optional note about retrograde influence */
  retrogradeNote?: string;
  /** Debug/backstage data (only for operator view) */
  _debug?: DebugData;
}

/**
 * A single driver contributing to the Balance Meter.
 * Described in symbolic terms (no planet names frontstage).
 */
export interface DriverSummary {
  /** Human-readable description of the energy */
  description: string;
  /** Contribution direction */
  direction: 'friction' | 'flow' | 'neutral';
  /** Relative strength (0-100%) */
  strength: number;
  /** Backstage: raw aspect data */
  _raw?: ScoredAspect;
}

/**
 * Debug data for operator/backstage view.
 */
export interface DebugData {
  totalAspects: number;
  restrictiveCount: number;
  harmoniousCount: number;
  topDriver?: {
    transit: string;
    natal: string;
    aspect: string;
    score: number;
  };
}

// ============================================================================
// SYMBOLIC LANGUAGE MAPS (FRONTSTAGE VOICE)
// ============================================================================

/**
 * Maps aspect types to symbolic weather descriptions.
 * Follows FIELD → MAP → VOICE protocol.
 */
const ASPECT_TO_WEATHER: Record<string, { friction: string; flow: string }> = {
  opposition: {
    friction: 'pull between opposing forces',
    flow: 'awareness through contrast',
  },
  square: {
    friction: 'productive friction requiring action',
    flow: 'dynamic tension creating momentum',
  },
  trine: {
    friction: 'ease that may mask deeper currents',
    flow: 'natural grace and flow',
  },
  sextile: {
    friction: 'subtle support needing activation',
    flow: 'gentle opportunity presenting itself',
  },
  conjunction: {
    friction: 'intensified presence demanding attention',
    flow: 'unified focus and clarity',
  },
  quincunx: {
    friction: 'awkward adjustment required',
    flow: 'refinement through recalibration',
  },
  semisextile: {
    friction: 'minor irritation at the edges',
    flow: 'subtle integration underway',
  },
};

/**
 * Maps score magnitude to intensity descriptors.
 */
function getIntensityFromScore(absScore: number): 'strong' | 'moderate' | 'subtle' | 'quiet' {
  if (absScore >= 0.7) return 'strong';
  if (absScore >= 0.4) return 'moderate';
  if (absScore >= 0.15) return 'subtle';
  return 'quiet';
}

/**
 * Maps energy balance to quality descriptor.
 */
function getEnergyQuality(
  restrictiveCount: number,
  harmoniousCount: number,
  totalScore: number
): 'friction' | 'flow' | 'mixed' | 'quiet' {
  if (restrictiveCount === 0 && harmoniousCount === 0) return 'quiet';
  if (totalScore < -0.5) return 'friction';
  if (totalScore > 0.5) return 'flow';
  if (restrictiveCount > 0 && harmoniousCount > 0) return 'mixed';
  return totalScore < 0 ? 'friction' : 'flow';
}

// ============================================================================
// HEADLINE GENERATORS
// ============================================================================

/**
 * Generate a headline based on energy quality and intensity.
 */
function generateHeadline(
  quality: 'friction' | 'flow' | 'mixed' | 'quiet',
  intensity: 'strong' | 'moderate' | 'subtle' | 'quiet',
  driverCount: number
): string {
  if (quality === 'quiet' || driverCount === 0) {
    return 'A relatively quiet field today';
  }

  const intensityWord = {
    strong: 'Strong',
    moderate: 'Notable',
    subtle: 'Subtle',
    quiet: 'Gentle',
  }[intensity];

  const qualityPhrase = {
    friction: 'friction in the field',
    flow: 'flow in the field',
    mixed: 'mixed currents in the field',
    quiet: 'stillness in the field',
  }[quality];

  return `${intensityWord} ${qualityPhrase}`;
}

// ============================================================================
// DRIVER DESCRIPTION GENERATORS
// ============================================================================

/**
 * Generate a human-readable description for a single driver.
 * NO planet names - uses symbolic weather language only.
 */
function describeDriver(aspect: ScoredAspect): DriverSummary {
  const aspectDef = getAspectDefinition(aspect.type);
  const isNegative = aspect.S < 0;
  const direction: 'friction' | 'flow' | 'neutral' = 
    aspect.S < -0.1 ? 'friction' : aspect.S > 0.1 ? 'flow' : 'neutral';

  // Get weather description based on aspect type and valence
  const weatherMap = ASPECT_TO_WEATHER[aspect.type] || ASPECT_TO_WEATHER.conjunction;
  const weatherDescription = isNegative ? weatherMap.friction : weatherMap.flow;

  // Build description using symbolic language only
  let description: string;
  
  if (direction === 'friction') {
    description = `A ${weatherDescription}`;
  } else if (direction === 'flow') {
    description = `A sense of ${weatherDescription}`;
  } else {
    description = 'A neutral presence in the field';
  }

  // Add retrograde note if applicable
  if (aspect.transit.retrograde) {
    description += ' (with an inward, reflective quality)';
  }

  // Calculate relative strength (0-100%)
  const strength = Math.min(100, Math.round(Math.abs(aspect.S) * 100));

  return {
    description,
    direction,
    strength,
    _raw: aspect,
  };
}

/**
 * Generate retrograde note if any top drivers are retrograde.
 */
function generateRetrogradeNote(drivers: ScoredAspect[]): string | undefined {
  const retrogradeCount = drivers.filter(d => d.transit.retrograde).length;
  
  if (retrogradeCount === 0) return undefined;
  
  if (retrogradeCount === 1) {
    return 'One influence carries an inward, reflective quality';
  }
  
  return `${retrogradeCount} influences carry an inward, reflective quality`;
}

// ============================================================================
// MAIN BUILDER FUNCTION
// ============================================================================

/**
 * Build tooltip content from scored aspects.
 * 
 * @param aspects - Array of scored aspects from seismograph
 * @param options - Optional configuration
 * @returns Human-readable tooltip content
 */
export function buildTooltipContent(
  aspects: ScoredAspect[],
  options: {
    maxDrivers?: number;
    includeDebug?: boolean;
  } = {}
): TooltipContent {
  const { maxDrivers = 3, includeDebug = false } = options;

  // Handle empty case
  if (!aspects || aspects.length === 0) {
    return {
      headline: 'A relatively quiet field today',
      drivers: [],
      energyQuality: 'quiet',
      intensity: 'quiet',
    };
  }

  // Analyze the aspects
  const stats = calculateAspectStats(aspects);
  const partitioned = partitionByValence(aspects);
  const topDrivers = getTopDrivers(aspects, maxDrivers);

  // Determine quality and intensity
  const energyQuality = getEnergyQuality(
    partitioned.restrictive.length,
    partitioned.harmonious.length,
    stats.totalScore
  );
  const intensity = getIntensityFromScore(
    Math.max(Math.abs(stats.maxPositive), Math.abs(stats.maxNegative))
  );

  // Generate headline
  const headline = generateHeadline(energyQuality, intensity, topDrivers.length);

  // Generate driver descriptions
  const drivers = topDrivers.map(describeDriver);

  // Generate retrograde note
  const retrogradeNote = generateRetrogradeNote(topDrivers);

  // Build result
  const result: TooltipContent = {
    headline,
    drivers,
    energyQuality,
    intensity,
  };

  if (retrogradeNote) {
    result.retrogradeNote = retrogradeNote;
  }

  // Add debug data if requested (backstage only)
  if (includeDebug) {
    const topAspect = topDrivers[0];
    result._debug = {
      totalAspects: aspects.length,
      restrictiveCount: partitioned.restrictive.length,
      harmoniousCount: partitioned.harmonious.length,
      topDriver: topAspect ? {
        transit: topAspect.transit.body,
        natal: topAspect.natal.body,
        aspect: topAspect.type,
        score: topAspect.S,
      } : undefined,
    };
  }

  return result;
}

/**
 * Build tooltip content for a specific date from balance tooltips response.
 */
export function buildTooltipForDate(
  tooltips: BalanceTooltipEntry[],
  date: string,
  options?: { maxDrivers?: number; includeDebug?: boolean }
): TooltipContent | null {
  const entry = tooltips.find(t => t.date === date);
  if (!entry) return null;
  return buildTooltipContent(entry.scored_aspects, options);
}

/**
 * Build tooltip content for the most recent date in the response.
 */
export function buildLatestTooltip(
  tooltips: BalanceTooltipEntry[],
  options?: { maxDrivers?: number; includeDebug?: boolean }
): TooltipContent | null {
  if (!tooltips || tooltips.length === 0) return null;
  
  // Sort by date descending and take the first
  const sorted = [...tooltips].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  return buildTooltipContent(sorted[0].scored_aspects, options);
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format tooltip content as a single text block for simple display.
 */
export function formatTooltipAsText(content: TooltipContent): string {
  const lines: string[] = [content.headline];
  
  if (content.drivers.length > 0) {
    lines.push('');
    content.drivers.forEach((driver, i) => {
      const bullet = content.drivers.length > 1 ? `${i + 1}. ` : '';
      lines.push(`${bullet}${driver.description}`);
    });
  }
  
  if (content.retrogradeNote) {
    lines.push('');
    lines.push(`Note: ${content.retrogradeNote}`);
  }
  
  return lines.join('\n');
}

/**
 * Format tooltip content as HTML for rich display.
 */
export function formatTooltipAsHTML(content: TooltipContent): string {
  const parts: string[] = [
    `<p class="tooltip-headline"><strong>${content.headline}</strong></p>`,
  ];
  
  if (content.drivers.length > 0) {
    parts.push('<ul class="tooltip-drivers">');
    content.drivers.forEach(driver => {
      const dirClass = `driver-${driver.direction}`;
      parts.push(`<li class="${dirClass}">${driver.description}</li>`);
    });
    parts.push('</ul>');
  }
  
  if (content.retrogradeNote) {
    parts.push(`<p class="tooltip-note"><em>${content.retrogradeNote}</em></p>`);
  }
  
  return parts.join('\n');
}

/**
 * Get a compact one-liner for space-constrained displays.
 */
export function getCompactSummary(content: TooltipContent): string {
  if (content.energyQuality === 'quiet') {
    return 'Quiet field';
  }
  
  const qualityEmoji = {
    friction: '⚡',
    flow: '✨',
    mixed: '🌊',
    quiet: '🌙',
  }[content.energyQuality];
  
  return `${qualityEmoji} ${content.headline}`;
}
