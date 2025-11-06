"use client";

import React from 'react';
import type { ReportContext } from './types';

interface ReportContextsBannerProps {
  reportContexts: ReportContext[];
  onRemoveReportContext: (contextId: string) => void;
}

export default function ReportContextsBanner({
  reportContexts,
  onRemoveReportContext,
}: ReportContextsBannerProps) {
  if (reportContexts.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-slate-800/60 bg-slate-950/70">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-6 py-3 text-xs">
        {reportContexts.map((ctx) => (
          <span
            key={ctx.id}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-slate-100"
          >
            <span>{ctx.type === "mirror" ? "🪞" : "🌡️"}</span>
            <span className="truncate font-medium">{ctx.name}</span>
            {ctx.summary && (
              <span className="hidden text-slate-400 sm:inline">
                · {ctx.summary}
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemoveReportContext(ctx.id)}
              className="text-slate-400 hover:text-slate-200"
              aria-label={`Remove ${ctx.name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
