// src/seismograph.js
const OUTER = new Set(["Saturn","Uranus","Neptune","Pluto"]);
const PERSONAL = new Set(["Sun","Moon","Mercury","Venus","Mars","ASC","MC","IC","DSC"]);
const ANGLES = new Set(["ASC","MC","IC","DSC"]);

// ---- base helpers
function baseValence(type, a, b) {
  const t = (type || "").toLowerCase();
  if (t === "trine") return +1.0;
  if (t === "sextile") return +0.7;
  if (t === "square" || t === "opposition") return -1.2;
  if (t === "conjunction") {
    const set = new Set([a, b]);
    if (set.has("Venus") || set.has("Jupiter")) return +0.6;
    if (set.has("Saturn") || set.has("Pluto") || set.has("Chiron")) return -0.8;
    return 0.0;
  }
  return 0.0;
}
function tier(body) {
  if (body === "Chiron") return 1.2;
  if (OUTER.has(body)) return 1.5;
  if (body === "Moon") return 0.5;
  return 1.0;
}
function orbMult(orbDeg) {
  const o = Math.abs(orbDeg);
  if (o <= 0.5) return 1.5;
  if (o <= 1.5) return 1.3;
  if (o <= 3.0) return 1.2;
  if (o <= 6.0) return 1.0;
  return 0.6;
}
function sensitivity(target, isAngleHit, isLuminaryHit, criticalDeg = false) {
  let s = 1.0;
  if (isAngleHit) s *= 1.3;
  else if (isLuminaryHit) s *= 1.2;
  else if (PERSONAL.has(target)) s *= 1.1;
  if (criticalDeg) s *= 1.1; // optional boost for 0° or 29°
  return s;
}

// ---- main per-aspect scorer
function scoreAspect(a) {
  // expected fields (adapt as needed):
  // a.transit.body, a.natal.body, a.type, a.orbDeg, a.natal.isAngleProx, a.natal.isLuminary, a.natal.degCrit
  const tBody = a.transit.body, nBody = a.natal.body;
  const v = baseValence(a.type, tBody, nBody);
  const p = Math.max(tier(tBody), tier(nBody));
  const o = orbMult(a.orbDeg);
  const s = sensitivity(nBody, !!a.natal.isAngleProx, !!a.natal.isLuminary, !!a.natal.degCrit);
  const S = v * p * o * s;
  return { ...a, S };
}

// ---- range aggregation
function aggregate(aspectsToday, prevDay = null) {
  const scored = aspectsToday.map(scoreAspect);
  const X_raw = scored.reduce((acc, x) => acc + Math.abs(x.S), 0);
  const Y_raw = scored.reduce((acc, x) => acc + x.S, 0);
  const X = Math.min(5, X_raw / 4);
  const Y_effective = Y_raw * (0.8 + 0.2 * X);

  // Volatility
  let A = 0, B = 0, C = 0, D = 0;
  if (prevDay?.scored) {
    // A: crossings into/out of ≤1.5°
    const tight = (arr) => arr.filter(x => x.orbDeg <= 1.5);
    const key = (x) => `${x.transit.body}|${x.natal.body}|${x.type}`;
    const prevTight = new Set(tight(prevDay.scored).map(key));
    const nowTight = new Set(tight(scored).map(key));
    // entering or exiting
    for (const k of nowTight) if (!prevTight.has(k)) A++;
    for (const k of prevTight) if (!nowTight.has(k)) A++;
    // B: valence flip
    const prevY = prevDay.Y_effective ?? 0;
    if (Math.sign(prevY) !== Math.sign(Y_effective) && Math.abs(prevY) > 0.05) B = 1;
    // C: outer hard aspects tightening by ≥0.2°
    const prevMap = new Map(prevDay.scored.map(x => [key(x), x]));
    for (const cur of scored) {
      const pX = prevMap.get(key(cur));
      const isOuterHard =
        (OUTER.has(cur.transit.body) || OUTER.has(cur.natal.body)) &&
        (cur.type === "square" || cur.type === "opposition");
      if (pX && isOuterHard && (pX.orbDeg - cur.orbDeg) >= 0.2) C++;
    }
  }
  // D: any Uranus aspect ≤3°
  if (scored.some(x => (x.transit.body === "Uranus" || x.natal.body === "Uranus") && x.orbDeg <= 3.0)) D = 1;

  const VI = A + B + C + D;
  return { magnitude: round(X), valence: round(Y_effective), volatility: VI, scored };
}

const round = (n, p = 2) => Math.round(n * (10 ** p)) / (10 ** p);

module.exports = { scoreAspect, aggregate };
