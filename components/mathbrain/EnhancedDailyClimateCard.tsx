"use client";

import React, { useState, memo } from "react";
import { generateClimateNarrative, RelationshipContext } from "../../lib/climate-narrative";
import { ClimateData } from "../../lib/climate-renderer";
import {
  type OverflowDetail,
  OVERFLOW_LIMIT,
  OVERFLOW_NOTE_TEXT,
  OVERFLOW_TOLERANCE,
} from "../../lib/math-brain/overflow-detail";
import { generateClimateClasses, getValenceVisuals } from "../../lib/symbolic-visuals";

interface EnhancedDailyClimateCardProps {
  date: string;
  location: string;
  mode: "single" | "relational";
  names?: [string, string];
  climate: ClimateData;
  overflowDetail?: OverflowDetail | null;
  activatedHouses?: string[];
  isRangeSummary?: boolean;
  dateRange?: { start: string; end: string };
  defaultExpanded?: boolean;
  /** Relationship context for negative constraints (what NOT to assume) */
  relationshipContext?: RelationshipContext;
}

function MagnitudeVisual({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`flex gap-0.5 ${className}`} aria-label={`Magnitude level ${value.toFixed(1)}/5`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <div
          key={level}
          className={`h-3 w-2 rounded-sm transition-all ${
            value >= level
              ? "bg-current opacity-100"
              : value >= level - 0.5
              ? "bg-current opacity-50"
              : "bg-slate-700 opacity-30"
          }`}
        />
      ))}
    </div>
  );
}

function BiasVisual({ value, className }: { value: number; className?: string }) {
  // Map -5 to +5 range to 0-100%
  const percentage = Math.max(0, Math.min(100, ((value + 5) / 10) * 100));
  
  return (
    <div className={`relative h-3 w-24 rounded-full bg-slate-800 border border-slate-700 overflow-hidden ${className}`} aria-label={`Bias ${value > 0 ? '+' : ''}${value.toFixed(1)}`}>
      {/* Center marker */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-500/50" />
      
      {/* Value marker */}
      <div 
        className={`absolute top-0 bottom-0 w-1.5 -ml-0.5 rounded-full transition-all ${
          value > 0.5 ? 'bg-emerald-500' : value < -0.5 ? 'bg-rose-500' : 'bg-slate-400'
        }`}
        style={{ left: `${percentage}%` }}
      />
    </div>
  );
}

export default memo(function EnhancedDailyClimateCard({
  date,
  location,
  mode,
  names,
  climate,
  overflowDetail,
  activatedHouses,
  isRangeSummary = false,
  dateRange,
  defaultExpanded = true,
  relationshipContext,
}: EnhancedDailyClimateCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const narrative = generateClimateNarrative(climate, activatedHouses, isRangeSummary, false, mode, names, relationshipContext);

  const hasOverflow = overflowDetail?.overflowRegistered === true;

  const overflowMagnitudeDelta = hasOverflow ? overflowDetail?.magnitude_delta ?? null : null;
  const overflowDirectionalDelta = hasOverflow ? overflowDetail?.directional_delta ?? null : null;

  const formatMagnitudeOvershoot = (delta: number | null): string | null => {
    if (delta == null || delta === 0) {
      return null;
    }
    return `+${Math.abs(delta).toFixed(2)}`;
  };

  const formatDirectionalOvershoot = (
    delta: number | null,
    rawDirectional: number | null,
  ): string | null => {
    if (delta == null || delta === 0) {
      return null;
    }

    const magnitude = Math.abs(delta).toFixed(2);
    const raw = typeof rawDirectional === "number" && Number.isFinite(rawDirectional) ? rawDirectional : null;

    if (raw != null) {
      if (Math.abs(raw) > OVERFLOW_LIMIT + OVERFLOW_TOLERANCE) {
        const sign = raw > 0 ? "+" : raw < 0 ? "−" : "";
        return sign ? `${sign}${magnitude}` : magnitude;
      }
      return magnitude;
    }

    const fallbackSign = delta > 0 ? "+" : "−";
    return `${fallbackSign}${magnitude}`;
  };

  const overflowLines: string[] = [];
  const magnitudeText = formatMagnitudeOvershoot(overflowMagnitudeDelta);
  const directionalRaw =
    typeof overflowDetail?.rawDirectionalBias === "number" && Number.isFinite(overflowDetail.rawDirectionalBias)
      ? overflowDetail.rawDirectionalBias
      : null;
  const directionalText = formatDirectionalOvershoot(overflowDirectionalDelta, directionalRaw);

  if (magnitudeText) {
    overflowLines.push(`Magnitude overshoot ${magnitudeText}`);
  }
  if (directionalText) {
    overflowLines.push(`Directional bias overshoot ${directionalText}`);
  }

  const driversText = hasOverflow && (overflowDetail?.drivers ?? []).length
    ? `Drivers: ${(overflowDetail?.drivers ?? []).join(' · ')}`
    : null;

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
      className={`mb-6 rounded-lg ${climateClasses.border} ${climateClasses.background} ${climateClasses.borderWidth} transition-all duration-200`}
      role="region"
      aria-label="Daily symbolic weather narrative"
    >
      {/* Header / Toggle Area */}
      <div 
        className={`p-6 cursor-pointer hover:bg-slate-800/30 transition-colors ${!isExpanded ? 'rounded-lg' : 'rounded-t-lg'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-0.5 text-xs text-slate-400">
            <div className="font-medium flex items-center gap-2">
              <span className={isExpanded ? 'text-slate-200' : 'text-slate-300'}>
                {isRangeSummary ? 'Period Summary:' : 'Date:'} {timeLabel}
              </span>
              {!isExpanded && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium border ${climateClasses.border} ${climateClasses.text} bg-slate-900/50`}>
                  {narrative.headline}
                </span>
              )}
            </div>
            {isExpanded && (
              <>
                <div>{location}</div>
                <div>{modeLabel}</div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4 justify-end">
            {/* Collapsed Metrics Preview */}
            {!isExpanded && (
              <div className="hidden sm:flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2" title="Magnitude">
                  <span className="text-slate-500">Mag</span>
                  <MagnitudeVisual value={narrative.dimensions.magnitude.value} className={climateClasses.text} />
                  <span className={`font-medium ${climateClasses.text}`}>{formatValue(narrative.dimensions.magnitude.value)}</span>
                </div>
                <div className="flex items-center gap-2" title="Directional Bias">
                  <span className="text-slate-500">Bias</span>
                  <BiasVisual value={narrative.dimensions.valence.value} />
                  <span className={`font-medium ${
                    narrative.dimensions.valence.value > 0 ? 'text-emerald-400' : 
                    narrative.dimensions.valence.value < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {formatValue(narrative.dimensions.valence.value, true)}
                  </span>
                </div>
              </div>
            )}

            <div className="text-right flex items-center gap-3">
              {isExpanded && (
                <div>
                  <div className={`text-lg font-semibold ${climateClasses.text} flex items-center gap-2 ${climateClasses.weight} justify-end`}>
                    <span className="text-xl" aria-hidden="true">{narrative.pattern.icon}</span>
                    <span>{narrative.headline}</span>
                  </div>
                  {narrative.labelSubtitle && (
                    <div className="text-xs text-slate-400 mt-1">{narrative.labelSubtitle}</div>
                  )}
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 mt-1">
                    {narrative.voiceLabel}
                  </div>
                </div>
              )}
              
              {/* Toggle Icon */}
              <div className={`p-1 rounded-full hover:bg-slate-700/50 transition-colors ${isExpanded ? 'rotate-180' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6">
          {hasOverflow && (
            <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-200">
              <div className="font-semibold text-amber-100">Overflow registered</div>
              <div className="mt-1 text-amber-100/90">
                {(overflowLines.length ? overflowLines.join(' · ') : 'Scale exceeded')}
              </div>
              {driversText && (
                <div className="mt-1 text-amber-100/80">{driversText}</div>
              )}
              <div className="mt-1 text-amber-100/60">{OVERFLOW_NOTE_TEXT}</div>
            </div>
          )}

          {/* Primary Story */}
          <div className={`mb-6 rounded-md bg-slate-900/50 p-4 border-l-4 ${climateClasses.border}`}>
            <h3 className={`text-sm font-semibold ${climateClasses.text} mb-2`}>
              {isRangeSummary ? 'Period Symbolic Weather Story' : 'Today\'s Symbolic Weather Story'}
            </h3>
            <p className="text-slate-200 leading-relaxed mb-3">
              {narrative.story}
            </p>
            <div className={`text-sm ${climateClasses.text} bg-slate-800/30 rounded-md p-3 border ${climateClasses.border}`}>
              <span className="font-semibold">Guidance: </span>
              {narrative.pattern.advice}
            </div>
          </div>

          {/* Core Metrics - v5.0 Two-Axis Field Assessment */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Field Conditions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/40 rounded-md p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">Magnitude ⚡</span>
                  <div className="flex items-center gap-3">
                    <MagnitudeVisual value={narrative.dimensions.magnitude.value} className={climateClasses.text} />
                    <span className={`text-lg ${climateClasses.weight} ${climateClasses.text}`}>{formatValue(narrative.dimensions.magnitude.value)}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-300 mb-1">{narrative.dimensions.magnitude.label}</div>
                <div className="text-xs text-slate-400">How loud the symbolic weather field is</div>
              </div>

              <div className="relative bg-slate-900/40 rounded-md p-3 border border-slate-700/50 overflow-hidden">
                {/* Conditional gradient overlay based on directional bias sign */}
                <div
                  className={`absolute inset-0 opacity-10 ${
                    narrative.dimensions.valence.value > 0
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                      : narrative.dimensions.valence.value < 0
                      ? 'bg-gradient-to-br from-rose-500 to-rose-600'
                      : 'bg-slate-800'
                  }`}
                  aria-hidden="true"
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">
                      Directional Bias {narrative.dimensions.valence.value > 0 ? '↗️' : narrative.dimensions.valence.value < 0 ? '↘️' : '↔️'}
                    </span>
                    <div className="flex items-center gap-3">
                      <BiasVisual value={narrative.dimensions.valence.value} />
                      <span className={`text-lg font-semibold ${
                        narrative.dimensions.valence.value > 0
                          ? 'text-emerald-400'
                          : narrative.dimensions.valence.value < 0
                          ? 'text-rose-400'
                          : climateClasses.text
                      }`}>
                        {formatValue(narrative.dimensions.valence.value, true)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 mb-1">{narrative.dimensions.valence.label}</div>
                  <div className="text-xs text-slate-400">Which way energy leans (inward/outward)</div>
                </div>
              </div>
            </div>
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
            This is your symbolic weather map for the inner world—observe how the symbolic pressures correspond to your lived experience.
          </div>
        </div>
      )}
    </section>
  );
});
