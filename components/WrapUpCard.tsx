"use client";
import React, { useState } from 'react';
import ActorRoleDetector, { ActorRoleComposite } from '../lib/actor-role-detector';
import { pingTracker } from '../lib/ping-tracker';

interface WrapUpCardProps {
  sessionId?: string;
  onClose?: () => void;
  onSealed?: (sealedSessionId: string, nextSessionId: string) => void;
}

const WrapUpCard: React.FC<WrapUpCardProps> = ({ sessionId, onClose, onSealed }) => {
  const [composite, setComposite] = useState<ActorRoleComposite | null>(null);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [rubricStartTs, setRubricStartTs] = useState<number | null>(null);
  // Rubric state (0-3 per category) and null/miss flags
  const [showRubric, setShowRubric] = useState(false);
  const [rubricScores, setRubricScores] = useState({
    pressure: 0,
    outlet: 0,
    conflict: 0,
    tone: 0,
    surprise: 0,
  });
  const [rubricNulls, setRubricNulls] = useState({
    pressure: false,
    outlet: false,
    conflict: false,
    tone: false,
    surprise: false,
  });
  const [rubricSealedSessionId, setRubricSealedSessionId] = useState<string | null>(null);
  const [showPendingNote, setShowPendingNote] = useState<number>(0);

  const generateActorRoleReveal = async () => {
    setIsGenerating(true);
    
    try {
      // Get session diagnostics from ping tracker
      const diagnostics = pingTracker.exportSessionDiagnostics(sessionId);
      setSessionStats(diagnostics.stats);

      // Generate Actor/Role composite from session patterns
      const detector = ActorRoleDetector.getInstance();
  const result = detector.generateComposite(diagnostics.patterns);
      setComposite(result);
      
    } catch (error) {
      console.error('Error generating Actor/Role reveal:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  React.useEffect(() => {
    generateActorRoleReveal();
  }, [sessionId]);

  const totalScore = rubricScores.pressure + rubricScores.outlet + rubricScores.conflict + rubricScores.tone + rubricScores.surprise;
  const scoreBand = totalScore >= 13 ? 'Strong signal' : totalScore >= 10 ? 'Some clear hits' : totalScore >= 6 ? 'Mild resonance' : 'Didn’t land';

  function ScoreSlider({ label, helper, keyName }:{ label:string; helper?:string; keyName:keyof typeof rubricScores }){
    const value = rubricScores[keyName];
    const nullMarked = rubricNulls[keyName as keyof typeof rubricNulls];
    return (
      <div className="rubric-row">
        <div className="rubric-label">
          <div>{label}</div>
          {helper && <div className="rubric-helper">{helper}</div>}
        </div>
        <input
          type="range"
          min={0}
          max={3}
          step={1}
          value={value}
          onChange={(e)=> setRubricScores(s=>({...s, [keyName]: Number(e.target.value)}))}
          disabled={!!rubricSealedSessionId}
        />
        <div className="rubric-value">{value}</div>
        <label className="rubric-null">
          <input type="checkbox" checked={!!nullMarked} onChange={(e)=> setRubricNulls(n=>({...n, [keyName]: e.target.checked}))} disabled={!!rubricSealedSessionId} /> Mark as off-base (Null/Miss)
        </label>
      </div>
    );
  }

  function handleOpenRubric(){
    setShowRubric(true);
    setRubricStartTs(Date.now());
    logEvent('rubric_opened', { sessionId: pingTracker.getCurrentSessionId() });
  }

  function isEmptyRubric(){
    const allZero = Object.values(rubricScores).every(v => v === 0);
    const anyNull = Object.values(rubricNulls).some(Boolean);
    return allZero && !anyNull;
  }

  function handleSealRubric(){
    // Idempotence
    if (rubricSealedSessionId) {
      setToast('This reading is already sealed.');
      setTimeout(()=>setToast(null), 2500);
      return;
    }

    if (isEmptyRubric()) {
      const proceed = typeof window !== 'undefined' ? window.confirm('Submit with no scores? You can still seal the reading.') : true;
      if (!proceed) return;
    }

    try {
      const sid = pingTracker.getCurrentSessionId();
      const pending = pingTracker.getPendingCount(true);
      setShowPendingNote(pending);
      const start = rubricStartTs || Date.now();

      const nullKeys = Object.entries(rubricNulls)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const aggregate = totalScore;

      // Seal the session container when user submits the rubric, per protocol
      pingTracker.sealSession(sid);
      const nextId = pingTracker.getCurrentSessionId();
      setRubricSealedSessionId(sid);
      setToast('Reading sealed. New messages start a fresh reading.');
      setTimeout(()=>setToast(null), 2500);

      // Analytics/event log
      logEvent('rubric_submitted', {
        sessionId: sid,
        scores: rubricScores,
        nulls: nullKeys,
        aggregate,
        timeToCompleteMs: Date.now() - start
      });
      logEvent('session_sealed', { sealedSessionId: sid, nextSessionId: nextId });

      // Notify host to post the "thanks/sealed" line
      onSealed?.(sid, nextId);
    } catch (error:any) {
      logEvent('rubric_submit_failed', { sessionId: pingTracker.getCurrentSessionId(), error: String(error) });
      setToast("Couldn't save scores. Your reading isn't sealed. Try again?");
    }
  }

  function handleSkipRubric(){
    setShowRubric(false);
    setRubricStartTs(null);
    logEvent('rubric_skipped', { sessionId: pingTracker.getCurrentSessionId() });
  }

  function handleCancelRubric(){
    setShowRubric(false);
    setToast('No scores saved. You can open the rubric again before we close.');
    setTimeout(()=>setToast(null), 2500);
  }

  function logEvent(name:string, payload:any){
    try { console.log(`[analytics] ${name}`, payload); } catch {}
  }

  if (isGenerating) {
    return (
      <div className="wrap-up-card generating">
        <div className="card-header">
          <h3>🎭 Generating Actor / Role Reveal...</h3>
        </div>
        <div className="generating-content">
          <div className="dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>Mapping your resonance pattern...</p>
        </div>
        <style jsx>{`
          .wrap-up-card {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 12px;
            padding: 24px;
            margin: 16px 0;
            max-width: 600px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          
          .card-header h3 {
            color: #f1f5f9;
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
          }
          
          .generating-content {
            text-align: center;
            padding: 20px 0;
          }
          
          .dots {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 16px;
          }
          
          .dots span {
            width: 8px;
            height: 8px;
            background: #3b82f6;
            border-radius: 50%;
            animation: pulse 1.4s ease-in-out infinite both;
          }
          
          .dots span:nth-child(1) { animation-delay: -0.32s; }
          .dots span:nth-child(2) { animation-delay: -0.16s; }
          
          @keyframes pulse {
            0%, 80%, 100% {
              transform: scale(0);
              opacity: 0.5;
            }
            40% {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          .generating-content p {
            color: #94a3b8;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  if (!composite || !sessionStats) {
    return (
      <div className="wrap-up-card no-data">
        <div className="card-header">
          <h3>🎭 Actor / Role Reveal</h3>
        </div>
        <p>Not enough session data for diagnostic analysis.</p>
        <p>Try giving feedback on a few more of Raven's mirrors.</p>
        <style jsx>{`
          .wrap-up-card {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 12px;
            padding: 24px;
            margin: 16px 0;
            max-width: 600px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          
          .card-header h3 {
            color: #f1f5f9;
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
          }
          
          p {
            color: #94a3b8;
            margin: 8px 0;
          }
        `}</style>
      </div>
    );
  }

  const getConfidenceColor = (band?: 'LOW'|'MODERATE'|'HIGH') => {
    if (band === 'HIGH') return '#22c55e';
    if (band === 'MODERATE') return '#f59e0b';
    return '#ef4444';
  };

  const getGlyph = (sign: string) => {
    const glyphs: Record<string, string> = {
      'Aries': '♈', 'Taurus': '♉', 'Gemini': '♊', 'Cancer': '♋',
      'Leo': '♌', 'Virgo': '♍', 'Libra': '♎', 'Scorpio': '♏',
      'Sagittarius': '♐', 'Capricorn': '♑', 'Aquarius': '♒', 'Pisces': '♓'
    };
    return glyphs[sign] || '●';
  };

  return (
    <div className="wrap-up-card">
      {onClose && (
        <button className="close-button" onClick={onClose}>×</button>
      )}
      
      <div className="card-header">
        <h3>🎭 Actor / Role Reveal</h3>
        <p className="subtitle">Raven's diagnostic guess, derived from your resonance pattern</p>
      </div>

      <div className="composite-reveal">
        <div className="composite-name">
          {composite.actor !== 'Unknown' && <span className="actor">{composite.actor}</span>}
          {(composite.actor !== 'Unknown' || composite.role !== 'Unknown') && <span className="separator">/</span>}
          {composite.role !== 'Unknown' && <span className="role">{composite.role}</span>}
        </div>
        {(composite.actor !== 'Unknown' || composite.role !== 'Unknown') && (composite.sampleSize || 0) > 0 ? (
          <div className="composite-title">{composite.composite}</div>
        ) : (
          <div className="composite-title muted">Not enough data for a composite</div>
        )}
        {(composite.sampleSize || 0) > 0 && (
          <div 
            className="confidence-bar"
            style={{ 
              background: `linear-gradient(90deg, ${getConfidenceColor(composite.confidenceBand)} ${Math.round((composite.confidence || 0) * 100)}%, rgba(255,255,255,0.1) ${Math.round((composite.confidence || 0) * 100)}%)`
            }}
          >
            <span className="confidence-text">
              {(composite.confidenceBand || 'LOW').toLowerCase()} confidence
            </span>
          </div>
        )}
      </div>

  <div className="explanation">
        <p>
          This blend comes from what landed (✅) and how your clarifications shaped the misses (❌). Raven tests patterns; you’re the validator.
          {composite.driftBand && composite.driftBand !== 'NONE' && (
            <>
              {composite.driftBand === 'POSSIBLE' && (
                <span className="sidereal-note"> Some ❌ clarifications leaned Driver-first (sidereal). Raven notes a sidereal lean; future mirrors will weight it lightly.</span>
              )}
              {composite.driftBand === 'STRONG' && (
                <span className="sidereal-note"> Your clarifications strongly aligned with sidereal Drivers. Raven will prioritize Driver language while still showing Role for visibility.</span>
              )}
              {typeof composite.driftIndex === 'number' && (
                <span className="di"> (DI: {Math.round(composite.driftIndex * 100)}% • n={composite.evidenceN})</span>
              )}
            </>
          )}
        </p>
        <p style={{color:'#94a3b8', fontSize:12, marginTop:8}}>
          Method: weighted by what landed (WB) and probe clarifications on misses (OSR). Confidence: {(composite.confidenceBand || 'LOW').toLowerCase()}.
          {composite.tieBreak && <span> Tie-break favored {composite.tieBreak} evidence.</span>}
        </p>
      </div>

      {/* Rubric Trigger */}
      {!rubricSealedSessionId && (
        <div className="rubric-cta">
          <div className="rubric-cta-title">Score this reflection?</div>
          <div className="rubric-cta-body">Optional. Your marks help Raven calibrate. These scores apply to this session only.</div>
          <div className="rubric-cta-actions">
            <button className="btn primary" onClick={handleOpenRubric}>Open rubric</button>
            <button className="btn" onClick={handleSkipRubric}>Skip</button>
          </div>
        </div>
      )}

      {/* Rubric UI */}
      {showRubric && (
        <div className="rubric">
          <div className="rubric-title">Reading Rubric</div>
          <div className="rubric-micro">Not sure on a slider? Leave it. Only what you mark counts.</div>
          <ScoreSlider label="Pressure Mirror" helper="How I respond under stress." keyName="pressure" />
          <ScoreSlider label="Outlet Type" helper="What restores clarity or relief." keyName="outlet" />
          <ScoreSlider label="Internal Conflict" helper="Recurring push–pull I recognize." keyName="conflict" />
          <ScoreSlider label="Emotional Tone" helper="Feels personal, not generic." keyName="tone" />
          <ScoreSlider label="Surprise Signal" helper="True angle I hadn’t named before." keyName="surprise" />

          <div className="rubric-summary">
            {showPendingNote > 0 && (
              <div className="rubric-pending-note">{showPendingNote} mirrors unscored. They don’t affect your result.</div>
            )}
            <div>Aggregate: <b>{totalScore}</b> / 15 — {scoreBand}</div>
            <div className="rubric-note">These scores apply to this session only.</div>
            {Object.values(rubricNulls).filter(Boolean).length > 0 && (
              <div className="rubric-null-note">{Object.values(rubricNulls).filter(Boolean).length} items marked off-base — these are important for calibration.</div>
            )}
            <div className="rubric-footer-note">Marking misses is useful. It tunes the map.</div>
          </div>

          {!rubricSealedSessionId && (
            <div className="rubric-actions">
              <button className="btn primary" onClick={handleSealRubric}>Submit rubric & close reading</button>
              <button className="btn" onClick={handleCancelRubric}>Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Post-submit summary of user's marks */}
      {rubricSealedSessionId && (
        <div className="rubric-results">
          <div className="rubric-results-title">Your marks</div>
          <ul className="rubric-results-list">
            {([
              ['Pressure Mirror', 'pressure'],
              ['Outlet Type', 'outlet'],
              ['Internal Conflict', 'conflict'],
              ['Emotional Tone', 'tone'],
              ['Surprise Signal', 'surprise']
            ] as const).map(([label, key]) => (
              <li key={key}>
                <span className="label">{label}</span>
                <span className="value">{rubricScores[key as keyof typeof rubricScores]}</span>
                {rubricNulls[key as keyof typeof rubricNulls] && <span className="flag" title="Marked off-base">⚑</span>}
              </li>
            ))}
          </ul>
          <div className="rubric-results-agg">{totalScore} / 15 — {scoreBand}</div>
          <div className="rubric-note">These scores apply to this session only.</div>
        </div>
      )}

    <div className="glyph-trace">
        <div className="glyph-item">
      <span className="glyph">☉{getGlyph(composite.actorSigns?.[0] || 'Sagittarius')}</span>
          <span className="glyph-label">Actor (sidereal)</span>
        </div>
        <div className="glyph-item">
      <span className="glyph">☿{getGlyph(composite.roleSigns?.[0] || 'Scorpio')}</span>
          <span className="glyph-label">Role (tropical)</span>
        </div>
      </div>

  <div className="resonance-scorecard">
        <div className="scorecard-header">Resonance Scorecard</div>
        <div className="score-grid">
          <div className="score-item wb">
            <span className="score-icon">✅</span>
            <span className="score-label">WB mirrors</span>
            <span className="score-count">{sessionStats.breakdown.yes}</span>
          </div>
          <div className="score-item abe">
            <span className="score-icon">🟡</span>
            <span className="score-label">ABE mirrors</span>
            <span className="score-count">{sessionStats.breakdown.maybe}</span>
          </div>
          <div className="score-item osr">
            <span className="score-icon">❌</span>
            <span className="score-label">OSR mirrors</span>
            <span className="score-count">{sessionStats.breakdown.no + sessionStats.breakdown.unclear}</span>
          </div>
        </div>
        <div className="scorecard-footer">
          WB {sessionStats.breakdown.yes} · ABE {sessionStats.breakdown.maybe} · OSR {sessionStats.breakdown.no + sessionStats.breakdown.unclear}
          {typeof sessionStats.breakdown.pending === 'number' && <span> · PENDING {sessionStats.breakdown.pending}</span>}
        </div>
      </div>

      <div className="closing-note">
        <p>
          <em>This is a mirror, not a label. It may shift as future sessions add more data. 
          You are the validator.</em>
        </p>
        {rubricSealedSessionId && (
          <p className="session-note">This reading is sealed. New messages start a fresh reading container.</p>
        )}
      </div>

      <style jsx>{`
        .wrap-up-card {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          padding: 24px;
          margin: 16px 0;
          max-width: 600px;
          position: relative;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          font-family: 'Inter', sans-serif;
        }
        
        .close-button {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 24px;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }
        
        .close-button:hover {
          color: #f1f5f9;
        }
        
        .card-header h3 {
          color: #f1f5f9;
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }
        
        .subtitle {
          color: #94a3b8;
          margin: 0 0 20px 0;
          font-size: 14px;
          font-style: italic;
        }
        
        .composite-reveal {
          text-align: center;
          margin: 24px 0;
          padding: 20px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
        }
        
        .composite-name {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #f1f5f9;
        }
        
        .actor {
          color: #3b82f6;
        }
        
        .separator {
          color: #64748b;
          margin: 0 8px;
        }
        
        .role {
          color: #10b981;
        }
        
        .composite-title {
          font-size: 18px;
          color: #e2e8f0;
          margin-bottom: 16px;
          font-weight: 500;
        }
  .composite-title.muted { color: #94a3b8; font-style: italic; }
        
        .confidence-bar {
          height: 6px;
          border-radius: 3px;
          position: relative;
          overflow: hidden;
        }
        
        .confidence-text {
          position: absolute;
          top: -24px;
          right: 0;
          font-size: 12px;
          color: #94a3b8;
        }
        
        .explanation {
          margin: 24px 0;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
        
        .explanation p {
          color: #e2e8f0;
          line-height: 1.6;
          margin: 0;
          font-size: 14px;
        }
        
  .sidereal-note {
          color: #f59e0b;
          font-weight: 500;
        }
  .di { color: #94a3b8; margin-left: 6px; }
        
        .glyph-trace {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin: 20px 0;
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }
        
        .glyph-item {
          text-align: center;
        }
        
        .glyph {
          display: block;
          font-size: 24px;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        
        .glyph-label {
          font-size: 11px;
          color: #64748b;
        }
        
        .resonance-scorecard {
          margin: 20px 0;
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }
        
        .scorecard-header {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 12px;
          text-align: center;
        }
        
        .score-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .score-item {
          text-align: center;
          padding: 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
        }
        
        .score-item.wb { border: 1px solid rgba(34, 197, 94, 0.3); }
        .score-item.abe { border: 1px solid rgba(245, 158, 11, 0.3); }
        .score-item.osr { border: 1px solid rgba(239, 68, 68, 0.3); }
        
        .score-icon {
          display: block;
          font-size: 16px;
          margin-bottom: 4px;
        }
        
        .score-label {
          display: block;
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 2px;
        }
        
        .score-count {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .scorecard-footer {
          font-size: 11px;
          color: #64748b;
          text-align: center;
          font-style: italic;
        }
        
        .closing-note {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
        }
        
        .closing-note p {
          color: #94a3b8;
          font-size: 13px;
          text-align: center;
          margin: 0;
        }

  .rubric-cta { margin: 18px 0; text-align: center; }
        .rubric-cta-title { color:#f1f5f9; font-weight:600; margin-bottom:4px; }
        .rubric-cta-body { color:#e2e8f0; margin: 0 0 10px 0; font-size:13px; }
        .rubric-cta-actions { display:flex; gap:8px; justify-content:center; }
  .btn { background: rgba(255,255,255,0.06); border:1px solid rgba(148,163,184,0.3); color:#e2e8f0; padding:8px 12px; border-radius:8px; cursor:pointer; }
  .btn.primary { background:#3b82f6; border-color:#2563eb; }

  .rubric { margin:16px 0; padding:12px; background: rgba(0,0,0,0.25); border:1px solid rgba(148,163,184,0.2); border-radius:8px; }
        .rubric-title { color:#f1f5f9; font-weight:600; text-align:center; margin-bottom:6px; }
        .rubric-micro { color:#94a3b8; font-size:12px; text-align:center; margin-bottom:8px; }
        .rubric-row { display:flex; align-items:center; gap:8px; margin:8px 0; }
        .rubric-label { flex:1; color:#e2e8f0; font-size:13px; }
        .rubric-helper { color:#94a3b8; font-size:11px; }
  .rubric-value { width:24px; text-align:right; color:#e2e8f0; }
  .rubric-null { font-size:12px; color:#94a3b8; }
  .rubric-summary { margin-top:10px; color:#e2e8f0; font-size:13px; }
  .rubric-note { color:#94a3b8; font-size:12px; }
  .rubric-null-note { color:#f59e0b; font-size:12px; margin-top:4px; }
        .rubric-pending-note { color:#94a3b8; font-size:12px; margin-bottom:6px; font-style: italic; }
  .rubric-actions { margin-top:12px; text-align:center; }

        .rubric-results { margin:14px 0; padding:12px; background: rgba(0,0,0,0.2); border:1px solid rgba(148,163,184,0.2); border-radius:8px; }
        .rubric-results-title { color:#f1f5f9; font-weight:600; margin-bottom:8px; text-align:center; }
        .rubric-results-list { list-style:none; padding:0; margin:0 0 8px 0; }
        .rubric-results-list li { display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border-bottom:1px dashed rgba(148,163,184,0.2); }
        .rubric-results-list li:last-child { border-bottom:none; }
        .rubric-results-list .label { color:#e2e8f0; font-size:13px; }
        .rubric-results-list .value { color:#f1f5f9; font-weight:600; }
        .rubric-results-list .flag { margin-left:6px; color:#f59e0b; }
        .rubric-results-agg { color:#e2e8f0; text-align:center; font-weight:600; }

        .toast { position:absolute; top:8px; right:8px; background:#0b1220; border:1px solid rgba(148,163,184,0.3); color:#e2e8f0; padding:8px 10px; border-radius:8px; font-size:13px; box-shadow:0 8px 24px rgba(0,0,0,0.4); }
      `}</style>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
};

export default WrapUpCard;
