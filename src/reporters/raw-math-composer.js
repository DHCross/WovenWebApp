(function(global){
  function fmt(x){
    return (x==null||x==='') ? '—' : x;
  }

  function table(headers, rows){
    let md = `| ${headers.join(' | ')} |\n| ${headers.map(()=>':---').join(' | ')} |\n`;
    rows.forEach(r=>{ md += `| ${r.map(fmt).join(' | ')} |\n`; });
    return md;
  }

  function composeRawMathReport(data){
    data = data || {};
    const parts = [];

    const natal = data.natal || {};
    if(natal.planets){
      const rows = natal.planets.map(p=>[
        p.name, p.lon_deg, p.sign, p.deg_in_sign, p.speed_deg_per_day, p.retrograde, p.house
      ]);
      parts.push('## Natal Math (Raw)');
      parts.push(table(['Body','Lon','Sign','Deg','Speed','Rx','House'], rows));
    }
    if(natal.angles || natal.houses){
      const angleRows = [];
      const angles = natal.angles||{};
      Object.keys(angles).forEach(k=>{
        const a = angles[k];
        angleRows.push([k, a.lon_deg, a.sign, a.deg_in_sign]);
      });
      const houseRows = (natal.houses||[]).map(h=>[h.num, h.lon_deg, h.sign, h.deg_in_sign]);
      parts.push('## Houses & Angles');
      if(angleRows.length) parts.push(table(['Angle','Lon','Sign','Deg'], angleRows));
      if(houseRows.length) parts.push(table(['House','Lon','Sign','Deg'], houseRows));
    }
    if(natal.aspects){
      const rows = natal.aspects.map(a=>[a.a,a.b,a.type,a.orb_deg,a.phase||'',a.exact||'']);
      parts.push('## Natal Aspects');
      parts.push(table(['A','B','Type','Orb','Phase','Exact'], rows));
    }

    const transits = data.transits || {};
    if(transits.aspects && transits.aspects.length){
      const rows = transits.aspects.map(t=>[
        t.transiting_body||t.a, t.natal_target||t.b, t.type, t.orb_deg, t.phase||'', t.exact||''
      ]);
      parts.push('## Transit Aspects');
      parts.push(table(['Transit','Natal','Type','Orb','Phase','Exact'], rows));
    }
    if(transits.seismograph_daily && transits.seismograph_daily.length){
      const rows = transits.seismograph_daily.map(s=>{
        const valence = (typeof s.valence_bounded === 'number') ? s.valence_bounded : s.valence;
        const label = s.valence_label ? ` (${s.valence_label})` : '';
        return [
          s.date,
          s.magnitude,
          valence != null ? `${valence}${label}` : valence,
          s.volatility,
          (s.drivers||[]).join('; ')
        ];
      });
      parts.push('## Seismograph Daily');
      parts.push(table(['Date','Mag','Val','Vol','Drivers'], rows));
    }

    const prov = data.provenance || {};
    const provRows = Object.keys(prov).map(k=>[k, prov[k]]);
    parts.push('## Data & Provenance');
    parts.push(table(['Field','Value'], provRows));

    const jsonBlock = `<details><summary>Raw JSON</summary>\n\n\n\n<pre>${JSON.stringify(data,null,2)}</pre>\n\n</details>`;
    parts.push(jsonBlock);
    return parts.join('\n\n');
  }

  global.composeRawMathReport = composeRawMathReport;
})(typeof window !== 'undefined' ? window : globalThis);
