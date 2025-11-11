"use client";

import React, { useMemo, useState } from "react";

export type PingResponse = "yes" | "no" | "maybe" | "unclear";
export type CheckpointType = "hook" | "vector" | "aspect" | "general" | "repair";

interface PingFeedbackProps {
  messageId: string;
  onFeedback: (messageId: string, response: PingResponse, note?: string) => void;
  disabled?: boolean;
  checkpointType?: CheckpointType;
}

type ResonanceOption = {
  id: PingResponse;
  label: string;
  caption: string;
  icon: string;
  accentClasses: string;
};

const RESONANCE_OPTIONS: ResonanceOption[] = [
  {
    id: "yes",
    label: "Strong Resonance",
    caption: "Lands clearly and feels vivid right now.",
    icon: "✅",
    accentClasses:
      "border-emerald-400/70 bg-emerald-500/10 text-emerald-200 shadow-[0_0_22px_rgba(16,185,129,0.25)]",
  },
  {
    id: "maybe",
    label: "Partial Resonance",
    caption: "Some of it fits; tone or timing feels slightly off.",
    icon: "⚪",
    accentClasses:
      "border-amber-400/70 bg-amber-500/10 text-amber-200 shadow-[0_0_22px_rgba(245,158,11,0.25)]",
  },
  {
    id: "no",
    label: "No Resonance",
    caption: "Doesn’t connect with what’s happening right now.",
    icon: "❌",
    accentClasses:
      "border-slate-500/70 bg-slate-800/60 text-slate-200 shadow-[0_0_22px_rgba(148,163,184,0.25)]",
  },
];

const ACKNOWLEDGEMENTS: Record<PingResponse, string> = {
  yes: "Noted — this one resonated strongly.",
  maybe: "Logged as partial resonance. I’ll keep refining the mirror.",
  no: "Marked as no resonance. I’ll adjust course on the next pass.",
  unclear:
    "Logged as unclear resonance. I’ll restate it with plainer language and check again.",
};

const NOTE_PLACEHOLDER =
  "Optional: share what missed the mark so Raven can refine the repair.";

const PingFeedback: React.FC<PingFeedbackProps> = ({
  messageId,
  onFeedback,
  disabled = false,
  checkpointType = "general",
}) => {
  const [selectedResponse, setSelectedResponse] = useState<PingResponse | null>(null);
  const [note, setNote] = useState<string>("");
  const [noteTouched, setNoteTouched] = useState(false);

  const promptText = useMemo(() => {
    switch (checkpointType) {
      case "hook":
        return "How does this recognition land for you?";
      case "vector":
        return "Does this hidden push or counterweight echo your experience?";
      case "aspect":
        return "Does this high-voltage pattern resonate with what you feel?";
      case "repair":
        return "Does this repair feel true in your system?";
      default:
        return "How does this one land for you?";
    }
  }, [checkpointType]);

  const handleSelect = (response: PingResponse) => {
    if (disabled) return;
    setSelectedResponse(response);
    const noteValue = response === "no" ? note.trim() : undefined;
    onFeedback(messageId, response, noteValue);
    if (response !== "no") {
      setNote("");
      setNoteTouched(false);
    }
  };

  const handleNoteBlur = () => {
    setNoteTouched(true);
    if (selectedResponse === "no") {
      const trimmed = note.trim();
      onFeedback(messageId, "no", trimmed || undefined);
    }
  };

  if (disabled) {
    return (
      <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        Resonance recorded.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 shadow-inner shadow-black/20">
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">
        {promptText}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {RESONANCE_OPTIONS.map((option) => {
          const isActive = selectedResponse === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition duration-200 ${
                isActive
                  ? option.accentClasses
                  : "border-slate-700/60 bg-slate-950/40 text-slate-200 hover:border-slate-500/70 hover:bg-slate-900/60"
              }`}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold tracking-wide">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs text-slate-300">
                  {option.caption}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selectedResponse && (
        <div className="mt-4 space-y-3 text-sm text-slate-200">
          <p className="rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
            {ACKNOWLEDGEMENTS[selectedResponse]}
          </p>
          {selectedResponse === "no" && (
            <div>
              <label htmlFor={`resonance-note-${messageId}`} className="block text-xs uppercase tracking-[0.2em] text-slate-500">
                Want to add context?
              </label>
              <textarea
                id={`resonance-note-${messageId}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                onBlur={handleNoteBlur}
                rows={2}
                placeholder={NOTE_PLACEHOLDER}
                className="mt-2 w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
              />
              {noteTouched && !note.trim() && (
                <p className="mt-1 text-xs text-slate-500">
                  Skipping the note is fine — the resonance tag is already recorded.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        You can leave this reflection untagged if it felt more like a statement than a question.
      </p>
    </div>
  );
};

export default PingFeedback;
