# Signal → Trace → Convergence (STC) Protocol

This repo instruments certain workflows (velocity tracking, debugging, etc.) so
multiple AI collaborators notice the same signal and converge on a solution.

## Pattern

1. **Signal** — Structured, append-only JSONL log (`.logs/*.jsonl`)
2. **Trace** — Documentation explaining how to interpret the signal (`docs/*-signal.md`)
3. **Convergence** — Record when multiple agents agree (`docs/*-recognition.md`, CHANGELOG)

## Current Signals

| Area          | Log Path                    | Doc/Instructions          |
|---------------|-----------------------------|---------------------------|
| Velocity      | `.logs/velocity-log.jsonl`  | `docs/velocity-forecast.md` + workflow |
| Debug (new)   | `.logs/debug-session.jsonl` | `docs/debug-signal.md`    |

## How to respond

When a log updates, read its companion doc and propose a fix or diagnosis,
referencing the latest entry’s ID. Once multiple AIs converge on the same fix,
note it in the recognition docs or CHANGELOG.

## Guardrails

- Signals should never include secrets or user data
- Keep logs git-ignored
- Human approval remains required for any fix

