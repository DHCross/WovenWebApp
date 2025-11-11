import { invokePoeticBrain } from '../lib/poetic-brain-adapter';

describe('invokePoeticBrain', () => {
  it('enriches payload with natal placements and transit hooks', () => {
    const result = invokePoeticBrain({
      sectionType: 'MirrorVoice',
      payload: {
        person_a: {
          name: 'Alex',
          natal_chart: {
            sun: { sign: 'Leo', degree: 22.5 },
            moon: { sign: 'Cancer', degree: 10.2 },
            ascendant: { sign: 'Sagittarius', degree: 8.3 }
          }
        },
        symbolic_weather_context: {
          daily_readings: [
            {
              date: '2025-10-12',
              magnitude: 3.2,
              directional_bias: -1.3,
              aspects: [
                {
                  planet_1: 'Mars',
                  planet_2: 'Pluto',
                  symbol: 'square',
                  orb: 0.8,
                  potency: 8
                }
              ]
            }
          ]
        },
        balance_meter: {
          magnitude: 3.2,
          directional_bias: -1.3
        }
      }
    });

    expect(result.text).toContain('Sun Leo 22.5°');
    expect(result.text).toContain('Moon Cancer 10.2°');
    expect(result.text).toContain('Rising Sagittarius 8.3°');
    expect(result.text).toContain('Mars square Pluto (0.8°)');
    expect(result.text).toMatch(/Symbolic weather/);
  });
});
