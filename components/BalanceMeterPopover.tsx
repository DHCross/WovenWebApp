'use client';

/**
 * Balance Meter Popover Component
 * 
 * Accessible tooltip that explains what's driving the Balance Meter values.
 * Uses Radix UI Popover for built-in keyboard navigation, focus trap, and ARIA.
 * 
 * Follows FRONTSTAGE voice rules:
 * - ❌ NO planet names, signs, houses, aspects, degrees
 * - ✅ Symbolic weather language (friction, flow, field)
 * 
 * @see lib/raven/tooltip-context.ts - Content generation
 * @see docs/MANDATE_2_IMPLEMENTATION_PLAN.md - Accessibility requirements
 */

import * as Popover from '@radix-ui/react-popover';
import { useState, useCallback } from 'react';
import type { TooltipContent, DriverSummary } from '@/lib/raven/tooltip-context';

// ============================================================================
// TYPES
// ============================================================================

export interface BalanceMeterPopoverProps {
  /** The tooltip content to display */
  content: TooltipContent | null;
  /** The trigger element (the Balance Meter value being explained) */
  children: React.ReactNode;
  /** Optional: Position relative to trigger */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Optional: Alignment relative to trigger */
  align?: 'start' | 'center' | 'end';
  /** Optional: Custom class name for the trigger wrapper */
  triggerClassName?: string;
  /** Optional: Disable the popover (useful when no data available) */
  disabled?: boolean;
  /** Optional: Show debug info (backstage only) */
  showDebug?: boolean;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Visual indicator for driver direction (friction/flow/neutral)
 */
function DirectionIndicator({ direction }: { direction: 'friction' | 'flow' | 'neutral' }) {
  const config = {
    friction: {
      emoji: '⚡',
      label: 'friction',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-900/30',
    },
    flow: {
      emoji: '✨',
      label: 'flow',
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-900/30',
    },
    neutral: {
      emoji: '◆',
      label: 'neutral',
      colorClass: 'text-slate-400',
      bgClass: 'bg-slate-800/50',
    },
  }[direction];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${config.bgClass} ${config.colorClass}`}
      aria-label={config.label}
    >
      <span aria-hidden="true">{config.emoji}</span>
      <span className="sr-only">{config.label}</span>
    </span>
  );
}

/**
 * Single driver item in the tooltip list
 */
function DriverItem({ driver, index }: { driver: DriverSummary; index: number }) {
  return (
    <li className="flex items-start gap-2 py-1.5">
      <DirectionIndicator direction={driver.direction} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 leading-snug">
          {driver.description}
        </p>
        {driver.strength > 0 && (
          <div className="mt-1 flex items-center gap-2">
            <div 
              className="h-1 rounded-full bg-slate-700 w-16 overflow-hidden"
              role="progressbar"
              aria-valuenow={driver.strength}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Strength: ${driver.strength}%`}
            >
              <div 
                className={`h-full rounded-full transition-all ${
                  driver.direction === 'friction' 
                    ? 'bg-amber-500' 
                    : driver.direction === 'flow'
                    ? 'bg-emerald-500'
                    : 'bg-slate-500'
                }`}
                style={{ width: `${driver.strength}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500">{driver.strength}%</span>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * Energy quality badge
 */
function EnergyBadge({ quality, intensity }: { quality: string; intensity: string }) {
  const qualityConfig = {
    friction: { emoji: '⚡', colorClass: 'border-amber-600 text-amber-300' },
    flow: { emoji: '✨', colorClass: 'border-emerald-600 text-emerald-300' },
    mixed: { emoji: '🌊', colorClass: 'border-blue-600 text-blue-300' },
    quiet: { emoji: '🌙', colorClass: 'border-slate-600 text-slate-300' },
  }[quality] || { emoji: '◆', colorClass: 'border-slate-600 text-slate-400' };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${qualityConfig.colorClass}`}>
      <span aria-hidden="true">{qualityConfig.emoji}</span>
      <span className="capitalize">{intensity} {quality}</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BalanceMeterPopover({
  content,
  children,
  side = 'top',
  align = 'center',
  triggerClassName = '',
  disabled = false,
  showDebug = false,
}: BalanceMeterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Handle keyboard interaction
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
  }, []);

  // If disabled or no content, just render children
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`
            inline-flex items-center gap-1 rounded-md 
            transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900
            hover:bg-slate-800/50 cursor-pointer
            ${triggerClassName}
          `}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="Show what's driving this value"
        >
          {children}
          <svg 
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="
            z-50 w-80 max-w-[95vw] rounded-lg border border-slate-700 
            bg-slate-900 shadow-xl shadow-black/50
            animate-in fade-in-0 zoom-in-95 
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
            data-[side=bottom]:slide-in-from-top-2 
            data-[side=left]:slide-in-from-right-2 
            data-[side=right]:slide-in-from-left-2 
            data-[side=top]:slide-in-from-bottom-2
          "
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          role="dialog"
          aria-label="Balance Meter explanation"
        >
          {/* Header */}
          <div className="border-b border-slate-700 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-100">
                {content.headline}
              </h3>
              <EnergyBadge quality={content.energyQuality} intensity={content.intensity} />
            </div>
          </div>

          {/* Drivers List */}
          <div className="px-4 py-3">
            {content.drivers.length > 0 ? (
              <>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                  What's shaping this
                </p>
                <ul className="space-y-1" role="list">
                  {content.drivers.map((driver, i) => (
                    <DriverItem key={i} driver={driver} index={i} />
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No significant drivers active
              </p>
            )}
          </div>

          {/* Retrograde Note (if applicable) */}
          {content.retrogradeNote && (
            <div className="border-t border-slate-700 px-4 py-2">
              <p className="text-xs text-purple-300 flex items-center gap-1.5">
                <span aria-hidden="true">↩️</span>
                <span>{content.retrogradeNote}</span>
              </p>
            </div>
          )}

          {/* Debug Info (backstage only) */}
          {showDebug && content._debug && (
            <div className="border-t border-slate-700 bg-slate-950/50 px-4 py-2">
              <p className="text-[10px] text-slate-500 font-mono">
                DEBUG: {content._debug.totalAspects} aspects 
                ({content._debug.restrictiveCount}↓ {content._debug.harmoniousCount}↑)
                {content._debug.topDriver && (
                  <> | Top: {content._debug.topDriver.transit}→{content._debug.topDriver.natal} {content._debug.topDriver.aspect}</>
                )}
              </p>
            </div>
          )}

          {/* Arrow */}
          <Popover.Arrow className="fill-slate-700" width={12} height={6} />

          {/* Close button (for touch devices) */}
          <Popover.Close
            className="
              absolute top-2 right-2 p-1 rounded-md 
              text-slate-400 hover:text-slate-200 hover:bg-slate-800
              focus:outline-none focus:ring-2 focus:ring-indigo-500
            "
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ============================================================================
// CONVENIENCE WRAPPER FOR BALANCE METER VALUES
// ============================================================================

export interface BalanceMeterValueProps {
  /** The numeric value to display */
  value: number | null | undefined;
  /** Label for the value (e.g., "Magnitude", "Directional Bias") */
  label: string;
  /** Tooltip content explaining the value */
  tooltipContent: TooltipContent | null;
  /** Format function for the value */
  format?: (v: number) => string;
  /** Additional CSS classes for the value display */
  valueClassName?: string;
  /** Show + sign for positive values */
  showSign?: boolean;
}

/**
 * A Balance Meter value with integrated tooltip popover.
 * Use this to wrap individual magnitude/bias values.
 */
export function BalanceMeterValue({
  value,
  label,
  tooltipContent,
  format,
  valueClassName = '',
  showSign = false,
}: BalanceMeterValueProps) {
  const formatValue = (v: number): string => {
    if (format) return format(v);
    const formatted = v.toFixed(1);
    return showSign && v > 0 ? `+${formatted}` : formatted;
  };

  const displayValue = typeof value === 'number' ? formatValue(value) : '—';

  return (
    <BalanceMeterPopover content={tooltipContent}>
      <span className={`inline-flex items-center gap-1 ${valueClassName}`}>
        <span className="text-xs text-slate-400">{label}:</span>
        <span className="font-mono">{displayValue}</span>
      </span>
    </BalanceMeterPopover>
  );
}

export default BalanceMeterPopover;
