import { describe, expect, it } from 'vitest';
import { shapeVoice, resolvePersonaMode } from '@/lib/persona';

describe('persona shaping', () => {
  it('defaults to hybrid when persona input is missing or malformed', () => {
    expect(resolvePersonaMode(undefined)).toBe('hybrid');
    expect(resolvePersonaMode({ mode: 'unknown' })).toBe('hybrid');
    expect(resolvePersonaMode('poetic')).toBe('poetic');
  });

  it('enforces plain mode constraints (no emoji, strictly conditional)', () => {
    const result = shapeVoice('Pressure is rising 🌊', { section: 'mirror' }, { mode: 'plain' });
    expect(result).not.toContain('🌊');
    expect(result).toMatch(/may/);
    expect(result).toContain('(If no resonance: mark OSR—null data is valid.)');
  });

  it('allows light imagery and limited emoji in hybrid mode', () => {
    const hybrid = shapeVoice('Pressure is rising 🌊🌊', { section: 'mirror' }, { mode: 'hybrid' });
    const emojiCount = (hybrid.match(/\p{Extended_Pictographic}/gu) || []).length;
    expect(emojiCount).toBeLessThanOrEqual(1);
    expect(hybrid).toMatch(/pressure—like wind leaning against the windows/i);
    expect(hybrid).toContain('(If no resonance: mark OSR—null data is valid.)');
  });

  it('applies richer imagery in poetic mode', () => {
    const poetic = shapeVoice('Tension is building 🌙✨', { section: 'mirror' }, { mode: 'poetic' });
    expect(poetic).toMatch(/tension singing like silver wire in night air/i);
    expect(poetic).toMatch(/🌙/);
    expect(poetic).toContain('(If no resonance: mark OSR—null data is valid.)');
  });
});
