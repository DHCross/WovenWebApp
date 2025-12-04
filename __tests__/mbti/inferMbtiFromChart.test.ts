import { inferMbtiFromChart, inferContactResonance } from '../../lib/mbti/inferMbtiFromChart';

/**
 * Tests for MBTI Correspondence Inference (v1.4 - Depth Edition + Human Voice)
 * 
 * ARCHITECTURE NOTE (v1.4):
 * 
 * Axis Sources (Interior Compass ONLY):
 * - E/I: Moon element + Saturn bias (Gravity Well clause applied)
 * - N/S: Sun element + Mercury element
 * - T/F: Moon element + Venus-Saturn weighting + MC/IC purpose-axis tone
 * - J/P: Moon modality + Saturn structure-bias
 * 
 * Protocol Rules:
 * - Rule A: No Axis Left Uncalled
 * - Rule B: Layer-Based Tie-Breaker
 * - Rule C: Falsifiability Required
 * 
 * v1.4 Updates:
 * - Saturn in Water/12th = Gravity Well (-0.4 bias)
 * - Saturn Retrograde = 1.2x multiplier on inward/structure bias
 * - Voice: Experience-based metaphors (e.g., "Your energy tends to flow...")
 */

describe('inferMbtiFromChart', () => {
  it('returns null for empty chart', () => {
    expect(inferMbtiFromChart(null)).toBeNull();
    expect(inferMbtiFromChart(undefined)).toBeNull();
    expect(inferMbtiFromChart({} as any)).toBeNull();
    expect(inferMbtiFromChart({ positions: {} } as any)).toBeNull();
  });

  it('returns null if fewer than 3 positions', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Ari' },
        Moon: { sign: 'Tau' },
      },
    } as any;
    expect(inferMbtiFromChart(chart)).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // v1.4: Per-Axis Reasoning and Falsifiability (Human Voice)
  // ─────────────────────────────────────────────────────────────────────────────

  it('returns axisReasoning with confidence and falsifiability for all axes', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Tau' },
        Moon: { sign: 'Leo' },
        Mercury: { sign: 'Tau' },
        Venus: { sign: 'Gem' },
        Saturn: { sign: 'Cap' },
      },
      angle_signs: { midheaven: 'Aqu' },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.axisReasoning).toBeDefined();

    for (const axis of ['EI', 'NS', 'TF', 'JP'] as const) {
      expect(result!.axisReasoning![axis]).toBeDefined();
      expect(['E', 'I', 'N', 'S', 'T', 'F', 'J', 'P']).toContain(result!.axisReasoning![axis].value);
      expect(['strong_call', 'clear_call', 'soft_call']).toContain(result!.axisReasoning![axis].confidence);
      // v1.4 Voice Check: Should use "You tend to..." or "Your energy..."
      expect(result!.axisReasoning![axis].reasoning).toMatch(/Your energy|You tend to/);
      expect(result!.axisReasoning![axis].falsifiability).toBeTruthy();
    }
  });

  it('includes globalSummary with collaborative framing', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Ari' },
        Moon: { sign: 'Leo' },
        Mercury: { sign: 'Gem' },
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.globalSummary).toBeDefined();
    // v1.4 Voice Check: "This map listens to you"
    expect(result!.globalSummary).toContain('This map listens to you');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // E/I Axis — Interior Compass (Moon, Saturn)
  // ─────────────────────────────────────────────────────────────────────────────

  it('infers E from Fire Moon (Interior Compass)', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Tau' },
        Moon: { sign: 'Leo' }, // Fire Moon = E-leaning
        Mercury: { sign: 'Tau' },
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[0]).toBe('E');
    expect(result!.axisReasoning!.EI.value).toBe('E');
    expect(result!.axisReasoning!.EI.reasoning).toContain('flow outward');
  });

  it('infers I from Water Moon (Interior Compass)', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Ari' },
        Moon: { sign: 'Sco' }, // Water Moon = I-leaning
        Mercury: { sign: 'Ari' },
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[0]).toBe('I');
    expect(result!.axisReasoning!.EI.value).toBe('I');
    expect(result!.axisReasoning!.EI.reasoning).toContain('flow inward');
  });

  // v1.4: Saturnine Gravity Clause
  it('dampens E score when Saturn is in Water (Gravity Well)', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Ari' },
        Moon: { sign: 'Leo' }, // Fire Moon (+1.0)
        Saturn: { sign: 'Sco' }, // Water Saturn (-0.4)
        Mercury: { sign: 'Ari' },
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    // Net: +0.6 -> Normalized: (0.6 - 0.5)*2 = 0.2 -> Soft Call
    // It might still be E, but confidence should be 'soft_call' (or close to it)
    // Actually, 0.2 is < 0.3, so it should be 'soft_call'
    expect(result!.axisReasoning!.EI.confidence).toBe('soft_call');
    expect(result!.axisReasoning!.EI.reasoning).toMatch(/Gravity Well/);
  });

  // v1.4: Retrograde Factor
  it('intensifies inward pull when Saturn is Retrograde', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Ari' },
        Moon: { sign: 'Leo' }, // Fire Moon (+1.0)
        Saturn: { sign: 'Sco', retrograde: true }, // Water Saturn (-0.4) * 1.2 = -0.48
        Mercury: { sign: 'Ari' },
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    // Net: 1.0 - 0.48 = 0.52 -> Normalized: (0.52 - 0.5)*2 = 0.04 -> Very Soft Call
    expect(result!.axisReasoning!.EI.confidence).toBe('soft_call');
    expect(result!.axisReasoning!.EI.reasoning).toMatch(/Retrograde/);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // N/S Axis — Actor (Sun) element + Mercury element
  // ─────────────────────────────────────────────────────────────────────────────

  it('infers N from Fire/Air Actor + Mercury (pattern-first)', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Gem' }, // Air Actor = N-leaning
        Moon: { sign: 'Tau' },
        Mercury: { sign: 'Gem' }, // Air Mercury = N-leaning
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[1]).toBe('N');
    expect(result!.axisReasoning!.NS.value).toBe('N');
    expect(result!.axisReasoning!.NS.reasoning).toContain('pattern before the detail');
  });

  it('infers S from Earth/Water Actor + Mercury (concrete-first)', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Tau' }, // Earth Actor = S-leaning
        Moon: { sign: 'Leo' },
        Mercury: { sign: 'Cap' }, // Earth Mercury = S-leaning
        Saturn: { sign: 'Cap' },
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[1]).toBe('S');
    expect(result!.axisReasoning!.NS.value).toBe('S');
    expect(result!.axisReasoning!.NS.reasoning).toContain('reality before the theory');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T/F Axis — Moon-Venus / Saturn-Moon relationships
  // ─────────────────────────────────────────────────────────────────────────────

  it('infers F from Moon-Venus harmony', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Lib' },
        Moon: { sign: 'Pis' }, // Water Moon
        Mercury: { sign: 'Lib' },
        Venus: { sign: 'Can' }, // Water Venus = harmony with Water Moon
        Saturn: { sign: 'Sco' },
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[2]).toBe('F');
    expect(result!.axisReasoning!.TF.value).toBe('F');
    expect(result!.axisReasoning!.TF.reasoning).toContain('felt integrity');
  });

  it('infers T from Saturn-Moon tension with Air/Earth emphasis', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Cap' },
        Moon: { sign: 'Gem' }, // Air Moon
        Mercury: { sign: 'Cap' },
        Venus: { sign: 'Aqu' },
        Saturn: { sign: 'Cap' }, // Earth Saturn = structural
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[2]).toBe('T');
    expect(result!.axisReasoning!.TF.value).toBe('T');
    expect(result!.axisReasoning!.TF.reasoning).toContain('logic, consistency');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // J/P Axis — Moon modality + Saturn structure
  // ─────────────────────────────────────────────────────────────────────────────

  it('infers J from Cardinal/Fixed Moon + Saturn', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Gem' },
        Moon: { sign: 'Cap' }, // Cardinal Moon = J-leaning
        Mercury: { sign: 'Gem' },
        Saturn: { sign: 'Leo' }, // Saturn present = +J weight
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[3]).toBe('J');
    expect(result!.axisReasoning!.JP.value).toBe('J');
    expect(result!.axisReasoning!.JP.reasoning).toContain('settled path');
  });

  it('infers P from Mutable Moon', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Ari' },
        Moon: { sign: 'Sag' }, // Mutable Moon = P-leaning
        Mercury: { sign: 'Ari' },
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[3]).toBe('P');
    expect(result!.axisReasoning!.JP.value).toBe('P');
    expect(result!.axisReasoning!.JP.reasoning).toContain('open options');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Contact Resonance Tests (Separate System)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('inferContactResonance', () => {
    it('returns null for empty chart', () => {
      expect(inferContactResonance(null)).toBeNull();
    });

    it('detects fast ignition from Fire Mars/Sun', () => {
      const chart = {
        positions: {
          Sun: { sign: 'Ari' },
          Moon: { sign: 'Can' },
          Mars: { sign: 'Leo' },
          Mercury: { sign: 'Ari' },
        },
        angle_signs: { ascendant: 'Aqu' },
      } as any;
      const result = inferContactResonance(chart);
      expect(result).not.toBeNull();
      expect(result!.ignition_style).toContain('fast');
    });

    it('detects cool interface from Air Ascendant', () => {
      const chart = {
        positions: {
          Sun: { sign: 'Tau' },
          Moon: { sign: 'Tau' },
          Mercury: { sign: 'Tau' },
        },
        angle_signs: { ascendant: 'Aqu' },
      } as any;
      const result = inferContactResonance(chart);
      expect(result).not.toBeNull();
      expect(result!.interface_tone).toContain('cool');
    });
  });
});
