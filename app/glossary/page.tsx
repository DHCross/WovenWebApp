'use client';

import React from 'react';
import Link from 'next/link';
import Glossary from '../../components/Glossary';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function GlossaryPage() {
  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-2xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-slate-100">Glossary</h1>
          <Link href="/chat" className="text-sm text-slate-300 hover:text-slate-100">
            &larr; Back to Chat
          </Link>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8">
          <Glossary />
        </div>
      </div>
    </ErrorBoundary>
  );
}
