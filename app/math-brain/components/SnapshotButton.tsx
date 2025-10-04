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
  onSnapshot: (result: any, location: any, timestamp: Date) => void;
  onAuthRequired: () => void;
}

export default function SnapshotButton({
  personA,
  personB,
  mode,
  isAuthenticated,
  disabled,
  onSnapshot,
  onAuthRequired,
}: SnapshotButtonProps) {
  const geolocation = useGeolocation();
  const snapshot = useSnapshot();
  const [showLocationInfo, setShowLocationInfo] = useState(false);

  const handleSnapshot = async () => {
    // Check auth first
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    // Get location
    const location = await geolocation.getCurrentLocation();
    if (!location) {
      return; // Error already shown in geolocation state
    }

    // Capture snapshot
    const result = await snapshot.captureSnapshot(
      location,
      personA,
      personB,
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSnapshot}
          disabled={disabled || isLoading}
          className="inline-flex items-center gap-2 rounded-md border border-purple-600 bg-purple-700/30 px-3 py-1.5 text-sm text-white hover:bg-purple-700/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={isAuthenticated ? "Capture this moment with relocated transits" : "Sign in with Google to use Snapshot"}
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Loading...</span>
            </>
          ) : (
            <>
              <span>📸</span>
              <span>Snapshot This Moment</span>
            </>
          )}
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

      {hasError && (
        <p className="text-xs text-amber-400">
          ⚠️ {geolocation.error || snapshot.error}
        </p>
      )}

      {!isAuthenticated && (
        <p className="text-xs text-slate-400">
          💡 Sign in with Google to capture live snapshots
        </p>
      )}
    </div>
  );
}
