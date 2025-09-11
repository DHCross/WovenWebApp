import { generateSection } from '../src/index';

describe('generateSection', () => {
  it('returns a narrative for MirrorVoice', () => {
    const payload = { /* sample structured payload */ };
    const result = generateSection('MirrorVoice', payload);
    expect(typeof result).toBe('string');
  });
});
