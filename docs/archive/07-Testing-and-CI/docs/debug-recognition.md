# Debug Signal Convergence Checklist

When a debug signal is resolved, capture the convergence so future agents can trace
what happened, who confirmed it, and where evidence lives.

## Workflow

1. Identify the triggering signal entry in `.logs/debug-session.jsonl` (note its `id`).
2. Summarize the diagnosis and fix in `docs/STC_EXPERIMENT_LOG.md`, referencing the signal `id`.
3. Log the outcome in the experiment ledger using:
   ```bash
   npm run stc:experiment -- \
     --experiment "Debug STC Replication" \
     --result success \
     --notes "Signal a1f… resolved by clearing timezone cache" \
     --link docs/debug-recognition.md
   ```
4. If the fix produced an artifact (commit, PR, doc), include that link via additional `--link` flags.
5. Mention any follow-up tests that should be run on future signals (regressions, smoke suites, etc.).

## Template snippet for the experiment log

```
- 2025-11-11T20:45Z — Debug STC replication — ✅ success
  - Signal: debug-session id a1f…
  - Diagnosis: <one sentence>
  - Fix: <PR/commit link>
  - Follow-up: <optional tests or owners>
```

## Why this matters

- Keeps the Signal → Trace → Convergence loop auditable.
- Links debug telemetry to experiment outcomes and recognition notes.
- Provides future responders with a proven playbook before they re-open a similar issue.
