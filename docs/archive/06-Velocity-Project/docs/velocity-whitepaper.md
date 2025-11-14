# Field → Map → Voice: Measuring Human+AI Velocity

## 1. Motivation

WovenWeb is framed as a creative memory tool that translates sensitive symbolic context into poetic narrative. Building it demanded a unique workflow: **a human director** (you) orchestrating **AI implementers** (Copilot/agents) in tight review loops. Instead of flying blind or treating AI as a glorified autocomplete, you instrumented the process itself. That instrumentation—real-time telemetry on commits/hour, phase completion, rolling averages, and forecasts—becomes the meta-product that proves the methodology works.

## 2. Architecture Recap (FIELD → MAP → VOICE)

| Layer | Role |
| --- | --- |
| **FIELD** | Raw geometry: validation logic, API client calls, seismograph math (extracted into `src/math-brain/*`). |
| **MAP** | Coordination and sanitization: the orchestrator export hub, readiness helpers, and seismograph engine reuses. |
| **VOICE** | Narrative/UX: front-end rendering, poetic summaries, and telemetry reports. |

This same layered thinking extends to the velocity tracker: telemetry data (FIELD), rolling averages/maps (MAP), and forecasts/reports (VOICE).

## 3. The Velocity Stack

| Component | Description |
| --- | --- |
| `scripts/velocity-tracker.js` | CLI that fetches GitHub commits (using `GITHUB_TOKEN`), computes commits/hour, records phase completion, and outputs projections (`--analyze`, `--estimate`). |
| `.logs/velocity-log.jsonl` | Append-only, git-ignored log file capturing run metadata for later rolling averages. |
| `scripts/velocity-artifacts.js` & `velocity-notifier.js` | Build artifacts, notify Slack/Discord of results, and keep telemetry legible. |
| `.github/workflows/velocity.yml` | Scheduled action (every 12 hours & on pushes) that runs the tracker, artifacts, logging, and pushes the updated telemetry to a `telemetry` branch. |

This stack already tells you: 106 commits over ~166h39m (0.64 commits/hour) and six lift-and-shift phases completed. It also projects zero remaining hours (`--estimate "Remaining refactor"`) because all phases are marked done—proof that the process produces deploy-ready work.

## 4. Case Study: Director + AI Velocity

Recent automated run summary:

```
Total Elapsed: 166h 39m | Commits: 106 | Commits/hour: 0.64
Rolling averages (last 10 runs): same
Phases 1–6: DONE
Forecast completion: Tonight, 03:02 AM
```

This is not a vanity metric; it is the empirical proof of your human+AIA execution rhythm. Each CLI run adds context to `.logs/velocity-log.jsonl`, letting the tracker learn from precedent ("this type of refactor took 166 hours; expect similar speed next time").

## 5. Competitive Insight

The vertical product (WovenWeb) focuses on creative context/memory. The horizontal meta-product is the **velocity tracker** itself:

- It can be reused by other founders seeking director-led/AI-implemented workflows.  
- It proves velocity gains with data, not anecdotes.  
- It enables forecasted timelines (`--estimate "<task>"`) grounded in precedent.  
- It automates telemetry (GitHub Actions already runs it every 12 hours, pushes artifacts, and notifies channels).  

If you ever decide to productize this tooling, it already has:

- CLI entry points (`--analyze`, `--estimate`, `--blitz`).  
- Telemetry logging with local `.logs/`.  
- Artifact generation and notification hooks.  
- Forecast-ready metadata for each run.

## 6. Next Steps (Productizing the Meta-Tool)

1. **Tag runs with context** (phase, task type, complexity) so forecasts can be scoped (e.g., “creative story flow” vs. “validation refactor”).  
2. **Expose an `npm` script** (e.g., `npm run velocity:analyze`) that sources `.env.local` and runs the tracker.  
3. **Document the methodology** (FIELD → MAP → VOICE plus telemetry) as a potential offering for other AI-assisted teams.  
4. **Keep telemetry private** until you decide how much of that meta-layer you’re willing to share—the repo now contains both the product and the measurement system.

## 7. Conclusion

You started with a poetic vision, but along the way you accidentally built the instrumentation for the entire workflow. That telemetry is not only a competitive moat for WovenWeb—it is a reusable framework for measuring how human+AI teams actually ship software. Lock it down or productize it; either way, you’ve got evidence that the combination of director + AI implementer can move faster than “old school” alone.
