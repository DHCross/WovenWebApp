"use client";

import React, { useMemo, useState } from 'react';
import { BirthProfile } from '../hooks/useUserProfiles';

interface ProfileManagerProps {
  profiles: BirthProfile[];
  loading: boolean;
  onLoadProfile: (profile: BirthProfile, slot: 'A' | 'B') => void;
  onSaveCurrentProfile: (slot: 'A' | 'B', name: string) => void;
  onDeleteProfile: (profileId: string) => void;
  currentPersonA: any;
  currentPersonB: any;
  isAuthenticated: boolean;
}

export default function ProfileManager({
  profiles,
  loading,
  onLoadProfile,
  onSaveCurrentProfile,
  onDeleteProfile,
  currentPersonA,
  currentPersonB,
  isAuthenticated
}: ProfileManagerProps) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSlot, setSaveSlot] = useState<'A' | 'B'>('A');
  const [saveName, setSaveName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());
  const [showProfilesList, setShowProfilesList] = useState(true);

  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [profiles]
  );

  const toggleExpanded = (profileId: string) => {
    setExpandedProfiles(prev => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        <p className="mb-2">🔒 Sign in to save and manage birth profiles</p>
        <p className="text-xs text-slate-500">Your profiles will sync across all your devices</p>
      </div>
    );
  }

  const handleSaveClick = (slot: 'A' | 'B') => {
    setSaveSlot(slot);
    const person = slot === 'A' ? currentPersonA : currentPersonB;
    setSaveName(person?.name || '');
    setShowSaveModal(true);
  };

  const handleSaveConfirm = () => {
    if (saveName.trim()) {
      onSaveCurrentProfile(saveSlot, saveName.trim());
      setShowSaveModal(false);
      setSaveName('');
    }
  };

  const handleDeleteClick = (profileId: string) => {
    setShowDeleteConfirm(profileId);
  };

  const handleDeleteConfirm = () => {
    if (showDeleteConfirm) {
      onDeleteProfile(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Save Current Profiles */}
      <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 p-4">
        <h3 className="text-sm font-semibold text-emerald-200 mb-3">💾 Save Current Profiles</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleSaveClick('A')}
            disabled={
              loading ||
              !currentPersonA?.year ||
              !currentPersonA?.month ||
              !currentPersonA?.day
            }
            className="flex-1 rounded-md border border-emerald-600 bg-emerald-700/30 px-3 py-2 text-sm text-white hover:bg-emerald-700/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Save Person A
            {currentPersonA?.name && <span className="block text-xs text-emerald-300 mt-1">{currentPersonA.name}</span>}
          </button>
          <button
            onClick={() => handleSaveClick('B')}
            disabled={
              loading ||
              !currentPersonB?.year ||
              !currentPersonB?.month ||
              !currentPersonB?.day
            }
            className="flex-1 rounded-md border border-emerald-600 bg-emerald-700/30 px-3 py-2 text-sm text-white hover:bg-emerald-700/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Save Person B
            {currentPersonB?.name && <span className="block text-xs text-emerald-300 mt-1">{currentPersonB.name}</span>}
          </button>
        </div>
      </div>

      {/* Saved Profiles List */}
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-200">
            📚 Saved Profiles ({profiles.length})
          </h3>
          {profiles.length > 0 && (
            <button
              type="button"
              onClick={() => setShowProfilesList((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-expanded={showProfilesList}
              aria-label={showProfilesList ? 'Collapse saved profiles list' : 'Expand saved profiles list'}
            >
              <span>{showProfilesList ? 'Hide list' : 'Show list'}</span>
              <span className={`text-[10px] transition-transform ${showProfilesList ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>
          )}
        </div>

        {showProfilesList && (
          <>
            {loading && (
              <div className="text-sm text-slate-400 py-4 text-center">
                Loading profiles...
              </div>
            )}

            {!loading && profiles.length === 0 && (
              <div className="text-sm text-slate-400 py-4 text-center">
                No saved profiles yet. Save Person A or B above to get started!
              </div>
            )}

            {!loading && profiles.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sortedProfiles.map(profile => {
                  const isExpanded = expandedProfiles.has(profile.id);

                  return (
                    <div
                      key={profile.id}
                      className="rounded-md border border-slate-700 bg-slate-800/60 p-3 hover:bg-slate-800/80 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => toggleExpanded(profile.id)}
                          className="flex-1 min-w-0 text-left"
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${profile.name} details`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                            <span className="font-medium text-slate-100 truncate">{profile.name}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {profile.birthDate} {profile.birthTime && `• ${profile.birthTime}`}
                          </div>
                          {!isExpanded && (
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {profile.birthCity}{profile.birthState && `, ${profile.birthState}`}
                            </div>
                          )}
                        </button>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => onLoadProfile(profile, 'A')}
                            className="rounded px-2 py-1 text-xs bg-blue-700/30 text-blue-200 hover:bg-blue-700/40 border border-blue-600/50 transition"
                            title="Load as Person A"
                          >
                            → A
                          </button>
                          <button
                            onClick={() => onLoadProfile(profile, 'B')}
                            className="rounded px-2 py-1 text-xs bg-purple-700/30 text-purple-200 hover:bg-purple-700/40 border border-purple-600/50 transition"
                            title="Load as Person B"
                          >
                            → B
                          </button>
                          <button
                            onClick={() => handleDeleteClick(profile.id)}
                            className="rounded px-2 py-1 text-xs bg-rose-700/30 text-rose-200 hover:bg-rose-700/40 border border-rose-600/50 transition"
                            title="Delete profile"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 space-y-1 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Birthplace:</span>
                            <span className="truncate">
                              {profile.birthCity}
                              {profile.birthState && `, ${profile.birthState}`}
                              {profile.birthCountry && ` • ${profile.birthCountry}`}
                            </span>
                          </div>
                          {profile.timezone && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Timezone:</span>
                              <span className="truncate">{profile.timezone}</span>
                            </div>
                          )}
                          {(profile.lat != null || profile.lng != null) && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Lat / Long:</span>
                              <span className="truncate">
                                {profile.lat ?? profile.latitude} / {profile.lng ?? profile.longitude}
                              </span>
                            </div>
                          )}
                          {profile.notes && (
                            <div className="italic text-slate-500">{profile.notes}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">
              Save Person {saveSlot} Profile
            </h3>
            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-2">
                Profile Name
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g., Dan, Carrie, Mom..."
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveConfirm();
                  if (e.key === 'Escape') setShowSaveModal(false);
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSaveModal(false)}
                className="rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={!saveName.trim()}
                className="rounded-md border border-emerald-600 bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">
              Delete Profile?
            </h3>
            <p className="text-sm text-slate-300 mb-6">
              Are you sure you want to delete this profile? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="rounded-md border border-rose-600 bg-rose-700 px-4 py-2 text-sm text-white hover:bg-rose-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
