import { useState, useCallback } from 'react';
import { getCurrentTimezone } from './useGeolocation';

export interface SnapshotLocation {
  latitude: number;
  longitude: number;
  city?: string;
  label?: string;
}

export interface SnapshotPayload {
  personA: any;
  personB?: any;
  relocation_mode: string;
  translocation: {
    applies: boolean;
    method: string;
    current_location: {
      latitude: number;
      longitude: number;
      timezone: string;
    };
  };
  start: string;
  end: string;
  step: string;
  mode: string;
}

export interface SnapshotState {
  result: any | null;
  location: SnapshotLocation | null;
  timestamp: Date | null;
  loading: boolean;
  error: string | null;
}

export function useSnapshot() {
  const [state, setState] = useState<SnapshotState>({
    result: null,
    location: null,
    timestamp: null,
    loading: false,
    error: null,
  });

  const captureSnapshot = useCallback(async (
    location: SnapshotLocation,
    personA: any,
    personB?: any,
    mode: string = 'NATAL_TRANSITS'
  ): Promise<any | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const timezone = getCurrentTimezone();

      const payload: SnapshotPayload = {
        personA: {
          ...personA,
          latitude: location.latitude,
          longitude: location.longitude,
          timezone,
        },
        personB,
        relocation_mode: 'A_LOCAL',
        translocation: {
          applies: true,
          method: 'A_LOCAL',
          current_location: {
            latitude: location.latitude,
            longitude: location.longitude,
            timezone,
          },
        },
        start: todayStr,
        end: todayStr,
        step: 'day',
        mode,
      };

      const response = await fetch('/api/astrology-mathbrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      setState({
        result,
        location,
        timestamp: now,
        loading: false,
        error: null,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Snapshot capture failed';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  const clearSnapshot = useCallback(() => {
    setState({
      result: null,
      location: null,
      timestamp: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    captureSnapshot,
    clearSnapshot,
  };
}
