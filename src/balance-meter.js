// src/balance-meter.js
// Balance Channel (v1.1) + Support–Friction Differential (SFD, v1.2)
// Standalone computation based on "Balance Meter.txt" spec (v1.2 Draft, Sep 5, 2025)

const { getEffectiveOrb, isWithinOrb } = require('../lib/config/orb-profiles');

function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }
function round(n, p=2){ return Math.round(n * (10**p)) / (10**p); }

// Normalize various aspect name spellings to canonical lowercase
function normAspectName(s){
  const a = String(s||'').toLowerCase().trim();
  const map = {
    opposition: 'opposition', opp: 'opposition',
    square: 'square', sq: 'square',
    trine: 'trine', tri: 'trine',
    sextile: 'sextile', sex: 'sextile',
    conjunction: 'conjunction', conj: 'conjunction',
    quintile: 'quintile', biquintile: 'biquintile',
    quincunx: 'quincunx', inconjunct: 'quincunx',
    'semi-square': 'semi-square', sesquisquare: 'sesquiquadrate', sesquiquadrate: 'sesquiquadrate',
    'semi-sextile': 'semi-sextile'
  };
  return map[a] || a;
}

// Body helpers
function normBody(b){
  if (!b) return '';
  const s = typeof b === 'string' ? b : (b.name || b.body || '');
  return String(s || '').trim();
}

function bodyClass(name){
  switch(name){
    case 'Sun':
    case 'Moon': return 'luminary';
    case 'Mercury':
    case 'Venus':
    case 'Mars': return 'personal';
    case 'Jupiter':
    case 'Saturn': return 'social';
    case 'Uranus':
    case 'Neptune':
    case 'Pluto': return 'outer';
    case 'Ascendant':
    case 'Medium_Coeli':
    case 'Descendant':
    case 'Imum_Coeli': return 'angle';
    case 'Chiron':
    case 'Mean_Node':
    case 'True_Node':
    case 'Mean_South_Node':
    case 'True_South_Node':
    case 'Mean_Lilith': return 'point';
    default: return 'other';
  }
}

function isBenefic(name){ return name==='Jupiter' || name==='Venus'; }
function isHeavy(name){ return name==='Saturn' || name==='Pluto' || name==='Chiron'; }

// Linear orb multiplier with dynamic caps from orb profile, 1.0 at exact → 0 at/over cap.
function orbMultiplier(aspect, orbDeg, aName, bName, orbsProfile = 'wm-spec-2025-09'){
  const effectiveOrb = getEffectiveOrb(aspect, aName, bName, orbsProfile);
  const o = Math.abs(Number(orbDeg||0));
  if (!(o>=0)) return 0;
  if (o>=effectiveOrb) return 0;
  return +(1 - (o/effectiveOrb));
}

// Sensitivity multiplier: angles/luminaries/personals boosted symmetrically
function sensitivity(aName, bName){
  const set = new Set([bodyClass(aName), bodyClass(bName)]);
  let s = 1.0;
  if (set.has('angle')) s *= 1.2;
  if (set.has('luminary')) s *= 1.1;
  if (set.has('personal')) s *= 1.05;
  return s;
}

// Planetary multipliers vary by channel
function planetMultiplier(body, mode){
  switch(mode){
    case 'support': // S+ channel
      if (body==='Jupiter' || body==='Venus') return 1.4;
      if (body==='Moon' || body==='Saturn') return 1.2; // when stabilizing
      // Sun/Mercury 1.0; others default 1.0
      return 1.0;
    case 'counter': // S− channel
      if (body==='Mars') return 1.2;
      if (body==='Saturn' || body==='Pluto' || body==='Chiron') return 1.2;
      if (body==='Neptune') return 1.1;
      return 1.0;
    default:
      return 1.0;
  }
}

// Base weights for SFD
function baseSupportWeight(type, aName, bName){
  switch(type){
    case 'trine': return +1.5;
    case 'sextile': return +1.0;
    case 'conjunction':
      if (isBenefic(aName) || isBenefic(bName)) return +1.2; // benefic conj
      return 0.0;
    default:
      return 0.0;
  }
}

function isMoonSaturnSoft(type, aName, bName){
  if (!(type==='trine' || type==='sextile')) return false;
  const set = new Set([aName,bName]);
  return set.has('Moon') && set.has('Saturn');
}

function isMinorSupport(type){
  // Conservative: treat harmonic minors as supportive
  return type==='quintile' || type==='biquintile';
}

function baseCounterWeight(type, aName, bName){
  const set = new Set([aName,bName]);
  const hard = (type==='square' || type==='opposition');
  if (hard && (set.has('Jupiter') || set.has('Venus'))) return -1.3; // hard to benefics
  if (type==='conjunction' && (set.has('Saturn') || set.has('Pluto') || set.has('Chiron')) && (set.has('Jupiter') || set.has('Venus'))) return -0.8; // heavy to benefic conj
  // Specific hard combos handled in logic using support nodes (see below)
  return 0.0;
}

// Utility: whether aspect is a hard aspect between X and Y sets
function isHardBetween(type, aName, bName, setA, setB){
  if (!(type==='square' || type==='opposition')) return false;
  const A = new Set([aName,bName]);
  return ([...setA].some(x=>A.has(x)) && [...setB].some(x=>A.has(x)));
}

// Balance Channel v1.1 (rebalanced valence only)
// Simple pass: reuse SFD support weights but with gentler base table per Appendix (if needed later)
function computeBalanceValence(dayAspects, orbsProfile = 'wm-spec-2025-09'){
  if (!Array.isArray(dayAspects)) return 0;
  let v = 0;
  for (const rec of dayAspects){
    const type = normAspectName(rec.aspect || rec.type || rec._aspect);
    const a = normBody(rec.p1_name || rec.a || rec.transit);
    const b = normBody(rec.p2_name || rec.b || rec.natal);
    const orb = rec.orb != null ? rec.orb : (rec.orbit != null ? rec.orbit : rec._orb);
    const o = orbMultiplier(type, orb, a, b, orbsProfile);
    const s = sensitivity(a,b);
    // v1.1 base: softer positives/negatives than v1.0; here approximate using SFD support and skip negatives except hard to benefics
    let base = 0;
    base += baseSupportWeight(type, a,b);
    if (isMoonSaturnSoft(type,a,b)) base = Math.max(base, 1.2);
    if (isMinorSupport(type) && Math.abs(orb) <= 1.0) base = Math.max(base, 0.5);
    // small negative for hard to benefic
    const neg = baseCounterWeight(type, a,b);
    const mA = planetMultiplier(a, base>0 ? 'support' : 'counter');
    const mB = planetMultiplier(b, base>0 ? 'support' : 'counter');
    const w = ((base>0? base : 0) + (neg<0? neg : 0)) * mA * mB * o * s;
    v += w;
  }
  // Soft normalization to -5..+5
  const K = 4.0;
  return round(5 * Math.tanh(v / K), 2);
}

module.exports = {
  computeBalanceValence
};

