import React, { useState } from 'react';
import { sanitizeForPDF } from '../src/pdf-sanitizer';
import { generateJournalPDFFast, generateJournalPDFUltraFast } from '../lib/fast-pdf-generator';

interface BigVector {
  tension: string;
  polarity: string; // e.g., "Restless / Contained"
  charge: number; // 1-5 intensity
  source: 'angles' | 'anaretic' | 'personal-outer' | 'hook-stack';
}

interface ResonanceSnapshot {
  affirmedParadoxes: string[];
  poemLines: string[];
  symbolicImages: string[];
  keyMoments: string[];
}

interface ActorRoleComposite {
  actor: string; // Sidereal driver
  role: string; // Tropical style
  composite: string; // Combined expression
  confidence: 'tentative' | 'emerging' | 'clear';
}

interface ResonanceFidelity {
  percentage: number;
  band: 'HIGH' | 'MIXED' | 'LOW';
  label: string;
  wb: number;
  abe: number;
  osr: number;
}

interface BalanceMeterClimate {
  magnitude: number; // 1-5 ⚡ (v2: Numinosity - archetypal charge)
  valence: 'bright' | 'neutral' | 'drag'; // 🌞/🌑 (v2: Directional Bias - inward/outward energy lean)
  volatility: 'aligned' | 'mixed' | 'chaotic'; // 🔀 (v2: Narrative Coherence - story stability)
  sfdVerdict: string; // (v2: Integration Bias - forces cooperation assessment)
  housePlacement?: string;
  narrative: string;
}

interface ReadingSummaryData {
  bigVectors: BigVector[];
  resonanceSnapshot: ResonanceSnapshot;
  actorRoleComposite: ActorRoleComposite;
  resonanceFidelity: ResonanceFidelity;
  explanation: string;
  balanceMeterClimate: BalanceMeterClimate;
  poemLine?: string;
  sessionId: string;
}

interface ReadingSummaryCardProps {
  data: ReadingSummaryData;
  onClose: () => void;
  onGenerateJournal?: () => Promise<any>;
  onStartNewReading?: () => void;
}

export default function ReadingSummaryCard({ 
  data, 
  onClose, 
  onGenerateJournal, 
  onStartNewReading 
}: ReadingSummaryCardProps) {
  const [showJournal, setShowJournal] = useState(false);
  const [journalEntry, setJournalEntry] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateJournal = async () => {
    if (!onGenerateJournal) return;
    
    setIsGenerating(true);
    try {
      const entry = await onGenerateJournal();
      setJournalEntry(entry);
      setShowJournal(true);
    } catch (error) {
      console.error('Failed to generate journal:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyJournalToClipboard = () => {
    if (!journalEntry) return;

    const fullText = `${journalEntry.title}

${journalEntry.narrative}

---
Session Details:
Date: ${journalEntry.metadata.sessionDate}
Total Interactions: ${journalEntry.metadata.totalInteractions}
Resonance Fidelity: ${journalEntry.metadata.resonanceFidelity}%
Primary Patterns: ${journalEntry.metadata.primaryPatterns.join(', ')}`;

    navigator.clipboard.writeText(fullText).then(() => {
      alert('Journal entry copied to clipboard!');
    });
  };

  const exportJournalAsPDF = async () => {
    if (!journalEntry) return;

    // Show immediate feedback
    const loadingAlert = document.createElement('div');
    loadingAlert.innerHTML = 'Generating PDF... Please wait (this may take 10-15 seconds)';
    loadingAlert.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #7c3aed; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    document.body.appendChild(loadingAlert);

    try {
      // Dynamically import html2pdf.js
      const html2pdf = (await import('html2pdf.js')).default;

      // Detect multi-person reading context
      const isMultiPerson = journalEntry.title.toLowerCase().includes('relationship') || 
                           journalEntry.title.toLowerCase().includes('synastry') ||
                           journalEntry.title.toLowerCase().includes('composite') ||
                           journalEntry.narrative.toLowerCase().includes('both people') ||
                           journalEntry.narrative.toLowerCase().includes('between you');

      // Create optimized PDF content for journal
      const container = document.createElement('div');
      container.style.cssText = `
        font-family: Arial, sans-serif;
        max-width: 8in;
        margin: 0 auto;
        padding: 0.75in;
        background: white;
        color: #1a1a1a;
        line-height: 1.6;
      `;

      container.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 0.5in; margin-bottom: 0.75in;">
          <h1 style="color: #7c3aed; font-size: 28pt; margin: 0; font-weight: bold; font-family: Georgia;">
            ${sanitizeForPDF(journalEntry.title)}
          </h1>
          <p style="color: #666; font-size: 14pt; margin: 0.3in 0; font-style: italic;">
            ${sanitizeForPDF(`Raven Calder Journal Entry • ${journalEntry.metadata.sessionDate}`)}
          </p>
        </div>

        ${isMultiPerson ? `
        <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 0.4in; margin-bottom: 0.75in;">
          <h3 style="color: #d97706; font-size: 14pt; margin: 0 0 0.2in 0; font-weight: bold;">
            📋 Essential for Relationship Readings
          </h3>
          <p style="color: #92400e; font-size: 11pt; line-height: 1.6; margin: 0;">
            ${sanitizeForPDF('You need BOTH complete natal charts (birth date, time, and location for each person). No shortcuts! This snapshot shows the relationship themes, but individual charts reveal the unique patterns each person brings. Think of this as the weather between you - the full story needs both personal charts to see how each person experiences and responds to these energies.')}
          </p>
        </div>
        ` : `
        <div style="background: #e0e7ff; border: 2px solid #7c3aed; border-radius: 8px; padding: 0.4in; margin-bottom: 0.75in;">
          <h3 style="color: #5b21b6; font-size: 14pt; margin: 0 0 0.2in 0; font-weight: bold;">
            💡 Reading Context
          </h3>
          <p style="color: #5b21b6; font-size: 11pt; line-height: 1.6; margin: 0;">
            ${sanitizeForPDF('This is your symbolic weather report - a snapshot of current astrological themes. Use it as a conversation starter with yourself about energy patterns you might be noticing. Your choices and responses shape how these patterns actually unfold in your life.')}
          </p>
        </div>
        `}

        <div style="margin-bottom: 0.75in;">
          <div style="font-size: 12pt; line-height: 1.6; text-align: left;">
            ${journalEntry.narrative.split('\n').map((paragraph: string) =>
              paragraph.trim() ? `<p style="margin-bottom: 0.3in;">${sanitizeForPDF(paragraph)}</p>` : ''
            ).join('')}
          </div>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 0.5in; margin-top: 0.75in;">
          <h2 style="color: #7c3aed; font-size: 16pt; margin-bottom: 0.3in;">${sanitizeForPDF('Session Analytics')}</h2>
          <div style="background: #f8fafc; padding: 0.4in; border-radius: 8px; border-left: 4px solid #7c3aed;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.3in;">
              <div>
                <p><strong>${sanitizeForPDF('Total Interactions:')}</strong> ${sanitizeForPDF(String(journalEntry.metadata.totalInteractions))}</p>
                <p><strong>${sanitizeForPDF('Session Date:')}</strong> ${sanitizeForPDF(journalEntry.metadata.sessionDate)}</p>
              </div>
              <div>
                <p><strong>${sanitizeForPDF('Resonance Fidelity:')}</strong> ${sanitizeForPDF(`${journalEntry.metadata.resonanceFidelity}%`)}</p>
                <p><strong>${sanitizeForPDF('Session ID:')}</strong> ${sanitizeForPDF(data.sessionId.slice(-8))}</p>
              </div>
            </div>
            ${journalEntry.metadata.primaryPatterns.length > 0 ? `
              <div style="margin-top: 0.3in; border-top: 1px solid #e5e7eb; padding-top: 0.3in;">
                <p style="margin-bottom: 0.15in;"><strong>${sanitizeForPDF('Primary Communication Patterns:')}</strong></p>
                <div style="display: flex; flex-wrap: wrap; gap: 0.1in;">
                  ${journalEntry.metadata.primaryPatterns.map((pattern: string) =>
                    `<span style="background: white; padding: 0.1in 0.2in; border-radius: 4px; border: 1px solid #d1d5db; font-size: 11pt;">${sanitizeForPDF(pattern)}</span>`
                  ).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <div style="margin-top: 0.75in; padding-top: 0.4in; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 11pt;">
          <p>${sanitizeForPDF('Generated by Raven Calder • Woven Web Application')}</p>
          <p style="font-style: italic; margin-top: 0.2in;">${sanitizeForPDF('"Here\'s what resonated, here\'s what didn\'t, here\'s what pattern Raven is tentatively guessing — but you remain the validator."')}</p>
          <p style="font-size: 10pt; color: #888; margin-top: 0.3in; font-weight: normal;">
            ${sanitizeForPDF('Remember: This is symbolic weather, not fate. Think of it as a conversation starter about energy patterns you might notice in daily life. The language here aims to be accessible - no need to decode astro-jargon. Your choices and responses matter most.')}
          </p>
        </div>
      `;

      // Add to DOM temporarily for rendering (optimized positioning)
      container.style.cssText += `
        position: fixed;
        top: -10000px;
        left: -10000px;
        visibility: hidden;
        pointer-events: none;
      `;
      document.body.appendChild(container);

      const opt = {
        margin: 0.5,
        filename: `raven-journal-${data.sessionId.slice(-8)}-${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.75 }, // Reduced from 0.95 to 0.75 for speed
        html2canvas: {
          scale: 1.5, // Reduced from 2 to 1.5 for faster rendering
          useCORS: false, // Disabled for speed since we're not using external images
          allowTaint: true, // Allow for faster rendering
          backgroundColor: '#ffffff',
          logging: false, // Disable console logging for performance
          imageTimeout: 5000, // 5 second timeout instead of default 30s
          removeContainer: true, // Automatically clean up
          async: true, // Enable async rendering
          width: 816, // Fixed width (8.5in * 96dpi) for consistency
          height: 1056 // Fixed height (11in * 96dpi) for consistency
        },
        jsPDF: {
          unit: 'in',
          format: 'letter',
          orientation: 'portrait',
          compress: true,
          precision: 2 // Reduce precision for smaller file size and faster generation
        }
      };

      // Generate PDF with progress feedback
      await html2pdf().from(container).set(opt).save();

      // Clean up
      document.body.removeChild(container);
      document.body.removeChild(loadingAlert);

      // Success feedback
      const successAlert = document.createElement('div');
      successAlert.innerHTML = '✅ PDF generated successfully!';
      successAlert.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
      document.body.appendChild(successAlert);
      setTimeout(() => document.body.removeChild(successAlert), 3000);

    } catch (error) {
      // Clean up loading indicator
      if (document.body.contains(loadingAlert)) {
        document.body.removeChild(loadingAlert);
      }
      
      // Error feedback
      const errorAlert = document.createElement('div');
      errorAlert.innerHTML = '❌ PDF generation failed. Try reducing content or refreshing the page.';
      errorAlert.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
      document.body.appendChild(errorAlert);
      setTimeout(() => document.body.removeChild(errorAlert), 5000);
      copyJournalToClipboard();
    }
  };

  const exportSummaryData = () => {
    // Create comprehensive JSON export of the reading summary
    const summaryData = {
      exportDate: new Date().toISOString(),
      sessionId: data.sessionId,
      readingSummary: {
        poemLine: data.poemLine,
        bigVectors: data.bigVectors,
        resonanceSnapshot: data.resonanceSnapshot,
        actorRoleComposite: data.actorRoleComposite,
        resonanceFidelity: data.resonanceFidelity,
        explanation: data.explanation,
        balanceMeterClimate: data.balanceMeterClimate
      },
      journal: journalEntry || null
    };

    const blob = new Blob([JSON.stringify(summaryData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raven-reading-summary-${data.sessionId.slice(-8)}-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Reading summary data exported successfully!');
  };

  const getNuminosityEmoji = (mag: number) => {
    return '⚡'.repeat(Math.min(mag, 5));
  };

  const getDirectionalBiasEmoji = (valence: string) => {
    switch (valence) {
      case 'bright': return '🌞';
      case 'drag': return '🌑';
      default: return '🌤️';
    }
  };

  const getNarrativeCoherenceEmoji = (volatility: string) => {
    switch (volatility) {
      case 'chaotic': return '🌀';
      case 'mixed': return '🔀';
      default: return '➡️';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_70px_rgba(0,0,0,0.35)] border border-slate-200/70">
        
        {/* Header with poem line */}
        {data.poemLine && (
          <div className="relative bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white p-7 rounded-t-2xl">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(40%_60%_at_70%_0%,rgba(255,255,255,0.3),transparent)]"/>
            <div className="relative text-center italic text-lg leading-relaxed">
              "{data.poemLine}"
            </div>
          </div>
        )}

        <div className="p-7 space-y-7">
          
          {/* 1. HEADLINER: Big Vectors (Recognition Layer) */}
          {data.bigVectors.length > 0 && (
            <div className="text-center">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3">
                ACTOR / ROLE COMPOSITE
              </h2>
              <div className="text-[28px] font-serif font-bold text-slate-800 mb-1">
                {data.bigVectors[0].polarity}
              </div>
              <div className="flex justify-center gap-3 text-2xl opacity-70">
                {/* Astrological symbols - you can replace with actual symbols */}
                <span title="Sidereal emphasis">☽</span>
                <span title="Tropical emphasis">☿</span>
              </div>
            </div>
          )}

          {/* 2. Resonance Fidelity % (Scored) */}
          <div className="text-center">
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3">
              RESONANCE FIDELITY
            </h3>
            <div className="text-3xl font-bold text-slate-800 mb-1">
              {data.resonanceFidelity.percentage}%
            </div>
            <div className={`text-base mb-4 ${
              data.resonanceFidelity.band === 'HIGH' ? 'text-green-600' :
              data.resonanceFidelity.band === 'MIXED' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {data.resonanceFidelity.label}
            </div>

            {/* Enhanced Indicator Strip */}
            <div className="flex justify-center items-center gap-6 mb-4">
              <div className="flex items-center gap-1">
                {Array.from({length: data.resonanceFidelity.wb}).map((_, i) => (
                  <span key={`wb-${i}`} className="text-green-600 text-lg animate-pulse">✅</span>
                ))}
                <span className="text-xs text-slate-500 ml-2">WB</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({length: data.resonanceFidelity.abe}).map((_, i) => (
                  <span key={`abe-${i}`} className="text-amber-500 text-lg">🟡</span>
                ))}
                <span className="text-xs text-slate-500 ml-2">ABE</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({length: data.resonanceFidelity.osr}).map((_, i) => (
                  <span key={`osr-${i}`} className="text-red-600 text-lg">❌</span>
                ))}
                <span className="text-xs text-slate-500 ml-2">OSR</span>
              </div>
            </div>

            {/* Progress Bar Visual */}
            <div className="w-full max-w-xs mx-auto bg-slate-200 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-1000 ${
                  data.resonanceFidelity.band === 'HIGH' ? 'bg-green-500' :
                  data.resonanceFidelity.band === 'MIXED' ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{width: `${data.resonanceFidelity.percentage}%`}}
              />
            </div>
            <div className="text-xs text-slate-500">
              {data.resonanceFidelity.wb + data.resonanceFidelity.abe + data.resonanceFidelity.osr} total responses
            </div>
          </div>

          {/* 3. Short Explanation (Plain Voice) */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-slate-700 leading-relaxed text-center">
              {data.explanation}
            </p>
          </div>

          {/* 4. Balance Meter Climate Line */}
          <div className="border-t border-slate-200 pt-5">
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3 text-center">
              BALANCE METER
            </h4>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span title={`Numinosity ${data.balanceMeterClimate.magnitude}`}>
                  {getNuminosityEmoji(data.balanceMeterClimate.magnitude)}
                </span>
                <span title={`Directional Bias: ${data.balanceMeterClimate.valence}`}>
                  {getDirectionalBiasEmoji(data.balanceMeterClimate.valence)}
                </span>
                <span title={`Narrative Coherence: ${data.balanceMeterClimate.volatility}`}>
                  {getNarrativeCoherenceEmoji(data.balanceMeterClimate.volatility)}
                </span>
              </div>
              <p className="text-slate-700 text-center text-[13px] leading-relaxed">
                {data.balanceMeterClimate.narrative}
              </p>
              {data.balanceMeterClimate.housePlacement && (
                <p className="text-slate-500 text-center text-[11px] mt-2">
                  ...felt in the {data.balanceMeterClimate.housePlacement}
                </p>
              )}
            </div>
          </div>

          {/* Footer Quote */}
          <div className="text-center text-[11px] text-slate-500 border-t border-slate-200 pt-4 italic">
            "Here's what resonated, here's what didn't, here's what pattern Raven is tentatively guessing — but you remain the validator."
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-4">
            <div className="flex gap-3">
              <button
                onClick={onStartNewReading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm"
              >
                Start New Reading
              </button>
              <button
                onClick={handleGenerateJournal}
                disabled={isGenerating}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    📖 Generate Journal
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 border border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400 rounded-xl transition-colors"
              >
                Continue Session
              </button>
            </div>

            {/* Export Options */}
            <div className="border-t border-slate-200 pt-4">
              <div className="text-center text-xs text-slate-500 mb-3 uppercase tracking-wide">
                Export Reading Summary
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={exportSummaryData}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                  title="Export reading summary data as JSON"
                >
                  📄 JSON
                </button>
                {journalEntry && (
                  <button
                    onClick={async () => {
                      const result = await generateJournalPDFUltraFast(journalEntry, data.sessionId);
                      const alertDiv = document.createElement('div');
                      alertDiv.innerHTML = result.success ? '🚀 Ultra-fast PDF!' : '❌ PDF failed';
                      alertDiv.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${result.success ? '#f59e0b' : '#ef4444'}; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; font-family: sans-serif;`;
                      document.body.appendChild(alertDiv);
                      setTimeout(() => document.body.removeChild(alertDiv), 3000);
                    }}
                    className="bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                    title="Ultra-fast PDF generation (<1 second)"
                  >
                    🚀 Instant
                  </button>
                )}
              </div>
              {journalEntry && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      const result = await generateJournalPDFFast(journalEntry, data.sessionId);
                      const alertDiv = document.createElement('div');
                      alertDiv.innerHTML = result.success ? '✅ Fast PDF generated!' : '❌ PDF failed';
                      alertDiv.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${result.success ? '#10b981' : '#ef4444'}; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; font-family: sans-serif;`;
                      document.body.appendChild(alertDiv);
                      setTimeout(() => document.body.removeChild(alertDiv), 3000);
                    }}
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                    title="Fast PDF generation (2-3 seconds)"
                  >
                    ⚡ Fast PDF
                  </button>
                  <button
                    onClick={exportJournalAsPDF}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                    title="High-quality PDF (10-15 seconds)"
                  >
                    📋 Quality
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Journal Modal */}
        {showJournal && journalEntry && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
              {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
                <div className="flex justify-between items-start">
                  <div>
        <h2 className="text-2xl font-serif font-bold">{journalEntry.title}</h2>
                    <p className="text-purple-100 text-sm mt-1">{journalEntry.metadata.sessionDate}</p>
                  </div>
                  <button
                    onClick={() => setShowJournal(false)}
                    className="text-white hover:text-purple-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                    {journalEntry.narrative}
                  </div>
                </div>
                
                {/* Metadata */}
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
                  <h3 className="font-semibold text-slate-800 mb-3">Session Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Total Interactions:</span>
                      <span className="ml-2 font-medium">{journalEntry.metadata.totalInteractions}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Resonance Fidelity:</span>
                      <span className="ml-2 font-medium">{journalEntry.metadata.resonanceFidelity}%</span>
                    </div>
                  </div>
                  {journalEntry.metadata.primaryPatterns.length > 0 && (
                    <div className="mt-3">
                      <span className="text-slate-600 text-sm">Primary Patterns:</span>
                      <div className="mt-1">
                        {journalEntry.metadata.primaryPatterns.map((pattern: string, index: number) => (
                          <span key={index} className="inline-block bg-white px-2 py-1 rounded text-xs text-slate-700 mr-2 mb-1 border">
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t">
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setShowJournal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Close
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={copyJournalToClipboard}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors text-sm"
                      title="Copy journal text to clipboard"
                    >
                      📋 Copy Text
                    </button>
                    <button
                      onClick={exportJournalAsPDF}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors text-sm"
                      title="Export journal as formatted PDF"
                    >
                      📄 Export PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
