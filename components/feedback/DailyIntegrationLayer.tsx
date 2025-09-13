'use client';

import React, { useState, useEffect } from 'react';

interface DailyIntegrationProps {
  sessionData: {
    sessionId: string;
    hookStack: {
      titles: Array<{
        title: string;
        intensity: number;
        polarity: string;
      }>;
      volatilityIndex: number;
    };
    sessionScores?: {
      accuracy: number;
      edgeCapture: number;
      clarity: number;
    };
    sstLogs?: Array<any>;
    driftIndex?: number;
  };
  ladderResults?: any;
  integrationPreference?: 'minimal' | 'gentle' | 'active';
  onComplete?: (integration: any) => void;
}

interface RecognitionPrompts {
  morning: string;
  midday: string;
  evening: string;
  sstFocus: string;
  customPrompts: Array<{
    theme: string;
    prompt: string;
    frequency: string;
  }>;
}

interface WeightBeltCard {
  title?: string;
  essence?: string;
  energy?: string;
  intensity?: string;
  text?: string;
  confidence?: string;
  question?: string;
  compass?: string;
  reference?: string;
  touchstone?: string;
  grounding?: string;
  reminder?: string;
}

interface WeightBelt {
  cards: {
    essence: WeightBeltCard;
    reminder: WeightBeltCard;
    compass: WeightBeltCard;
    touchstone: WeightBeltCard;
  };
  carryForward: {
    type: string;
    content: string;
    usage: string;
  };
  shareableFormat: {
    format: string;
    content: string;
    metadata: any;
  };
}

export default function DailyIntegrationLayer({ 
  sessionData, 
  ladderResults, 
  integrationPreference = 'gentle',
  onComplete 
}: DailyIntegrationProps) {
  const [integration, setIntegration] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string>('essence');
  const [showShareable, setShowShareable] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    generateIntegration();
  }, [sessionData, ladderResults, integrationPreference]);

  const generateIntegration = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/daily-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionData,
          ladderResults,
          integrationPreference
        })
      });

      const result = await response.json();
      if (result.success) {
        setIntegration(result.dailyIntegration);
      }
    } catch (error) {
      console.error('Error generating daily integration:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (isGenerating) {
    return (
      <div className="p-6 bg-green-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
          <span className="text-green-700">Generating your daily integration layer...</span>
        </div>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <p className="text-gray-600">Unable to generate daily integration at this time.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-2">
          Daily Integration Layer
        </h3>
        <p className="text-gray-600">
          Recognition prompts and portable summaries for ongoing integration
        </p>
        <div className="mt-2 text-sm text-gray-500">
          Preference: {integrationPreference} • Rhythm: {integration.rhythm?.frequency}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Recognition Layer */}
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              Recognition Layer
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Daily awareness prompts based on your session patterns
            </p>
          </div>

          <RecognitionPromptsDisplay 
            prompts={integration.recognitionLayer} 
            rhythm={integration.rhythm}
          />
        </div>

        {/* Weight Belt */}
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              Weight Belt
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Portable summary cards for ongoing integration
            </p>
          </div>

          <WeightBeltDisplay 
            weightBelt={integration.weightBelt}
            selectedCard={selectedCard}
            onCardSelect={setSelectedCard}
            onShowShareable={() => setShowShareable(true)}
          />
        </div>
      </div>

      {/* Shareable Format Modal */}
      {showShareable && (
        <ShareableFormatModal
          shareableFormat={integration.weightBelt.shareableFormat}
          onClose={() => setShowShareable(false)}
          onCopy={copyToClipboard}
        />
      )}

      {/* Complete Button */}
      <div className="mt-8 text-center">
        <button
          onClick={() => onComplete?.(integration)}
          className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 font-medium"
        >
          Complete Integration Setup
        </button>
      </div>
    </div>
  );
}

// Recognition Prompts Display Component
function RecognitionPromptsDisplay({ prompts, rhythm }: { prompts: RecognitionPrompts; rhythm: any }) {
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  const timePrompts = [
    { key: 'morning', label: 'Morning', icon: '🌅', text: prompts.morning },
    { key: 'midday', label: 'Midday', icon: '☀️', text: prompts.midday },
    { key: 'evening', label: 'Evening', icon: '🌙', text: prompts.evening }
  ];

  return (
    <div className="space-y-4">
      {/* Rhythm Info */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">Integration Rhythm</h5>
        <div className="text-sm text-blue-800 space-y-1">
          <p><span className="font-medium">Frequency:</span> {rhythm.frequency}</p>
          <p><span className="font-medium">Duration:</span> {rhythm.duration}</p>
          <p><span className="font-medium">Approach:</span> {rhythm.approach}</p>
          {rhythm.note && (
            <p className="text-blue-700 italic mt-2">{rhythm.note}</p>
          )}
        </div>
      </div>

      {/* Time-based Prompts */}
      <div className="space-y-3">
        {timePrompts.map((prompt) => (
          <div key={prompt.key} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setExpandedPrompt(
                expandedPrompt === prompt.key ? null : prompt.key
              )}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{prompt.icon}</span>
                <span className="font-medium text-gray-800">{prompt.label}</span>
              </div>
              <span className="text-gray-400">
                {expandedPrompt === prompt.key ? '−' : '+'}
              </span>
            </button>
            {expandedPrompt === prompt.key && (
              <div className="px-4 pb-4">
                <p className="text-gray-700 bg-gray-50 p-3 rounded italic">
                  "{prompt.text}"
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* SST Focus */}
      <div className="p-3 bg-yellow-50 rounded-lg">
        <h6 className="font-medium text-yellow-900 mb-1">Current Focus</h6>
        <p className="text-sm text-yellow-800">
          Your session showed a <span className="font-medium">{prompts.sstFocus}</span> pattern
        </p>
      </div>

      {/* Custom Prompts */}
      {prompts.customPrompts?.length > 0 && (
        <div className="space-y-2">
          <h6 className="font-medium text-gray-800">Custom Prompts</h6>
          {prompts.customPrompts.map((custom, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-700 mb-1">
                <span className="font-medium capitalize">{custom.theme}:</span>
              </p>
              <p className="text-gray-600 italic">"{custom.prompt}"</p>
              <p className="text-gray-500 text-xs mt-1">{custom.frequency}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Weight Belt Display Component
function WeightBeltDisplay({ 
  weightBelt, 
  selectedCard, 
  onCardSelect, 
  onShowShareable 
}: { 
  weightBelt: WeightBelt; 
  selectedCard: string; 
  onCardSelect: (card: string) => void;
  onShowShareable: () => void;
}) {
  const cardTypes = [
    { key: 'essence', label: 'Essence', icon: '✨', color: 'purple' },
    { key: 'reminder', label: 'Reminder', icon: '💭', color: 'blue' },
    { key: 'compass', label: 'Compass', icon: '🧭', color: 'green' },
    { key: 'touchstone', label: 'Touchstone', icon: '🗿', color: 'amber' }
  ];

  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900'
  };

  return (
    <div className="space-y-4">
      {/* Card Selector */}
      <div className="flex space-x-2 mb-4">
        {cardTypes.map((cardType) => (
          <button
            key={cardType.key}
            onClick={() => onCardSelect(cardType.key)}
            className={`flex-1 p-2 text-sm rounded-md border transition-colors ${
              selectedCard === cardType.key
                ? colorClasses[cardType.color]
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex flex-col items-center space-y-1">
              <span className="text-lg">{cardType.icon}</span>
              <span className="font-medium">{cardType.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Card Display */}
      <div className="border border-gray-200 rounded-lg p-6 min-h-[200px]">
        {selectedCard === 'essence' && (
          <EssenceCard card={weightBelt.cards.essence} />
        )}
        {selectedCard === 'reminder' && (
          <ReminderCard card={weightBelt.cards.reminder} />
        )}
        {selectedCard === 'compass' && (
          <CompassCard card={weightBelt.cards.compass} />
        )}
        {selectedCard === 'touchstone' && (
          <TouchstoneCard card={weightBelt.cards.touchstone} />
        )}
      </div>

      {/* Carry Forward Section */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
        <h6 className="font-medium text-indigo-900 mb-2">Carry Forward</h6>
        <p className="text-indigo-800 mb-2">{weightBelt.carryForward.content}</p>
        <p className="text-sm text-indigo-600 italic">{weightBelt.carryForward.usage}</p>
      </div>

      {/* Actions */}
      <div className="flex space-x-3">
        <button
          onClick={onShowShareable}
          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 text-sm"
        >
          Create Shareable Summary
        </button>
      </div>
    </div>
  );
}

// Individual Card Components
function EssenceCard({ card }: { card: WeightBeltCard }) {
  return (
    <div className="text-center space-y-4">
      <div>
        <h5 className="text-xl font-semibold text-gray-800 mb-2">{card.title}</h5>
        <p className="text-gray-700 text-lg">{card.essence}</p>
      </div>
      <div className="flex justify-center space-x-6 text-sm">
        <div>
          <span className="text-gray-500">Energy:</span>
          <span className="ml-2 font-medium text-gray-800">{card.energy}</span>
        </div>
        {card.intensity && (
          <div>
            <span className="text-gray-500">Intensity:</span>
            <span className="ml-2 font-medium text-gray-800">{card.intensity}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ReminderCard({ card }: { card: WeightBeltCard }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-lg text-gray-800 mb-4 italic">"{card.text}"</p>
        <div className="text-sm text-gray-600">
          <p>{card.confidence}</p>
          <p className="mt-2 font-medium">Approach: Notice before action</p>
        </div>
      </div>
    </div>
  );
}

function CompassCard({ card }: { card: WeightBeltCard }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h6 className="font-medium text-gray-800 mb-3">{card.question}</h6>
        <p className="text-lg text-gray-700 italic mb-4">"{card.compass}"</p>
        <p className="text-sm text-gray-600">{card.reference}</p>
      </div>
    </div>
  );
}

function TouchstoneCard({ card }: { card: WeightBeltCard }) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-3">
        <p className="text-lg font-medium text-gray-800">"{card.touchstone}"</p>
        <div className="space-y-2 text-sm text-gray-600">
          <p><span className="font-medium">Grounding:</span> {card.grounding}</p>
          <p><span className="font-medium">Remember:</span> {card.reminder}</p>
        </div>
      </div>
    </div>
  );
}

// Shareable Format Modal
function ShareableFormatModal({ 
  shareableFormat, 
  onClose, 
  onCopy 
}: { 
  shareableFormat: any; 
  onClose: () => void; 
  onCopy: (text: string) => void; 
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold">Shareable Integration Summary</h4>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4">
          <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border overflow-x-auto">
            {shareableFormat.content}
          </pre>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => onCopy(shareableFormat.content)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Copy to Clipboard
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}