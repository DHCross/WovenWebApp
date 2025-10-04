import type { FocusEvent, TouchEvent } from 'react';
import { parseCoordinates, formatDecimal } from '../../src/coords';
import type {
  ModeOption,
  RelocationOptionConfig,
  RelocationStatus,
  ReportMode,
  TranslocationOption,
} from '../types';

type WeeklyAgg = 'mean' | 'max';

interface TransitControlsProps {
  includeTransits: boolean;
  onIncludeTransitsChange: (value: boolean) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onUserHasSetDatesChange: (value: boolean) => void;
  onDateFocus: (event: FocusEvent<HTMLInputElement>) => void;
  onDateTouchStart: (event: TouchEvent<HTMLInputElement>) => void;
  step: string;
  onStepChange: (value: string) => void;
  mode: ReportMode;
  onModeChange: (value: string) => void;
  soloModeOption: ModeOption;
  relationalModeOptions: ModeOption[];
  includePersonB: boolean;
  isRelationalMode: boolean;
  translocation: TranslocationOption;
  onTranslocationChange: (value: string) => void;
  relocationOptions: RelocationOptionConfig[];
  relocationLabels: Record<TranslocationOption, string>;
  relocationStatus: RelocationStatus;
  relocationModeCaption: Record<TranslocationOption, string>;
  relocInput: string;
  onRelocInputChange: (value: string) => void;
  relocCoords: { lat: number; lon: number } | null;
  onRelocCoordsChange: (coords: { lat: number; lon: number } | null) => void;
  relocError: string | null;
  onRelocErrorChange: (value: string | null) => void;
  relocLabel: string;
  onRelocLabelChange: (value: string) => void;
  relocTz: string;
  onRelocTzChange: (value: string) => void;
  tzOptions: string[];
  weeklyAgg: WeeklyAgg;
  onWeeklyAggChange: (value: WeeklyAgg) => void;
  personATimezone: string;
}

const ACTIVE_RELOCATION_MODES: TranslocationOption[] = ['A_LOCAL', 'B_LOCAL', 'BOTH_LOCAL', 'MIDPOINT'];

export function TransitControls(props: TransitControlsProps) {
  const {
    includeTransits,
    onIncludeTransitsChange,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onUserHasSetDatesChange,
    onDateFocus,
    onDateTouchStart,
    step,
    onStepChange,
    mode,
    onModeChange,
    soloModeOption,
    relationalModeOptions,
    includePersonB,
    isRelationalMode,
    translocation,
    onTranslocationChange,
    relocationOptions,
    relocationLabels,
    relocationStatus,
    relocationModeCaption,
    relocInput,
    onRelocInputChange,
    relocCoords,
    onRelocCoordsChange,
    relocError,
    onRelocErrorChange,
    relocLabel,
    onRelocLabelChange,
    relocTz,
    onRelocTzChange,
    tzOptions,
    weeklyAgg,
    onWeeklyAggChange,
    personATimezone,
  } = props;

  const handleRelocInputChange = (value: string) => {
    onRelocInputChange(value);
    const parsed = parseCoordinates(value, { rejectZeroZero: true });
    if (parsed) {
      onRelocCoordsChange(parsed);
      onRelocErrorChange(null);
    } else {
      onRelocCoordsChange(null);
      onRelocErrorChange('Invalid coordinates');
    }
  };

  const relocNormalized = relocCoords ? formatDecimal(relocCoords.lat, relocCoords.lon) : '—';
  const showRelocationInputs = includeTransits && !['NONE', 'A_NATAL', 'B_NATAL'].includes(translocation);
  const relocationActive = ACTIVE_RELOCATION_MODES.includes(relocationStatus.effectiveMode);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-3">
          <input
            id="include-transits"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
            checked={includeTransits}
            onChange={(event) => onIncludeTransitsChange(event.target.checked)}
          />
          <div>
            <label htmlFor="include-transits" className="block text-sm font-medium text-slate-100">
              Include Transits
            </label>
            <p className="mt-1 text-xs text-slate-400">
              Layer symbolic weather over your chosen report type (Mirror → Balance Meter).
            </p>
          </div>
        </div>

        {includeTransits && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="t-start" className="block text-sm text-slate-300">Start Date</label>
              <input
                id="t-start"
                type="date"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={startDate}
                onChange={(event) => {
                  onStartDateChange(event.target.value);
                  onUserHasSetDatesChange(true);
                }}
                style={{ WebkitAppearance: 'none', appearance: 'none' }}
                onFocus={onDateFocus}
                onTouchStart={onDateTouchStart}
              />
            </div>
            <div>
              <label htmlFor="t-end" className="block text-sm text-slate-300">End Date</label>
              <input
                id="t-end"
                type="date"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={endDate}
                onChange={(event) => {
                  onEndDateChange(event.target.value);
                  onUserHasSetDatesChange(true);
                }}
                style={{ WebkitAppearance: 'none', appearance: 'none' }}
                onFocus={onDateFocus}
                onTouchStart={onDateTouchStart}
              />
            </div>
            <div>
              <label htmlFor="t-step" className="block text-sm text-slate-300">Step</label>
              <select
                id="t-step"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={step}
                onChange={(event) => onStepChange(event.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-1 gap-4 ${includeTransits ? 'sm:grid-cols-2' : ''}`}>
          <div>
            <label htmlFor="t-mode" className="block text-sm text-slate-300">Mode</label>
            <select
              id="t-mode"
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              value={mode}
              onChange={(event) => onModeChange(event.target.value)}
            >
              <optgroup label="Solo">
                <option value={soloModeOption.value}>{soloModeOption.label}</option>
              </optgroup>
              {includePersonB && relationalModeOptions.length > 0 && (
                <optgroup label="Relational">
                  {relationalModeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {!includePersonB && (
              <p className="mt-1 text-xs text-slate-400">
                Enable “Include Person B” to unlock synastry or composite modes.
              </p>
            )}
            {!includePersonB && isRelationalMode && (
              <p className="mt-1 text-xs text-amber-400">
                Selecting a relational mode will enable “Include Person B”.
              </p>
            )}
          </div>

          {includeTransits && (
            <div>
              <label htmlFor="t-reloc" className="block text-sm text-slate-300">Relocation (angles/houses)</label>
              <select
                id="t-reloc"
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={translocation}
                onChange={(event) => onTranslocationChange(event.target.value)}
              >
                {relocationOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    title={option.title}
                  >
                    {relocationLabels[option.value]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Relocation remaps houses/angles only; planets stay fixed. Choose the lens that fits this report.
              </p>
              {mode === 'COMPOSITE_TRANSITS' && (
                <p className="mt-1 text-xs text-emerald-300">
                  Experimental — bond midpoint, not a physical place.
                </p>
              )}
              {relocationStatus.notice && (
                <p className="mt-1 text-xs text-amber-400">{relocationStatus.notice}</p>
              )}
              {relocationActive ? (
                <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-200">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                  <span className="font-medium">{relocationModeCaption[relocationStatus.effectiveMode]}</span>
                  <span className="text-emerald-100">Lens: {relocationStatus.effectiveMode === 'MIDPOINT' ? 'Computed midpoint (A + B)' : relocLabel || 'Custom'}</span>
                  <span className="text-emerald-300">({relocationStatus.effectiveMode === 'MIDPOINT' ? personATimezone || '—' : relocTz || personATimezone || '—'})</span>
                </div>
              ) : (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-200">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                  <span>{relocationModeCaption[relocationStatus.effectiveMode]}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {!includeTransits && (
          <p className="text-xs text-slate-400">
            Relocation options appear when transits are included.
          </p>
        )}
      </div>

      {showRelocationInputs && (
        <div className="mt-4">
          <label htmlFor="t-reloc-coords" className="block text-sm text-slate-300">Relocation Coordinates</label>
          <input
            id="t-reloc-coords"
            type="text"
            className={`mt-1 w-full h-10 rounded-md border bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${relocError ? 'border-red-600' : 'border-slate-600'}`}
            value={relocInput}
            onChange={(event) => handleRelocInputChange(event.target.value)}
            placeholder="e.g., 30°10′N, 85°40′W"
          />
          <p className="mt-1 text-xs text-slate-400">
            Default: 30°10′N, 85°40′W · Normalized: {relocNormalized}
          </p>
          {relocError && <p className="mt-1 text-xs text-red-400">{relocError}</p>}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="t-reloc-label" className="block text-sm text-slate-300">Relocation Label</label>
              <input
                id="t-reloc-label"
                type="text"
                className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={relocLabel}
                onChange={(event) => onRelocLabelChange(event.target.value)}
                placeholder="e.g., Panama City, FL"
              />
            </div>
            <div>
              <label htmlFor="t-reloc-tz" className="block text-sm text-slate-300">Relocation Timezone</label>
              <select
                id="t-reloc-tz"
                className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={relocTz}
                onChange={(event) => onRelocTzChange(event.target.value)}
              >
                {tzOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {includeTransits && step === 'weekly' && (
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-slate-400">Weekly aggregation</span>
          <div className="relative group">
            <button
              type="button"
              className="h-5 w-5 rounded-full border border-slate-600 text-[11px] text-slate-300 hover:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Help: Weekly aggregation semantics"
            >
              ?
            </button>
            <div className="absolute bottom-6 left-1/2 w-[280px] -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
              <div>
                <div className="mb-2 font-semibold text-indigo-300">Weekly Aggregation Methods</div>
                <div className="space-y-2">
                  <div>
                    <strong className="text-green-300">Mean:</strong> Average of daily values per week
                    <div className="mt-0.5 text-[10px] text-slate-400">Best for understanding typical weekly patterns</div>
                  </div>
                  <div>
                    <strong className="text-orange-300">Max:</strong> Highest daily value per week
                    <div className="mt-0.5 text-[10px] text-slate-400">Best for tracking peak intensity moments</div>
                  </div>
                </div>
                <div className="mt-2 border-t border-slate-700 pt-2 text-[10px] text-slate-400">
                  For seismograph analysis: Mean shows flow, Max shows spikes
                </div>
              </div>
              <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
            </div>
          </div>
          <div role="group" aria-label="Weekly aggregation" className="inline-flex overflow-hidden rounded-md border border-slate-700 bg-slate-800">
            <button
              type="button"
              onClick={() => onWeeklyAggChange('mean')}
              className={`px-3 py-1 text-xs ${weeklyAgg === 'mean' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
            >
              Mean
            </button>
            <button
              type="button"
              onClick={() => onWeeklyAggChange('max')}
              className={`px-3 py-1 text-xs ${weeklyAgg === 'max' ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
            >
              Max
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default TransitControls;
