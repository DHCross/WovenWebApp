"use client";

import React from "react";
import { generateClimateNarrative } from "../../lib/climate-narrative";
import { ClimateData } from "../../lib/climate-renderer";

interface BalanceMeterSummaryProps {
  dateRange: { start: string; end: string };
  location: string;
  mode: "single" | "relational";
  names?: [string, string];
  overallClimate: ClimateData;
  overallSfd: number;
  totalDays: number;
  activatedHouses?: string[];
  isLatentField?: boolean; // NEW: indicates ex/estranged relationship
  // Additional summary data
  trends?: {
    magnitudeTrend: "increasing" | "decreasing" | "stable";
    valenceTrend: "improving" | "declining" | "stable";
    volatilityTrend: "stabilizing" | "increasing" | "stable";
  };
}

export default function BalanceMeterSummary({
  dateRange,
  location,
  mode,
  names,
  overallClimate,
  overallSfd,
  totalDays,
  activatedHouses,
  isLatentField,
  trends,
}: BalanceMeterSummaryProps) {
  const narrative = generateClimateNarrative(overallClimate, overallSfd, activatedHouses, true, isLatentField || false);

  const modeLabel =
    mode === "single"
      ? "One Person (Natal + Transits)"
      : `Two People (${names?.[0] ?? "Person A"} + ${names?.[1] ?? "Person B"}, Synastry + Transits)`;

  const formatValue = (value: number, showSign: boolean = false): string => {
    const formatted = value.toFixed(2);
    return showSign && value > 0 ? `+${formatted}` : formatted;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing": case "improving": return "📈";
      case "decreasing": case "declining": return "📉";
      case "stabilizing": return "📊";
      default: return "➖";
    }
  };

  return (
    <section
      className="mb-6 rounded-lg border-2 border-indigo-500 bg-slate-800/80 p-6"
      role="region"
      aria-label="Balance Meter period summary"
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-0.5 text-xs text-slate-300">
          <div className="text-indigo-200 font-semibold text-sm">BALANCE METER SUMMARY</div>
          <div className="font-medium">Period: {dateRange.start} to {dateRange.end}</div>
          <div>{location} • {totalDays} days analyzed</div>
          <div>{modeLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-indigo-200 flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">{narrative.pattern.icon}</span>
            <span>{narrative.headline}</span>
          </div>
        </div>
      </div>

      {/* Overall Period Story */}
      <div className="mb-6 rounded-md bg-indigo-900/30 p-5 border-l-4 border-indigo-300">
        <h3 className="text-sm font-semibold text-indigo-200 mb-3">Period Climate Pattern</h3>
        <p className="text-slate-100 leading-relaxed mb-3 text-base">
          {narrative.story}
        </p>
        <div className="text-sm text-emerald-200 bg-emerald-900/20 rounded-md p-3 border border-emerald-700/30">
          <span className="font-semibold">Overall Guidance: </span>
          {narrative.pattern.advice}
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
          Period Averages & Patterns
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-600/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Numinosity ⚡</span>
              <span className="text-xl font-bold text-yellow-300">{formatValue(narrative.dimensions.magnitude.value)}</span>
            </div>
            <div className="text-sm text-slate-200 mb-1">{narrative.dimensions.magnitude.label}</div>
            <div className="text-xs text-slate-400">How much archetypal charge is present</div>
            {trends && (
              <div className="text-xs text-slate-300 mt-2 flex items-center gap-1">
                <span>{getTrendIcon(trends.magnitudeTrend)}</span>
                <span className="capitalize">{trends.magnitudeTrend}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-600/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Directional Bias ↗️↘️</span>
              <span className="text-xl font-bold text-blue-300">{formatValue(narrative.dimensions.valence.value, true)}</span>
            </div>
            <div className="text-sm text-slate-200 mb-1">{narrative.dimensions.valence.label}</div>
            <div className="text-xs text-slate-400">Which way energy leans (inward/outward)</div>
            {trends && (
              <div className="text-xs text-slate-300 mt-2 flex items-center gap-1">
                <span>{getTrendIcon(trends.valenceTrend)}</span>
                <span className="capitalize">{trends.valenceTrend}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-600/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Narrative Coherence 📖</span>
              <span className="text-xl font-bold text-cyan-300">{formatValue(narrative.dimensions.volatility.value)}</span>
            </div>
            <div className="text-sm text-slate-200 mb-1">{narrative.dimensions.volatility.label}</div>
            <div className="text-xs text-slate-400">How stable is the storyline</div>
            {trends && (
              <div className="text-xs text-slate-300 mt-2 flex items-center gap-1">
                <span>{getTrendIcon(trends.volatilityTrend)}</span>
                <span className="capitalize">{trends.volatilityTrend}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-600/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Integration Bias 🤝</span>
              <span className="text-xl font-bold text-pink-300">{formatValue(overallSfd, true)}</span>
            </div>
            <div className="text-sm text-slate-200 mb-1">{narrative.dimensions.sfd?.label}</div>
            <div className="text-xs text-slate-400">Do forces cooperate or fragment</div>
          </div>
        </div>
      </div>

      {/* Period Paradox Analysis */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
          {isLatentField ? 'Dormant Field Climate (Conditional)' : 'Period Pattern Analysis'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700/40">
            <div className="font-semibold text-yellow-200 mb-3 flex items-center gap-2">
              <span>⚡</span>
              <span>Numinosity Pattern</span>
            </div>
            <div className="text-sm text-slate-200 mb-3">
              <span className="font-medium">{isLatentField ? 'Dormant Field Conditions: ' : '📈 Field Conditions: '}</span>
              {narrative.paradox.magnitude.wb}
            </div>
            <div className="text-sm text-amber-200">
              <span className="font-medium">{isLatentField ? 'Awareness Note: ' : '⚙️ Navigation Note: '}</span>
              {narrative.paradox.magnitude.abe}
            </div>
          </div>

          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/40">
            <div className="font-semibold text-blue-200 mb-3 flex items-center gap-2">
              <span>↗️↘️</span>
              <span>Directional Bias Pattern</span>
            </div>
            <div className="text-sm text-slate-200 mb-3">
              <span className="font-medium">{isLatentField ? 'Dormant Field Conditions: ' : '📈 Field Conditions: '}</span>
              {narrative.paradox.valence.wb}
            </div>
            <div className="text-sm text-amber-200">
              <span className="font-medium">{isLatentField ? 'Awareness Note: ' : '⚙️ Navigation Note: '}</span>
              {narrative.paradox.valence.abe}
            </div>
          </div>
        </div>
      </div>

      {/* Most Active Houses */}
      {activatedHouses && activatedHouses.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            Most Active Life Domains
          </h4>
          <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/40">
            <div className="text-sm text-purple-200 mb-2">
              <span className="font-medium">Primary Focus Areas: </span>
              {activatedHouses.slice(0, 3).join(", ")}
            </div>
            <div className="text-xs text-slate-400">
              These life domains showed the most energetic activity during this period
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 border-t border-slate-600 pt-4 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>This summary reflects the overall pattern across {totalDays} days of symbolic weather tracking.</span>
          <span className="text-slate-500">Balance Meter v1.3</span>
        </div>
      </div>
    </section>
  );
}
