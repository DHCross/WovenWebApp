// components/HealthDataUpload.tsx
// Upload and correlate Apple Health Auto Export data with Symbolic Weather
// Requires Google authentication

"use client";
/* eslint-disable no-console */

import { useState, useCallback } from 'react';
import type {
  AppleHealthExport,
  SeismographMap,
  ComparativeReportData,
} from '../lib/health-data-types';
import {
  normalizeAppleHealthData,
  generateComparativeReport,
} from '../lib/health-correlator';

interface HealthDataUploadProps {
  seismographData: SeismographMap;
  isAuthenticated: boolean;
  onReportGenerated?: (report: ComparativeReportData) => void;
}

export default function HealthDataUpload({
  seismographData,
  isAuthenticated,
  onReportGenerated,
}: HealthDataUploadProps) {
  const [healthData, setHealthData] = useState<AppleHealthExport | null>(null);
  const [report, setReport] = useState<ComparativeReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setError(null);
      setIsProcessing(true);

      try {
        const text = await file.text();
        const json = JSON.parse(text) as AppleHealthExport;

        // Validate basic structure
        if (!json.data) {
          throw new Error('Invalid Health Auto Export format: missing "data" field');
        }

        setHealthData(json);

        // Generate comparative report
        const normalized = normalizeAppleHealthData(json);
        const generatedReport = generateComparativeReport(seismographData, normalized);

        setReport(generatedReport);
        onReportGenerated?.(generatedReport);
      } catch (err) {
        console.error('Health data upload error:', err);
        setError(err instanceof Error ? err.message : 'Failed to process health data');
        setHealthData(null);
        setReport(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [seismographData, onReportGenerated]
  );

  const clearData = useCallback(() => {
    setHealthData(null);
    setReport(null);
    setError(null);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-6">
        <div className="flex items-start gap-3">
          <svg className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <h3 className="text-base font-semibold text-amber-100 mb-1">
              Health Overlay Locked
            </h3>
            <p className="text-sm text-amber-200/80">
              Uncanny Scoring itself is always available. Sign in with Google to unlock the optional health data overlay, which lets you compare Apple Health exports against symbolic weather.
            </p>
            <p className="text-xs text-amber-300/60 mt-2">
              Your physiological data never leaves the browser—OAuth simply keeps the overlay secure and personal to you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="rounded-lg border border-indigo-500/30 bg-indigo-900/10 p-6">
        <h3 className="text-lg font-semibold text-indigo-100 mb-2 flex items-center gap-2">
          <span>🩺</span>
          <span>Health Data Overlay (Optional)</span>
        </h3>
        <p className="text-sm text-indigo-200/80 mb-4">
          Uncanny Scoring already runs on symbolic weather and your narrative logs. This overlay adds physiological context—upload an <strong>Apple Health Auto Export</strong> JSON to compare HRV, sleep, and more against the symbolic weather stream.
        </p>

        {!healthData && (
          <div>
            <label
              htmlFor="health-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload Health JSON</span>
            </label>
            <input
              id="health-upload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />

            <p className="text-xs text-indigo-300/60 mt-3">
              Get the iOS app: <strong>Health Auto Export</strong> from the App Store
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-3 text-indigo-200">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Processing health data...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-900/20 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-200">Upload Error</p>
                <p className="text-xs text-red-300/80 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {healthData && report && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Health data loaded</span>
              </div>
              <button
                onClick={clearData}
                className="text-xs text-indigo-300 hover:text-indigo-100 transition"
              >
                Clear &times;
              </button>
            </div>

            <div className="text-xs text-indigo-200/70 space-y-1">
              <p>
                <strong>Date range:</strong> {report.dateRange.start} → {report.dateRange.end}
              </p>
              <p>
                <strong>Metrics:</strong> {report.availableMetrics.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Report Summary */}
      {report && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 space-y-4">
          <h4 className="text-base font-semibold text-slate-100">
            Three-Lane Correlation Results
          </h4>

          {/* Correlation Scores */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {report.correlation.valence_mood !== undefined && (
              <div className="rounded bg-slate-700/50 p-3">
                <div className="text-xs text-slate-400 mb-1">Valence ↔ Mood</div>
                <div className="text-2xl font-bold text-slate-100">
                  {(report.correlation.valence_mood * 100).toFixed(0)}%
                </div>
              </div>
            )}

            {report.correlation.magnitude_intensity !== undefined && (
              <div className="rounded bg-slate-700/50 p-3">
                <div className="text-xs text-slate-400 mb-1">Magnitude ↔ Intensity</div>
                <div className="text-2xl font-bold text-slate-100">
                  {(report.correlation.magnitude_intensity * 100).toFixed(0)}%
                </div>
              </div>
            )}

            {report.correlation.volatility_swings !== undefined && (
              <div className="rounded bg-slate-700/50 p-3">
                <div className="text-xs text-slate-400 mb-1">Volatility ↔ Swings</div>
                <div className="text-2xl font-bold text-slate-100">
                  {(report.correlation.volatility_swings * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>

          {/* Composite Score */}
          {report.correlation.composite !== undefined && (
            <div className="rounded-lg bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-indigo-200 mb-1">Composite Uncanny Score</div>
                  <div className="text-xs text-indigo-300/70">
                    Average similarity across all lanes
                  </div>
                </div>
                <div className="text-4xl font-bold text-indigo-100">
                  {(report.correlation.composite * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}

          {/* Shuffle Test */}
          {report.shuffleTest && (
            <div className="rounded bg-slate-700/30 p-4 border border-slate-600/50">
              <div className="text-sm font-medium text-slate-200 mb-2">
                Statistical Significance (Shuffle Test)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-slate-400">Observed</div>
                  <div className="text-slate-100 font-mono">{report.shuffleTest.observed.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-400">Null Mean</div>
                  <div className="text-slate-100 font-mono">{report.shuffleTest.null_mean.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-400">Null σ</div>
                  <div className="text-slate-100 font-mono">{report.shuffleTest.null_sd.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-400">p-value</div>
                  <div className="text-slate-100 font-mono">
                    {report.shuffleTest.p_value === 0 ? '< 0.001' : report.shuffleTest.p_value.toFixed(3)}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Ran {report.shuffleTest.iterations.toLocaleString()} permutations to test if correlation could occur by chance
              </p>
            </div>
          )}

          {/* Band Summary */}
          <div className="rounded bg-slate-700/30 p-4 border border-slate-600/50">
            <div className="text-sm font-medium text-slate-200 mb-2">
              Resonance Bands (SST Classification)
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-green-400 font-mono">{report.bandSummary.within}</span>
                <span className="text-slate-400 ml-1">Within (WB)</span>
              </div>
              <div>
                <span className="text-amber-400 font-mono">{report.bandSummary.edge}</span>
                <span className="text-slate-400 ml-1">Edge (ABE)</span>
              </div>
              <div>
                <span className="text-red-400 font-mono">{report.bandSummary.outside}</span>
                <span className="text-slate-400 ml-1">Outside (OSR)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
