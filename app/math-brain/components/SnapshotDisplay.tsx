/* eslint-disable no-console */
'use client';

import { useCallback, useRef, useState, useMemo } from 'react';
import { buildDomainsFromChart, createSnapshotDisplay } from '../utils/snapshot';
import { BalanceMeterPopover } from '@/components/BalanceMeterPopover';
import { buildTooltipContent, type TooltipContent } from '@/lib/raven/tooltip-context';
import type { BalanceTooltipEntry } from '@/lib/raven/balance-tooltip-types';

interface SnapshotDisplayProps {
  result: any;
  location: { latitude: number; longitude: number };
  timestamp: Date;
}

export default function SnapshotDisplay({ result, location, timestamp }: SnapshotDisplayProps) {
  const chartImgRef = useRef<HTMLImageElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Check if this is a relational snapshot (moved up for use in download function)
  const hasPersonB = Boolean(result?.person_b);
  const isRelational = hasPersonB && Boolean(result.person_b);

  // Get person names for filename (using different var names to avoid conflicts with display names below)
  const downloadNameA = result?.person_a?.subject?.name || result?.person_a?.name || 'chart';
  const downloadNameB = result?.person_b?.subject?.name || result?.person_b?.name || '';

  const downloadAsPng = useCallback(async () => {
    const imgEl = chartImgRef.current;
    if (!imgEl) return;

    setIsDownloading(true);

    try {
      const imgSrc = imgEl.src;

      // If it's an SVG (data URL or .svg file), we need special handling
      const isSvg = imgSrc.startsWith('data:image/svg') || imgSrc.toLowerCase().endsWith('.svg');

      // Target resolution for AI-readable charts (high res for text clarity)
      const targetSize = 2400; // Large enough for AI to read planet positions clearly

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      if (isSvg) {
        // For SVG: Parse and render at high resolution
        let svgText: string;

        if (imgSrc.startsWith('data:image/svg+xml')) {
          // Decode from data URL
          if (imgSrc.includes('base64,')) {
            const base64 = imgSrc.split('base64,')[1];
            svgText = atob(base64);
          } else {
            const encoded = imgSrc.split(',')[1];
            svgText = decodeURIComponent(encoded);
          }
        } else {
          // Fetch from URL
          const response = await fetch(imgSrc);
          svgText = await response.text();
        }

        // Parse SVG to get/set dimensions
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgEl = svgDoc.documentElement;

        // Get original viewBox or dimensions
        let viewBox = svgEl.getAttribute('viewBox');
        const origWidth = parseFloat(svgEl.getAttribute('width') || '0');
        const origHeight = parseFloat(svgEl.getAttribute('height') || '0');

        // Determine aspect ratio
        let aspectRatio = 1;
        if (viewBox) {
          const parts = viewBox.split(/\s+|,/).map(Number);
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            aspectRatio = parts[2] / parts[3];
          }
        } else if (origWidth > 0 && origHeight > 0) {
          aspectRatio = origWidth / origHeight;
          // Add viewBox if missing
          svgEl.setAttribute('viewBox', `0 0 ${origWidth} ${origHeight}`);
        }

        // Calculate canvas size maintaining aspect ratio
        let canvasWidth: number, canvasHeight: number;
        if (aspectRatio >= 1) {
          canvasWidth = targetSize;
          canvasHeight = Math.round(targetSize / aspectRatio);
        } else {
          canvasHeight = targetSize;
          canvasWidth = Math.round(targetSize * aspectRatio);
        }

        // Set explicit dimensions on SVG for rendering
        svgEl.setAttribute('width', String(canvasWidth));
        svgEl.setAttribute('height', String(canvasHeight));

        // Serialize back to string
        const serializer = new XMLSerializer();
        const modifiedSvg = serializer.serializeToString(svgEl);

        // Create blob URL for rendering
        const blob = new Blob([modifiedSvg], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);

        // Render to canvas via Image
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            // White background for better readability
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Draw the SVG
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

            URL.revokeObjectURL(blobUrl);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            reject(new Error('Failed to load SVG for rendering'));
          };
          img.src = blobUrl;
        });
      } else {
        // For raster images, scale up if needed
        const origWidth = imgEl.naturalWidth || imgEl.width || 800;
        const origHeight = imgEl.naturalHeight || imgEl.height || 800;
        const aspectRatio = origWidth / origHeight;

        let canvasWidth: number, canvasHeight: number;
        if (aspectRatio >= 1) {
          canvasWidth = Math.max(origWidth, targetSize);
          canvasHeight = Math.round(canvasWidth / aspectRatio);
        } else {
          canvasHeight = Math.max(origHeight, targetSize);
          canvasWidth = Math.round(canvasHeight * aspectRatio);
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Enable image smoothing for upscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(imgEl, 0, 0, canvasWidth, canvasHeight);
      }

      // Convert to PNG and download
      const pngDataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      const chartType = isRelational ? 'synastry' : 'natal';
      const names = isRelational && downloadNameB 
        ? `${downloadNameA.toLowerCase().replace(/\s+/g, '-')}_${downloadNameB.toLowerCase().replace(/\s+/g, '-')}`
        : downloadNameA.toLowerCase().replace(/\s+/g, '-');
      link.download = `${chartType}-chart-${names}-${dateStr}.png`;
      link.href = pngDataUrl;
      link.click();
    } catch (error) {
      console.error('[SnapshotDisplay] Failed to download PNG:', error);
      alert('Failed to download image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [isRelational, downloadNameA, downloadNameB]);
  console.log('[SnapshotDisplay] Rendering with result:', result);

  const snapshot = createSnapshotDisplay(result, location, timestamp);

  const selectSummarySource = () =>
    result?.balance_meter?.channel_summary_canonical ||
    result?.balance_meter?.channel_summary ||
    result?.person_a?.derived?.seismograph_summary_canonical ||
    result?.person_a?.derived?.seismograph_summary ||
    result?.summary?.balance_meter ||
    result?.person_a?.summary ||
    result?.summary ||
    null;

  const summarySource = selectSummarySource();

  const getFirstTransitDay = () => {
    const transits = result?.person_a?.chart?.transitsByDate;
    if (!transits || typeof transits !== 'object') return null;
    const keys = Object.keys(transits).sort();
    if (!keys.length) return null;
    const day = transits[keys[0]];
    if (!day || typeof day !== 'object') return null;
    return day;
  };

  const fallbackFromDay = (() => {
    const day = getFirstTransitDay();
    const seismograph = day?.seismograph || day?.raw || null;
    if (!seismograph || typeof seismograph !== 'object') return null;

    const magnitudeCandidate =
      typeof seismograph.magnitude === 'number'
        ? seismograph.magnitude
        : typeof seismograph.rawMagnitude === 'number'
          ? seismograph.rawMagnitude
          : undefined;

    const biasCandidate =
      typeof seismograph.directional_bias?.value === 'number'
        ? seismograph.directional_bias.value
        : typeof seismograph.rawDirectionalBias === 'number'
          ? seismograph.rawDirectionalBias
          : undefined;

    const volatilityCandidate =
      typeof seismograph.volatility === 'number'
        ? seismograph.volatility
        : typeof seismograph.volatility_scaled === 'number'
          ? seismograph.volatility_scaled
          : undefined;

    if (
      magnitudeCandidate === undefined &&
      biasCandidate === undefined &&
      volatilityCandidate === undefined
    ) {
      return null;
    }

    return {
      magnitude: magnitudeCandidate,
      directionalBias: biasCandidate,
      volatility: volatilityCandidate,
    };
  })();

  const toNumber = (value: any): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    if (value && typeof value === 'object') {
      if (typeof value.value === 'number') return value.value;
      if (typeof value.mean === 'number') return value.mean;
      if (typeof value.score === 'number') return value.score;
    }
    return undefined;
  };

  const magnitudePrimary =
    toNumber(summarySource?.axes?.magnitude) ??
    toNumber(summarySource?.magnitude) ??
    toNumber(summarySource?.magnitude_value);

  const biasPrimary =
    toNumber(summarySource?.axes?.directional_bias) ??
    toNumber(summarySource?.directional_bias) ??
    toNumber(summarySource?.bias_signed) ??
    toNumber(summarySource?.valence_bounded) ??
    toNumber(summarySource?.valence);

  const volatilityPrimary =
    toNumber(summarySource?.axes?.coherence) ??
    toNumber(summarySource?.axes?.volatility) ??
    toNumber(summarySource?.volatility) ??
    toNumber(summarySource?.coherence);

  const shouldUseFallback = (primary: number | undefined, fallback: number | undefined) =>
    (primary === undefined || primary === null || Math.abs(primary) < 0.01) &&
    typeof fallback === 'number' &&
    Math.abs(fallback) >= 0.05;

  const magnitudeResolved =
    (typeof magnitudePrimary === 'number' ? magnitudePrimary : undefined) ??
    (typeof fallbackFromDay?.magnitude === 'number' ? fallbackFromDay.magnitude : undefined);

  const directionalBiasResolved =
    (typeof biasPrimary === 'number' ? biasPrimary : undefined) ??
    (typeof fallbackFromDay?.directionalBias === 'number' ? fallbackFromDay.directionalBias : undefined);

  const volatilityResolved =
    (typeof volatilityPrimary === 'number' ? volatilityPrimary : undefined) ??
    (typeof fallbackFromDay?.volatility === 'number' ? fallbackFromDay.volatility : undefined);

  const magnitude =
    shouldUseFallback(magnitudePrimary, fallbackFromDay?.magnitude) && fallbackFromDay
      ? fallbackFromDay.magnitude ?? null
      : typeof magnitudeResolved === 'number'
        ? magnitudeResolved
        : null;
  const directionalBias =
    shouldUseFallback(biasPrimary, fallbackFromDay?.directionalBias) && fallbackFromDay
      ? fallbackFromDay.directionalBias ?? null
      : typeof directionalBiasResolved === 'number'
        ? directionalBiasResolved
        : null;
  const volatility =
    shouldUseFallback(volatilityPrimary, fallbackFromDay?.volatility) && fallbackFromDay
      ? fallbackFromDay.volatility ?? null
      : typeof volatilityResolved === 'number'
        ? volatilityResolved
        : null;

  // Build tooltip content from balance_tooltips if available
  const tooltipContent = useMemo((): TooltipContent | null => {
    // Check for balance_tooltips in the result (from include_balance_tooltips flag)
    const balanceTooltips: BalanceTooltipEntry[] | null = result?.balance_tooltips ?? null;

    if (!balanceTooltips || !Array.isArray(balanceTooltips) || balanceTooltips.length === 0) {
      return null;
    }

    // Use the most recent entry (or first if only one)
    const latestEntry = balanceTooltips[balanceTooltips.length - 1];
    if (!latestEntry?.scored_aspects || latestEntry.scored_aspects.length === 0) {
      return null;
    }

    return buildTooltipContent(latestEntry.scored_aspects, { maxDrivers: 3 });
  }, [result?.balance_tooltips]);

  // Extract chart assets for visualization
  const chartAssets = [
    ...(result?.person_a?.chart_assets || []),
    ...(result?.synastry_chart_assets || []),
    ...(result?.chart_assets || []) // Check top-level just in case
  ];

  console.log('[SnapshotDisplay] Available chart assets:', chartAssets);

  const selectWheelAsset = () => {
    if (!Array.isArray(chartAssets) || chartAssets.length === 0) return null;

    const priorityChartTypes = isRelational
      ? ['synastry', 'composite', 'natal', 'transit', 'wheel']
      : ['natal', 'transit', 'synastry', 'composite', 'wheel'];
    const prioritySubjects = isRelational
      ? ['synastry', 'person_a', 'composite', 'transit']
      : ['person_a', 'transit', 'synastry', 'composite'];

    // 1. Try exact chartType match
    for (const type of priorityChartTypes) {
      const match = chartAssets.find((asset: any) => {
        const chartType = typeof asset?.chartType === 'string' ? asset.chartType.toLowerCase() : '';
        return chartType === type;
      });
      if (match?.url) return match;
    }

    // 2. Try subject match
    for (const subject of prioritySubjects) {
      const match = chartAssets.find((asset: any) => {
        const subjectKey = typeof asset?.subject === 'string' ? asset.subject.toLowerCase() : '';
        return subjectKey === subject;
      });
      if (match?.url) return match;
    }

    // 3. Fallback: Find ANY asset that looks like an image/wheel
    return chartAssets.find((asset: any) => {
      if (!asset?.url) return false;
      const url = asset.url.toLowerCase();
      const isImage = url.match(/\.(png|jpg|jpeg|svg|gif)/) || url.startsWith('data:image');
      return isImage;
    }) || null;
  };

  const wheelChart = selectWheelAsset();

  // Safety check for massive data URIs that might freeze the main thread
  const isSafeToRender = useMemo(() => {
    if (!wheelChart?.url) return true;
    if (wheelChart.url.startsWith('data:')) {
      // Limit to approx 5MB to prevent main thread freeze
      return wheelChart.url.length < 5 * 1024 * 1024;
    }
    return true;
  }, [wheelChart]);

  // Extract provenance
  const houseSystem =
    result?.provenance?.house_system_name ||
    result?.provenance?.house_system ||
    result?.person_a?.chart?.houses_system_name ||
    result?.person_a?.chart?.houses_system_identifier ||
    'Placidus';
  const zodiacType =
    result?.provenance?.zodiac_type ||
    result?.person_a?.chart?.zodiac_type ||
    result?.person_a?.zodiac_type ||
    'Tropical';
  const schemaVersion = '5.0'; // From your system

  const personBDomains = isRelational ? buildDomainsFromChart(result?.person_b?.chart) : [];
  const showPersonBDomains = isRelational && personBDomains.some((domain) => domain.planets.length > 0);

  // Get person names for display
  const personAName = result?.person_a?.subject?.name || result?.person_a?.name || 'Person A';
  const personBName = result?.person_b?.subject?.name || result?.person_b?.name || 'Person B';

  // Determine snapshot type label
  const snapshotTypeLabel = isRelational
    ? `Synastry Transit: ${personAName} + ${personBName}`
    : `${personAName}'s Transit Snapshot`;

  console.log('[SnapshotDisplay] Balance Meter metrics:', {
    magnitude,
    directionalBias,
    volatility,
    summarySourceKeys: summarySource ? Object.keys(summarySource) : [],
    fallbackFromDay,
  });

  return (
    <div className="mt-6 rounded-lg border border-purple-700 bg-purple-900/20 p-6 backdrop-blur-sm">
      {/* HEADER */}
      <div className="mb-6 flex items-start justify-between border-b border-purple-700/30 pb-4">
        <div className="w-full">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-600 bg-purple-700/20 px-2 py-0.5 text-xs text-purple-300">
              <span>⭐</span>
              <span>Symbolic Moment Snapshot</span>
            </span>
            {isRelational && (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-600 bg-indigo-700/20 px-2 py-0.5 text-xs text-indigo-300">
                <span>👥</span>
                <span>Synastry</span>
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-purple-200">
            {snapshotTypeLabel}
          </h3>
          <p className="mt-1 text-sm text-slate-300 flex items-center gap-2">
            <span>🕐</span>
            <span>{snapshot.timestamp}</span>
          </p>
          <p className="mt-1 text-sm text-slate-300">
            📍 {snapshot.location.label}
          </p>
          {isRelational && (
            <p className="mt-1 text-xs text-purple-300">
              ℹ️ Both charts relocated to snapshot location
            </p>
          )}
        </div>
      </div>

      {/* CHART WHEEL (TOP HALF) */}
      {wheelChart?.url && isSafeToRender ? (
        <div className="mb-6 rounded border border-slate-700 bg-slate-900/50 p-4">
          <div className="flex justify-center">
            <img
              ref={chartImgRef}
              src={wheelChart.url}
              alt={isRelational ? 'Synastry Chart' : 'Natal Chart'}
              className="w-full max-w-md md:max-w-lg lg:max-w-xl h-auto"
              crossOrigin="anonymous"
              loading="lazy"
              onError={(e) => {
                console.error('[SnapshotDisplay] Chart image failed to load');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="mt-3 flex justify-center">
            <button
              onClick={downloadAsPng}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 rounded-md border border-purple-600 bg-purple-700/30 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download PNG</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded border border-slate-700 bg-slate-900/50 p-8 text-center">
          <div className="mb-4">
            <div className="inline-block rounded-full border-4 border-purple-600 w-32 h-32 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">🌌</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-2">Chart Wheel</p>
          {chartAssets.length === 0 && (
            <p className="text-xs text-red-400 mb-2">No chart assets returned from API</p>
          )}
          {chartAssets.length > 0 && !wheelChart && (
            <p className="text-xs text-yellow-400 mb-2">Assets found but no wheel matched ({chartAssets.length})</p>
          )}
          {wheelChart?.url && !isSafeToRender && (
            <p className="text-xs text-red-400 mb-2">Chart image too large to render safely</p>
          )}
          {snapshot.houses && (snapshot.houses.asc || snapshot.houses.mc) && (
            <div className="flex justify-center gap-6 text-xs text-slate-400">
              {snapshot.houses.asc && (
                <div>
                  <span className="text-slate-500">ASC</span>{' '}
                  <span className="text-purple-300">
                    {snapshot.houses.asc.sign} {snapshot.houses.asc.degree.toFixed(1)}°
                  </span>
                </div>
              )}
              {snapshot.houses.mc && (
                <div>
                  <span className="text-slate-500">MC</span>{' '}
                  <span className="text-purple-300">
                    {snapshot.houses.mc.sign} {snapshot.houses.mc.degree.toFixed(1)}°
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* BALANCE METER DIAGNOSTIC PANEL (BOTTOM HALF) */}
      <div className="mb-6 rounded-lg border border-indigo-700 bg-indigo-900/20 p-4">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-300">
          Balance Meter Snapshot
        </h4>

        {/* Metrics Table */}
        <div className="rounded border border-slate-700 bg-slate-900/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Axis</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Value</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              <tr>
                <td className="px-3 py-2 text-slate-300">Magnitude</td>
                <td className="px-3 py-2 text-right font-mono text-indigo-300">
                  <BalanceMeterPopover content={tooltipContent} side="left" disabled={!tooltipContent}>
                    <span className="inline-flex items-center gap-1">
                      {typeof magnitude === 'number' ? magnitude.toFixed(1) : '—'}
                    </span>
                  </BalanceMeterPopover>
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {typeof magnitude === 'number' && magnitude >= 4
                    ? 'Strong field activation'
                    : typeof magnitude === 'number' && magnitude >= 2
                      ? 'Moderate activation'
                      : typeof magnitude === 'number' && magnitude >= 1
                        ? 'Light activation'
                        : 'Latent field'}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-300">Directional Bias</td>
                <td className="px-3 py-2 text-right font-mono text-indigo-300">
                  <BalanceMeterPopover content={tooltipContent} side="left" disabled={!tooltipContent}>
                    <span className="inline-flex items-center gap-1">
                      {typeof directionalBias === 'number'
                        ? `${directionalBias > 0 ? '+' : ''}${directionalBias.toFixed(1)}`
                        : '—'}
                    </span>
                  </BalanceMeterPopover>
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {typeof directionalBias === 'number' && directionalBias >= 3
                    ? 'Strong expansion'
                    : typeof directionalBias === 'number' && directionalBias >= 1
                      ? 'Moderate expansion'
                      : typeof directionalBias === 'number' && directionalBias >= -1
                        ? 'Equilibrium'
                        : typeof directionalBias === 'number' && directionalBias >= -3
                          ? 'Moderate contraction'
                          : 'Strong contraction'}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-300">Coherence (Volatility)</td>
                <td className="px-3 py-2 text-right font-mono text-indigo-300">
                  {typeof volatility === 'number' ? volatility.toFixed(1) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {typeof volatility === 'number' && volatility >= 4
                    ? 'Very high variability'
                    : typeof volatility === 'number' && volatility >= 2
                      ? 'Moderate stability'
                      : typeof volatility === 'number' && volatility >= 1
                        ? 'High stability'
                        : 'Very stable pattern'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Symbolic Reading Summary (Field Metrics) */}
        {(typeof magnitude === 'number' || typeof directionalBias === 'number') && (
          <div className="mt-3 rounded border border-slate-700 bg-slate-800/30 p-3">
            <p className="text-xs text-slate-400 mb-1">
              <span className="font-medium text-slate-300">Symbolic Weather (FIELD layer):</span>
            </p>
            <p className="text-sm text-indigo-200">
              {typeof directionalBias === 'number' && directionalBias < -1
                ? 'Contracting'
                : typeof directionalBias === 'number' && directionalBias > 1
                  ? 'Expanding'
                  : 'Balanced'}{' '}
              {typeof magnitude === 'number' && magnitude >= 3
                ? 'with strong activation'
                : typeof magnitude === 'number' && magnitude >= 1
                  ? 'gently'
                  : 'subtly'}
              ;
              {typeof volatility === 'number' && volatility < 2
                ? ' coherence steady'
                : typeof volatility === 'number' && volatility >= 4
                  ? ' high variability'
                  : ' moderate shifts'}
              .
            </p>
          </div>
        )}
      </div>

      {/* PROVENANCE FOOTER */}
      <div className="rounded border border-slate-700/50 bg-slate-900/30 p-3 text-xs text-slate-400">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <span className="text-slate-500">Schema:</span>{' '}
            <span className="text-slate-300">BM-v{schemaVersion}</span>
          </div>
          <div>
            <span className="text-slate-500">House System:</span>{' '}
            <span className="text-slate-300">{houseSystem}</span>
          </div>
          <div>
            <span className="text-slate-500">Zodiac:</span>{' '}
            <span className="text-slate-300">{zodiacType}</span>
          </div>
          <div>
            <span className="text-slate-500">Weather:</span>{' '}
            <span className="text-emerald-300">Active</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-700/50">
          <div className="text-slate-500">
            Coordinates: {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
          </div>
          <div className="text-slate-500">
            Local: {snapshot.localTime} · UTC: {snapshot.utcTime}
          </div>
        </div>
      </div>

      {/* EXPANDABLE: Planetary Positions */}
      <details className="rounded border border-slate-700/50 bg-slate-900/20">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-200 select-none">
          📊 View Planetary Positions
        </summary>
        <div className="border-t border-slate-700/50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {snapshot.domains.map((domain) => (
              <div
                key={domain.label}
                className="rounded border border-slate-700 bg-slate-800/50 p-3"
              >
                <h5 className="mb-2 text-xs font-medium text-slate-400">{domain.label}</h5>
                {domain.planets.length > 0 ? (
                  <ul className="space-y-1 text-xs text-slate-400">
                    {domain.planets.map((planet) => (
                      <li key={planet.name} className="flex items-baseline justify-between gap-2">
                        <span className="text-purple-300">{planet.name}</span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {planet.sign} {planet.degree.toFixed(1)}°
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">—</p>
                )}
              </div>
            ))}
          </div>

          {/* House Cusps */}
          {snapshot.houses && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <h5 className="mb-3 text-xs font-medium text-slate-400">House Cusps</h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {[...Array(12)].map((_, i) => {
                  const num = i + 1;
                  const key = `h${num}`;
                  const house = snapshot.houses?.[key];
                  if (!house) return null;
                  return (
                    <div key={key} className="rounded border border-slate-700 bg-slate-800/30 p-2 flex justify-between items-center">
                      <span className="text-xs text-slate-500">H{num}</span>
                      <span className="text-xs text-slate-300 font-mono">
                        {house.sign} {house.degree.toFixed(1)}°
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isRelational && (() => {
            if (!showPersonBDomains) return null;

            return (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <h5 className="mb-3 text-xs font-medium text-indigo-400">Person B</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {personBDomains.map((domain) => (
                    <div
                      key={domain.label}
                      className="rounded border border-slate-700 bg-slate-800/50 p-3"
                    >
                      <h6 className="mb-2 text-xs font-medium text-slate-400">{domain.label}</h6>
                      {domain.planets.length > 0 ? (
                        <ul className="space-y-1 text-xs text-slate-400">
                          {domain.planets.map((planet) => (
                            <li
                              key={`${planet.name}-${planet.sign}`}
                              className="flex items-baseline justify-between gap-2"
                            >
                              <span className="text-indigo-300">{planet.name}</span>
                              <span className="text-slate-500 font-mono text-[10px]">
                                {planet.sign} {planet.degree.toFixed(1)}°
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-500">—</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </details>
    </div>
  );
}
