"use client";
import React from 'react';

// Global error boundary for App Router
// Prevents fallback to Pages-era 500 pages during prerender.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-xl">
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-slate-500 mb-4">
          An error occurred while rendering this page.
          {error?.digest ? ` (digest: ${error.digest})` : ''}
        </p>
        <button
          onClick={() => reset()}
          className="bg-sky-500 text-white px-3 py-2 rounded"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
