import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Poetic Brain — Raven Voice Compliance', () => {
  let testData: any;

  test.beforeAll(() => {
    const testDataPath = path.join(process.cwd(), 'test-data', 'mirror-symbolic-weather-sample.json');
    testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
  });

  test('should return E-Prime compliant voice', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    // Get the markdown if available
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    if (markdown) {
      // E-Prime violations check (user-facing text should not have static "to be" forms)
      const ePrimeViolations = [
        /\byou are\b/i,
        /\byou're\b/i,
        /\bit is\b/i,
        /\bthis is\b/i,
        /\bthat is\b/i
      ];
      
      for (const pattern of ePrimeViolations) {
        expect(markdown).not.toMatch(pattern);
      }
    }
    
    // Check five-key contract
    expect(responseData.draft).toHaveProperty('picture');
    expect(responseData.draft).toHaveProperty('feeling');
    expect(responseData.draft).toHaveProperty('container');
    expect(responseData.draft).toHaveProperty('option');
    expect(responseData.draft).toHaveProperty('next_step');
  });

  test('should include Polarity Cards with FIELD and VOICE', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    if (markdown) {
      // Should have Polarity Cards section
      expect(markdown).toMatch(/##\s*Polarity\s*Cards/i);
      
      // Should have FIELD sections
      expect(markdown).toMatch(/\*\*FIELD:\*\*/);
      
      // Should have VOICE sections
      expect(markdown).toMatch(/\*\*VOICE:\*\*/);
      
      // Should NOT have MAP in user-facing output
      expect(markdown).not.toMatch(/\*\*MAP:\*\*/);
      
      // Should have conditional language (may/might/could)
      expect(markdown).toMatch(/\b(may|might|could)\b/);
      
      // Should have somatic language
      expect(markdown).toMatch(/\b(friction|ease|tension|pull|pressure|flow)\b/i);
    }
  });

  test('should use Safe Lexicon descriptors', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    if (markdown && markdown.includes('Symbolic Climate')) {
      // Should use Safe Lexicon magnitude terms
      const magnitudeTerms = /(Whisper|Pulse|Wave|Surge|Peak|Apex)/;
      expect(markdown).toMatch(magnitudeTerms);
      
      // Should use directional symbols
      expect(markdown).toMatch(/[🌞🌑🌗]/);
    }
  });

  test('should enforce terminology: "symbolic_climate" not "climate"', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    // Check response structure uses correct terminology
    if (responseData.draft?.appendix?.relational) {
      const relational = responseData.draft.appendix.relational;
      
      // Should have "symbolic_climate" keys
      if (relational.shared_symbolic_climate) {
        expect(relational.shared_symbolic_climate).toHaveProperty('magnitude');
        expect(relational.shared_symbolic_climate).toHaveProperty('valence');
        expect(relational.shared_symbolic_climate).toHaveProperty('volatility');
      }
      
      if (relational.cross_symbolic_climate) {
        expect(relational.cross_symbolic_climate).toHaveProperty('magnitude');
        expect(relational.cross_symbolic_climate).toHaveProperty('valence');
        expect(relational.cross_symbolic_climate).toHaveProperty('volatility');
      }
    }
  });

  test('should include Agency Hygiene clause', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    if (markdown) {
      // Should include Agency Hygiene section
      expect(markdown).toMatch(/##\s*Agency\s*Hygiene/i);
      
      // Should mention OSR validity
      expect(markdown).toMatch(/OSR\s*valid/i);
      
      // Should mention conditional phrasing
      expect(markdown).toMatch(/\b(may|might|could)\b/);
    }
  });

  test('should reject deterministic language', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    if (markdown) {
      // Should NOT contain deterministic phrases
      const forbiddenPatterns = [
        /\bdestined\b/i,
        /\bmeant to\b/i,
        /\bfated\b/i,
        /\balways will\b/i,
        /\bnever will\b/i
      ];
      
      for (const pattern of forbiddenPatterns) {
        expect(markdown).not.toMatch(pattern);
      }
    }
  });

  test('should reject moral judgments', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    if (markdown) {
      // Should NOT contain moral judgments
      const forbiddenPatterns = [
        /\b(good|bad)\s+(aspect|placement|transit|energy|pattern)\b/i,
        /\btoxic\s+(relationship|pattern|dynamic)\b/i,
        /\bevil\b/i
      ];
      
      for (const pattern of forbiddenPatterns) {
        expect(markdown).not.toMatch(pattern);
      }
    }
  });

  test('should handle relational context properly', async ({ request }) => {
    // Add relational context to test data
    const relationalData = {
      ...testData,
      Woven_Header: {
        mode: 'Reader+Reflection',
        subject_name: 'Test Subject',
        relational_context: {
          type: 'PARTNER',
          intimacy_tier: 'P3',
          contact_state: 'ACTIVE'
        }
      }
    };
    
    const response = await request.post('/api/poetic-brain', {
      data: relationalData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    // Should echo relational context
    expect(responseData.draft?.appendix?.relational_context).toBeDefined();
    
    // Should have relational scaffolding
    if (responseData.draft?.appendix?.relational) {
      const relational = responseData.draft.appendix.relational;
      expect(relational).toHaveProperty('synastry_aspects');
      expect(relational).toHaveProperty('composite_midpoints');
      expect(relational).toHaveProperty('shared_symbolic_climate');
      expect(relational).toHaveProperty('cross_symbolic_climate');
    }
  });
});
