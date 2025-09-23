import { generateSection } from '../src/index';

describe('generateSection', () => {
  it('returns a narrative for MirrorVoice', () => {
    const payload = { /* sample structured payload */ };
    const result = generateSection('MirrorVoice', payload);
    expect(typeof result).toBe('string');
  });

  it('falls back to baseline reflection when no activation data is provided', () => {
    const payload = {
      constitutionalClimate: 'Baseline steady-state: hold your center.',
    };
    const result = generateSection('MirrorVoice', payload);
    expect(result).toContain('Blueprint — Baseline steady-state: hold your center.');
    expect(result).toContain('Current Mode — No activation data supplied; holding to the natal baseline.');
    expect(result).toContain('Reflection — Map, not mandate: integrate what resonates and release the rest.');
    expect(result).not.toMatch(/Climate:/);
    expect(result).not.toMatch(/symbolic weather/i);
  });

  it('includes symbolic weather language when activation data is present', () => {
    const payload = {
      constitutionalClimate: 'Core tone: steady fire with soft edges.',
      climateLine: 'Weather front: charged conversations ready to crack open.',
      transits: [{}],
      seismograph: {
        magnitude: 2.3,
        valence: 0.4,
        volatility: 0.6,
      },
      hooks: ['Venus square Mars'],
    };
    const result = generateSection('MirrorVoice', payload);
    expect(result).toContain('Blueprint — Core tone: steady fire with soft edges.');
    expect(result).toContain('Weather — Weather front: charged conversations ready to crack open.');
    expect(result).toMatch(/Tensions —/);
    expect(result).toMatch(/symbolic weather/i);
  });
});
