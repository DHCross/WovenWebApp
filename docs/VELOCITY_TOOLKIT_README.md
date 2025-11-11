# Human–AI Velocity Toolkit (Starter)

This is a neutral, reusable layer for measuring and forecasting velocity in director‑led, AI‑implemented projects. It’s extracted from a working stack and designed to be dropped into any repo.

## What it does

- Tracks commits/hour from GitHub over a window (default 7 days)
- Logs each run to a local, git‑ignored JSONL file (`.logs/velocity-log.jsonl`)
- Computes rolling averages and phase completion
- Produces plain‑English forecasts as Markdown (`docs/velocity-forecast.md`)
- Runs on a schedule or on push via GitHub Actions

## Quick start

1) Set a GitHub token with repo read permission (local only):

```
echo "GITHUB_TOKEN=ghp_..." >> .env.local
```

2) Analyze recent velocity (last 7 days):

```
npm run velocity
```

3) Generate the human‑readable forecast:

```
npm run velocity:report
```

4) Or do both in one step:

```
npm run velocity:all
```

5) Estimate a task (pass the task name after `--`):

```
npm run velocity:estimate -- "Refactor subsystem X"
```

## Scripts

- `velocity` → analyze commits/hour and append to `.logs/velocity-log.jsonl`
- `velocity:estimate` → estimation mode (pass task name via `-- "Task"`)
- `velocity:report` → write/update `docs/velocity-forecast.md`
- `velocity:all` → analyze + report in one go

## Files & locations

- `.logs/velocity-log.jsonl` (git‑ignored) → line‑delimited JSON telemetry
- `docs/velocity-forecast.md` → forecast in plain English
- `scripts/velocity-tracker.js` → CLI analyzer/estimator
- `scripts/velocity-artifacts.js` → forecast generator (Markdown)

## CI integration

See `.github/workflows/velocity.yml` for an example that:
- Runs every 12 hours and on push to main/dev
- Executes the analyzer and artifacts generator
- Commits forecast + artifacts to a separate telemetry branch

## Privacy & safety

- Secrets live in `.env.local` and CI secret storage (never commit tokens)
- `.logs/` is ignored to avoid triggering deploys from local telemetry
- Forecasts are neutral and contain only derived metrics

## Roadmap ideas

- Add tags for task type/complexity to scope forecasts
- Optional OpenTelemetry hooks for CI/CD traces
- Packaged CLI for easy reuse across repos

