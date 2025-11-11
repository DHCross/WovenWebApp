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
    // New Balance Meter format columns
    if (s === 'triple channel') return 'triple_channel';
    if (s === 'top hooks') return 'hooks';
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
      // Look for old seismograph format OR new Balance Meter format
      if (/^\|/.test(lines[i]) && /date/i.test(lines[i]) && 
          (/mag|magnitude/i.test(lines[i]) || /triple channel/i.test(lines[i]))){
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

  function parseTripleChannelData(tripleChannelText){
    // Parse Balance Meter format: "⚡ 5.0 · Val 🌋 -10.9 · Bal 💎 +5.0 · stabilizers mixed"
    const defaults = { magnitude: 0, valence: 0, balance: 0 };
    if (!tripleChannelText) return defaults;
    
    // Extract magnitude (⚡ X.X)
    const magMatch = tripleChannelText.match(/⚡\s*([0-9.+-]+)/);
    const magnitude = magMatch ? parseFloat(magMatch[1]) : 0;
    
    // Extract valence (Val 🌋 X.X)
    const valMatch = tripleChannelText.match(/Val\s*[^0-9+\-]{0,4}\s*([+-]?\d+(?:\.\d+)?)/);
    const valence = valMatch ? parseFloat(valMatch[1]) : 0;

    // Extract balance (Bal 💎 X.X)
    const balMatch = tripleChannelText.match(/Bal\s*[^0-9+\-]{0,4}\s*([+-]?\d+(?:\.\d+)?)/);
    const balance = balMatch ? parseFloat(balMatch[1]) : 0;
    
    return {
      magnitude: Number.isFinite(magnitude) ? magnitude : 0,
      valence: Number.isFinite(valence) ? valence : 0,
      balance: Number.isFinite(balance) ? balance : 0
    };
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
    // Quick identity check - accept Balance Meter reports too
    const first = md.split(/\r?\n/,1)[0] || '';
    if (!/^#\s*(Woven Map|Psycho|Balance Meter)/i.test(first)){
      // still try to parse, but flag might be useful upstream
    }
    const meta = parseHeaderMeta(md);
    const { headers, rows } = parseTable(md);
    if (!rows.length) throw new Error('No seismograph table found');
    const map = {};
    
    rows.forEach(r => {
      const date = normalizeDate(r.date || r.Date);
      if (!date) return;
      
      let magnitude, valence, volatility = 0;
      let hooks = [];
      
      // Handle old seismograph format
      if (r.magnitude !== undefined) {
        magnitude = parseFloat((r.magnitude || '').replace(/[^0-9.+-]/g,''));
        valence = parseFloat((r.valence || '').replace(/[^0-9.+-]/g,''));
        volatility = parseFloat((r.volatility || '').replace(/[^0-9.+-]/g,''));
        hooks = parseHooksCell(r.hooks);
      }
      // Handle new Balance Meter format
      else if (r.triple_channel) {
        const tripleData = parseTripleChannelData(r.triple_channel);
        magnitude = tripleData.magnitude;
        valence = tripleData.valence;
        volatility = tripleData.balance; // Use balance as volatility substitute
        hooks = parseHooksCell(r.hooks);
      }
      
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
