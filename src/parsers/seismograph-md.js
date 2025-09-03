// Lightweight parser for Woven Map Seismograph Validation Markdown
// Returns: { map, meta }
// map: { 'YYYY-MM-DD': { magnitude:Number, valence:Number, volatility:Number, hooks:String[] } }
// meta: { title, start, end, step }
(function (global){
  function normalizeHeader(h){
    const s = (h||'').trim().toLowerCase();
    if (s === 'date') return 'date';
    if (s === 'magnitude' || s === 'mag') return 'magnitude';
    if (s === 'valence' || s === 'val') return 'valence';
    if (s === 'volatility' || s === 'vol') return 'volatility';
    if (s.includes('hook')) return 'hooks';
    return s;
  }

  function normalizeDate(d){
    if (!d) return null;
    const s = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const dt = new Date(s);
    if (isNaN(dt)) return null;
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,'0');
    const day = String(dt.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function parseTable(md){
    const lines = md.split(/\r?\n/);
    let headerIdx = -1;
    for (let i=0;i<lines.length;i++){
      if (/^\|/.test(lines[i]) && /date/i.test(lines[i]) && /mag|magnitude/i.test(lines[i])){
        headerIdx = i; break;
      }
    }
    if (headerIdx === -1) return { headers:[], rows:[] };
    const header = lines[headerIdx].split('|').map(s=>s.trim()).filter(Boolean).map(normalizeHeader);
    // next line is separator, then data rows until a blank or non-table
    const rows = [];
    for (let i=headerIdx+2; i<lines.length; i++){
      const ln = lines[i];
      if (!/^\|/.test(ln)) break;
      const cols = ln.split('|').map(s=>s.trim());
      // align to header length
      const row = {};
      for (let c=0,h=0; c<cols.length && h<header.length; c++){
        if (cols[c] === '') continue;
        const key = header[h++];
        row[key] = cols[c];
      }
      rows.push(row);
    }
    return { headers: header, rows };
  }

  function parseHeaderMeta(md){
    const meta = { title: null, start:null, end:null, step:null };
    const lines = md.split(/\r?\n/);
    if (lines[0] && /^#\s+/.test(lines[0])) meta.title = lines[0].replace(/^#\s+/,'').trim();
    const rg = /Temporal\s+Scope\s*:\s*(\d{4}-\d{2}-\d{2})\s*\u2192\s*(\d{4}-\d{2}-\d{2})/i;
    const sg = /Step\s*:\s*([a-z0-9]+)\b/i;
    for (const ln of lines){
      const m = rg.exec(ln); if (m){ meta.start = m[1]; meta.end = m[2]; }
      const s = sg.exec(ln); if (s){ meta.step = s[1]; }
    }
    return meta;
  }

  function parseHooksCell(cell){
    if (!cell) return [];
    // split on ; first, then on , if needed, trim empties
    const norm = cell.replace(/\s{2,}/g,' ').trim();
    const parts = norm.split(/;+/).flatMap(p => p.split(/,(?![^()]*\))/)).map(s=>s.trim()).filter(Boolean);
    return parts;
  }

  function parseSeismographMarkdown(md){
    if (typeof md !== 'string') throw new Error('Invalid Markdown input');
    // Quick identity check
    const first = md.split(/\r?\n/,1)[0] || '';
    if (!/^#\s*(Woven Map|Psycho)/i.test(first)){
      // still try to parse, but flag might be useful upstream
    }
    const meta = parseHeaderMeta(md);
    const { headers, rows } = parseTable(md);
    if (!rows.length) return { map:{}, meta };
    const map = {};
    rows.forEach(r => {
      const date = normalizeDate(r.date || r.Date);
      if (!date) return;
      const magnitude = parseFloat((r.magnitude || '').replace(/[^0-9.+-]/g,''));
      const valence = parseFloat((r.valence || '').replace(/[^0-9.+-]/g,''));
      const volatility = parseFloat((r.volatility || '').replace(/[^0-9.+-]/g,''));
      const hooks = parseHooksCell(r.hooks);
      map[date] = {
        magnitude: Number.isFinite(magnitude) ? magnitude : 0,
        valence: Number.isFinite(valence) ? valence : 0,
        volatility: Number.isFinite(volatility) ? volatility : 0,
        hooks
      };
    });
    return { map, meta };
  }

  global.parseSeismographMarkdown = parseSeismographMarkdown;
})(typeof window !== 'undefined' ? window : globalThis);

