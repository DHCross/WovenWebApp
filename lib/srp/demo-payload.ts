/**
 * SRP Mock Payload Demo
 * Shows how SRP-enriched hooks flow through Poetic Brain
 * Run with: npx tsx lib/srp/demo-payload.ts
 */

import { mapAspectToSRP } from './mapper';
import type { HookObject } from '../../poetic-brain/src/index';

// Simulate Math Brain enriching hooks with SRP data
function enrichHookWithSRP(
  label: string,
  resonanceState: 'WB' | 'ABE' | 'OSR'
): HookObject {
  const enrichment = mapAspectToSRP(label, resonanceState);
  
  const hook: HookObject = {
    label,
    resonanceState,
    orb: parseFloat(label.match(/\((\d+\.\d+)°\)/)?.[1] || '0'),
  };

  if (enrichment) {
    hook.srp = {
      blendId: enrichment.blendId,
      hingePhrase: enrichment.hingePhrase,
      elementWeave: enrichment.elementWeave,
    };

    if (enrichment.shadowRef) {
      hook.srp.shadowId = enrichment.shadowRef.shadowId;
      hook.srp.restorationCue = enrichment.shadowRef.restorationCue;
      hook.srp.collapseMode = enrichment.shadowRef.collapseMode;
    }
  }

  return hook;
}

// Mock payload: Sun square Mars at boundary edge
console.log('═══════════════════════════════════════════════════════════');
console.log('SRP × Poetic Brain: Mock Payload Demo');
console.log('═══════════════════════════════════════════════════════════\n');

// Example 1: Within Boundary (constructive)
// Mars rules Aries, conjunction = same sign → Blend 1 (Aries × Aries)
console.log('📍 Example 1: Mars conjunction Mars (0.5°) - Within Boundary\n');
const hook1 = enrichHookWithSRP('Mars conjunction Mars (0.5°)', 'WB');
console.log('Raw Hook Object:');
console.log(JSON.stringify(hook1, null, 2));
console.log('\n🎭 Formatted for Narrative:');
console.log(`  ${hook1.label}${hook1.srp?.hingePhrase ? ` – ${hook1.srp.hingePhrase}` : ''}`);
console.log('\n─────────────────────────────────────────────────────────────\n');

// Example 2: At Boundary Edge (shadow emerging)
// Venus rules Libra, square → Capricorn = Blend 119 (Capricorn × Aquarius? Need to check)
// Actually use Mars trine Mars → Aries × Leo = Blend 5
console.log('📍 Example 2: Mars trine Sun (2.1°) - At Boundary Edge\n');
const hook2 = enrichHookWithSRP('Mars trine Sun (2.1°)', 'ABE');
console.log('Raw Hook Object:');
console.log(JSON.stringify(hook2, null, 2));
console.log('\n🎭 Formatted for Narrative:');
console.log(`  ${hook2.label}${hook2.srp?.hingePhrase ? ` – ${hook2.srp.hingePhrase}` : ''}`);
if (hook2.srp?.collapseMode) {
  console.log(`  ⚠ Shadow Mode: ${hook2.srp.collapseMode}`);
}
if (hook2.srp?.restorationCue) {
  console.log(`  🔧 Restoration Cue: ${hook2.srp.restorationCue}`);
}
console.log('\n─────────────────────────────────────────────────────────────\n');

// Example 3: Outside Symbolic Range (non-ping)
// Saturn rules Capricorn, sextile → Pisces. Let's use opposition instead
// Saturn opposition Saturn → Capricorn × Cancer = Blend 40  
console.log('📍 Example 3: Saturn opposition Moon (5.0°) - Outside Symbolic Range\n');
const hook3 = enrichHookWithSRP('Saturn opposition Moon (5.0°)', 'OSR');
console.log('Raw Hook Object:');
console.log(JSON.stringify(hook3, null, 2));
console.log('\n🎭 Formatted for Narrative:');
console.log(`  ${hook3.label}${hook3.srp?.hingePhrase ? ` – ${hook3.srp.hingePhrase}` : ''}`);
if (hook3.srp?.restorationCue) {
  console.log(`  🔧 Restoration: ${hook3.srp.restorationCue}`);
}
console.log('\n─────────────────────────────────────────────────────────────\n');

// Example 4: Full narrative context (simulating Poetic Brain output)
console.log('📖 Full Narrative Context (as user would see):\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('SYMBOLIC WEATHER: January 1, 2024');
console.log('═══════════════════════════════════════════════════════════\n');

const allHooks = [hook1, hook2, hook3];

console.log('🔥 High-Charge Hooks:\n');
allHooks.forEach((h, i) => {
  const parts = [h.label];
  if (h.srp?.hingePhrase) parts.push(h.srp.hingePhrase);
  
  const tags = [];
  if (h.orb !== undefined) tags.push(`${h.orb.toFixed(1)}° orb`);
  if (h.resonanceState === 'ABE') tags.push('boundary edge');
  if (h.resonanceState === 'OSR') tags.push('non-ping');
  if (h.srp?.collapseMode) tags.push(`⚠ ${h.srp.collapseMode}`);
  
  if (tags.length) parts.push(`(${tags.join(', ')})`);
  
  console.log(`  ${i + 1}. ${parts.join(' | ')}`);
});

// Shadow restoration cues (if any)
const restorationCues = allHooks
  .filter(h => h.srp?.restorationCue)
  .map(h => h.srp!.restorationCue);

if (restorationCues.length > 0) {
  console.log('\n🌑 Shadow Layer:\n');
  console.log(`  Restoration Cues: ${restorationCues.join(' · ')}`);
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 RESONANCE AUDIT CHECKLIST:');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('□ Does the hinge phrase enhance or distract?');
console.log('□ Does it "breathe" with existing Mandala language?');
console.log('□ Are shadow cues poetic vs diagnostic?');
console.log('□ Would you want to read this in your own chart?');
console.log('□ Does it add signal or just noise?');
console.log('\n');
