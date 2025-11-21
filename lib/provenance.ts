// provenance.ts
// Provenance stamps and weather constraints per Raven Calder spec

export type Provenance = {
  schema: string;            // e.g., "BM-v3"
  house_system: string;      // e.g., "Placidus"
  relocation_mode: string;   // "None" | "A_local" | "B_local" | "Both_local"
  tz: string;                // e.g., "America/Chicago"
  orbs_profile?: string;     // optional
  scale_mode: "absolute_x5";
  coherence_inversion: boolean;
  has_transits: boolean;     // drivers[] exists?
  drivers_count: number;
  suppress_reasons: string[]; // populate when channels are off
};

export function buildProvenance(p: Partial<Provenance>): Provenance {
  const prov: Provenance = {
    schema: p.schema ?? "BM-v3",
    house_system: p.house_system ?? "Placidus",
    relocation_mode: p.relocation_mode ?? "None",
    tz: p.tz ?? "UTC",
    orbs_profile: p.orbs_profile ?? "wm-spec-2025-09",
    scale_mode: "absolute_x5",
    coherence_inversion: p.coherence_inversion ?? false,
    has_transits: Boolean(p.has_transits),
    drivers_count: p.drivers_count ?? 0,
    suppress_reasons: p.suppress_reasons ?? [],
  };

  // Enforce weather constraint
  if (!prov.has_transits || prov.drivers_count === 0) {
    prov.suppress_reasons.push("No transit drivers — weather channels suppressed.");
  }

  return prov;
}
