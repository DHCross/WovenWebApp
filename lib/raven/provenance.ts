/**
 * Creates a provenance object to stamp the source and context of a report.
 * @param data The provenance data, e.g., { source: 'AstroSeek' }.
 * @returns A standardized provenance object.
 */
export function stampProvenance(data: Record<string, any>): Record<string, any> {
  return {
    timestamp: new Date().toISOString(),
    source: "Unknown",
    house_system: "Placidus",
    orb_profile: "Default",
    relocation_mode: "none",
    birth_time_known: true,
    birth_time_source: "exact",
    house_mode: "natal",
    versions: {
      template: "SoloMirror-v1.4.0",
      schema: "mirror-draft-2025-09",
    },
    ...data,
  };
}

/**
 * Enhanced provenance stamp with house context integration
 */
export function stampProvenanceWithHouseContext(
  data: Record<string, any>,
  houseContext?: Record<string, any>
): Record<string, any> {
  const baseProvenance = stampProvenance(data);

  if (houseContext) {
    return {
      ...baseProvenance,
      house_system: houseContext.house_system || baseProvenance.house_system,
      house_mode: houseContext.house_mode || baseProvenance.house_mode,
      birth_time_known: houseContext.birth_time_known ?? baseProvenance.birth_time_known,
      birth_time_source: houseContext.birth_time_source || baseProvenance.birth_time_source,
      relocation: houseContext.relocation || null,
    };
  }

  return baseProvenance;
}

/**
 * Create a short, safe snippet from a persona excerpt for use in human-readable
 * provenance displays (e.g., PDF footers). This intentionally truncates and
 * normalizes whitespace to avoid leaking full corpus content in frontstage.
 */
export function personaExcerptSnippet(excerpt?: string | null, maxChars = 280): string | null {
  if (!excerpt || typeof excerpt !== 'string') return null;
  const clean = excerpt.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return null;
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, Math.max(0, maxChars - 1)).trim() + '…';
}
