"use client";

import React, { useRef } from 'react';
import { INPUT_PLACEHOLDER } from '../../lib/ui-strings';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  typing: boolean;
  onSend: () => void;
  onUploadMirror: () => void;
  onUploadWeather: () => void;
  onStop: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export default function ChatInput({
  input,
  onInputChange,
  typing,
  onSend,
  onUploadMirror,
  onUploadWeather,
  onStop,
  fileInputRef,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    onSend();
  };

  return (
    <footer className="border-t border-slate-800/70 bg-slate-950/80">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-6"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={INPUT_PLACEHOLDER}
          rows={3}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.ctrlKey &&
              !event.altKey &&
              !event.metaKey
            ) {
              event.preventDefault();
              onSend();
            }
          }}
          className="w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-400 focus:ring-0"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="rounded-lg border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
            <button
              type="button"
              onClick={onUploadMirror}
              className="rounded-lg border border-slate-600/60 bg-slate-800/70 px-3 py-2 text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            >
              🪞 Mirror
            </button>
            <button
              type="button"
              onClick={onUploadWeather}
              className="rounded-lg border border-slate-600/60 bg-slate-800/70 px-3 py-2 text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            >
              🌡️ Weather
            </button>
            {typing && (
              <button
                type="button"
                onClick={onStop}
                className="rounded-lg border border-slate-600/60 bg-slate-900/70 px-3 py-2 text-slate-200 transition hover:bg-slate-800"
              >
                Stop
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500">
            Upload Math Brain exports, Mirror JSON, or AstroSeek charts to give Raven geometry.
          </div>
        </div>
      </form>
    </footer>
  );
}
