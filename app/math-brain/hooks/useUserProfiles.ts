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
  notes?: string;
}

interface UseUserProfilesResult {
  profiles: BirthProfile[];
  loading: boolean;
  error: string | null;
  saveProfile: (profile: BirthProfile) => Promise<boolean>;
  deleteProfile: (profileId: string) => Promise<boolean>;
  loadProfiles: () => Promise<void>;
  updateProfile: (profileId: string, updates: Partial<BirthProfile>) => Promise<boolean>;
}

export function useUserProfiles(userId: string | null): UseUserProfilesResult {
  const [profiles, setProfiles] = useState<BirthProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    if (!userId) {
      setProfiles([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
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
    } catch (err: any) {
      console.error('[useUserProfiles] Load failed:', err);
      setError(err.message || 'Failed to load profiles');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveProfile = useCallback(async (profile: BirthProfile): Promise<boolean> => {
    if (!userId) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if profile already exists
      const existingIndex = profiles.findIndex(p => p.id === profile.id);
      let updatedProfiles: BirthProfile[];

      if (existingIndex >= 0) {
        // Update existing
        updatedProfiles = [...profiles];
        updatedProfiles[existingIndex] = profile;
      } else {
        // Add new
        updatedProfiles = [...profiles, profile];
      }

      const res = await fetch('/api/user-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          profiles: updatedProfiles
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save profile');
      }

      setProfiles(updatedProfiles);
      return true;
    } catch (err: any) {
      console.error('[useUserProfiles] Save failed:', err);
      setError(err.message || 'Failed to save profile');
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, profiles]);

  const deleteProfile = useCallback(async (profileId: string): Promise<boolean> => {
    if (!userId) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/user-profiles?userId=${encodeURIComponent(userId)}&profileId=${encodeURIComponent(profileId)}`,
        { method: 'DELETE' }
      );

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete profile');
      }

      setProfiles(prev => prev.filter(p => p.id !== profileId));
      return true;
    } catch (err: any) {
      console.error('[useUserProfiles] Delete failed:', err);
      setError(err.message || 'Failed to delete profile');
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateProfile = useCallback(async (profileId: string, updates: Partial<BirthProfile>): Promise<boolean> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      setError('Profile not found');
      return false;
    }

    const updatedProfile = { ...profile, ...updates };
    return await saveProfile(updatedProfile);
  }, [profiles, saveProfile]);

  // Load profiles when userId changes
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
