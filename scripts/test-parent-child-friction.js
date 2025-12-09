const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// Big Five Inference (Inline)
// ─────────────────────────────────────────────────────────────────────────────
const ELEMENTS = {
  Ari: 'F', Leo: 'F', Sag: 'F',
  Tau: 'E', Vir: 'E', Cap: 'E',
  Gem: 'A', Lib: 'A', Aqu: 'A',
  Can: 'W', Sco: 'W', Pis: 'W',
};

function norm(s) { if (!s) return null; const t = s.trim().slice(0, 3); return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); }
function elem(sign) { const k = norm(sign); return k ? ELEMENTS[k] || null : null; }
function scoreToBand(value) { if (value >= 65) return 'high'; if (value >= 35) return 'moderate'; return 'low'; }

function inferProfile(positions) {
  let oScore = 50, cScore = 50, eScore = 50, aScore = 50, nScore = 50;
  
  const mercury = positions['Mercury'], jupiter = positions['Jupiter'];
  const saturn = positions['Saturn'], moon = positions['Moon'], venus = positions['Venus'];
  
  // Rules adapted from lib/bigfive/inferBigFiveFromChart.ts
  if (['A', 'F'].includes(elem(mercury?.sign))) oScore += 15;
  if (['F', 'A'].includes(elem(jupiter?.sign))) oScore += 12;
  
  if (elem(saturn?.sign) === 'E') cScore += 15;
  if (['Vir', 'Cap'].includes(norm(positions.Sun?.sign))) cScore += 10; // Extra rule for Earth Suns
  
  if (['F', 'A'].includes(elem(moon?.sign))) eScore += 18;
  else if (['W', 'E'].includes(elem(moon?.sign))) eScore -= 15;
  
  if (elem(venus?.sign) === 'W') aScore += 10;
  else if (elem(venus?.sign) === 'A') aScore += 5;
  
  let waterCount = 0;
  for (const [_, p] of Object.entries(positions)) { if (p?.sign && elem(p.sign) === 'W') waterCount++; }
  if (waterCount >= 4) nScore += 15;
  else if (waterCount <= 1) nScore -= 10;
  if (elem(moon?.sign) === 'W') nScore += 8;
  
  return {
    O: { value: Math.max(0, Math.min(100, oScore)), band: scoreToBand(oScore) },
    C: { value: Math.max(0, Math.min(100, cScore)), band: scoreToBand(cScore) },
    E: { value: Math.max(0, Math.min(100, eScore)), band: scoreToBand(eScore) },
    A: { value: Math.max(0, Math.min(100, aScore)), band: scoreToBand(aScore) },
    N: { value: Math.max(0, Math.min(100, nScore)), band: scoreToBand(nScore) },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tension Synthesis (Inline)
// ─────────────────────────────────────────────────────────────────────────────
const TENSION_MAP = [
  { id: 'sponge', name: 'The Sponge Effect', dimA: 'O', dimB: 'N',
    condition: { bandA: 'high', bandB: 'high' },
    friction: {
      narrator: 'You live with a **permanently open door** and a **slow-burning hearth**. You invite life in before you check who is knocking, and your heart takes its time to decide what to keep.',
    }},
  { id: 'commitment_lag', name: 'Opens Fast, Closes Slow', dimA: 'O', dimB: 'C',
    condition: { bandA: 'high', bandB: 'high' },
    friction: {
      narrator: 'You say "let me see what is here" a lot. You sample freely. But once you choose, you hold on. You do not commit lightly—but when you do, you take it seriously.',
    }},
  { id: 'brake_gas', name: 'Ignition vs Inspection', dimA: 'E', dimB: 'C',
    condition: { bandA: 'high', bandB: 'high' },
    friction: {
      narrator: 'Part of you wants to **jump in and feel it**; part wants to **measure twice before cutting once**. You feel the pull of both at once.',
    }},
  { id: 'live_wire', name: 'The Live Wire', dimA: 'O', dimB: 'E',
    condition: { bandA: 'high', bandB: 'high' },
    friction: {
      narrator: 'You light up rooms without trying. You sample ideas, connect with people, and move fast. But you can run through your fuel quickly if you do not monitor the tank.',
    }},
  { id: 'anchor', name: 'The Anchor', dimA: 'N', dimB: 'C',
    condition: { bandA: 'low', bandB: 'high' }, // low N (stable), high C (structured)
    friction: {
      narrator: 'You are the one who stays calm when things go sideways. People lean on you because you hold steady. But sometimes you forget that you are allowed to shake too.',
    }},
  { id: 'gatekeeper', name: 'The Gatekeeper', dimA: 'O', dimB: 'C',
    condition: { bandA: 'low', bandB: 'high' },
    friction: {
      narrator: 'You check the peephole before opening the door. New ideas, new people—you want to know it is safe before you let it in. But once it is inside, you build to last.',
    }},
   { id: 'internal_explorer', name: 'The Internal Explorer', dimA: 'O', dimB: 'E',
    condition: { bandA: 'high', bandB: 'low' },
    friction: {
      narrator: 'You explore constantly, but quietly. There is a whole universe inside your head that most people never see.',
    }},
];

function detectTensions(profile) {
  const detected = [];
  for (const pattern of TENSION_MAP) {
    const dimA = profile[pattern.dimA], dimB = profile[pattern.dimB];
    if (dimA.band === pattern.condition.bandA && dimB.band === pattern.condition.bandB) {
      detected.push({ pattern, intensity: 2 });
    }
  }
  return detected;
}

// ─────────────────────────────────────────────────────────────────────────────
// Relational Friction Logic (New!)
// ─────────────────────────────────────────────────────────────────────────────
function compareProfiles(pA, pB, nameA, nameB) {
  const comparisons = [];
  
  // STRUCTURE MISMATCH (C)
  if (pA.C.band === 'high' && pB.C.band !== 'high') {
    comparisons.push(`**Structure Clash:** ${nameA} builds to last (High C); ${nameB} adapts in the moment. ${nameA} may feel ${nameB} is chaotic; ${nameB} may feel ${nameA} is rigid.`);
  }
  
  // ENERGY MISMATCH (E)
  if (pA.E.band === 'low' && pB.E.band === 'high') {
    comparisons.push(`**Energy Direction:** ${nameA} restores in quiet (Low E); ${nameB} ignites in contact (High E). ${nameB} may accidentally drain ${nameA} by trying to "cheer them up."`);
  } else if (pA.E.band === 'high' && pB.E.band === 'low') {
    comparisons.push(`**Energy Direction:** ${nameA} ignites in contact (High E); ${nameB} restores in quiet (Low E). ${nameA} may feel rejected when ${nameB} withdraws.`);
  }
  
  // SENSITIVITY MISMATCH (N)
  if (pA.N.band === 'high' && pB.N.band === 'low') {
    comparisons.push(`**Sensitivity Gap:** ${nameA} feels the room (High N); ${nameB} has a steady baseline (Low N). ${nameA} may feel ${nameB} is cold; ${nameB} may feel ${nameA} is overreacting.`);
  } else if (pA.N.band === 'low' && pB.N.band === 'high') {
    comparisons.push(`**Sensitivity Gap:** ${nameA} holds steady (Low N); ${nameB} feels the room (High N). ${nameB} may feel invisible if ${nameA} doesn't register the subtle currents.`);
  }
  
  return comparisons;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
const jsonPath = '/Users/dancross/Documents/GitHub/WovenWebApp/analysis/Wheel Charts/2006-01-03_carrie_1975-08-21_Symbolic_Weather_Dashboard_2025-12-09_to_2025-12-09_Mirror+SymbolicWeather.json';

console.log('👪 PARENT/CHILD FRICTION TEST');
console.log('='.repeat(70));

try {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  
  // Person A (Child)
  const nameA = data.person_a?.name || 'Abby';
  const posA = data.person_a?.chart?.positions || {};
  const profileA = inferProfile(posA);
  const tensionsA = detectTensions(profileA);
  
  // Person B (Mother)
  const nameB = data.person_b?.name || 'Carrie';
  const posB = data.person_b?.chart?.positions || {};
  const profileB = inferProfile(posB);
  const tensionsB = detectTensions(profileB);
  
  // OUTPUT
  console.log(`\nCHILD: ${nameA} (Sun:${posA.Sun?.sign}, Moon:${posA.Moon?.sign})`);
  console.log(`Backstage: O-${profileA.O.band} C-${profileA.C.band} E-${profileA.E.band} A-${profileA.A.band} N-${profileA.N.band}`);
  console.log('Core Tensions:');
  tensionsA.forEach(t => console.log(`- ${t.pattern.name}: ${t.pattern.friction.narrator}`));
  
  console.log(`\nMOTHER: ${nameB} (Sun:${posB.Sun?.sign}, Moon:${posB.Moon?.sign})`);
  console.log(`Backstage: O-${profileB.O.band} C-${profileB.C.band} E-${profileB.E.band} A-${profileB.A.band} N-${profileB.N.band}`);
  console.log('Core Tensions:');
  tensionsB.forEach(t => console.log(`- ${t.pattern.name}: ${t.pattern.friction.narrator}`));
  
  // Relational Friction
  console.log('\n' + '─'.repeat(70));
  console.log('RELATIONAL FRICTION (Where the Systems Rub)');
  console.log('─'.repeat(70));
  const comparisons = compareProfiles(profileA, profileB, nameA, nameB);
  comparisons.forEach(c => console.log(`\n${c}`));
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Parent/Child test complete');
  
} catch (err) {
  console.error('❌ Error:', err.message);
}
