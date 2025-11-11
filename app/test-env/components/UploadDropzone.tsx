"use client";

import { useCallback, useRef } from 'react';

interface UploadDropzoneProps {
  onFiles: (files: FileList | null) => void;
  isLoading: boolean;
}

export default function UploadDropzone({ onFiles, isLoading }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFiles(event.target.files);
    },
    [onFiles],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        onFiles(event.dataTransfer.files);
      }
    },
    [onFiles],
  );

  const handleBrowseClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className="relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-8 py-12 text-center transition hover:border-indigo-400 hover:bg-slate-950/60"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xl text-indigo-300 shadow-inner shadow-indigo-900/40">
        📂
      </div>
      <div>
        <p className="text-sm font-medium text-slate-100">Upload &amp; Validate Report</p>
        <p className="mt-1 text-xs text-slate-400">
          Drag in Math Brain JSON exports or click to browse. Mirror Directive, Symbolic Weather, Field Map, and Integration Loop bundles are supported.
        </p>
      </div>
      <button
        type="button"
        onClick={handleBrowseClick}
        className="mt-3 inline-flex items-center justify-center rounded-md border border-indigo-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-200 transition hover:border-indigo-400 hover:text-indigo-100"
        disabled={isLoading}
      >
        {isLoading ? 'Processing…' : 'Select JSON files'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        multiple
        className="sr-only"
        onChange={handleInputChange}
      />
    </div>
  );
}
