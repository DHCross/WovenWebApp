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

