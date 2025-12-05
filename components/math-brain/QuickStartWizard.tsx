'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { CityAutocomplete, type CityResult } from './CityAutocomplete';
import { DateTimePicker } from './DateTimePicker';

export interface QuickStartData {
  name: string;
  birthDate: Date | null;
  birthTime: { hour: number; minute: number } | null;
  city: CityResult | null;
  // Derived fields for compatibility with existing form
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  cityName: string;
  state: string;
  coordinates: string;
  timezone: string;
}

interface QuickStartWizardProps {
  onComplete: (data: QuickStartData) => void;
  onSwitchToAdvanced: () => void;
  initialName?: string;
}

type WizardStep = 'name' | 'datetime' | 'location' | 'review';

const STEP_CONFIG: Record<WizardStep, { title: string; subtitle: string; icon: string }> = {
  name: {
    title: "Who is this reading for?",
    subtitle: "Enter the name for your chart",
    icon: "👤",
  },
  datetime: {
    title: "When were they born?",
    subtitle: "Date and time of birth",
    icon: "📅",
  },
  location: {
    title: "Where were they born?",
    subtitle: "City and country of birth",
    icon: "📍",
  },
  review: {
    title: "Ready to generate",
    subtitle: "Review your chart details",
    icon: "✨",
  },
};

const STEPS: WizardStep[] = ['name', 'datetime', 'location', 'review'];

export function QuickStartWizard({
  onComplete,
  onSwitchToAdvanced,
  initialName = '',
}: QuickStartWizardProps) {
  const [step, setStep] = useState<WizardStep>('name');
  const [name, setName] = useState(initialName);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [birthTime, setBirthTime] = useState<{ hour: number; minute: number } | null>(null);
  const [city, setCity] = useState<CityResult | null>(null);
  const [unknownTime, setUnknownTime] = useState(false);

  const currentStepIndex = STEPS.indexOf(step);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = step === 'review';

  const canProceed = useCallback(() => {
    switch (step) {
      case 'name':
        return name.trim().length >= 2;
      case 'datetime':
        return birthDate !== null && (unknownTime || birthTime !== null);
      case 'location':
        return city !== null;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [step, name, birthDate, birthTime, city, unknownTime]);

  const goNext = useCallback(() => {
    if (!canProceed()) return;
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex]);
    }
  }, [canProceed, currentStepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  const handleComplete = useCallback(() => {
    if (!birthDate || !city) return;

    // Format for existing form compatibility
    const effectiveTime = unknownTime 
      ? { hour: 12, minute: 0 } 
      : (birthTime ?? { hour: 12, minute: 0 });

    const data: QuickStartData = {
      name: name.trim(),
      birthDate,
      birthTime: unknownTime ? null : birthTime,
      city,
      // Derived fields
      year: birthDate.getFullYear().toString(),
      month: (birthDate.getMonth() + 1).toString().padStart(2, '0'),
      day: birthDate.getDate().toString().padStart(2, '0'),
      hour: effectiveTime.hour.toString().padStart(2, '0'),
      minute: effectiveTime.minute.toString().padStart(2, '0'),
      cityName: city.name,
      state: city.adminCode || '',
      coordinates: `${city.lat}, ${city.lng}`,
      timezone: city.timezone || 'America/New_York',
    };

    onComplete(data);
  }, [name, birthDate, birthTime, city, unknownTime, onComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canProceed()) {
        e.preventDefault();
        if (isLastStep) {
          handleComplete();
        } else {
          goNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canProceed, goNext, handleComplete, isLastStep]);

  const stepConfig = STEP_CONFIG[step];

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          {STEPS.map((s, i) => {
            const isActive = i === currentStepIndex;
            const isComplete = i < currentStepIndex;
            return (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                      : isComplete
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isComplete ? '✓' : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-12 sm:w-20 h-0.5 mx-2 transition-colors ${
                      isComplete ? 'bg-emerald-500/40' : 'bg-slate-800'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl mb-4 block">{stepConfig.icon}</span>
          <h2 className="text-2xl font-semibold text-slate-100">{stepConfig.title}</h2>
          <p className="text-sm text-slate-400 mt-1">{stepConfig.subtitle}</p>
        </div>

        {/* Step-specific content */}
        <div className="min-h-[200px]">
          {step === 'name' && (
            <div className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name..."
                autoFocus
                className="w-full px-4 py-4 text-lg rounded-xl border border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
              />
              <p className="text-xs text-slate-500 text-center">
                This name will appear on your chart report
              </p>
            </div>
          )}

          {step === 'datetime' && (
            <div className="space-y-6">
              <DateTimePicker
                date={birthDate}
                time={birthTime}
                onDateChange={setBirthDate}
                onTimeChange={setBirthTime}
                disabled={false}
              />
              <label className="flex items-center gap-3 text-sm text-slate-400 justify-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={unknownTime}
                  onChange={(e) => setUnknownTime(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                />
                <span>I don't know the exact birth time</span>
              </label>
              {unknownTime && (
                <p className="text-xs text-amber-400/80 text-center">
                  Noon will be used as a default. House positions may be approximate.
                </p>
              )}
            </div>
          )}

          {step === 'location' && (
            <div className="space-y-4">
              <CityAutocomplete
                value={city}
                onChange={setCity}
                placeholder="Search for a city..."
              />
              {city && (
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <p className="text-sm text-slate-300">
                    <span className="text-slate-500">Location:</span> {city.name}, {city.adminCode || city.country}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Coordinates: {city.lat.toFixed(4)}, {city.lng.toFixed(4)} • Timezone: {city.timezone}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <h3 className="font-medium text-emerald-200 mb-3">Chart Details</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Name</dt>
                    <dd className="text-slate-200 font-medium">{name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Birth Date</dt>
                    <dd className="text-slate-200">
                      {birthDate?.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Birth Time</dt>
                    <dd className="text-slate-200">
                      {unknownTime 
                        ? '12:00 PM (unknown)' 
                        : birthTime 
                          ? `${birthTime.hour.toString().padStart(2, '0')}:${birthTime.minute.toString().padStart(2, '0')}`
                          : 'Not set'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Location</dt>
                    <dd className="text-slate-200">{city?.name}, {city?.adminCode || city?.country}</dd>
                  </div>
                </dl>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Click "Generate Reading" to create your chart, or go back to make changes.
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-800">
          <div>
            {!isFirstStep ? (
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onSwitchToAdvanced}
                className="px-4 py-2 text-sm text-slate-400 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/50 rounded-lg transition"
              >
                ⚙️ Advanced Form
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={isLastStep ? handleComplete : goNext}
            disabled={!canProceed()}
            className={`px-6 py-3 rounded-xl font-medium transition ${
              canProceed()
                ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isLastStep ? 'Generate Reading →' : 'Continue →'}
          </button>
        </div>
      </div>

      {/* Quick tips */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-600">
          Need to add a second person for relationship reading?{' '}
          <button
            type="button"
            onClick={onSwitchToAdvanced}
            className="text-emerald-500/70 hover:text-emerald-400 underline"
          >
            Switch to advanced mode
          </button>
        </p>
      </div>
    </div>
  );
}

export default QuickStartWizard;
