# Poetic Brain — Validation & Resonance: When We Ask / When We Defer

Live behavior reference (production heuristics). This document describes the current, canonical runtime rules that decide when Poetic Brain will present a validation/resonance check (probe) to the user and when it will defer, guard, or skip asking. This is a "live behavior" spec — not a roadmap. Change only when you also update runtime code and tests.

## One-line decision summary

Poetic Brain asks for a resonance validation when a Raven-produced probe exists and these gates pass: it is not the first substantive turn (unless forced by auto-execution), the session has valid geometry or an active report context (or the flow explicitly forces a question), and the conversation mode is not meta-feedback; otherwise the probe is registered as pending, a guard is shown, or the probe is suppressed.

## 1. Probe detection (how a candidate for validation is found)

- Backend extraction: `extractProbeFromResponse()` finds short, final question-lines (prefers last question ≤ 200 chars) and returns a probe string.
- Math Brain / Auto-exec: `draft.next_step` from `runMathBrain()` is treated as a probe when returned from auto-execution flows (solo/relational/parallel/contextual).
- Client registration: rendered Raven messages are scanned (client-side helper such as `containsInitialProbe`) and pending probes are registered via `pingTracker.registerPending(messageId, checkpointType, messageContent)`.

Notes: probes may originate from model text or from deterministic Math Brain outputs. Either source creates the same probe lifecycle entry.

## 2. Gate conditions — when we present the probe for active validation

All of the following must be true for Poetic Brain to present the PingFeedback UI and actively ask the user to tag a reflection:

1. Not a first substantive turn, except when `autoPlan.forceQuestion === true` (auto-exec flows).
2. Valid context or geometry exists: uploaded `reportContexts` (Mirror JSON / Symbolic Weather), a `geometry` payload, or successful Math Brain auto-exec output.
3. Conversation mode is not `meta_feedback` (diagnostic/system feedback turns avoid symbolic probes).

If any of the above fails, Poetic Brain will either register the probe as `pending`, surface a no-context guard, or skip creating a probe altogether.

## 3. Client-side behavior after a probe is created

- The UI registers a pending probe via `pingTracker.registerPending(...)` and shows `MirrorResponseActions` / `PingFeedback` for the corresponding message.
- When the user answers (yes / maybe / no / unclear), client code calls a feedback handler which executes `pingTracker.recordFeedback(...)`.
- The feedback enters the session container (session ID) and maps to an SST category: `yes`→WB, `maybe`→ABE, `no|unclear`→OSR.

## 4. Scoring inclusion — when answers count

- Only non-pending answers (user has responded) contribute to session scoring and exports.
- Scoring formulas (canonical):
  - accuracyRate = (WB + 0.5 * ABE) / total_non_pending × 100
  - clarityRate = (total_non_pending - unclear) / total_non_pending × 100
- Breakdown and checkpoint-specific stats are recorded (hook / vector / aspect / general / repair).

## 5. When Poetic Brain intentionally does NOT ask

Poetic Brain will not surface a probe (or will defer) in these situations:

- First substantive turn (no active context), unless `autoPlan.forceQuestion === true`.
- Conversation mode is `meta_feedback` (user is debugging or asking about system behavior).
- Missing geometry / missing paired uploads: the system shows a guard (no-context guidance) rather than prompting validation.
- AutoPlan = `osr` (invalid or missing JSON / missing core chart data): response includes `probe: null` and a guard; no probe is presented.
- Duplicate probe for same message ID: duplicates are suppressed.
- Session sealed (archived): new feedback goes into a fresh container; sealed sessions are not write targets.

## 6. Prioritization & heuristics

- Checkpoint priority (used for pending sorting): `hook` > `aspect` > `vector` > `general`.
- Pending items older than 7 days are archived and excluded from active counts.
- Auto-exec probes (Math Brain outputs) are high-priority and typically set `forceQuestion` so they can prompt validation even on the first turn.
- The client avoids asking too many probes at once; prefer prioritizing high-priority probes and batching low-priority ones.

## 7. Edge cases & behavior notes

- Free-text replies: users can also answer by sending free-form text; the client may map that into programmatic follow-up or attach it as a probe note (handled by `handlePingFeedback`).
- User interaction during registration: the system registers the pending item once and avoids repeated prompting for the same message.
- API or Math Brain failure: no probe is created when the draft fails; the UI falls back to a conservative message and will not create spurious probes if the draft failed.

## 8. Compact decision flow (copyable)

1. Did Raven produce an explicit probe (question or `draft.next_step`)?
   - No → do not ask; if it looks like next-step intent, register as pending internal item only.
   - Yes → continue.
2. Is conversationMode === 'meta_feedback'? → Yes → don’t probe; respond plainly.
3. Is this the first substantive turn? → Yes → ask only if autoPlan.forceQuestion === true; otherwise mark probe pending and wait for a follow-up turn.
4. Do we have valid geometry/report context or was this an auto-exec flow? → No → surface no-context guard; do not probe.
5. Present `PingFeedback` UI and register the probe as pending.

## 9. Examples (operational)

- Auto-exec, first turn: user uploads Mirror+Weather → backend auto-runs → returns a draft with `next_step`; because autoPlan.forceQuestion is true, Poetic Brain asks the resonance question immediately and registers a probe.
- Conversation-first, no upload: user types “What patterns do you see?” with no upload → system replies with a short reflection but does not create a probe (first turn, no geometry) and shows the no-context guard if user asks for a personal reading.
- Clarification: Raven asks “Where does this land in your body?” (probe detected), session has report context and not first turn → UI shows PingFeedback; user clicks “Maybe” → pingTracker records ABE and accuracy calculations update.

## 10. Quick operational thresholds (production heuristics)

- Archive pending items older than 7 days.
- Treat `maybe` as half-weight when computing accuracy.
- Consider Actor/Role composite only when session has ≥ 6 non-pending answers (recommendation used in WrapUp, enforced in docs, not enforced by this doc alone).

## 11. Reporting & telemetry integration

**Daily digest telemetry** enables longitudinal coherence analysis (Uncanniness Index) without additional data collection. The anonymized session summary payload must include these fields for meta-analysis:

- `mag` (Magnitude): numeric field intensity
- `val` (Valence): directional charge
- `wb_rate`: WB responses / total × 100
- `abe_rate`: ABE responses / total × 100
- `osr_rate`: OSR responses / total × 100
- `narrative_fit_score`: optional coherence metric

**Privacy guarantee**: All telemetry is anonymized (hashed session IDs, no PII, no raw message content). Daily digest writes to structured storage (CSV/JSON/S3) for read-only analysis. No surveillance; measures interpretive coherence only.

**Implementation note**: Daily digest job (not per-session emails) writes session summaries to the same bucket/DB that the uncanniness notebook reads from. This creates a zero-friction pipeline: session data → digest → rolling correlation analysis → UI plot.

**Toggle control**: Server-side only; never client-exposed. Use `REPORTING_ENABLED` and `REPORT_MODE=daily` environment variables. See implementation docs for setup.

## 12. Change control

This file documents live behavior. If you change prompts, auto-exec rules, or scoring logic in code you MUST update this file and the QA checklist before merging.

---
Last updated: 2025-11-08
