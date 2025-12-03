import { inferMbtiFromChart, inferContactResonance } from '../../lib/mbti/inferMbtiFromChart';

/**
 * Tests for MBTI Correspondence Inference (Subtle / Backstage Only)
 * 
 * ARCHITECTURE NOTE (v1.2-final-firewall-enforced):
 * 
 * Axis Sources (Interior Compass ONLY):
 * - E/I: Moon element + Saturn bias
 *        FIREWALL: Sun polarity, Ascendant, Mars EXCLUDED
 * - N/S: Sun element + Mercury element (perception architecture)
 * - T/F: Moon element + Venus-Saturn weighting + MC/IC purpose-axis tone
 * - J/P: Moon modality + Saturn structure-bias
 *        FIREWALL: Sun modality, Ascendant modality EXCLUDED
 * 
 * Contact Resonance (Ascendant sign, Mars, Mercury tempo, Sun expression) 
 * is tracked separately and NEVER determines type.
 * 
 * Protocol Rules:
 * - Rule A: No Axis Left Uncalled — every axis gets a best-fit
 * - Rule B: Layer-Based Tie-Breaker — Moon first, Saturn second
 * - Rule C: Falsifiability Required — every call includes testable prediction
 * 
 * All scoring values are HEURISTICS, not empirical claims.
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
  // v1.2: Per-Axis Reasoning and Falsifiability
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
    
    // Check all four axes have required fields
    for (const axis of ['EI', 'NS', 'TF', 'JP'] as const) {
      expect(result!.axisReasoning![axis]).toBeDefined();
      // Value should be single letter from MBTI type (E, I, N, S, T, F, J, P)
      expect(['E', 'I', 'N', 'S', 'T', 'F', 'J', 'P']).toContain(result!.axisReasoning![axis].value);
      expect(['strong_call', 'clear_call', 'soft_call']).toContain(result!.axisReasoning![axis].confidence);
      expect(result!.axisReasoning![axis].reasoning).toBeTruthy();
      // Falsifiability should be a non-empty string with testable language
      expect(result!.axisReasoning![axis].falsifiability).toBeTruthy();
      expect(result!.axisReasoning![axis].falsifiability.length).toBeGreaterThan(20);
    }
  });

  it('includes globalSummary with Protocol Rule A reference', () => {
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
    expect(result!.globalSummary).toContain('Protocol Rule A');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // E/I Axis — Interior Compass (Moon, MC) — NOT Ascendant
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
    expect(result!._layer_note).toContain('Interior Compass');
    expect(result!.axisReasoning!.EI.value).toBe('E');
    expect(result!.axisReasoning!.EI.reasoning).toContain('Moon');
  });

  it('infers I from Water Moon (Interior Compass)', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Ari' },
        Moon: { sign: 'Sco' }, // Water Moon = I-leaning
        Mercury: { sign: 'Ari' },
      },
      angle_signs: { midheaven: 'Sco' }, // Water MC reinforces I
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[0]).toBe('I');
    expect(result!.axisReasoning!.EI.value).toBe('I');
  });

  it('does NOT use Ascendant for E/I (Contact Resonance excluded)', () => {
    // Fire Ascendant should NOT push toward E if Moon is Water
    const chart = {
      positions: {
        Sun: { sign: 'Tau' },
        Moon: { sign: 'Can' }, // Water Moon = I-leaning
        Mercury: { sign: 'Tau' },
        Saturn: { sign: 'Cap' }, // Saturn adds inward weight
      },
      angle_signs: { 
        ascendant: 'Ari', // Fire ASC — should be IGNORED for MBTI
        midheaven: 'Cap',
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    // Should be I despite Fire Ascendant
    expect(result!.code[0]).toBe('I');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // N/S Axis — Actor (Sun) element + Mercury element (v1.2 Final)
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
    expect(result!.axisReasoning!.NS.reasoning).toContain('pattern');
  });

  it('infers S from Earth/Water Actor + Mercury (concrete-first)', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Tau' }, // Earth Actor = S-leaning
        Moon: { sign: 'Leo' },
        Mercury: { sign: 'Cap' }, // Earth Mercury = S-leaning
        Saturn: { sign: 'Cap' },
      },
      angle_signs: { midheaven: 'Cap' },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[1]).toBe('S');
    expect(result!.axisReasoning!.NS.value).toBe('S');
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
        Saturn: { sign: 'Sco' }, // Water Saturn serves relational depth
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[2]).toBe('F');
    expect(result!.axisReasoning!.TF.value).toBe('F');
    expect(result!.axisReasoning!.TF.reasoning).toContain('resonance');
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
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // J/P Axis — Moon modality + Saturn structure (v1.2-final-firewall-enforced)
  // FIREWALL: Sun modality and Ascendant modality EXCLUDED
  // ─────────────────────────────────────────────────────────────────────────────

  it('infers J from Cardinal/Fixed Moon + Saturn', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Gem' }, // Mutable Sun (IGNORED for J/P)
        Moon: { sign: 'Cap' }, // Cardinal Moon = J-leaning
        Mercury: { sign: 'Gem' },
        Saturn: { sign: 'Leo' }, // Saturn present = +J weight
      },
      angle_signs: { ascendant: 'Pis' }, // Mutable ASC (IGNORED for J/P)
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[3]).toBe('J');
    expect(result!.axisReasoning!.JP.value).toBe('J');
    expect(result!.axisReasoning!.JP.reasoning).toContain('closure');
  });

  it('infers P from Mutable Moon', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Ari' }, // Cardinal Sun (IGNORED for J/P)
        Moon: { sign: 'Sag' }, // Mutable Moon = P-leaning
        Mercury: { sign: 'Ari' },
      },
      angle_signs: { ascendant: 'Cap' }, // Cardinal ASC (IGNORED for J/P)
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[3]).toBe('P');
    expect(result!.axisReasoning!.JP.value).toBe('P');
  });

  it('does NOT use Sun or Ascendant modality for J/P (Contact Resonance firewall)', () => {
    // Cardinal Sun + Cardinal Ascendant should NOT push toward J if Moon is Mutable
    const chart = {
      positions: {
        Sun: { sign: 'Ari' }, // Cardinal Sun — IGNORED
        Moon: { sign: 'Gem' }, // Mutable Moon = P-leaning
        Mercury: { sign: 'Ari' },
      },
      angle_signs: { ascendant: 'Cap' }, // Cardinal ASC — IGNORED
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    // Should be P despite Cardinal Sun/Ascendant
    expect(result!.code[3]).toBe('P');
  });

  it('produces valid four-letter code with layer note', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Ari' },
        Moon: { sign: 'Leo' },
        Mercury: { sign: 'Gem' },
        Venus: { sign: 'Can' },
        Mars: { sign: 'Leo' },
        Saturn: { sign: 'Sco' },
      },
      angle_signs: { 
        ascendant: 'Vir',
        midheaven: 'Gem',
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code).toMatch(/^[EI][NS][TF][JP]$/);
    expect(result!._layer_note).toBeDefined();
    expect(result!._layer_note).toContain('v1.2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Contact Resonance Tests (Separate System)
// ─────────────────────────────────────────────────────────────────────────────

describe('inferContactResonance', () => {
  it('returns null for empty chart', () => {
    expect(inferContactResonance(null)).toBeNull();
    expect(inferContactResonance(undefined)).toBeNull();
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

  it('detects warm interface from Fire Ascendant', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Cap' },
        Moon: { sign: 'Cap' },
        Mercury: { sign: 'Cap' },
      },
      angle_signs: { ascendant: 'Leo' },
    } as any;
    const result = inferContactResonance(chart);
    expect(result).not.toBeNull();
    expect(result!.interface_tone).toContain('warm');
  });

  // v1.2: Appearance mismatch detection
  it('detects E/I appearance mismatch note for Fire Ascendant', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Tau' },
        Moon: { sign: 'Can' }, // Water Moon = I-leaning
        Mercury: { sign: 'Tau' },
      },
      angle_signs: { ascendant: 'Ari' }, // Fire ASC = E-like presentation
    } as any;
    const result = inferContactResonance(chart);
    expect(result).not.toBeNull();
    expect(result!.ei_appearance_note).toBeDefined();
    expect(result!.ei_appearance_note).toContain('E-like');
  });

  it('detects T/F appearance mismatch note for Mercury in Air', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Tau' },
        Moon: { sign: 'Pis' }, // Water Moon
        Mercury: { sign: 'Aqu' }, // Air Mercury = T-like articulation
        Venus: { sign: 'Can' }, // Water Venus = F-leaning interior
      },
      angle_signs: { ascendant: 'Tau' },
    } as any;
    const result = inferContactResonance(chart);
    expect(result).not.toBeNull();
    expect(result!.tf_appearance_note).toBeDefined();
    expect(result!.tf_appearance_note).toContain('T-like');
  });
});
