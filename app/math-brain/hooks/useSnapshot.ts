/* eslint-disable no-console */

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
  ): Promise<{ result: any; timestamp: Date; location: SnapshotLocation } | null> => {
    console.log('[Snapshot] Starting capture...', { location, personA, personB, mode });
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const timezone = getCurrentTimezone();
      console.log('[Snapshot] Building payload...', { todayStr, timezone });

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
        // Context (use 'balance_meter' mode for snapshots)
        context: {
          mode: 'balance_meter',
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
        // Chart wheel generation
        wheel_format: 'png',
        theme: 'classic',
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

        // Required: relationship_context for synastry/relational modes
        payload.relationship_context = {
          type: 'PARTNER',        // Default to PARTNER for snapshots
          intimacy_tier: 'P2',    // Friends-with-benefits tier (default for snapshots)
          contact_state: 'ACTIVE'
        };
      }

      console.log('[Snapshot] Sending API request...', { endpoint: '/api/astrology-mathbrain', payload });
      
      const response = await fetch('/api/astrology-mathbrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('[Snapshot] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Snapshot] API error:', response.status, errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[Snapshot] API success, result keys:', Object.keys(result || {}));
      console.log('[Snapshot] API result sample:', {
        statusCode: result?.statusCode,
        error: result?.error,
        hasBody: Boolean(result?.body),
        hasDays: Boolean(result?.days),
        hasReport: Boolean(result?.report)
      });

      // Check if API returned an error in the body (some APIs return 200 with error payload)
      if (result?.error || result?.statusCode >= 400) {
        const errorMsg = result?.error || 'API returned error status in response body';
        console.error('[Snapshot] API returned error:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[Snapshot] Setting state with result');
      setState({
        result,
        location,
        timestamp: now,
        loading: false,
        error: null,
      });

      console.log('[Snapshot] Capture complete!');
      return {
        result,
        timestamp: now,
        location,
      };
    } catch (err) {
      console.error('[Snapshot] Capture failed:', err);
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
