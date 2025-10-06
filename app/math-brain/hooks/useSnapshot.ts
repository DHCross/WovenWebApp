/* eslint-disable no-console */

import { useState, useCallback } from 'react';
import { getCurrentTimezone } from './useGeolocation';
import { formatCoordinates } from '../utils/snapshot';

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
      const locationLabel = formatCoordinates(location.latitude, location.longitude);
      console.log('[Snapshot] Building payload...', { todayStr, timezone, locationLabel });

      // Determine if this is relational (has Person B)
      const isRelational = personB && Object.keys(personB).length > 0;

      const ensureSubject = (subject: any, label: string) => {
        if (!subject) return subject;
        const fallbackCity = subject.city?.trim()
          || subject.birth_city?.trim()
          || 'Snapshot Location';
        const fallbackNation = subject.nation
          || subject.country
          || subject.country_code
          || subject.nation_code
          || 'US';
        const fallbackState = subject.state
          || subject.region
          || subject.province
          || subject.state_code
          || undefined;

        return {
          ...subject,
          name: subject.name || label,
          city: fallbackCity,
          state: fallbackState,
          nation: fallbackNation,
          year: Number(subject.year),
          month: Number(subject.month),
          day: Number(subject.day),
          hour: Number(subject.hour),
          minute: Number(subject.minute),
          latitude: location.latitude,
          longitude: location.longitude,
          timezone,
          zodiac_type: subject.zodiac_type || subject.zodiac || 'Tropic',
        };
      };

      const personALabel = personA?.name || 'Person A';
      const normalizedPersonA = ensureSubject(personA, personALabel);

      // Build payload matching the format page.tsx uses
      const payload: any = {
        mode: 'balance_meter', // Always use balance_meter for snapshots
        personA: normalizedPersonA,
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
            label: locationLabel,
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
        const personBLabel = personB?.name || 'Person B';
        payload.personB = ensureSubject(personB, personBLabel);

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
        let message = `API error: ${response.status} ${response.statusText}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed?.error) {
            message = parsed.error;
          } else if (parsed?.message) {
            message = parsed.message;
          }
        } catch {
          if (errorText?.trim()) {
            message = errorText;
          }
        }
        throw new Error(message);
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
      const locationWithLabel = {
        ...location,
        label: location.label || locationLabel,
      };

      setState({
        result,
        location: locationWithLabel,
        timestamp: now,
        loading: false,
        error: null,
      });

      console.log('[Snapshot] Capture complete!');
      return {
        result,
        timestamp: now,
        location: locationWithLabel,
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
