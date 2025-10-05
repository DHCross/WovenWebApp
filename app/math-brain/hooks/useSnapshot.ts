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

      // Determine if this is relational (has Person B)
      const isRelational = personB && Object.keys(personB).length > 0;

      // Build payload matching the format page.tsx uses
      const payload: any = {
        mode,
        personA: {
          ...personA,
          nation: "US", // Required for API compatibility
          year: Number(personA.year),
          month: Number(personA.month),
          day: Number(personA.day),
          hour: Number(personA.hour),
          minute: Number(personA.minute),
          latitude: location.latitude,
          longitude: location.longitude,
          timezone,
        },
        // Transit window
        window: { start: todayStr, end: todayStr, step: 'daily' },
        transits: { from: todayStr, to: todayStr, step: 'daily' },
        transitStartDate: todayStr,
        transitEndDate: todayStr,
        transitStep: 'daily',
        // Report type (Balance Meter for snapshots)
        report_type: isRelational ? 'relational_balance_meter' : 'solo_balance_meter',
        // Context
        context: {
          mode: isRelational ? 'synastry_transits' : 'natal_transits',
        },
        // Relocation for current location
        relocation_mode: isRelational ? 'BOTH_LOCAL' : 'A_LOCAL',
        translocation: {
          applies: true,
          method: isRelational ? 'BOTH_LOCAL' : 'A_LOCAL',
          current_location: {
            latitude: location.latitude,
            longitude: location.longitude,
            timezone,
          },
        },
        // Balance Meter specific fields
        indices: {
          window: { start: todayStr, end: todayStr, step: 'daily' },
          request_daily: true
        },
        frontstage_policy: {
          autogenerate: true,
          allow_symbolic_weather: true
        },
        presentation_style: 'conversational',
      };

      // Add Person B if provided
      if (isRelational) {
        payload.personB = {
          ...personB,
          nation: "US",
          year: Number(personB.year),
          month: Number(personB.month),
          day: Number(personB.day),
          hour: Number(personB.hour),
          minute: Number(personB.minute),
          latitude: location.latitude,
          longitude: location.longitude,
          timezone,
        };
      }

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
