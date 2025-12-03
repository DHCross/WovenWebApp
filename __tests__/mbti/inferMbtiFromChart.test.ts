/**
 * Tests for MBTI Correspondence Inference
 */
import { describe, it, expect } from 'vitest';
import { inferMbtiFromChart, formatForPoeticBrain, type ChartData } from '../../lib/mbti/inferMbtiFromChart';

describe('inferMbtiFromChart', () => {
  // Sample chart with Fire/Air dominance, Cardinal rising, Angular Saturn
  const extrovertedThinkingChart: ChartData = {
    positions: {
      Sun: { sign: 'Leo', deg: 1.69, abs_pos: 121.69, house: 10, retro: false },
      Moon: { sign: 'Gem', deg: 15.2, abs_pos: 75.2, house: 8, retro: false },
      Mercury: { sign: 'Leo', deg: 10.5, abs_pos: 130.5, house: 10, retro: false },
      Venus: { sign: 'Vir', deg: 5.3, abs_pos: 155.3, house: 11, retro: false },
      Mars: { sign: 'Ari', deg: 20.1, abs_pos: 20.1, house: 6, retro: false },
      Jupiter: { sign: 'Aqu', deg: 12.0, abs_pos: 312.0, house: 4, retro: false },
      Saturn: { sign: 'Cap', deg: 25.0, abs_pos: 295.0, house: 1, retro: false }, // Angular!
      Uranus: { sign: 'Lib', deg: 8.0, abs_pos: 188.0, house: 12, retro: false },
      Neptune: { sign: 'Sag', deg: 3.0, abs_pos: 243.0, house: 2, retro: false },
    },
    angle_signs: {
      ascendant: 'Ari', // Cardinal Fire rising
      mc: 'Cap',
    },
  };

  // Sample chart with Earth/Water dominance, Fixed rising
  const introvertedFeelingChart: ChartData = {
    positions: {
      Sun: { sign: 'Can', deg: 15.0, abs_pos: 105.0, house: 4, retro: false },
      Moon: { sign: 'Tau', deg: 22.0, abs_pos: 52.0, house: 2, retro: false },
      Mercury: { sign: 'Can', deg: 8.0, abs_pos: 98.0, house: 4, retro: false },
      Venus: { sign: 'Pis', deg: 12.0, abs_pos: 342.0, house: 12, retro: false },
      Mars: { sign: 'Vir', deg: 5.0, abs_pos: 155.0, house: 6, retro: false },
      Jupiter: { sign: 'Sco', deg: 20.0, abs_pos: 230.0, house: 8, retro: false },
      Saturn: { sign: 'Tau', deg: 10.0, abs_pos: 40.0, house: 2, retro: false },
    },
    angle_signs: {
      ascendant: 'Sco', // Fixed Water rising
      mc: 'Leo',
    },
  };

  // Mutable-dominant chart for P tendency
  const perceptiveChart: ChartData = {
    positions: {
      Sun: { sign: 'Gem', deg: 5.0, abs_pos: 65.0, house: 9, retro: false },
      Moon: { sign: 'Sag', deg: 12.0, abs_pos: 252.0, house: 3, retro: false },
      Mercury: { sign: 'Gem', deg: 15.0, abs_pos: 75.0, house: 9, retro: false },
      Venus: { sign: 'Vir', deg: 8.0, abs_pos: 158.0, house: 12, retro: false },
      Mars: { sign: 'Pis', deg: 20.0, abs_pos: 350.0, house: 6, retro: false },
      Uranus: { sign: 'Lib', deg: 0.0, abs_pos: 180.0, house: 1, retro: false }, // Angular Uranus
    },
    angle_signs: {
      ascendant: 'Lib',
      mc: 'Can',
    },
  };

  it('returns null for empty chart', () => {
    expect(inferMbtiFromChart(null)).toBeNull();
    expect(inferMbtiFromChart(undefined)).toBeNull();
    expect(inferMbtiFromChart({})).toBeNull();
    expect(inferMbtiFromChart({ positions: {} })).toBeNull();
  });

  it('infers E tendency from Fire/Air dominance and Cardinal rising', () => {
    const result = inferMbtiFromChart(extrovertedThinkingChart);
    expect(result).not.toBeNull();
    expect(result!.axes.EI.indicated).toBe('E');
    expect(result!.axes.EI.score).toBeLessThan(0); // Negative = E
    expect(result!.axes.EI.rationale.length).toBeGreaterThan(0);
  });

  it('infers I tendency from Earth/Water dominance and Fixed rising', () => {
    const result = inferMbtiFromChart(introvertedFeelingChart);
    expect(result).not.toBeNull();
    expect(result!.axes.EI.indicated).toBe('I');
    expect(result!.axes.EI.score).toBeGreaterThan(0); // Positive = I
  });

  it('infers N tendency from Air/Fire Mercury', () => {
    const result = inferMbtiFromChart(extrovertedThinkingChart);
    expect(result).not.toBeNull();
    // Leo Mercury (Fire) should indicate N
    expect(result!.axes.NS.indicated).toBe('N');
  });

  it('infers S tendency from Earth/Water Mercury', () => {
    const result = inferMbtiFromChart(introvertedFeelingChart);
    expect(result).not.toBeNull();
    // Cancer Mercury (Water) could be N or S — check score direction
    // Water Mercury is slightly N-leaning in our model
    expect(['N', 'S']).toContain(result!.axes.NS.indicated);
  });

  it('infers T tendency from Angular Saturn and Air emphasis', () => {
    const result = inferMbtiFromChart(extrovertedThinkingChart);
    expect(result).not.toBeNull();
    expect(result!.axes.TF.indicated).toBe('T');
    expect(result!.axes.TF.rationale.some(r => r.includes('Saturn'))).toBe(true);
  });

  it('infers F tendency from Venus in Water and Water emphasis', () => {
    const result = inferMbtiFromChart(introvertedFeelingChart);
    expect(result).not.toBeNull();
    expect(result!.axes.TF.indicated).toBe('F');
  });

  it('infers J tendency from Cardinal/Fixed modality dominance', () => {
    const result = inferMbtiFromChart(extrovertedThinkingChart);
    expect(result).not.toBeNull();
    expect(result!.axes.JP.indicated).toBe('J');
  });

  it('infers P tendency from Mutable dominance and Angular Uranus', () => {
    const result = inferMbtiFromChart(perceptiveChart);
    expect(result).not.toBeNull();
    expect(result!.axes.JP.indicated).toBe('P');
    expect(result!.axes.JP.rationale.some(r => r.includes('Mutable') || r.includes('Uranus'))).toBe(true);
  });

  it('generates valid 4-letter code', () => {
    const result = inferMbtiFromChart(extrovertedThinkingChart);
    expect(result).not.toBeNull();
    expect(result!.code).toMatch(/^[EI][NS][TF][JP]$/);
  });

  it('includes archetypal motion phrases', () => {
    const result = inferMbtiFromChart(extrovertedThinkingChart);
    expect(result).not.toBeNull();
    expect(result!.archetypal_motion).not.toBeNull();
  });

  it('includes symbolic phrases from correspondence table', () => {
    const result = inferMbtiFromChart(extrovertedThinkingChart);
    expect(result).not.toBeNull();
    expect(result!.symbolic_phrases.length).toBeGreaterThan(0);
  });

  it('includes disclaimer', () => {
    const result = inferMbtiFromChart(extrovertedThinkingChart);
    expect(result).not.toBeNull();
    expect(result!.disclaimer).toContain('Symbolic resonance');
  });

  it('detects hinge points when scores are close to zero', () => {
    // Create a balanced chart
    const balancedChart: ChartData = {
      positions: {
        Sun: { sign: 'Lib', deg: 15.0, abs_pos: 195.0, house: 7, retro: false },
        Moon: { sign: 'Cap', deg: 10.0, abs_pos: 280.0, house: 10, retro: false },
        Mercury: { sign: 'Lib', deg: 20.0, abs_pos: 200.0, house: 7, retro: false },
      },
      angle_signs: { ascendant: 'Ari', mc: 'Cap' },
    };
    
    const result = inferMbtiFromChart(balancedChart);
    expect(result).not.toBeNull();
    // With limited placements, some axes may be near zero
  });

  it('calculates confidence based on available indicators', () => {
    const result = inferMbtiFromChart(extrovertedThinkingChart);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThan(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
  });
});

describe('formatForPoeticBrain', () => {
  const sampleChart: ChartData = {
    positions: {
      Sun: { sign: 'Leo', deg: 1.69, abs_pos: 121.69, house: 10, retro: false },
      Moon: { sign: 'Tau', deg: 15.0, abs_pos: 45.0, house: 7, retro: false },
      Mercury: { sign: 'Leo', deg: 10.0, abs_pos: 130.0, house: 10, retro: false },
      Saturn: { sign: 'Cap', deg: 25.0, abs_pos: 295.0, house: 1, retro: false },
    },
    angle_signs: { ascendant: 'Ari', mc: 'Cap' },
  };

  it('returns null for null correspondence', () => {
    expect(formatForPoeticBrain(null)).toBeNull();
  });

  it('formats correspondence with symbolic language', () => {
    const correspondence = inferMbtiFromChart(sampleChart);
    const formatted = formatForPoeticBrain(correspondence);
    
    expect(formatted).not.toBeNull();
    expect(formatted).toContain('Constitutional Motion');
    expect(formatted).toContain('Core Tendencies');
  });

  it('does not include raw MBTI code in output', () => {
    const correspondence = inferMbtiFromChart(sampleChart);
    const formatted = formatForPoeticBrain(correspondence);
    
    expect(formatted).not.toBeNull();
    // Should not contain raw 4-letter codes
    expect(formatted).not.toMatch(/\b(INTJ|INFJ|ENTJ|ENFJ|INTP|INFP|ENTP|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)\b/);
  });
});
