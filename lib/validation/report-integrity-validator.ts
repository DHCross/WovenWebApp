/**
 * Report Integrity Validator
 * 
 * Central validation module for the Woven Map / Math Brain / Poetic Brain system.
 * Enforces the Jules Constitution constraints across all report generation paths.
 * 
 * STRUCTURAL INVARIANTS (per Jules Constitution Article IV):
 * - kind + personB + relationship_context form a CONSISTENT TRIPLE
 * - The system NEVER silently guesses or infers missing relational intent
 * - If invariants fail: (a) REJECT request, or (b) EXPLICIT downgrade to math_only + generic mode
 * 
 * VALIDATION CHECKPOINTS (map stages):
 * - 1b/1c: Detect kind from request
 * - 2c: Extract/verify relationship_context  
 * - 6b/6c/6d: Assert triple consistency BEFORE 4e/5a see the data
 * 
 * @module lib/validation/report-integrity-validator
 */

// ============================================================================
// CANONICAL CONSTANTS (Jules Constitution Article I)
// ============================================================================

/**
 * The only valid relocation modes per Jules Constitution Article I.
 * Any other value is a bug and must be rejected or normalized.
 */
export const CANONICAL_RELOCATION_MODES = [
  'A_local',
  'B_local',
  'both_local',
  'event',
  'none',
  null,
] as const;

export type CanonicalRelocationMode = typeof CANONICAL_RELOCATION_MODES[number];

/**
 * Balance Meter v5.0 canonical ranges (Jules Constitution Article III)
 */
export const BALANCE_METER_RANGES = {
  magnitude: { min: 0, max: 5 },
  directional_bias: { min: -5, max: 5 },
  volatility: { min: 0, max: 5 },
} as const;

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  message: string;
  severity: ValidationSeverity;
  path?: string;
  context?: Record<string, unknown>;
}

export interface ReportValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  /** If true, Poetic Brain must use generic low-assumption voice */
  forceGenericSymbolicRead: boolean;
  /** 
   * EXPLICIT DOWNGRADE MODE (per Jules Constitution Article IV)
   * When relational invariants are violated but request can proceed:
   * - math_only: Return numeric climate only, no symbolic read
   * - generic_symbolic: Return symbolic read but with NO role/obligation assumptions
   * - null: No downgrade, full relational output permitted
   */
  explicitDowngradeMode: 'math_only' | 'generic_symbolic' | null;
  /** Summary for logging */
  summary: string;
}

// ============================================================================
// VALIDATION CONTEXT
// ============================================================================

export interface ValidationContext {
  /** Is this a request for symbolic read (Poetic Brain) output? */
  requestsSymbolicRead?: boolean;
  /** Export type being validated */
  exportType?: 'json' | 'pdf' | 'markdown' | 'api-response';
  /** Strict mode rejects warnings as errors */
  strictMode?: boolean;
  /** If true, allow math_only mode as explicit downgrade when context missing */
  allowMathOnlyFallback?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createIssue(
  code: string,
  message: string,
  severity: ValidationSeverity,
  path?: string,
  context?: Record<string, unknown>
): ValidationIssue {
  return { code, message, severity, path, context };
}

function isCanonicalRelocationMode(mode: unknown): mode is CanonicalRelocationMode {
  if (mode === null || mode === undefined) return true;
  if (typeof mode !== 'string') return false;
  const normalized = mode.toLowerCase();
  return ['a_local', 'b_local', 'both_local', 'event', 'none'].includes(normalized);
}

function normalizeRelocationModeForValidation(mode: unknown): string | null {
  if (mode === null || mode === undefined) return null;
  if (typeof mode !== 'string') return null;
  const lower = mode.toLowerCase().trim();
  
  // Map common aliases to canonical forms
  const aliases: Record<string, string> = {
    'a_local': 'A_local',
    'a-local': 'A_local',
    'alocal': 'A_local',
    'person_a': 'A_local',
    'person-a': 'A_local',
    'b_local': 'B_local',
    'b-local': 'B_local',
    'blocal': 'B_local',
    'person_b': 'B_local',
    'person-b': 'B_local',
    'both_local': 'both_local',
    'both-local': 'both_local',
    'both': 'both_local',
    'dual_local': 'both_local',
    'dual-local': 'both_local',
    'shared_local': 'both_local',
    'shared': 'both_local',
    'event': 'event',
    'none': 'none',
    'off': 'none',
    'natal': 'none',
    'default': 'none',
  };
  
  return aliases[lower] || null;
}

function hasValidBirthTime(personData: unknown): boolean {
  if (!personData || typeof personData !== 'object') return false;
  const data = personData as Record<string, unknown>;
  
  // Check various birth time indicators
  const hour = data.hour ?? data.birth_hour;
  const minute = data.minute ?? data.birth_minute;
  const birthTime = data.birth_time ?? data.birthTime;
  const timeKnown = data.birth_time_known ?? data.birthTimeKnown;
  
  // Explicit unknown marker
  if (timeKnown === false) return false;
  
  // Check for valid time components
  if (typeof hour === 'number' && typeof minute === 'number') {
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }
  
  // Check for time string
  if (typeof birthTime === 'string' && birthTime.trim()) {
    const timePattern = /^\d{1,2}:\d{2}/;
    return timePattern.test(birthTime.trim());
  }
  
  return false;
}

function extractRelocationMode(report: Record<string, unknown>): unknown {
  // Check various paths where relocation mode might be stored
  const paths = [
    ['translocation', 'mode'],
    ['translocation', 'method'],
    ['context', 'translocation', 'method'],
    ['provenance', 'relocation_mode'],
    ['_meta', 'relocation_mode'],
    ['relocation_mode'],
  ];
  
  for (const path of paths) {
    let value: unknown = report;
    for (const key of path) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[key];
      } else {
        value = undefined;
        break;
      }
    }
    if (value !== undefined) return value;
  }
  
  return null;
}

function extractBalanceMeterValues(report: Record<string, unknown>): {
  magnitude?: number;
  directional_bias?: number;
  volatility?: number;
} {
  const result: { magnitude?: number; directional_bias?: number; volatility?: number } = {};
  
  // Check various paths for Balance Meter values
  const personA = report.person_a as Record<string, unknown> | undefined;
  const candidates = [
    report.balance_meter_frontstage,
    report.balance_meter,
    personA?.summary,
    report.summary,
  ].filter(Boolean);
  
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const c = candidate as Record<string, unknown>;
      if (typeof c.magnitude === 'number' && result.magnitude === undefined) {
        result.magnitude = c.magnitude;
      }
      if (typeof c.directional_bias === 'number' && result.directional_bias === undefined) {
        result.directional_bias = c.directional_bias;
      }
      if (typeof c.volatility === 'number' && result.volatility === undefined) {
        result.volatility = c.volatility;
      }
    }
  }
  
  return result;
}

// ============================================================================
// MAIN VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a report payload for integrity and Jules Constitution compliance.
 * 
 * @param report - The report object to validate
 * @param context - Optional validation context
 * @returns Validation result with errors, warnings, and flags
 */
export function validateReportIntegrity(
  report: unknown,
  context: ValidationContext = {}
): ReportValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const infos: ValidationIssue[] = [];
  let forceGenericSymbolicRead = false;
  let explicitDowngradeMode: 'math_only' | 'generic_symbolic' | null = null;
  
  // Guard: report must be an object
  if (!report || typeof report !== 'object') {
    return {
      valid: false,
      errors: [createIssue('INVALID_REPORT_SHAPE', 'Report must be a non-null object', 'error')],
      warnings: [],
      infos: [],
      forceGenericSymbolicRead: true,
      explicitDowngradeMode: null,
      summary: 'Invalid report shape',
    };
  }
  
  const r = report as Record<string, unknown>;
  
  // -------------------------------------------------------------------------
  // RULE R01: _template_hint matches person count
  // -------------------------------------------------------------------------
  const templateHint = r._template_hint;
  const hasPersonB = Boolean(r.person_b);
  
  if (templateHint === 'relational_pair' && !hasPersonB) {
    errors.push(createIssue(
      'TEMPLATE_HINT_MISMATCH',
      '_template_hint is "relational_pair" but person_b is missing',
      'error',
      '_template_hint'
    ));
  }
  
  if (templateHint === 'solo_mirror' && hasPersonB) {
    warnings.push(createIssue(
      'TEMPLATE_HINT_MISMATCH',
      '_template_hint is "solo_mirror" but person_b is present',
      'warning',
      '_template_hint'
    ));
  }
  
  // -------------------------------------------------------------------------
  // RULE R02: Relational reports must have person_b
  // -------------------------------------------------------------------------
  const reportKind = r.report_kind ?? r.kind ?? r.reportStructure;
  const isRelational = 
    reportKind === 'relational' ||
    reportKind === 'synastry' ||
    templateHint === 'relational_pair';
  
  if (isRelational && !hasPersonB) {
    errors.push(createIssue(
      'RELATIONAL_MISSING_PERSON_B',
      'Relational report requires person_b data',
      'error',
      'person_b'
    ));
  }
  
  // -------------------------------------------------------------------------
  // RULE R03: STRUCTURAL INVARIANT - kind + personB + relationship_context
  // Triple consistency check (Jules Constitution stages 6b/6c/6d)
  // System NEVER silently guesses or infers missing relational intent.
  // If relational but missing context: EXPLICIT downgrade, never silent.
  // -------------------------------------------------------------------------
  const relationshipContext = r.relationship_context ?? r.relationship;
  const hasRelationshipContext = Boolean(
    relationshipContext &&
    typeof relationshipContext === 'object' &&
    ((relationshipContext as Record<string, unknown>).scope ||
     (relationshipContext as Record<string, unknown>).type)
  );
  
  if (isRelational && !hasRelationshipContext) {
    // STRUCTURAL INVARIANT VIOLATION
    // Options: (a) reject, or (b) explicit downgrade
    if (context.requestsSymbolicRead) {
      // Explicit downgrade to generic_symbolic mode
      // NOT a warning - this is a mandatory mode change
      infos.push(createIssue(
        'RELATIONAL_CONTEXT_MISSING_DOWNGRADE',
        'Relational report missing relationship_context; EXPLICIT DOWNGRADE to generic symbolic read (no role/obligation assumptions)',
        'info',
        'relationship_context',
        { downgradeMode: 'generic_symbolic', reason: 'structural_invariant_violation' }
      ));
      forceGenericSymbolicRead = true;
      explicitDowngradeMode = 'generic_symbolic';
    } else if (context.allowMathOnlyFallback !== false) {
      // Explicit downgrade to math_only mode
      infos.push(createIssue(
        'RELATIONAL_CONTEXT_MISSING_MATH_ONLY',
        'Relational report missing relationship_context; EXPLICIT DOWNGRADE to math_only mode (numeric climate only)',
        'info',
        'relationship_context',
        { downgradeMode: 'math_only', reason: 'structural_invariant_violation' }
      ));
      explicitDowngradeMode = 'math_only';
    } else {
      // Strict mode: reject the request entirely
      errors.push(createIssue(
        'RELATIONAL_INVARIANT_VIOLATION',
        'Relational report requires relationship_context. Triple (kind=relational, personB=present, relationship_context=missing) is invalid.',
        'error',
        'relationship_context',
        { invariant: 'kind_personB_context_triple', kind: reportKind, hasPersonB, hasRelationshipContext }
      ));
    }
  }
  
  // -------------------------------------------------------------------------
  // RULE R04: Relocation mode must be canonical
  // -------------------------------------------------------------------------
  const relocationMode = extractRelocationMode(r);
  
  if (relocationMode !== null && relocationMode !== undefined) {
    const normalized = normalizeRelocationModeForValidation(relocationMode);
    if (!normalized) {
      errors.push(createIssue(
        'INVALID_RELOCATION_MODE',
        `Relocation mode "${relocationMode}" is not canonical. Allowed: A_local, B_local, both_local, event, none`,
        'error',
        'translocation.mode',
        { received: relocationMode, allowed: CANONICAL_RELOCATION_MODES.filter(m => m !== null) }
      ));
    }
  }
  
  // -------------------------------------------------------------------------
  // RULE R05: Birth time unknown → no relocation allowed
  // -------------------------------------------------------------------------
  const personA = r.person_a as Record<string, unknown> | undefined;
  const personB = r.person_b as Record<string, unknown> | undefined;
  const translocation = r.translocation as Record<string, unknown> | undefined;
  const relocationApplied = translocation?.applies === true || 
    (relocationMode && relocationMode !== 'none');
  
  if (relocationApplied) {
    if (personA && !hasValidBirthTime(personA.birth_data ?? personA.details ?? personA)) {
      errors.push(createIssue(
        'RELOCATION_WITHOUT_BIRTH_TIME',
        'Cannot apply relocation for person_a: birth time is unknown or invalid',
        'error',
        'person_a.birth_time'
      ));
    }
    
    if (hasPersonB && personB && 
        !hasValidBirthTime(personB.birth_data ?? personB.details ?? personB)) {
      errors.push(createIssue(
        'RELOCATION_WITHOUT_BIRTH_TIME',
        'Cannot apply relocation for person_b: birth time is unknown or invalid',
        'error',
        'person_b.birth_time'
      ));
    }
  }
  
  // -------------------------------------------------------------------------
  // RULE R06 & R07: Balance Meter values in range
  // -------------------------------------------------------------------------
  const balanceValues = extractBalanceMeterValues(r);
  
  if (balanceValues.magnitude !== undefined) {
    const { min, max } = BALANCE_METER_RANGES.magnitude;
    if (balanceValues.magnitude < min || balanceValues.magnitude > max) {
      errors.push(createIssue(
        'BALANCE_METER_OUT_OF_RANGE',
        `Magnitude ${balanceValues.magnitude} is outside valid range [${min}, ${max}]`,
        'error',
        'balance_meter.magnitude',
        { value: balanceValues.magnitude, range: [min, max] }
      ));
    }
  }
  
  if (balanceValues.directional_bias !== undefined) {
    const { min, max } = BALANCE_METER_RANGES.directional_bias;
    if (balanceValues.directional_bias < min || balanceValues.directional_bias > max) {
      errors.push(createIssue(
        'BALANCE_METER_OUT_OF_RANGE',
        `Directional bias ${balanceValues.directional_bias} is outside valid range [${min}, ${max}]`,
        'error',
        'balance_meter.directional_bias',
        { value: balanceValues.directional_bias, range: [min, max] }
      ));
    }
  }
  
  // -------------------------------------------------------------------------
  // RULE R08: _contains_weather_data consistency
  // -------------------------------------------------------------------------
  const containsWeatherFlag = r._contains_weather_data;
  const hasDailyReadings = Array.isArray(r.daily_readings) && r.daily_readings.length > 0;
  const hasSymbolicWeather = Boolean(
    r.symbolic_weather_context ||
    (r.woven_map as Record<string, unknown>)?.symbolic_weather
  );
  
  if (containsWeatherFlag === false && (hasDailyReadings || hasSymbolicWeather)) {
    warnings.push(createIssue(
      'WEATHER_FLAG_MISMATCH',
      '_contains_weather_data is false but daily_readings or symbolic_weather is present',
      'warning',
      '_contains_weather_data'
    ));
  }
  
  if (containsWeatherFlag === true && !hasDailyReadings && !hasSymbolicWeather) {
    warnings.push(createIssue(
      'WEATHER_FLAG_MISMATCH',
      '_contains_weather_data is true but no weather data found',
      'warning',
      '_contains_weather_data'
    ));
  }
  
  // -------------------------------------------------------------------------
  // RULE R09: birth_data coords match chart coords (tolerance check)
  // -------------------------------------------------------------------------
  if (personA) {
    const birthData = personA.birth_data as Record<string, unknown> | undefined;
    const chart = personA.chart as Record<string, unknown> | undefined;
    
    if (birthData && chart) {
      const birthLat = birthData.latitude as number | undefined;
      const birthLon = birthData.longitude as number | undefined;
      const chartLat = chart.lat as number ?? chart.latitude as number;
      const chartLon = chart.lng as number ?? chart.lon as number ?? chart.longitude as number;
      const chartTz = chart.tz_str as string ?? chart.timezone as string;
      const birthTz = birthData.timezone as string;
      
      // Coordinate tolerance: ~10 km
      const COORD_TOLERANCE = 0.1;
      
      if (typeof birthLat === 'number' && typeof chartLat === 'number' &&
          Math.abs(birthLat - chartLat) > COORD_TOLERANCE) {
        warnings.push(createIssue(
          'COORDS_MISMATCH',
          `person_a birth latitude (${birthLat}) differs from chart latitude (${chartLat})`,
          'warning',
          'person_a.chart.latitude',
          { birth: birthLat, chart: chartLat, tolerance: COORD_TOLERANCE }
        ));
      }
      
      if (typeof birthLon === 'number' && typeof chartLon === 'number' &&
          Math.abs(birthLon - chartLon) > COORD_TOLERANCE) {
        warnings.push(createIssue(
          'COORDS_MISMATCH',
          `person_a birth longitude (${birthLon}) differs from chart longitude (${chartLon})`,
          'warning',
          'person_a.chart.longitude',
          { birth: birthLon, chart: chartLon, tolerance: COORD_TOLERANCE }
        ));
      }
      
      // Timezone mismatch is a stronger signal
      if (birthTz && chartTz && birthTz !== chartTz) {
        warnings.push(createIssue(
          'TIMEZONE_MISMATCH',
          `person_a birth timezone (${birthTz}) differs from chart timezone (${chartTz})`,
          'warning',
          'person_a.chart.tz_str',
          { birth: birthTz, chart: chartTz }
        ));
      }
    }
  }
  
  // -------------------------------------------------------------------------
  // Build summary
  // -------------------------------------------------------------------------
  const hasErrors = errors.length > 0;
  const valid = context.strictMode 
    ? !hasErrors && warnings.length === 0 
    : !hasErrors;
  
  const summaryParts: string[] = [];
  if (errors.length > 0) summaryParts.push(`${errors.length} error(s)`);
  if (warnings.length > 0) summaryParts.push(`${warnings.length} warning(s)`);
  if (infos.length > 0) summaryParts.push(`${infos.length} info(s)`);
  if (forceGenericSymbolicRead) summaryParts.push('generic voice required');
  if (explicitDowngradeMode) summaryParts.push(`downgrade: ${explicitDowngradeMode}`);
  
  const summary = summaryParts.length > 0 
    ? summaryParts.join(', ')
    : 'Valid';
  
  return {
    valid,
    errors,
    warnings,
    infos,
    forceGenericSymbolicRead,
    explicitDowngradeMode,
    summary,
  };
}

/**
 * Validates a report before export, with export-type-specific checks.
 * 
 * @param report - The report object to validate
 * @param exportType - The type of export being performed
 * @param context - Optional additional validation context
 * @returns Validation result
 */
export function validateForExport(
  report: unknown,
  exportType: 'json' | 'pdf' | 'markdown',
  context: ValidationContext = {}
): ReportValidationResult {
  const baseResult = validateReportIntegrity(report, {
    ...context,
    exportType,
  });
  
  // PDF exports need chart geometry for rendering
  if (exportType === 'pdf' && report && typeof report === 'object') {
    const r = report as Record<string, unknown>;
    const hasChartGeometry = Boolean(
      r._poetic_brain_compatible !== false &&
      (r.person_a as Record<string, unknown>)?.chart
    );
    
    if (!hasChartGeometry) {
      baseResult.warnings.push(createIssue(
        'PDF_MISSING_CHART_GEOMETRY',
        'PDF export may be incomplete: chart geometry not found',
        'warning',
        'person_a.chart'
      ));
    }
  }
  
  return baseResult;
}

/**
 * Validates an API request payload before processing.
 * This is the entry-point validator for the Math Brain v2 API route.
 * 
 * @param payload - The raw request payload
 * @returns Validation result with specific API error codes
 */
export function validateApiRequest(
  payload: unknown
): ReportValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const infos: ValidationIssue[] = [];
  let forceGenericSymbolicRead = false;
  let explicitDowngradeMode: 'math_only' | 'generic_symbolic' | null = null;
  
  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      errors: [createIssue('INVALID_REQUEST_BODY', 'Request body must be a non-null object', 'error')],
      warnings: [],
      infos: [],
      forceGenericSymbolicRead: true,
      explicitDowngradeMode: null,
      summary: 'Invalid request body',
    };
  }
  
  const p = payload as Record<string, unknown>;
  
  // -------------------------------------------------------------------------
  // Check report type and personB requirement
  // -------------------------------------------------------------------------
  const reportType = typeof p.report_type === 'string' 
    ? p.report_type.toLowerCase() 
    : '';
  const reportStructure = typeof p.reportStructure === 'string'
    ? p.reportStructure.toLowerCase()
    : '';
  
  const isRelational = 
    reportType === 'relational' ||
    reportType === 'synastry' ||
    reportStructure === 'relational' ||
    reportStructure === 'synastry' ||
    Boolean(p.personB);
  
  if (isRelational && !p.personB) {
    errors.push(createIssue(
      'RELATIONAL_MISSING_PERSON_B',
      'Relational report requires personB data in request',
      'error',
      'personB'
    ));
  }
  
  // -------------------------------------------------------------------------
  // Check personA is present
  // -------------------------------------------------------------------------
  if (!p.personA) {
    errors.push(createIssue(
      'MISSING_PERSON_A',
      'Request must include personA data',
      'error',
      'personA'
    ));
  }
  
  // -------------------------------------------------------------------------
  // Validate translocation mode
  // -------------------------------------------------------------------------
  const translocation = p.translocation;
  let relocationMode: unknown = null;
  
  if (translocation && typeof translocation === 'object') {
    relocationMode = (translocation as Record<string, unknown>).mode ?? 
                     (translocation as Record<string, unknown>).method;
  } else if (typeof translocation === 'string') {
    relocationMode = translocation;
  }
  
  if (relocationMode) {
    const normalized = normalizeRelocationModeForValidation(relocationMode);
    if (!normalized) {
      errors.push(createIssue(
        'INVALID_RELOCATION_MODE',
        `translocation mode "${relocationMode}" is not canonical. Allowed: A_local, B_local, both_local, event, none`,
        'error',
        'translocation.mode',
        { received: relocationMode }
      ));
    }
  }
  
  // -------------------------------------------------------------------------
  // STRUCTURAL INVARIANT: kind + personB + relationship_context triple
  // (Jules Constitution stages 1b/1c detect kind, 2c verify context, 6b/6c/6d assert)
  // System NEVER silently guesses or infers missing relational intent.
  // -------------------------------------------------------------------------
  const relationshipContext = p.relationship_context ?? p.relationship;
  const hasRelationshipContext = Boolean(
    relationshipContext &&
    typeof relationshipContext === 'object' &&
    ((relationshipContext as Record<string, unknown>).scope ||
     (relationshipContext as Record<string, unknown>).type)
  );
  
  // Determine if symbolic read is requested
  // (Default is to include symbolic read unless explicitly disabled)
  const symbolicReadRequested = p.include_symbolic_read !== false;
  const mathOnlyRequested = p.include_symbolic_read === false || p.math_only === true;
  
  if (isRelational && !hasRelationshipContext) {
    // STRUCTURAL INVARIANT VIOLATION
    // Triple (kind=relational, personB=present, relationship_context=MISSING) is inconsistent
    // Options: (a) reject, or (b) EXPLICIT downgrade - never silent
    
    if (mathOnlyRequested) {
      // Client explicitly requested math_only - explicit downgrade acknowledged
      infos.push(createIssue(
        'RELATIONAL_MATH_ONLY_EXPLICIT',
        'relationship_context not provided; returning math_only (numeric climate only) as explicitly requested',
        'info',
        'relationship_context',
        { downgradeMode: 'math_only', reason: 'explicit_request' }
      ));
      explicitDowngradeMode = 'math_only';
    } else if (symbolicReadRequested) {
      // Client wants symbolic read but missing context - EXPLICIT downgrade to generic
      infos.push(createIssue(
        'RELATIONAL_GENERIC_SYMBOLIC_DOWNGRADE',
        'relationship_context missing for relational report; EXPLICIT DOWNGRADE to generic symbolic read (no role/obligation assumptions). To unlock contextual read, provide relationship_context.',
        'info',
        'relationship_context',
        { 
          downgradeMode: 'generic_symbolic', 
          reason: 'structural_invariant_violation',
          hint: 'Add relationship_context: { scope: "partner|friend|family|colleague", type: "romantic|platonic|professional" }'
        }
      ));
      forceGenericSymbolicRead = true;
      explicitDowngradeMode = 'generic_symbolic';
    } else {
      // Ambiguous - default to math_only with explicit notice
      infos.push(createIssue(
        'RELATIONAL_MATH_ONLY_FALLBACK',
        'relationship_context not provided and symbolic read preference unclear; EXPLICIT DOWNGRADE to math_only mode',
        'info',
        'relationship_context',
        { downgradeMode: 'math_only', reason: 'structural_invariant_violation' }
      ));
      explicitDowngradeMode = 'math_only';
    }
  }
  
  // -------------------------------------------------------------------------
  // Validate window constraints (max 30 days per Article IV)
  // -------------------------------------------------------------------------
  const window = p.window as Record<string, unknown> | undefined;
  if (window?.start && window?.end) {
    const start = new Date(window.start as string);
    const end = new Date(window.end as string);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (daysDiff > 30) {
        errors.push(createIssue(
          'WINDOW_TOO_LARGE',
          `Transit window of ${daysDiff} days exceeds maximum of 30 days`,
          'error',
          'window',
          { days: daysDiff, max: 30 }
        ));
      }
    }
  }
  
  // -------------------------------------------------------------------------
  // Build summary
  // -------------------------------------------------------------------------
  const valid = errors.length === 0;
  const summaryParts: string[] = [];
  if (errors.length > 0) summaryParts.push(`${errors.length} error(s)`);
  if (warnings.length > 0) summaryParts.push(`${warnings.length} warning(s)`);
  if (forceGenericSymbolicRead) summaryParts.push('generic symbolic read mode');
  if (explicitDowngradeMode) summaryParts.push(`downgrade: ${explicitDowngradeMode}`);
  
  return {
    valid,
    errors,
    warnings,
    infos,
    forceGenericSymbolicRead,
    explicitDowngradeMode,
    summary: summaryParts.length > 0 ? summaryParts.join(', ') : 'Valid',
  };
}

/**
 * Quick check if a relocation mode is canonical.
 * Use this for fast validation without full report inspection.
 */
export function isValidRelocationMode(mode: unknown): boolean {
  return isCanonicalRelocationMode(mode);
}

/**
 * Normalize a relocation mode string to its canonical form.
 * Returns null if the mode is not recognized.
 */
export function normalizeRelocationMode(mode: unknown): CanonicalRelocationMode | null {
  const normalized = normalizeRelocationModeForValidation(mode);
  if (normalized === 'A_local' || normalized === 'B_local' || 
      normalized === 'both_local' || normalized === 'event' || normalized === 'none') {
    return normalized as CanonicalRelocationMode;
  }
  return null;
}
