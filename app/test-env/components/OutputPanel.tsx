"use client";

import { useState } from "react";

interface OutputPanelProps {
  raw: string;
  title?: string;
  subtitle?: string;
}

export default function OutputPanel({ raw, title = "Payload", subtitle }: OutputPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-slate-200">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="rounded-md border border-slate-600 px-3 py-1 text-xs font-medium text-slate-200 hover:border-indigo-400 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
      {expanded && (
        <pre className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs leading-relaxed text-slate-200">
          {raw}
        </pre>
      )}
    </section>
  );
}
