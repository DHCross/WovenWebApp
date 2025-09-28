"use client";

import React from 'react';
import { SnapshotData, SnapshotTone } from '../lib/ui-types';

interface PoeticSnapshotCardProps {
  data: SnapshotData;
}

function ToneBar({ tone }: { tone: SnapshotTone }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">Magnitude:</span>
        <span className={`font-medium ${
          tone.magnitude === 'High' ? 'text-red-400' :
          tone.magnitude === 'Moderate' ? 'text-yellow-400' : 'text-green-400'
        }`}>
          {tone.magnitude}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400">Valence:</span>
        <span className={`font-medium ${
          tone.valence === 'Harmonious' ? 'text-green-400' :
          tone.valence === 'Tense' ? 'text-red-400' : 'text-yellow-400'
        }`}>
          {tone.valence}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400">Volatility:</span>
        <span className={`font-medium ${
          tone.volatility === 'Stable' ? 'text-green-400' :
          tone.volatility === 'Variable' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {tone.volatility}
        </span>
      </div>
    </div>
  );
}

function HeatBand({ heatband }: { heatband?: Array<{ day: string; intensity: "light" | "medium" | "dark" }> }) {
  if (!heatband || heatband.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1">
        {heatband.map((cell, i) => (
          <div
            key={i}
            className={`h-3 flex-1 rounded-sm ${
              cell.intensity === 'dark' ? 'bg-indigo-600' :
              cell.intensity === 'medium' ? 'bg-indigo-400' : 'bg-indigo-200'
            }`}
            title={`${cell.day}: ${cell.intensity} intensity`}
          />
        ))}
      </div>
      <div className="text-xs text-slate-500 mt-1">
        lighter = quieter, darker = louder
      </div>
    </div>
  );
}

export default function PoeticSnapshotCard({ data }: PoeticSnapshotCardProps) {
  const strongestAnchor = data.anchors[0]; // Assume sorted by strength
  const topHook = data.hooks[0]; // Assume sorted by intensity

  // Line A: Identity/Drive
  const lineA = strongestAnchor
    ? `Today leans toward **${strongestAnchor.name}**—use it to ${strongestAnchor.benefit}, watch for ${strongestAnchor.friction}.`
    : "Balanced foundation—no single drive dominates; focus on steady progress.";

  // Line B: House/Localization
  const lineB = `Most of the pull lands in **${data.topHouse.tag}**—themes of ${data.topHouse.keywords} want attention.`;

  // Line C: Timing/Hook
  const lineC = topHook
    ? `The loudest note is **${topHook.label}**—it crests, then eases; keep moves small.`
    : "No dominant activation—treat this as a calibration day.";

  // Truncate lines to 110 characters
  const truncate = (text: string, maxLength: number = 110) => {
    return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
  };

  const lensText = data.topHouse.relocated
    ? `Lens: ${data.auditFooter.lens}`
    : "Lens: Natal houses (no relocation).";

  return (
    <section
      role="region"
      aria-label="Snapshot"
      className="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-4"
    >
      {/* Header line (stamp) */}
      <div className="text-lg font-medium text-slate-100">
        {data.header.location} · {data.header.dateRange} · {data.header.type}
      </div>

      {/* Tone bar */}
      <ToneBar tone={data.tone} />

      {/* Heat band for multi-day */}
      <HeatBand heatband={data.heatband} />

      {/* Three-stanza snapshot */}
      <div className="space-y-3 text-sm leading-relaxed">
        <p className="text-slate-100">
          {truncate(lineA).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
        </p>
        <p className="text-slate-100">
          {truncate(lineB).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
        </p>
        <p className="text-slate-100">
          {truncate(lineC).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
        </p>
      </div>

      {/* Audit footer */}
      <div className="border-t border-slate-700 pt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>
            Source: Anchors({data.auditFooter.anchorsCount}), Hooks({data.auditFooter.hooksCount}), {lensText}
          </span>
          {data.auditFooter.peaks && (
            <span>· Peaks: {data.auditFooter.peaks}</span>
          )}
        </div>
        {data.hooks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.hooks.slice(0, 3).map((hook, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-1 rounded-md bg-slate-700 text-xs text-slate-300"
              >
                {hook.targetHouse} {data.topHouse.relocated ? '(relocated)' : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}