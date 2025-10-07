// src/seismograph.js

/**
 * @typedef {Object} AspectIn
 * @property {{name?:string, body?:string} | string} [a]      // transit (alt)
 * @property {{name?:string, body?:string} | string} [b]      // natal (alt)
 * @property {{name?:string, body?:string, retrograde?:boolean, deg?:number, sign?:string}} [transit]
 * @property {{name?:string, body?:string, retrograde?:boolean, deg?:number, sign?:string}} [natal]
 * @property {string} [type]     // conjunction|square|opposition|trine|sextile
 * @property {string|number} [aspect] // alt for type
 * @property {number|string} [orb]    // degrees or "1°23'"
 * @property {number|string} [orbit]  // alt for orb
 */

/**
 * @typedef {Object} PrevContext
 * @property {Array<ScoredAspect>} [scored] // previous day's scored aspects
 * @property {number} [Y_effective]         // previous day's Y_effective (after asymmetry)
 */

/**
 * @typedef {Object} ScoredAspect
 * @property {{body:string}} transit
 * @property {{body:string}} natal
 * @property {string} type
 * @property {number} orbDeg
 * @property {number} S
 */

const {
  scaleUnipolar,
  scaleBipolar,
  scaleCoherenceFromVol,
  scaleSFD,
  amplifyByMagnitude,
  normalizeAmplifiedBias,
  normalizeVolatilityForCoherence,
  SPEC_VERSION,
  SCALE_FACTOR,
} = require('../lib/balance/scale-bridge');
const { assertSeismographInvariants } = require('../lib/balance/assertions');
const { applyGeometryAmplification } = require('../lib/balance/amplifiers');

const OUTER = new Set(["Saturn","Uranus","Neptune","Pluto"]);
const PERSONAL = new Set(["Sun","Moon","Mercury","Venus","Mars","ASC","MC","IC","DSC"]);
const ANGLES = new Set(["ASC","MC","IC","DSC"]);

const DEFAULTS = {
  magnitudeDivisor: 4,               
  hubBonusCap: 0.6,                  
  sameTargetBonusCap: 0.3,           
  tightBandDeg: 1.5,                 
  outerTightenStep: 0.2,             
  uranusTightFlagDeg: 3.0,
  // Enhanced volatility settings
  fastComponentThreshold: 1.0,       // orb threshold for fast-moving aspects (Moon-Mercury/Mars)
  rollingWindowDays: 14,             // magnitude normalization window
  hookStackCap: 5,                   // max hooks to surface in summary
  // Planetary weights for volatility dispersion
  planetaryWeights: {
    'Sun': 1.2, 'Moon': 1.5, 'ASC': 1.3, 'MC': 1.3, 'IC': 1.1, 'DSC': 1.1,
    'Mercury': 1.0, 'Venus': 1.0, 'Mars': 1.1, 'Jupiter': 0.9,
    'Saturn': 0.8, 'Uranus': 0.7, 'Neptune': 0.6, 'Pluto': 0.6,
    'Chiron': 0.8, 'Mean_Node': 0.7, 'Mean_South_Node': 0.7
  }
};

function round(n, p=2){ return Math.round(n * (10**p)) / (10**p); }
function asNum(x, fallback=NaN){
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const m = x.match(/(-?\d+)(?:[°:\s]+(\d+))?/); 
    if (m){ const d = +m[1]; const min = m[2] ? +m[2] : 0; return d + min/60; }
    const f = parseFloat(x); return Number.isFinite(f) ? f : fallback;
  }
  return fallback;
}
function nameOf(node){ if (!node) return undefined; return typeof node==="string" ? node : (node.name || node.body); }

function normalizeAspect(a){
  const tName = nameOf(a?.transit) || nameOf(a?.a);
  const nName = nameOf(a?.natal)   || nameOf(a?.b);
  const type  = String(a?.type || a?.aspect || "").toLowerCase();
  const orbDeg = asNum(a?.orb ?? a?.orbit, 6.01);
  const retrograde = !!(a?.transit?.retrograde);
  return { transit:{body:tName||"?", retrograde}, natal:{body:nName||"?"}, type, orbDeg };
}

// ---------- per-aspect S = v × p × o × s ----------
function baseValence(type, tBody, nBody){
  const isHard = type === "square" || type === "opposition";
  const isAngle = ANGLES.has(nBody);
  const isLuminary = nBody === "Sun" || nBody === "Moon";

  switch (type){
    case "opposition": return -1.6;
    case "square": return -1.4;
    case "trine": return +0.8;
    case "sextile": return +0.5;
    case "conjunction":{
      const set = new Set([tBody, nBody]);
      if (OUTER.has(tBody) || OUTER.has(nBody) || isAngle || isLuminary) {
        return -1.2; // Hard conjunction
      }
      if (set.has("Venus") || set.has("Jupiter")) return +0.6;
      if (set.has("Saturn") || set.has("Pluto") || set.has("Chiron")) return -0.8;
      return 0.2; // Default neutral-ish
    }
    default: return 0.0;
  }
} 

function planetTier(body){
  if (body==="Chiron") return 1.2;
  if (OUTER.has(body)) return 1.5;
  if (body==="Moon") return 0.5;
  return 1.0;
} 

function orbMultiplier(orbDeg, type) {
  const o = Math.abs(orbDeg);
  const isHard = type === 'square' || type === 'opposition' || type === 'conjunction';

  if (isHard) {
    // Hard aspects: full weight 0-1°, taper to 0 at 3°
    if (o <= 1.0) return 1.5; // Strongest impact
    if (o <= 2.0) return 1.3;
    if (o <= 3.0) return 1.1;
    return 0.6;
  } else {
    // Soft aspects: full weight 0-0.6°, taper to 0 at 2°
    if (o <= 0.6) return 1.5;
    if (o <= 1.2) return 1.3;
    if (o <= 2.0) return 1.1;
    return 0.6;
  }
} 

function sensitivityMultiplier(natalBody, isAngle=false, isLum=false, critical=false){
  let s = 1.0;
  if (isAngle) s *= 1.3;
  else if (isLum) s *= 1.2;
  else if (PERSONAL.has(natalBody)) s *= 1.1;
  if (critical) s *= 1.1;
  return s;
} 

function median(values = []) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function scoreAspect(inA, flags={}){
  const a = normalizeAspect(inA);
  const tBody = a.transit.body, nBody = a.natal.body;
  const v = baseValence(a.type, tBody, nBody);
  const p = Math.max(planetTier(tBody), planetTier(nBody));
  const o = orbMultiplier(a.orbDeg, a.type);
  const s = sensitivityMultiplier(nBody, !!flags.isAngleProx, (nBody==="Sun"||nBody==="Moon"), !!flags.critical);
  let S = v * p * o * s;

  // Outer-planet/angle multipliers
  const isHard = a.type === 'square' || a.type === 'opposition' || (a.type === 'conjunction' && v < 0);
  if (isHard) {
    const tIsOuter = OUTER.has(tBody);
    const nIsOuter = OUTER.has(nBody);
    const isOuterInteraction = (tIsOuter && !nIsOuter) || (!tIsOuter && nIsOuter);

    if (isOuterInteraction) {
      const nIsAngle = ANGLES.has(nBody);
      const nIsLuminary = nBody === 'Sun' || nBody === 'Moon';
      const nIsPersonal = PERSONAL.has(nBody) && !nIsAngle && !nIsLuminary;

      if (nIsAngle || nIsLuminary) {
        S *= 1.40; // +40%
      } else if (nIsPersonal) {
        S *= 1.25; // +25%
      }
    }
  }

  // Retrograde moderation: -10% to soft aspects if transit is retrograde
  if (a.transit.retrograde && (a.type === 'trine' || a.type === 'sextile')) {
    S *= 0.90;
  }

  return { ...a, S };
}

// ---------- stacking bonuses for Magnitude ----------
function multiplicityBonus(scored, opts=DEFAULTS){
  let hub = 0, target = 0;

  const byTransit = new Map();
  for (const x of scored){ const k = x.transit.body; byTransit.set(k,(byTransit.get(k)||0)+1); }
  for (const [,n] of byTransit) if (n>=3) hub += 0.2*(n-2);
  hub = Math.min(opts.hubBonusCap, hub);

  const byTarget = new Map();
  for (const x of scored){ const k = x.natal.body; byTarget.set(k,(byTarget.get(k)||0)+1); }
  for (const [,m] of byTarget) if (m>=2) target += 0.1*(m-1);
  target = Math.min(opts.sameTargetBonusCap, target);

  return hub + target;
} 

// ---------- Enhanced Volatility Index (weighted dispersion) ----------
function volatility(scoredToday, prevCtx=null, opts=DEFAULTS){
  let A=0,B=0,C=0,D=0;
  const key = (x)=>`${x.transit.body}|${x.natal.body}|${x.type}`;

  // A: Tight aspects entering/leaving
  if (prevCtx?.scored){
    const tight = arr => arr.filter(x=>x.orbDeg <= opts.tightBandDeg);
    const prevTight = new Set(tight(prevCtx.scored).map(key));
    const nowTight  = new Set(tight(scoredToday).map(key));
    for (const k of nowTight) if (!prevTight.has(k)) A++;
    for (const k of prevTight) if (!nowTight.has(k)) A++;
  }

  // B: Valence sign flip 
  if (typeof prevCtx?.Y_effective === "number"){
    const prevY = prevCtx.Y_effective;
    const nowY  = scoredToday.reduce((s,x)=>s+x.S,0);
    if (Math.sign(prevY) !== Math.sign(nowY) && Math.abs(prevY)>0.05 && Math.abs(nowY)>0.05) B = 1;
  }

  // C: Outer planet hard aspects tightening
  if (prevCtx?.scored){
    const prevMap = new Map(prevCtx.scored.map(x=>[key(x),x]));
    for (const cur of scoredToday){
      const pX = prevMap.get(key(cur));
      const isOuterHard = (OUTER.has(cur.transit.body) || OUTER.has(cur.natal.body)) &&
                          (cur.type==="square" || cur.type==="opposition");
      if (pX && isOuterHard && (pX.orbDeg - cur.orbDeg) >= opts.outerTightenStep) C++;
    }
  }

  // D: Uranus exact activation
  if (scoredToday.some(x => (x.transit.body==="Uranus" || x.natal.body==="Uranus") && x.orbDeg <= opts.uranusTightFlagDeg)) D = 1;

  // Enhanced: Add weighted valence dispersion component
  const weightedValences = scoredToday.map(x => {
    const transitWeight = opts.planetaryWeights[x.transit.body] || 0.5;
    const natalWeight = opts.planetaryWeights[x.natal.body] || 0.5;
    const combinedWeight = Math.max(transitWeight, natalWeight);
    return x.S * combinedWeight;
  });

  let E = 0; // Dispersion component
  if (weightedValences.length >= 3) {
    const mean = weightedValences.reduce((s, v) => s + v, 0) / weightedValences.length;
    const variance = weightedValences.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / weightedValences.length;
    const stdDev = Math.sqrt(variance);
    E = Math.min(2, stdDev * 0.5); // Scale to 0-2 range
  }

  return A + B + C + D + Math.round(E);
} 

// ---------- Rolling magnitude normalization with fallback scaling ----------
function normalizeWithRollingWindow(magnitude, rollingContext = null, opts = DEFAULTS) {
  // System prior from original spec (X = min(5, X_raw/4)), i.e., a "typical" day
  const X_prior = 4.0;
  const epsilon = 1e-6;
  
  if (!rollingContext || !rollingContext.magnitudes || rollingContext.magnitudes.length < 1) {
    // No context at all, use original magnitude
    return magnitude;
  }
  
  const { magnitudes } = rollingContext;
  const n = magnitudes.length;
  
  // Calculate blend weight: λ = n/14 (cap to [0,1])
  const lambda = Math.min(1, n / 14);
  
  let X_ref;
  
  if (n >= 14) {
    // Full window: use median of last 14 days
    const sorted = [...magnitudes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    X_ref = sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : 
      sorted[mid];
  } else if (n >= 2) {
    // Thin slice: blend available median with system prior
    const sorted = [...magnitudes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median_available = sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : 
      sorted[mid];
    
    X_ref = lambda * median_available + (1 - lambda) * X_prior;
  } else {
    // n = 1: use system prior
    X_ref = X_prior;
  }
  
  // Ensure X_ref is not too small to avoid division issues
  if (X_ref < epsilon) X_ref = X_prior;
  
  // Apply magnitude formula: magnitude = clip(5 * X_raw / (X_ref * 1.6), 0, 10)
  const normalized = Math.max(0, Math.min(10, 5 * magnitude / (X_ref * 1.6)));
  
  return normalized;
}

// ---------- SFD (Support-Friction Differential) calculation ----------
function calculateSFD(scored){
  if (!scored || scored.length === 0) return null;
  
  let sumSupport = 0;
  let sumFriction = 0;
  
  for (const aspect of scored) {
    const S = aspect.S;
    if (S > 0) {
      sumSupport += S;
    } else if (S < 0) {
      sumFriction += Math.abs(S);
    }
  }
  
  const total = sumSupport + sumFriction;
  if (total === 0) return null; // No drivers, return null (not fabricated zero)
  
  const sfd = (sumSupport - sumFriction) / total;
  return round(sfd, 2); // Always two decimals
}

// ---------- main aggregate ----------
function aggregate(aspects = [], prevCtx = null, options = {}){
  if (!Array.isArray(aspects) || aspects.length === 0){
    return { 
      magnitude: 0, 
      directional_bias: prevCtx?.Y_effective ? round(prevCtx.Y_effective,2) : 0, 
      volatility: 0, 
      coherence: 5.0,
      sfd: null, // No aspects = no SFD
      scored: [],
      transform_trace: {
        pipeline: 'empty_aspect_array',
        spec_version: SPEC_VERSION,
        canonical_scalers_used: true,
        clamp_events: []
      },
      magnitude_normalized: 0,
      bias_normalized: 0,
      bias_amplified: 0,
      coherence_normalized: 0,
      rawMagnitude: 0,
      rawValence: 0,
      originalMagnitude: 0,
    };
  }
  const opts = { ...DEFAULTS, ...options };

  const scored = aspects.map(a => scoreAspect(a, {
    isAngleProx: ANGLES.has((a?.natal?.body||a?.b?.name||a?.b)||""),
    critical: false
  }));

  // Apply geometry amplification before normalization
  scored.forEach(a => {
    a.S = applyGeometryAmplification(a.S, {
      type: a.type,
      orbDeg: a.orbDeg,
      p1: a.transit.body,
      p2: a.natal.body
    });
  });

  // Supportive cap in crisis - v2, more specific trigger
  const hardOuterHits = scored.filter(a => {
    const isHard = a.type === 'square' || a.type === 'opposition' || (a.type === 'conjunction' && a.S < 0);
    const isOuterTransit = OUTER.has(a.transit.body);
    return isHard && isOuterTransit && a.orbDeg <= 2.0;
  });

  const hardAngleHits = scored.filter(a => {
    const isHard = a.type === 'square' || a.type === 'opposition' || (a.type === 'conjunction' && a.S < 0);
    const isToAngle = a.natal.body === 'ASC' || a.natal.body === 'MC';
    return isHard && isToAngle && a.orbDeg <= 2.0;
  });

  const crisisConditionsMet = hardOuterHits.length >= 2 || hardAngleHits.length > 0;

  let totalPositiveS = 0;
  let totalNegativeS = 0;
  scored.forEach(a => {
    if (a.S > 0) totalPositiveS += a.S;
    else totalNegativeS += a.S;
  });

  if (crisisConditionsMet) {
    const cap = Math.abs(totalNegativeS) * 0.6;
    if (totalPositiveS > cap) {
      const reductionFactor = cap / totalPositiveS;
      scored.forEach(a => {
        if (a.S > 0) a.S *= reductionFactor;
      });
    }
  }

  const X_raw = scored.reduce((acc, x) => acc + Math.abs(x.S), 0);
  const Y_raw = scored.reduce((acc, x) => acc + x.S, 0);

  // === MAGNITUDE ===
  const magnitudeNormalized = Math.min(1, (X_raw / opts.magnitudeDivisor) / SCALE_FACTOR);
  const magnitudeScaled = scaleUnipolar(magnitudeNormalized);
  const magnitudeValue = magnitudeScaled.value;

  // === DIRECTIONAL BIAS ===
  const Y_amplified = amplifyByMagnitude(Y_raw, magnitudeValue);
  const Y_normalized = normalizeAmplifiedBias(Y_amplified);
  const biasScaled = scaleBipolar(Y_normalized);
  const directional_bias = biasScaled.value;

  // === VOLATILITY & COHERENCE ===
  const VI = volatility(scored, prevCtx, opts);
  const VI_normalized = normalizeVolatilityForCoherence(VI);
  const coherenceScaled = scaleCoherenceFromVol(VI_normalized);
  const coherence = coherenceScaled.value;
  
  // === SFD (Integration Bias) ===
  const sfd_raw = calculateSFD(scored);
  const sfdScaled = scaleSFD(sfd_raw, true);
  const sfd = sfdScaled.value;

  // Transform trace for observability
  const transform_trace = {
    pipeline: 'amplify-geometry → sum → amplify-magnitude → normalize → ×5 → clamp → round',
    spec_version: SPEC_VERSION,
    canonical_scalers_used: true,
    steps: [
      { stage: 'raw', magnitude_energy: X_raw, directional_bias_sum: Y_raw, volatility_index: VI },
      { stage: 'amplified', magnitude_energy: X_raw, directional_bias_sum: Y_amplified, volatility_index: VI },
      { stage: 'normalized', magnitude: magnitudeNormalized, bias: Y_normalized, volatility: VI_normalized, sfd: sfd_raw },
      { stage: 'scaled', magnitude: magnitudeScaled.raw, directional_bias: biasScaled.raw, coherence: coherenceScaled.raw, sfd: sfdScaled.raw },
      { stage: 'final', magnitude: magnitudeValue, directional_bias, coherence, sfd }
    ],
    clamp_events: [
      ...(biasScaled.flags.hitMin || biasScaled.flags.hitMax ? [{ axis: 'directional_bias', raw: biasScaled.raw, clamped: directional_bias }] : []),
      ...(coherenceScaled.flags.hitMin || coherenceScaled.flags.hitMax ? [{ axis: 'coherence', raw: coherenceScaled.raw, clamped: coherence }] : []),
      ...(magnitudeScaled.flags.hitMin || magnitudeScaled.flags.hitMax ? [{ axis: 'magnitude', raw: magnitudeScaled.raw, clamped: magnitudeValue }] : []),
      ...(sfdScaled.flags.hitMin || sfdScaled.flags.hitMax ? [{ axis: 'sfd', raw: sfdScaled.raw, clamped: sfd }] : []),
    ]
  };

  const result = {
    magnitude: magnitudeValue,
    directional_bias,
    volatility: round(VI, 2),
    coherence,
    sfd,
    scored,
    transform_trace,
    magnitude_normalized: magnitudeNormalized,
    bias_normalized: Y_normalized,
    bias_amplified: Y_amplified,
    coherence_normalized: VI_normalized,
    rawMagnitude: magnitudeScaled.raw,
    rawValence: Y_raw,
    originalMagnitude: magnitudeValue,
  };

  assertSeismographInvariants({
    magnitude: result.magnitude,
    directional_bias: result.directional_bias,
    coherence: result.coherence,
    sfd: result.sfd,
  });

  return result;
}

module.exports = {
  aggregate,
  calculateSeismograph: aggregate, // Alias for test compatibility
  _internals: {
    normalizeAspect, baseValence, planetTier, orbMultiplier, sensitivityMultiplier,
    scoreAspect, multiplicityBonus, volatility, normalizeWithRollingWindow, median,
    calculateSFD // Export for testing
  }
};
