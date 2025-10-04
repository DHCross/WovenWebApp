import { useState, useCallback } from 'react';

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeolocationState {
  coords: GeolocationCoords | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    loading: false,
    error: null,
  });

  const getCurrentLocation = useCallback(async (): Promise<GeolocationCoords | null> => {
    if (!navigator.geolocation) {
      setState({ coords: null, loading: false, error: 'Geolocation not supported by browser' });
      return null;
    }

    setState({ coords: null, loading: true, error: null });

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setState({ coords, loading: false, error: null });
          resolve(coords);
        },
        (error) => {
          let errorMessage = 'Location access denied';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }

          setState({ coords: null, loading: false, error: errorMessage });
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  const clearLocation = useCallback(() => {
    setState({ coords: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    getCurrentLocation,
    clearLocation,
  };
}

export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
