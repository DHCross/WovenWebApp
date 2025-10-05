'use client';

interface ReadinessCheckItem {
  label: string;
  status: 'complete' | 'incomplete' | 'optional';
  detail?: string;
}

interface WovenMapReadinessProps {
  personA: {
    hasDate: boolean;
    hasTime: boolean;
    hasLocation: boolean;
  };
  personB?: {
    hasDate: boolean;
    hasTime: boolean;
    hasLocation: boolean;
  } | null;
  transitWindow: {
    configured: boolean;
    startDate?: string;
    endDate?: string;
  };
  mode: 'solo' | 'relational' | 'undetermined';
  onAddBirthData?: () => void;
  onAddSecondChart?: () => void;
  onSetTransitRange?: () => void;
  onRunNatalMirror?: () => void;
}

export function WovenMapReadiness({
  personA,
  personB,
  transitWindow,
  mode,
  onAddBirthData,
  onAddSecondChart,
  onSetTransitRange,
  onRunNatalMirror,
}: WovenMapReadinessProps) {
  const personAComplete = personA.hasDate && personA.hasTime && personA.hasLocation;
  const personBComplete = personB
    ? personB.hasDate && personB.hasTime && personB.hasLocation
    : false;

  const canRunNatalMirror = personAComplete;
  const canRunRelationalMirror = personAComplete && personBComplete;
  const canRunBalanceMeter = (personAComplete || canRunRelationalMirror) && transitWindow.configured;

  const personAChecks: ReadinessCheckItem[] = [
    {
      label: 'Birth date',
      status: personA.hasDate ? 'complete' : 'incomplete',
    },
    {
      label: 'Birth time',
      status: personA.hasTime ? 'complete' : 'incomplete',
      detail: !personA.hasTime ? 'Required for houses/angles' : undefined,
    },
    {
      label: 'Birth location',
      status: personA.hasLocation ? 'complete' : 'incomplete',
      detail: !personA.hasLocation ? 'Required for chart calculation' : undefined,
    },
  ];

  const personBChecks: ReadinessCheckItem[] = personB
    ? [
        {
          label: 'Birth date',
          status: personB.hasDate ? 'complete' : 'incomplete',
        },
        {
          label: 'Birth time',
          status: personB.hasTime ? 'complete' : 'incomplete',
        },
        {
          label: 'Birth location',
          status: personB.hasLocation ? 'complete' : 'incomplete',
        },
      ]
    : [];

  const transitCheck: ReadinessCheckItem = {
    label: 'Transit window',
    status: transitWindow.configured ? 'complete' : 'optional',
    detail: transitWindow.configured
      ? `${transitWindow.startDate} → ${transitWindow.endDate}`
      : 'Optional: Required for Balance Meter / Symbolic Weather',
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-100">Chart Readiness</h3>
          <p className="mt-1 text-sm text-slate-400">
            {canRunBalanceMeter
              ? '✅ Ready for Balance Meter with Symbolic Weather'
              : canRunRelationalMirror
              ? '✅ Ready for Relational Mirror (natal-only)'
              : canRunNatalMirror
              ? '✅ Ready for Solo Mirror (natal-only)'
              : 'Complete birth data to generate chart'}
          </p>
        </div>
        <div className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1 text-xs text-slate-300">
          Mode: {mode === 'relational' ? 'Relational' : mode === 'solo' ? 'Solo' : 'Undetermined'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Person A */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="text-sm font-medium text-slate-200">Person A</div>
            {personAComplete && (
              <div className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-300">
                Complete
              </div>
            )}
          </div>
          <div className="space-y-2">
            {personAChecks.map((check, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="mt-0.5">
                  {check.status === 'complete' ? (
                    <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-300">{check.label}</div>
                  {check.detail && <div className="text-xs text-slate-500">{check.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Person B or Placeholder */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="text-sm font-medium text-slate-200">Person B</div>
            {personB ? (
              personBComplete && (
                <div className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-300">
                  Complete
                </div>
              )
            ) : (
              <div className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                Optional
              </div>
            )}
          </div>
          {personB ? (
            <div className="space-y-2">
              {personBChecks.map((check, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {check.status === 'complete' ? (
                      <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-300">{check.label}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              Enable &ldquo;Include Person B&rdquo; above for relational analysis
            </div>
          )}
        </div>
      </div>

      {/* Transit Window */}
      <div className="mt-4 border-t border-slate-700 pt-4">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">
            {transitCheck.status === 'complete' ? (
              <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm text-slate-300">{transitCheck.label}</div>
            <div className="text-xs text-slate-400">{transitCheck.detail}</div>
          </div>
        </div>
      </div>

      {/* What You Can Run Now */}
      <div className="mt-6 rounded-md border border-slate-700 bg-slate-900/50 p-4">
        <div className="mb-3 text-sm font-medium text-slate-200">What you can run now:</div>
        <div className="space-y-2">
          {canRunBalanceMeter && (
            <div className="flex items-start gap-2">
              <div className="mt-1 text-emerald-400">✓</div>
              <div className="flex-1">
                <div className="text-sm text-slate-300">
                  Balance Meter with Symbolic Weather
                </div>
                <div className="text-xs text-slate-500">
                  Foundation chart + transit overlay = full diagnostic
                </div>
              </div>
            </div>
          )}
          {canRunRelationalMirror && (
            <div className="flex items-start gap-2">
              <div className="mt-1 text-emerald-400">✓</div>
              <div className="flex-1">
                <div className="text-sm text-slate-300">Relational Mirror (natal-only)</div>
                <div className="text-xs text-slate-500">
                  Solo mirrors for both people + relational engines (synastry/composite)
                </div>
              </div>
            </div>
          )}
          {canRunNatalMirror && !canRunRelationalMirror && (
            <div className="flex items-start gap-2">
              <div className="mt-1 text-emerald-400">✓</div>
              <div className="flex-1">
                <div className="text-sm text-slate-300">Solo Mirror (natal-only)</div>
                <div className="text-xs text-slate-500">
                  Blueprint: How your system tends to move
                </div>
              </div>
            </div>
          )}
          {!canRunNatalMirror && (
            <div className="flex items-start gap-2">
              <div className="mt-1 text-slate-500">○</div>
              <div className="flex-1">
                <div className="text-sm text-slate-400">
                  Complete Person A birth data to generate chart
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Constraint Notice */}
      <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 p-3">
        <div className="flex gap-2">
          <div className="text-amber-400">ℹ️</div>
          <div className="flex-1 text-xs text-amber-200/90">
            <strong>Symbolic Weather Constraint:</strong> Weather language (Balance Meter metrics,
            seismograph trends) requires a transit window. Natal-only reports show your constitutional
            blueprint without time-based activations.
          </div>
        </div>
      </div>
    </div>
  );
}

export default WovenMapReadiness;
