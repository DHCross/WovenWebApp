import { summariseUploadedReportJson } from '@/lib/raven/reportSummary';

describe('summariseUploadedReportJson', () => {
  it('recognizes symbolic weather JSON exports with balance meter context', () => {
    const sample = {
      _format: 'symbolic_weather_json',
      report_kind: 'Relational Balance Meter',
      generated_at: '2025-10-08T20:43:48.754Z',
      daily_readings: [
        {
          date: '2025-10-08',
          magnitude: 5,
          directional_bias: -5,
          coherence: 3.3,
        },
        {
          date: '2025-10-09',
          magnitude: 5,
          directional_bias: -5,
          coherence: 3.2,
        },
        {
          date: '2025-10-10',
          magnitude: 5,
          directional_bias: -5,
          coherence: 2.3,
        }
      ],
      symbolic_weather_context: {
        balance_meter: {
          magnitude: 5,
          magnitude_label: 'Threshold',
          bias_signed: -5,
          valence_label: 'Maximum Inward',
          coherence: 3.3,
          volatility_label: 'Mixed Paths',
          bias_motion: 'Peak contraction; boundaries enforced strongly',
        },
        transit_context: {
          period: {
            start: '2025-10-08',
            end: '2025-10-10',
          }
        },
        field_triggers: ['Sun', 'square', 'Moon']
      }
    };

    const summary = summariseUploadedReportJson(JSON.stringify(sample));
    expect(summary).not.toBeNull();
    expect(summary?.draft.appendix).toBeDefined();
    expect(summary?.draft.appendix?.period_start).toBe('2025-10-08');
    expect(summary?.draft.appendix?.period_end).toBe('2025-10-10');
    expect(summary?.draft.appendix?.magnitude).toBe(5);
    expect(summary?.draft.appendix?.directional_bias).toBe(-5);
    expect(summary?.draft.appendix?.coherence).toBeCloseTo(3.3);
    expect(summary?.draft.container).toContain('Daily coverage is continuous');
    expect(summary?.highlight).toContain('Daily coverage is continuous from 2025-10-08 to 2025-10-10');
  });

  it('calls out gaps when the data skips days', () => {
    const sampleWithGaps = {
      _format: 'symbolic_weather_json',
      report_kind: 'Relational Balance Meter',
      daily_readings: [
        { date: '2025-10-08', magnitude: 3, directional_bias: 1, coherence: 2 },
        { date: '2025-10-10', magnitude: 4, directional_bias: -2, coherence: 2.5 },
      ],
      symbolic_weather_context: {
        balance_meter: {
          magnitude: 4,
          magnitude_label: 'Strong',
          bias_signed: -2,
          valence_label: 'Pulling Inward',
          coherence: 2.5,
          volatility_label: 'Variable',
        },
        transit_context: {
          period: {
            start: '2025-10-08',
            end: '2025-10-10',
          }
        }
      }
    };

    const summary = summariseUploadedReportJson(JSON.stringify(sampleWithGaps));
    expect(summary).not.toBeNull();
    expect(summary?.draft.container).toContain('has gaps');
    expect(summary?.draft.appendix?.is_continuous).toBe(false);
  });

  it('threads relationship fields into container, highlight, and appendix', () => {
    const relationalSample = {
      _format: 'symbolic_weather_json',
      report_kind: 'Relational Balance Meter',
      daily_readings: [
        { date: '2025-10-08', magnitude: 4.2, directional_bias: -1.4, coherence: 3.1 },
        { date: '2025-10-09', magnitude: 4.4, directional_bias: -1.6, coherence: 3.0 },
      ],
      relationship_context: {
        scope: 'partner',
        type: 'partner',
        contact_state: 'On Hold',
        role: 'Navigator',
        intimacy_tier: 'P5a',
        notes: 'Currently recalibrating shared cadence.',
      },
      symbolic_weather_context: {
        balance_meter: {
          magnitude: 4.4,
          magnitude_label: 'Strong',
          bias_signed: -1.6,
          valence_label: 'Pulling Inward',
          coherence: 3.0,
          volatility_label: 'Variable',
        },
        transit_context: {
          period: {
            start: '2025-10-08',
            end: '2025-10-09',
          },
        },
        field_triggers: ['Venus', 'trine', 'Mars'],
      },
    };

    const summary = summariseUploadedReportJson(JSON.stringify(relationalSample));
    expect(summary).not.toBeNull();
    expect(summary?.draft.container).toContain('Relational scope');
    expect(summary?.draft.container).toContain('Partner');
    expect(summary?.draft.container).toContain('Intimacy · P5a — Committed romantic + sexual');
    expect(summary?.highlight).toContain('Partner');
    expect(summary?.highlight).toContain('Contact On Hold');
    expect(summary?.draft.appendix?.relationship_scope).toBe('partner');
    expect(summary?.draft.appendix?.relationship_scope_label).toBe('Partner');
    expect(summary?.draft.appendix?.intimacy_tier).toBe('P5a');
    expect(summary?.draft.appendix?.intimacy_tier_label).toBe('P5a — Committed romantic + sexual');
    expect(summary?.draft.appendix?.relationship_notes).toBe('Currently recalibrating shared cadence.');
  });
});
