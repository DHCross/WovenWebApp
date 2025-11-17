import { createWovenAIPacket } from '../lib/export/wovenAIPacket';

// NOTE: These tests assume a v2 Math Brain unified output shape. They deliberately
// do NOT treat any prior transcripts or LLM output as geometry. All geometry
// comes from the unifiedOutput JSON fixture below.

const baseUnifiedOutput: any = {
  person_a: {
    name: 'Alex',
    summary: {
      sun_sign: 'Leo',
      sun_house: '9th house',
      sun_blurb: 'Solar narrative for testing.',
      moon_sign: 'Cancer',
      moon_house: '7th house',
      moon_blurb: 'Lunar narrative for testing.',
      rising_sign: 'Sagittarius',
      rising_blurb: 'Rising narrative for testing.',
      primary_mode: {
        function: 'Explorer',
        description: 'Tends to move toward meaning-making and exploration.',
      },
      shadow_mode: {
        function: 'Withholder',
        description: 'Tends to pull back when pressure spikes.',
      },
    },
    chart: {
      // Minimal transit structure for hasTransits + daily table wiring
      transitsByDate: {
        '2025-10-12': {
          seismograph: {
            magnitude: 3.2,
            directional_bias: { value: -1.3 },
            volatility: 1.1,
          },
          label: 'Test Day',
        },
      },
    },
  },
  run_metadata: {
    protocol_version: '10.1.26',
  },
  provenance: {
    data_source: 'Math Brain API',
    ephemeris_backend: 'test-ephemeris',
    orbs_profile: 'wm-spec-2025-09',
    relocation_mode: 'none',
    math_brain_version: '2.0.0',
  },
  balance_meter: {
    channel_summary_canonical: {
      axes: {
        magnitude: { value: 3.2 },
        directional_bias: { value: -1.1 },
      },
      labels: {
        magnitude: 'Moderate',
        directional_bias: 'Slightly contractive',
      },
      line: 'Magnitude 3.2 (Moderate) · Bias -1.1 (Slightly contractive)',
    },
  },
  // Provide at least one daily entry so FIELD table has data
  daily_entries: [
    {
      date: '2025-10-12',
      symbolic_weather: {
        magnitude: 3.2,
        directional_bias: -1.3,
        coherence: 4.2,
        label: 'Test Day',
      },
    },
  ],
};

describe('createWovenAIPacket', () => {
  it('generates a packet with protocol intact and geometry-derived sections filled', () => {
    const { content, meta, filename } = createWovenAIPacket(baseUnifiedOutput, {
      variant: 'compact',
      checksumFn: () => 'test-checksum',
    });

    // Meta assertions
    expect(meta.variant).toBe('compact');
    expect(meta.hasField).toBe(true);
    expect(meta.hasTransits).toBe(true);
    expect(meta.reportType).toBe('combined');
    expect(meta.protocolVersion).toBe('10.1.26');

    expect(filename).toContain('woven_packet_v1.0_Alex_');

    // Protocol text should remain present (sample key phrases from canonical doc)
    expect(content).toContain('Geometry proposes.');
    expect(content).toContain('The human disposes.');
    expect(content).toContain('SST categories are **not** part of the geometry.');

    // Placeholders for geometry/provenance should be fully resolved
    expect(content).not.toContain('{{field.magnitude}}');
    expect(content).not.toContain('{{provenance.data_source}}');
    expect(content).not.toContain('{{hook_1}}');
    expect(content).not.toContain('{{#each daily_readings_trimmed}}');

    // Provenance block should include values from unifiedOutput.provenance
    expect(content).toContain('Data Source: Math Brain API');
    expect(content).toContain('Ephemeris Backend: test-ephemeris');
    expect(content).toContain('Orbs Profile: wm-spec-2025-09');

    // FIELD snapshot should reflect the Balance Meter summary
    expect(content).toContain('Magnitude 3.2');
    expect(content).toContain('Moderate');

    // MAP snapshot should carry Sun/Moon/Rising info
    expect(content).toContain('Sun: Leo');
    expect(content).toContain('Moon: Cancer');
    expect(content).toContain('Rising: Sagittarius');

    // Daily table should include our test date row
    expect(content).toContain('2025-10-12');
    expect(content).toContain('Test Day');
  });

  it('throws when provenance is missing', () => {
    const bad = { ...baseUnifiedOutput };
    // Intentionally remove provenance to trigger required-field validation
    delete (bad as any).provenance;

    expect(() => createWovenAIPacket(bad)).toThrow(/Missing provenance/);
  });

  it('throws when FIELD data is missing', () => {
    const bad = {
      ...baseUnifiedOutput,
      balance_meter: undefined,
      balance_meter_frontstage: undefined,
      daily_entries: [],
      woven_map: { symbolic_weather: [] },
    };

    expect(() => createWovenAIPacket(bad)).toThrow(/FIELD \/ symbolic weather metrics/);
  });
});
