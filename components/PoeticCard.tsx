import React, { useState } from 'react';

interface ResonanceCard {
  title: string;
  resonantLine: string;
  scoreIndicator: string;
  resonanceFidelity: { percentage: number; band: 'HIGH' | 'MIXED' | 'LOW'; label: string };
  compositeGuess: string;
  driftFlag?: string;
}

interface SessionSummary {
  hookStack: string[];
  resonantLines: string[];
  scoreStrip: { wb: number; abe: number; osr: number };
  resonanceFidelity: { percentage: number; band: 'HIGH' | 'MIXED' | 'LOW'; label: string };
  actorRoleComposite?: string;
  driftFlag: boolean;
  climateRibbon?: string;
}

interface JournalEntry {
  title: string;
  narrative: string;
  metadata: {
    sessionDate: string;
    totalInteractions: number;
    resonanceFidelity: number;
    primaryPatterns: string[];
  };
}

interface PoeticCardProps {
  card?: ResonanceCard;
  summary?: SessionSummary;
  type: 'resonance' | 'session-summary';
  onEndReading?: () => void;
  onGenerateJournal?: () => Promise<JournalEntry>;
}

export function PoeticCard({ card, summary, type, onEndReading, onGenerateJournal }: PoeticCardProps) {
  const [showJournal, setShowJournal] = useState(false);
  const [journalEntry, setJournalEntry] = useState<JournalEntry | null>(null);
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
  if (type === 'resonance' && card) {
    return (
      <div className="max-w-md mx-auto bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-6 shadow-lg my-4">
        <div className="text-center space-y-4">
          {/* Title */}
          <h3 className="text-lg font-serif font-semibold text-slate-800 border-b border-slate-300 pb-2">
            {card.title}
          </h3>
          
          {/* Resonant Line */}
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-slate-700 italic leading-relaxed">
              "{card.resonantLine}"
            </p>
          </div>
          
          {/* Score Strip */}
          <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border">
            {card.scoreIndicator}
          </div>
          
          {/* Resonance Fidelity */}
          <div className={`text-sm font-semibold rounded-lg p-3 border ${
            card.resonanceFidelity.band === 'HIGH' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : card.resonanceFidelity.band === 'MIXED'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className="text-center">
              <div className="text-lg font-bold">Resonance Fidelity: {card.resonanceFidelity.percentage}%</div>
              <div className="text-xs opacity-75">{card.resonanceFidelity.label}</div>
            </div>
          </div>
          
          {/* Composite Guess */}
          <div className="text-sm text-slate-700">
            <strong>Pattern:</strong> {card.compositeGuess}
          </div>
          
          {/* Drift Flag */}
          {card.driftFlag && (
            <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200">
              {card.driftFlag}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'session-summary' && summary) {
    return (
      <div className="max-w-lg mx-auto bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6 shadow-lg my-6">
        <div className="space-y-5">
          {/* Header */}
          <div className="text-center border-b border-indigo-200 pb-3">
            <h3 className="text-xl font-serif font-semibold text-indigo-900">
              Session Summary
            </h3>
          </div>
          
          {/* Score Strip */}
          <div className="bg-white rounded-lg p-4 border border-indigo-200">
            <div className="text-sm text-slate-700 text-center">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="flex flex-col items-center">
                  <span className="text-green-600 font-semibold">✅ {summary.scoreStrip.wb}</span>
                  <span className="text-xs text-slate-500">Within Boundary</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-amber-600 font-semibold">🟡 {summary.scoreStrip.abe}</span>
                  <span className="text-xs text-slate-500">At Boundary Edge</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-red-600 font-semibold">❌ {summary.scoreStrip.osr}</span>
                  <span className="text-xs text-slate-500">Outside Range</span>
                </div>
              </div>
              
              {/* Resonance Fidelity */}
              <div className={`rounded-lg p-3 text-sm font-semibold ${
                summary.resonanceFidelity.band === 'HIGH' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : summary.resonanceFidelity.band === 'MIXED'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <div className="text-center">
                  <div className="font-bold">Resonance Fidelity: {summary.resonanceFidelity.percentage}%</div>
                  <div className="text-xs opacity-75">{summary.resonanceFidelity.label}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Resonant Lines */}
          {summary.resonantLines.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-indigo-800">What Resonated:</h4>
              <div className="bg-white rounded-lg p-3 border border-indigo-200 max-h-32 overflow-y-auto">
                {summary.resonantLines.map((line, index) => (
                  <p key={index} className="text-xs text-slate-600 italic mb-1">
                    ""{line}""
                  </p>
                ))}
              </div>
            </div>
          )}
          
          {/* Actor/Role Composite */}
          {summary.actorRoleComposite && (
            <div className="text-center">
              <span className="text-sm text-indigo-700">
                <strong>Pattern Guess:</strong> {summary.actorRoleComposite}
              </span>
            </div>
          )}
          
          {/* Drift Flag */}
          {summary.driftFlag && (
            <div className="text-xs text-purple-700 bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
              🌀 Sidereal drift detected - Actor patterns may differ from tropical presentation
            </div>
          )}
          
          {/* Climate Ribbon */}
          {summary.climateRibbon && (
            <div className="text-xs text-blue-700 bg-blue-50 rounded-lg p-2 border border-blue-200 text-center">
              Climate: {summary.climateRibbon}
            </div>
          )}
          
          {/* End Reading and Journal Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onEndReading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              End Reading
            </button>
            <button
              onClick={handleGenerateJournal}
              disabled={isGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
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
          </div>
          
          {/* Footer */}
          <div className="text-center text-xs text-slate-500 border-t border-indigo-200 pt-3">
            "Here's what resonated, here's what didn't, here's what pattern Raven is tentatively guessing — but you remain the validator."
          </div>
        </div>
        
        {/* Journal Modal */}
        {showJournal && journalEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-serif font-bold">{journalEntry.title}</h2>
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
                        {journalEntry.metadata.primaryPatterns.map((pattern, index) => (
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default PoeticCard;
