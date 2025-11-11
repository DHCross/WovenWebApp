import { describe, expect, it } from "vitest";

import {
  ASTROSEEK_GUARD_SOURCE,
  NO_CONTEXT_GUARD_SOURCE,
  WEATHER_ONLY_PATTERN,
  detectReportMetadata,
  mapRelocationToPayload,
  parseReportContent,
} from "../../lib/report-parsing";

const soloMirrorPayload = {
  _format: "mirror-symbolic-weather-v1",
  person_a: {
    details: { name: "Raven" },
    chart: { houses: {} },
  },
};

const relationalPayload = {
  context: {
    natal: { name: "Raven" },
    translocation: {
      applies: true,
      label: "Lisbon",
      mode: "A_B",
      house_system: "Placidus",
    },
    window: { start: "2025-01-01", end: "2025-02-01" },
  },
  balance_meter: {
    channel_summary_canonical: {
      axes: {
        magnitude: { value: 3.2 },
        directional_bias: { value: 1.1 },
      },
      labels: {
        magnitude: "Surge",
        directional_bias: "Supportive",
        directional_bias_emoji: "↗",
      },
    },
  },
  person_b: {
    chart: { houses: {} },
  },
};

describe("report-parsing", () => {
  it("parses a mirror directive payload", () => {
    const json = JSON.stringify({
      _format: "mirror_directive_json",
      person_a: { name: "Alice" },
    });

    const result = parseReportContent(json, { fileName: "mirror.json" });

    expect(result.isMirror).toBe(true);
    expect(result.context.type).toBe("mirror");
    expect(result.context.name).toContain("Alice");
  });

  it("parses a balance meter payload with relocation metadata", () => {
    const json = JSON.stringify(relationalPayload);

    const result = parseReportContent(json, { fileName: "relational.json" });

    expect(result.isMirror).toBe(false);
    expect(result.context.type).toBe("balance");
    expect(result.context.summary).toContain("Window 2025-01-01 → 2025-02-01");
    expect(result.relocation?.label).toBe("Lisbon");
  });

  it("detects metadata flags", () => {
    const mirrorMetadata = detectReportMetadata(JSON.stringify(soloMirrorPayload));
    expect(mirrorMetadata.hasMirrorDirective).toBe(true);
    expect(mirrorMetadata.hasSymbolicWeather).toBe(true);

    const relationalMetadata = detectReportMetadata(JSON.stringify(relationalPayload));
    expect(relationalMetadata.hasMirrorDirective).toBe(true);
    expect(relationalMetadata.hasSymbolicWeather).toBe(true);
    expect(relationalMetadata.isRelationalMirror).toBe(true);
  });

  it("maps relocation summaries for payload integration", () => {
    const relocation = mapRelocationToPayload({
      active: true,
      mode: "A_LOCAL",
      scope: "solo",
      label: "Lisbon",
      status: "Active",
      disclosure: "Testing",
      invariants: {},
      confidence: 0.9,
      coordinates: { lat: 38.72, lon: -9.14 },
      houseSystem: "Whole Sign",
      zodiacType: "Tropical",
      engineVersions: { mathBrain: "v5" },
      provenance: { source: "test" },
    } as any);

    expect(relocation?.label).toBe("Lisbon");
    expect(relocation?.house_system).toBe("Whole Sign");
  });

  it("exports guard constants", () => {
    expect(ASTROSEEK_GUARD_SOURCE).toBe("Conversational Guard (AstroSeek)");
    expect(NO_CONTEXT_GUARD_SOURCE).toBe("Conversational Guard");
    expect(WEATHER_ONLY_PATTERN.test("what's happening in the sky"))
      .toBe(true);
  });
});
