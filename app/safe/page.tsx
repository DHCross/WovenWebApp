"use client";
import { useEffect, useState } from 'react';

type Ping = { ok:boolean; status?:number; error?:string };

export default function SafePage(){
  const [api, setApi] = useState<any>(null);
  const [astro, setAstro] = useState<any>(null);
  const [chatPing, setChatPing] = useState<Ping|null>(null);

  useEffect(()=>{
    async function run(){
      try { const r = await fetch('/.netlify/functions/api-health'); setApi(await r.json()); } catch(e:any){ setApi({error:e?.message||String(e)}); }
      try { const r = await fetch('/.netlify/functions/astrology-health?ping=now'); setAstro(await r.json()); } catch(e:any){ setAstro({error:e?.message||String(e)}); }
      try {
        const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({messages:[{role:'user',content:'planetary weather only'}]})});
        setChatPing({ ok: r.ok, status: r.status });
      } catch(e:any){ setChatPing({ ok:false, error: e?.message||String(e) }); }
    }
    run();
  },[]);

  const box: React.CSSProperties = { border:'1px solid #293241', background:'#111827', padding:12, borderRadius:8 };
  const wrap: React.CSSProperties = { fontFamily:'ui-sans-serif, system-ui', background:'#0f1115', color:'#e8ecf3', minHeight:'100vh', padding:'24px' };

  return (
    <main style={wrap}>
      <div style={{maxWidth: 980, margin:'0 auto'}}>
        <h1 style={{fontSize:28, marginBottom:8}}>Safe Mode · Diagnostics</h1>
        <p style={{opacity:0.85, marginBottom:16}}>This page checks your functions and streaming without any app chrome.
        Use it to verify styling, endpoints, and basic app health.</p>

        <section style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          <div style={box}>
            <h2 style={{fontSize:16, marginBottom:8}}>API Health</h2>
            <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(api, null, 2)}</pre>
          </div>
          <div style={box}>
            <h2 style={{fontSize:16, marginBottom:8}}>Astrology Health</h2>
            <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(astro, null, 2)}</pre>
          </div>
        </section>

        <section style={{marginTop:16, ...box}}>
          <h2 style={{fontSize:16, marginBottom:8}}>/api/chat sanity</h2>
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(chatPing, null, 2)}</pre>
          <p style={{opacity:0.8}}>Expected: status 200 with streamed NDJSON (this summary only shows the initial HTTP status).</p>
        </section>

        <section style={{marginTop:16}}>
          <a href="/math-brain" style={{background:'#7c5cff',color:'#fff',padding:'10px 14px',borderRadius:8,textDecoration:'none'}}>Go to Math Brain</a>
        </section>
      </div>
    </main>
  );
}

