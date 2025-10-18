// Clean single definition of UsageMeter (previous file had duplicated blocks causing redeclaration errors)
import { useState, useEffect } from 'react';

interface UsageStats {
  requestsToday: number;
  tokensToday: number;
  requestsThisMinute: number;
  limits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    tokensPerMinute: number;
    tokensPerDay: number;
  };
  percentages: {
    dailyRequests: number;
    dailyTokens: number;
    minuteRequests: number;
  };
}

interface UsageMeterProps { compact?: boolean; className?: string; }

export default function UsageMeter({ compact = false, className = "" }: UsageMeterProps) {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStats(){
    try {
      const res = await fetch('/api/usage');
      if (res.ok){
        const data = await res.json();
        setStats(data);
      }
    } catch(e){
      // silent
    }
  }

  if(!stats) return null;

  const color = (p:number) => p >= 90 ? '#f87171' : p >= 70 ? '#facc15' : 'var(--good)';
  const bar  = (p:number) => ({ background: color(p) });
  const txt  = (p:number) => ({ color: color(p) });

  if (compact && !expanded) {
    return (
      <button onClick={()=> setExpanded(true)} className={`flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-gray-700 transition-colors ${className}`}
        style={{ background: 'var(--soft)', border: '1px solid var(--line)' }}>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--good)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{stats.requestsToday}/{stats.limits.requestsPerDay}</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>API</span>
      </button>
    );
  }

  return (
    <div className={`rounded-lg p-4 ${className}`} style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Perplexity API Usage</h3>
        {compact && (
          <button onClick={()=> setExpanded(false)} className="text-xs" style={{ color: 'var(--muted)' }}>✕</button>
        )}
      </div>
      <div className="space-y-3">
        <UsageRow label="Daily Requests" value={`${stats.requestsToday}/${stats.limits.requestsPerDay}`} pct={stats.percentages.dailyRequests} txt={txt} bar={bar} />
        <UsageRow label="Daily Tokens" value={`${stats.tokensToday.toLocaleString()}/${stats.limits.tokensPerDay.toLocaleString()}`} pct={stats.percentages.dailyTokens} txt={txt} bar={bar} />
        <UsageRow label="Requests/Minute" value={`${stats.requestsThisMinute}/${stats.limits.requestsPerMinute}`} pct={stats.percentages.minuteRequests} txt={txt} bar={bar} />
      </div>
      <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--good)' }} />
          <span>Free tier limits • Resets daily</span>
        </div>
      </div>
    </div>
  );
}

function UsageRow({ label, value, pct, txt, bar }: { label: string; value: string; pct: number; txt: (p:number)=>any; bar: (p:number)=>any; }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
        <span className="text-xs" style={txt(pct)}>{value} ({pct}%)</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--soft)' }}>
        <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(pct,100)}%`, ...bar(pct) }} />
      </div>
    </div>
  );
}
