import { describe, it, expect } from 'vitest';
import { createMirrorSymbolicWeatherPayload } from '../lib/export/mirrorSymbolicWeather';

describe('mirrorSymbolicWeather provenance', () => {
  it('includes persona_excerpt from unified output provenance', () => {
    const fakeResult = {
      unified_output: {
        person_a: { chart: { sun: {} } },
        provenance: {
          math_brain_version: '3.2.7',
          persona_excerpt: 'This is a test persona excerpt from corpus.',
          persona_excerpt_source: { source: 'RavenCalder_Corpus', file: 'ravencalder-persona-excerpt.txt' },
        },
      },
    } as any;

    const r = createMirrorSymbolicWeatherPayload(fakeResult, 'solo' as any);
    expect(r).not.toBeNull();
    expect(r?.payload?.provenance).toBeDefined();
    expect(r?.payload?.provenance.persona_excerpt).toBe('This is a test persona excerpt from corpus.');
    expect(r?.payload?.provenance.persona_excerpt_source).toEqual({ source: 'RavenCalder_Corpus', file: 'ravencalder-persona-excerpt.txt' });
  });
});
