"use client";

interface ScenarioOption {
  id: string;
  label: string;
  description: string;
}

interface ScenarioSelectorProps {
  scenarios: readonly ScenarioOption[];
  selected: ScenarioOption['id'];
  onChange: (scenarioId: ScenarioOption['id']) => void;
}

export default function ScenarioSelector({ scenarios, selected, onChange }: ScenarioSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {scenarios.map((scenario) => {
        const isActive = scenario.id === selected;
        const baseClasses = 'group h-full rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';
        const restClasses = isActive
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-slate-700 bg-slate-900/60 hover:border-indigo-500 hover:bg-slate-900/80';
        return (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onChange(scenario.id)}
            className={`${baseClasses} ${restClasses}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-100">{scenario.label}</span>
              {isActive && (
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300">
                  Active
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{scenario.description}</p>
          </button>
        );
      })}
    </div>
  );
}
