"use client";

import React from "react";

interface DailyClimateCardProps {
  date: string;
  location: string;
  mode: "single" | "relational";
  names?: [string, string];
  magnitude: number;
  magnitudeLabel: string;
  valence: number;
  valenceLabel: string;
  valenceIcon: string;
  volatility: number;
  volatilityLabel: string;
  magnitudeWB: string;
  magnitudeABE: string;
  valenceWB: string;
  valenceABE: string;
  sfd: number;
  sfdLabel: string;
  badge: string;
}

export default function DailyClimateCard({
  date,
  location,
  mode,
  names,
  magnitude,
  magnitudeLabel,
  valence,
  valenceLabel,
  valenceIcon,
  volatility,
  volatilityLabel,
  magnitudeWB,
  magnitudeABE,
  valenceWB,
  valenceABE,
  sfd,
  sfdLabel,
  badge,
}: DailyClimateCardProps) {
  const formattedValence = `${valence > 0 ? "+" : ""}${valence.toFixed(2)}`;
  const formattedVolatility = volatility.toFixed(2);
  const formattedMagnitude = magnitude.toFixed(2);
  const formattedSfd = Number.isNaN(sfd) ? "—" : `${sfd > 0 ? "+" : ""}${sfd.toFixed(2)}`;

  const modeLabel =
    mode === "single"
      ? "One Person (Natal + Transits)"
      : `Two People (${names?.[0] ?? "Person A"} + ${names?.[1] ?? "Person B"}, Synastry + Transits)`;

  return (
    <section
      className="mb-6 rounded-lg border border-slate-600 bg-slate-800/60 p-6"
      role="region"
      aria-label="Daily symbolic climate"
    >
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5 text-xs text-slate-400">
          <div>{date}</div>
          <div>{location}</div>
          <div>{modeLabel}</div>
        </div>
        <div className="text-base font-semibold text-indigo-200" aria-live="polite">
          {badge}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div aria-label="Magnitude dial">
          <div className="text-xs text-slate-400">Magnitude</div>
          <div className="text-lg font-bold text-yellow-300">{formattedMagnitude}</div>
          <div className="text-xs text-slate-300">{magnitudeLabel}</div>
        </div>

        <div aria-label="Valence dial">
          <div className="text-xs text-slate-400">Valence</div>
          <div className="flex items-center gap-1 text-lg font-bold text-blue-300">
            <span aria-hidden="true">{valenceIcon}</span>
            <span>{formattedValence}</span>
          </div>
          <div className="text-xs text-slate-300">{valenceLabel}</div>
        </div>

        <div aria-label="Volatility dial">
          <div className="text-xs text-slate-400">Volatility</div>
          <div className="text-lg font-bold text-cyan-300">{formattedVolatility}</div>
          <div className="text-xs text-slate-300">{volatilityLabel}</div>
        </div>

        <div aria-label="Support–Friction Differential">
          <div className="text-xs text-slate-400">SFD</div>
          <div className="text-lg font-bold text-pink-300">{formattedSfd}</div>
          <div className="text-xs text-slate-300">{sfdLabel}</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-slate-400 mb-1">WB / ABE Forks</div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div>
            <div className="font-semibold text-yellow-200">Magnitude</div>
            <div className="text-xs text-emerald-200">WB: {magnitudeWB}</div>
            <div className="text-xs text-red-200">ABE: {magnitudeABE}</div>
          </div>
          <div>
            <div className="font-semibold text-blue-200">Valence</div>
            <div className="text-xs text-emerald-200">WB: {valenceWB}</div>
            <div className="text-xs text-red-200">ABE: {valenceABE}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-700 pt-3 text-xs text-slate-400">
        This card reflects Math Brain metrics only (no Poetic layer). Valence icons indicate position on the valence scale; all other dials are numeric and glossary-aligned.
      </div>
    </section>
  );
}
