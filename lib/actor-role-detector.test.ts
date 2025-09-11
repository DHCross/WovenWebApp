import ActorRoleDetector from './actor-role-detector';

const detector = ActorRoleDetector.getInstance();

function printResult(label: string, result: any) {
  console.log(`\n=== ${label} ===`);
  console.dir(result, { depth: 5 });
}

// 1. Negation trap (keywords)
const negationInput = 'I am not direct; I circle.';
const negationRes = detector.analyzeContent(negationInput);
printResult('Negation trap', negationRes);

// 2. Hyphen & accent normalization
const normInput = 'self-starting, re-form structures, naïve';
const normRes = detector.analyzeContent(normInput);
printResult('Hyphen & accent normalization', normRes);

// 3. Tonality stopword downweight
const tonalityInput = 'Open and warm, but precise when needed.';
const tonalityRes = detector.analyzeContent(tonalityInput);
printResult('Tonality stopword downweight', tonalityRes);

// 4. Behavior phrase proximity with negation
const behaviorInput = ", I don't need recognition to move forward.";
const behaviorRes = detector.analyzeContent(behaviorInput);
printResult('Behavior phrase proximity with negation', behaviorRes);

// 5. Probe inversion and drift banding
const probeComposite = detector.generateComposite({
  wbPatterns: [],
  abePatterns: [],
  osrPatterns: [],
  osrProbes: [
    { mirrorId: '1', probe: 'INVERSION', mappedTo: 'DRIVER', area: 'agency', text: 'I loosen under pressure (not tense)' },
    { mirrorId: '2', probe: 'TONE', mappedTo: 'DRIVER', area: 'energy', text: 'I act quickly' },
    { mirrorId: '3', probe: 'DIRECTION', mappedTo: 'DRIVER', area: 'communication', text: 'I speak up' },
    { mirrorId: '4', probe: 'TONE', mappedTo: 'DRIVER', area: 'boundaries', text: 'I set limits' },
    { mirrorId: '5', probe: 'TONE', mappedTo: 'ROLE', area: 'energy', text: 'I am flexible' },
  ]
});
printResult('Probe inversion and drift banding', probeComposite);

// 6. Tiny sample honesty
const tinySample = detector.generateComposite({
  wbPatterns: ['I am visionary and candid, always expanding.'],
  abePatterns: [],
  osrPatterns: [],
  osrProbes: []
});
printResult('Tiny sample honesty', tinySample);

console.log('\nAll tests complete.');
