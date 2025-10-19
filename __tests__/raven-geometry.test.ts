import { parseAstroSeekBlob } from '@/lib/raven/parser';
import { normalizeGeometry } from '@/lib/raven/normalize';
import { renderShareableMirror } from '@/lib/raven/render';

const SAMPLE_ASTROSEEK = `
Planets at birth
Sun 12° Aries 34' (House 1)
Moon 18° Taurus 10' (House 10)
Mercury 5° Aries 02' (House 1)
Venus 22° Pisces 18' (House 12)
Mars 28° Gemini 40' (House 3) R
Jupiter 3° Capricorn 55' (House 10)
Saturn 16° Aquarius 11' (House 11)
Uranus 10° Capricorn 22' (House 10)
Neptune 15° Capricorn 33' (House 10)
Pluto 20° Scorpio 12' (House 7)
Ascendant 4° Leo 20'
Midheaven 18° Taurus 47'

Aspects
Sun Square Moon 6°44'
Moon Trine Venus 3°52'
Mars Opposition Jupiter 5°15'
`;

describe('AstroSeek geometry pipeline', () => {
  test('parser extracts placements and aspects', () => {
    const parsed = parseAstroSeekBlob(SAMPLE_ASTROSEEK);
    expect(parsed.placements.length).toBeGreaterThan(8);
    const sun = parsed.placements.find((p) => p.body === 'Sun');
    const moon = parsed.placements.find((p) => p.body === 'Moon');
    expect(sun?.sign).toBe('Aries');
    expect(moon?.sign).toBe('Taurus');
    const sunMoonSquare = parsed.aspects.find(
      (a) =>
        a.type === 'Square' &&
        ((a.from === 'Sun' && a.to === 'Moon') || (a.from === 'Moon' && a.to === 'Sun')),
    );
    expect(sunMoonSquare).toBeDefined();
  });

  test('renderShareableMirror reflects parsed geometry', async () => {
    const parsed = parseAstroSeekBlob(SAMPLE_ASTROSEEK);
    const geo = normalizeGeometry(parsed);
    const draft = await renderShareableMirror({ geo, prov: { source: 'AstroSeek (test)' }, options: {} });

    // All conversational content is now in the 'picture' field.
    expect(draft.picture).toMatch(/Sun Aries/i);
    expect(draft.picture).toMatch(/Moon Taurus/i);
    expect(draft.picture).toMatch(/dense, deliberate weight/i);
    expect(draft.picture).toMatch(/tangible task/i);
    expect(draft.picture).toMatch(/Log one lived moment/i);

    // Other fields should be empty.
    expect(draft.feeling).toBe('');
    expect(draft.option).toBe('');
    expect(draft.next_step).toBe('');

    expect(draft.appendix.geometry_summary).toContain('Placements parsed');
    expect(draft.appendix.primary_aspect).toMatch(/Sun Square Moon/i);
    expect(draft.appendix.luminary_axis).toMatch(/Sun Aries/i);
    expect(draft.appendix.provenance_source).toBe('AstroSeek (test)');
  });
});

