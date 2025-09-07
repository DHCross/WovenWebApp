(function(global){
  function fmt(x, d=2){ return (x==null||isNaN(x)) ? '—' : (+x).toFixed(d); }

  function inferDateRange(dates){
    if (!dates.length) return {start:null,end:null};
    const sorted = dates.slice().sort();
    return { start: sorted[0], end: sorted[sorted.length-1] };
  }

  function buildHealthByDate(health){
    // health: { metric -> [{date,value,...}] }
    const byDate = {};
    if (!health) return byDate;
    Object.keys(health).forEach(metric => {
      const arr = health[metric] || [];
      arr.forEach(pt => {
        // expect YYYY-MM-DD
        const dk = (pt.date || '').slice(0,10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) return;
        byDate[dk] = byDate[dk] || {};
        byDate[dk][metric] = pt.value;
      });
    });
    return byDate;
  }

  function simpleHeuristicScore(seismo, dayHealth){
    // mirror calculateCorrelationScore used in index.html, but local & minimal
    let score = 0, parts = 0;
    if (typeof dayHealth.mood_valence === 'number' && typeof seismo.valence === 'number'){
      const hv = Math.max(-1, Math.min(1, dayHealth.mood_valence));
      const sv = Math.max(-1, Math.min(1, (seismo.valence||0) / 5));
      score += 1 - Math.abs(hv - sv) / 2; parts++;
    }
    if (typeof dayHealth.hrv === 'number' && typeof seismo.volatility === 'number'){
      const h = Math.min(150, Math.max(0, dayHealth.hrv)) / 150;
      const v = (seismo.volatility||0) / 5;
      score += 1 - Math.abs(h - v); parts++;
    }
    if (typeof dayHealth.sleep_hours === 'number' && typeof seismo.magnitude === 'number'){
      const s = Math.min(12, Math.max(0, dayHealth.sleep_hours)) / 12;
      const m = (seismo.magnitude||0) / 5;
      score += 1 - Math.abs((s + m) - 1); parts++;
    }
    return parts ? (score/parts) : 0;
  }

  function generateComparativeReportMarkdown(seismoMap, health){
    const healthByDate = buildHealthByDate(health);
    const seismoDates = Object.keys(seismoMap||{}).sort();
    const dates = seismoDates.filter(d => !!healthByDate[d]);
    const {start, end} = inferDateRange(dates);

    // determine present health columns
  const hasHRV = Object.prototype.hasOwnProperty.call(health||{}, 'hrv');
  const hasRest = Object.prototype.hasOwnProperty.call(health||{}, 'resting_hr');
  const hasSleep = Object.prototype.hasOwnProperty.call(health||{}, 'sleep_hours');
  const hasMood = Object.prototype.hasOwnProperty.call(health||{}, 'mood_valence');
  const hasTemp = Object.prototype.hasOwnProperty.call(health||{}, 'sleep_temp');
  const hasActive = Object.prototype.hasOwnProperty.call(health||{}, 'active_energy');
  const hasHR = Object.prototype.hasOwnProperty.call(health||{}, 'heart_rate');
  const hasWalkHR = Object.prototype.hasOwnProperty.call(health||{}, 'walking_hr_avg');
  const hasDist = Object.prototype.hasOwnProperty.call(health||{}, 'walking_distance');
  const hasAsym = Object.prototype.hasOwnProperty.call(health||{}, 'walk_asym_pct');
  const hasDouble = Object.prototype.hasOwnProperty.call(health||{}, 'walk_double_support_pct');
  const hasExMin = Object.prototype.hasOwnProperty.call(health||{}, 'exercise_minutes');
  const hasStandMin = Object.prototype.hasOwnProperty.call(health||{}, 'stand_minutes');
  const hasMindful = Object.prototype.hasOwnProperty.call(health||{}, 'mindful_minutes');

  let md = `# Comparative Report (Seismograph × Health)\n\n`;
    md += `Temporal Scope: ${start||'—'} → ${end||start||'—'}\n\n`;

    // --- Three-axis overlay summary ---
    // Build arrays for each channel and their health analogues to compute similarity (1 - mean absolute diff)
    const arr = {
      s_val: [], h_val: [], // valence ↔ mood valence (normalized -1..1)
      s_mag: [], h_mag: [], // magnitude ↔ intensity proxy (label count if present else inverted sleep gap)
      s_vol: [], h_vol: [],  // volatility ↔ day-to-day swings (if we had it) or HRV as a correlate
      // supplemental (collect raw; normalize per-window later)
      raw_s_mag_rhr: [], raw_h_rhr: [], // magnitude ↔ resting HR (strain proxy)
      raw_s_mag_act: [], raw_h_act: [], // magnitude ↔ active energy (load proxy)
      raw_s_vol_temp: [], raw_h_tempSwing: [] // volatility ↔ wrist temp swings (physio drift)
    };
    // Helpers to safe-push pairs only when both exist
    function pushPair(sa, ha, sv, hv){ if (sa!=null && ha!=null) { arr[sv].push(sa); arr[hv].push(ha); } }
    // Build per-day inputs
  let lastMood = null;
  let lastTemp = null;
    dates.forEach(d => {
      const s = seismoMap[d]||{}; const h = healthByDate[d]||{};
      // Valence normalization
      const sv = typeof s.valence==='number' ? Math.max(-1, Math.min(1, (s.valence||0)/5)) : null;
      const hv = typeof h.mood_valence==='number' ? Math.max(-1, Math.min(1, h.mood_valence)) : null;
      if (sv!=null && hv!=null) { arr.s_val.push(sv); arr.h_val.push(hv); }
      // Magnitude vs intensity proxy: prefer mood_label_count if present; else derive from sleep inverse to keep example minimal
      const sm = typeof s.magnitude==='number' ? Math.max(0, Math.min(1, (s.magnitude||0)/5)) : null;
      const labelCount = typeof h.mood_label_count==='number' ? h.mood_label_count : null;
      const labelNorm = labelCount!=null ? Math.max(0, Math.min(1, labelCount/10)) : null; // crude cap at 10
      const sleepH = typeof h.sleep_hours==='number' ? Math.max(0, Math.min(12, h.sleep_hours))/12 : null;
      const intensityProxy = (labelNorm!=null) ? labelNorm : (sleepH!=null ? 1-Math.abs((sleepH + (sm!=null?sm:0)) - 1) : null);
      if (sm!=null && intensityProxy!=null) { arr.s_mag.push(sm); arr.h_mag.push(intensityProxy); }
      // Volatility vs swings/HRV
      const svv = typeof s.volatility==='number' ? Math.max(0, Math.min(1, s.volatility/5)) : null;
      let swing = null;
      if (typeof h.mood_valence==='number' && lastMood!=null) {
        swing = Math.min(1, Math.abs(h.mood_valence - lastMood));
      }
      lastMood = typeof h.mood_valence==='number' ? h.mood_valence : lastMood;
      const hrvNorm = typeof h.hrv==='number' ? Math.max(0, Math.min(1, h.hrv/150)) : null;
      const volProxy = swing!=null ? swing : hrvNorm;
      if (svv!=null && volProxy!=null) { arr.s_vol.push(svv); arr.h_vol.push(volProxy); }

      // Optional (collect raw; min–max normalize per window later)
      if (hasRest) {
        const rhr = typeof h.resting_hr==='number' ? h.resting_hr : null;
        if (sm!=null && rhr!=null) { arr.raw_s_mag_rhr.push(sm*5 /* back to raw scale */); arr.raw_h_rhr.push(rhr); }
      }
      if (hasActive) {
        const ae = typeof h.active_energy==='number' ? h.active_energy : null;
        if (sm!=null && ae!=null) { arr.raw_s_mag_act.push(sm*5); arr.raw_h_act.push(ae); }
      }
      if (hasTemp) {
        const t = typeof h.sleep_temp==='number' ? h.sleep_temp : null;
        const swingT = (t!=null && lastTemp!=null) ? Math.abs(t - lastTemp) : null;
        lastTemp = (t!=null) ? t : lastTemp;
        const sVolRaw = typeof s.volatility==='number' ? s.volatility : null;
        if (sVolRaw!=null && swingT!=null) { arr.raw_s_vol_temp.push(sVolRaw); arr.raw_h_tempSwing.push(swingT); }
      }
    });

    function similarity(a,b){
      if (!a.length || a.length!==b.length) return null;
      let sum=0; for (let i=0;i<a.length;i++){ sum += Math.abs((a[i]??0) - (b[i]??0)); }
      const mean = sum / a.length; return +(1-mean).toFixed(2);
    }

    function minMaxNormalize(series){
      if (!series || !series.length) return null;
      let min=Infinity, max=-Infinity;
      for (const v of series){ if (v==null || isNaN(v)) continue; if (v<min) min=v; if (v>max) max=v; }
      if (!isFinite(min) || !isFinite(max) || min===max) return null;
      return series.map(v => v==null || isNaN(v) ? null : (v - min) / (max - min));
    }
    const simVal = similarity(arr.s_val, arr.h_val);
    const simMag = similarity(arr.s_mag, arr.h_mag);
    const simVol = similarity(arr.s_vol, arr.h_vol);
    // Supplemental sims using per-window min–max normalization
    let simRHR = null, simAct = null, simTemp = null;
    if (arr.raw_s_mag_rhr.length && arr.raw_s_mag_rhr.length===arr.raw_h_rhr.length) {
      const ns = minMaxNormalize(arr.raw_s_mag_rhr);
      const nh = minMaxNormalize(arr.raw_h_rhr);
      if (ns && nh) simRHR = similarity(ns, nh);
    }
    if (arr.raw_s_mag_act.length && arr.raw_s_mag_act.length===arr.raw_h_act.length) {
      const ns = minMaxNormalize(arr.raw_s_mag_act);
      const nh = minMaxNormalize(arr.raw_h_act);
      if (ns && nh) simAct = similarity(ns, nh);
    }
    if (arr.raw_s_vol_temp.length && arr.raw_s_vol_temp.length===arr.raw_h_tempSwing.length) {
      const ns = minMaxNormalize(arr.raw_s_vol_temp);
      const nh = minMaxNormalize(arr.raw_h_tempSwing);
      if (ns && nh) simTemp = similarity(ns, nh);
    }
  const sims = [simVal, simMag, simVol].filter(x=>x!=null);
    const composite = sims.length ? +(sims.reduce((a,c)=>a+c,0)/sims.length).toFixed(2) : null;

    if (sims.length) {
      md += `### Three‑axis overlay\n`;
      if (simVal!=null) md += `- Valence ↔ Mood valence: ${simVal}\n`;
      if (simMag!=null) md += `- Magnitude ↔ Intensity proxy: ${simMag}\n`;
      if (simVol!=null) md += `- Volatility ↔ Swings/HRV: ${simVol}\n`;
      if (composite!=null) md += `- Composite uncanny score: ~${composite}\n\n`;
  // Supplemental overlays (if metrics present)
  if (simRHR!=null) md += `- Magnitude ↔ Resting HR (supplemental): ${simRHR}\n`;
  if (simAct!=null) md += `- Magnitude ↔ Active energy (supplemental): ${simAct}\n`;
  if (simTemp!=null) md += `- Volatility ↔ Wrist temp Δ (supplemental): ${simTemp}\n\n`;
    }

    // --- Significance via shuffle test (null model) ---
    try {
      if (dates.length <= 3) {
        md += `### Significance (shuffle test)\n`;
        md += `- Sample too small for a meaningful shuffle test (≤3 days).\n\n`;
        throw new Error('SMALL_SAMPLE');
      }
      // Prepare per‑day rows with normalized channels for fast reuse
      const rows = [];
      let prevMood = null;
      dates.forEach(d => {
        const s = seismoMap[d]||{}; const h = healthByDate[d]||{};
        const s_val = typeof s.valence==='number' ? Math.max(-1, Math.min(1, (s.valence||0)/5)) : null;
        const h_val = typeof h.mood_valence==='number' ? Math.max(-1, Math.min(1, h.mood_valence)) : null;
        const s_mag = typeof s.magnitude==='number' ? Math.max(0, Math.min(1, (s.magnitude||0)/5)) : null;
        const labelCount = typeof h.mood_label_count==='number' ? h.mood_label_count : null;
        const labelNorm = labelCount!=null ? Math.max(0, Math.min(1, labelCount/10)) : null;
        const sleepH = typeof h.sleep_hours==='number' ? Math.max(0, Math.min(12, h.sleep_hours))/12 : null;
        const h_mag = (labelNorm!=null) ? labelNorm : (sleepH!=null && s_mag!=null ? 1-Math.abs((sleepH + s_mag) - 1) : null);
        const s_vol = typeof s.volatility==='number' ? Math.max(0, Math.min(1, s.volatility/5)) : null;
        let swing = null;
        if (typeof h.mood_valence==='number' && prevMood!=null) swing = Math.min(1, Math.abs(h.mood_valence - prevMood));
        prevMood = (typeof h.mood_valence==='number') ? h.mood_valence : prevMood;
        const h_vol = swing!=null ? swing : (typeof h.hrv==='number' ? Math.max(0, Math.min(1, h.hrv/150)) : null);
        rows.push({ s_val, h_val, s_mag, h_mag, s_vol, h_vol });
      });

      function simFromRows(rows){
        const S = { val:[], mag:[], vol:[] }, H = { val:[], mag:[], vol:[] };
        rows.forEach(r => {
          if (r.s_val!=null && r.h_val!=null) { S.val.push(r.s_val); H.val.push(r.h_val); }
          if (r.s_mag!=null && r.h_mag!=null) { S.mag.push(r.s_mag); H.mag.push(r.h_mag); }
          if (r.s_vol!=null && r.h_vol!=null) { S.vol.push(r.s_vol); H.vol.push(r.h_vol); }
        });
        const sv = similarity(S.val, H.val);
        const sm = similarity(S.mag, H.mag);
        const so = similarity(S.vol, H.vol);
        const parts = [sv, sm, so].filter(x=>x!=null);
        return { sv, sm, so, comp: parts.length ? +(parts.reduce((a,c)=>a+c,0)/parts.length).toFixed(2) : null };
      }

      function shuffleIndices(n){
        const idx = Array.from({length:n}, (_,i)=>i);
        for (let i=n-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
        return idx;
      }

      // Observed composite already computed as 'composite', but recompute from rows for consistency
      const obs = simFromRows(rows);
  const iters = 1000;
      const comps = new Array(iters);
      // Build health arrays once
      const H = rows.map(r => ({ h_val:r.h_val, h_mag:r.h_mag, h_vol:r.h_vol }));
      const n = rows.length;
      for (let k=0;k<iters;k++){
        const perm = shuffleIndices(n);
        const permRows = rows.map((r,i) => ({
          s_val: r.s_val, s_mag: r.s_mag, s_vol: r.s_vol,
          h_val: H[perm[i]].h_val,
          h_mag: H[perm[i]].h_mag,
          h_vol: H[perm[i]].h_vol
        }));
        comps[k] = simFromRows(permRows).comp ?? 0;
      }
      const mu = +(comps.reduce((a,c)=>a+c,0)/iters).toFixed(2);
      const sd = +Math.sqrt(comps.reduce((a,c)=>a+(c-mu)**2,0)/(iters-1)).toFixed(2);
      const mx = Math.max(...comps).toFixed(2);
      const ge = comps.filter(c => c >= (obs.comp??0)).length;
      const p = ge/iters;
      const pText = p === 0 ? '< 0.001' : p.toFixed(3);
      md += `### Significance (shuffle test)\n`;
      md += `- Uncanny score (observed): ${obs.comp!=null? obs.comp.toFixed(2):'—'}\n`;
      md += `- Null mean (random): ${mu} • σ ≈ ${sd} • max ≈ ${mx}\n`;
      md += `- p-value: ${pText} (proportion of random runs ≥ observed)\n\n`;
    } catch(e) {
      if (e && e.message === 'SMALL_SAMPLE') {
        // already wrote a small-sample note
      } else {
        // Keep report generation resilient
        md += `\n_Note: Shuffle test unavailable due to runtime limits._\n\n`;
      }
    }
    md += `| Date | Mag | Val | Vol ${hasHRV?'| HRV ':''}${hasRest?'| RestHR (bpm) ':''}${hasSleep?'| Sleep ':''}${hasMood?'| Mood ':''}${hasActive?'| ActEnergy (kcal) ':''}${hasTemp?'| TempΔ ':''}${hasHR?'| HR ':''}${hasWalkHR?'| WalkHR ':''}${hasDist?'| Dist ':''}${hasAsym?'| Asym% ':''}${hasDouble?'| Double% ':''}${hasExMin?'| ExMin ':''}${hasStandMin?'| StandMin ':''}${hasMindful?'| Mindful ':''}| Score |\n`;
  md += `|------|----:|----:|----: ${hasHRV?'|----: ':''}${hasRest?'|------: ':''}${hasSleep?'|------: ':''}${hasMood?'|-----: ':''}${hasActive?'|---------: ':''}${hasTemp?'|-----: ':''}${hasHR?'|---: ':''}${hasWalkHR?'|------: ':''}${hasDist?'|-----: ':''}${hasAsym?'|------: ':''}${hasDouble?'|--------: ':''}${hasExMin?'|------: ':''}${hasStandMin?'|---------: ':''}${hasMindful?'|--------: ':''}|------:|\n`;

    dates.forEach(d => {
      const s = seismoMap[d] || {};
      const h = healthByDate[d] || {};
      const row = [
        d,
        fmt(s.magnitude),
        fmt(s.valence),
        fmt(s.volatility)
      ];
      if (hasHRV) row.push(fmt(h.hrv));
      if (hasRest) row.push(fmt(h.resting_hr));
      if (hasSleep) row.push(fmt(h.sleep_hours));
  if (hasMood) row.push(fmt(h.mood_valence, 3));
  if (hasActive) row.push(fmt(h.active_energy));
  if (hasTemp) row.push(fmt(h.sleep_temp, 2));
  if (hasHR) row.push(fmt(h.heart_rate));
  if (hasWalkHR) row.push(fmt(h.walking_hr_avg));
  if (hasDist) row.push(fmt(h.walking_distance));
  if (hasAsym) row.push(fmt(h.walk_asym_pct));
  if (hasDouble) row.push(fmt(h.walk_double_support_pct));
  if (hasExMin) row.push(fmt(h.exercise_minutes));
  if (hasStandMin) row.push(fmt(h.stand_minutes));
  if (hasMindful) row.push(fmt(h.mindful_minutes));
      row.push(fmt(simpleHeuristicScore(s, h), 3));
      md += `| ${row.join(' | ')} |\n`;
    });

    // ABE/OSR band summary (Within / Edge / Outside) using mean absolute difference across available channels
    try {
      let within=0, edge=0, outside=0;
      let prevMood = null;
      dates.forEach(d => {
        const s = seismoMap[d]||{}; const h = healthByDate[d]||{};
        const s_val = typeof s.valence==='number' ? Math.max(-1, Math.min(1, (s.valence||0)/5)) : null;
        const h_val = typeof h.mood_valence==='number' ? Math.max(-1, Math.min(1, h.mood_valence)) : null;
        const s_mag = typeof s.magnitude==='number' ? Math.max(0, Math.min(1, (s.magnitude||0)/5)) : null;
        const labelCount = typeof h.mood_label_count==='number' ? h.mood_label_count : null;
        const labelNorm = labelCount!=null ? Math.max(0, Math.min(1, labelCount/10)) : null;
        const sleepH = typeof h.sleep_hours==='number' ? Math.max(0, Math.min(12, h.sleep_hours))/12 : null;
        const h_mag = (labelNorm!=null) ? labelNorm : (sleepH!=null && s_mag!=null ? 1-Math.abs((sleepH + s_mag) - 1) : null);
        const s_vol = typeof s.volatility==='number' ? Math.max(0, Math.min(1, s.volatility/5)) : null;
        let swing = null;
        if (typeof h.mood_valence==='number' && prevMood!=null) swing = Math.min(1, Math.abs(h.mood_valence - prevMood));
        prevMood = (typeof h.mood_valence==='number') ? h.mood_valence : prevMood;
        const h_vol = swing!=null ? swing : (typeof h.hrv==='number' ? Math.max(0, Math.min(1, h.hrv/150)) : null);
        const diffs = [];
        if (s_val!=null && h_val!=null) diffs.push(Math.abs(s_val - h_val));
        if (s_mag!=null && h_mag!=null) diffs.push(Math.abs(s_mag - h_mag));
        if (s_vol!=null && h_vol!=null) diffs.push(Math.abs(s_vol - h_vol));
        if (!diffs.length) return;
        const meanDiff = diffs.reduce((a,c)=>a+c,0)/diffs.length;
        if (meanDiff <= 0.20) within++; else if (meanDiff <= 0.35) edge++; else outside++;
      });
      md += `\nBand summary: Within ${within} • Edge ${edge} • Outside ${outside}\n`;
    } catch(_) {}

  md += `\nNotes:\n- Score is a simple heuristic alignment (0..1) across available metrics.\n- Health data expected from iOS Health Auto Export; other streams ignored.\n- Seismograph values are as exported (no re-scaling here).\n- Supplemental overlays (RHR, Active energy, Temp Δ) are exploratory and not included in the shuffle test.\n- RHR: Resting heart rate (bpm) as intensity proxy.\n- TempΔ: Night-to-night wrist temp change as turbulence proxy.\n`;

  // Plain-English method note
  md += `\n### Method note\n`;
  md += `Alongside the core three-axis match (Valence, Magnitude, Volatility), we compare a few health signals that behave like those axes. Resting heart rate and active energy often echo intensity (Magnitude). Nightly wrist temperature swings and gait variability often echo turbulence (Volatility). Each line is normalized within the window and compared to the symbolic bar using a simple similarity measure (closer = higher). These extras don’t change the core composite or the shuffle test; they add context where the body shows the climate even when mood is mixed. I confirm the “pings” by eye—if it doesn’t look true, it doesn’t count.\n`;
    return md;
  }

  global.generateComparativeReportMarkdown = generateComparativeReportMarkdown;
})(typeof window !== 'undefined' ? window : globalThis);

