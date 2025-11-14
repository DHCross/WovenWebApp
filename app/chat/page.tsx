'use client';

import React from 'react';
// import AuthStatusPill from '../../components/dev/AuthStatusPill';
import ChatClient from '../../components/ChatClient';
import RequireAuth from '../../components/RequireAuth';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const ErrorBoundary = require('../../components/ErrorBoundary').default;
  const poeticBrainEnabled = (() => {
    const raw = process.env.NEXT_PUBLIC_ENABLE_POETIC_BRAIN;
        if (typeof raw !== 'string') return true;
    const normalized = raw.trim().toLowerCase();
    if (normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
    return false;
  })();
  return (
    <ErrorBoundary>
      <RequireAuth>
        {poeticBrainEnabled ? <ChatClient /> : <OfflineNotice />}
      </RequireAuth>
    </ErrorBoundary>
  );
}

// function DevAuthStatus() {
//   if (process.env.NODE_ENV === 'production') return null;
//   return <AuthStatusPill />;
// }

function OfflineNotice() {
  return (
    <div className="mx-auto mt-12 max-w-2xl rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
      <h1 className="text-2xl font-semibold text-slate-100">Poetic Brain Unavailable</h1>
      <p className="mt-3 text-sm text-slate-300">
        Raven's chat interface is temporarily offline while we work through the Auth0/Perplexity integration. Math Brain
        reports and the rest of the site remain fully available. Check back soon for the full FIELD → MAP → VOICE handoff.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700"
      >
        Return to Home
      </a>
    </div>
  );
}
