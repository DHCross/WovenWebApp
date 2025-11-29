/**
 * Relational Metadata Extraction
 * 
 * Scans JSON metadata for relational_type, relationship_type, and similar fields.
 * Maps them to QuerentRole and determines baseline geometry (natal, composite, etc.).
 */

import type { QuerentRole } from './context-gate';

/**
 * Relational scope/type detected from metadata
 */
export type RelationalScope = 
  | 'solo'           // Solo natal reading
  | 'dyadic'         // Two people (composite, synastry, relational)
  | 'group'          // Group/collective (3+ people)
  | 'observer'       // Third-party observer mode
  | 'unknown';       // Could not determine

/**
 * Baseline geometry type (which chart to read first)
 */
export type BaselineGeometry =
  | 'natal'          // Single person's natal chart
  | 'composite'      // Composite chart (both people combined)
  | 'synastry'       // Synastry (overlay of two charts)
  | 'radix'          // Secondary radix (progressed, solar return)
  | 'unknown';

/**
 * Metadata extracted from relational context
 */
export interface RelationalMetadata {
  scope: RelationalScope;
  baselineType: BaselineGeometry;
  relationshipType?: string;  // e.g., "partner", "friend", "family"
  personAName?: string;
  personBName?: string;
  hasComposite?: boolean;
  hasSynastry?: boolean;
  hasNatal?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Scan JSON structure for relational_type, relationship_type, or related metadata fields
 */
export function scanForRelationalMetadata(payload: any): RelationalMetadata {
  if (!payload || typeof payload !== 'object') {
    return {
      scope: 'unknown',
      baselineType: 'unknown',
    };
  }

  // Unwrap unified_output if present
  const unwrapped = payload.unified_output || payload.unifiedOutput || payload;

  // Check for explicit relational_type or relationship_type fields
  const relationshipTypeField =
    unwrapped.relationship_type ||
    unwrapped.relationshipType ||
    unwrapped.context?.relationship_type ||
    unwrapped.context?.relationshipType ||
    unwrapped.mirror_contract?.relationship_type ||
    unwrapped.mirrorContract?.relationshipType ||
    null;

  // Check for scope indicators
  const scopeField =
    unwrapped.scope ||
    unwrapped.reading_scope ||
    unwrapped.readingScope ||
    unwrapped.context?.scope ||
    null;

  // Detect if we have person_a/person_b structure
  const hasPersonA = !!(unwrapped.person_a || unwrapped.personA);
  const hasPersonB = !!(unwrapped.person_b || unwrapped.personB);
  const hasBoth = hasPersonA && hasPersonB;

  // Extract person names
  const personA = unwrapped.person_a || unwrapped.personA || {};
  const personB = unwrapped.person_b || unwrapped.personB || {};
  const personAName =
    personA.name ||
    personA.full_name ||
    personA.fullName ||
    'Person A';
  const personBName =
    personB.name ||
    personB.full_name ||
    personB.fullName ||
    'Person B';

  // Check for specific chart types
  const hasComposite = !!(
    unwrapped.composite ||
    unwrapped.compositeChart ||
    personA.composite ||
    personB.composite
  );
  const hasSynastry = !!(
    unwrapped.synastry ||
    unwrapped.synastryChart ||
    unwrapped.overlay ||
    personA.synastry ||
    personB.synastry
  );
  const hasNatal = !!(
    unwrapped.natal ||
    unwrapped.natalChart ||
    unwrapped.chart ||
    personA.chart ||
    personB.chart
  );

  // Determine scope
  let scope: RelationalScope = 'unknown';
  let baselineType: BaselineGeometry = 'unknown';

  // Use explicit scope field if available
  if (scopeField) {
    if (/solo|single|one|individual|natal/i.test(String(scopeField))) {
      scope = 'solo';
      baselineType = 'natal';
    } else if (/dyadic|pair|dual|two|couple|relational|synastry|composite|partner/i.test(String(scopeField))) {
      scope = 'dyadic';
      baselineType = hasComposite ? 'composite' : hasSynastry ? 'synastry' : 'natal';
    } else if (/group|triple|collective|multi/i.test(String(scopeField))) {
      scope = 'group';
      baselineType = 'unknown';
    } else if (/observer|third|external/i.test(String(scopeField))) {
      scope = 'observer';
      baselineType = 'unknown';
    }
  }

  // Use relationship_type field if scope not yet determined
  if (scope === 'unknown' && relationshipTypeField) {
    if (/solo|single|natal/i.test(String(relationshipTypeField))) {
      scope = 'solo';
      baselineType = 'natal';
    } else if (
      /partner|spouse|couple|romantic|dating|relational|synastry|composite|dyadic|duo/i.test(
        String(relationshipTypeField)
      )
    ) {
      scope = 'dyadic';
      baselineType = hasComposite ? 'composite' : hasSynastry ? 'synastry' : 'natal';
    } else if (/family|sibling|parent|child/i.test(String(relationshipTypeField))) {
      scope = 'dyadic';
      baselineType = hasComposite ? 'composite' : 'synastry';
    } else if (/friend|colleague|friend|team/i.test(String(relationshipTypeField))) {
      scope = 'dyadic';
      baselineType = hasSynastry ? 'synastry' : 'natal';
    } else if (/group|trio|team|collective/i.test(String(relationshipTypeField))) {
      scope = 'group';
      baselineType = 'unknown';
    }
  }

  // Infer from payload structure if still unknown
  if (scope === 'unknown') {
    if (hasBoth) {
      scope = 'dyadic';
      baselineType = hasComposite ? 'composite' : hasSynastry ? 'synastry' : 'natal';
    } else if (hasPersonA || hasPersonB || hasNatal) {
      scope = 'solo';
      baselineType = 'natal';
    }
  }

  // Determine baseline if still unknown
  if (baselineType === 'unknown') {
    if (hasComposite) baselineType = 'composite';
    else if (hasSynastry) baselineType = 'synastry';
    else if (hasNatal) baselineType = 'natal';
  }

  return {
    scope,
    baselineType,
    relationshipType: relationshipTypeField ? String(relationshipTypeField) : undefined,
    personAName,
    personBName,
    hasComposite,
    hasSynastry,
    hasNatal,
    metadata: {
      scopeField,
      relationshipTypeField,
      hasBoth,
      hasPersonA,
      hasPersonB,
    },
  };
}

/**
 * Map relational scope to QuerentRole for Identity Gate
 */
export function mapScopeToQuerentRole(scope: RelationalScope): QuerentRole {
  switch (scope) {
    case 'solo':
      return 'self_a';  // Solo reader is reading their own chart
    case 'dyadic':
      return 'both';    // Both people in the chart
    case 'group':
      return 'observer'; // Group context suggests observer mode
    case 'observer':
      return 'observer';
    default:
      return 'unconfirmed';
  }
}

/**
 * Build synergy opening context from metadata
 */
export function buildSynergyOpening(
  metadata: RelationalMetadata,
  currentFieldContext?: string
): string {
  const { scope, baselineType, personAName, personBName, relationshipType } = metadata;

  let opening = 'Baseline: ';

  // Describe the baseline chart type
  if (baselineType === 'composite') {
    opening += `Composite chart (${personAName} ↔ ${personBName})`;
  } else if (baselineType === 'synastry') {
    opening += `Synastry (${personAName} overlaying ${personBName})`;
  } else if (baselineType === 'natal' && scope === 'dyadic') {
    opening += `Natal geometry (${personAName})`;
  } else if (baselineType === 'natal') {
    opening += `Natal chart (${personAName})`;
  } else {
    opening += 'Baseline geometry';
  }

  // Add relationship context
  if (relationshipType) {
    opening += ` · ${relationshipType}`;
  }

  // Layer in current field
  if (currentFieldContext) {
    opening += ` → overlaying ${currentFieldContext}`;
  } else {
    opening += ' → overlaying current Symbolic Weather front';
  }

  return opening;
}

/**
 * Extract baseline geometry data from payload
 * Returns the chart to read first before layering current field
 */
export function extractBaselineGeometry(
  payload: any,
  baselineType: BaselineGeometry
): any | null {
  if (!payload || baselineType === 'unknown') return null;

  const unwrapped = payload.unified_output || payload.unifiedOutput || payload;

  switch (baselineType) {
    case 'composite':
      return (
        unwrapped.composite ||
        unwrapped.compositeChart ||
        unwrapped.composite_chart ||
        null
      );

    case 'synastry':
      return (
        unwrapped.synastry ||
        unwrapped.synastryChart ||
        unwrapped.synastry_chart ||
        unwrapped.overlay ||
        null
      );

    case 'natal':
      // For natal, prefer person_a if available
      const personA = unwrapped.person_a || unwrapped.personA;
      if (personA?.chart) return personA.chart;

      // Fall back to generic chart
      return (
        unwrapped.natal ||
        unwrapped.natalChart ||
        unwrapped.natal_chart ||
        unwrapped.chart ||
        null
      );

    case 'radix':
      return (
        unwrapped.radix ||
        unwrapped.radixChart ||
        unwrapped.radix_chart ||
        unwrapped.secondary ||
        null
      );

    default:
      return null;
  }
}

/**
 * Extract current field geometry (what's happening now)
 * This is separate from the baseline and will be layered on top
 */
export function extractFieldGeometry(payload: any): any | null {
  if (!payload || typeof payload !== 'object') return null;

  const unwrapped = payload.unified_output || payload.unifiedOutput || payload;

  // Look for "current" field, weather, transit, or forecast
  return (
    unwrapped.current_field ||
    unwrapped.currentField ||
    unwrapped.field ||
    unwrapped.weather ||
    unwrapped.symbolic_weather ||
    unwrapped.symbolicWeather ||
    unwrapped.transits ||
    unwrapped.transiting ||
    unwrapped.forecast ||
    null
  );
}

/**
 * Determine if baseline geometry is available
 */
export function hasBaselineGeometry(
  payload: any,
  baselineType: BaselineGeometry
): boolean {
  return extractBaselineGeometry(payload, baselineType) !== null;
}

/**
 * Determine if we should revert to pure field mirror
 * (when no baseline is available)
 */
export function shouldUsePureFieldMirror(
  payload: any,
  baselineType: BaselineGeometry
): boolean {
  if (baselineType === 'unknown') return true;
  if (!hasBaselineGeometry(payload, baselineType)) return true;
  return false;
}
