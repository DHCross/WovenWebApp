// src/seismograph.js
// Raven‑lite Seismograph: per‑aspect scoring + daily aggregates (Magnitude, Valence, Volatility)
// Implements Two‑Axis defaults and stacking bonuses. See docs for details.

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

const OUTER = new Set(["Saturn","Uranus","Neptune","Pluto"]);
const PERSONAL = new Set(["Sun","Moon","Mercury","Venus","Mars","ASC","MC","IC","DSC"]);
const ANGLES = new Set(["ASC","MC","IC","DSC"]);

const DEFAULTS = {
  // X = min(5, Σ|S| / divisor) + stacking bonuses (capped)
  magnitudeDivisor: 4,               
  
  // stacking bonuses caps
  hubBonusCap: 0.6,        // transiting‑planet hub bonus cap
  sameTargetBonusCap: 0.3, // same‑target bonus cap
  
  // round final results to precision
  roundTo: 2
};

// ---- normalize input aspects into consistent shape ----
function nameOf(obj){
  if (typeof obj === "string") return obj;
  return obj?.name || obj?.body || "";
}

function asNum(val, fallback){
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string"){
    const n = parseFloat(val.replace(/[°'"]/g, ""));
    if (!isNaN(n)) return n;
  }
  return fallback;
}

function normalizeAspect(a){
  const tName = nameOf(a?.transit) || nameOf(a?.a);
  const nName = nameOf(a?.natal)   || nameOf(a?.b);
  const type  = String(a?.type || a?.aspect || "").toLowerCase();
  const orbDeg = asNum(a?.orbDeg ?? a?.orb ?? a?.orbit, 6.01);
  return { transit:{body:tName||"?"}, natal:{body:nName||"?"}, type, orbDeg };
}

// ---- per‑aspect S = v × p × o × s ----
function baseValence(type, aBody, bBody){
  switch (type){
    case "trine": return +1.0;
    case "sextile": return +0.7;
    case "square":
    case "opposition": return -1.2;
    case "conjunction":{
      const set = new Set([aBody,bBody]);
      if (set.has("Venus") || set.has("Jupiter")) return +0.6;
      if (set.has("Saturn") || set.has("Pluto") || set.has("Chiron")) return -0.8;
      return 0.0; // neutral pivot
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

function orbMultiplier(orbDeg){
  const o = Math.abs(orbDeg);
  if (o <= 0.5) return 1.5;
  if (o <= 1.5) return 1.3;
  if (o <= 3.0) return 1.2;
  if (o <= 6.0) return 1.0;
  return 0.6;
}

function sensitivityMultiplier(natalBody, isAngle=false, isLum=false, critical=false){
  let s = 1.0;
  if (isAngle) s *= 1.3;
  else if (isLum) s *= 1.2;
  else if (PERSONAL.has(natalBody)) s *= 1.1;
  if (critical) s *= 1.1; // optional boost for 0° or 29°
  return s;
}

function scoreAspect(inA, flags={}){
  const a = normalizeAspect(inA);
  const tBody = a.transit.body, nBody = a.natal.body;
  const v = baseValence(a.type, tBody, nBody);
  const p = Math.max(planetTier(tBody), planetTier(nBody));
  const o = orbMultiplier(a.orbDeg);
  const s = sensitivityMultiplier(nBody, !!flags.isAngleProx, (nBody==="Sun"||nBody==="Moon"), !!flags.critical);
  const S = v * p * o * s;
  return { ...a, S };
}

// ---------- stacking bonuses for Magnitude ----------
function multiplicityBonus(scored, opts=DEFAULTS){
  let hub = 0, target = 0;

  // Transiting‑planet hub: ≥3 aspects from same transiting planet → +0.2×(n−2) (cap +0.6)
  const byTransit = new Map();
  for (const x of scored){ const k = x.transit.body; byTransit.set(k,(byTransit.get(k)||0)+1); }
  for (const [,n] of byTransit) if (n>=3) hub += 0.2*(n-2);
  hub = Math.min(opts.hubBonusCap, hub);

  // Same natal target: ≥2 hits to same natal body/angle → +0.1×(m−1) (cap +0.3)
  const byTarget = new Map();
  for (const x of scored){ const k = x.natal.body; byTarget.set(k,(byTarget.get(k)||0)+1); }
  for (const [,m] of byTarget) if (m>=2) target += 0.1*(m-1);
  target = Math.min(opts.sameTargetBonusCap, target);

  return hub + target;
}

// ---------- Volatility Index (A–D) ----------
function volatility(scoredToday, prevCtx=null, opts=DEFAULTS){
  let A = 0, B = 0, C = 0, D = 0;
  
  if (prevCtx?.scored) {
    // A: crossings into/out of ≤1.5°
    const tight = (arr) => arr.filter(x => x.orbDeg <= 1.5);
    const key = (x) => `${x.transit.body}|${x.natal.body}|${x.type}`;
    const prevTight = new Set(tight(prevCtx.scored).map(key));
    const nowTight = new Set(tight(scoredToday).map(key));
    // entering or exiting
    for (const k of nowTight) if (!prevTight.has(k)) A++;
    for (const k of prevTight) if (!nowTight.has(k)) A++;
    
    // B: valence flip
    const prevY = prevCtx.Y_effective ?? 0;
    const currentY_raw = scoredToday.reduce((acc,x)=>acc + x.S, 0);
    const currentX_raw = scoredToday.reduce((acc,x)=>acc + Math.abs(x.S), 0);
    const currentX = Math.min(5, currentX_raw / opts.magnitudeDivisor);
    const currentY_effective = currentY_raw * (0.8 + 0.2 * currentX);
    
    if (Math.sign(prevY) !== Math.sign(currentY_effective) && Math.abs(prevY) > 0.05) B = 1;
    
    // C: outer hard aspects tightening by ≥0.2°
    const prevMap = new Map(prevCtx.scored.map(x => [key(x), x]));
    for (const cur of scoredToday) {
      const pX = prevMap.get(key(cur));
      const isOuterHard =
        (OUTER.has(cur.transit.body) || OUTER.has(cur.natal.body)) &&
        (cur.type === "square" || cur.type === "opposition");
      if (pX && isOuterHard && (pX.orbDeg - cur.orbDeg) >= 0.2) C++;
    }
  }
  
  // D: any Uranus aspect ≤3°
  if (scoredToday.some(x => (x.transit.body === "Uranus" || x.natal.body === "Uranus") && x.orbDeg <= 3.0)) D = 1;

  return A + B + C + D;
}

function round(n, p = 2) { 
  return Math.round(n * (10 ** p)) / (10 ** p); 
}

// ---------- main aggregate ----------
/**
 * Aggregate a day's aspects into Magnitude (0–5), Valence (−∞..+∞ modulated), and Volatility (integer).
 * Returns { magnitude, valence, volatility, scored }.
 */
function aggregate(aspects = [], prevCtx = null, options = {}){
  if (!Array.isArray(aspects) || aspects.length === 0){
    return { magnitude: 0, valence: prevCtx?.Y_effective ? round(prevCtx.Y_effective,2) : 0, volatility: 0, scored: [] };
  }
  const opts = { ...DEFAULTS, ...options };

  // Score all aspects (flags like angle proximity can be injected upstream if you track them)
  const scored = aspects.map(a => scoreAspect(a, {
    isAngleProx: ANGLES.has((a?.natal?.body||a?.b?.name||a?.b)||""),
    critical: false
  }));

  // X and Y
  const X_raw = scored.reduce((acc,x)=>acc + Math.abs(x.S), 0);
  const Y_raw = scored.reduce((acc,x)=>acc + x.S, 0);

  // Magnitude with cap + stacking bonuses
  let X = Math.min(5, X_raw / opts.magnitudeDivisor);
  X = Math.min(5, X + multiplicityBonus(scored, opts)); // cap after bonuses

  // Valence with asymmetry curve (Y amplified by X)  Y_effective = Y_raw × (0.8 + 0.2×X)
  const Y_effective = Y_raw * (0.8 + 0.2 * X);

  // Volatility Index (A–D)
  const VI = volatility(scored, prevCtx, opts);

  return {
    magnitude: round(X, 2),
    valence: round(Y_effective, 2),
    volatility: VI,
    scored
  };
}

module.exports = {
  aggregate,
  _internals: {
    normalizeAspect, baseValence, planetTier, orbMultiplier, sensitivityMultiplier,
    scoreAspect, multiplicityBonus, volatility
  }
};
