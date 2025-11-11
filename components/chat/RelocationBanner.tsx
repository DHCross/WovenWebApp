"use client";

import React from 'react';
import type { RelocationSummary } from '../../lib/relocation';

interface RelocationBannerProps {
  relocation: RelocationSummary | null;
}

export default function RelocationBanner({ relocation }: RelocationBannerProps) {
  if (!relocation) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800/50">
        <h1 className="text-xl font-semibold">Poetic Brain</h1>
        <a
          href="/math-brain"
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center transition-colors"
          title="Return to Math Brain"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Math Brain
        </a>
      </div>
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="mb-6 max-w-lg text-gray-300">
          Welcome to the Poetic Brain. I'm here to help you explore the deeper meanings and patterns in your astrological data.
        </p>
        {relocation.label && <span className="text-slate-400">• {relocation.label}</span>}
        {relocation.status && <span className="text-slate-400">• {relocation.status}</span>}
        {relocation.disclosure && (
          <span className="text-slate-500">• {relocation.disclosure}</span>
        )}
      </div>
    </div>
  );
}
