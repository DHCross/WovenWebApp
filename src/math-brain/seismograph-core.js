// src/math-brain/seismograph-core.js

/**
 * Core Seismograph Aggregator (canonical)
 *
 * This module provides the aggregate() function and internal helpers used by the
 * seismograph engine. It was migrated from src/seismograph.js to live under the
 * math-brain namespace so the engine no longer depends on the legacy path.
 */

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
  amplifyByMagnitude,
  normalizeAmplifiedBias,
  SPEC_VERSION,
  SCALE_FACTOR,
  getMagnitudeLabel,
  getDirectionalBiasLabel,
} = require('../../lib/balance/scale-bridge');
const { assertSeismographInvariants } = require('../../lib/balance/assertions');
const { applyGeometryAmplification } = require('../../lib/balance/amplifiers');
const { classifyVolatility } = require('../../lib/reporting/metric-labels');

const OUTER = new Set(["Saturn","Uranus","Neptune","Pluto"]);
const PERSONAL = new Set(["Sun","Moon","Mercury","Venus","Mars","ASC","MC","IC","DSC"]);
const ANGLES = new Set(["ASC","MC","IC","DSC"]);

const DEFAULTS = {
  magnitudeDivisor: 2,  // Reduced from 8 - averaging handles multiple aspects naturally
  hubBonusCap: 0.6,
  sameTargetBonusCap: 0.3,
  tightBandDeg: 1.5,
  outerTightenStep: 0.2,
  uranusTightFlagDeg: 3.0,
  crisisSupportiveCap: 0.6,          // cap supportive aspects to 60% of friction during crisis
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
    case "opposition": return -1.0;
    case "square": return -0.85;
    case "trine": return +0.9;
    case "sextile": return +0.55;
    case "quincunx":
    case "inconjunct": return -0.35;
    case "semisextile": return +0.2;
    case "conjunction":{
      const set = new Set([tBody, nBody]);
      if (OUTER.has(tBody) || OUTER.has(nBody) || isAngle || isLuminary) {
        return -1.0; // Hard conjunction
      }
      if (set.has("Venus") || set.has("Jupiter")) return +1.0;
      if (set.has("Saturn") || set.has("Pluto") || set.has("Chiron")) return -1.0;
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
  const isHard = type === 'square' || type === 'opposition';

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
function normalizeWithRollingWindow(magnitude, rollingContext = null, opts = DEFAULTS, diagnosticMode = false) {
  // System prior from original spec (X = min(5, X_raw/divisor)), i.e., a "typical" day
  const X_prior = opts.magnitudeDivisor;
  const epsilon = 1e-6;

  if (!rollingContext || !rollingContext.magnitudes || rollingContext.magnitudes.length < 1) {
    // No context at all, use original magnitude
    if (diagnosticMode) {
      logDiagnostics({
        step: 'ROLLING_WINDOW_MISSING',
        warning: 'No rolling context provided - using raw magnitude',
        magnitude_raw: magnitude,
        magnitude_returned: magnitude,
        fallback_divisor: X_prior
      }, { label: 'ROLLING_WINDOW', enableDiagnostics: true });
    }
    return magnitude;
  }

  const { magnitudes } = rollingContext;
  const n = magnitudes.length;

  // Calculate blend weight: λ = n/14 (cap to [0,1])
  const lambda = Math.min(1, n / 14);

  let X_ref;
  let windowMethod;

  if (n >= 14) {
    // Full window: use median of last 14 days
    const sorted = [...magnitudes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    X_ref = sorted.length % 2 === 0 ?
      (sorted[mid - 1] + sorted[mid]) / 2 :
      sorted[mid];
    windowMethod = 'full_window_median';
  } else if (n >= 2) {
    // Thin slice: blend available median with system prior
    const sorted = [...magnitudes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median_available = sorted.length % 2 === 0 ?
      (sorted[mid - 1] + sorted[mid]) / 2 :
      sorted[mid];

    X_ref = lambda * median_available + (1 - lambda) * X_prior;
    windowMethod = 'partial_window_blend';
  } else {
    // n = 1: use system prior
    X_ref = X_prior;
    windowMethod = 'single_day_prior';
  }

  // Ensure X_ref is not too small to avoid division issues
  if (X_ref < epsilon) X_ref = X_prior;

  // Apply magnitude formula: magnitude = clip(5 * X_raw / (X_ref * 1.6), 0, 10)
  const normalized = Math.max(0, Math.min(10, 5 * magnitude / (X_ref * 1.6)));

  // === DIAGNOSTIC LOGGING ===
  if (diagnosticMode) {
    logDiagnostics({
      step: 'ROLLING_WINDOW_NORMALIZATION',
      method: windowMethod,
      window_size: n,
      window_contents: magnitudes,
      window_stats: {
        min: Math.min(...magnitudes),
        max: Math.max(...magnitudes),
        avg: magnitudes.reduce((a, b) => a + b, 0) / n
      },
      calculation: {
        magnitude_raw: magnitude,
        X_prior: X_prior,
        X_ref: X_ref,
        lambda: lambda,
        normalized: normalized,
        formula: `clip(5 * ${magnitude} / (${X_ref} * 1.6), 0, 10) = ${normalized}`
      },
      warning: X_ref === X_prior ? 'Using fallback divisor (X_ref too small or n=1)' : null
    }, { label: 'ROLLING_WINDOW', enableDiagnostics: true });
  }

  return normalized;
}

// ---------- Diagnostic Logger ----------
function logDiagnostics(data, options = {}) {
  if (!options.enableDiagnostics) return;

  const label = options.label || 'DIAGNOSTIC';
  const prefix = `[${label}]`;

  if (options.table) {
    /* eslint-disable-next-line no-console */
    console.table(data);
  } else {
    /* eslint-disable-next-line no-console */
    console.log(prefix, JSON.stringify(data, null, 2));
  }
}

// ---------- main aggregate ----------
function aggregate(aspects = [], prevCtx = null, options = {}){
  const diagnosticMode = options.enableDiagnostics || false;

  // === STEP 1: Aspect Input Validation ===
  if (diagnosticMode) {
    logDiagnostics({
      step: 'ASPECT_INPUT_VALIDATION',
      received_count: aspects.length,
      is_array: Array.isArray(aspects),
      has_prev_context: !!prevCtx,
      sample_aspects: aspects.slice(0, 3).map(a => ({
        transit: nameOf(a?.transit) || nameOf(a?.a),
        natal: nameOf(a?.natal) || nameOf(a?.b),
        type: a?.type || a?.aspect,
        orb: a?.orb ?? a?.orbit
      }))
    }, { label: 'INPUT', enableDiagnostics: true });
  }

  if (!Array.isArray(aspects) || aspects.length === 0){
    if (diagnosticMode) {
      logDiagnostics({
        step: 'EMPTY_ASPECT_ARRAY',
        warning: 'No aspects provided - returning zero values'
      }, { label: 'WARNING', enableDiagnostics: true });
    }
    return {
      magnitude: 0,
      directional_bias: prevCtx?.Y_effective ? round(prevCtx.Y_effective,2) : 0,
      _diagnostics: {
        volatility: 0,
        volatility_normalized: 0,
        aspect_count: 0,
        warnings: ['empty_aspect_array']
      },
      scored: [],
      transform_trace: {
        pipeline: 'empty_aspect_array',
        spec_version: '5.0',
        canonical_scalers_used: true,
        axes_count: 2,
        clamp_events: []
      },
      magnitude_normalized: 0,
      bias_normalized: 0,
      bias_amplified: 0,
      rawMagnitude: 0,
      rawValence: 0,
      originalMagnitude: 0,
      energyMagnitude: 0,
      biasEnergy: 0,
    };
  }
  const opts = { ...DEFAULTS, ...options };

  const scored = aspects.map(a => scoreAspect(a, {
    isAngleProx: ANGLES.has((a?.natal?.body||a?.b?.name||a?.b)||""),
    critical: false
  }));

  // === STEP 2: Aspect Scoring & Filtering Diagnostics ===
  if (diagnosticMode) {
    const scoredSample = scored.slice(0, 5).map(a => ({
      transit: a.transit.body,
      natal: a.natal.body,
      type: a.type,
      orbDeg: round(a.orbDeg, 2),
      S_initial: round(a.S, 3)
    }));

    logDiagnostics({
      step: 'ASPECT_SCORING',
      total_aspects: scored.length,
      score_distribution: {
        positive: scored.filter(a => a.S > 0).length,
        negative: scored.filter(a => a.S < 0).length,
        near_zero: scored.filter(a => Math.abs(a.S) < 0.1).length
      },
      score_range: {
        min: Math.min(...scored.map(a => a.S)),
        max: Math.max(...scored.map(a => a.S)),
        avg: scored.reduce((sum, a) => sum + a.S, 0) / scored.length
      },
      sample_scored_aspects: scoredSample
    }, { label: 'SCORING', enableDiagnostics: true });
  }

  // Apply geometry amplification before normalization
  scored.forEach(a => {
    const S_before = a.S;
    a.S = applyGeometryAmplification(a.S, {
      type: a.type,
      orbDeg: a.orbDeg,
      p1: a.transit.body,
      p2: a.natal.body
    });

    // Log amplification for diagnostic mode
    if (diagnosticMode && Math.abs(a.S - S_before) > 0.01) {
      a._amplification = {
        before: round(S_before, 3),
        after: round(a.S, 3),
        factor: round(a.S / S_before, 3)
      };
    }
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
    const cap = Math.abs(totalNegativeS) * opts.crisisSupportiveCap;
    if (totalPositiveS > cap) {
      const reductionFactor = cap / totalPositiveS;
      scored.forEach(a => {
        if (a.S > 0) a.S *= reductionFactor;
      });
    }
  }

  // Average to measure density, then apply nonlinear gain so crises still register
  const count = scored.length || 1;
  const avgMagnitude = scored.reduce((acc, x) => acc + Math.abs(x.S), 0) / count;
  const avgBias = scored.reduce((acc, x) => acc + x.S, 0) / count;

  const aspectGain = Math.log(count + 1); // diminishing returns as complexity grows
  const X_raw = avgMagnitude > 0 ? Math.pow(avgMagnitude, 1.3) * aspectGain : 0;
  
  // Steeper sigmoidal boost for bias - restores crisis detection without blowout
  const Y_raw = avgBias !== 0
    ? Math.sign(avgBias) * Math.tanh(Math.pow(Math.abs(avgBias) * 3, 1.8)) * aspectGain * 3.2
    : 0;

  // === MAGNITUDE ===
  // v5.0: Absolute 0-5 scale with SCALE_FACTOR = 5
  // Pipeline: normalize → scale (×5) → clamp → round
  // This puts the full range [0,5] directly in float precision without intermediate factor-10 multiplier
  
  // FIX [2025-10-08]: Dynamic normalization using rolling context or aspect count
  // Prevents saturation in high-aspect-count scenarios (relational charts, transiting aspects)
  
  const aspectCount = scored.length;
  const rollingContext = options.rollingContext || null;
  
  let effectiveDivisor = opts.magnitudeDivisor; // default 4
  let scalingMethod = 'static_divisor';
  let magnitudeNormalized;
  
  // Simple normalization - averaging already handles multiple aspects
  if (rollingContext && rollingContext.magnitudes && rollingContext.magnitudes.length >= 2) {
    // Dynamic normalization based on recent magnitude history
    const normalizedViaDynamic = normalizeWithRollingWindow(X_raw, rollingContext, opts, diagnosticMode);
    // normalizeWithRollingWindow returns a 0-10 scaled value, convert to 0-1 for scaleUnipolar
    magnitudeNormalized = normalizedViaDynamic / 10;
    scalingMethod = `rolling_window_n${rollingContext.magnitudes.length}`;
  } else {
    // Simple static divisor - averaging makes aspect count irrelevant
    magnitudeNormalized = Math.min(1, X_raw / effectiveDivisor);
    scalingMethod = 'static_divisor';
  }

  // === STEP 4: Magnitude Normalization Diagnostics ===
  if (diagnosticMode) {
    logDiagnostics({
      step: 'MAGNITUDE_NORMALIZATION',
      scaling_method: scalingMethod,
      aspect_count: aspectCount,
      raw_values: {
        X_raw: round(X_raw, 3),
        Y_raw: round(Y_raw, 3)
      },
      normalization: {
        effective_divisor: round(effectiveDivisor, 2),
        magnitude_normalized: round(magnitudeNormalized, 4),
        formula: `min(1, ${round(X_raw, 2)} / ${round(effectiveDivisor, 2)}) = ${round(magnitudeNormalized, 4)}`
      }
    }, { label: 'MAGNITUDE_NORM', enableDiagnostics: true });
  }

  const magnitudeScaled = scaleUnipolar(magnitudeNormalized);
  const magnitudeValue = Math.max(0, Math.min(SCALE_FACTOR, magnitudeScaled.value));

  // === DIRECTIONAL BIAS ===
  const Y_amplified = amplifyByMagnitude(Y_raw, magnitudeValue);
  const Y_normalized = normalizeAmplifiedBias(Y_amplified);
  const biasScaled = scaleBipolar(Y_normalized);
  const directional_bias = biasScaled.value;

  // === STEP 5: Bias Normalization & Clamping Diagnostics ===
  if (diagnosticMode) {
    logDiagnostics({
      step: 'BIAS_NORMALIZATION',
      pipeline: 'raw → amplified → normalized → scaled → clamped',
      values: {
        Y_raw: round(Y_raw, 3),
        Y_amplified: round(Y_amplified, 3),
        Y_normalized: round(Y_normalized, 4),
        bias_scaled_raw: round(biasScaled.raw, 3),
        directional_bias_final: round(directional_bias, 2)
      },
      amplification: {
        magnitude_value: round(magnitudeValue, 2),
        amplification_factor: round(Y_amplified / (Y_raw || 1), 3)
      },
      clamping: {
        hitMin: biasScaled.flags.hitMin,
        hitMax: biasScaled.flags.hitMax,
        was_clamped: biasScaled.flags.hitMin || biasScaled.flags.hitMax,
        clamped_amount: biasScaled.flags.hitMin || biasScaled.flags.hitMax ?
          round(Math.abs(biasScaled.raw - directional_bias), 3) : 0
      }
    }, { label: 'BIAS_NORM', enableDiagnostics: true });
  }

  // === VOLATILITY (DIAGNOSTIC ONLY - not a public axis in v5.0) ===
  const VI = volatility(scored, prevCtx, opts);
  // Keep VI_normalized for internal diagnostics, but don't expose coherence as public axis
  const VI_normalized = Math.min(1, VI / 50); // Simple normalization for diagnostics
  const volatility_scaled = Math.max(
    0,
    Math.min(SCALE_FACTOR, VI_normalized * SCALE_FACTOR)
  );

  // Transform trace for observability (v5.0 - two axes only)
  const transform_trace = {
    pipeline: 'normalize_scale_clamp_round',
    spec_version: '5.0',
    canonical_scalers_used: true,
    axes_count: 2, // v5.0: Magnitude + Directional Bias only
    steps: [
      { stage: 'raw', magnitude_energy: X_raw, directional_bias_sum: Y_raw, volatility_index: VI },
      { stage: 'amplified', magnitude_energy: X_raw, directional_bias_sum: Y_amplified, volatility_index: VI },
      { stage: 'normalized', magnitude: magnitudeNormalized, bias: Y_normalized, volatility: VI_normalized },
      { stage: 'scaled', magnitude: magnitudeScaled.raw, directional_bias: biasScaled.raw },
      { stage: 'final', magnitude: magnitudeValue, directional_bias }
    ],
    clamp_events: [
      ...(biasScaled.flags.hitMin || biasScaled.flags.hitMax ? [{ axis: 'directional_bias', raw: biasScaled.raw, clamped: directional_bias }] : []),
      ...(magnitudeScaled.flags.hitMin || magnitudeScaled.flags.hitMax ? [{ axis: 'magnitude', raw: magnitudeScaled.raw, clamped: magnitudeValue }] : []),
    ]
  };

  const magnitudeRounded = round(magnitudeValue, 1);
  const directionalBiasRounded = round(directional_bias, 1);
  const volatilityRounded = round(volatility_scaled, 1);

  const magnitudeLabel = getMagnitudeLabel(magnitudeValue) || null;
  const directionalBiasLabel = getDirectionalBiasLabel(directional_bias) || null;
  const volatilityInfo = Number.isFinite(volatilityRounded)
    ? classifyVolatility(volatilityRounded)
    : null;
  const volatilityLabel = volatilityInfo?.label || null;

  const magnitudeRange = [0, SCALE_FACTOR];
  const magnitudeClamped = magnitudeScaled.flags.hitMin || magnitudeScaled.flags.hitMax;
  const scalingConfidence = rollingContext?.magnitudes
    ? Math.min(1, rollingContext.magnitudes.length / 14)
    : 0;

  const result = {
    // === PUBLIC AXES (v5.0 - Two Only) ===
    magnitude: magnitudeRounded,
    directional_bias: directionalBiasRounded,
    axes: {
      magnitude: { value: magnitudeRounded, normalized: magnitudeNormalized, scaled: magnitudeScaled.raw, raw: X_raw },
      directional_bias: { value: directionalBiasRounded, normalized: Y_normalized, scaled: biasScaled.raw, raw: Y_raw },
      volatility: { value: volatilityRounded, normalized: VI_normalized, scaled: volatility_scaled, raw: VI }
    },

    // === DIAGNOSTIC/INTERNAL (not public axes) ===
    _diagnostics: {
      volatility: round(VI, 2),
      volatility_normalized: VI_normalized,
      aspect_count: scored.length,
      scaling_method: scalingMethod,
      effective_divisor: effectiveDivisor
    },

    // === INTERNAL USE ===
    scored,
    transform_trace,
    magnitude_normalized: magnitudeNormalized,
    bias_normalized: Y_normalized,
    bias_amplified: Y_amplified,
    rawMagnitude: magnitudeScaled.raw,
    rawDirectionalBias: biasScaled.raw,
    volatility: volatilityRounded,
    volatility_label: volatilityLabel,
    volatility_scaled,
    rawValence: Y_raw,
    originalMagnitude: magnitudeValue,
    energyMagnitude: X_raw,
    biasEnergy: Y_raw,

    // === Legacy compatibility fields (v4 schema) ===
    magnitude_label: magnitudeLabel,
    magnitude_meta: null,
    magnitude_range: magnitudeRange,
    magnitude_method: scalingMethod,
    magnitude_clamped: magnitudeClamped,
    directional_bias_label: directionalBiasLabel,
    raw_axes: {
      magnitude: magnitudeScaled.raw,
      bias_signed: biasScaled.raw,
      volatility: volatility_scaled
    },
    saturation: magnitudeRounded >= (SCALE_FACTOR - 0.05),
    scaling_strategy: scalingMethod,
    scaling_confidence: scalingConfidence,
    magnitude_state: {
      value: magnitudeRounded,
      label: magnitudeLabel,
      range: magnitudeRange,
      clamped: magnitudeClamped,
      meta: null,
      method: scalingMethod
    },
    version: 'v5.0'
  };

  // === STEP 6: Final Summary Diagnostics ===
  if (diagnosticMode) {
    const clampWarnings = [];
    if (magnitudeScaled.flags.hitMin || magnitudeScaled.flags.hitMax) {
      clampWarnings.push(`MAGNITUDE clamped: raw=${round(magnitudeScaled.raw, 2)} → final=${round(magnitudeValue, 2)}`);
    }
    if (biasScaled.flags.hitMin || biasScaled.flags.hitMax) {
      clampWarnings.push(`BIAS clamped: raw=${round(biasScaled.raw, 2)} → final=${round(directional_bias, 2)}`);
    }

    const variabilityCheck = {
      magnitude_at_boundary: magnitudeValue === 0 || magnitudeValue === 5,
      bias_at_boundary: directional_bias === -5 || directional_bias === 5,
      potential_stuck_values: (magnitudeValue === 0 || magnitudeValue === 5) &&
                               (directional_bias === -5 || directional_bias === 5)
    };

    logDiagnostics({
      step: 'FINAL_SUMMARY',
      public_axes: {
        magnitude: round(magnitudeValue, 2),
        directional_bias: round(directional_bias, 2)
      },
      raw_to_final_comparison: {
        magnitude: `${round(X_raw, 2)} → norm:${round(magnitudeNormalized, 3)} → scaled:${round(magnitudeScaled.raw, 2)} → final:${round(magnitudeValue, 2)}`,
        bias: `${round(Y_raw, 2)} → amp:${round(Y_amplified, 2)} → norm:${round(Y_normalized, 3)} → scaled:${round(biasScaled.raw, 2)} → final:${round(directional_bias, 2)}`
      },
      clamp_warnings: clampWarnings.length > 0 ? clampWarnings : ['No clamping detected'],
      variability_check: variabilityCheck,
      warnings: variabilityCheck.potential_stuck_values ?
        ['⚠️ VALUES AT BOUNDARIES - Check if stuck at extremes across multiple days'] : []
    }, { label: 'SUMMARY', enableDiagnostics: true });
  }

  assertSeismographInvariants({
    magnitude: result.magnitude,
    directional_bias: result.directional_bias
    // coherence removed in v5.0
  });

  return result;
}

module.exports = {
  aggregate,
  calculateSeismograph: aggregate, // Alias for test compatibility
  _internals: {
    normalizeAspect, baseValence, planetTier, orbMultiplier, sensitivityMultiplier,
    scoreAspect, multiplicityBonus, volatility, normalizeWithRollingWindow, median
  }
};
