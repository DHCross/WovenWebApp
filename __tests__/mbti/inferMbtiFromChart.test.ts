import { inferMbtiFromChart } from '../../lib/mbti/inferMbtiFromChart';

/**
 * Tests for MBTI Correspondence Inference (Subtle / Backstage Only)
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

  it('infers E from Fire/Air ascendant', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Leo' },
        Moon: { sign: 'Gem' },
        Mercury: { sign: 'Ari' },
      },
      angle_signs: { ascendant: 'Sag' }, // Fire = E
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[0]).toBe('E');
    expect(typeof result!._axes?.EI).toBe('number');
  });

  it('infers I from Earth/Water ascendant', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Cap' },
        Moon: { sign: 'Sco' },
        Mercury: { sign: 'Vir' },
      },
      angle_signs: { ascendant: 'Can' }, // Water = I
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[0]).toBe('I');
  });

  it('infers N from Air/Fire Mercury', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Tau' },
        Moon: { sign: 'Tau' },
        Mercury: { sign: 'Gem' }, // Air = N
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[1]).toBe('N');
  });

  it('infers S from Earth/Water Mercury', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Leo' },
        Moon: { sign: 'Leo' },
        Mercury: { sign: 'Vir' }, // Earth = S
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[1]).toBe('S');
  });

  it('infers T from Air dominance', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Lib' },
        Moon: { sign: 'Aqu' },
        Mercury: { sign: 'Gem' },
        Venus: { sign: 'Lib' },
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[2]).toBe('T');
  });

  it('infers F from Water dominance', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Pis' },
        Moon: { sign: 'Can' },
        Mercury: { sign: 'Sco' },
        Venus: { sign: 'Pis' },
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[2]).toBe('F');
  });

  it('infers J from Cardinal/Fixed dominance', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Ari' },   // Cardinal
        Moon: { sign: 'Leo' },  // Fixed
        Mercury: { sign: 'Cap' }, // Cardinal
        Venus: { sign: 'Tau' }, // Fixed
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[3]).toBe('J');
  });

  it('infers P from Mutable dominance', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Gem' },   // Mutable
        Moon: { sign: 'Vir' },  // Mutable
        Mercury: { sign: 'Sag' }, // Mutable
        Venus: { sign: 'Pis' }, // Mutable
      },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code[3]).toBe('P');
  });

  it('produces valid four-letter code', () => {
    const chart = {
      positions: {
        Sun: { sign: 'Ari' },
        Moon: { sign: 'Tau' },
        Mercury: { sign: 'Gem' },
        Venus: { sign: 'Can' },
        Mars: { sign: 'Leo' },
      },
      angle_signs: { ascendant: 'Vir' },
    } as any;
    const result = inferMbtiFromChart(chart);
    expect(result).not.toBeNull();
    expect(result!.code).toMatch(/^[EI][NS][TF][JP]$/);
  });

});
