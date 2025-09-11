"use client";
import React from 'react';
import UsageMeter from '../UsageMeter';
import HitRateDisplay from '../HitRateDisplay';

interface ReportContext {
  id: string;
  type: 'mirror' | 'balance' | 'journal';
  name: string;
  summary: string;
  content: string;
  relocation?: any;
}

interface HeaderProps {
  onFileSelect: (type: 'mirror' | 'balance' | 'journal') => void;
  hasMirrorData: boolean;
  onPoeticInsert: () => void;
  onPoeticCard?: () => void;
  onDemoCard?: () => void;
  onAbout: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  reportContexts: ReportContext[];
  onRemoveReportContext: (contextId: string) => void;
  onShowWrapUp?: () => void;
  onShowPendingReview?: () => void;
  onShowHelp?: () => void;
}

const btnStyle:React.CSSProperties={background:'var(--soft)', color:'var(--text)', border:'1px solid var(--line)', padding:'8px 10px', borderRadius:10, fontSize:13, cursor:'pointer'};

export function Header({ onFileSelect, hasMirrorData, onPoeticInsert, onPoeticCard, onDemoCard, onAbout, onToggleSidebar, sidebarOpen, reportContexts, onRemoveReportContext, onShowWrapUp, onShowPendingReview, onShowHelp }: HeaderProps){
  const getReportIcon = (type: 'mirror' | 'balance' | 'journal') => {
    switch(type) {
      case 'mirror': return '🪞';
      case 'balance': return '🌡️';
      case 'journal': return '📔';
      default: return '📄';
    }
  };

  return (
    <header style={{position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, padding:'12px 18px', background:'rgba(20,24,33,.9)', backdropFilter:'blur(10px)', borderBottom:'1px solid var(--line)'}}>
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <button onClick={onToggleSidebar} style={{...btnStyle, width:38, display:'none', background: sidebarOpen? 'var(--accent)' : 'var(--soft)'}} className="sidebar-toggle">
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <div style={{width:36,height:36,display:'grid',placeItems:'center',borderRadius:'50%',background:'radial-gradient(120% 120% at 50% 20%, #262a36, #12151c)', boxShadow:'inset 0 0 18px rgba(124,92,255,.25)', fontSize:20}} aria-hidden>🐦‍⬛</div>
        <div style={{display:'flex', flexDirection:'column'}}>
          <b>Raven Calder</b>
          <div style={{display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--muted)'}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'var(--good)', boxShadow:'0 0 10px var(--good)'}} />
            <span>Connected</span>
            {reportContexts.length > 0 && (
              <div style={{display:'flex', alignItems:'center', gap:6, marginLeft:8}}>
                <span style={{color:'var(--accent)', fontSize:10}}>•</span>
                <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', maxWidth: '54vw'}}>
                  {reportContexts.map((ctx) => (
                    <div key={ctx.id} style={{display:'flex', alignItems:'center', gap:6, padding:'2px 6px', border:'1px solid var(--line)', borderRadius:12, background:'var(--soft)'}}>
                      <span style={{fontSize:11}} title={ctx.summary}>
                        {getReportIcon(ctx.type)} {ctx.name}
                      </span>
                      <button 
                        onClick={() => onRemoveReportContext(ctx.id)}
                        style={{background:'none', border:'none', color:'var(--muted)', fontSize:10, cursor:'pointer', padding:0}}
                        title="Remove context"
                        aria-label={`Remove ${ctx.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <UsageMeter compact={true} className="hidden sm:block" />
        <HitRateDisplay className="hidden sm:block" />
      </div>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <button style={btnStyle} onClick={() => onFileSelect('mirror')}>🪞 Mirror</button>
        <button style={btnStyle} onClick={() => onFileSelect('balance')}>🌡️ Balance</button>
        <button style={btnStyle} onClick={() => onFileSelect('journal')}>📔 Journal</button>
        {hasMirrorData && (
          <button style={{...btnStyle, background: 'linear-gradient(135deg, #6a53ff, #9c27b0)'}} onClick={onPoeticInsert}>🎭 Poetic</button>
        )}
        <button style={{...btnStyle, background:'transparent'}} onClick={onAbout}>ℹ️ About</button>
      </div>
    </header>
  );
}
