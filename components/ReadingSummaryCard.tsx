import React, { useState } from 'react';

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
  magnitude: number; // 1-5 ⚡
  valence: 'bright' | 'neutral' | 'drag'; // 🌞/🌑
  volatility: 'aligned' | 'mixed' | 'chaotic'; // 🔀
  sfdVerdict: string;
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

  const getMagnitudeEmoji = (mag: number) => {
    return '⚡'.repeat(Math.min(mag, 5));
  };

  const getValenceEmoji = (valence: string) => {
    switch (valence) {
      case 'bright': return '🌞';
      case 'drag': return '🌑';
      default: return '🌤️';
    }
  };

  const getVolatilityEmoji = (volatility: string) => {
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
              {data.resonanceFidelity.percentage}%—
            </div>
            <div className="text-base text-slate-600 mb-4">
              {data.resonanceFidelity.label}
            </div>
            
            {/* Indicator Strip */}
            <div className="flex justify-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-xl">✅</span>
                <span className="text-green-600 text-xl">✅</span>
                <span className="text-red-600 text-xl">❌</span>
              </div>
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
                <span title={`Magnitude ${data.balanceMeterClimate.magnitude}`}>
                  {getMagnitudeEmoji(data.balanceMeterClimate.magnitude)}
                </span>
                <span title={`Valence: ${data.balanceMeterClimate.valence}`}>
                  {getValenceEmoji(data.balanceMeterClimate.valence)}
                </span>
                <span title={`Volatility: ${data.balanceMeterClimate.volatility}`}>
                  {getVolatilityEmoji(data.balanceMeterClimate.volatility)}
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
      <div className="flex gap-3 pt-4">
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
        <div className="bg-slate-50 px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowJournal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={copyJournalToClipboard}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
