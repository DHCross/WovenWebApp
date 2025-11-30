import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useState, useRef, useEffect } from 'react';
import { parseCoordinates, formatDecimal } from '@/src/coords';
import type { Subject, TimePolicyChoice } from '../types';
import { onlyDigits, clampNumber } from '../utils/validation';
import { US_STATES, normalizeStateCode, getStateName } from '@/lib/geo/us-states';

interface PersonFormProps {
  idPrefix: 'a' | 'b';
  person: Subject;
  setPerson: Dispatch<SetStateAction<Subject>>;
  coordsInput: string;
  setCoordsInput: (value: string) => void;
  coordsError: string | null;
  setCoordsError: (value: string | null) => void;
  setCoordsValid: (value: boolean) => void;
  timezoneOptions: string[];
  allowUnknownTime: boolean;
  showTimePolicy: boolean;
  timePolicy?: TimePolicyChoice;
  onTimePolicyChange?: (policy: TimePolicyChoice) => void;
  timePolicyScopeLabel?: string;
  disabled?: boolean;
  coordinateLabel?: string;
  coordinatePlaceholder?: string;
  normalizedFallback?: string;
  requireName?: boolean;
  requireBirthDate?: boolean;
  requireTime?: boolean;
  requireLocation?: boolean;
  requireTimezone?: boolean;
  nameInputRef?: RefObject<HTMLInputElement>;
  infoNote?: string;
  skipParseWhenDisabled?: boolean;
  onNameFocus?: () => void; // New prop for handling name field focus
}

const padTwo = (value: number): string => {
  return value.toString().padStart(2, '0');
};

export function PersonForm({
  idPrefix,
  person,
  setPerson,
  coordsInput,
  setCoordsInput,
  coordsError,
  setCoordsError,
  setCoordsValid,
  timezoneOptions,
  allowUnknownTime,
  showTimePolicy,
  timePolicy,
  onTimePolicyChange,
  timePolicyScopeLabel,
  disabled = false,
  coordinateLabel = 'Birth Coordinates',
  coordinatePlaceholder = 'e.g., 40°42′N, 74°0′W or 40.7128, -74.006',
  normalizedFallback = '—',
  requireName = false,
  requireBirthDate = false,
  requireTime = false,
  requireLocation = false,
  requireTimezone = false,
  nameInputRef,
  infoNote = 'Nation assumed “US” for API compatibility.',
  skipParseWhenDisabled = false,
  onNameFocus,
}: PersonFormProps) {
  const updatePersonField = (field: keyof Subject, value: string | number) => {
    setPerson((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleHourBlur = (value: string) => {
    const digits = onlyDigits(value, 2);
    const clamped = clampNumber(digits, 0, 23);
    updatePersonField('hour', Number.isNaN(clamped) ? '' : padTwo(clamped));
  };

  const handleMinuteBlur = (value: string) => {
    const digits = onlyDigits(value, 2);
    const clamped = clampNumber(digits, 0, 59);
    updatePersonField('minute', Number.isNaN(clamped) ? '' : padTwo(clamped));
  };

  const handleMonthBlur = (value: string) => {
    const digits = onlyDigits(value, 2);
    const clamped = clampNumber(digits, 1, 12);
    updatePersonField('month', Number.isNaN(clamped) ? '' : padTwo(clamped));
  };

  const handleDayBlur = (value: string) => {
    const digits = onlyDigits(value, 2);
    const clamped = clampNumber(digits, 1, 31);
    updatePersonField('day', Number.isNaN(clamped) ? '' : padTwo(clamped));
  };

  const handleCoordinatesChange = (value: string) => {
    setCoordsInput(value);
    if (disabled && skipParseWhenDisabled) {
      return;
    }

    const parsed = parseCoordinates(value, { rejectZeroZero: true });
    if (parsed) {
      updatePersonField('latitude', parsed.lat as any);
      updatePersonField('longitude', parsed.lon as any);
      setCoordsError(null);
      setCoordsValid(true);
    } else {
      setCoordsError('Invalid coordinates');
      setCoordsValid(false);
    }
  };

  const normalizedCoords = () => {
    const lat = Number(person.latitude);
    const lon = Number(person.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return normalizedFallback;
    }
    return formatDecimal(lat, lon);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-name`} className="block text-[11px] uppercase tracking-wide text-slate-300">Name</label>
        <input
          id={`${idPrefix}-name`}
          ref={nameInputRef}
          placeholder={idPrefix === 'a' ? 'Your Name' : 'Their Name'}
          disabled={disabled}
          className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-center text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
          value={person.name}
          onChange={(event) => updatePersonField('name', event.target.value)}
          onFocus={onNameFocus}
          required={requireName}
        />
      </div>

      <div className="grid grid-cols-5 gap-2">
        <div>
          <label htmlFor={`${idPrefix}-year`} className="block text-[11px] uppercase tracking-wide text-slate-300">Year</label>
          <input
            id={`${idPrefix}-year`}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            className="mt-1 w-full min-w-[80px] h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
            value={String(person.year ?? '')}
            onChange={(event) => updatePersonField('year', onlyDigits(event.target.value, 4))}
            placeholder="YYYY"
            required={requireBirthDate}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-month`} className="block text-[11px] uppercase tracking-wide text-slate-300">Month</label>
          <input
            id={`${idPrefix}-month`}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-center text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
            value={String(person.month ?? '')}
            onChange={(event) => {
              const digits = onlyDigits(event.target.value, 2);
              if (!digits) {
                updatePersonField('month', '');
                return;
              }
              const numeric = Number(digits);
              if (digits === '0' || (numeric >= 1 && numeric <= 12)) {
                updatePersonField('month', digits);
              } else {
                const clamped = Math.min(12, Math.max(1, numeric));
                updatePersonField('month', String(clamped));
              }
            }}
            onBlur={(event) => handleMonthBlur(event.target.value)}
            placeholder="MM"
            required={requireBirthDate}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-day`} className="block text-[11px] uppercase tracking-wide text-slate-300">Day</label>
          <input
            id={`${idPrefix}-day`}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
            value={String(person.day ?? '')}
            onChange={(event) => {
              const digits = onlyDigits(event.target.value, 2);
              if (!digits) {
                updatePersonField('day', '');
                return;
              }
              const numeric = Number(digits);
              if (digits === '0' || (numeric >= 1 && numeric <= 31)) {
                updatePersonField('day', digits);
              } else {
                const clamped = Math.min(31, Math.max(1, numeric));
                updatePersonField('day', String(clamped));
              }
            }}
            onBlur={(event) => handleDayBlur(event.target.value)}
            placeholder="DD"
            required={requireBirthDate}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-hour`} className="block text-[11px] uppercase tracking-wide text-slate-300">Hour</label>
          <input
            id={`${idPrefix}-hour`}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
            value={String(person.hour ?? '')}
            onChange={(event) => {
              const digits = onlyDigits(event.target.value, 2);
              const clamped = clampNumber(digits, 0, 23);
              updatePersonField(
                'hour',
                Number.isNaN(clamped) ? digits : (clamped === Number(digits) ? digits : String(clamped))
              );
            }}
            onBlur={(event) => handleHourBlur(event.target.value)}
            placeholder="HH"
            required={requireTime && !allowUnknownTime}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-minute`} className="block text-[11px] uppercase tracking-wide text-slate-300">Minute</label>
          <input
            id={`${idPrefix}-minute`}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            className="mt-1 w-full min-w-[60px] h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
            value={String(person.minute ?? '')}
            onChange={(event) => {
              const digits = onlyDigits(event.target.value, 2);
              const clamped = clampNumber(digits, 0, 59);
              updatePersonField(
                'minute',
                Number.isNaN(clamped) ? digits : (clamped === Number(digits) ? digits : String(clamped))
              );
            }}
            onBlur={(event) => handleMinuteBlur(event.target.value)}
            placeholder="MM"
            required={requireTime && !allowUnknownTime}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-city`} className="block text-[11px] uppercase tracking-wide text-slate-300">City</label>
        <input
          id={`${idPrefix}-city`}
          disabled={disabled}
          className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
          value={person.city}
          onChange={(event) => updatePersonField('city', event.target.value)}
          required={requireLocation}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-state`} className="block text-[11px] uppercase tracking-wide text-slate-300">State / Province</label>
        <StateCombobox
          id={`${idPrefix}-state`}
          value={person.state}
          onChange={(val) => updatePersonField('state', val)}
          disabled={disabled}
          required={requireLocation}
        />
        <p className="mt-1 text-[11px] text-slate-500">{infoNote}</p>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-coords`} className="block text-[11px] uppercase tracking-wide text-slate-300">{coordinateLabel}</label>
        <input
          id={`${idPrefix}-coords`}
          type="text"
          disabled={disabled}
          className={`mt-1 w-full rounded-md border bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 ${coordsError ? 'border-red-600' : 'border-slate-600'}`}
          value={coordsInput}
          onChange={(event) => handleCoordinatesChange(event.target.value)}
          placeholder={coordinatePlaceholder}
          required={requireLocation}
        />
        <p className="mt-1 text-xs text-slate-400">
          Examples: 40°42′N, 74°0′W · 34°3′S, 18°25′E · 40.7128, -74.006
        </p>
        {coordsError ? (
          <p className="mt-1 text-xs text-red-400">{coordsError}</p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Normalized: {normalizedCoords()}</p>
        )}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-tz`} className="block text-[11px] uppercase tracking-wide text-slate-300">Timezone</label>
        <select
          id={`${idPrefix}-tz`}
          disabled={disabled}
          className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
          value={person.timezone}
          onChange={(event) => updatePersonField('timezone', event.target.value)}
          required={requireTimezone}
        >
          {timezoneOptions.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-zodiac`} className="block text-[11px] uppercase tracking-wide text-slate-300">Zodiac Type</label>
        <select
          id={`${idPrefix}-zodiac`}
          disabled={disabled}
          className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 disabled:opacity-50"
          value={person.zodiac_type}
          onChange={(event) => updatePersonField('zodiac_type', event.target.value)}
        >
          <option value="Tropic">Tropic</option>
          <option value="Sidereal">Sidereal</option>
        </select>
      </div>

      {showTimePolicy && timePolicy && onTimePolicyChange && (
        <div className="sm:col-span-2">
          <fieldset className="rounded-md border border-slate-700 bg-slate-900/50 p-3">
            <legend className="px-1 text-xs font-medium text-slate-200">Birth time policy</legend>
            <p className="mt-1 text-[11px] text-slate-400">
              Applies to {timePolicyScopeLabel || 'any chart without a recorded birth time'}.
              Choose how Math Brain should treat houses/angles when an exact birth time is missing.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <TimePolicyOption
                label="Planetary-only"
                description="No houses/angles; tightest, falsifiable geometry"
                value="planetary_only"
                active={timePolicy === 'planetary_only'}
                name={`time-policy-${idPrefix}`}
                onSelect={onTimePolicyChange}
              />
              <TimePolicyOption
                label="Whole-sign houses"
                description="House semantics without exact time; angles still suppressed"
                value="whole_sign"
                active={timePolicy === 'whole_sign'}
                name={`time-policy-${idPrefix}`}
                onSelect={onTimePolicyChange}
              />
              <TimePolicyOption
                label="Sensitivity scan"
                description="Test a window of possible times; house-dependent insights flagged"
                value="sensitivity_scan"
                active={timePolicy === 'sensitivity_scan'}
                name={`time-policy-${idPrefix}`}
                onSelect={onTimePolicyChange}
              />
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}

interface TimePolicyOptionProps {
  label: string;
  description: string;
  value: TimePolicyChoice;
  active: boolean;
  name: string;
  onSelect: (value: TimePolicyChoice) => void;
}

function TimePolicyOption({ label, description, value, active, onSelect, name }: TimePolicyOptionProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-xs ${
        active
          ? 'border-indigo-600 bg-indigo-900/20 text-slate-100'
          : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
      }`}
    >
      <input
        type="radio"
        name={name}
        className="mt-0.5"
        checked={active}
        onChange={() => onSelect(value)}
      />
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-slate-400">{description}</div>
      </div>
    </label>
  );
}

// --- State Combobox: dropdown with filter + free-text fallback ---
interface StateComboboxProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

function StateCombobox({ id, value, onChange, disabled, required }: StateComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Display value: show code if normalized, else raw
  const displayValue = (() => {
    const code = normalizeStateCode(value);
    if (code) {
      const name = getStateName(code);
      return name ? `${code} — ${name}` : code;
    }
    return value;
  })();

  // Filter options based on input
  const filteredOptions = US_STATES.filter((s) => {
    const q = filter.toLowerCase();
    return (
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
    );
  });

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightIdx(0);
  }, [filter]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFilter('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setFilter('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFilter(val);
    // Also update the actual value for free-text (international)
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) {
      e.preventDefault();
      handleSelect(filteredOptions[highlightIdx].code);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setFilter('');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        disabled={disabled}
        required={required}
        className="mt-1 w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
        value={isOpen ? filter : displayValue}
        placeholder="FL or Florida"
        onFocus={() => {
          setIsOpen(true);
          setFilter(value); // Start with current value so user can refine
        }}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-600 bg-slate-900 shadow-lg">
          {filteredOptions.map((opt, idx) => (
            <li
              key={opt.code}
              className={`cursor-pointer px-3 py-2 text-sm ${
                idx === highlightIdx
                  ? 'bg-indigo-700 text-white'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
              onMouseEnter={() => setHighlightIdx(idx)}
              onMouseDown={() => handleSelect(opt.code)}
            >
              <span className="font-medium">{opt.code}</span>
              <span className="ml-2 text-slate-400">— {opt.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PersonForm;
