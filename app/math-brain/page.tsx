
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';

import PersonForm from './components/PersonForm';
import TransitControls from './components/TransitControls';
import DownloadControls from './components/DownloadControls';
import useChartExport from './hooks/useChartExport';
import { getReport } from '@/lib/api/jules';
import { WovenMap, Person, RelocationStatus, ReportMode } from '@/lib/types/woven-map-blueprint';
import { Section } from '@/components/Section';

const RELATIONAL_MODES: ReportMode[] = ['SYNASTRY_TRANSITS', 'COMPOSITE_TRANSITS'];

export default function MathBrainPage() {
  const [personA, setPersonA] = useState<Person>({ name: 'Person A', birth_date: '', birth_time: '', city: '', state: '', country: '' });
  const [personB, setPersonB] = useState<Person>({ name: 'Person B', birth_date: '', birth_time: '', city: '', state: '', country: '' });
  const [transitDate, setTransitDate] = useState('');
  const [includeTransits, setIncludeTransits] = useState(false);
  const [relocationStatus, setRelocationStatus] = useState<RelocationStatus>({ enabled: false, mode: 'NATAL', city: '', state: '', country: '' });
  const [mode, setMode] = useState<ReportMode>('NATAL_DEFAULT');
  const [result, setResult] = useState<WovenMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    setAuthReady(true);
  }, []);

  const {
    pdfGenerating,
    markdownGenerating,
    weatherJsonGenerating,
    graphsPdfGenerating,
    engineConfigGenerating,
    cleanJsonGenerating,
    onDownloadPDF,
    onDownloadMarkdown,
    onDownloadSymbolicWeather,
    onDownloadGraphsPDF,
    onDownloadEngineConfig,
    onDownloadCleanJSON,
  } = useChartExport(result, mode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = await getAccessTokenSilently();
      const report = await getReport({
        personA,
        personB,
        transitDate,
        includeTransits,
        relocationStatus,
        mode,
      }, token);
      setResult(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToPoetic = () => {
    if (result) {
      sessionStorage.setItem('wovenMapResult', JSON.stringify(result));
      router.push('/poetic-brain');
    }
  };

  const classifyMagnitude = (mag: number) => {
    if (mag >= 4) return { badge: 'V-HI', label: 'Very High' };
    if (mag >= 3) return { badge: 'HI', label: 'High' };
    if (mag >= 2) return { badge: 'MOD', label: 'Moderate' };
    if (mag >= 1) return { badge: 'LO', label: 'Low' };
    return { badge: 'V-LO', label: 'Very Low' };
  };

  const classifyValence = (val: number) => {
    if (val >= 2.5) return { badge: 'V-POS', label: 'Very Positive' };
    if (val >= 1) return { badge: 'POS', label: 'Positive' };
    if (val > -1) return { badge: 'NEU', label: 'Neutral' };
    if (val > -2.5) return { badge: 'NEG', label: 'Negative' };
    return { badge: 'V-NEG', label: 'Very Negative' };
  };

  const classifyVolatility = (vol: number) => {
    if (vol >= 4) return { badge: 'V-HI', label: 'Very High' };
    if (vol >= 3) return { badge: 'HI', label: 'High' };
    if (vol >= 2) return { badge: 'MOD', label: 'Moderate' };
    if (vol >= 1) return { badge: 'LO', label: 'Low' };
    return { badge: 'V-LO', label: 'Very Low' };
  };

  const magnitudeForkText = (mag: number) => {
    if (mag >= 4) return 'Breakthrough or breakdown potential';
    if (mag >= 3) return 'Significant events, high-leverage choices';
    if (mag >= 2) return 'Noticeable push, requires adaptation';
    if (mag >= 1) return 'Subtle shift, background influence';
    return 'Dormant or ambient field';
  };

  const valenceForkText = (val: number) => {
    if (val >= 2.5) return 'Major opportunities, supportive flow';
    if (val >= 1) return 'Tailwinds, things feel easier';
    if (val > -1) return 'Balanced forces, neutral ground';
    if (val > -2.5) return 'Headwinds, obstacles may appear';
    return 'Significant challenges, pressure';
  };

  const getValenceStyle = (valence: number, magnitude: number) => {
    const magLevel = magnitude <= 2 ? 'low' : 'high';
    if (valence >= 4.5) {
      const emojis = magLevel === 'low' ? ['🦋', '🌈'] : ['🦋', '🌈', '🔥'];
      return { emojis, descriptor: 'Liberation', anchor: '+5', pattern: 'peak openness; breakthroughs / big‑sky view' };
    } else if (valence >= 3.5) {
      const emojis = magLevel === 'low' ? ['💎', '🔥'] : ['💎', '🔥', '🦋'];
      return { emojis, descriptor: 'Expansion', anchor: '+4', pattern: 'widening opportunities; clear insight fuels growth' };
    } else if (valence >= 2.5) {
      const emojis = magLevel === 'low' ? ['🧘', '✨'] : ['🧘', '✨', '🌊'];
      return { emojis, descriptor: 'Harmony', anchor: '+3', pattern: 'coherent progress; both/and solutions' };
    } else if (valence >= 1.5) {
      const emojis = magLevel === 'low' ? ['🌊', '🧘'] : ['🌊', '🧘'];
      return { emojis, descriptor: 'Flow', anchor: '+2', pattern: 'smooth adaptability; things click' };
    } else if (valence >= 0.5) {
      const emojis = magLevel === 'low' ? ['🌱', '✨'] : ['🌱', '✨'];
      return { emojis, descriptor: 'Lift', anchor: '+1', pattern: 'gentle tailwind; beginnings sprout' };
    } else if (valence >= -0.5) {
      return { emojis: ['⚖️'], descriptor: 'Equilibrium', anchor: '0', pattern: 'net‑neutral tilt; forces cancel or diffuse' };
    } else if (valence >= -1.5) {
      const emojis = magLevel === 'low' ? ['🌪', '🌫'] : ['🌪', '🌫'];
      return { emojis, descriptor: 'Drag', anchor: '−1', pattern: 'subtle headwind; minor loops or haze' };
    } else if (valence >= -2.5) {
      const emojis = magLevel === 'low' ? ['🌫', '🧩'] : ['🌫', '🧩', '⬇️'];
      return { emojis, descriptor: 'Contraction', anchor: '−2', pattern: 'narrowing options; ambiguity or energy drain' };
    } else if (valence >= -3.5) {
      const emojis = magLevel === 'low' ? ['⚔️', '🌊'] : ['⚔️', '🌊', '🌫'];
      return { emojis, descriptor: 'Tension', anchor: '−3', pattern: 'hard choices; competing forces create friction' };
    } else if (valence >= -4.5) {
      const emojis = magLevel === 'low' ? ['🌊', '⚔️'] : ['🌊', '⚔️', '💥'];
      return { emojis, descriptor: 'Disruption', anchor: '−4', pattern: 'systemic challenges; breakdown precedes breakthrough' };
    } else {
      const emojis = magLevel === 'low' ? ['💥', '🌊'] : ['💥', '🌊', '⚔️'];
      return { emojis, descriptor: 'Collapse', anchor: '−5', pattern: 'maximum restrictive tilt; compression / failure points' };
    }
  };

  const [layerVisibility, setLayerVisibility] = useState({
    summary: true,
    climateCard: true,
    diagnostics: false,
  });

  const [relocLabel, setRelocLabel] = useState('');

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white">Math Brain</h1>
            <p className="text-slate-400 mt-2">
              Astrological calculation engine. Enter birth data to generate a report.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <PersonForm person={personA} setPerson={setPersonA} />
            <PersonForm person={personB} setPerson={setPersonB} />
            <TransitControls
              includeTransits={includeTransits}
              setIncludeTransits={setIncludeTransits}
              transitDate={transitDate}
              setTransitDate={setTransitDate}
              relocationStatus={relocationStatus}
              setRelocationStatus={setRelocationStatus}
              setRelocLabel={setRelocLabel}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-purple-600 px-4 py-3 text-lg font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </form>

          {error && <div className="mt-6 rounded-md bg-red-500/20 p-4 text-red-300">{error}</div>}

          {result && (
            <>
              <div className="mt-8">
                <DownloadControls
                  includeTransits={includeTransits}
                  cleanJsonGenerating={cleanJsonGenerating}
                  engineConfigGenerating={engineConfigGenerating}
                  graphsPdfGenerating={graphsPdfGenerating}
                  markdownGenerating={markdownGenerating}
                  pdfGenerating={pdfGenerating}
                  weatherJsonGenerating={weatherJsonGenerating}
                  onDownloadCleanJSON={onDownloadCleanJSON}
                  onDownloadEngineConfig={onDownloadEngineConfig}
                  onDownloadGraphsPDF={onDownloadGraphsPDF}
                  onDownloadMarkdown={onDownloadMarkdown}
                  onDownloadPDF={onDownloadPDF}
                  onDownloadSymbolicWeather={onDownloadSymbolicWeather}
                  seismographMap={result?.seismograph || null}
                  authReady={authReady}
                  isAuthenticated={isAuthenticated}
                  canVisitPoetic={!!result}
                  onNavigateToPoetic={handleNavigateToPoetic}
                />
              </div>

              {(() => {
                const dailyEntry = result?.data_tables?.daily_readings?.[0];
                if (!dailyEntry) return null;

                const { date, magnitude: mag, directional_bias: bias, volatility: vol } = dailyEntry;
                const val = typeof bias === 'object' ? bias.value : bias;
                return (
                  <div>
                    <Section title="Symbolic Weather">
                      {(() => {
                        const sfdValue = result?.person_a?.sfd?.sfd ?? 0;
                        const magState = classifyMagnitude(mag);
                        const volState = classifyVolatility(vol);
                        const valenceStyle = getValenceStyle(val, mag);

                        const magnitudeClass = classifyMagnitude(mag);
                        const valenceClass = classifyValence(val);
                        const volatilityClass = classifyVolatility(vol);
                        const magnitudeFork = magnitudeForkText(mag);
                        const valenceFork = valenceForkText(val);
                        const badgeLine = `${magnitudeClass.badge} / ${valenceClass.badge} / ${volatilityClass.badge}`;

                        const dateLabel = new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        });

                        const baseLocation = [personA.city, personA.state].filter(Boolean).join(', ') || personA.city || '';
                        const locationLabel = relocationStatus.effectiveMode !== 'NONE'
                          ? (relocLabel || baseLocation || 'Relocation lens active')
                          : (baseLocation || 'Location not specified');

                        const modeKind = RELATIONAL_MODES.includes(mode) ? 'relational' : 'single';
                        const relationalNames: [string, string] | undefined = modeKind === 'relational'
                          ? [personA.name || 'Person A', personB.name || 'Person B']
                          : undefined;

                        return (
                          <div className="mb-4">
                            <h3 className="text-sm font-medium text-slate-200 mb-3">Field Context</h3>
                            <div className="rounded border border-slate-700 bg-slate-900/40 p-4">
                              <div className="text-sm text-slate-300 leading-relaxed">
                                {(() => {
                                  let description = `The symbolic field shows ${magState.label} pressure with ${volState.label} patterns.`;

                                  if (sfdValue > 0) {
                                    description += ` The Support-Friction balance leans toward supportive conditions (${sfdValue > 0 ? '+' : ''}${sfdValue}).`;
                                  } else if (sfdValue < 0) {
                                    description += ` The Support-Friction balance shows frictional conditions (${sfdValue}).`;
                                  } else {
                                    description += ` The Support-Friction balance is neutral.`;
                                  }

                                  description += ` Valence signature: ${valenceStyle.emojis.join('')} ${valenceStyle.descriptor} (${valenceStyle.anchor}) — ${valenceStyle.pattern}.`;

                                  return description;
                                })()}
                              </div>
                              <div className="mt-3 text-xs text-slate-500">
                                Note: This describes the mathematical field state only. Pair it with your preferred narrative layer for lived interpretation.
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </Section>
                  </div>
                );
              })()}

              {(() => {
                const cx = (result as any)?.context;
                if (!cx?.translocation) return null;
                const t = cx.translocation;
                return (
                  <Section title="Translocation Context" className="print:hidden">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm text-slate-300">
                      <div>
                        <div className="text-xs text-slate-400">Applies</div>
                        <div className="text-slate-100">{t.applies ? 'Yes' : 'No'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Method</div>
                        <div className="text-slate-100">{(() => {
                          const m = String(t.method || 'Natal');
                          if (/^A[_ ]?local$/i.test(m) || m === 'A_local') return 'Person A';
                          if (/^B[_ ]?local$/i.test(m) || m === 'B_local') return 'Person B';
                          if (/^midpoint$/i.test(m)) return 'Person A + B';
                          if (/^natal$/i.test(m)) return 'None (Natal Base)';
                          return m;
                        })()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">House System</div>
                        <div className="text-slate-100">{t.house_system || 'Placidus'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">TZ</div>
                        <div className="text-slate-100">{t.tz || (personA?.timezone || '—')}</div>
                      </div>
                    </div>
                  </Section>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
