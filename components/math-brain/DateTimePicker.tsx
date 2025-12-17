'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface DateTimePickerProps {
  date: Date | null;
  time: { hour: number; minute: number } | null;
  onDateChange: (date: Date | null) => void;
  onTimeChange: (time: { hour: number; minute: number } | null) => void;
  disabled?: boolean;
  className?: string;
}

// Generate year options (1900 to current year + 1)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  disabled = false,
  className = '',
}: DateTimePickerProps) {
  // Local state for the pickers
  const [selectedYear, setSelectedYear] = useState<number | null>(date?.getFullYear() ?? null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(date ? date.getMonth() : null);
  const [selectedDay, setSelectedDay] = useState<number | null>(date?.getDate() ?? null);
  const [selectedHour, setSelectedHour] = useState<number>(time?.hour ?? 12);
  const [selectedMinute, setSelectedMinute] = useState<number>(time?.minute ?? 0);
  const [isPM, setIsPM] = useState<boolean>((time?.hour ?? 12) >= 12);

  // Sync local state with props
  useEffect(() => {
    if (date) {
      setSelectedYear(date.getFullYear());
      setSelectedMonth(date.getMonth());
      setSelectedDay(date.getDate());
    }
  }, [date]);

  useEffect(() => {
    if (time) {
      const hour12 = time.hour % 12 || 12;
      setSelectedHour(hour12);
      setSelectedMinute(time.minute);
      setIsPM(time.hour >= 12);
    }
  }, [time]);

  // Days available for selected month
  const daysInMonth = selectedYear !== null && selectedMonth !== null 
    ? getDaysInMonth(selectedYear, selectedMonth) 
    : 31;
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Update date when year/month/day changes
  const updateDate = useCallback((year: number | null, month: number | null, day: number | null) => {
    if (year !== null && month !== null && day !== null) {
      // Clamp day to valid range for the month
      const maxDay = getDaysInMonth(year, month);
      const validDay = Math.min(day, maxDay);
      onDateChange(new Date(year, month, validDay));
    } else {
      onDateChange(null);
    }
  }, [onDateChange]);

  // Update time when hour/minute/ampm changes
  const updateTime = useCallback((hour12: number, minute: number, pm: boolean) => {
    let hour24 = hour12;
    if (pm && hour12 !== 12) {
      hour24 = hour12 + 12;
    } else if (!pm && hour12 === 12) {
      hour24 = 0;
    }
    onTimeChange({ hour: hour24, minute });
  }, [onTimeChange]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    updateDate(year, selectedMonth, selectedDay);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    // Clamp day if needed
    const maxDay = selectedYear !== null ? getDaysInMonth(selectedYear, month) : 31;
    const clampedDay = selectedDay !== null ? Math.min(selectedDay, maxDay) : null;
    if (clampedDay !== selectedDay) {
      setSelectedDay(clampedDay);
    }
    updateDate(selectedYear, month, clampedDay ?? selectedDay);
  };

  const handleDayChange = (day: number) => {
    setSelectedDay(day);
    updateDate(selectedYear, selectedMonth, day);
  };

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour);
    updateTime(hour, selectedMinute, isPM);
  };

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute);
    updateTime(selectedHour, minute, isPM);
  };

  const handlePMChange = (pm: boolean) => {
    setIsPM(pm);
    updateTime(selectedHour, selectedMinute, pm);
  };

  const selectClass = `
    px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-100 
    focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 outline-none 
    transition cursor-pointer appearance-none
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Date Section */}
      <div>
        <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
          Birth Date
        </label>
        <div className="grid grid-cols-3 gap-2">
          {/* Month */}
          <select
            value={selectedMonth ?? ''}
            onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
            disabled={disabled}
            className={selectClass}
          >
            <option value="" disabled>Month</option>
            {MONTHS.map((month, i) => (
              <option key={month} value={i}>{month}</option>
            ))}
          </select>

          {/* Day */}
          <select
            value={selectedDay ?? ''}
            onChange={(e) => handleDayChange(parseInt(e.target.value, 10))}
            disabled={disabled || selectedMonth === null}
            className={selectClass}
          >
            <option value="" disabled>Day</option>
            {DAYS.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>

          {/* Year */}
          <select
            value={selectedYear ?? ''}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            disabled={disabled}
            className={selectClass}
          >
            <option value="" disabled>Year</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Time Section */}
      <div>
        <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
          Birth Time
        </label>
        <div className="flex gap-2 items-center">
          {/* Hour */}
          <select
            value={selectedHour}
            onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
            disabled={disabled}
            className={`${selectClass} w-20`}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
              <option key={hour} value={hour}>{hour}</option>
            ))}
          </select>

          <span className="text-slate-500 text-lg">:</span>

          {/* Minute */}
          <select
            value={selectedMinute}
            onChange={(e) => handleMinuteChange(parseInt(e.target.value, 10))}
            disabled={disabled}
            className={`${selectClass} w-20`}
          >
            {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
              <option key={minute} value={minute}>
                {minute.toString().padStart(2, '0')}
              </option>
            ))}
          </select>

          {/* AM/PM Toggle */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => handlePMChange(false)}
              disabled={disabled}
              className={`px-3 py-2 text-sm font-medium transition ${
                !isPM
                  ? 'bg-emerald-500/20 text-emerald-300 border-r border-emerald-500/30'
                  : 'bg-slate-800/80 text-slate-500 border-r border-slate-700 hover:text-slate-300'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handlePMChange(true)}
              disabled={disabled}
              className={`px-3 py-2 text-sm font-medium transition ${
                isPM
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800/80 text-slate-500 hover:text-slate-300'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* Quick preview */}
      {date && (
        <div className="text-center pt-2">
          <p className="text-sm text-slate-400">
            {date.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            {' at '}
            {selectedHour}:{selectedMinute.toString().padStart(2, '0')} {isPM ? 'PM' : 'AM'}
          </p>
        </div>
      )}
    </div>
  );
}

export default DateTimePicker;
