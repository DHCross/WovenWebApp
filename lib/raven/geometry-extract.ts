/**
 * Geometry Extraction from Uploaded Reports
 * 
 * Functions for extracting geometry data from uploaded report JSON.
 */

/**
 * Extract geometry directly from uploaded report JSON to bypass Math Brain regeneration.
 * Returns null if the JSON doesn't contain valid geometry.
 */
export function extractGeometryFromUploadedReport(contexts: Record<string, any>[]): any {
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
        return unwrapped; // Return the whole structure with person_a/person_b
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
          return geo;
        }
      }
    }
  } catch (e) {
    // Invalid JSON or missing geometry
    return null;
  }

  return null;
}
