export type GeometryAspect = {
  from: string;
  to: string;
  type: string;
  orb?: number;
};

export type GeometrySummary = {
  dominantElement?: string;
};

export type NormalizedGeometry = {
  placements: Array<Record<string, any>>;
  aspects: GeometryAspect[];
  summary: GeometrySummary;
};

// Lightweight adapter: derive a minimal geometry from the incoming payload.
// In a full build this would call Math Brain. Here we synthesize a usable shape
// from symbolic_weather periods and elements if present.
export async function processWithMathBrain(input: any): Promise<NormalizedGeometry> {
  const periods = input?.symbolic_weather?.periods;
  const first = Array.isArray(periods) && periods.length > 0 ? periods[0] : null;
  const aspects: GeometryAspect[] = [];
  if (first?.aspects && Array.isArray(first.aspects)) {
    for (const a of first.aspects) {
      const planets = Array.isArray(a.planets) ? a.planets : [];
      if (planets.length >= 2) {
        aspects.push({
          from: String(planets[0]).trim(),
          to: String(planets[1]).trim(),
          type: String(a.aspect || '').trim() || 'link',
          orb: typeof a.orb === 'number' ? a.orb : undefined,
        });
      }
    }
  }
  const elements = first?.elements && typeof first.elements === 'object' ? first.elements : null;
  const summary: GeometrySummary = {};
  if (elements) {
    const entries = Object.entries(elements)
      .filter(([, v]) => typeof v === 'number')
      .sort((a, b) => (b[1] as number) - (a[1] as number));
    if (entries.length) summary.dominantElement = entries[0][0];
  }
  return {
    placements: [],
    aspects,
    summary,
  };
}

