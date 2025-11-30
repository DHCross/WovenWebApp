/**
 * Payload Trimming for Poetic Brain / External GPT Export
 * 
 * Per Raven Calder Authoritative Export Spec (Nov 2025):
 * 
 * ⭐ MUST KEEP (safeguards + accelerators):
 * - Top-level structural metadata (_format, _version, _contains_transits, _range_dates, etc.)
 * - Birth data + relocation context (prevents computational overhead)
 * - Angles + their signs (ASC, MC, DSC, IC signs - orientation-defining)
 * - House cusps (numeric 12-element array)
 * - Planet blocks: abs_pos, retrograde, house, sign/sign_num only
 * - Symbolic weather essentials: date, meter.magnitude, meter.directional_bias + labels
 * - Mode indicators (mode, chart_basis, seismograph_chart)
 * - Validation block (_validation.valid, errors, warnings)
 * - Provenance minimal (math_brain_version, house_system, orbs_profile, timezone, time_precision)
 * 
 * 🗑️ MUST REMOVE (bloat culprits):
 * - persona_excerpt (~90% of bloat!)
 * - Generated narrative text, interpretations
 * - Emojis, quality, element, ruler
 * - Aspect tables (natal/transit/synastry) - GPT computes its own
 * - Seismograph internals (rawMagnitude, normalized, transform_pipeline)
 * - Duplicate fields (position vs abs_pos, birth_data duplication in chart)
 */

/** Fields to keep on planet objects */
const PLANET_KEEP_FIELDS = new Set([
  'abs_pos',
  'retrograde',
  'house',
  'sign',        // Optional but cheap and saves inference
  'sign_num',    // Optional but cheap
]);

/** Fields to remove from planet objects (decorator/noise) */
const PLANET_DROP_FIELDS = new Set([
  'name',        // Redundant - already the key
  'quality',     // Traditionalist noise - can derive from sign
  'element',     // Traditionalist noise - can derive from sign
  'emoji',       // UI decorator
  'point_type',  // Not used by Poetic Brain
  'position',    // Redundant - use abs_pos
]);

/** Top-level metadata fields to drop */
const METADATA_DROP_FIELDS = new Set([
  '_poetic_brain_compatible',  // Backend routing, not for Poetic Brain
  '_template_hint',            // UI hint, already have _format
]);

/** Provenance fields to drop (especially persona_excerpt which is massive) */
const PROVENANCE_DROP_FIELDS = new Set([
  'persona_excerpt',           // CRITICAL: This is huge text dump
  'persona_excerpt_source',    // Not needed if excerpt dropped
  'identity',                  // Overkill logging data
]);

/** Fields to keep in provenance (important for context/audit) */
const PROVENANCE_KEEP_FIELDS = new Set([
  'math_brain_version',
  'ephemeris_source',
  'build_ts',
  'timezone',
  'tz_authority',
  'house_system',
  'orbs_profile',
  'timezone_db_version',
  'relocation_applied',
  'relocation_mode',
  'relocation_summary',
  'time_meta_a',              // Contains birth_time_known, time_precision
  'time_meta_b',
  'tz_conflict',
  'geometry_ready',
  'calibration_boundary',
  'engine_versions',
  'time_precision',           // ⭐ Explicitly keep (per spec)
]);

/** Seismograph fields to keep (just the final values) */
const SEISMOGRAPH_KEEP_FIELDS = new Set([
  'magnitude',
  'directional_bias',
  'volatility',
]);

/** Chart-level fields to drop (duplicate of birth_data) */
const CHART_DROP_FIELDS = new Set([
  'name',                      // Duplicate
  'year',                      // Duplicate of birth_data
  'month',                     // Duplicate
  'day',                       // Duplicate
  'hour',                      // Duplicate
  'minute',                    // Duplicate
  'city',                      // Often "Relocated Location" - not useful
  'nation',                    // Duplicate
  'sidereal_mode',             // Usually null
  'perspective_type',          // Assumed apparent geocentric
  'utc_time',                  // Redundant with ISO timestamps
  'local_time',                // Redundant with ISO timestamps
  'planets_names_list',        // Useless list
  'axial_cusps_names_list',    // Useless list
  // NOTE: aspects are KEPT - Poetic Brain's buildMandatesForChart needs them!
]);

/** Chart-level fields to keep */
const CHART_KEEP_FIELDS = new Set([
  'lng',                       // Relocated longitude
  'lat',                       // Relocated latitude
  'tz_str',                    // Timezone
  'zodiac_type',               // Tropical vs Sidereal
  'sidereal_mode',             // Keep if used (per spec)
  'houses_system_identifier',  // P = Placidus, etc.
  'houses_system_name',        // Human readable
  'iso_formatted_local_datetime',  // Nice to have for audit
  'iso_formatted_utc_datetime',    // Nice to have for audit
  'julian_day',                // Useful for audit
  'house_cusps',               // CRITICAL: 12-element array
]);

/** Planet keys (lowercase) to process */
const PLANET_KEYS = new Set([
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'chiron', 'mean_lilith', 'mean_node', 'true_node',
  'mean_south_node', 'true_south_node',
]);

/** Axial/angle keys */
const AXIAL_KEYS = new Set([
  'ascendant', 'descendant', 'medium_coeli', 'imum_coeli',
]);

/** House cusp keys (to convert to cusps array if not already) */
const HOUSE_KEYS = new Set([
  'first_house', 'second_house', 'third_house', 'fourth_house',
  'fifth_house', 'sixth_house', 'seventh_house', 'eighth_house',
  'ninth_house', 'tenth_house', 'eleventh_house', 'twelfth_house',
]);

/**
 * Trim a planet object to essential fields only
 */
function trimPlanetObject(planet: any): any {
  if (!planet || typeof planet !== 'object') return planet;
  
  const trimmed: any = {};
  
  // Always keep abs_pos - this is the critical data
  if (typeof planet.abs_pos === 'number') {
    trimmed.abs_pos = planet.abs_pos;
  }
  
  // Keep retrograde status
  if (typeof planet.retrograde === 'boolean') {
    trimmed.retrograde = planet.retrograde;
  }
  
  // Keep house placement (saves Poetic Brain from recomputing)
  if (planet.house) {
    trimmed.house = planet.house;
  }
  
  // Optionally keep sign info (cheap and useful)
  if (planet.sign) {
    trimmed.sign = planet.sign;
  }
  if (typeof planet.sign_num === 'number') {
    trimmed.sign_num = planet.sign_num;
  }
  
  return trimmed;
}

/**
 * Trim a chart object to essential fields only
 * Converts individual house objects to cusps array if needed
 * Adds angle_signs for quick orientation reference
 */
function trimChartObject(chart: any): any {
  if (!chart || typeof chart !== 'object') return chart;
  
  const trimmed: any = {};
  
  // Keep essential chart metadata
  for (const field of CHART_KEEP_FIELDS) {
    if (chart[field] !== undefined) {
      trimmed[field] = chart[field];
    }
  }
  
  // ⭐ Add angle signs (per spec: "the only sign labels that carry structural, orientation-defining information")
  trimmed.angle_signs = {};
  if (chart.ascendant?.sign) trimmed.angle_signs.ascendant = chart.ascendant.sign;
  if (chart.medium_coeli?.sign) trimmed.angle_signs.mc = chart.medium_coeli.sign;
  if (chart.descendant?.sign) trimmed.angle_signs.descendant = chart.descendant.sign;
  if (chart.imum_coeli?.sign) trimmed.angle_signs.ic = chart.imum_coeli.sign;
  
  // Build positions object with trimmed planets
  trimmed.positions = {};
  
  // Process planets
  for (const key of PLANET_KEYS) {
    if (chart[key]) {
      trimmed.positions[key] = trimPlanetObject(chart[key]);
    }
  }
  
  // Process axial points (ASC, DSC, MC, IC)
  for (const key of AXIAL_KEYS) {
    if (chart[key]) {
      trimmed.positions[key] = trimPlanetObject(chart[key]);
    }
  }
  
  // Ensure house_cusps is a 12-element array
  if (Array.isArray(chart.house_cusps) && chart.house_cusps.length === 12) {
    trimmed.house_cusps = chart.house_cusps;
  } else {
    // Build from individual house objects if needed
    const cusps: number[] = [];
    const houseOrder = [
      'first_house', 'second_house', 'third_house', 'fourth_house',
      'fifth_house', 'sixth_house', 'seventh_house', 'eighth_house',
      'ninth_house', 'tenth_house', 'eleventh_house', 'twelfth_house',
    ];
    for (const houseKey of houseOrder) {
      if (chart[houseKey]?.abs_pos !== undefined) {
        cusps.push(chart[houseKey].abs_pos);
      }
    }
    if (cusps.length === 12) {
      trimmed.house_cusps = cusps;
    }
  }
  
  // Keep transitsByDate but trim each day's data
  if (chart.transitsByDate && typeof chart.transitsByDate === 'object') {
    trimmed.transitsByDate = trimTransitsByDate(chart.transitsByDate);
  }
  
  // KEEP aspects at chart level - buildMandatesForChart expects chart.aspects
  if (Array.isArray(chart.aspects) && chart.aspects.length > 0) {
    trimmed.aspects = chart.aspects;
  }
  
  return trimmed;
}

/**
 * Trim seismograph to just the final axis values
 */
function trimSeismograph(seismo: any): any {
  if (!seismo || typeof seismo !== 'object') return null;
  
  const trimmed: any = {};
  
  // Extract magnitude (could be nested or direct)
  if (typeof seismo.magnitude === 'number') {
    trimmed.magnitude = seismo.magnitude;
  } else if (seismo.magnitude?.value !== undefined) {
    trimmed.magnitude = seismo.magnitude.value;
  }
  
  // Extract directional_bias (often nested)
  if (typeof seismo.directional_bias === 'number') {
    trimmed.directional_bias = seismo.directional_bias;
  } else if (seismo.directional_bias?.value !== undefined) {
    trimmed.directional_bias = seismo.directional_bias.value;
  }
  
  // Extract volatility
  if (typeof seismo.volatility === 'number') {
    trimmed.volatility = seismo.volatility;
  }
  
  // Keep labels (they're small and useful)
  if (seismo.magnitude_label) {
    trimmed.magnitude_label = seismo.magnitude_label;
  }
  if (seismo.directional_bias?.label || seismo.directional_bias_label) {
    trimmed.directional_bias_label = seismo.directional_bias?.label || seismo.directional_bias_label;
  }
  if (seismo.volatility_label) {
    trimmed.volatility_label = seismo.volatility_label;
  }
  
  return trimmed;
}

/**
 * Trim a single day's transit data
 */
function trimTransitDay(dayData: any): any {
  if (!dayData || typeof dayData !== 'object') return dayData;
  
  const trimmed: any = {};
  
  // Keep only trimmed seismograph
  if (dayData.seismograph) {
    trimmed.seismograph = trimSeismograph(dayData.seismograph);
  }
  
  // Keep transit positions if present (as trimmed objects)
  if (dayData.positions && typeof dayData.positions === 'object') {
    trimmed.positions = {};
    for (const [key, value] of Object.entries(dayData.positions)) {
      if (PLANET_KEYS.has(key) || AXIAL_KEYS.has(key)) {
        trimmed.positions[key] = trimPlanetObject(value);
      }
    }
  }
  
  // Keep moon_phase_name (useful context, small)
  if (dayData.moon_phase_name) {
    trimmed.moon_phase_name = dayData.moon_phase_name;
  }
  
  // DROP: aspects, filtered_aspects, hooks, drivers, transit_table, counts
  // These are all "baked cake" - Poetic Brain computes its own
  
  return trimmed;
}

/**
 * Trim all transitsByDate entries
 */
function trimTransitsByDate(transits: Record<string, any>): Record<string, any> {
  if (!transits || typeof transits !== 'object') return {};
  
  const trimmed: Record<string, any> = {};
  
  for (const [date, dayData] of Object.entries(transits)) {
    trimmed[date] = trimTransitDay(dayData);
  }
  
  return trimmed;
}

/**
 * Trim provenance to essential fields
 */
function trimProvenance(prov: any): any {
  if (!prov || typeof prov !== 'object') return prov;
  
  const trimmed: any = {};
  
  for (const field of PROVENANCE_KEEP_FIELDS) {
    if (prov[field] !== undefined) {
      trimmed[field] = prov[field];
    }
  }
  
  // Keep relocation_detail.coords if present (summarized version)
  if (prov.relocation_detail?.coords) {
    trimmed.relocation_coords = prov.relocation_detail.coords;
  }
  
  return trimmed;
}

/**
 * Trim a person object (person_a or person_b)
 */
function trimPersonObject(person: any): any {
  if (!person || typeof person !== 'object') return person;
  
  const trimmed: any = {};
  
  // Keep name
  if (person.name) {
    trimmed.name = person.name;
  }
  
  // Keep birth_data (it's small and essential)
  if (person.birth_data) {
    trimmed.birth_data = person.birth_data;
  }
  
  // Trim chart
  if (person.chart) {
    trimmed.chart = trimChartObject(person.chart);
  }
  
  // KEEP aspects - Poetic Brain's buildMandatesForChart needs them!
  // Without natal aspects, mandate generation returns empty results
  if (Array.isArray(person.aspects) && person.aspects.length > 0) {
    trimmed.aspects = person.aspects;
  }
  
  // DROP: summary (can be derived from chart)
  
  return trimmed;
}

/**
 * Trim daily_readings to essential fields
 */
function trimDailyReadings(readings: any[]): any[] {
  if (!Array.isArray(readings)) return [];
  
  return readings.map(reading => {
    const trimmed: any = {
      date: reading.date,
    };
    
    // Keep final meter values
    if (reading.magnitude !== undefined) trimmed.magnitude = reading.magnitude;
    if (reading.directional_bias !== undefined) trimmed.directional_bias = reading.directional_bias;
    if (reading.volatility !== undefined) trimmed.volatility = reading.volatility;
    if (reading.coherence !== undefined) trimmed.coherence = reading.coherence;
    
    // DROP: raw_magnitude, raw_bias_signed, raw_volatility (debugging data)
    // DROP: aspects, aspect_count (baked calculations)
    // DROP: overflow_detail (debugging data)
    // DROP: label, notes (if empty)
    
    return trimmed;
  });
}

/**
 * Trim balance_meter_frontstage to essential fields
 */
function trimBalanceMeter(meter: any): any {
  if (!meter || typeof meter !== 'object') return meter;
  
  return {
    magnitude: meter.magnitude,
    directional_bias: meter.directional_bias,
    volatility: meter.volatility,
    coherence: meter.coherence,
    magnitude_label: meter.magnitude_label,
    directional_bias_label: meter.directional_bias_label,
    volatility_label: meter.volatility_label,
  };
}

/**
 * Main function: Trim entire payload for Poetic Brain consumption
 * 
 * @param payload - The full Mirror + Symbolic Weather payload
 * @returns Trimmed payload with only essential data
 */
export function trimPayloadForPoeticBrain(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  
  const trimmed: any = {};
  
  // Keep essential metadata (format, version, range info)
  if (payload._format) trimmed._format = payload._format;
  if (payload._version) trimmed._version = payload._version;
  if (payload._contains_transits !== undefined) trimmed._contains_transits = payload._contains_transits;
  if (payload._contains_weather_data !== undefined) trimmed._contains_weather_data = payload._contains_weather_data;
  if (payload._range_dates) trimmed._range_dates = payload._range_dates;
  if (payload._transit_days !== undefined) trimmed._transit_days = payload._transit_days;
  if (payload._natal_sections !== undefined) trimmed._natal_sections = payload._natal_sections;
  if (payload._required_sections) trimmed._required_sections = payload._required_sections;
  if (payload.generated_at) trimmed.generated_at = payload.generated_at;
  
  // DROP: _poetic_brain_compatible, _template_hint
  
  // Keep _natal_section but trim relationship_context to essentials
  if (payload._natal_section) {
    trimmed._natal_section = {
      mirror_source: payload._natal_section.mirror_source,
      note: payload._natal_section.note,
    };
    if (payload._natal_section.relationship_context) {
      const rc = payload._natal_section.relationship_context;
      trimmed._natal_section.relationship_context = {
        type: rc.type,
        intimacy_tier: rc.intimacy_tier,
        contact_state: rc.contact_state,
        ex_estranged: rc.ex_estranged,
      };
    }
  }
  
  // Trim person_a
  if (payload.person_a) {
    trimmed.person_a = trimPersonObject(payload.person_a);
  }
  
  // Trim person_b
  if (payload.person_b) {
    trimmed.person_b = trimPersonObject(payload.person_b);
  }
  
  // Keep report_kind
  if (payload.report_kind) trimmed.report_kind = payload.report_kind;
  
  // ⭐ CRITICAL: Keep mirror_contract (contains is_relational flag for Poetic Brain)
  // Without this, Poetic Brain won't know to generate solo_mirror_b or relational_engine
  if (payload.mirror_contract) {
    trimmed.mirror_contract = payload.mirror_contract;
  }
  
  // Keep relationship_context (small, essential for relational reads)
  if (payload.relationship_context) {
    trimmed.relationship_context = payload.relationship_context;
  }
  
  // Keep relationship_details
  if (payload.relationship_details) {
    trimmed.relationship_details = payload.relationship_details;
  }
  
  // Keep translocation_context
  if (payload.translocation_context) {
    trimmed.translocation_context = payload.translocation_context;
  }
  
  // Trim balance_meter_frontstage
  if (payload.balance_meter_frontstage) {
    trimmed.balance_meter_frontstage = trimBalanceMeter(payload.balance_meter_frontstage);
  }
  
  // Trim daily_readings
  if (Array.isArray(payload.daily_readings)) {
    trimmed.daily_readings = trimDailyReadings(payload.daily_readings);
  }
  
  // Keep reading_count
  if (payload.reading_count !== undefined) trimmed.reading_count = payload.reading_count;
  
  // ⭐ Keep mode indicators (per spec: "Instant context priming")
  if (payload.mode) trimmed.mode = payload.mode;
  if (payload.chart_basis) trimmed.chart_basis = payload.chart_basis;
  if (payload.seismograph_chart) trimmed.seismograph_chart = payload.seismograph_chart;
  
  // Trim provenance (CRITICAL: removes persona_excerpt)
  if (payload.provenance) {
    trimmed.provenance = trimProvenance(payload.provenance);
  }
  
  // Keep signed_map_package
  if (payload.signed_map_package) trimmed.signed_map_package = payload.signed_map_package;
  
  // Keep _validation (small, useful for truncation detection)
  if (payload._validation) {
    trimmed._validation = payload._validation;
  }
  
  // DROP: symbolic_weather_context (redundant with daily_readings)
  // DROP: woven_map (usually duplicates other data)
  
  return trimmed;
}

/**
 * Calculate approximate size reduction
 */
export function estimatePayloadReduction(original: any, trimmed: any): {
  originalSize: number;
  trimmedSize: number;
  reduction: number;
  reductionPercent: string;
} {
  const originalStr = JSON.stringify(original);
  const trimmedStr = JSON.stringify(trimmed);
  const originalSize = originalStr.length;
  const trimmedSize = trimmedStr.length;
  const reduction = originalSize - trimmedSize;
  const reductionPercent = ((reduction / originalSize) * 100).toFixed(1);
  
  return {
    originalSize,
    trimmedSize,
    reduction,
    reductionPercent: `${reductionPercent}%`,
  };
}

export default trimPayloadForPoeticBrain;
