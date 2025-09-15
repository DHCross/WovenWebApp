"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{fontFamily:'ui-sans-serif, system-ui',background:'#0f1115',color:'#e8ecf3',minHeight:'100vh',padding:'24px'}}>
        <div style={{maxWidth:860,margin:'0 auto'}}>
          <h1 style={{fontSize:28,marginBottom:8}}>Something went wrong</h1>
          <p style={{opacity:0.9,marginBottom:16}}>An error occurred while rendering this page.</p>
          <pre style={{whiteSpace:'pre-wrap',background:'#111827',padding:12,borderRadius:8,border:'1px solid #1f2937',overflow:'auto'}}>{String(error?.message||'Unknown error')}</pre>
          {error?.digest ? <p style={{opacity:0.7,marginTop:8}}>Digest: {error.digest}</p> : null}
          <button onClick={reset} style={{marginTop:16,background:'#7c5cff',border:'none',padding:'10px 16px',borderRadius:8,color:'#fff',cursor:'pointer'}}>Try again</button>
        </div>
      </body>
    </html>
  );
}

