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
    expect(result).toContain('Baseline steady-state: hold your center.');
    expect(result).not.toMatch(/Climate:/);
    expect(result).not.toMatch(/symbolic weather/i);
  });
});
