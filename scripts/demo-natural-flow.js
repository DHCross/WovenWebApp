#!/usr/bin/env node

// Demo script showing the complete natural follow-up flow
// Demonstrates the SST validation ladder for both positive and negative responses

import { naturalFollowUpFlow, SessionContext } from '../lib/natural-followup-flow.js';

console.log('🔮 Natural Follow-Up Flow Demo\n');
console.log('Demonstrating the SST validation ladder...\n');

// Mock session context
let sessionContext = {
  wbHits: [],
  abeHits: [],
  osrMisses: [],
  actorWeighting: 0,
  roleWeighting: 0,
  driftIndex: 0,
  sessionActive: true
};

console.log('='.repeat(70));
console.log('SCENARIO 1: User AFFIRMS resonance');
console.log('='.repeat(70));

const affirmResponse = "Yes, that really resonates with me!";
console.log(`User: "${affirmResponse}"`);
console.log('─'.repeat(50));

// Generate zoom-in follow-up
const zoomInFlow = naturalFollowUpFlow.generateFollowUp({
  type: 'AFFIRM',
  content: affirmResponse,
  originalMirror: "You tend to protect and nurture those you care about"
}, sessionContext);

console.log('🎯 Generated Follow-Up:');
console.log(`Stage: ${zoomInFlow.stage}`);
console.log(`Question: "${zoomInFlow.question}"`);
console.log(`Purpose: ${zoomInFlow.purpose}`);
console.log(`Expected Response: ${zoomInFlow.expectedResponse}`);

// User responds with specific behavioral description
const behaviorResponse = "The line about protecting others really hit. When I see someone I care about struggling, I immediately want to step in and help them solve it, even if they didn't ask for help.";
console.log(`\nUser responds: "${behaviorResponse}"`);

// Classify the response
const classification = naturalFollowUpFlow.classifyResponse(behaviorResponse, 'ZOOM_IN');
console.log('\n📊 Classification:');
console.log(`Type: ${classification.classification}`);
console.log(`Weight: ${classification.weight}`);
console.log(`Target Weighting: ${classification.targetWeighting}`);

// Update session context
sessionContext = naturalFollowUpFlow.updateSessionContext(sessionContext, behaviorResponse, classification);
console.log('\n📈 Updated Session Context:');
console.log(`WB Hits: ${sessionContext.wbHits.length}`);
console.log(`Actor Weighting: ${sessionContext.actorWeighting}`);
console.log(`Role Weighting: ${sessionContext.roleWeighting}`);
console.log(`Drift Index: ${sessionContext.driftIndex.toFixed(2)}`);

console.log('\n\n' + '='.repeat(70));
console.log('SCENARIO 2: User indicates OSR (no resonance)');
console.log('='.repeat(70));

const osrResponse = "That doesn't feel familiar to me at all.";
console.log(`User: "${osrResponse}"`);
console.log('─'.repeat(50));

// Generate OSR probe
const osrFlow = naturalFollowUpFlow.generateFollowUp({
  type: 'OSR',
  content: osrResponse,
  originalMirror: "You tend to act quickly and decisively"
}, sessionContext);

console.log('🎯 Generated OSR Probe:');
console.log(`Stage: ${osrFlow.stage}`);
console.log(`Question: "${osrFlow.question}"`);
console.log(`Purpose: ${osrFlow.purpose}`);
console.log(`Expected Response: ${osrFlow.expectedResponse}`);

// User clarifies the type of miss
const clarificationResponse = "More like the opposite - I actually tend to overthink things and move very slowly.";
console.log(`\nUser clarifies: "${clarificationResponse}"`);

// Classify the OSR clarification
const osrClassification = naturalFollowUpFlow.classifyResponse(clarificationResponse, 'OSR_PROBE');
console.log('\n📊 OSR Classification:');
console.log(`Type: ${osrClassification.classification}`);
console.log(`Probe Type: ${osrClassification.probeType}`);
console.log(`Target Weighting: ${osrClassification.targetWeighting} (feeds Actor only)`);

// Update session context with OSR data
sessionContext = naturalFollowUpFlow.updateSessionContext(sessionContext, clarificationResponse, osrClassification);
console.log('\n📈 Updated Session Context (after OSR):');
console.log(`OSR Misses: ${sessionContext.osrMisses.length}`);
console.log(`Actor Weighting: ${sessionContext.actorWeighting.toFixed(2)}`);
console.log(`Drift Index: ${sessionContext.driftIndex.toFixed(2)}`);

console.log('\n\n' + '='.repeat(70));
console.log('SCENARIO 3: Session Wrap-Up');
console.log('='.repeat(70));

// Generate wrap-up card
const wrapUpCard = naturalFollowUpFlow.generateWrapUpCard(sessionContext);
console.log('🎴 Wrap-Up Card:');
console.log(`Resonant Lines: ${wrapUpCard.resonantLines.length}`);
console.log(`Score Strip: ✅ ${wrapUpCard.scoreStrip.wb} WB / 🟡 ${wrapUpCard.scoreStrip.abe} ABE / ❌ ${wrapUpCard.scoreStrip.osr} OSR`);
console.log(`Drift Flag: ${wrapUpCard.driftFlag ? '🌀 Sidereal drift detected' : 'No drift detected'}`);

// Generate poetic card (separate from poems)
const poeticCard = naturalFollowUpFlow.generatePoeticCard(sessionContext);
console.log('\n🎨 Poetic Card:');
console.log(`Title: ${poeticCard.title}`);
console.log(`Resonant Line: "${poeticCard.resonantLine}"`);
console.log(`Score Indicator: ${poeticCard.scoreIndicator}`);
console.log(`Composite Guess: ${poeticCard.compositeGuess}`);
if (poeticCard.driftFlag) {
  console.log(`Drift Flag: ${poeticCard.driftFlag}`);
}

// Session closure
const closure = naturalFollowUpFlow.generateSessionClosure();
console.log('\n🔄 Session Closure:');
console.log(`Reset Prompt: "${closure.resetPrompt}"`);
console.log(`Options: ${closure.continuationOptions.join(' | ')}`);

console.log('\n\n' + '='.repeat(70));
console.log('KEY FEATURES DEMONSTRATED:');
console.log('='.repeat(70));
console.log('✅ 1. ZOOM-IN after affirmation: "Which line carried the weight for you?"');
console.log('✅ 2. CLASSIFICATION: WB=1.0, ABE=0.5, OSR=0 (unless probed)');
console.log('✅ 3. OSR PROBES: "Was it opposite, wrong flavor, or not in field?"');
console.log('✅ 4. ACTOR/ROLE DRIFT: OSR clarifications feed Actor weighting only');
console.log('✅ 5. WRAP-UP CARDS: Separate poetic cards (not mixed with poems)');
console.log('✅ 6. SESSION CLOSURE: Reset scorecard, maintain identity');
console.log('\n🎯 "Here\'s what resonated, here\'s what didn\'t, here\'s what pattern');
console.log('   Raven is tentatively guessing — but you remain the validator."');
