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
    versions: {
      template: "SoloMirror-v1.4.0",
      schema: "mirror-draft-2025-09",
    },
    ...data,
  };
}
