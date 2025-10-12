"use client";
import React, { useState } from 'react';
import { generateId } from '../../lib/id';
import { Message } from './types';
import { VALENCE_NEGATIVE, VALENCE_POSITIVE, VOLATILITY_LADDER, SOURCES_OF_FORCE, MAGNITUDE_SYMBOL, DUPLICATE_EMOJI, TWELVE_HOUSES, HOUSE_CATEGORIES, getHousesByCategory } from '../../lib/taxonomy';

const sectionTitle:React.CSSProperties={fontSize:12, textTransform:'uppercase', letterSpacing:'.14em', color:'var(--muted)', margin:'8px 0 10px'};
const tabStyle: React.CSSProperties = { background: 'none', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--line)', borderRadius: '6px', color: 'var(--muted)', padding: '4px 8px', fontSize: 11, cursor: 'pointer', transition: 'all 0.2s ease' };
const activeTabStyle: React.CSSProperties = { background: 'var(--soft)', color: 'var(--text)', borderColor: 'var(--accent)' };

export function Sidebar({ onInsert, mobileHidden }: { onInsert:(m:Message)=>void; mobileHidden: boolean; }) {
  const [activeSection, setActiveSection] = useState<'glossary' | 'hooks' | 'poetic'>('glossary');
  return (
    <aside style={{background:'var(--panel)', border:'1px solid var(--line)', borderRadius:'var(--radius)', padding:14, height:'100%', overflow:'auto', display: mobileHidden ? 'none' : 'block'}}>
      <div style={{display:'flex', gap:4, marginBottom:16}}>
        <button onClick={() => setActiveSection('glossary')} style={{...tabStyle, ...(activeSection === 'glossary' ? activeTabStyle : {})}}>📖 Glossary</button>
        <button onClick={() => setActiveSection('hooks')} style={{...tabStyle, ...(activeSection === 'hooks' ? activeTabStyle : {})}}>🎣 Hooks</button>
        <button onClick={() => setActiveSection('poetic')} style={{...tabStyle, ...(activeSection === 'poetic' ? activeTabStyle : {})}}>🎭 Poetic</button>
      </div>
      {activeSection === 'glossary' && <Glossary />}
      {activeSection === 'hooks' && <Hooks onInsert={onInsert} />}
      {activeSection === 'poetic' && <Poetic onInsert={onInsert} />}
    </aside>
  );
}

function Glossary(){
  return (
    <div>
  <div style={sectionTitle}>Balance Meter v5.0</div>
  <GlossaryItem symbol={MAGNITUDE_SYMBOL} title="Magnitude" description="Intensity scale (0–5)" details={["0 Trace","1 Pulse","2 Wave","3 Surge","4 Peak","5 Threshold","Neutral measurement—not moral judgment"]} />
  <GlossaryItem symbol="🌞" title="Directional Bias" description="Expansion/Contraction tilt (−5 to +5)" details={["Contractive (−) & Expansive (+) modes","Not moral—just energetic orientation","Replaces legacy 'Valence' term"]} />
  <GlossaryItem symbol="�∠🪐📡♾️" title="Sources of Force" description="Amplifiers & structural factors" details={["Orb · Aspect · Potency · Resonance · Recursion"]} />
  {DUPLICATE_EMOJI.length>0 && <div style={{fontSize:10,color:'var(--warn)',margin:'4px 0 8px'}}>Overlap note: {DUPLICATE_EMOJI.join(', ')} appears in both directional modes (spec provided).</div>}
  <div style={sectionTitle}>Contractive Bias (−)</div>
  {VALENCE_NEGATIVE.map(v => <GlossaryItem key={v.emoji+v.label} symbol={v.emoji} title={v.label} description={v.description||''} />)}
  <div style={sectionTitle}>Expansive Bias (+)</div>
  {VALENCE_POSITIVE.map(v => <GlossaryItem key={v.emoji+v.label} symbol={v.emoji} title={v.label} description={v.description||''} />)}
  <div style={sectionTitle}>Sources of Force</div>
  {SOURCES_OF_FORCE.map(s => <GlossaryItem key={s.emoji+s.label} symbol={s.emoji} title={s.label} description={s.description} />)}
  
  <div style={sectionTitle}>The Twelve Houses</div>
  <GlossaryItem symbol="🏘️" title="Geometric Framework" description="Chart-based channels of lived impact" details={[
    "Each House = falsifiable channel you can check against real experience",
    "Derived from Ascendant and Midheaven geometry", 
    "Strips away prediction, keeps structural meaning"
  ]} />
  
  {HOUSE_CATEGORIES.map(category => (
    <div key={category}>
      <div style={{...sectionTitle, fontSize: 10, marginTop: 12}}>{category}</div>
      {getHousesByCategory(category).map(house => (
        <GlossaryItem 
          key={house.number} 
          symbol={`${house.number}`} 
          title={house.name} 
          description={house.description}
          details={[
            `Keywords: ${house.keywords.join(', ')}`,
            `Lived Experience: ${house.experiential}`
          ]}
        />
      ))}
    </div>
  ))}
    </div>
  );
}

function Hooks({ onInsert }:{ onInsert:(m:Message)=>void }){
  return (
    <div>
      <div style={sectionTitle}>Quick Insights</div>
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
  <Chip label="🔮 Generate Polarity Reading" onClick={()=> onInsert({id:generateId(), role:'user', html:'generate polarity reading'})} />
  <Chip label="🧘 Integration Check" onClick={()=> onInsert({id:generateId(), role:'user', html:'integration check'})} />
  <Chip label="🌊 Flow State Reading" onClick={()=> onInsert({id:generateId(), role:'user', html:'flow state reading'})} />
  <Chip label="🌤️ Explain symbolic weather (plain)" onClick={()=> onInsert({id:generateId(), role:'user', html:'Explain "symbolic weather" in plain, everyday language with zero jargon. Keep it under 120 words.'})} />
      </div>
      
      <div style={sectionTitle}>House Explorations</div>
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
  <Chip label="🏠 Which House theme is active today?" onClick={()=> onInsert({id:generateId(), role:'user', html:'Which of the Twelve Houses themes feels most active in my life right now?'})} />
  <Chip label="🪞 What am I mirroring in relationships?" onClick={()=> onInsert({id:generateId(), role:'user', html:'What patterns am I attracting or projecting in my relationships? (House 7 exploration)'})} />
  <Chip label="🌱 What wants to be expressed?" onClick={()=> onInsert({id:generateId(), role:'user', html:'What creative energy or joy wants to be expressed in my life? (House 5 exploration)'})} />
  <Chip label="🔄 What needs transformation?" onClick={()=> onInsert({id:generateId(), role:'user', html:'What in my life is ready for deep transformation or renewal? (House 8 exploration)'})} />
      </div>
    </div>
  );
}

function Poetic({ onInsert }:{ onInsert:(m:Message)=>void }){
  return (
    <div>
      <div style={sectionTitle}>Creative Commands</div>
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
  <Chip label="✍️ Write my poem" onClick={()=> onInsert({id:generateId(), role:'user', html:'write my poem'})} />
  <Chip label="🎭 Poetic interpretation" onClick={()=> onInsert({id:generateId(), role:'user', html:'poetic interpretation'})} />
  <Chip label="🌟 Symbolic weather report" onClick={()=> onInsert({id:generateId(), role:'user', html:'symbolic weather report'})} />
  <Chip label="📿 Daily mantra" onClick={()=> onInsert({id:generateId(), role:'user', html:'daily mantra'})} />
      </div>
    </div>
  );
}

function GlossaryItem({ symbol, title, description, details }: { symbol: string; title: string; description: string; details?: string[]; }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{marginBottom:12,padding:8,border:'1px solid var(--line)',borderRadius:6,background:'var(--soft)'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,cursor:details?'pointer':'default'}} onClick={()=> details && setExpanded(!expanded)}>
        <span style={{fontSize:16}}>{symbol}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:'bold'}}>{title}</div>
          <div style={{fontSize:11,color:'var(--muted)'}}>{description}</div>
        </div>
        {details && <span style={{fontSize:10,color:'var(--muted)'}}>{expanded?'▼':'▶'}</span>}
      </div>
      {details && expanded && (
        <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--line)'}}>
          {details.map((d,i)=>(<div key={i} style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>• {d}</div>))}
        </div>
      )}
    </div>
  );
}

function Chip({label,onClick}:{label:string; onClick:()=>void}){
  return (
    <button onClick={onClick} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,padding:'8px 12px',borderRadius:8,borderWidth:'1px',borderStyle:'solid',borderColor:'var(--line)',background:'var(--soft)',color:'var(--text)',cursor:'pointer',textAlign:'left',width:'100%'}}>
      {label}
    </button>
  );
}
