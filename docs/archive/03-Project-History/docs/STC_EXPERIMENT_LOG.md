# STC Experiment Log

Append entries here when an experiment is run. Include:

```
- Date/time (UTC)
- Experiment name
- Outcome (success/failure/notes)
- Links to commits/logs
```

Example:

```
- 2025-11-11T20:05Z — Debug STC replication (pending) — queued signal for math-brain timezone bug.
```

## Recorded Experiments

- 2025-11-11T21:05Z — Instrumentation readiness dry-run — ✅ success  
  - Signal: velocity tracker schema alignment  
  - Notes: Added run IDs + git context to velocity log, normalized artifact generator, and introduced `npm run stc:experiment` for future ablation/cold/null tests.  
  - Follow-up: First real experiment should reference the `.logs/stc-experiments.jsonl` entry created via the new CLI and include relevant convergence docs.
