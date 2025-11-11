"use client";

import { useCallback, useMemo, useState } from "react";
import UploadDropzone from "./components/UploadDropzone";
import Tooltip from "./components/Tooltip";
import type { ValidationEntry } from "./lib/types";
import { analyzePayload, REPORT_ARCHETYPES } from "./lib/validators";

const FORMAT_LABELS: Record<string, string> = {
  mirror_directive_json: "Mirror Directive JSON",
  "mirror-symbolic-weather-v1": "Mirror + Symbolic Weather JSON",
  symbolic_weather_json: "Symbolic Weather JSON",
  "wm-fieldmap-v1": "Field Map JSON",
  integration_loop: "Integration Loop Bundle",
};

export default function TestEnvClient() {
  const [entries, setEntries] = useState<ValidationEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }
    setError(null);
    setIsProcessing(true);

    const nextEntries: ValidationEntry[] = [];

    const files = Array.from(fileList);

    for (const file of files) {
      try {
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch (parseError) {
          nextEntries.push({
            filename: file.name,
            raw: text,
            size: file.size,
            lastModified: new Date(file.lastModified).toISOString(),
            outcome: {
              schemaTitle: "Unable to parse JSON",
              format: null,
              detectedReport: "Unknown",
              summary: "File could not be parsed as JSON.",
              status: "invalid",
              errors: [(parseError as Error).message],
              warnings: [],
              suggestions: ["Ensure you uploaded the raw JSON export from Math Brain."],
              requiredCompanions: [],
              metadata: {},
            },
          });
          continue;
        }

        const outcome = analyzePayload(parsed as Record<string, unknown>);
        nextEntries.push({
          filename: file.name,
          raw: text,
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString(),
          outcome,
        });
      } catch (fileError) {
        nextEntries.push({
          filename: file.name,
          raw: "",
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString(),
          outcome: {
            schemaTitle: "File read failure",
            format: null,
            detectedReport: "Unknown",
            summary: "Could not read file contents.",
            status: "invalid",
            errors: [(fileError as Error).message],
            warnings: [],
            suggestions: ["Try exporting the payload again from Math Brain."],
            requiredCompanions: [],
            metadata: {},
          },
        });
      }
    }

    setEntries((prev) => {
      const existingNames = new Set(nextEntries.map((entry) => entry.filename));
      const filtered = prev.filter((entry) => !existingNames.has(entry.filename));
      return [...nextEntries, ...filtered];
    });
    setIsProcessing(false);
  }, []);

  const stats = useMemo(() => {
    if (entries.length === 0) {
      return null;
    }

    const totals = entries.reduce(
      (acc, entry) => {
        acc.count += 1;
        acc[entry.outcome.status] += 1;
        return acc;
      },
      { count: 0, valid: 0, warning: 0, invalid: 0 },
    );

    return totals;
  }, [entries]);

  const renderedEntries = useMemo(
    () =>
      entries.map((entry) => {
        const { outcome } = entry;
        const statusColor =
          outcome.status === "valid" ? "text-emerald-300" : outcome.status === "warning" ? "text-amber-300" : "text-rose-300";
        const formatLabel = outcome.format ? FORMAT_LABELS[outcome.format] || outcome.format : outcome.schemaTitle;

        return (
          <li
            key={entry.filename}
            className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-lg shadow-slate-950/20"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">{entry.filename}</h3>
                <p className="text-xs text-slate-400">
                  {formatLabel} • {outcome.detectedReport}
                </p>
                <p className="mt-2 text-xs text-slate-400">{outcome.summary}</p>
              </div>
              <span className={`rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusColor}`}>
                {outcome.status}
              </span>
            </div>

            {outcome.metadata && Object.keys(outcome.metadata).length > 0 && (
              <dl className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(outcome.metadata).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2">
                    <dt className="font-semibold text-slate-200">{key}</dt>
                    <dd className="mt-1 text-slate-400">{value === null || value === undefined ? '—' : String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {outcome.errors.length > 0 && (
              <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                <p className="font-semibold uppercase tracking-wide">Blocking issues</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {outcome.errors.map((errorMessage, index) => (
                    <li key={index}>{errorMessage}</li>
                  ))}
                </ul>
              </div>
            )}

            {outcome.warnings.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                <p className="font-semibold uppercase tracking-wide">Warnings</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {outcome.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {outcome.suggestions.length > 0 && (
              <div className="mt-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-100">
                <p className="font-semibold uppercase tracking-wide">Suggested next steps</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {outcome.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {outcome.requiredCompanions.length > 0 && (
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-xs text-slate-300">
                <p className="font-semibold uppercase tracking-wide">Companion files expected</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {outcome.requiredCompanions.map((required, index) => (
                    <li key={index}>{required}</li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      }),
    [entries],
  );

  const missingArchetypes = useMemo(() => {
    const detected = new Set(entries.map((entry) => entry.outcome.detectedReport));
    return REPORT_ARCHETYPES.filter((archetype) => !detected.has(archetype));
  }, [entries]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-300">
          Development Only
        </div>
        <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-100">Windsurf AI Testing Studio</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              Upload Math Brain exports to validate schema fidelity before handing them to Poetic Brain. The validator inspects Mirror Directive, Symbolic Weather, Field Map, and Integration Loop bundles.
            </p>
          </div>
          <Tooltip
            label="Supported files"
            content={
              <div className="max-w-xs text-xs text-slate-200">
                <p className="font-semibold">Recommended exports</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-300">
                  <li>🧭 Mirror Directive (JSON)</li>
                  <li>🌦️ Symbolic Weather (Compact)</li>
                  <li>🗺️ Field Map (wm-fieldmap-v1)</li>
                  <li>🔁 Integration Loop bundle</li>
                </ul>
              </div>
            }
          />
        </div>
      </header>

      <section className="mb-10">
        <UploadDropzone onFiles={handleFiles} isLoading={isProcessing} />
        {error && (
          <p className="mt-3 text-sm text-rose-300">{error}</p>
        )}
      </section>

      {stats && (
        <section className="mb-10 grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Files checked</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{stats.count}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Valid</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">{stats.valid}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Warnings</p>
            <p className="mt-1 text-2xl font-semibold text-amber-300">{stats.warning}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Invalid</p>
            <p className="mt-1 text-2xl font-semibold text-rose-300">{stats.invalid}</p>
          </div>
        </section>
      )}

      {entries.length === 0 ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/20 p-6 text-sm text-slate-300">
          <p>The validator will list detailed findings for each uploaded payload. Start by exporting from Math Brain’s “For Raven Calder (AI Analysis)” section.</p>
        </section>
      ) : (
        <section className="space-y-6">
          {missingArchetypes.length > 0 && (
            <aside className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 text-sm text-slate-300">
              <p className="font-semibold text-slate-100">Reports still missing</p>
              <p className="mt-1 text-xs text-slate-400">Upload these payloads to complete validation coverage:</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                {missingArchetypes.map((archetype) => (
                  <li key={archetype}>{archetype}</li>
                ))}
              </ul>
            </aside>
          )}

          <ul className="space-y-6">{renderedEntries}</ul>
        </section>
      )}
    </main>
  );
}
