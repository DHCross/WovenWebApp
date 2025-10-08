# Balance Meter Saturation Debug Protocol

_Last updated: 2025-10-08_

## 1. Purpose

This protocol defines the reproducible steps for investigating Balance Meter readings that appear “saturated” (values pegged to 0/5 or −5/5) or otherwise violate spec v3.1 expectations. It translates the runtime invariants enforced in `lib/balance/assertions.ts` into a field-tested debugging checklist so we can quickly distinguish between:

- Legitimate high-intensity geometry (FIELD) that truly reaches the top of the scale.
- Mapping errors in `lib/weatherDataTransforms` that mis-handle normalization or smoothing.
- Voice-layer presentation issues introduced during display transformations or dashboard export.

## 2. When to Run This Protocol

Run these steps whenever you observe one or more of the following:

- `BalanceMeterInvariantViolation` is thrown with a **Magnitude/Directional Bias/Coherence out of range** message.
- Chart output shows repeated 5.00 / −5.00 readings across multiple days despite varied transit payloads.
- Session export diffs (e.g., `_Balance Meter.txt_`, Netlify deploy previews) show clamped series that contradict historical baselines.
- Seismograph overlays claim 0–5/−5–5 compliance, yet UI widgets display discrepant values.

## 3. Quick Reference

| Stage | File / Tooling | Command / Action |
| --- | --- | --- |
| Collect inputs | `tmp-benchmark.log`, API payload archives | `cat tmp-benchmark.log \| pbcopy` |
| Validate transforms | `lib/weatherDataTransforms.ts` | `npm test -- --runTestsByPath __tests__/balance-export-regression.test.ts` |
| Check invariants | `lib/balance/assertions.ts` | Trigger path via reproduction payload; review thrown context |
| Compare specs | `config/spec.json` | Confirm `scaling_mode`, `scale_factor`, `coherence_inversion`, and `pipeline` match runtime |
| Export snapshot | `test-benchmark-2018-10-10.js` | `node test-benchmark-2018-10-10.js > tmp-benchmark.log` |

## 4. Step-by-Step Debug Flow

1. **Capture the Exact Payload**
   - Pull the relevant Math Brain payload (both `weather` summary and raw `transitsByDate`).
   - Note the `time_policy`, `time_precision`, and provenance metadata. Saturation caused by incorrect local/UTC conversions should be visible in `timestamp_local` vs `timestamp_utc`.

2. **Run the Balance Export Regression Suite**
   ```sh
   npm test -- --runTestsByPath __tests__/balance-export-regression.test.ts
   ```
   - Confirms weather data transforms still match golden fixtures.
   - If this fails, inspect the diff under `test-results/` and compare against spec values.

3. **Replay the Scenario via Benchmark Harness**
   ```sh
   node test-benchmark-2018-10-10.js > tmp-benchmark.log
   ```
   - Use the script to replay representative payloads.
   - Append a sanitized reproduction block to `analysis/balance_meter_cases.md` (if it exists) for future reference.

4. **Inspect Transform Pipeline**
   - In `lib/weatherDataTransforms.ts`, verify the following checkpoints:
     - `normalizeAxisValue` clamps using `spec.ranges`.
     - Derived `scaling` metadata matches `spec.scaling_mode`, `spec.scale_factor`, and `spec.coherence_inversion`.
     - Display helpers avoid double inversion (see `assertNotDoubleInverted` usage).

5. **Cross-Validate with Assertions**
   - Inject a defensive call to `assertBalanceMeterInvariants(result)` at the stage you suspect (before/after smoothing).
   - The thrown `context` payload lists the offending axis values, normalized forms, and expected ranges.
   - For seismograph-specific issues, wrap outputs with `assertSeismographInvariants` to isolate magnitude/bias/coherence breaches.

6. **Differentiate Data vs Presentation Issues**
   - Check `lib/weatherDataTransforms.js` (the JS build artifact) for divergence if the TypeScript source looks correct.
   - Validate dashboard rendering code (e.g., components under `app/math-brain`) respects the normalized values without re-scaling.

7. **Assess Scaling Metadata**
   - Confirm `result.scaling.pipeline` equals `spec.pipeline`. Any mismatch suggests transform code is referencing stale spec files or bundlers cached an older `config/spec.json`.

8. **Document Findings**
   - Append a short summary to `SNAPSHOT_FIX_REPORT.md` or create a new dated memo under `analysis/`.
   - Include reproduction payload, failing assertion message, root cause, and fix snippet.

## 5. Common Root Causes & Remedies

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| Magnitude pegged at 5 despite low geometry | Spec constants drifted (e.g., `spec.scale_factor`) | Re-align `config/spec.json` with latest Balance Meter brief; rerun regression suite |
| Directional bias alternates −5/5 per day | Time-sampling mislabeled timezone causing hemisphere flips | Confirm `timestamp_local` vs `timezone` in provenance; verify relocation handling in `getTransits` |
| Coherence toggles between 0 and 5 | Double inversion in display layer | Apply `assertNotDoubleInverted` near presentation code; adjust display normalization |
| Tests pass locally, Netlify still saturates | JS build artifact stale or environment-specific spec | Delete `.next`, clear Netlify build cache, ensure `spec.json` shipped with deploy |

## 6. Verification Checklist (Post-Fix)

- [ ] `npm test -- --runTestsByPath __tests__/balance-export-regression.test.ts` passes.
- [ ] `npm test -- --runTestsByPath __tests__/dashboard-calibrated-values.test.ts` passes.
- [ ] `node test-benchmark-2018-10-10.js` produces within-range metrics (inspect `tmp-benchmark.log`).
- [ ] Manual spot-check of dashboard/Balanced Meter UI reflects expected ranges.
- [ ] Updated documentation committed (`CHANGELOG.md` and relevant analysis memo).

## 7. Appendix

- **Key Assertions** (`lib/balance/assertions.ts`):
  - `assertBalanceMeterInvariants(result)` — Ensures axes within spec ranges and scaling metadata matches `config/spec.json`.
  - `assertSeismographInvariants(seismo)` — Validates raw seismograph magnitude/directional bias/coherence.
  - `assertNotDoubleInverted(volDisplay, cohDisplay)` — Guards against presentation-layer double inversion.

- **Supporting Files**:
  - `lib/weatherDataTransforms.ts` / `.js`
  - `src/seismograph.js` (manual adjustments noted on 2025-10-08)
  - `analytics` fixtures under `Sample Output/`
  - `BALANCE_METER_INDEX.md` for spec lineage

Maintain this protocol alongside any future Balance Meter spec upgrades; adjust thresholds and referenced tests when `spec.json` is revised.
