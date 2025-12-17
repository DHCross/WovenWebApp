import { useState, useEffect, useCallback } from 'react';

export interface BirthProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthState?: string;
  birthCountry?: string;
  timezone?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  relationship_type?: 'PARTNER' | 'FAMILY' | 'FRIEND';
  intimacy_tier?: string;
  relationship_role?: string;
  notes?: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
}

interface UseUserProfilesResult {
  profiles: BirthProfile[];
  loading: boolean;
  error: string | null;
  saveProfile: (profile: BirthProfile) => Promise<SaveResult>;
  deleteProfile: (profileId: string) => Promise<SaveResult>;
  loadProfiles: () => Promise<void>;
  updateProfile: (profileId: string, updates: Partial<BirthProfile>) => Promise<SaveResult>;
}

export function useUserProfiles(userId: string | null): UseUserProfilesResult {
  const [profiles, setProfiles] = useState<BirthProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const LOCAL_STORAGE_KEY = 'woven_user_profiles';

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (userId) {
        // Authenticated: Load from API
        const res = await fetch(`/api/user-profiles?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load profiles');
        }

        const normalized = (data.profiles || []).map((profile: BirthProfile) => {
          const lat = profile.lat ?? profile.latitude;
          const lng = profile.lng ?? profile.longitude;
          return {
            ...profile,
            lat: typeof lat === 'number' ? lat : lat != null ? Number(lat) : undefined,
            lng: typeof lng === 'number' ? lng : lng != null ? Number(lng) : undefined,
          } as BirthProfile;
        });
        setProfiles(normalized);
      } else {
        // Unauthenticated: Load from localStorage
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed)) {
              setProfiles(parsed);
            }
          } catch (e) {
            console.warn('Failed to parse local profiles', e);
          }
        }
      }
    } catch (err: any) {
      console.error('[useUserProfiles] Load failed:', err);
      setError(err.message || 'Failed to load profiles');
      if (!userId) {
        // Fallback to empty if local load fails
        setProfiles([]);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveProfile = useCallback(async (profile: BirthProfile): Promise<SaveResult> => {
    setLoading(true);
    setError(null);

    try {
      // Check if profile already exists (in current state)
      const existingIndex = profiles.findIndex(p => p.id === profile.id);

      // STRICT SANITIZATION
      const sanitizedProfile: BirthProfile = {
        id: profile.id,
        name: profile.name,
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        birthCity: profile.birthCity,
        birthState: profile.birthState,
        birthCountry: profile.birthCountry,
        timezone: profile.timezone,
        lat: profile.lat,
        lng: profile.lng,
        latitude: profile.latitude,
        longitude: profile.longitude,
        relationship_type: profile.relationship_type,
        intimacy_tier: profile.intimacy_tier,
        relationship_role: profile.relationship_role,
        notes: profile.notes,
      };

      let updatedProfiles: BirthProfile[];
      if (existingIndex >= 0) {
        updatedProfiles = [...profiles];
        updatedProfiles[existingIndex] = sanitizedProfile;
      } else {
        updatedProfiles = [...profiles, sanitizedProfile];
      }

      if (userId) {
        // Authenticated: Save to API
        const res = await fetch('/api/user-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            profiles: updatedProfiles
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
      } else {
        // Unauthenticated: Save to localStorage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProfiles));
      }

      setProfiles(updatedProfiles);
      return { success: true };
    } catch (err: any) {
      console.error('[useUserProfiles] Save failed:', err);
      const errMsg = err.message || 'Failed to save profile';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, [userId, profiles]);

  const deleteProfile = useCallback(async (profileId: string): Promise<SaveResult> => {
    setLoading(true);
    setError(null);

    try {
      if (userId) {
        // Authenticated: Delete via API
        const res = await fetch(
          `/api/user-profiles?userId=${encodeURIComponent(userId)}&profileId=${encodeURIComponent(profileId)}`,
          { method: 'DELETE' }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setProfiles(prev => prev.filter(p => p.id !== profileId));
      } else {
        // Unauthenticated: Delete from localStorage
        const updatedProfiles = profiles.filter(p => p.id !== profileId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProfiles));
        setProfiles(updatedProfiles);
      }
      return { success: true };
    } catch (err: any) {
      console.error('[useUserProfiles] Delete failed:', err);
      const errMsg = err.message || 'Failed to delete profile';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, [userId, profiles]);

  const updateProfile = useCallback(async (profileId: string, updates: Partial<BirthProfile>): Promise<SaveResult> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      const err = 'Profile not found';
      setError(err);
      return { success: false, error: err };
    }
    const updatedProfile = { ...profile, ...updates };
    return await saveProfile(updatedProfile);
  }, [profiles, saveProfile]);

  // Initial load
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return {
    profiles,
    loading,
    error,
    saveProfile,
    deleteProfile,
    loadProfiles,
    updateProfile
  };
}
