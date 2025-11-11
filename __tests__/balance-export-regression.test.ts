import { describe, expect, it } from 'vitest';
import { createFrontStageResult, augmentPayloadWithMirrorContract } from '../app/math-brain/hooks/useChartExport';
import { extractAxisNumber } from '../app/math-brain/utils/formatting';

const BASE_SERVER_RESULT = {
  id: 'balance-meter-e2e-fixture',
  provenance: {
    math_brain_version: '0.0.0-test',
    build_ts: '2025-01-01T00:00:00.000Z',
    normalized_input_hash: 'sha256:test-hash',
  },
  person_a: {
    name: 'Dan',
    summary: {
      magnitude: 5.0,
      magnitude_calibrated: 3.9,
      valence: -5.0,
      valence_bounded: -2.3,
      bias_signed: -2.3,
      volatility: 1.1,
      axes: {
        magnitude: {
          value: 3.9,
          normalized: 0.078,
          scaled: 3.9,
          raw: 5.0,
        },
        directional_bias: {
          value: -2.3,
          normalized: -0.046,
          scaled: -2.3,
          raw: -5.0,
          display: '-2.3',
        },
        coherence: {
          value: 1.1,
          normalized: 0.022,
          scaled: 1.1,
          raw: 1.1,
        },
      },
      balance_channel: -2.3,
    },
    chart: {
      transitsByDate: {
        '2018-10-10': {
          date: '2018-10-10',
          label: 'Hurricane Michael landfall',
          aspects: [
            {
              body1: 'Sun',
              body2: 'Pluto',
              aspect: 'Square',
              orb: 0.12,
              type: 'pressure',
            },
          ],
          seismograph: {
            magnitude: 5.0,
            magnitude_calibrated: 3.9,
            valence: -5.0,
            valence_bounded: -2.3,
            bias_signed: -2.3,
            volatility: 1.1,
            axes: {
              magnitude: { value: 3.9 },
              directional_bias: { value: -2.3 },
              coherence: { value: 1.1 },
            },
          },
        },
      },
    },
  },
  woven_map: {
    context: {
      mode: 'BALANCE_METER',
      person_a: {
        name: 'Dan',
        birth_date: '1973-07-24',
        birth_time: '14:30',
      },
    },
    frontstage: {
      blueprint:
        'Dan tends to surge outward when storms roll in, preferring strategic momentum over static comfort.',
    },
    data_tables: {
      daily_readings: [
        {
          date: '2018-10-10',
          magnitude: 3.9,
          valence: -2.3,
          volatility: 1.1,
        },
      ],
    },
  },
} as const;

function makeServerResult() {
  return JSON.parse(JSON.stringify(BASE_SERVER_RESULT));
}

function findSection(sections: Array<{ title: string; body: string }> | undefined, title: string) {
  return sections?.find((section) => section.title === title);
}

describe('Balance Meter export regression', () => {
  it('normalizes raw summary values to calibrated frontstage balance meter ranges', () => {
    const frontStage = createFrontStageResult(makeServerResult());

    expect(frontStage.balance_meter.magnitude).toBeCloseTo(3.9, 1);
    expect(frontStage.balance_meter.directional_bias).toBeCloseTo(-2.3, 1);
    expect(frontStage.balance_meter.volatility).toBeCloseTo(3.9, 1);

    expect(frontStage.balance_meter.magnitude).not.toBeCloseTo(5.0, 1);
    expect(frontStage.balance_meter.directional_bias).not.toBeCloseTo(-5.0, 1);

    expect(frontStage.person_a.summary.magnitude).toBeCloseTo(3.9, 1);
    expect(frontStage.person_a.summary.valence).toBeCloseTo(-2.3, 1);
    expect(frontStage.person_a.summary.bias_signed).toBeCloseTo(-2.3, 1);
    expect(frontStage.person_a.summary.volatility).toBeCloseTo(3.9, 1);

    expect(frontStage.person_a.summary.magnitude).not.toBeCloseTo(5.0, 1);
    expect(frontStage.person_a.summary.valence).not.toBeCloseTo(-5.0, 1);

  const transitDay = frontStage.person_a.chart.transitsByDate?.['2018-10-10'];
  expect(transitDay).toBeDefined();
  expect(transitDay?.seismograph).toBeDefined();
  const day = transitDay?.seismograph as any;
  expect(day.magnitude).toBeCloseTo(3.9, 1);
  expect(day.bias_signed).toBeCloseTo(-2.3, 1);
  expect(day.volatility).toBeCloseTo(3.9, 1);

    expect(frontStage.balance_meter._scale_note).toContain('magnitude: 0-5');
  });

  it('embeds calibrated values into the Raven Calder export contract', () => {
    const exportPayload = augmentPayloadWithMirrorContract(makeServerResult(), 'Balance Meter');

    expect(exportPayload.person_a.summary.magnitude).toBeCloseTo(3.9, 1);
    expect(exportPayload.person_a.summary.valence).toBeCloseTo(-2.3, 1);
    expect(exportPayload.balance_meter.magnitude).toBeCloseTo(3.9, 1);
    expect(exportPayload.balance_meter.directional_bias).toBeCloseTo(-2.3, 1);

    const summarySection = findSection(exportPayload.export_contract?.mirror?.sections, 'Balance Meter Summary');
    expect(summarySection).toBeDefined();
    expect(summarySection?.body).toContain('Magnitude: 3.9');
    expect(summarySection?.body).toContain('Directional Bias: -2.3');
    expect(summarySection?.body).not.toContain('5.0');

    const directive = exportPayload.export_contract?.mirror?.directive;
    expect(typeof directive).toBe('string');
    expect(directive).toContain('RAVEN CALDER');
  });

  it('symbolic weather JSON extracts calibrated values from axes, not raw fields', () => {
    // This test guards against the toNumber() helper reading seismo.magnitude (5.0)
    // instead of seismo.axes.magnitude.value (3.9)
    const serverResult = makeServerResult();
    
    // Verify the fixture has both raw and calibrated values
    const day = serverResult.person_a.chart.transitsByDate['2018-10-10'];
    expect(day.seismograph.magnitude).toBe(5.0); // raw
    expect(day.seismograph.axes.magnitude.value).toBe(3.9); // calibrated
    
    // Use the centralized extractAxisNumber function (same logic as downloadSymbolicWeatherJSON)
    const extractedMag = extractAxisNumber(day.seismograph, 'magnitude');
    const extractedBias = extractAxisNumber(day.seismograph, 'directional_bias');
    const extractedVol = extractAxisNumber(day.seismograph, 'volatility');
    
    expect(extractedMag).toBe(3.9); // MUST read calibrated from axes block
    expect(extractedMag).not.toBe(5.0); // MUST NOT read raw magnitude field
    expect(extractedBias).toBe(-2.3);
    expect(extractedBias).not.toBe(-5.0);
    expect(extractedVol).toBeCloseTo(3.9, 1);
  });

  describe('extractAxisNumber priority order and fallbacks', () => {
    it('prioritizes axes block value over calibrated fields over raw fields', () => {
      const testData = {
        magnitude: 5.0, // raw
        magnitude_calibrated: 4.5, // calibrated field
        axes: {
          magnitude: { value: 3.9 }, // axes block (highest priority)
        },
      };

      expect(extractAxisNumber(testData, 'magnitude')).toBe(3.9);
    });

    it('falls back to calibrated fields when axes block missing', () => {
      const testData = {
        magnitude: 5.0, // raw
        magnitude_calibrated: 4.5, // calibrated field (fallback)
        // no axes block
      };

      expect(extractAxisNumber(testData, 'magnitude')).toBe(4.5);
    });

    it('falls back to raw fields when axes and calibrated missing', () => {
      const testData = {
        magnitude: 5.0, // raw (final fallback)
        // no calibrated, no axes
      };

      expect(extractAxisNumber(testData, 'magnitude')).toBe(5.0);
    });

    it('handles directional_bias priority chain correctly', () => {
      const testData = {
        valence: -5.0, // raw
        valence_bounded: -3.5, // calibrated
        bias_signed: -2.3, // another calibrated
        axes: {
          directional_bias: { value: -1.8 }, // highest priority
        },
      };

      expect(extractAxisNumber(testData, 'directional_bias')).toBe(-1.8);
    });

    it('handles directional_bias fallback to balance_channel', () => {
      const testData = {
        balance_channel: -2.7, // special fallback for directional_bias
        // no axes, no other fields
      };

      expect(extractAxisNumber(testData, 'directional_bias')).toBe(-2.7);
    });

    it('handles volatility/coherence mapping correctly', () => {
      const testData = {
        volatility: 2.0, // raw volatility
        coherence: 1.5, // calibrated coherence
        axes: {
          coherence: { value: 1.1 }, // axes block (highest priority)
        },
      };

      expect(extractAxisNumber(testData, 'volatility')).toBeCloseTo(3.9, 1);
    });

    it('handles nested object values in axes block', () => {
      const testData = {
        axes: {
          magnitude: {
            value: 3.9, // direct value
            scaled: 4.2,
            display: '3.9',
          },
        },
      };

      expect(extractAxisNumber(testData, 'magnitude')).toBe(3.9);
    });

    it('handles string values that parse to numbers', () => {
      const testData = {
        axes: {
          magnitude: { value: '3.9' }, // string that parses
        },
      };

      expect(extractAxisNumber(testData, 'magnitude')).toBe(3.9);
    });

    it('returns undefined for invalid data', () => {
      expect(extractAxisNumber(null, 'magnitude')).toBeUndefined();
      expect(extractAxisNumber({}, 'magnitude')).toBeUndefined();
      expect(extractAxisNumber({ axes: {} }, 'magnitude')).toBeUndefined();
      expect(extractAxisNumber({ magnitude: 'not-a-number' }, 'magnitude')).toBeUndefined();
    });

    it('handles balance_meter.axes alternative structure', () => {
      const testData = {
        balance_meter: {
          axes: {
            magnitude: { value: 4.1 },
          },
        },
        magnitude: 5.0, // should not be used
      };

      expect(extractAxisNumber(testData, 'magnitude')).toBe(4.1);
    });
  });
});
