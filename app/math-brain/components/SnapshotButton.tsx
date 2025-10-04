'use client';

import { useState } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSnapshot } from '../hooks/useSnapshot';
import { formatCoordinates } from '../utils/snapshot';

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
  onSnapshot,
  onAuthRequired,
  onDateChange,
}: SnapshotButtonProps) {
  const geolocation = useGeolocation();
  const snapshot = useSnapshot();
  const [showLocationInfo, setShowLocationInfo] = useState(false);

  const isMultiDay = startDate !== endDate;
  const hasPersonB = includePersonB && personB;
  const snapshotTypeLabel = hasPersonB ? 'Relational Mirror Snapshot' : 'Solo Mirror Snapshot';

  const handleSnapshot = async () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    if (!includeTransits) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    onDateChange(today);

    const location = await geolocation.getCurrentLocation();
    if (!location) {
      return;
    }

    const result = await snapshot.captureSnapshot(
      location,
      personA,
      hasPersonB ? personB : undefined,
      mode
    );

    if (result && snapshot.timestamp) {
      setShowLocationInfo(true);
      onSnapshot(result, location, snapshot.timestamp);
    }
  };

  const isLoading = geolocation.loading || snapshot.loading;
  const hasError = geolocation.error || snapshot.error;

  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-600 bg-purple-700/20 px-2 py-0.5 text-purple-300">
          <span>✨</span>
          <span>{snapshotTypeLabel}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSnapshot}
          disabled={disabled || isLoading || !includeTransits}
          className="inline-flex items-center gap-2 rounded-md border border-purple-600 bg-purple-700/30 px-3 py-1.5 text-sm text-white hover:bg-purple-700/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={
            !isAuthenticated
              ? 'Sign in with Google to use Snapshot'
              : !includeTransits
              ? 'Enable transits to use Symbolic Moment snapshot'
              : hasPersonB
              ? 'Capture this symbolic moment for both Person A and Person B at current location'
              : 'Capture this symbolic moment with relocated transits for Person A'
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
              <span>Snapshot this Symbolic Moment</span>
            </>
          )}
        </button>

        {snapshot.location && showLocationInfo && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              📍 {formatCoordinates(snapshot.location.latitude, snapshot.location.longitude)}
            </span>
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

      {hasError && (
        <p className="text-xs text-amber-400">⚠️ {geolocation.error || snapshot.error}</p>
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

      {includeTransits && isMultiDay && (
        <p className="text-xs text-purple-300">
          ℹ️ Clicking snapshot will set date to TODAY and capture the current moment.
        </p>
      )}

      {includeTransits && hasPersonB && (
        <p className="text-xs text-purple-300">
          ℹ️ Both Person A and Person B will be relocated to your current location.
        </p>
      )}
    </div>
  );
}
