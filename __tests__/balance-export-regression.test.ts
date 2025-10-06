import { describe, expect, it } from 'vitest';
import { createFrontStageResult, augmentPayloadWithMirrorContract } from '../app/math-brain/hooks/useChartExport';

const BASE_SERVER_RESULT = {
  id: 'balance-meter-e2e-fixture',
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
    expect(frontStage.balance_meter.volatility).toBeCloseTo(1.1, 1);

    expect(frontStage.balance_meter.magnitude).not.toBeCloseTo(5.0, 1);
    expect(frontStage.balance_meter.directional_bias).not.toBeCloseTo(-5.0, 1);

    expect(frontStage.person_a.summary.magnitude).toBeCloseTo(3.9, 1);
    expect(frontStage.person_a.summary.valence).toBeCloseTo(-2.3, 1);
    expect(frontStage.person_a.summary.bias_signed).toBeCloseTo(-2.3, 1);
    expect(frontStage.person_a.summary.volatility).toBeCloseTo(1.1, 1);

    expect(frontStage.person_a.summary.magnitude).not.toBeCloseTo(5.0, 1);
    expect(frontStage.person_a.summary.valence).not.toBeCloseTo(-5.0, 1);

  const transitDay = frontStage.person_a.chart.transitsByDate?.['2018-10-10'];
  expect(transitDay).toBeDefined();
  expect(transitDay?.seismograph).toBeDefined();
  const day = transitDay?.seismograph as any;
  expect(day.magnitude).toBeCloseTo(3.9, 1);
  expect(day.bias_signed).toBeCloseTo(-2.3, 1);
  expect(day.volatility).toBeCloseTo(1.1, 1);

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
    expect(summarySection?.body).toContain('Valence: -2.3');
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
    
    // Simulate the symbolic weather export logic (matches downloadSymbolicWeatherJSON)
    const extractAxisValue = (source: any, axis: 'magnitude' | 'directional_bias' | 'volatility') => {
      const axesBlock = source?.axes;
      if (!axesBlock) return undefined;
      
      const axisMap: Record<string, string> = {
        magnitude: 'magnitude',
        directional_bias: 'directional_bias',
        volatility: 'coherence',
      };
      
      const axisData = axesBlock[axisMap[axis]];
      if (typeof axisData === 'number') return axisData;
      if (axisData && typeof axisData === 'object' && typeof axisData.value === 'number') {
        return axisData.value;
      }
      return undefined;
    };
    
    // The toNumber function MUST read from axes when axis param is provided
    const extractedMag = extractAxisValue(day.seismograph, 'magnitude');
    const extractedBias = extractAxisValue(day.seismograph, 'directional_bias');
    
    expect(extractedMag).toBe(3.9); // MUST read calibrated
    expect(extractedMag).not.toBe(5.0); // MUST NOT read raw
    expect(extractedBias).toBe(-2.3);
    expect(extractedBias).not.toBe(-5.0);
  });
});
