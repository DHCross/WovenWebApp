# Debug Signal — STC Protocol for Math/Poetic Brain Issues

This file explains how to interpret `.logs/debug-session.jsonl`. Whenever a new
line is appended, an agent (Copilot, Codex, etc.) should inspect the latest
entry, diagnose the issue, and record the outcome.

## Signal Anatomy

Each JSON line looks like:

```json
{
  "id": "uuid",
  "timestamp": "2025-11-11T19:04:00Z",
  "source": "manual|copilot|codex|ci",
  "area": "math-brain|poetic-brain|general",
  "branch": "main",
  "commit": "abc123",
  "message": "brief description"
}
```

## When this file changes

1. Read the last entry in `.logs/debug-session.jsonl`.
2. Investigate the described area (math brain, poetic brain, etc.).
3. Propose a fix or diagnosis referencing the entry’s `id`.
4. Once multiple agents agree on a fix, document the resolution (future script
   will append to a convergence log).

## How to add a signal

```
npm run debug:signal -- --source=manual --area=math-brain -- "Timezone mismatch on /map"
```

This appends a structured entry so other agents can notice it.

## Related docs

- `docs/STC_PROTOCOL.md` — overall Signal → Trace → Convergence guidance


## Reference Signal

If a log entry mentions `astrologer-api` or validation failures, review `Developers Notes/API/astrologerAPI.md` for contract details (required fields, endpoints, nation/city rules).
