"use client";

import React from 'react';

interface StatusBannersProps {
  statusMessage: string | null;
  errorMessage: string | null;
}

export default function StatusBanners({
  statusMessage,
  errorMessage,
}: StatusBannersProps) {
  return (
    <>
      {statusMessage && (
        <div className="border-b border-emerald-500/30 bg-emerald-500/10 text-center text-sm text-emerald-200">
          <div className="mx-auto max-w-5xl px-6 py-3">{statusMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="border-b border-rose-500/40 bg-rose-500/10 text-center text-sm text-rose-200">
          <div className="mx-auto max-w-5xl px-6 py-3">{errorMessage}</div>
        </div>
      )}
    </>
  );
}
