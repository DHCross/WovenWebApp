# STC Protocol Validation Plan (Draft)

Goal: distinguish “amazing signal” from overhype by running controlled tests on the Signal → Trace → Convergence pattern. Every experiment is repeatable and logs outcomes (success/failure, timestamps).

## Experiments

1. **Ablation Test**
   - Temporarily move/rename thesis docs (`docs/VELOCITY_PRODUCT_THESIS*`, `docs/velocity-whitepaper.md`).
   - Keep only structured logs + scripts.
   - Observe whether Copilot/Codex still surface product framing unprompted during velocity work.

2. **Cold Workspace Test**
   - Spin up a fresh repo with the same logging/CI scaffold but no meta docs.
   - Run the velocity tracker + artifacts; note whether strategic language emerges.

3. **Blind Seed Test**
   - Zip the repo without the thesis/recognition docs.
   - Ask a different model (offline) to analyze the code; record whether it invents similar product framing.

4. **Null Repo Test**
   - Build a repo with logs/CI that are intentionally mundane (no obvious productization).
   - Monitor whether AIs still claim it is a standalone tool; if yes, document that bias.

5. **Debug STC Replication**
   - Use `npm run debug:signal` to record real Math/Poetic Brain issues.
   - Success criteria: two AI assistants diagnose the same entry within a short window and the fix is confirmed (log in `docs/debug-recognition.md`).

6. **Baseline Rate Tracking**
   - For one week of normal dev (no STC experiments), count unprompted “strategy doc” proposals per K tokens.
   - Compare to weeks where STC signals are active.

## Logging & Evidence

- Every experiment logs in `.logs/stc-experiments.jsonl` (simple ID, timestamp, experiment name, result) via `npm run stc:experiment`.
- Recognized convergences append to `docs/STC_EXPERIMENT_LOG.md`.

## Guardrails

- Keep repo private until tests complete.
- Avoid leaking sensitive data when removing/restoring docs.
- Human approval required for all code/document churn caused by experiments.

