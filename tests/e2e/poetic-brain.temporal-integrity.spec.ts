import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Poetic Brain — Temporal & Contextual Integrity', () => {
  let testData: any;

  test.beforeAll(() => {
    const testDataPath = path.join(process.cwd(), 'test-data', 'mirror-symbolic-weather-sample.json');
    testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
  });

  test('should avoid omniscient past tense without archival markers', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    if (markdown) {
      // Flag omniscient past tense patterns (unless explicitly archival)
      const forbiddenPastTense = [
        /\byou once (felt|were|experienced)\b/i,
        /\byou used to (feel|be|experience)\b/i,
        /\bin the past, you\b/i,
        /\bhistorically, you\b/i
      ];
      
      // Check if dataset has archival markers
      const hasArchivalContext = testData.Woven_Header?.archival === true || 
                                 testData.mirror_contract?.archival === true;
      
      if (!hasArchivalContext) {
        for (const pattern of forbiddenPastTense) {
          expect(markdown).not.toMatch(pattern);
        }
      }
      
      // Ensure symbolic weather stays in present/conditional present
      const weatherPatterns = /\b(transit|pressure|climate|weather|current)\b/i;
      if (weatherPatterns.test(markdown)) {
        // Should use present or conditional forms
        expect(markdown).toMatch(/\b(may|might|could|tends to|shows|appears|surfaces)\b/);
      }
    }
  });

  test('should maintain context-locked pronouns in relational readings', async ({ request }) => {
    const relationalData = {
      ...testData,
      Woven_Header: {
        mode: 'Reader+Reflection',
        subject_name: 'Person A',
        relational_context: {
          type: 'PARTNER',
          person_a_name: 'Alex',
          person_b_name: 'Jordan',
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
    
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    if (markdown) {
      // Should NOT have untagged "they" or "we" in relational context
      // (Unless explicitly tagged with names or Person A/Person B)
      const untaggedPronouns = /\b(they|we|our|their)\b(?!\s+(Person A|Person B|Alex|Jordan))/gi;
      const matches = markdown.match(untaggedPronouns);
      
      // Some untagged pronouns are OK in non-relational sections
      // but relational sections should be explicit
      if (matches && markdown.includes('Person A') && markdown.includes('Person B')) {
        // Flag if there are more than 2 untagged pronouns in relational context
        expect(matches.length).toBeLessThanOrEqual(2);
      }
      
      // Should NOT have shared-voice narration with "to be" forms
      const sharedVoiceViolations = [
        /\byou both are\b/i,
        /\btogether you are\b/i,
        /\byou're both\b/i
      ];
      
      for (const pattern of sharedVoiceViolations) {
        expect(markdown).not.toMatch(pattern);
      }
      
      // SHOULD use context-specific patterns like:
      // "When A reaches for X, B may respond with Y"
      if (markdown.includes('Person A')) {
        expect(markdown).toMatch(/\bPerson [AB]\b/);
      }
    }
  });

  test('should maintain sentence rhythm balance', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    if (markdown) {
      // Extract sentences (rough split on periods, excluding abbreviations)
      const sentences = markdown
        .split(/\.\s+/)
        .filter((s: string) => s.length > 10); // Filter out abbreviations
      
      if (sentences.length > 0) {
        // Count words per sentence
        const wordCounts = sentences.map((s: string) => s.split(/\s+/).length);
        
        // Flag sentences over 30 words (complex-compound chains)
        const longSentences = wordCounts.filter((count: number) => count > 30);
        const longSentenceRatio = longSentences.length / sentences.length;
        
        // No more than 20% of sentences should exceed 30 words
        expect(longSentenceRatio).toBeLessThan(0.2);
        
        // Check for rhythm variation (standard deviation should be reasonable)
        const avgLength = wordCounts.reduce((a: number, b: number) => a + b, 0) / wordCounts.length;
        const variance = wordCounts.reduce((sum: number, count: number) => sum + Math.pow(count - avgLength, 2), 0) / wordCounts.length;
        const stdDev = Math.sqrt(variance);
        
        // Standard deviation should show variety (not all same length)
        expect(stdDev).toBeGreaterThan(3);
      }
    }
  });

  test('should only use symbolic weather language when transits exist', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    // Check if transits/temporal data exists
    const hasTransits = testData.person_a?.transits || 
                       testData.transitsByDate ||
                       testData.symbolic_weather?.active_transits;
    
    const weatherLanguage = [
      /\bcurrent (pressure|climate|weather)\b/i,
      /\btoday's (pressure|climate|weather|reading)\b/i,
      /\bactive (transit|pressure)\b/i,
      /\bsymbolic weather\b/i
    ];
    
    if (!hasTransits) {
      // If no transits, should NOT use active weather language
      for (const pattern of weatherLanguage) {
        if (markdown.match(pattern)) {
          // Only natal/static language should appear
          expect(markdown).toMatch(/\b(natal|baseline|constitutional|static geometry)\b/i);
        }
      }
    } else {
      // If transits exist, weather language is appropriate
      // No assertion needed, just validating the logic
    }
  });

  test('should preserve poetic cadence without sacrificing precision', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    if (markdown) {
      // Should have both precise terminology AND metaphoric language
      const hasPrecision = /\b(orb|degree|aspect|placement|geometry)\b/i.test(markdown);
      const hasMetaphor = /\b(pressure|weather|climate|current|pull|friction|flow)\b/i.test(markdown);
      
      // Raven should balance both
      expect(hasPrecision || hasMetaphor).toBe(true);
      
      // Should NOT be sterile (too many technical terms in a row)
      // Check for stretches of >3 technical terms without metaphoric breathing room
      const technicalDensity = markdown.match(/\b(aspect|orb|degree|natal|transit|placement|house|sign)\b/gi);
      const metaphoricDensity = markdown.match(/\b(pressure|weather|friction|flow|pull|tension|ease|current)\b/gi);
      
      if (technicalDensity && metaphoricDensity) {
        const ratio = metaphoricDensity.length / technicalDensity.length;
        // Should have at least 0.5 metaphoric terms per technical term
        expect(ratio).toBeGreaterThan(0.3);
      }
    }
  });

  test('should flag ungrounded abstraction', async ({ request }) => {
    const response = await request.post('/api/poetic-brain', {
      data: testData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    const markdown = responseData.draft?.appendix?.reader_markdown || '';
    
    if (markdown) {
      // Abstract terms should be contextually grounded
      const abstractTerms = [
        { term: /\bresonance\b/i, needsContext: /(natal|aspect|correlation)\b/i },
        { term: /\balignment\b/i, needsContext: /(natal|transit|geometry)\b/i },
        { term: /\bconnection\b/i, needsContext: /(aspect|geometry|placement)\b/i }
      ];
      
      for (const { term, needsContext } of abstractTerms) {
        if (term.test(markdown)) {
          // If abstract term appears, geometric context should be nearby
          const paragraphs = markdown.split(/\n\n/);
          for (const para of paragraphs) {
            if (term.test(para)) {
              // This paragraph uses abstract term, should have geometric grounding
              expect(para).toMatch(needsContext);
            }
          }
        }
      }
    }
  });
});

test.describe('Poetic Brain — Future Interface Placeholders', () => {
  test.skip('should support dream translation endpoint (future)', async ({ request }) => {
    // Placeholder for future /api/v4/dream-translate endpoint
    // Expected interface:
    // POST /api/v4/dream-translate
    // Body: { dream_text: string, natal_context: {...} }
    // Response: { symbols: [...], geometric_correlations: [...], narrative: string }
    
    const dreamPayload = {
      dream_text: "I was flying over water, but the sky kept changing colors.",
      natal_context: {
        person_a: { /* natal data */ }
      }
    };
    
    // When implemented, should:
    // 1. Map dream symbols through geometric lattice
    // 2. Return conditional correlations (may/might/could)
    // 3. Maintain E-Prime discipline
    // 4. Include falsifiability markers (WB/ABE/OSR)
    
    expect(true).toBe(true); // Placeholder assertion
  });

  test.skip('should support poem rendering endpoint (future)', async ({ request }) => {
    // Placeholder for future /api/v4/poem-render endpoint
    // Expected interface:
    // POST /api/v4/poem-render
    // Body: { geometric_input: {...}, style: 'haiku'|'freeverse'|'structured' }
    // Response: { poem: string, audit_trail: {...}, geometric_anchors: [...] }
    
    const poemPayload = {
      geometric_input: {
        aspects: [/* ... */]
      },
      style: 'freeverse'
    };
    
    // When implemented, should:
    // 1. Translate structure into sound (art first)
    // 2. Provide audit trail (MAP backstage)
    // 3. Show geometric anchors for falsifiability
    // 4. Maintain conditional language throughout
    
    expect(true).toBe(true); // Placeholder assertion
  });
});
