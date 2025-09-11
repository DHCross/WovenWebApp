#!/usr/bin/env node

// Demo script showing the follow-up question system
// This demonstrates how the system responds when someone says something doesn't feel familiar

import { followUpGenerator, ChartContext } from '../lib/followup-generator.js';

// Mock chart context (this would come from actual astrological data)
const mockChartContext = {
  sun: { sign: 'Cancer', house: 1 },
  moon: { sign: 'Scorpio', house: 4 },
  mars: { sign: 'Taurus', house: 10 },
  venus: { sign: 'Gemini', house: 11 },
  mercury: { sign: 'Cancer', house: 1 }
};

// Test various "doesn't feel familiar" responses
const testCases = [
  "That doesn't feel familiar to me.",
  "This doesn't resonate with me at all.",
  "That's not me at all.",
  "I don't really connect with that description.",
  "That doesn't ring true for me.",
  "I'd say that's off the mark."
];

console.log('🔮 Follow-Up Question Generator Demo\n');
console.log('Testing responses when users say something doesn\'t feel familiar...\n');

testCases.forEach((userResponse, index) => {
  console.log(`Test ${index + 1}: "${userResponse}"`);
  console.log('─'.repeat(50));
  
  // Generate chart-based follow-up questions
  const followUpQuestions = followUpGenerator.generateChartBasedQuestions(
    userResponse,
    mockChartContext,
    2 // max 2 questions
  );
  
  if (followUpQuestions.length > 0) {
    console.log('📊 Generated Questions:');
    followUpQuestions.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.question}`);
      console.log(`     Category: ${q.category}`);
      console.log(`     Hidden Astro Basis: ${q.astroBasis}`);
      console.log(`     Expected Resonance: ${q.expectedResonance}`);
      console.log('');
    });
    
    // Show how it would be formatted for natural conversation
    const naturalResponse = followUpGenerator.formatAsNaturalFollowUp(followUpQuestions);
    console.log('💬 Natural Conversation Response:');
    console.log(`"${naturalResponse}"`);
  } else {
    console.log('❌ No follow-up questions generated');
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
});

console.log('🎯 Key Features:');
console.log('✅ Automatically detects "doesn\'t feel familiar" responses');
console.log('✅ Generates chart-based questions without showing astro jargon');
console.log('✅ Questions target different life areas (energy, relationships, etc.)');
console.log('✅ Formats responses for natural conversation flow');
console.log('✅ Tracks SST categories (WB/ABE/OSR) for better accuracy');
console.log('\n🔄 Next: This integrates with the existing ping tracker for continuous learning');
