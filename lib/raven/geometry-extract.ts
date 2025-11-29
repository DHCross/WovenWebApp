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
 * Optimized: early returns, no array copy, cached property lookups.
 */
export function extractGeometryFromUploadedReport(contexts: Record<string, any>[]): ExtractedGeometry | null {
  // Fast path: empty or invalid input
  if (!Array.isArray(contexts) || contexts.length === 0) return null;

  // Find mirror context (iterate backwards without creating a copy)
  let mirrorContext: Record<string, any> | null = null;
  for (let i = contexts.length - 1; i >= 0; i--) {
    const ctx = contexts[i];
    if (ctx && ctx.type === 'mirror' && typeof ctx.content === 'string') {
      mirrorContext = ctx;
      break;
    }
  }

  if (!mirrorContext) return null;

  try {
    const parsed = JSON.parse(mirrorContext.content);
    if (!parsed || typeof parsed !== 'object') return null;
    
    // Single unwrap operation - cache result
    const unwrapped = parsed.unified_output ?? parsed.unifiedOutput ?? parsed;

    // PRIORITY 1: Check for Mirror + Symbolic Weather format (person_a/personA.chart structure)
    const personA = unwrapped.person_a ?? unwrapped.personA;
    if (personA && typeof personA === 'object' && personA.chart && typeof personA.chart === 'object') {
      // Full structure with person_a/person_b - fast path for most common case
      const metadata = scanForRelationalMetadata(unwrapped);
      return {
        full: unwrapped,
        baseline: extractBaselineGeometry(unwrapped, metadata.baselineType),
        field: extractFieldGeometry(unwrapped),
        metadata,
        shouldUsePureField: shouldUsePureFieldMirror(unwrapped, metadata.baselineType),
      };
    }

    // PRIORITY 2: Look for geometry in various possible locations
    const geo = unwrapped.geometry ?? unwrapped.chart ?? unwrapped.natal_chart ?? unwrapped.natalChart ?? unwrapped;

    // Validate minimum required geometry fields
    if (geo && typeof geo === 'object') {
      const hasValidGeo = (geo.person_a && typeof geo.person_a === 'object') ||
                          (geo.chart && typeof geo.chart === 'object') ||
                          geo.planets || geo.houses || geo.aspects;

      if (hasValidGeo) {
        const metadata = scanForRelationalMetadata(geo);
        return {
          full: geo,
          baseline: extractBaselineGeometry(geo, metadata.baselineType),
          field: extractFieldGeometry(geo),
          metadata,
          shouldUsePureField: shouldUsePureFieldMirror(geo, metadata.baselineType),
        };
      }
    }
  } catch {
    // Invalid JSON or missing geometry - fast fail
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
