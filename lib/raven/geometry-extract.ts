/**
 * Geometry Extraction from Uploaded Reports
 * 
 * Functions for extracting geometry data from uploaded report JSON.
 * Supports both single-layer and baseline + field geometry reading.
 */

import { scanForRelationalMetadata, extractBaselineGeometry, extractFieldGeometry, shouldUsePureFieldMirror } from './relational-metadata';

/**
 * Extract full geometry structure from uploaded report JSON
 * This includes baseline geometry, field geometry, and relational metadata
 */
export interface ExtractedGeometry {
  full: any;                      // The complete payload
  baseline: any | null;           // Natal/composite/synastry to read first
  field: any | null;              // Current field to layer on top
  metadata: any;                  // Relational metadata
  shouldUsePureField: boolean;    // Whether to fall back to pure field mirror
}

/**
 * Extract geometry directly from uploaded report JSON to bypass Math Brain regeneration.
 * Returns null if the JSON doesn't contain valid geometry.
 * 
 * NEW: Also extracts relational metadata and separates baseline from current field.
 */
export function extractGeometryFromUploadedReport(contexts: Record<string, any>[]): ExtractedGeometry | null {
  if (!Array.isArray(contexts) || contexts.length === 0) return null;

  const mirrorContext = [...contexts].reverse().find(
    (ctx) => ctx && ctx.type === 'mirror' && typeof ctx.content === 'string'
  );

  if (!mirrorContext) return null;

  try {
    const parsed = JSON.parse(mirrorContext.content);
    // Check if this is a Math Brain v2 unified output with geometry
    if (parsed && typeof parsed === 'object') {
      // Unwrap unified_output (snake_case) or unifiedOutput (camelCase) if present
      const unwrapped = parsed.unified_output || parsed.unifiedOutput || parsed;

      // PRIORITY 1: Check for Mirror + Symbolic Weather format (person_a/personA.chart structure)
      const mirrorPayload =
        (unwrapped.person_a && typeof unwrapped.person_a === 'object'
          ? unwrapped.person_a
          : unwrapped.personA && typeof unwrapped.personA === 'object'
            ? unwrapped.personA
            : null);
      if (mirrorPayload?.chart && typeof mirrorPayload.chart === 'object') {
        // Full structure with person_a/person_b
        const metadata = scanForRelationalMetadata(unwrapped);
        const baseline = extractBaselineGeometry(unwrapped, metadata.baselineType);
        const field = extractFieldGeometry(unwrapped);
        
        return {
          full: unwrapped,
          baseline,
          field,
          metadata,
          shouldUsePureField: shouldUsePureFieldMirror(unwrapped, metadata.baselineType),
        };
      }

      // PRIORITY 2: Look for geometry in various possible locations
      const geo =
        unwrapped.geometry ||
        unwrapped.chart ||
        unwrapped.natal_chart ||
        unwrapped.natalChart ||
        unwrapped;

      // Validate that we have the minimum required geometry fields
      if (geo && typeof geo === 'object') {
        const hasPersonA = geo.person_a && typeof geo.person_a === 'object';
        const hasChart = geo.chart && typeof geo.chart === 'object';
        const hasBasicData = geo.planets || geo.houses || geo.aspects;

        if (hasPersonA || hasChart || hasBasicData) {
          // Extract metadata for context gating
          const metadata = scanForRelationalMetadata(geo);
          const baseline = extractBaselineGeometry(geo, metadata.baselineType);
          const field = extractFieldGeometry(geo);

          return {
            full: geo,
            baseline,
            field,
            metadata,
            shouldUsePureField: shouldUsePureFieldMirror(geo, metadata.baselineType),
          };
        }
      }
    }
  } catch (e) {
    // Invalid JSON or missing geometry
    return null;
  }

  return null;
}

/**
 * DEPRECATED: Use extractGeometryFromUploadedReport which returns ExtractedGeometry
 * Kept for backwards compatibility, wraps the full structure
 */
export function extractGeometryLegacy(contexts: Record<string, any>[]): any {
  const result = extractGeometryFromUploadedReport(contexts);
  return result ? result.full : null;
}
