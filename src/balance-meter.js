// src/balance-meter.js
// Balance Channel (v1.1) + Support–Friction Differential (SFD, v1.2)
// Standalone computation based on "Balance Meter.txt" spec (v1.2 Draft, Sep 5, 2025)

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

// Linear orb multiplier with caps per class, 1.0 at exact → 0 at/over cap.
function orbMultiplier(aspect, orbDeg, aName, bName){
  const aClass = bodyClass(aName);
  const bClass = bodyClass(bName);
  const isMinor = (aspect==='quintile' || aspect==='biquintile' || aspect==='quincunx' || aspect==='sesquiquadrate' || aspect==='semi-square' || aspect==='semi-sextile');
  const minorCap = 1.0;
  const capByClass = (cls)=>{
    if (cls==='luminary' || cls==='angle') return 6.0;
    if (cls==='point') return 3.0;
    return 4.0; // planets default
  };
  const capBodies = Math.max(capByClass(aClass), capByClass(bClass));
  const cap = isMinor ? minorCap : capBodies;
  const o = Math.abs(Number(orbDeg||0));
  if (!(o>=0)) return 0;
  if (o>=cap) return 0;
  return +(1 - (o/cap));
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
  if (type==='conjunction' && (set.has('Saturn') || set.has('Pluto') || set.has('Chiron')) && (set.has('Jupiter') || set.has('Venus'))) return -0.8; // heavy to benefic conj (may be offset)
  // Specific hard combos handled in logic using support nodes (see below)
  return 0.0;
}

// Utility: whether aspect is a hard aspect between X and Y sets
function isHardBetween(type, aName, bName, setA, setB){
  if (!(type==='square' || type==='opposition')) return false;
  const A = new Set([aName,bName]);
  return ([...setA].some(x=>A.has(x)) && [...setB].some(x=>A.has(x)));
}

// Base valence weights for Balance Channel v1.2
function balanceBaseWeight(type, aName, bName){
  const set = new Set([aName, bName]);
  if (type==='square' || type==='opposition') return -1.0;
  if (type==='trine') return +1.1;
  if (type==='sextile') return +0.8;
  if (type==='quintile' || type==='biquintile') return +0.4;
  if (type==='conjunction'){
    if (set.has('Saturn') || set.has('Pluto') || set.has('Chiron')) return -0.7;
    if (set.has('Venus') || set.has('Jupiter')) return +0.8;
  }
  return 0.0;
}

// Planetary multipliers for Balance Channel v1.2
function balancePlanetMultiplier(body){
  switch(body){
    case 'Pluto':
    case 'Saturn':
    case 'Neptune':
    case 'Uranus':
      return 1.3;
    case 'Chiron':
      return 1.1;
    case 'Jupiter':
    case 'Venus':
      return 1.2;
    case 'Moon':
      return 0.5;
    default:
      return 1.0;
  }
}

// Balance Channel v1.2 valence computation
function computeBalanceValence(dayAspects){
  if (!Array.isArray(dayAspects)) return 0;
  let v = 0;
  for (const rec of dayAspects){
    const type = normAspectName(rec.aspect || rec.type || rec._aspect);
    const a = normBody(rec.p1_name || rec.a || rec.transit);
    const b = normBody(rec.p2_name || rec.b || rec.natal);
    const orb = rec.orb != null ? rec.orb : (rec.orbit != null ? rec.orbit : rec._orb);
    const base = balanceBaseWeight(type, a, b);
    if (base === 0) continue;
    const o = orbMultiplier(type, orb, a, b);
    const s = sensitivity(a,b);
    const mA = balancePlanetMultiplier(a);
    const mB = balancePlanetMultiplier(b);
    const w = base * mA * mB * o * s;
    v += w;
  }
  // Soft normalization to -5..+5
  const K = 4.0;
  return round(5 * Math.tanh(v / K), 2);
}

// Core SFD computation (v1.2)
function computeSFD(dayAspects){
  if (!Array.isArray(dayAspects)) return { SFD: 0, Splus: 0, Sminus: 0 };

  let support = 0;
  let counter = 0;
  const supportNodes = new Set();

  // First pass: collect S+ and nodes
  for (const rec of dayAspects){
    const type = normAspectName(rec.aspect || rec.type || rec._aspect);
    const a = normBody(rec.p1_name || rec.a || rec.transit);
    const b = normBody(rec.p2_name || rec.b || rec.natal);
    const orb = rec.orb != null ? rec.orb : (rec.orbit != null ? rec.orbit : rec._orb);

    let base = baseSupportWeight(type, a,b);
    if (isMoonSaturnSoft(type, a,b)) base = Math.max(base, 1.2);
    if (isMinorSupport(type) && Math.abs(orb) <= 1.0) base = Math.max(base, 0.5);

    if (base > 0){
      const mA = planetMultiplier(a, 'support');
      const mB = planetMultiplier(b, 'support');
      const o = orbMultiplier(type, orb, a, b);
      const s = sensitivity(a,b);
      const w = base * mA * mB * o * s;
      support += Math.max(w, 0);
      supportNodes.add(a); supportNodes.add(b);
    }
  }

  const touched = (a,b)=> supportNodes.has(a) || supportNodes.has(b);

  // Second pass: collect S−
  for (const rec of dayAspects){
    const type = normAspectName(rec.aspect || rec.type || rec._aspect);
    const a = normBody(rec.p1_name || rec.a || rec.transit);
    const b = normBody(rec.p2_name || rec.b || rec.natal);
    const orb = rec.orb != null ? rec.orb : (rec.orbit != null ? rec.orbit : rec._orb);

    let base = 0;
    // base negatives
    base = Math.min(base, baseCounterWeight(type, a,b));

    // Heavy–benefic conjunction compensation: if the benefic simultaneously
    // forms a trine or sextile (≤1.5° orb) on the same day, lessen the
    // default −0.8 penalty. One supporting aspect halves the penalty, two or
    // more cancel it entirely.
    if (type==='conjunction' && base === -0.8){
      const benefic = isBenefic(a) ? a : (isBenefic(b) ? b : null);
      if (benefic){
        let comp = 0;
        for (const other of dayAspects){
          if (other === rec) continue;
          const t2 = normAspectName(other.aspect || other.type || other._aspect);
          if (!(t2==='trine' || t2==='sextile')) continue;
          const a2 = normBody(other.p1_name || other.a || other.transit);
          const b2 = normBody(other.p2_name || other.b || other.natal);
          const orb2 = other.orb != null ? other.orb : (other.orbit != null ? other.orbit : other._orb);
          const o2 = Math.abs(Number(orb2||0));
          if (o2 > 1.5) continue;
          if (a2===benefic || b2===benefic) comp++;
        }
        if (comp >= 2) base = 0;
        else if (comp >= 1) base = -0.4;
      }
    }

    // Hard aspects to S+ nodes by Saturn/Mars/Neptune → negative
    const hard = (type==='square' || type==='opposition');
    const SplusNodes = new Set([...supportNodes]);
    if (hard && (a==='Saturn' || a==='Mars' || a==='Neptune' || b==='Saturn' || b==='Mars' || b==='Neptune') && (SplusNodes.has(a) || SplusNodes.has(b))){
      base = Math.min(base, -1.1); // conservative default
    }
    // Sat/Nept hard to Moon/Mercury when Moon/Mercury in S+
    const specialTargets = new Set(['Moon','Mercury']);
    if (hard && (a==='Saturn' || a==='Neptune' || b==='Saturn' || b==='Neptune') && (specialTargets.has(a) || specialTargets.has(b)) && (SplusNodes.has('Moon') || SplusNodes.has('Mercury'))){
      base = Math.min(base, -1.1);
    }
    // Mars hard to Ven/Jup
    if (hard && (a==='Mars' || b==='Mars') && (a==='Venus' || a==='Jupiter' || b==='Venus' || b==='Jupiter')){
      base = Math.min(base, -1.2);
    }
    // Saturn hard to Venus
    if (hard && (a==='Saturn' || b==='Saturn') && (a==='Venus' || b==='Venus')){
      base = Math.min(base, -1.1);
    }

    if (base < 0){
      const mA = planetMultiplier(a, 'counter');
      const mB = planetMultiplier(b, 'counter');
      const o = orbMultiplier(type, orb, a, b);
      const s = sensitivity(a,b);
      let w = Math.abs(base) * mA * mB * o * s;
      if (!touched(a,b)) w *= 0.7; // locality factor if not touching S+ nodes
      counter += Math.max(w, 0);
    }
  }

  const K = 4.0; // normalization constant, tuneable
  const Splus  = +(5 * Math.tanh(support / K)).toFixed(2);
  const Sminus = +(5 * Math.tanh(counter / K)).toFixed(2);
  const SFD = round(clamp(Splus - Sminus, -5, 5), 2);
  return { SFD, Splus, Sminus };
}

module.exports = {
  computeSFD,
  computeBalanceValence
};

