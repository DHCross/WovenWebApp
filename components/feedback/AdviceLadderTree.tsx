'use client';

import React, { useState, useEffect } from 'react';

interface AdviceLadderTreeProps {
  hookStack: {
    titles: Array<{
      title: string;
      intensity: number;
      polarity: string;
    }>;
    volatilityIndex: number;
  };
  sessionContext: {
    sessionId: string;
    sessionScores?: {
      accuracy: number;
      edgeCapture: number;
      clarity: number;
    };
    driftIndex?: number;
    sstLogs?: Array<any>;
  };
  userNeed?: string;
  onComplete?: (result: any) => void;
}

interface ProgressionStep {
  rung: string;
  content: any;
  purpose: string;
}

interface LadderResult {
  success: boolean;
  ladderTree: ProgressionStep[];
  entryPoint: string;
  pacing: string;
  metadata: any;
}

export default function AdviceLadderTree({ 
  hookStack, 
  sessionContext, 
  userNeed = 'general',
  onComplete 
}: AdviceLadderTreeProps) {
  const [ladderResult, setLadderResult] = useState<LadderResult | null>(null);
  const [currentRung, setCurrentRung] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCrisisSupport, setShowCrisisSupport] = useState(false);

  useEffect(() => {
    processLadderTree();
  }, [hookStack, sessionContext, userNeed]);

  const processLadderTree = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/advice-ladder-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hookStack,
          sessionContext,
          userNeed
        })
      });

      const result = await response.json();
      if (result.success) {
        setLadderResult(result);
        
        // Check if this is crisis support
        if (result.ladderTree?.[0]?.content?.type === 'crisis-support') {
          setShowCrisisSupport(true);
        }
      }
    } catch (error) {
      console.error('Error processing Advice Ladder Tree:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentStep = () => {
    return ladderResult?.ladderTree?.[currentRung];
  };

  const nextRung = () => {
    if (currentRung < (ladderResult?.ladderTree?.length || 0) - 1) {
      setCurrentRung(currentRung + 1);
    } else {
      onComplete?.(ladderResult);
    }
  };

  const prevRung = () => {
    if (currentRung > 0) {
      setCurrentRung(currentRung - 1);
    }
  };

  if (isProcessing) {
    return (
      <div className="p-6 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-blue-700">Building your therapeutic support ladder...</span>
        </div>
      </div>
    );
  }

  if (!ladderResult) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <p className="text-gray-600">Unable to generate therapeutic support at this time.</p>
      </div>
    );
  }

  // Crisis Support Display
  if (showCrisisSupport) {
    return <CrisisSupportDisplay ladderResult={ladderResult} onComplete={onComplete} />;
  }

  const currentStep = getCurrentStep();
  if (!currentStep) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              Therapeutic Integration
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {currentStep.purpose} • Pacing: {ladderResult.pacing}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Step {currentRung + 1} of {ladderResult.ladderTree.length}
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="mt-4">
          <div className="flex space-x-2">
            {ladderResult.ladderTree.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded ${
                  index <= currentRung ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Current Rung Content */}
      <div className="mb-8">
        {currentStep.rung === 'mirror' && (
          <MirrorRungDisplay content={currentStep.content} />
        )}
        {currentStep.rung === 'container' && (
          <ContainerRungDisplay content={currentStep.content} />
        )}
        {currentStep.rung === 'choicePair' && (
          <ChoicePairRungDisplay content={currentStep.content} />
        )}
        {currentStep.rung === 'ifThenTrack' && (
          <IfThenTrackRungDisplay content={currentStep.content} />
        )}
      </div>

      {/* User Response Area */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What resonates with you from this step?
        </label>
        <textarea
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="Share what feels most relevant or helpful..."
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={prevRung}
          disabled={currentRung === 0}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        
        <div className="text-sm text-gray-500">
          {currentStep.rung.charAt(0).toUpperCase() + currentStep.rung.slice(1)} Rung
        </div>
        
        <button
          onClick={nextRung}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
        >
          {currentRung < ladderResult.ladderTree.length - 1 ? 'Next →' : 'Complete'}
        </button>
      </div>
    </div>
  );
}

// Mirror Rung Display Component
function MirrorRungDisplay({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Recognition</h4>
        <p className="text-blue-800">{content.recognition}</p>
      </div>
      
      <div className="p-4 bg-green-50 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">Validation</h4>
        <p className="text-green-800">{content.validation}</p>
      </div>
      
      <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
        <p className="text-yellow-800 font-medium">{content.resonanceCheck}</p>
      </div>
      
      <div className="text-sm text-gray-600">
        Confidence Level: {Math.round(content.confidenceLevel * 100)}%
      </div>
    </div>
  );
}

// Container Rung Display Component
function ContainerRungDisplay({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-purple-50 rounded-lg">
        <h4 className="font-medium text-purple-900 mb-2">Boundaries</h4>
        <p className="text-purple-800">{content.boundaries}</p>
      </div>
      
      <div className="p-4 bg-emerald-50 rounded-lg">
        <h4 className="font-medium text-emerald-900 mb-2">Safety Check</h4>
        <p className="text-emerald-800">{content.safetyCheck}</p>
      </div>
      
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Resources</h4>
        <ul className="space-y-2">
          {content.resources?.map((resource: string, index: number) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="text-gray-400 mt-1">•</span>
              <span className="text-gray-700">{resource}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="p-3 bg-blue-100 rounded text-center">
        <p className="text-blue-800 italic">{content.pacing}</p>
      </div>
    </div>
  );
}

// Choice Pair Rung Display Component
function ChoicePairRungDisplay({ content }: { content: any }) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  
  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 rounded-lg">
        <h4 className="font-medium text-amber-900 mb-2">Your Agency</h4>
        <p className="text-amber-800">{content.agencyReminder}</p>
      </div>
      
      <div className="p-4 bg-indigo-50 rounded-lg">
        <h4 className="font-medium text-indigo-900 mb-3">Choice Pair</h4>
        <p className="text-indigo-700 mb-4">{content.choicePair.context}</p>
        
        <div className="space-y-3">
          <div 
            className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedChoice === 'A' 
                ? 'border-indigo-500 bg-indigo-100' 
                : 'border-gray-200 hover:border-indigo-300'
            }`}
            onClick={() => setSelectedChoice(selectedChoice === 'A' ? null : 'A')}
          >
            <div className="flex items-start space-x-3">
              <span className="font-semibold text-indigo-600">Option A:</span>
              <span className="text-indigo-800">{content.choicePair.optionA}</span>
            </div>
          </div>
          
          <div 
            className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedChoice === 'B' 
                ? 'border-indigo-500 bg-indigo-100' 
                : 'border-gray-200 hover:border-indigo-300'
            }`}
            onClick={() => setSelectedChoice(selectedChoice === 'B' ? null : 'B')}
          >
            <div className="flex items-start space-x-3">
              <span className="font-semibold text-indigo-600">Option B:</span>
              <span className="text-indigo-800">{content.choicePair.optionB}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Decision Support</h4>
        <ul className="space-y-2">
          {content.decisionSupport?.map((support: string, index: number) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="text-gray-400 mt-1">•</span>
              <span className="text-gray-700">{support}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="p-3 bg-green-100 rounded text-center">
        <p className="text-green-800 font-medium">{content.noWrongChoice}</p>
      </div>
    </div>
  );
}

// If/Then/Track Rung Display Component
function IfThenTrackRungDisplay({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-orange-50 rounded-lg">
        <h4 className="font-medium text-orange-900 mb-3">Implementation Plan</h4>
        <div className="space-y-3">
          <div className="p-3 bg-white rounded border-l-4 border-orange-400">
            <p className="text-orange-800">
              <span className="font-semibold">If:</span> {content.implementation.ifCondition}
            </p>
          </div>
          <div className="p-3 bg-white rounded border-l-4 border-orange-500">
            <p className="text-orange-800">
              <span className="font-semibold">Then:</span> {content.implementation.thenAction}
            </p>
          </div>
          <div className="p-3 bg-white rounded border-l-4 border-orange-300">
            <p className="text-orange-700">
              <span className="font-semibold">Otherwise:</span> {content.implementation.elseOption}
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-teal-50 rounded-lg">
        <h4 className="font-medium text-teal-900 mb-3">Tracking Suggestions</h4>
        <p className="text-teal-800 mb-3 font-medium">{content.tracking.question}</p>
        <ul className="space-y-2">
          {content.tracking.suggestions?.map((suggestion: string, index: number) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="text-teal-400 mt-1">•</span>
              <span className="text-teal-700">{suggestion}</span>
            </li>
          ))}
        </ul>
        <p className="text-teal-600 text-sm mt-3 italic">{content.tracking.frequency}</p>
      </div>
      
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Flexibility Framework</h4>
        <div className="space-y-2 text-sm">
          <p className="text-gray-700"><span className="font-medium">Permission:</span> {content.adjustment.permission}</p>
          <p className="text-gray-700"><span className="font-medium">Signals:</span> {content.adjustment.signals}</p>
          <p className="text-gray-700"><span className="font-medium">Flexibility:</span> {content.adjustment.flexibility}</p>
        </div>
      </div>
      
      <div className="p-3 bg-blue-100 rounded text-center">
        <p className="text-blue-800 italic">{content.gentleAccountability}</p>
      </div>
    </div>
  );
}

// Crisis Support Display Component
function CrisisSupportDisplay({ ladderResult, onComplete }: { ladderResult: LadderResult; onComplete?: (result: any) => void }) {
  const crisisContent = ladderResult.ladderTree[0]?.content;
  
  return (
    <div className="max-w-3xl mx-auto p-6 bg-red-50 rounded-lg border border-red-200">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-red-800 mb-2">
          Crisis Support Container
        </h3>
        <p className="text-red-700">
          Immediate support and stabilization - taking this at your pace.
        </p>
      </div>
      
      {/* Immediate Stabilization */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-red-200">
        <h4 className="font-semibold text-red-800 mb-3">Right Now</h4>
        <div className="space-y-2">
          <p className="text-red-700">1. {crisisContent.immediate.step1}</p>
          <p className="text-red-700">2. {crisisContent.immediate.step2}</p>
          <p className="text-red-700">3. {crisisContent.immediate.step3}</p>
        </div>
      </div>
      
      {/* Grounding Protocol */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-red-200">
        <h4 className="font-semibold text-red-800 mb-3">Grounding</h4>
        <div className="space-y-3">
          <p className="text-red-700"><span className="font-medium">Breathing:</span> {crisisContent.grounding.breathing}</p>
          <p className="text-red-700"><span className="font-medium">Sensing:</span> {crisisContent.grounding.sensing}</p>
          <p className="text-red-700"><span className="font-medium">Affirmation:</span> "{crisisContent.grounding.affirmation}"</p>
        </div>
      </div>
      
      {/* Crisis Resources */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-red-200">
        <h4 className="font-semibold text-red-800 mb-3">Crisis Resources</h4>
        <ul className="space-y-2">
          {crisisContent.resources?.map((resource: string, index: number) => (
            <li key={index} className="text-red-700">
              {resource}
            </li>
          ))}
        </ul>
      </div>
      
      {/* Balance Meter */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="font-semibold text-yellow-800 mb-3">Pacing Guidance</h4>
        <p className="text-yellow-700 mb-2">
          <span className="font-medium">Current Setting:</span> {crisisContent.balanceMeter.currentSetting}
        </p>
        <p className="text-yellow-700">{crisisContent.balanceMeter.permission}</p>
      </div>
      
      {/* Follow-up */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-3">Next Steps</h4>
        <div className="space-y-2 text-blue-700">
          <p><span className="font-medium">Check-in:</span> {crisisContent.followUp.checkIn}</p>
          <p><span className="font-medium">Professional Support:</span> {crisisContent.followUp.professional}</p>
          <p><span className="font-medium">Self-Compassion:</span> {crisisContent.followUp.selfCompassion}</p>
        </div>
      </div>
      
      <div className="text-center">
        <button
          onClick={() => onComplete?.(ladderResult)}
          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500"
        >
          I'm Taking Care of Myself
        </button>
      </div>
    </div>
  );
}