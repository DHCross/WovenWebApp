/**
 * Test for trimPayloadForPoeticBrain
 * Verifies payload trimming reduces size while preserving essential data
 */
import { describe, it, expect } from 'vitest';
import { trimPayloadForPoeticBrain, estimatePayloadReduction } from '../../lib/export/trimPayloadForPoeticBrain';

describe('trimPayloadForPoeticBrain', () => {
  const samplePayload = {
    _format: 'mirror-symbolic-weather-v1',
    _version: '1.0',
    _poetic_brain_compatible: true,          // Should be DROPPED
    _template_hint: 'solo_mirror',           // Should be DROPPED
    _contains_transits: true,
    _contains_weather_data: true,
    _range_dates: ['2025-11-29', '2025-12-01'],
    _transit_days: 3,
    _natal_sections: 1,
    _required_sections: ['person_a'],
    generated_at: '2025-11-29T06:06:38.207Z',
    _natal_section: {
      mirror_source: 'integrated',
      note: 'Test',
      relationship_context: {
        type: 'PARTNER',
        intimacy_tier: 'P3',
        contact_state: 'ACTIVE',
        ex_estranged: false,
        scope: 'PARTNER',
        scope_label: 'Partner',
      },
    },
    person_a: {
      name: 'Dan',
      birth_data: {
        name: 'Dan',
        year: 1973,
        month: 7,
        day: 24,
        hour: 14,
        minute: 30,
        timezone: 'America/New_York',
      },
      chart: {
        name: 'Dan',                         // Should be DROPPED
        year: 1973,                          // Should be DROPPED (duplicate)
        month: 7,                            // Should be DROPPED (duplicate)
        day: 24,                             // Should be DROPPED (duplicate)
        lng: -75.3,
        lat: 40.0167,
        tz_str: 'America/New_York',
        zodiac_type: 'Tropic',
        houses_system_identifier: 'P',
        houses_system_name: 'Placidus',
        house_cusps: [218.79, 247.49, 282.51, 320.31, 353.15, 18.77, 38.79, 67.49, 102.51, 140.31, 173.15, 198.77],
        sun: {
          name: 'Sun',                       // Should be DROPPED
          quality: 'Fixed',                  // Should be DROPPED
          element: 'Fire',                   // Should be DROPPED
          sign: 'Leo',
          sign_num: 4,
          position: 1.69,                    // Should be DROPPED
          abs_pos: 121.69,
          emoji: '♌️',                        // Should be DROPPED
          point_type: 'Planet',              // Should be DROPPED
          house: 'Ninth_House',
          retrograde: false,
        },
        moon: {
          name: 'Moon',
          quality: 'Fixed',
          element: 'Earth',
          sign: 'Tau',
          sign_num: 1,
          abs_pos: 54.35,
          emoji: '♉️',
          point_type: 'Planet',
          house: 'Seventh_House',
          retrograde: false,
        },
        planets_names_list: ['Sun', 'Moon'], // Should be DROPPED
        transitsByDate: {
          '2025-11-29': {
            seismograph: {
              magnitude: 3.2,
              magnitude_label: 'Surge',
              magnitude_meta: null,
              magnitude_range: [0, 5],
              magnitude_method: 'adaptive_normalization_v4',  // Should be DROPPED
              rawMagnitude: 3.23,                             // Should be DROPPED
              rawDirectionalBias: -4.56,                      // Should be DROPPED
              directional_bias: {
                value: -4.6,
                abs: 4.6,
                label: 'Maximum Inward',
                code: 'max_inward',
                direction: 'inward',
                meta: {                                       // Should be DROPPED
                  method: 'seismograph_signed_v4',
                  epsilon: 0.05,
                  transform_pipeline: ['sign_resolution', 'no_clamp'],
                },
              },
              volatility: 4.77,
              volatility_label: 'Fragment Scatter',
            },
            aspects: [                                        // Should be DROPPED
              { p1: 'Sun', p2: 'Moon', aspect: 'sextile', orb: 2.3 },
            ],
            hooks: ['some hook'],                             // Should be DROPPED
            drivers: ['some driver'],                         // Should be DROPPED
          },
        },
      },
      aspects: [                                              // Should be DROPPED
        { p1_name: 'Sun', p2_name: 'Moon', aspect: 'sextile' },
      ],
    },
    provenance: {
      math_brain_version: '3.2.7',
      ephemeris_source: 'AstroAPI-v3',
      house_system: 'Placidus',
      orbs_profile: 'default_v5',
      timezone: 'America/Chicago',
      relocation_applied: true,
      relocation_mode: 'both_local',
      persona_excerpt: 'This is a MASSIVE text dump of Raven persona...'.repeat(100), // Should be DROPPED
      persona_excerpt_source: { source: 'corpus', file: 'test.txt' },                 // Should be DROPPED
      identity: { person_a: { source: 'test' } },                                      // Should be DROPPED
    },
    daily_readings: [
      {
        date: '2025-11-29',
        magnitude: 3.2,
        directional_bias: -4.6,
        volatility: 4.77,
        coherence: 0.23,
        raw_magnitude: 3.23,                  // Should be DROPPED
        raw_bias_signed: -4.56,               // Should be DROPPED
        aspects: [{ p1: 'Sun', p2: 'Moon' }], // Should be DROPPED
        aspect_count: 1,                      // Should be DROPPED
        overflow_detail: {},                  // Should be DROPPED
      },
    ],
  };

  it('preserves essential metadata', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    
    expect(trimmed._format).toBe('mirror-symbolic-weather-v1');
    expect(trimmed._version).toBe('1.0');
    expect(trimmed._contains_transits).toBe(true);
    expect(trimmed._range_dates).toEqual(['2025-11-29', '2025-12-01']);
    expect(trimmed._transit_days).toBe(3);
    expect(trimmed.generated_at).toBe('2025-11-29T06:06:38.207Z');
  });

  it('removes _poetic_brain_compatible and _template_hint', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    
    expect(trimmed._poetic_brain_compatible).toBeUndefined();
    expect(trimmed._template_hint).toBeUndefined();
  });

  it('keeps birth_data and essential chart info', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    
    expect(trimmed.person_a.name).toBe('Dan');
    expect(trimmed.person_a.birth_data).toBeDefined();
    expect(trimmed.person_a.birth_data.year).toBe(1973);
    expect(trimmed.person_a.chart.lng).toBe(-75.3);
    expect(trimmed.person_a.chart.lat).toBe(40.0167);
    expect(trimmed.person_a.chart.house_cusps).toHaveLength(12);
  });

  it('removes duplicate date fields from chart', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    
    expect(trimmed.person_a.chart.name).toBeUndefined();
    expect(trimmed.person_a.chart.year).toBeUndefined();
    expect(trimmed.person_a.chart.month).toBeUndefined();
    expect(trimmed.person_a.chart.day).toBeUndefined();
  });

  it('trims planet objects to essential fields', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    const sun = trimmed.person_a.chart.positions.sun;
    
    expect(sun.abs_pos).toBe(121.69);
    expect(sun.house).toBe('Ninth_House');
    expect(sun.retrograde).toBe(false);
    expect(sun.sign).toBe('Leo');
    
    // Dropped fields
    expect(sun.name).toBeUndefined();
    expect(sun.quality).toBeUndefined();
    expect(sun.element).toBeUndefined();
    expect(sun.emoji).toBeUndefined();
    expect(sun.point_type).toBeUndefined();
    expect(sun.position).toBeUndefined();
  });

  it('removes planets_names_list', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    
    expect(trimmed.person_a.chart.planets_names_list).toBeUndefined();
  });

  it('trims seismograph to final values only', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    const seismo = trimmed.person_a.chart.transitsByDate['2025-11-29'].seismograph;
    
    expect(seismo.magnitude).toBe(3.2);
    expect(seismo.directional_bias).toBe(-4.6);
    expect(seismo.volatility).toBe(4.77);
    expect(seismo.magnitude_label).toBe('Surge');
    expect(seismo.directional_bias_label).toBe('Maximum Inward');
    
    // Dropped meta/raw fields
    expect(seismo.magnitude_meta).toBeUndefined();
    expect(seismo.magnitude_range).toBeUndefined();
    expect(seismo.magnitude_method).toBeUndefined();
    expect(seismo.rawMagnitude).toBeUndefined();
    expect(seismo.rawDirectionalBias).toBeUndefined();
  });

  it('removes aspects/hooks/drivers from transit days', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    const day = trimmed.person_a.chart.transitsByDate['2025-11-29'];
    
    expect(day.aspects).toBeUndefined();
    expect(day.hooks).toBeUndefined();
    expect(day.drivers).toBeUndefined();
  });

  it('removes persona_excerpt from provenance (CRITICAL)', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    
    expect(trimmed.provenance.persona_excerpt).toBeUndefined();
    expect(trimmed.provenance.persona_excerpt_source).toBeUndefined();
    expect(trimmed.provenance.identity).toBeUndefined();
    
    // Keeps essential provenance
    expect(trimmed.provenance.math_brain_version).toBe('3.2.7');
    expect(trimmed.provenance.house_system).toBe('Placidus');
    expect(trimmed.provenance.relocation_applied).toBe(true);
  });

  it('trims daily_readings to final meter values', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    const reading = trimmed.daily_readings[0];
    
    expect(reading.date).toBe('2025-11-29');
    expect(reading.magnitude).toBe(3.2);
    expect(reading.directional_bias).toBe(-4.6);
    
    // Dropped fields
    expect(reading.raw_magnitude).toBeUndefined();
    expect(reading.raw_bias_signed).toBeUndefined();
    expect(reading.aspects).toBeUndefined();
    expect(reading.aspect_count).toBeUndefined();
    expect(reading.overflow_detail).toBeUndefined();
  });

  it('preserves natal aspects array for Poetic Brain mandate generation', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    
    // Aspects are KEPT per spec: buildMandatesForChart needs them
    expect(trimmed.person_a.aspects).toBeDefined();
    expect(Array.isArray(trimmed.person_a.aspects)).toBe(true);
  });

  it('significantly reduces payload size', () => {
    const trimmed = trimPayloadForPoeticBrain(samplePayload);
    const stats = estimatePayloadReduction(samplePayload, trimmed);
    
    // Expect at least 50% reduction due to persona_excerpt alone
    expect(parseInt(stats.reductionPercent)).toBeGreaterThan(50);
    
    // Verify stats are calculated correctly
    expect(stats.originalSize).toBeGreaterThan(stats.trimmedSize);
    expect(stats.reduction).toBeGreaterThan(0);
  });

  it('handles null/undefined inputs gracefully', () => {
    expect(trimPayloadForPoeticBrain(null)).toBeNull();
    expect(trimPayloadForPoeticBrain(undefined)).toBeUndefined();
    expect(trimPayloadForPoeticBrain({})).toEqual({});
  });

  it('handles API v3 format with chart.positions dictionary', () => {
    // New format from API v3: positions in a nested dictionary with PascalCase keys
    const apiV3Payload = {
      _format: 'mirror-symbolic-weather-v1',
      _version: '1.0',
      generated_at: '2025-12-03T07:00:00.000Z',
      person_a: {
        name: 'Test',
        birth_data: { year: 1980, month: 6, day: 15 },
        chart: {
          positions: {
            Sun: { sign: 'Gem', deg: 24.66, abs_pos: 84.66, house: 10, retro: false },
            Moon: { sign: 'Can', deg: 29.53, abs_pos: 119.53, house: 11, retro: false },
            Mercury: { sign: 'Can', deg: 19.09, abs_pos: 109.09, house: 11, retro: false },
          },
          angle_signs: { ascendant: 'Leo', mc: 'Tau' },
          cusps: [147.93, 170.43, 198.2, 231.36, 266.83, 299.63, 327.93, 350.43, 18.2, 51.36, 86.83, 119.63],
          transitsByDate: {},
        },
      },
      provenance: {
        math_brain_version: '3.3.0',
      },
    };

    const trimmed = trimPayloadForPoeticBrain(apiV3Payload);

    // Should preserve positions from the dictionary
    expect(trimmed.person_a.chart.positions).toBeDefined();
    expect(Object.keys(trimmed.person_a.chart.positions).length).toBe(3);
    expect(trimmed.person_a.chart.positions.Sun).toBeDefined();
    expect(trimmed.person_a.chart.positions.Sun.abs_pos).toBe(84.66);
    expect(trimmed.person_a.chart.positions.Sun.sign).toBe('Gem');
    expect(trimmed.person_a.chart.positions.Sun.retrograde).toBe(false); // Normalized from 'retro'
    
    // Should preserve angle_signs
    expect(trimmed.person_a.chart.angle_signs).toEqual({ ascendant: 'Leo', mc: 'Tau' });
    
    // Should preserve cusps
    expect(trimmed.person_a.chart.cusps).toHaveLength(12);
  });
});
