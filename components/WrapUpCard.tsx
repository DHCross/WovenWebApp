"use client";
import React, { useEffect, useState } from 'react';
import ActorRoleDetector, { ActorRoleComposite } from '../lib/actor-role-detector';
import { pingTracker } from '../lib/ping-tracker';
import { sanitizeForPDF } from '../src/pdf-sanitizer';

type AnalyticsPayload = Record<string, unknown>;
type RubricKey = 'pressure' | 'outlet' | 'conflict' | 'tone' | 'surprise';

const logEvent = (eventName: string, payload: AnalyticsPayload = {}) => {
  if (typeof window !== 'undefined') {
    const analyticsWindow = window as typeof window & {
      dataLayer?: Array<Record<string, unknown>>;
    };

    if (Array.isArray(analyticsWindow.dataLayer)) {
      analyticsWindow.dataLayer.push({ event: eventName, ...payload });
    }
  }

  if (typeof console !== 'undefined') {
    console.debug(`[analytics] ${eventName}`, payload);
  }
};

interface WrapUpCardProps {
  sessionId?: string;
  onClose?: () => void;
  onSealed?: (sealedSessionId: string, nextSessionId: string) => void;
  exportData?: any;
}

const WrapUpCard: React.FC<WrapUpCardProps> = ({ sessionId, onClose, onSealed, exportData }) => {
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
  const [prefetchedExport, setPrefetchedExport] = useState<any | null>(exportData ?? null);

  const ScoreSlider: React.FC<{ label: string; helper: string; keyName: RubricKey }> = ({
    label,
    helper,
    keyName
  }) => {
    const value = rubricScores[keyName];
    const isNull = rubricNulls[keyName];

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = Number(event.target.value);
      setRubricScores(prev => ({ ...prev, [keyName]: numericValue }));
      setRubricNulls(prev => ({ ...prev, [keyName]: false }));
      logEvent('rubric_score_changed', { key: keyName, value: numericValue });
    };

    const toggleNull = () => {
      setRubricNulls(prev => {
        const nextNull = !prev[keyName];
        if (nextNull) {
          setRubricScores(scores => ({ ...scores, [keyName]: 0 }));
        }
        logEvent('rubric_score_null_toggled', { key: keyName, null: nextNull });
        return { ...prev, [keyName]: nextNull };
      });
    };

    return (
      <div className="rubric-row">
        <div className="rubric-label">
          <div>{label}</div>
          <div className="rubric-helper">{helper}</div>
        </div>
        <input
          type="range"
          min={0}
          max={3}
          step={1}
          value={value}
          onChange={handleChange}
          disabled={isNull}
          aria-label={`${label} score`}
        />
        <div className="rubric-value">{isNull ? '—' : value}</div>
        <label className="rubric-null">
          <input type="checkbox" checked={isNull} onChange={toggleNull} /> Null
        </label>
      </div>
    );
  };

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

  useEffect(() => {
    setPrefetchedExport(exportData ?? null);
    if (exportData?.scores && !sessionStats) {
      setSessionStats(exportData.scores);
    }
  }, [exportData, sessionStats]);

  const totalScore = rubricScores.pressure + rubricScores.outlet + rubricScores.conflict + rubricScores.tone + rubricScores.surprise;
  const scoreBand = totalScore >= 13 ? 'Strong signal' : totalScore >= 10 ? 'Some clear hits' : totalScore >= 6 ? 'Mild resonance' : 'Didn\'t land';

  const handleOpenRubric = () => {
    const pendingCount = typeof sessionStats?.breakdown?.pending === 'number'
      ? sessionStats.breakdown.pending
      : 0;
    setShowRubric(true);
    setShowPendingNote(pendingCount);
    setRubricStartTs(Date.now());
    logEvent('rubric_opened', {
      sessionId: sessionId || pingTracker.getCurrentSessionId(),
      pendingCount
    });
  };

  const handleSkipRubric = () => {
    setShowRubric(false);
    setShowPendingNote(0);
    setRubricStartTs(null);
    setToast('Rubric skipped');
    setTimeout(() => setToast(null), 2000);
    logEvent('rubric_skipped', { sessionId: sessionId || pingTracker.getCurrentSessionId() });
  };

  const handleCancelRubric = () => {
    setShowRubric(false);
    setShowPendingNote(0);
    setRubricStartTs(null);
    setToast('Rubric canceled');
    setTimeout(() => setToast(null), 2000);
    logEvent('rubric_cancelled', { sessionId: sessionId || pingTracker.getCurrentSessionId() });
  };

  const handleSealRubric = () => {
    const activeSessionId = sessionId || pingTracker.getCurrentSessionId();
    const nullCount = Object.values(rubricNulls).filter(Boolean).length;
    const durationMs = rubricStartTs ? Date.now() - rubricStartTs : undefined;

    pingTracker.sealSession(sessionId);
    const nextSessionId = pingTracker.getCurrentSessionId();

    setRubricSealedSessionId(activeSessionId);
    setShowRubric(false);
    setShowPendingNote(0);
    setRubricStartTs(null);
    setToast('Rubric submitted. Reading sealed.');
    setTimeout(() => setToast(null), 2500);

    if (onSealed) {
      onSealed(activeSessionId, nextSessionId);
    }

    logEvent('rubric_sealed', {
      sessionId: activeSessionId,
      totalScore,
      scoreBand,
      nullCount,
      durationMs
    });
  };

  const handleExportCSV = async () => {
    try {
      const diagnostics = pingTracker.exportSessionDiagnostics(sessionId);
      const rows: string[][] = [];
      const pushRow = (label: string, value: unknown) => {
        const normalized = value === null || value === undefined
          ? ''
          : Array.isArray(value)
            ? value.map(item => (typeof item === 'string' ? item : JSON.stringify(item))).join(' | ')
            : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value);
        rows.push([label, normalized]);
      };

      pushRow('Export Generated At', new Date().toISOString());
      pushRow('Session ID', diagnostics.sessionId);
      pushRow('Total Mirrors', diagnostics.stats.total);
      pushRow('Accuracy Rate (%)', diagnostics.stats.accuracyRate.toFixed(2));
      pushRow('Clarity Rate (%)', diagnostics.stats.clarityRate.toFixed(2));

      Object.entries(diagnostics.stats.breakdown || {}).forEach(([key, value]) => {
        pushRow(`Breakdown - ${key}`, value);
      });

      Object.entries(diagnostics.stats.byCheckpointType || {}).forEach(([key, value]) => {
        pushRow(`Checkpoint ${key} Total`, value.total);
        pushRow(`Checkpoint ${key} Accuracy (%)`, value.accuracyRate.toFixed(2));
        pushRow(`Checkpoint ${key} Clarity (%)`, value.clarityRate.toFixed(2));
      });

      if (composite) {
        pushRow('Composite', composite.composite || '');
        pushRow('Actor', composite.actor || '');
        pushRow('Role', composite.role || '');
        pushRow('Confidence (%)', (composite.confidence ?? 0) * 100);
        pushRow('Confidence Band', composite.confidenceBand || '');
        pushRow('Sample Size', composite.sampleSize ?? '');
      }

      if (rubricSealedSessionId) {
        pushRow('Rubric Session', rubricSealedSessionId);
        pushRow('Rubric Total Score', totalScore);
        pushRow('Rubric Score Band', scoreBand);
        Object.entries(rubricScores).forEach(([key, value]) => {
          const label = `Rubric ${key}`;
          pushRow(label, value);
          pushRow(`${label} Null`, rubricNulls[key as RubricKey]);
        });
      }

      const csvContent = rows
        .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `raven-session-${diagnostics.sessionId.slice(-8)}-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast('CSV exported successfully');
      setTimeout(() => setToast(null), 2500);
      logEvent('csv_export_success', { sessionId: diagnostics.sessionId });
    } catch (error) {
      console.error('CSV export failed:', error);
      setToast('CSV export failed. Please try again.');
      setTimeout(() => setToast(null), 2500);
      logEvent('csv_export_failed', { error: String(error) });
    }
  };

  // Distinct PDF content creation for Mirror and Balance reports
  const createEnhancedPDFContent = (): HTMLElement => {
    const container = document.createElement('div');
    container.style.cssText = `
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      max-width: 8in;
      margin: 0 auto;
      padding: 0.5in;
      background: white;
      color: #1a1a1a;
      line-height: 1.6;
    `;

    const currentSessionId = sessionId || pingTracker.getCurrentSessionId();
    const exportDate = new Date();
    const isBalanceReport = Boolean(
      sessionStats &&
      typeof sessionStats === 'object' &&
      'magnitude' in sessionStats &&
      'valence' in sessionStats &&
      'volatility' in sessionStats
    );
    const reportTitle = isBalanceReport ? 'Balance Meter Report' : 'Mirror Report';
    const safe = (value: unknown, fallback: string = '—') =>
      sanitizeForPDF(
        value === undefined || value === null || value === '' ? fallback : String(value)
      );
    const breakdown = (sessionStats?.breakdown as Record<string, number> | undefined) || {};
    const balanceSummary = `
      <div style="margin-bottom: 0.4in;">
        <h2 style="color: #4338ca; font-size: 18pt; margin-bottom: 0.2in; border-bottom: 1px solid #e5e7eb;">Executive Summary</h2>
        <div style="background: #f8fafc; padding: 0.3in; border-radius: 8px;">
          <p><strong>Magnitude:</strong> ${safe((sessionStats as any)?.magnitude)}</p>
          <p><strong>Valence:</strong> ${safe((sessionStats as any)?.valence)}</p>
          <p><strong>Volatility:</strong> ${safe((sessionStats as any)?.volatility)}</p>
          <p><strong>Balance Ready:</strong> ${safe((sessionStats as any)?.balance_ready)}</p>
        </div>
      </div>
    `;
    const mirrorSummary = `
      <div style="margin-bottom: 0.4in;">
        <h2 style="color: #4338ca; font-size: 18pt; margin-bottom: 0.2in; border-bottom: 1px solid #e5e7eb;">Executive Summary</h2>
        <div style="background: #f8fafc; padding: 0.3in; border-radius: 8px;">
          <p><strong>Actor/Role Composite:</strong> ${safe(composite?.composite)}</p>
          <p><strong>Actor (Driver):</strong> ${safe(composite?.actor)}</p>
          <p><strong>Role (Style):</strong> ${safe(composite?.role)}</p>
          <p><strong>Confidence:</strong> ${
            composite
              ? safe(`${Math.round(((composite.confidence ?? 0) * 100 + Number.EPSILON) * 10) / 10}% (${composite.confidenceBand ?? ''})`)
              : safe(undefined)
          }</p>
          <p><strong>Sample Size:</strong> ${safe(composite?.sampleSize)}</p>
          ${
            composite?.siderealDrift
              ? `<p><strong>Sidereal Drift:</strong> ${safe(composite.driftBand)} (${safe(
                  composite.driftIndex !== undefined
                    ? `${Math.round(((composite.driftIndex ?? 0) * 100 + Number.EPSILON) * 10) / 10}%`
                    : undefined
                )})</p>`
              : ''
          }
        </div>
      </div>
    `;
    const responseBreakdown = `${breakdown.yes ?? 0} yes • ${breakdown.maybe ?? 0} maybe • ${breakdown.no ?? 0} no • ${breakdown.unclear ?? 0} unclear`;
    const statisticsSection = `
      <div style="margin-bottom: 0.4in;">
        <h2 style="color: #4338ca; font-size: 18pt; margin-bottom: 0.2in; border-bottom: 1px solid #e5e7eb;">Session Statistics</h2>
        <div style="background: #f8fafc; padding: 0.3in; border-radius: 8px;">
          <p><strong>Total Responses:</strong> ${safe((sessionStats as any)?.total)}</p>
          <p><strong>Accuracy Rate:</strong> ${safe(
            (sessionStats as any)?.accuracyRate !== undefined
              ? `${(sessionStats as any).accuracyRate}%`
              : (sessionStats as any)?.resonanceFidelity !== undefined
              ? `${(sessionStats as any).resonanceFidelity}%`
              : undefined
          )}</p>
          <p><strong>Clarity Rate:</strong> ${safe(
            (sessionStats as any)?.clarityRate !== undefined
              ? `${(sessionStats as any).clarityRate}%`
              : undefined
          )}</p>
          <p><strong>Response Breakdown:</strong> ${safe(responseBreakdown)}</p>
        </div>
      </div>
    `;
    const highlightsSection = isBalanceReport
      ? `
        <div style="margin-bottom: 0.4in;">
          <h2 style="color: #4338ca; font-size: 18pt; margin-bottom: 0.2in; border-bottom: 1px solid #e5e7eb;">Patterns & Highlights</h2>
          <div style="background: #f1f5f9; padding: 0.3in; border-radius: 8px;">
            <p><strong>Balance Missing:</strong> ${safe((sessionStats as any)?.balance_missing)}</p>
            <p><strong>Readiness Notes:</strong> ${safe((sessionStats as any)?.balance_ready_notes)}</p>
          </div>
        </div>
      `
      : `
        <div style="margin-bottom: 0.4in;">
          <h2 style="color: #4338ca; font-size: 18pt; margin-bottom: 0.2in; border-bottom: 1px solid #e5e7eb;">Patterns & Highlights</h2>
          <div style="background: #f1f5f9; padding: 0.3in; border-radius: 8px;">
            <p><strong>Notable Patterns:</strong> ${safe((sessionStats as any)?.totalPatterns)}</p>
            ${composite?.tieBreak ? `<p><strong>Tie-break favored:</strong> ${safe(composite.tieBreak)}</p>` : ''}
            ${composite?.siderealDrift ? `<p><strong>Sidereal Drift Evidence:</strong> ${safe(composite.evidenceN)}</p>` : ''}
          </div>
        </div>
      `;
    const rubricSection = rubricSealedSessionId
      ? `
        <div style="margin-bottom: 0.4in;">
          <h2 style="color: #4338ca; font-size: 18pt; margin-bottom: 0.2in; border-bottom: 1px solid #e5e7eb;">Rubric Snapshot</h2>
          <div style="background: #eef2ff; padding: 0.3in; border-radius: 8px;">
            <p><strong>Aggregate:</strong> ${safe(`${totalScore}/15`)}</p>
            <p><strong>Band:</strong> ${safe(scoreBand)}</p>
            <p><strong>Pressure:</strong> ${safe(rubricScores.pressure)} (${rubricNulls.pressure ? 'Null' : 'Score'})</p>
            <p><strong>Outlet:</strong> ${safe(rubricScores.outlet)} (${rubricNulls.outlet ? 'Null' : 'Score'})</p>
            <p><strong>Conflict:</strong> ${safe(rubricScores.conflict)} (${rubricNulls.conflict ? 'Null' : 'Score'})</p>
            <p><strong>Tone:</strong> ${safe(rubricScores.tone)} (${rubricNulls.tone ? 'Null' : 'Score'})</p>
            <p><strong>Surprise:</strong> ${safe(rubricScores.surprise)} (${rubricNulls.surprise ? 'Null' : 'Score'})</p>
          </div>
        </div>
      `
      : '';

    container.innerHTML = `
      <div style="text-align: center; border-bottom: 2px solid #4338ca; padding-bottom: 0.5in; margin-bottom: 0.5in;">
        <h1 style="color: #4338ca; font-size: 24pt; margin: 0; font-weight: bold;">${sanitizeForPDF(reportTitle)}</h1>
        <p style="color: #666; font-size: 12pt; margin: 0.2in 0;">${safe(`Session ID: ${currentSessionId} | Export Date: ${exportDate.toLocaleDateString()} ${exportDate.toLocaleTimeString()}`)}</p>
      </div>
      ${(isBalanceReport ? balanceSummary : mirrorSummary)}
      ${statisticsSection}
      ${highlightsSection}
      ${rubricSection}
      <div style="margin-top: 0.6in; padding-top: 0.3in; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 10pt;">
        <p>Generated by Raven Calder • Woven Web Application • ${safe(exportDate.toISOString())}</p>
        <p style="font-style: italic;">${isBalanceReport ? 'Symbolic weather, not deterministic prediction.' : "Here's what resonated, here's what didn't — you remain the validator."}</p>
      </div>
    `;

    return container;
  };

  const handleExportJSON = async () => {
    try {
      let data = prefetchedExport;
      if (!data) {
        const response = await fetch('/api/raven', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'export',
            sessionId: sessionId || pingTracker.getCurrentSessionId()
          })
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }
        data = await response.json();
        setPrefetchedExport(data);
      }

      if (data) {
        // Enhanced JSON export with comprehensive data
        const exportData = {
          // Core session metadata
          sessionId: data.sessionId,
          exportDate: new Date().toISOString(),
          exportVersion: '2.0',

          // Actor/Role detection results
          actorRoleComposite: composite ? {
            ...composite,
            exportNotes: 'Enhanced diagnostic matrix composite detection'
          } : null,

          // Session scoring and statistics
          sessionStats: {
            ...data.scores,
            resonanceBand: data.scores?.resonanceBand || 'Unknown',
            totalInteractions: data.scores?.interactionCount || 0,
            sessionDuration: data.scores?.sessionDuration || null,
            engagementMetrics: {
              averageResponseTime: data.scores?.avgResponseTime || null,
              longestPause: data.scores?.longestPause || null,
              conversationFlow: data.scores?.conversationFlow || 'Natural'
            }
          },

          // Rubric assessment (if completed)
          rubricAssessment: rubricSealedSessionId ? {
            scores: rubricScores,
            nullFlags: rubricNulls,
            totalScore: totalScore,
            scoreBand: scoreBand,
            completionDate: rubricSealedSessionId,
            assessmentDuration: rubricStartTs ? Date.now() - rubricStartTs : null
          } : null,

          // Enhanced session log with metadata
          sessionLog: {
            ...data.log,
            logProcessed: new Date().toISOString(),
            totalEntries: data.log?.entries?.length || 0
          },

          // Export metadata
          exportMetadata: {
            ravenVersion: '1.3',
            matrixVersion: 'Enhanced Diagnostic Matrix 8.16.25',
            schemaVersion: 'WM-Chart-1.3-lite',
            exportFeatures: [
              'Actor/Role Detection',
              'Resonance Scoring',
              'Session Analytics',
              'Rubric Assessment',
              'Comprehensive Logging'
            ]
          }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `raven-session-${data.sessionId.slice(-8)}-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setToast('Session data exported successfully');
        setTimeout(() => setToast(null), 2500);
        logEvent('json_export_success', { sessionId: data.sessionId });
      }
    } catch (error) {
      setToast('Export failed. Please try again.');
      setTimeout(() => setToast(null), 2500);
      logEvent('json_export_failed', { error: String(error) });
    }
  };

  const handleExportPDF = async () => {
    let enhancedElement: HTMLElement | null = null;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      enhancedElement = createEnhancedPDFContent();
      document.body.appendChild(enhancedElement);

      const activeSessionId = sessionId || pingTracker.getCurrentSessionId();
      const filenameId = activeSessionId ? activeSessionId.slice(-8) : 'session';
      const opt = {
        margin: 0.5,
        filename: `raven-session-${filenameId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().from(enhancedElement).set(opt).save();

      setToast('Enhanced PDF exported successfully');
      setTimeout(() => setToast(null), 2500);
      logEvent('pdf_export_success', {
        sessionId: activeSessionId || 'unknown',
        exportType: 'enhanced_pdf'
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      setToast('PDF export not available. Exporting JSON instead...');
      setTimeout(() => {
        setToast(null);
        handleExportJSON();
      }, 1500);
      logEvent('pdf_export_failed', { error: String(error) });
    } finally {
      if (enhancedElement?.isConnected) {
        document.body.removeChild(enhancedElement);
      }
    }
  };

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

      {/* Export Options */}
      <div className="export-options">
        <div className="export-title">Export Session Data</div>
        <div className="export-note">These exports are for your records and analysis, not AI consumption.</div>
        <ul className="export-description">
          <li><strong>JSON</strong> · Structured session log (resonance marks, probes, timestamps) for tooling or archival.</li>
          <li><strong>PDF</strong> · Readable summary you can print or hand to collaborators.</li>
          <li><strong>CSV</strong> · Tabular resonance metrics ready for spreadsheets or custom analysis.</li>
        </ul>
        <div className="export-buttons">
          <button
            className="btn export-btn"
            onClick={handleExportJSON}
            title="Download complete session data as JSON (machine-readable format)"
          >
            📄 Export JSON
          </button>
          <button
            className="btn export-btn enhanced"
            onClick={handleExportPDF}
            title="Download session summary as PDF (human-readable summary)"
          >
            📋 Export PDF
          </button>
          <button
            className="btn export-btn"
            onClick={handleExportCSV}
            title="Download session metrics as CSV spreadsheet (for analysis)"
          >
            📊 Export CSV
          </button>
        </div>
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

        .export-options { margin: 20px 0; padding: 16px; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 8px; }
        .export-title { color: #f1f5f9; font-weight: 600; text-align: center; margin-bottom: 6px; font-size: 14px; }
        .export-note { color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 12px; font-style: italic; }
        .export-description { list-style: none; margin: 0 0 16px; padding: 0; color: #cbd5f5; font-size: 12px; line-height: 1.6; }
        .export-description li + li { margin-top: 6px; }
        .export-buttons { display: flex; gap: 12px; justify-content: center; }
        .export-btn { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #93c5fd; padding: 8px 16px; font-size: 13px; }
        .export-btn:hover { background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.5); }
      `}</style>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
};

export default WrapUpCard;
