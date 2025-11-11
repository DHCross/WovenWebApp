"use client";

import { ReactNode, useState } from "react";

interface TooltipProps {
  label: string;
  content: ReactNode;
}

export default function Tooltip({ label, content }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span className="cursor-help text-xs font-medium text-indigo-300 underline decoration-dotted decoration-indigo-400">
        {label}
      </span>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-md border border-indigo-500/40 bg-slate-950/95 p-3 shadow-lg">
          {content}
        </div>
      )}
    </div>
  );
}
