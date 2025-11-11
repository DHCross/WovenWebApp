import { describe, it, expect } from 'vitest';

import {
  generateHookStack,
  generatePolarityCards,
  formatMandateHighlights,
  synthesizeMirrorVoice,
  generateSoloMirrorNarrative,
  type PolarityCard,
} from '../../lib/poetics/narrative-builder';
import type { MandateAspect, ChartMandates } from '../../lib/poetics/types';

describe('Narrative Builder', () => {
  // Helper to create a test mandate
  const createMandate = (overrides: Partial<MandateAspect> = {}): MandateAspect => ({
    id: 'test_mandate',
    geometry: {
      aspectType: 'conjunction',
      orbDegrees: 1.5,
      applying: true,
      weight: 0.67,
    },
    archetypes: {
      a: { planet: 'Sun', name: 'Core Identity', essence: 'how you shine and express selfhood' },
      b: { planet: 'Moon', name: 'Emotional Nature', essence: 'how you feel and respond' },
    },
    diagnostic: 'Current',
    fieldPressure: 'Energy merges and intensifies. This is present-time energy.',
    mapTranslation: 'Your core identity and emotional nature are fused; you feel like yourself when you shine.',
    voiceHook: 'This often shows up as: Your core identity and emotional nature are fused.',
    provenance: {
      source: 'MAP',
    },
    ...overrides,
  });

  describe('generateHookStack', () => {
    it('generates default hook stack when no mandates provided', () => {
      const result = generateHookStack([]);

      expect(result.polarity1.title).toBe('The Seeker');
      expect(result.polarity2.title).toBe('The Builder');
    });

    it('generates hook stack from top mandate', () => {
      const mandate = createMandate();
      const result = generateHookStack([mandate]);

      expect(result.polarity1.title).toBe('Core Identity');
      expect(result.polarity1.description).toBe('how you shine and express selfhood');
      expect(result.polarity2.title).toBe('Emotional Nature');
      expect(result.polarity2.description).toBe('how you feel and respond');
    });
  });

  describe('generatePolarityCards', () => {
    it('generates cards from mandates', () => {
      const mandates = [
        createMandate({
          geometry: { aspectType: 'conjunction', orbDegrees: 1.0, applying: true, weight: 1.0 },
        }),
        createMandate({
          geometry: { aspectType: 'opposition', orbDegrees: 2.0, applying: true, weight: 0.5 },
          archetypes: {
            a: { planet: 'Mars', name: 'Will & Action', essence: 'how you move and assert' },
            b: { planet: 'Saturn', name: 'Structure & Integrity', essence: 'how you build and contain' },
          },
        }),
      ];

      const cards = generatePolarityCards(mandates);

      expect(cards).toHaveLength(2);
      expect(cards[0].name).toBe('Core Identity vs. Emotional Nature');
      expect(cards[0].activeSide).toContain('sun');
      expect(cards[0].activeSide).toContain('moon');
      expect(cards[0].bothSides).toContain('unified force');

      expect(cards[1].name).toBe('Will & Action vs. Structure & Integrity');
      expect(cards[1].activeSide).toContain('mars');
      expect(cards[1].reflectiveSide).toContain('saturn');
      expect(cards[1].bothSides).toContain('dynamic tension');
    });

    it('includes diagnostic context in polarity cards', () => {
      const mandates = [
        createMandate({
          diagnostic: 'Paradox Lock',
          geometry: { aspectType: 'square', orbDegrees: 0.5, applying: true, weight: 2.0 },
        }),
        createMandate({
          diagnostic: 'Hook',
          geometry: { aspectType: 'trine', orbDegrees: 2.5, applying: false, weight: 0.4 },
        }),
        createMandate({
          diagnostic: 'Compression',
          geometry: { aspectType: 'sextile', orbDegrees: 1.8, applying: true, weight: 0.55 },
        }),
      ];

      const cards = generatePolarityCards(mandates);

      expect(cards[0].bothSides).toContain('paradox lock');
      expect(cards[1].bothSides).toContain('hook point');
      expect(cards[2].bothSides).toContain('high-density zone');
    });

    it('limits cards to maximum of 4', () => {
      const mandates = Array(10).fill(null).map((_, i) =>
        createMandate({ id: `mandate_${i}` })
      );

      const cards = generatePolarityCards(mandates);

      expect(cards).toHaveLength(4);
    });
  });

  describe('formatMandateHighlights', () => {
    it('returns fallback message when no mandates', () => {
      const result = formatMandateHighlights([], 'Test Person');

      expect(result).toContain('No high-charge aspects');
      expect(result).toContain('Test Person');
    });

    it('formats mandates with FIELD → MAP → VOICE structure', () => {
      const mandates = [createMandate()];
      const result = formatMandateHighlights(mandates, 'Test Person');

      expect(result).toContain('Mandate Highlights');
      expect(result).toContain('Core Identity ↔ Emotional Nature');
      expect(result).toContain('conjunction');
      expect(result).toContain('1.5° orb');
      expect(result).toContain('**Diagnostic**');
      expect(result).toContain('**Field**');
      expect(result).toContain('**Map**');
      expect(result).toContain('**Voice**');
    });

    it('numbers mandates sequentially', () => {
      const mandates = [
        createMandate({ id: 'first' }),
        createMandate({ id: 'second' }),
        createMandate({ id: 'third' }),
      ];

      const result = formatMandateHighlights(mandates, 'Test Person');

      expect(result).toContain('### 1.');
      expect(result).toContain('### 2.');
      expect(result).toContain('### 3.');
    });
  });

  describe('synthesizeMirrorVoice', () => {
    it('creates cohesive narrative from polarity cards', () => {
      const mandates = [createMandate()];
      const cards = generatePolarityCards(mandates);
      const result = synthesizeMirrorVoice('Test Person', cards, mandates);

      expect(result).toContain('system of tensions');
      expect(result).toContain('power lives');
      expect(result).toContain('not a flaw in your chart');
      expect(result).toContain('the whole point');
    });

    it('includes diagnostic-specific guidance for Paradox Lock', () => {
      const mandates = [createMandate({ diagnostic: 'Paradox Lock' })];
      const cards = generatePolarityCards(mandates);
      const result = synthesizeMirrorVoice('Test Person', cards, mandates);

      expect(result).toContain('paradox locks');
      expect(result).toContain('can\'t be resolved');
      expect(result).toContain('inhabit them');
    });

    it('includes guidance for Hooks', () => {
      const mandates = [createMandate({ diagnostic: 'Hook' })];
      const cards = generatePolarityCards(mandates);
      const result = synthesizeMirrorVoice('Test Person', cards, mandates);

      expect(result).toContain('hook points');
      expect(result).toContain('energy catches');
      expect(result).toContain('recognition moments');
    });

    it('includes guidance for Compression', () => {
      const mandates = [createMandate({ diagnostic: 'Compression' })];
      const cards = generatePolarityCards(mandates);
      const result = synthesizeMirrorVoice('Test Person', cards, mandates);

      expect(result).toContain('Multiple pressures converge');
      expect(result).toContain('compression fields');
      expect(result).toContain('high-density learning grounds');
    });
  });

  describe('generateSoloMirrorNarrative', () => {
    const chartMandates: ChartMandates = {
      personName: 'Test Subject',
      mandates: [
        createMandate({
          geometry: { aspectType: 'conjunction', orbDegrees: 0.8, applying: true, weight: 1.25 },
        }),
        createMandate({
          id: 'second',
          geometry: { aspectType: 'opposition', orbDegrees: 1.5, applying: true, weight: 0.67 },
          archetypes: {
            a: { planet: 'Venus', name: 'Values & Connection', essence: 'what you love' },
            b: { planet: 'Mars', name: 'Will & Action', essence: 'how you move' },
          },
        }),
      ],
    };

    it('generates complete narrative with all sections', () => {
      const result = generateSoloMirrorNarrative(chartMandates);

      expect(result.fullNarrative).toContain('Solo Mirror: Test Subject');
      expect(result.fullNarrative).toContain('Core Identity / Emotional Nature');
      expect(result.fullNarrative).toContain('The Defining Tensions');
      expect(result.fullNarrative).toContain('Mandate Highlights');
      expect(result.fullNarrative).toContain('Your Mirror');
    });

    it('allows selective section inclusion', () => {
      const result = generateSoloMirrorNarrative(chartMandates, {
        includeHookStack: false,
        includePolarityCards: true,
        includeMandateHighlights: false,
        includeMirrorVoice: true,
      });

      expect(result.fullNarrative).not.toContain('Core Identity / Emotional Nature');
      expect(result.fullNarrative).toContain('The Defining Tensions');
      expect(result.fullNarrative).not.toContain('Mandate Highlights');
      expect(result.fullNarrative).toContain('Your Mirror');
    });

    it('maintains FIELD → MAP → VOICE protocol', () => {
      const result = generateSoloMirrorNarrative(chartMandates);

      // Check that FIELD (geometry), MAP (translation), and VOICE (hook) are present
      expect(result.mandateHighlights).toContain('Field');
      expect(result.mandateHighlights).toContain('Map');
      expect(result.mandateHighlights).toContain('Voice');
    });

    it('generates structured output matching interface', () => {
      const result = generateSoloMirrorNarrative(chartMandates);

      expect(result).toHaveProperty('hookStack');
      expect(result).toHaveProperty('polarityCards');
      expect(result).toHaveProperty('mandateHighlights');
      expect(result).toHaveProperty('mirrorVoice');
      expect(result).toHaveProperty('fullNarrative');

      expect(result.hookStack.polarity1).toHaveProperty('title');
      expect(result.hookStack.polarity1).toHaveProperty('description');
      expect(result.polarityCards).toBeInstanceOf(Array);
      expect(typeof result.mandateHighlights).toBe('string');
      expect(typeof result.mirrorVoice).toBe('string');
      expect(typeof result.fullNarrative).toBe('string');
    });
  });
});
