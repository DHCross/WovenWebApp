"use client";

import React from 'react';
import type { StoredMathBrainPayload } from './types';

interface StoredPayloadBannerProps {
  storedPayload: StoredMathBrainPayload | null;
  storedPayloadSummary: string;
  onApplyStoredPayload: (payload: StoredMathBrainPayload) => void;
  onDismissStoredPayload: (payload: StoredMathBrainPayload) => void;
}

export default function StoredPayloadBanner({
  storedPayload,
  storedPayloadSummary,
  onApplyStoredPayload,
  onDismissStoredPayload,
}: StoredPayloadBannerProps) {
  if (!storedPayload) {
    return null;
  }

  return (
    <div className="border-b border-emerald-500/30 bg-emerald-500/10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-200">
            Math Brain export is ready to hand off.
          </p>
          {storedPayloadSummary && (
            <p className="text-xs text-emerald-200/80">{storedPayloadSummary}</p>
          )}
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => onApplyStoredPayload(storedPayload)}
            className="rounded-md border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 font-medium text-emerald-100 hover:bg-emerald-500/30 transition"
          >
            Load now
          </button>
          <button
            type="button"
            onClick={() => onDismissStoredPayload(storedPayload)}
            className="rounded-md border border-transparent px-3 py-1 font-medium text-emerald-200 hover:text-emerald-100 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
