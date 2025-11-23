'use client';

import React, { useEffect, useState } from 'react';

const ADMIN_EMAIL = 'MY_EMAIL';

const badgeColor = (value, type) => {
  if (value == null || Number.isNaN(value)) return 'bg-gray-700 text-gray-200';
  if (type === 'ai') return value > 50 ? 'bg-green-600 text-white' : 'bg-red-600 text-white';
  if (type === 'human') return 'bg-blue-600 text-white';
  return 'bg-yellow-500 text-black';
};

export default function VelocityWidget({ session }) {
  const allowed = session?.user?.email === ADMIN_EMAIL;
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || data || loading) return;
    setLoading(true);
    setError(null);
    fetch('/api/velocity')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Velocity API responded ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        setData(json || {});
      })
      .catch((err) => setError(err.message || 'Failed to load velocity'))
      .finally(() => setLoading(false));
  }, [open, data, loading]);

  if (!allowed) return null;

  const aiRate = Number(data?.ai_survival_rate ?? data?.ai_survival ?? data?.ai_rate);
  const humanRate = Number(data?.human_survival_rate ?? data?.human_survival ?? data?.human_rate);
  const churnRisk = Number(data?.churn_risk ?? data?.churn_risk_score ?? data?.churn);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-xl text-amber-300 shadow-lg transition hover:bg-slate-700"
        aria-label="Toggle velocity widget"
      >
        ⚡
      </button>

      {open && (
        <div className="w-64 rounded-lg border border-slate-700 bg-slate-900/90 p-3 text-sm text-slate-200 shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-400">Velocity</span>
            {loading && <span className="text-[10px] text-slate-500">Loading…</span>}
          </div>

          {error && <div className="mb-2 text-xs text-red-400">{error}</div>}

          {!error && (
            <div className="space-y-2">
              <MetricRow
                label="AI Survival Rate"
                value={Number.isFinite(aiRate) ? `${aiRate.toFixed(1)}%` : '—'}
                className={badgeColor(aiRate, 'ai')}
              />
              <MetricRow
                label="Human Survival Rate"
                value={Number.isFinite(humanRate) ? `${humanRate.toFixed(1)}%` : '—'}
                className={badgeColor(humanRate, 'human')}
              />
              <MetricRow
                label="Churn Risk"
                value={Number.isFinite(churnRisk) ? `${churnRisk.toFixed(1)}%` : '—'}
                className={badgeColor(churnRisk, 'churn')}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, className }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`rounded px-2 py-1 text-xs font-semibold ${className}`}>{value}</span>
    </div>
  );
}
