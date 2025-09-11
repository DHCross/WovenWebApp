// Test script to demonstrate journal generation
// This can be run independently to showcase the journal feature

const mockSessionContext = {
  wbHits: [
    { content: "When I'm stressed, I tend to overthink everything and analyze every possible outcome" },
    { content: "I feel most comfortable when I have a clear plan and know what to expect" },
    { content: "My natural tendency is to be the one who organizes things and keeps everyone on track" }
  ],
  abeHits: [
    { content: "Sometimes I can be a bit controlling, though I prefer to call it 'thorough'", tone: 'off-tone' },
    { content: "I might come across as intense when I'm really passionate about something", tone: 'inverted' }
  ],
  osrMisses: [
    { content: "I'm very spontaneous and love surprises", probeType: 'opposite' },
    { content: "I prefer to go with the flow rather than plan ahead", probeType: 'wrong-flavor' }
  ],
  actorWeighting: 2,
  roleWeighting: 8,
  driftIndex: 0.3,
  currentComposite: "Methodical Coordinator",
  sessionActive: false
};

console.log('=== JOURNAL GENERATION DEMO ===');
console.log('');
console.log('Mock Session Data:');
console.log('- Within Boundary hits:', mockSessionContext.wbHits.length);
console.log('- At Boundary Edge hits:', mockSessionContext.abeHits.length);
console.log('- Outside Range misses:', mockSessionContext.osrMisses.length);
console.log('- Actor vs Role weighting:', mockSessionContext.actorWeighting, 'vs', mockSessionContext.roleWeighting);
console.log('- Drift index:', mockSessionContext.driftIndex);
console.log('- Current composite guess:', mockSessionContext.currentComposite);
console.log('');

// Calculate resonance fidelity using the same formula as in natural-followup-flow
const wb = mockSessionContext.wbHits.length;
const abe = mockSessionContext.abeHits.length;
const osr = mockSessionContext.osrMisses.length;

if (wb + abe + osr === 0) {
  console.log('No session data to analyze');
  process.exit(0);
}

const numerator = wb + (0.5 * abe);
const denominator = wb + abe + osr;
const percentage = Math.round((numerator / denominator) * 100);

let band = 'LOW';
let label = 'Extensive New Territory';

if (percentage >= 70) {
  band = 'HIGH';
  label = 'Strong Harmonic Alignment';
} else if (percentage >= 40) {
  band = 'MIXED';
  label = 'Balanced Recognition';
}

console.log('Calculated Resonance Fidelity:');
console.log(`- Formula: (${wb} + 0.5×${abe}) / (${wb}+${abe}+${osr}) × 100`);
console.log(`- Result: ${percentage}% (${band} - ${label})`);
console.log('');

// Generate mock journal
const userName = "Sarah";
const sessionDate = new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

const totalResponses = wb + abe + osr;
let narrative = `On this session, ${userName} sat with Raven to explore the patterns written in their chart. `;

// Opening based on resonance level
if (band === 'HIGH') {
  narrative += `The conversation flowed with remarkable alignment—Raven's mirrors consistently landed true, with ${userName} recognizing themselves clearly in ${percentage}% of the reflections offered. `;
} else if (band === 'MIXED') {
  narrative += `The dialogue wove between recognition and clarification, with ${userName} finding ${percentage}% resonance as they and Raven navigated the more complex territories of their pattern. `;
} else {
  narrative += `This session required careful excavation, with only ${percentage}% initial resonance as ${userName} and Raven worked together to find the precise language for their inner architecture. `;
}

// Add WB patterns
if (mockSessionContext.wbHits.length > 0) {
  narrative += `What rang most true were insights around `;
  const patterns = mockSessionContext.wbHits.slice(0, 2).map(hit => 
    hit.content.length > 50 ? hit.content.substring(0, 50) + '...' : hit.content
  );
  if (patterns.length === 1) {
    narrative += `${patterns[0].toLowerCase()}. `;
  } else {
    narrative += `${patterns.slice(0, -1).join(', ').toLowerCase()}, and ${patterns[patterns.length - 1].toLowerCase()}. `;
  }
}

// Add drift detection
if (mockSessionContext.driftIndex > 0.6) {
  narrative += `Throughout the exchange, Raven detected signs that ${userName}'s core drives might operate from a different seasonal rhythm than their outward presentation suggests—a pattern sometimes called sidereal drift. `;
}

// Add OSR handling
if (mockSessionContext.osrMisses.length > 0) {
  const osrRatio = mockSessionContext.osrMisses.length / totalResponses;
  if (osrRatio > 0.3) {
    narrative += `Several of Raven's initial offerings missed the mark entirely, requiring gentle probing to understand whether the patterns were inverted, off-tone, or simply outside ${userName}'s field altogether. `;
  }
}

// Closing
if (mockSessionContext.currentComposite) {
  narrative += `By session's end, the tentative pattern emerging was "${mockSessionContext.currentComposite}"—though ${userName}, as always, remained the final validator of what felt true.`;
} else {
  narrative += `The session concluded with patterns still crystallizing, leaving space for ${userName} to continue the exploration when ready.`;
}

const journalEntry = {
  title: `Raven Reading Session - ${userName}`,
  narrative,
  metadata: {
    sessionDate,
    totalInteractions: totalResponses,
    resonanceFidelity: percentage,
    primaryPatterns: mockSessionContext.wbHits.slice(0, 3).map(hit => 
      hit.content.length > 40 ? hit.content.substring(0, 40) + '...' : hit.content
    )
  }
};

console.log('=== GENERATED JOURNAL ENTRY ===');
console.log('');
console.log(`Title: ${journalEntry.title}`);
console.log('');
console.log('Narrative:');
console.log(journalEntry.narrative);
console.log('');
console.log('Metadata:');
console.log(`- Date: ${journalEntry.metadata.sessionDate}`);
console.log(`- Total Interactions: ${journalEntry.metadata.totalInteractions}`);
console.log(`- Resonance Fidelity: ${journalEntry.metadata.resonanceFidelity}%`);
console.log(`- Primary Patterns: ${journalEntry.metadata.primaryPatterns.join(', ')}`);
console.log('');
console.log('=== COPY-PASTE FORMAT ===');
console.log('');
console.log(`${journalEntry.title}

${journalEntry.narrative}

---
Session Details:
Date: ${journalEntry.metadata.sessionDate}
Total Interactions: ${journalEntry.metadata.totalInteractions}
Resonance Fidelity: ${journalEntry.metadata.resonanceFidelity}%
Primary Patterns: ${journalEntry.metadata.primaryPatterns.join(', ')}`);
