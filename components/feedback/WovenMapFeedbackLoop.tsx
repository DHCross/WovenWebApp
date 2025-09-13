'use client';

import React, { useState, useEffect } from 'react';
import SSTFeedback from './SSTFeedback';
import SessionScores from './SessionScores';
import WrapUpCard from './WrapUpCard';
import AdviceLadderTree from './AdviceLadderTree';
import DailyIntegrationLayer from './DailyIntegrationLayer';

interface WovenMapFeedbackLoopProps {
  mathBrainResult: {
    success: boolean;
    wovenMap?: {
      hook_stack?: {
        titles: Array<{
          title: string;
          intensity: number;
          polarity: string;
        }>;
        volatilityIndex: number;
      };
      aspectsReport?: any;
      energyClimate?: any;
    };
    sessionId?: string;
  };
  onComplete?: (completeFeedback: any) => void;
}

interface SessionData {
  sessionId: string;
  hookStack: any;
  sessionScores?: any;
  sstLogs?: Array<any>;
  driftIndex?: number;
}

type FeedbackStep = 'sst' | 'scores' | 'ladder' | 'integration' | 'wrapup' | 'complete';

export default function WovenMapFeedbackLoop({ 
  mathBrainResult, 
  onComplete 
}: WovenMapFeedbackLoopProps) {
  const [currentStep, setCurrentStep] = useState<FeedbackStep>('sst');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [sstFeedback, setSSTFeedback] = useState<Array<any>>([]);
  const [sessionScores, setSessionScores] = useState<any>(null);
  const [ladderResults, setLadderResults] = useState<any>(null);
  const [integrationResults, setIntegrationResults] = useState<any>(null);
  const [integrationPreference, setIntegrationPreference] = useState<'minimal' | 'gentle' | 'active'>('gentle');
  const [userNeed, setUserNeed] = useState<string>('general');

  useEffect(() => {
    initializeSession();
  }, [mathBrainResult]);

  const initializeSession = () => {
    if (!mathBrainResult.success || !mathBrainResult.wovenMap?.hook_stack) {
      return;
    }

    const session: SessionData = {
      sessionId: mathBrainResult.sessionId || `session-${Date.now()}`,
      hookStack: mathBrainResult.wovenMap.hook_stack,
      sstLogs: [],
      driftIndex: 0
    };

    setSessionData(session);
  };

  const handleSSTComplete = (feedback: Array<any>) => {
    setSSTFeedback(feedback);
    
    // Update session data with SST logs
    if (sessionData) {
      const updatedSession = {
        ...sessionData,
        sstLogs: feedback
      };
      setSessionData(updatedSession);
    }
    
    setCurrentStep('scores');
  };

  const handleScoresComplete = (scores: any) => {
    setSessionScores(scores);
    
    // Update session data with scores
    if (sessionData) {
      const updatedSession = {
        ...sessionData,
        sessionScores: scores,
        driftIndex: scores.driftIndex || 0
      };
      setSessionData(updatedSession);
    }
    
    setCurrentStep('ladder');
  };

  const handleLadderComplete = (results: any) => {
    setLadderResults(results);
    setCurrentStep('integration');
  };

  const handleIntegrationComplete = (integration: any) => {
    setIntegrationResults(integration);
    setCurrentStep('wrapup');
  };

  const handleWrapUpComplete = (wrapUpData: any) => {
    const completeFeedback = {
      sessionData,
      sstFeedback,
      sessionScores,
      ladderResults,
      integrationResults,
      wrapUpData,
      completedAt: new Date().toISOString()
    };
    
    onComplete?.(completeFeedback);
    setCurrentStep('complete');
  };

  const goToPreviousStep = () => {
    const stepOrder: FeedbackStep[] = ['sst', 'scores', 'ladder', 'integration', 'wrapup'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  if (!sessionData) {
    return (
      <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-yellow-800">
          Hook Stack is required to begin the feedback loop. Please generate a Math Brain result first.
        </p>
      </div>
    );
  }

  const stepTitles = {
    sst: 'Resonance Feedback',
    scores: 'Session Metrics',
    ladder: 'Therapeutic Integration',
    integration: 'Daily Integration',
    wrapup: 'Session Summary',
    complete: 'Complete'
  };

  const stepDescriptions = {
    sst: 'Mark how well the Hook Stack titles resonate with your experience',
    scores: 'Review transparent accuracy and performance metrics',
    ladder: 'Engage with therapeutic support tailored to your needs',
    integration: 'Set up daily recognition prompts and portable summaries',
    wrapup: 'Create your session summary card',
    complete: 'Feedback loop completed successfully'
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Woven Map Feedback Loop
        </h2>
        <p className="text-gray-600 mb-4">
          Therapeutic integration system with falsifiability-first approach
        </p>
        
        {/* Step Progress */}
        <div className="flex items-center space-x-4 mb-4">
          {Object.entries(stepTitles).slice(0, -1).map(([step, title], index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step 
                  ? 'bg-blue-600 text-white' 
                  : index < Object.keys(stepTitles).indexOf(currentStep)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              {index < Object.entries(stepTitles).length - 2 && (
                <div className={`w-8 h-1 mx-2 ${
                  index < Object.keys(stepTitles).indexOf(currentStep) - 1
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {stepTitles[currentStep]}
            </h3>
            <p className="text-sm text-gray-600">
              {stepDescriptions[currentStep]}
            </p>
          </div>
          
          {currentStep !== 'sst' && currentStep !== 'complete' && (
            <button
              onClick={goToPreviousStep}
              className="px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Previous Step
            </button>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      {currentStep === 'sst' && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3">Session Configuration</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Integration Preference
              </label>
              <select
                value={integrationPreference}
                onChange={(e) => setIntegrationPreference(e.target.value as any)}
                aria-label="Integration Preference"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="minimal">Minimal - Quick check-ins</option>
                <option value="gentle">Gentle - Mindful noticing</option>
                <option value="active">Active - Conscious integration</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Need
              </label>
              <select
                value={userNeed}
                onChange={(e) => setUserNeed(e.target.value)}
                aria-label="Current Need"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General support</option>
                <option value="decision">Decision support</option>
                <option value="boundary">Boundary clarification</option>
                <option value="action">Action planning</option>
                <option value="crisis">Crisis support</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="mb-8">
        {currentStep === 'sst' && sessionData.hookStack?.titles?.length > 0 && (
          <div className="space-y-4">
            {sessionData.hookStack.titles.map((hook: any, index: number) => (
              <SSTFeedback
                key={index}
                hookTitle={hook.title}
                hookData={{
                  intensity: hook.intensity,
                  aspect_type: hook.polarity
                }}
                sessionId={sessionData.sessionId}
                onSubmitFeedback={(feedback) => {
                  const updatedFeedback = [...sstFeedback, feedback];
                  setSSTFeedback(updatedFeedback);
                  
                  // If all hooks have feedback, move to next step
                  if (updatedFeedback.length >= sessionData.hookStack.titles.length) {
                    handleSSTComplete(updatedFeedback);
                  }
                }}
              />
            ))}
          </div>
        )}

        {currentStep === 'scores' && sessionScores && (
          <div className="space-y-6">
            <SessionScores
              scores={sessionScores}
              driftIndex={{
                drift_detected: sessionScores.driftIndex > 0.5,
                drift_direction: sessionScores.driftIndex > 0.5 ? 'sidereal' : null,
                confidence: sessionScores.driftIndex || 0,
                osr_count: sessionScores.osr_count || 0,
                driver_aligned: 0,
                role_aligned: 0
              }}
              showDetails={true}
            />
            <div className="text-center">
              <button
                onClick={() => setCurrentStep('ladder')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
              >
                Continue to Therapeutic Integration
              </button>
            </div>
          </div>
        )}

        {currentStep === 'ladder' && sessionData && (
          <AdviceLadderTree
            hookStack={sessionData.hookStack}
            sessionContext={sessionData}
            userNeed={userNeed}
            onComplete={handleLadderComplete}
          />
        )}

        {currentStep === 'integration' && sessionData && (
          <DailyIntegrationLayer
            sessionData={sessionData}
            ladderResults={ladderResults}
            integrationPreference={integrationPreference}
            onComplete={handleIntegrationComplete}
          />
        )}

        {currentStep === 'wrapup' && sessionData && sessionScores && (
          <div className="space-y-6">
            <WrapUpCard
              hookStack={{
                hooks: sessionData.hookStack.titles.map((title: any) => ({
                  title: title.title,
                  intensity: title.intensity,
                  is_tier_1: title.intensity > 0.7
                })),
                coverage: `${sessionData.hookStack.titles.length} Hook Stack titles`
              }}
              sessionScores={sessionScores}
              driftIndex={{
                drift_detected: sessionScores.driftIndex > 0.5,
                drift_direction: sessionScores.driftIndex > 0.5 ? 'sidereal' : null,
                confidence: sessionScores.driftIndex || 0
              }}
              sessionId={sessionData.sessionId}
              onSaveCard={(cardData) => {
                handleWrapUpComplete(cardData);
              }}
            />
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">
              Feedback Loop Complete
            </h3>
            <p className="text-green-700 mb-4">
              Your therapeutic integration system is now active with personalized recognition prompts 
              and portable summary cards.
            </p>
            <div className="space-y-2 text-sm text-green-600">
              <p>• Hook Stack titles integrated into daily awareness</p>
              <p>• Falsifiability feedback calibrated your session accuracy</p>
              <p>• Therapeutic ladder provides ongoing support framework</p>
              <p>• Daily integration layer ready for ongoing use</p>
            </div>
          </div>
        )}
      </div>

      {/* Session Info Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>Session ID: {sessionData.sessionId}</p>
        <p>Hook Stack Count: {sessionData.hookStack?.titles?.length || 0} | 
           Preference: {integrationPreference} | 
           Current Need: {userNeed}
        </p>
      </div>
    </div>
  );
}