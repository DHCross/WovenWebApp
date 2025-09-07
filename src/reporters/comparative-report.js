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

    let md = `# Comparative Report (Seismograph × Health)\n\n`;
    md += `Temporal Scope: ${start||'—'} → ${end||start||'—'}\n\n`;

    // --- Three-axis overlay summary ---
    // Build arrays for each channel and their health analogues to compute similarity (1 - mean absolute diff)
    const arr = {
      s_val: [], h_val: [], // valence ↔ mood valence (normalized -1..1)
      s_mag: [], h_mag: [], // magnitude ↔ intensity proxy (label count if present else inverted sleep gap)
      s_vol: [], h_vol: []  // volatility ↔ day-to-day swings (if we had it) or HRV as a correlate
    };
    // Helpers to safe-push pairs only when both exist
    function pushPair(sa, ha, sv, hv){ if (sa!=null && ha!=null) { arr[sv].push(sa); arr[hv].push(ha); } }
    // Build per-day inputs
    let lastMood = null;
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
    });

    function similarity(a,b){
      if (!a.length || a.length!==b.length) return null;
      let sum=0; for (let i=0;i<a.length;i++){ sum += Math.abs((a[i]??0) - (b[i]??0)); }
      const mean = sum / a.length; return +(1-mean).toFixed(2);
    }
    const simVal = similarity(arr.s_val, arr.h_val);
    const simMag = similarity(arr.s_mag, arr.h_mag);
    const simVol = similarity(arr.s_vol, arr.h_vol);
    const sims = [simVal, simMag, simVol].filter(x=>x!=null);
    const composite = sims.length ? +(sims.reduce((a,c)=>a+c,0)/sims.length).toFixed(2) : null;

    if (sims.length) {
      md += `### Three‑axis overlay\n`;
      if (simVal!=null) md += `- Valence ↔ Mood valence: ${simVal}\n`;
      if (simMag!=null) md += `- Magnitude ↔ Intensity proxy: ${simMag}\n`;
      if (simVol!=null) md += `- Volatility ↔ Swings/HRV: ${simVol}\n`;
      if (composite!=null) md += `- Composite uncanny score: ~${composite}\n\n`;
    }
    md += `| Date | Mag | Val | Vol ${hasHRV?'| HRV ':''}${hasRest?'| RestHR ':''}${hasSleep?'| Sleep ':''}${hasMood?'| Mood ':''}| Score |\n`;
    md += `|------|----:|----:|----: ${hasHRV?'|----: ':''}${hasRest?'|------: ':''}${hasSleep?'|------: ':''}${hasMood?'|-----: ':''}|------:|\n`;

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
      row.push(fmt(simpleHeuristicScore(s, h), 3));
      md += `| ${row.join(' | ')} |\n`;
    });

    md += `\nNotes:\n- Score is a simple heuristic alignment (0..1) across available metrics.\n- Health data expected from iOS Health Auto Export; other streams ignored.\n- Seismograph values are as exported (no re-scaling here).\n`;
    return md;
  }

  global.generateComparativeReportMarkdown = generateComparativeReportMarkdown;
})(typeof window !== 'undefined' ? window : globalThis);

