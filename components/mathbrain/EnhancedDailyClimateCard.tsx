"use client";

import React from "react";
import { generateClimateNarrative, ClimateNarrative } from "../../lib/climate-narrative";
import { ClimateData } from "../../lib/climate-renderer";
import { generateClimateClasses, getValenceVisuals } from "../../lib/symbolic-visuals";

interface EnhancedDailyClimateCardProps {
  date: string;
  location: string;
  mode: "single" | "relational";
  names?: [string, string];
  climate: ClimateData;
  sfd?: number;
  activatedHouses?: string[];
  isRangeSummary?: boolean;
  dateRange?: { start: string; end: string };
}

export default function EnhancedDailyClimateCard({
  date,
  location,
  mode,
  names,
  climate,
  sfd,
  activatedHouses,
  isRangeSummary = false,
  dateRange,
}: EnhancedDailyClimateCardProps) {
  const narrative = generateClimateNarrative(climate, sfd, activatedHouses, isRangeSummary);

  const modeLabel =
    mode === "single"
      ? "One Person (Natal + Transits)"
      : `Two People (${names?.[0] ?? "Person A"} + ${names?.[1] ?? "Person B"}, Synastry + Transits)`;

  const formatValue = (value: number, showSign: boolean = false): string => {
    const formatted = value.toFixed(2);
    return showSign && value > 0 ? `+${formatted}` : formatted;
  };

  const timeLabel = isRangeSummary && dateRange
    ? `${dateRange.start} to ${dateRange.end}`
    : date;

  // Generate symbolic visual classes based on climate physics
  const valence = climate.valence_bounded ?? climate.valence ?? 0;
  const climateClasses = generateClimateClasses(valence, climate.magnitude, climate.volatility);
  const valenceVisuals = getValenceVisuals(valence);

  return (
    <section
      className={`mb-6 rounded-lg ${climateClasses.border} ${climateClasses.background} p-6 ${climateClasses.borderWidth}`}
      role="region"
      aria-label="Daily symbolic climate narrative"
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-0.5 text-xs text-slate-400">
          <div className="font-medium">{isRangeSummary ? 'Period Summary:' : 'Date:'} {timeLabel}</div>
          <div>{location}</div>
          <div>{modeLabel}</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-semibold ${climateClasses.text} flex items-center gap-2 ${climateClasses.weight}`}>
            <span className="text-xl" aria-hidden="true">{narrative.pattern.icon}</span>
            <span>{narrative.headline}</span>
          </div>
        </div>
      </div>

      {/* Primary Story */}
      <div className={`mb-6 rounded-md bg-slate-900/50 p-4 border-l-4 ${climateClasses.border}`}>
        <h3 className={`text-sm font-semibold ${climateClasses.text} mb-2`}>
          {isRangeSummary ? 'Period Climate Story' : 'Today\'s Climate Story'}
        </h3>
        <p className="text-slate-200 leading-relaxed mb-3">
          {narrative.story}
        </p>
        <div className={`text-sm ${climateClasses.text} bg-slate-800/30 rounded-md p-3 border ${climateClasses.border}`}>
          <span className="font-semibold">Guidance: </span>
          {narrative.pattern.advice}
        </div>
      </div>

      {/* Core Metrics - v2.0 Neutral Field Assessment */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Field Conditions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/40 rounded-md p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Magnitude ⚡</span>
              <span className={`text-lg ${climateClasses.weight} ${climateClasses.text}`}>{formatValue(narrative.dimensions.magnitude.value)}</span>
            </div>
            <div className="text-xs text-slate-300 mb-1">{narrative.dimensions.magnitude.label}</div>
            <div className="text-xs text-slate-400">How loud the symbolic climate is</div>
          </div>

          <div className="bg-slate-900/40 rounded-md p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Directional Bias ↗️↘️</span>
              <span className={`text-lg ${climateClasses.weight} ${climateClasses.text}`}>{formatValue(narrative.dimensions.valence.value, true)}</span>
            </div>
            <div className="text-xs text-slate-300 mb-1">{narrative.dimensions.valence.label}</div>
            <div className="text-xs text-slate-400">Which way energy leans (inward/outward)</div>
          </div>

          <div className="bg-slate-900/40 rounded-md p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Narrative Coherence 📖</span>
              <span className={`text-lg ${climateClasses.weight} ${climateClasses.text} ${climateClasses.animation}`}>{formatValue(narrative.dimensions.volatility.value)}</span>
            </div>
            <div className="text-xs text-slate-300 mb-1">{narrative.dimensions.volatility.label}</div>
            <div className="text-xs text-slate-400">How stable is the storyline</div>
          </div>
        </div>

        {/* Integration Bias if available */}
        {narrative.dimensions.sfd && (
          <div className="mt-4 bg-slate-900/40 rounded-md p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Integration Bias 🤝</span>
              <span className={`text-lg ${climateClasses.weight} ${climateClasses.text}`}>{formatValue(narrative.dimensions.sfd.value, true)}</span>
            </div>
            <div className="text-xs text-slate-300 mb-1">{narrative.dimensions.sfd.label}</div>
            <div className="text-xs text-slate-400">Do forces cooperate or fragment</div>
          </div>
        )}
      </div>

      {/* WB / ABE Paradox Poles */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">The Paradox Poles</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="bg-yellow-900/20 rounded-md p-3 border border-yellow-800/30">
              <div className="font-semibold text-yellow-200 mb-2">Magnitude</div>
              <div className="text-xs text-emerald-200 mb-2">
                <span className="font-medium">✅ WB: </span>{narrative.paradox.magnitude.wb}
              </div>
              <div className="text-xs text-red-200">
                <span className="font-medium">⚠️ ABE: </span>{narrative.paradox.magnitude.abe}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-blue-900/20 rounded-md p-3 border border-blue-800/30">
              <div className="font-semibold text-blue-200 mb-2">Directional Bias</div>
              <div className="text-xs text-emerald-200 mb-2">
                <span className="font-medium">🌱 Inward Flow: </span>{narrative.paradox.valence.wb}
              </div>
              <div className="text-xs text-red-200">
                <span className="font-medium">🔄 Outward Flow: </span>{narrative.paradox.valence.abe}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activated Houses */}
      {activatedHouses && activatedHouses.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Where It Lands</h4>
          <div className="bg-purple-900/20 rounded-md p-3 border border-purple-800/30">
            <div className="text-xs text-purple-200">
              <span className="font-medium">Activated Houses: </span>
              {activatedHouses.join(", ")}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              The energy concentrates in these life domains
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 border-t border-slate-700 pt-3 text-xs text-slate-400">
        This is your weather map for the inner world—observe how the symbolic pressures correspond to your lived experience.
      </div>
    </section>
  );
}
