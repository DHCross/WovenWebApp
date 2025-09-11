// Persona + FIELD → MAP → VOICE shaping utilities (stub)
// Ensures conditional, falsifiable language and approved emoji usage.

export interface PersonaConfig {
  mode?: 'plain' | 'poetic';
}

export interface RavenDeltaContext {
  hook?: string; climate?: string; section?: 'mirror'|'polarity'|'meter';
}

export function shapeVoice(raw: string, ctx: RavenDeltaContext): string {
  // Basic guardrail: ensure conditional verbs
  let out = raw.replace(/\b(is|are|will)\b/gi, 'may');
  // Avoid deterministic causality words
  out = out.replace(/causes?/gi,'may correlate with');
  // Append audit hint if mirror section
  if(ctx.section==='mirror') out += '\n\n<small style="opacity:.6">(If no resonance: mark OSR—null data is valid.)</small>';
  return out;
}

export function pickClimate(seed: string){
  // Simple deterministic tags based on hash of seed
  const h = hash(seed);
  const mags = ['⚡ Pulse','⚡ Stirring','⚡ Convergence']; // Using official magnitude scale
  const vals = ['🌞 Supportive','🌗 Mixed','🌑 Restrictive'];
  const vols = ['🌪 Low','🌪 Scattered','🌪 Active'];
  return `${mags[h%3]} · ${vals[h%3]} · ${vols[h%3]}`;
}

function hash(s:string){ let h=0; for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i))>>>0;} return h; }
