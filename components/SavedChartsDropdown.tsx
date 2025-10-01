"use client";

import { useState } from 'react';
import { getSavedCharts, deleteChart, type SavedChart } from '../lib/saved-charts';

interface SavedChartsDropdownProps {
  onSelectChart: (chart: SavedChart) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export default function SavedChartsDropdown({
  onSelectChart,
  label = "Saved Charts",
  placeholder = "Select a saved chart...",
  className = "",
}: SavedChartsDropdownProps) {
  const [charts, setCharts] = useState<SavedChart[]>(() => getSavedCharts());
  const [selectedId, setSelectedId] = useState<string>('');

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chartId = e.target.value;
    setSelectedId(chartId);

    if (chartId) {
      const chart = charts.find(c => c.id === chartId);
      if (chart) {
        onSelectChart(chart);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this saved chart?')) {
      deleteChart(id);
      const updated = getSavedCharts();
      setCharts(updated);
      if (selectedId === id) {
        setSelectedId('');
      }
    }
  };

  const refreshCharts = () => {
    const updated = getSavedCharts();
    setCharts(updated);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="saved-charts-select" className="block text-sm text-slate-300">
          {label}
        </label>
        <button
          type="button"
          onClick={refreshCharts}
          className="text-xs text-indigo-400 hover:text-indigo-300"
          title="Refresh list"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="flex gap-2">
        <select
          id="saved-charts-select"
          value={selectedId}
          onChange={handleSelect}
          className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <option value="">{placeholder}</option>
          {charts.map((chart) => (
            <option key={chart.id} value={chart.id}>
              {chart.name} ({chart.person.name || 'Unnamed'})
            </option>
          ))}
        </select>

        {selectedId && (
          <button
            type="button"
            onClick={() => handleDelete(selectedId)}
            className="rounded-md border border-red-600/50 bg-red-950/20 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500"
            title="Delete selected chart"
          >
            Delete
          </button>
        )}
      </div>

      {charts.length === 0 && (
        <p className="mt-2 text-xs text-slate-400 italic">
          No saved charts yet. Fill in the form and click "Save Chart" to create one.
        </p>
      )}

      {charts.length > 0 && (
        <p className="mt-1 text-xs text-slate-400">
          {charts.length} saved chart{charts.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
