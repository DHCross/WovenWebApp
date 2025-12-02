/**
 * Resonance Seismograph - Relational Weather Calculator
 * 
 * Treats Synastry as TERRAIN (static map) and Transits as WEATHER (dynamic).
 * Computes a merged relational field from two individual transit streams.
 * 
 * === RAVEN CALDER: SYMBOLIC SYSTEMS DIAGNOSTIC (SSD) ===
 * Raven is NOT a "Jungian Astrologer." Raven is a Symbolic Systems Diagnostic engine.
 * 
 * The Astrology API v3 "Psychological" mode provides compatible RAW MATERIAL because
 * it offers Archetypal Texture without fatalism or event-prediction. But Raven
 * TRANSFORMS this input through the Field → Map → Voice pipeline:
 * 
 *   API supplies NOUNS (Saturn, Restriction, Structure)
 *   Math Brain supplies VERBS/ADJECTIVES (High Magnitude, Compressive, Volatile)
 *   Raven arranges them into DIAGNOSTIC SENTENCES that mirror reality without commanding it
 * 
 * === CORPUS ALIGNMENT ===
 * This module outputs the FIELD layer that feeds the Raven Calder Corpus.
 * All outputs must conform to the Corpus data contract:
 * - `valence` = direct copy of `directional_bias` (SST bridge requirement)
 * - `resonance_flags` = geometric evidence for WB/ABE/OSR narrative selection
 * - Shared hits → WB potential | Divergence → ABE tension
 * 
 * === 🔒 JUNGIAN LOCK (Texture Source) ===
 * The API's "psychological" tradition is locked as the texture source because:
 * - It speaks the LANGUAGE of symbols (which Raven needs)
 * - But Raven enforces the GRAMMAR of geometry and agency
 * - API text is treated as Archetypal Data, not truth
 * 
 * Transformation Example:
 *   API says: "You may feel depressed and blocked."
 *   Raven reads: Theme=Restriction, Tone=Heavy, Target=Vitality
 *   Raven strips emotion ("depressed") → replaces with geometry ("compression")
 * 
 * Key Physics:
 * - Magnitude: "Loudest Signal" rule (max of A/B) + Resonance Bonus for shared hits
 * - Bias: Average of both, but divergence creates instability
 * - Volatility: Divergence Tax when pulling in opposite directions
 * 
 * @see Developers Notes/Core/Four Report Types_Integrated 10.1.25.md
 * @see Raven_Calder_config_Updated.yaml
 */

// ============================================================
// CORPUS PROTOCOL CONSTANTS
// ============================================================

/** Format identifier for Corpus ingestion */
export const CORPUS_FORMAT = 'mirror-symbolic-weather-v1';

/** Math Brain version for provenance tracking */
export const MATH_BRAIN_VERSION = '3.2.0';

/** 
 * 🔒 JUNGIAN LOCK: API Texture Source (NOT Raven's identity)
 * 
 * CRITICAL DISTINCTION:
 * - Raven is a Symbolic Systems Diagnostic (SSD) engine
 * - Raven is NOT a "Jungian Astrologer"
 * - The API's "psychological" tradition is the most compatible RAW MATERIAL
 *   because it provides Archetypal Texture without fatalism or event-prediction
 * 
 * The API supplies the NOUNS (Saturn, Restriction, Structure)
 * Math Brain supplies the VERBS (High Magnitude, Compressive)
 * Raven arranges them into DIAGNOSTIC SENTENCES
 * 
 * This setting ensures:
 * - API returns text about internal states (not external events)
 * - Raven can transform it through Field → Map → Voice
 * - SST can classify resonance (WB/ABE/OSR) without deterministic bias
 */
export const JUNGIAN_TRADITION = 'psychological' as const;

/**
 * Engine identity constant.
 * Raven is NOT a Jungian Astrologer—it's a Symbolic Systems Diagnostic.
 */
export const ENGINE_IDENTITY = 'symbolic-systems-diagnostic' as const;

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface TransitEntry {
  date: string;
  magnitude: number;
  directional_bias: number; // -5 to +5
  volatility: number;       // 0 to 5
  transits: Array<{
    planet: string;
    aspect: string;
    degree?: number;
    natal_planet?: string;
  }>;
}

export interface SynastryAspect {
  p1_planet: string;
  p2_planet: string;
  aspect: string;
  orb: number;
  degree_a?: number; // Degree in Person A's chart
  degree_b?: number; // Degree in Person B's chart
}

/**
 * Corpus-compliant seismograph entry
 * Includes both `directional_bias` (internal) and `valence` (Corpus bridge)
 */
export interface CorpusSeismographEntry {
  magnitude: number;      // 0-5
  valence: number;        // -5 to +5 (CORPUS REQUIREMENT: mapped from directional_bias)
  volatility: number;     // 0-5
}

/**
 * Corpus-compliant resonance flags
 * Provides geometric evidence for SST narrative selection
 */
export interface CorpusResonanceFlags {
  divergence: boolean;           // ABE tension indicator
  shared_geometry: string[];     // WB potential evidence (e.g., "Sun_conjunct_Venus")
}

export interface ResonanceDailyEntry {
  date: string;
  
  // === CORPUS-COMPLIANT SEISMOGRAPH ===
  seismograph: CorpusSeismographEntry;
  
  // === CORPUS-COMPLIANT RESONANCE FLAGS ===
  resonance_flags: CorpusResonanceFlags;
  
  // === INTERNAL DEBUG DATA (retained for Math Brain debugging) ===
  _internal: {
    directional_bias: number;   // Original bias (Corpus uses valence instead)
    is_resonance_day: boolean;
    individual: {
      personA: { magnitude: number; bias: number };
      personB: { magnitude: number; bias: number };
    };
  };
}

export interface ResonanceSeismographResult {
  entries: ResonanceDailyEntry[];
  summary: {
    peak_resonance_day: string | null;
    peak_magnitude: number;
    avg_magnitude: number;
    divergence_days: number;
    resonance_events_count: number;
    total_days: number;
  };
  terrain: {
    hot_degrees: number[];
    hot_degrees_count: number;
    synastry_aspects_used: number;
  };
}

// ============================================================
// RESONANCE DETECTION
// ============================================================

/** Orb tolerance for terrain activation (degrees) */
const TERRAIN_ORB_TOLERANCE = 2.0;

/** Synastry aspects tighter than this count as "Hot" terrain */
const HOT_SYNASTRY_ORB = 3.0;

/** Resonance multiplier for shared activations */
const RESONANCE_MAGNITUDE_MULTIPLIER = 1.25;

/** Volatility penalty for divergent bias */
const DIVERGENCE_VOLATILITY_PENALTY = 2.0;

/** Threshold for detecting "pulling in opposite directions" */
const DIVERGENCE_BIAS_THRESHOLD = 1.5;

/** Threshold for large bias difference triggering volatility tax */
const BIAS_DIFF_VOLATILITY_THRESHOLD = 4.0;

/**
 * Detects resonance events between two transit streams on a given day.
 * Returns Corpus-compliant shared_geometry strings (e.g., "Mars_conjunction_Sun")
 * 
 * Resonance occurs when:
 * 1. Shared Transit: Same planet hits both people simultaneously
 * 2. Terrain Activation: A transit hits a "Hot Degree" (synastry aspect point)
 */
function checkResonance(
  transitsA: TransitEntry['transits'],
  transitsB: TransitEntry['transits'],
  hotDegrees: number[]
): { sharedGeometry: string[]; rawEvents: string[] } {
  const sharedGeometry: string[] = [];
  const rawEvents: string[] = [];

  // 1. Shared Transit (Simultaneity): Same planet hitting both people
  const planetsA = new Set(transitsA.map(t => t.planet));
  const planetsB = new Set(transitsB.map(t => t.planet));
  
  planetsA.forEach(planet => {
    if (planetsB.has(planet)) {
      // Find the aspects being made for Corpus-compliant geometry string
      const transitA = transitsA.find(t => t.planet === planet);
      const transitB = transitsB.find(t => t.planet === planet);
      
      if (transitA && transitB && transitA.natal_planet && transitB.natal_planet) {
        // Format: Planet_aspect_NatalPlanet (Corpus SST format)
        sharedGeometry.push(`${planet}_${transitA.aspect}_${transitA.natal_planet}`);
        if (transitA.natal_planet !== transitB.natal_planet) {
          sharedGeometry.push(`${planet}_${transitB.aspect}_${transitB.natal_planet}`);
        }
      }
      rawEvents.push(`Shared ${planet} transit`);
    }
  });

  // 2. Terrain Activation: Transit hitting a synastry aspect degree
  const allTransits = [...transitsA, ...transitsB];
  
  allTransits.forEach(t => {
    if (typeof t.degree === 'number') {
      const hitDegree = hotDegrees.find(
        hd => Math.abs(t.degree! - hd) <= TERRAIN_ORB_TOLERANCE
      );
      if (hitDegree !== undefined) {
        if (t.natal_planet) {
          sharedGeometry.push(`${t.planet}_terrain_${t.natal_planet}`);
        }
        rawEvents.push(`${t.planet} activating synastry terrain @ ${hitDegree.toFixed(0)}°`);
      }
    }
  });

  // Deduplicate
  return {
    sharedGeometry: Array.from(new Set(sharedGeometry)),
    rawEvents: Array.from(new Set(rawEvents))
  };
}

/**
 * Extracts "Hot Degrees" from synastry aspects.
 * These are the degrees where A and B have tight aspects - the relational terrain.
 */
function extractHotDegrees(synastryAspects: SynastryAspect[]): number[] {
  return synastryAspects
    .filter(a => Math.abs(a.orb) <= HOT_SYNASTRY_ORB)
    .flatMap(a => [a.degree_a, a.degree_b])
    .filter((d): d is number => typeof d === 'number');
}

// ============================================================
// MAIN COMPUTATION
// ============================================================

/**
 * Computes the Resonance Seismograph from two individual transit streams.
 * 
 * OUTPUT CONFORMS TO CORPUS DATA CONTRACT:
 * - Each entry includes `seismograph` with `valence` (not just directional_bias)
 * - Each entry includes `resonance_flags` with `divergence` and `shared_geometry`
 * - Original directional_bias retained in `_internal` for debugging
 * 
 * @param streamA - Person A's transit entries (from getTransitsV3 or similar)
 * @param streamB - Person B's transit entries
 * @param synastryAspects - Cross-chart aspects from synastry call
 * @returns Complete resonance graph with Corpus-compliant structure
 */
export function computeResonanceSeismograph(
  streamA: TransitEntry[],
  streamB: TransitEntry[],
  synastryAspects: SynastryAspect[]
): ResonanceSeismographResult {
  
  // 1. Extract "Hot Degrees" from synastry (the terrain)
  const hotDegrees = extractHotDegrees(synastryAspects);

  // 2. Align both streams by date
  const dateMap = new Map<string, { a?: TransitEntry; b?: TransitEntry }>();
  
  streamA.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, {});
    dateMap.get(d.date)!.a = d;
  });
  
  streamB.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, {});
    dateMap.get(d.date)!.b = d;
  });

  // 3. Process each day
  let totalResonanceEvents = 0;
  let divergenceDays = 0;
  let peakMag = 0;
  let peakDate: string | null = null;
  let magSum = 0;

  const entries: ResonanceDailyEntry[] = Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, pair]) => {
      const a = pair.a;
      const b = pair.b;

      // Handle missing data gracefully (use neutral values)
      const magA = a?.magnitude ?? 0;
      const magB = b?.magnitude ?? 0;
      const biasA = a?.directional_bias ?? 0;
      const biasB = b?.directional_bias ?? 0;
      const volA = a?.volatility ?? 0;
      const volB = b?.volatility ?? 0;

      // === MAGNITUDE: Loudest Signal + Resonance Bonus ===
      let compositeMag = Math.max(magA, magB);
      
      const resonanceResult = checkResonance(
        a?.transits || [], 
        b?.transits || [], 
        hotDegrees
      );
      const isResonanceDay = resonanceResult.rawEvents.length > 0;

      if (isResonanceDay) {
        compositeMag *= RESONANCE_MAGNITUDE_MULTIPLIER;
        totalResonanceEvents += resonanceResult.rawEvents.length;
      }

      // Clamp magnitude
      compositeMag = Math.min(compositeMag, 5);

      // Track peak
      if (compositeMag > peakMag) {
        peakMag = compositeMag;
        peakDate = date;
      }
      magSum += compositeMag;

      // === DIRECTIONAL BIAS: Average ===
      const compositeBias = (biasA + biasB) / 2;

      // === VOLATILITY: Average + Divergence Tax ===
      let compositeVol = (volA + volB) / 2;
      
      // Divergence Check: Are they pulling in opposite directions?
      const isDivergent = 
        (biasA > DIVERGENCE_BIAS_THRESHOLD && biasB < -DIVERGENCE_BIAS_THRESHOLD) ||
        (biasA < -DIVERGENCE_BIAS_THRESHOLD && biasB > DIVERGENCE_BIAS_THRESHOLD);
      
      const biasDiff = Math.abs(biasA - biasB);

      if (isDivergent || biasDiff > BIAS_DIFF_VOLATILITY_THRESHOLD) {
        compositeVol += DIVERGENCE_VOLATILITY_PENALTY;
        divergenceDays++;
      }

      // Clamp volatility
      compositeVol = Math.min(compositeVol, 5);

      // === BUILD CORPUS-COMPLIANT ENTRY ===
      return {
        date,
        
        // CORPUS SEISMOGRAPH: valence = directional_bias (SST bridge)
        seismograph: {
          magnitude: Number(compositeMag.toFixed(2)),
          valence: Number(compositeBias.toFixed(2)),  // CORPUS REQUIREMENT
          volatility: Number(compositeVol.toFixed(2))
        },
        
        // CORPUS RESONANCE FLAGS: geometric evidence for WB/ABE/OSR
        resonance_flags: {
          divergence: isDivergent,                       // ABE tension indicator
          shared_geometry: resonanceResult.sharedGeometry // WB potential evidence
        },
        
        // Internal debug data (not for Corpus, retained for Math Brain)
        _internal: {
          directional_bias: Number(compositeBias.toFixed(2)),
          is_resonance_day: isResonanceDay,
          individual: {
            personA: { magnitude: magA, bias: biasA },
            personB: { magnitude: magB, bias: biasB }
          }
        }
      };
    });

  // 4. Compute summary stats
  const totalDays = entries.length;
  const avgMag = totalDays > 0 ? magSum / totalDays : 0;

  return {
    entries,
    summary: {
      peak_resonance_day: peakDate,
      peak_magnitude: Number(peakMag.toFixed(2)),
      avg_magnitude: Number(avgMag.toFixed(2)),
      divergence_days: divergenceDays,
      resonance_events_count: totalResonanceEvents,
      total_days: totalDays
    },
    terrain: {
      hot_degrees: hotDegrees,
      hot_degrees_count: hotDegrees.length,
      synastry_aspects_used: synastryAspects.filter(a => Math.abs(a.orb) <= HOT_SYNASTRY_ORB).length
    }
  };
}

// ============================================================
// TRANSFORM HELPERS
// ============================================================

/**
 * Transforms raw API transit response into TransitEntry format.
 * This bridges the gap between API response shape and seismograph input.
 * 
 * @param apiResponse - Raw response from /api/v3/charts/natal-transits
 * @param seismographData - Pre-computed seismograph entries (magnitude/bias/volatility)
 */
export function transformToTransitEntries(
  apiResponse: {
    transits?: Array<{
      date: string;
      transiting_planet: string;
      aspect_type: string;
      transit_degree?: number;
      natal_planet?: string;
    }>;
  },
  seismographData: Array<{
    date: string;
    magnitude: number;
    directional_bias: number;
    volatility?: number;
  }>
): TransitEntry[] {
  // Group transits by date
  const transitsByDate = new Map<string, TransitEntry['transits']>();
  
  (apiResponse.transits || []).forEach(t => {
    const dateKey = t.date;
    if (!transitsByDate.has(dateKey)) {
      transitsByDate.set(dateKey, []);
    }
    transitsByDate.get(dateKey)!.push({
      planet: t.transiting_planet,
      aspect: t.aspect_type,
      degree: t.transit_degree,
      natal_planet: t.natal_planet
    });
  });

  // Merge with seismograph data
  return seismographData.map(s => ({
    date: s.date,
    magnitude: s.magnitude,
    directional_bias: s.directional_bias,
    volatility: s.volatility ?? 0,
    transits: transitsByDate.get(s.date) || []
  }));
}
