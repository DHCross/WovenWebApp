"use client";

import { useState } from "react";

type DownloadButtonProps = {
  payload: string;
  filename: string;
  className?: string;
};

export default function DownloadButton({ payload, filename, className }: DownloadButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy payload", error);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center justify-center rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center rounded-md border border-indigo-400 px-3 py-2 text-xs font-medium text-indigo-200 transition hover:border-indigo-300 hover:text-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          {copied ? "Copied" : "Copy to clipboard"}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        File includes generated timestamp and provenance. Replace geometry/aspect blocks before exporting.
      </p>
    </div>
  );
}
