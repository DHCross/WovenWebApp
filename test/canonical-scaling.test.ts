import { describe, expect, it } from "vitest";
import { scaleDirectionalBias, scaleMagnitude } from "../lib/reporting/canonical-scaling";

describe("canonical scaling helpers", () => {
  describe("scaleDirectionalBias", () => {
    it("preserves raw sign while borrowing calibrated magnitude", () => {
      const result = scaleDirectionalBias(0.9, { calibratedMagnitude: -4.2 });
      expect(result.value).toBeCloseTo(4.2, 2);
      expect(result.direction).toBe("outward");
  const meta = result.meta as any;
  expect(meta.used_calibrated).toBe(true);
    });

    it("falls back to calibrated sign when raw is neutral", () => {
      const result = scaleDirectionalBias(0.01, {
        calibratedMagnitude: -3.5,
        epsilon: 0.05
      });
      expect(result.value).toBeCloseTo(-3.5, 2);
      expect(result.direction).toBe("inward");
    });

    it("uses fallback direction when no other signal exists", () => {
      const result = scaleDirectionalBias(0, {
        calibratedMagnitude: 0,
        fallbackDirection: 2.8,
        epsilon: 0.05
      });
      expect(result.value).toBeCloseTo(2.8, 2);
      expect(result.direction).toBe("outward");
    });

    it("respects allowOverflow by leaving values unclamped", () => {
      const result = scaleDirectionalBias(6.3, { allowOverflow: true });
      expect(result.value).toBeCloseTo(6.3, 2);
      expect(result.clamped).toBe(false);
    });
  });

  describe("scaleMagnitude", () => {
    it("returns normalised magnitude when supplied", () => {
      const result = scaleMagnitude(3.1, { normalisedMagnitude: 4.4 });
      expect(result.value).toBeCloseTo(4.4, 2);
  const meta = result.meta as any;
  expect(meta.sources.normalised).toBe(4.4);
      expect(result.clamped).toBe(false);
    });

    it("applies blended reference scaling from rolling context", () => {
      const result = scaleMagnitude(3.0, {
        context: {
          median: 2.2,
          prior: 4.0,
          windowSize: 12
        },
        cap: 5
      });

      expect(result.value).toBeGreaterThan(3.0);
      expect(result.value).toBeLessThanOrEqual(5.0);
  const meta = result.meta as any;
  expect(meta.lambda).toBeCloseTo(12 / 14, 2);
    });

    it("caps magnitude at the specified ceiling", () => {
      const result = scaleMagnitude(9.5, { cap: 5 });
      expect(result.value).toBe(5);
      expect(result.clamped).toBe(true);
    });

    it("permits overflow when requested", () => {
      const result = scaleMagnitude(7.8, { allowOverflow: true });
      expect(result.value).toBeCloseTo(7.8, 2);
      expect(result.clamped).toBe(false);
    });
  });
});
