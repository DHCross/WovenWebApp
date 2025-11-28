/* eslint-disable no-console */
'use client';

import { useState, useEffect } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSnapshot } from '../hooks/useSnapshot';
import { formatCoordinates } from '../utils/snapshot';

type SnapshotSubject = 'A' | 'B' | 'BOTH';

interface SnapshotButtonProps {
  personA: any;
  personB?: any;
  mode: string;
  isAuthenticated: boolean;
  disabled?: boolean;
  includePersonB: boolean;
  includeTransits: boolean;
  startDate: string;
  endDate: string;
  reportType: string;
  onSnapshot: (result: any, location: any, timestamp: Date) => void;
  onAuthRequired: () => void;
  onDateChange: (date: string) => void;
}

export default function SnapshotButton({
  personA,
  personB,
  mode,
  isAuthenticated,
  disabled,
  includePersonB,
  includeTransits,
  startDate,
  endDate,
  reportType,
  onSnapshot,
  onAuthRequired,
  onDateChange,
}: SnapshotButtonProps) {
  const geolocation = useGeolocation();
  const snapshot = useSnapshot();
  const [showLocationInfo, setShowLocationInfo] = useState(false);
  
  // Custom date/time state
  const [showCustomDateTime, setShowCustomDateTime] = useState(false);
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customTime, setCustomTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  
  // Subject selection state (only relevant when Person B is available)
  const [snapshotSubject, setSnapshotSubject] = useState<SnapshotSubject>('A');

  // Update subject selection when Person B availability changes
  useEffect(() => {
    if (!includePersonB || !personB) {
      setSnapshotSubject('A');
    }
  }, [includePersonB, personB]);

  // Check if date range is multi-day
  const isMultiDay = startDate !== endDate;
  const hasPersonB = includePersonB && personB;

  // Determine snapshot type label based on subject selection
  const snapshotTypeLabel = (() => {
    if (snapshotSubject === 'BOTH' && hasPersonB) {
      return 'Synastry Transit Snapshot';
    }
    if (snapshotSubject === 'B' && hasPersonB) {
      return `${personB?.name || 'Person B'} Solo Snapshot`;
    }
    if (reportType === 'balance') {
      return 'Balance Meter Snapshot';
    }
    return `${personA?.name || 'Person A'} Solo Snapshot`;
  })();

  const handleSnapshot = async (useCustomDateTime: boolean = false) => {
    console.log('[SnapshotButton] Button clicked', { useCustomDateTime, snapshotSubject });
    
    // Check auth first
    if (!isAuthenticated) {
      console.log('[SnapshotButton] Not authenticated, triggering auth required');
      onAuthRequired();
      return;
    }

    // Check if transits are enabled
    if (!includeTransits) {
      console.log('[SnapshotButton] Transits not enabled, aborting');
      return;
    }

    // Determine the timestamp to use
    let snapshotTimestamp: Date;
    if (useCustomDateTime) {
      const [hours, minutes] = customTime.split(':').map(Number);
      snapshotTimestamp = new Date(customDate);
      snapshotTimestamp.setHours(hours, minutes, 0, 0);
    } else {
      snapshotTimestamp = new Date();
    }

    const dateStr = snapshotTimestamp.toISOString().slice(0, 10);
    console.log('[SnapshotButton] Setting date to:', dateStr);
    onDateChange(dateStr);

    // Get location
    console.log('[SnapshotButton] Requesting location...');
    const location = await geolocation.getCurrentLocation();
    if (!location) {
      console.error('[SnapshotButton] Failed to get location');
      return;
    }
    console.log('[SnapshotButton] Location obtained:', location);

    // Determine which person(s) to include based on selection
    let effectivePersonA = personA;
    let effectivePersonB: any = undefined;
    let effectiveMode = mode;

    if (snapshotSubject === 'B' && hasPersonB) {
      // Solo snapshot for Person B - swap them
      effectivePersonA = personB;
      effectivePersonB = undefined;
      effectiveMode = 'NATAL_TRANSITS';
    } else if (snapshotSubject === 'BOTH' && hasPersonB) {
      // Synastry transits - include both
      effectivePersonB = personB;
      effectiveMode = 'SYNASTRY_TRANSITS';
    } else {
      // Solo snapshot for Person A
      effectivePersonB = undefined;
      effectiveMode = 'NATAL_TRANSITS';
    }

    console.log('[SnapshotButton] Calling captureSnapshot...', { 
      snapshotSubject, 
      effectiveMode, 
      effectivePersonA: effectivePersonA?.name,
      effectivePersonB: effectivePersonB?.name,
      snapshotTimestamp: snapshotTimestamp.toISOString()
    });

    const snapshotResult = await snapshot.captureSnapshot(
      location,
      effectivePersonA,
      effectivePersonB,
      effectiveMode,
      snapshotTimestamp
    );

    console.log('[SnapshotButton] Snapshot result:', snapshotResult);
    if (snapshotResult) {
      console.log('[SnapshotButton] Calling onSnapshot callback');
      setShowLocationInfo(true);
      setShowCustomDateTime(false);
      onSnapshot(snapshotResult.result, snapshotResult.location, snapshotResult.timestamp);
    } else {
      console.error('[SnapshotButton] No result or timestamp after snapshot');
    }
  };

  const isLoading = geolocation.loading || snapshot.loading;
  const hasError = geolocation.error || snapshot.error;

  // Get person names for display
  const personAName = personA?.name || 'Person A';
  const personBName = personB?.name || 'Person B';

  return (
    <div className="flex flex-col gap-3">
      {/* Snapshot Type Badge */}
      <div className="inline-flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-600 bg-purple-700/20 px-2 py-0.5 text-purple-300">
          <span>✨</span>
          <span>{snapshotTypeLabel}</span>
        </span>
      </div>

      {/* Subject Selection (only when Person B is available) */}
      {hasPersonB && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">Snapshot for:</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSnapshotSubject('A')}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                snapshotSubject === 'A'
                  ? 'border-purple-500 bg-purple-600/30 text-purple-200'
                  : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500'
              }`}
            >
              {personAName} only
            </button>
            <button
              type="button"
              onClick={() => setSnapshotSubject('B')}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                snapshotSubject === 'B'
                  ? 'border-purple-500 bg-purple-600/30 text-purple-200'
                  : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500'
              }`}
            >
              {personBName} only
            </button>
            <button
              type="button"
              onClick={() => setSnapshotSubject('BOTH')}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                snapshotSubject === 'BOTH'
                  ? 'border-indigo-500 bg-indigo-600/30 text-indigo-200'
                  : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500'
              }`}
            >
              Both (Synastry)
            </button>
          </div>
        </div>
      )}

      {/* Main Buttons Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Snapshot NOW button */}
        <button
          type="button"
          onClick={() => handleSnapshot(false)}
          disabled={disabled || isLoading || !includeTransits}
          className="inline-flex items-center gap-2 rounded-md border border-purple-600 bg-purple-700/30 px-3 py-1.5 text-sm text-white hover:bg-purple-700/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={
            !isAuthenticated
              ? "Sign in with Google to use Snapshot"
              : !includeTransits
              ? "Enable transits to use Symbolic Moment snapshot"
              : "Capture this symbolic moment RIGHT NOW at your current location"
          }
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Loading...</span>
            </>
          ) : (
            <>
              <span>⭐</span>
              <span>Snapshot NOW</span>
            </>
          )}
        </button>

        {/* Toggle custom date/time */}
        <button
          type="button"
          onClick={() => setShowCustomDateTime(!showCustomDateTime)}
          disabled={disabled || isLoading || !includeTransits}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            showCustomDateTime
              ? 'border-indigo-500 bg-indigo-600/30 text-indigo-200'
              : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500'
          }`}
          title="Choose a specific date and time"
        >
          <span>🕐</span>
          <span>Custom Time</span>
        </button>

        {snapshot.location && showLocationInfo && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>📍 {formatCoordinates(snapshot.location.latitude, snapshot.location.longitude)}</span>
            <button
              type="button"
              onClick={() => {
                snapshot.clearSnapshot();
                setShowLocationInfo(false);
              }}
              className="text-purple-400 hover:text-purple-300 transition-colors"
              title="Clear snapshot"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Custom Date/Time Picker (collapsible) */}
      {showCustomDateTime && (
        <div className="rounded-lg border border-indigo-700/50 bg-indigo-900/20 p-3 space-y-3">
          <p className="text-xs text-indigo-300">
            📅 Choose a specific moment to snapshot:
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Date</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Time</label>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleSnapshot(true)}
                disabled={disabled || isLoading || !includeTransits}
                className="inline-flex items-center gap-2 rounded-md border border-indigo-500 bg-indigo-600/30 px-3 py-1.5 text-sm text-indigo-100 hover:bg-indigo-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <span>📸</span>
                    <span>Capture This Moment</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            ℹ️ The chart will still use your <strong>current location</strong>. Only the date/time changes.
          </p>
        </div>
      )}

      {/* Error Messages */}
      {hasError && (
        <p className="text-xs text-amber-400">
          ⚠️ {geolocation.error || snapshot.error}
        </p>
      )}

      {!isAuthenticated && (
        <p className="text-xs text-slate-400">
          💡 Sign in with Google to capture symbolic moment snapshots
        </p>
      )}

      {!includeTransits && (
        <p className="text-xs text-amber-400">
          ⚠️ Transits must be enabled to capture a Symbolic Moment snapshot. Toggle "Include Transits" above.
        </p>
      )}

      {/* Info Messages */}
      {includeTransits && snapshotSubject === 'BOTH' && hasPersonB && (
        <p className="text-xs text-indigo-300">
          ℹ️ Synastry snapshot: Shows how {personAName} and {personBName}'s charts interact at the selected moment, both relocated to your location.
        </p>
      )}
    </div>
  );
}
