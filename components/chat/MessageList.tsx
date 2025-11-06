"use client";

import React from 'react';
import MirrorResponseActions from '../MirrorResponseActions';
import GranularValidation from '../feedback/GranularValidation';
import { hasPendingValidations, getValidationStats, formatValidationSummary } from '@/lib/validation/validationUtils';
import type { ValidationPoint } from '@/lib/validation/types';
import { sanitizeHtml } from '../../lib/chatUtils';
import type { PingResponse } from '../PingFeedback';
import type { Message, ValidationMap } from './types';

interface MessageListProps {
  messages: Message[];
  typing: boolean;
  copiedMessageId: string | null;
  validationMap: ValidationMap;
  onCopyMessage: (messageId: string, text: string) => void;
  onPingFeedback: (messageId:string, response: PingResponse, note?: string) => void;
  onValidationUpdate: (messageId: string, points: ValidationPoint[]) => void;
  onValidationNoteChange: (messageId: string, pointId: string, note: string) => void;
  onStop: () => void;
}

export default function MessageList({
  messages,
  typing,
  copiedMessageId,
  validationMap,
  onCopyMessage,
  onPingFeedback,
  onValidationUpdate,
  onValidationNoteChange,
  onStop,
}: MessageListProps) {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        {messages.map((msg) => {
          const isRaven = msg.role === "raven";
          const showCopyButton = isRaven && Boolean(msg.rawText && msg.rawText.trim());
          const validationPoints =
            validationMap[msg.id] ??
            msg.validationPoints ??
            [];
          const hasValidation = validationPoints.length > 0;
          const validationPending = hasValidation && hasPendingValidations(validationPoints);
          const validationStats = hasValidation ? getValidationStats(validationPoints) : null;
          const validationSummaryText = hasValidation
            ? validationPending
              ? `Resonance check in progress: ${validationStats?.completed ?? 0} of ${
                  validationStats?.total ?? validationPoints.length
                } reflections tagged.`
              : formatValidationSummary(validationPoints)
            : null;

          return (
            <div
              key={msg.id}
              className={`flex ${isRaven ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-full rounded-2xl border px-5 py-4 shadow-lg transition ${
                  isRaven
                    ? "bg-slate-900/70 border-slate-800/70 text-slate-100"
                    : "bg-slate-800/80 border-slate-700/60 text-slate-100"
                }`}
                style={{ width: "100%" }}
              >
                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span className="font-semibold text-slate-200">
                    {isRaven ? "Raven" : "You"}
                  </span>
                  {msg.climate && <span className="text-slate-400/80">{msg.climate}</span>}
                  {msg.hook && <span className="text-slate-400/60">{msg.hook}</span>}
                </div>
                <div className={showCopyButton ? "flex items-start gap-3" : undefined}>
                  <div
                    className={`${showCopyButton ? "flex-1" : ""} space-y-3 text-[15px] leading-relaxed text-slate-100`}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.html) }}
                  />
                  {showCopyButton && (
                    <button
                      type="button"
                      onClick={() => onCopyMessage(msg.id, msg.rawText ?? "")}
                      className="shrink-0 rounded-md border border-slate-700/60 bg-slate-800/70 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                    >
                      {copiedMessageId === msg.id ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                {isRaven && msg.probe && !msg.pingFeedbackRecorded && (
                  <div className="mt-4">
                    <MirrorResponseActions
                      messageId={msg.id}
                      onFeedback={onPingFeedback}
                      checkpointType={"general"}
                    />
                  </div>
                )}
                {isRaven && hasValidation && (
                  <div className="mt-4 space-y-3">
                    {validationSummaryText && (
                      <p
                        className={`rounded-md border px-3 py-2 text-xs ${
                          validationPending
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                        }`}
                      >
                        {validationSummaryText}
                      </p>
                    )}
                    <GranularValidation
                      messageId={msg.id}
                      validationPoints={validationPoints}
                      onComplete={(points) => onValidationUpdate(msg.id, points)}
                      onNoteChange={(pointId, note) =>
                        onValidationNoteChange(msg.id, pointId, note)
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex justify-start">
            <div className="max-w-full rounded-2xl border border-slate-800/70 bg-slate-900/60 px-5 py-4 text-sm text-slate-300 shadow-lg">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                Raven
              </div>
              <div className="flex items-center gap-3">
                <span className="animate-pulse text-slate-300">Composing…</span>
                <button
                  type="button"
                  onClick={onStop}
                  className="rounded-md border border-slate-600/60 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 transition"
                >
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
