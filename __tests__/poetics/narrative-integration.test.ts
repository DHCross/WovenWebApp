/**
 * Integration tests for Phase 1, Task 1.2
 * Validates end-to-end flow: mandate extraction → narrative generation
 */

import { describe, it, expect } from 'vitest';

import { buildMandatesForChart } from '../../lib/poetics/mandate';
import { generateSoloMirrorNarrative } from '../../lib/poetics/narrative-builder';
import type { ChartMandates } from '../../lib/poetics/types';

describe('Mandate to Narrative Integration', () => {
  // Realistic chart data with multiple aspects
  const sampleChart = {
    aspects: [
      {
        planet_a: 'Sun',
        planet_b: 'Moon',
        type: 'conjunction',
        orb: 0.8,
        applying: true,
      },
      {
        planet_a: 'Venus',
        planet_b: 'Mars',
        type: 'opposition',
        orb: 1.5,
        applying: true,
      },
      {
        planet_a: 'Mercury',
        planet_b: 'Neptune',
        type: 'square',
        orb: 2.1,
        applying: true,
      },
      {
        planet_a: 'Saturn',
        planet_b: 'Pluto',
        type: 'trine',
        orb: 3.2,
        applying: false,
      },
      {
        planet_a: 'Sun',
        planet_b: 'Saturn',
        type: 'square',
        orb: 2.5,
        applying: true,
      },
    ],
    index: {
      Sun: 0,
      Moon: 1,
      Mercury: 2,
      Venus: 3,
      Mars: 4,
      Jupiter: 5,
      Saturn: 6,
      Uranus: 7,
      Neptune: 8,
      Pluto: 9,
    },
  };

  describe('End-to-End Flow', () => {
    it('extracts mandates and generates complete narrative', () => {
      // Step 1: Extract mandates from chart
      const mandates = buildMandatesForChart('Alice', sampleChart, { limit: 5 });
      
      expect(mandates.personName).toBe('Alice');
      expect(mandates.mandates.length).toBeGreaterThan(0);
      expect(mandates.mandates.length).toBeLessThanOrEqual(5);
      
      // Step 2: Generate narrative from mandates
      const narrative = generateSoloMirrorNarrative(mandates);
      
      expect(narrative).toBeDefined();
      expect(narrative.fullNarrative).toBeTruthy();
      expect(narrative.hookStack).toBeDefined();
      expect(narrative.polarityCards.length).toBeGreaterThan(0);
      expect(narrative.mandateHighlights).toBeTruthy();
      expect(narrative.mirrorVoice).toBeTruthy();
    });

    it('narrative contains FIELD → MAP → VOICE elements', () => {
      const mandates = buildMandatesForChart('Bob', sampleChart, { limit: 3 });
      const narrative = generateSoloMirrorNarrative(mandates);
      
      // Check for FIELD components
      expect(narrative.mandateHighlights).toContain('Field');
      
      // Check for MAP components
      expect(narrative.mandateHighlights).toContain('Map');
      
      // Check for VOICE components
      expect(narrative.mandateHighlights).toContain('Voice');
    });

    it('narrative reflects diagnostic classifications', () => {
      const mandates = buildMandatesForChart('Carol', sampleChart);
      const narrative = generateSoloMirrorNarrative(mandates);
      
      // Should have diagnostic labels in mandate highlights
      expect(narrative.mandateHighlights).toContain('Diagnostic');
      
      // Full narrative should mention at least one diagnostic concept
      const hasDiagnosticContent = 
        narrative.fullNarrative.includes('tension') ||
        narrative.fullNarrative.includes('pressure') ||
        narrative.fullNarrative.includes('paradox') ||
        narrative.fullNarrative.includes('hook') ||
        narrative.fullNarrative.includes('compression');
      
      expect(hasDiagnosticContent).toBe(true);
    });

    it('prioritizes tightest aspects in narrative', () => {
      const mandates = buildMandatesForChart('Dave', sampleChart, { limit: 3 });
      const narrative = generateSoloMirrorNarrative(mandates);
      
      // First mandate should have smallest orb (highest weight)
      const firstMandate = mandates.mandates[0];
      expect(firstMandate.geometry.orbDegrees).toBeLessThan(1.0);
      
      // Narrative should mention the tightest aspect (Sun-Moon conjunction)
      const mentionsSunMoon = 
        narrative.fullNarrative.toLowerCase().includes('sun') &&
        narrative.fullNarrative.toLowerCase().includes('moon');
      
      expect(mentionsSunMoon).toBe(true);
    });

    it('maintains geometry-first, non-deterministic language', () => {
      const mandates = buildMandatesForChart('Eve', sampleChart);
      const narrative = generateSoloMirrorNarrative(mandates);
      
      // Should NOT contain deterministic phrases
      const deterministicPhrases = [
        'you will',
        'you must',
        'you are destined',
        'this means that',
        'this proves',
      ];
      
      for (const phrase of deterministicPhrases) {
        expect(narrative.fullNarrative.toLowerCase()).not.toContain(phrase);
      }
      
      // SHOULD contain pattern-recognition language
      const patternLanguage = [
        'often',
        'tends to',
        'shows up as',
        'tension',
        'pattern',
      ];
      
      let hasPatternLanguage = false;
      for (const phrase of patternLanguage) {
        if (narrative.fullNarrative.toLowerCase().includes(phrase)) {
          hasPatternLanguage = true;
          break;
        }
      }
      
      expect(hasPatternLanguage).toBe(true);
    });
  });

  describe('Polarity Card Generation', () => {
    it('generates polarity cards with both-and framing', () => {
      const mandates = buildMandatesForChart('Frank', sampleChart);
      const narrative = generateSoloMirrorNarrative(mandates);
      
      expect(narrative.polarityCards.length).toBeGreaterThan(0);
      
      for (const card of narrative.polarityCards) {
        expect(card.activeSide).toBeTruthy();
        expect(card.reflectiveSide).toBeTruthy();
        expect(card.bothSides).toBeTruthy();
        
        // Both-sides should provide synthesis or integration language
        // Every bothSides text should be substantial (not just empty or short)
        expect(card.bothSides.length).toBeGreaterThan(20);
      }
    });

    it('polarity cards reference source archetypes', () => {
      const mandates = buildMandatesForChart('Grace', sampleChart);
      const narrative = generateSoloMirrorNarrative(mandates);
      
      for (const card of narrative.polarityCards) {
        // Card name should contain archetype names
        expect(card.name).toContain('vs.');
        
        // Should reference at least one planet
        const mentionsPlanet = 
          card.activeSide.toLowerCase().match(/sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto/);
        
        expect(mentionsPlanet).toBeTruthy();
      }
    });
  });

  describe('Mirror Voice Synthesis', () => {
    it('creates cohesive synthesis from multiple cards', () => {
      const mandates = buildMandatesForChart('Helen', sampleChart);
      const narrative = generateSoloMirrorNarrative(mandates);
      
      // Mirror voice should be substantial
      expect(narrative.mirrorVoice.length).toBeGreaterThan(200);
      
      // Should include empowering framing
      const hasEmpoweringFrame = 
        narrative.mirrorVoice.toLowerCase().includes('power') ||
        narrative.mirrorVoice.toLowerCase().includes('fluid') ||
        narrative.mirrorVoice.toLowerCase().includes('skill');
      
      expect(hasEmpoweringFrame).toBe(true);
    });

    it('maintains consistent person reference', () => {
      const mandates = buildMandatesForChart('Ian', sampleChart);
      const narrative = generateSoloMirrorNarrative(mandates);
      
      // Should use second person (you/your)
      const usesSecondPerson = 
        narrative.mirrorVoice.toLowerCase().includes('you') ||
        narrative.mirrorVoice.toLowerCase().includes('your');
      
      expect(usesSecondPerson).toBe(true);
    });
  });

  describe('Empty and Edge Cases', () => {
    it('handles chart with no aspects gracefully', () => {
      const emptyChart = { aspects: [] };
      const mandates = buildMandatesForChart('Nobody', emptyChart);
      const narrative = generateSoloMirrorNarrative(mandates);
      
      expect(narrative.mandateHighlights).toContain('No high-charge aspects');
      expect(narrative.fullNarrative).toBeTruthy();
    });

    it('handles chart with single aspect', () => {
      const singleAspectChart = {
        aspects: [
          {
            planet_a: 'Sun',
            planet_b: 'Moon',
            type: 'conjunction',
            orb: 1.0,
            applying: true,
          },
        ],
      };
      
      const mandates = buildMandatesForChart('Solo', singleAspectChart);
      const narrative = generateSoloMirrorNarrative(mandates);
      
      expect(mandates.mandates.length).toBe(1);
      expect(narrative.polarityCards.length).toBe(1);
      expect(narrative.fullNarrative).toBeTruthy();
    });
  });
});
