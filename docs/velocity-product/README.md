# Velocity Product (Meta‑Tool) — Concept Note

This folder tracks the product framing for the Human–AI Velocity Toolkit — a neutral, reusable layer that measures director‑led, AI‑implemented cadence and publishes plain‑English forecasts.

Core components (as implemented in this repo):
- `scripts/velocity-tracker.js` — analyzer/estimator (commits/hour, rolling averages)
- `scripts/velocity-artifacts.js` — forecast generator (Markdown)
- `.github/workflows/velocity.yml` — scheduled automation and artifact commits
- `.logs/velocity-log.jsonl` — local, git‑ignored telemetry ledger

Extraction plan:
1. Keep terminology neutral and configurable (no product‑specific names)
2. Move analyzer + artifacts into `packages/velocity-toolkit/src/`
3. Replace proxy CLI with direct imports; add config for log/paths
4. Publish as a standalone toolkit or maintain as an internal workspace

Privacy:
- Tokens live in `.env.local` or CI secrets; never commit credentials
- `.logs/` remains ignored to avoid triggering deploys

