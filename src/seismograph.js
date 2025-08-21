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

const OUTER = new Set(["Saturn","Uranus","Neptune","Pluto"]);
const PERSONAL = new Set(["Sun","Moon","Mercury","Venus","Mars","ASC","MC","IC","DSC"]);
const ANGLES = new Set(["ASC","MC","IC","DSC"]);

const DEFAULTS = {
  magnitudeDivisor: 4,               
  hubBonusCap: 0.6,                  
  sameTargetBonusCap: 0.3,           
  tightBandDeg: 1.5,                 
  outerTightenStep: 0.2,             
  uranusTightFlagDeg: 3.0            
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
  return { transit:{body:tName||"?"}, natal:{body:nName||"?"}, type, orbDeg };
}

// ---------- per-aspect S = v × p × o × s ----------
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
      return 0.0;
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
  if (critical) s *= 1.1;
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

// ---------- Volatility Index ----------
function volatility(scoredToday, prevCtx=null, opts=DEFAULTS){
  let A=0,B=0,C=0,D=0;
  const key = (x)=>`${x.transit.body}|${x.natal.body}|${x.type}`;

  if (prevCtx?.scored){
    const tight = arr => arr.filter(x=>x.orbDeg <= opts.tightBandDeg);
    const prevTight = new Set(tight(prevCtx.scored).map(key));
    const nowTight  = new Set(tight(scoredToday).map(key));
    for (const k of nowTight) if (!prevTight.has(k)) A++;
    for (const k of prevTight) if (!nowTight.has(k)) A++;
  }

  if (typeof prevCtx?.Y_effective === "number"){
    const prevY = prevCtx.Y_effective;
    const nowY  = scoredToday.reduce((s,x)=>s+x.S,0);
    if (Math.sign(prevY) !== Math.sign(nowY) && Math.abs(prevY)>0.05 && Math.abs(nowY)>0.05) B = 1;
  }

  if (prevCtx?.scored){
    const prevMap = new Map(prevCtx.scored.map(x=>[key(x),x]));
    for (const cur of scoredToday){
      const pX = prevMap.get(key(cur));
      const isOuterHard = (OUTER.has(cur.transit.body) || OUTER.has(cur.natal.body)) &&
                          (cur.type==="square" || cur.type==="opposition");
      if (pX && isOuterHard && (pX.orbDeg - cur.orbDeg) >= opts.outerTightenStep) C++;
    }
  }

  if (scoredToday.some(x => (x.transit.body==="Uranus" || x.natal.body==="Uranus") && x.orbDeg <= opts.uranusTightFlagDeg)) D = 1;

  return A+B+C+D;
} 

// ---------- main aggregate ----------
function aggregate(aspects = [], prevCtx = null, options = {}){
  if (!Array.isArray(aspects) || aspects.length === 0){
    return { magnitude: 0, valence: prevCtx?.Y_effective ? round(prevCtx.Y_effective,2) : 0, volatility: 0, scored: [] };
  }
  const opts = { ...DEFAULTS, ...options };

  const scored = aspects.map(a => scoreAspect(a, {
    isAngleProx: ANGLES.has((a?.natal?.body||a?.b?.name||a?.b)||""),
    critical: false
  }));

  const X_raw = scored.reduce((acc,x)=>acc + Math.abs(x.S), 0);
  const Y_raw = scored.reduce((acc,x)=>acc + x.S, 0);

  let X = Math.min(5, X_raw / opts.magnitudeDivisor);
  X = Math.min(5, X + multiplicityBonus(scored, opts));

  const Y_effective = Y_raw * (0.8 + 0.2 * X);

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
