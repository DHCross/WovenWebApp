# Dashboard Fix Quickstart Guide
**🚨 CRITICAL:** Dashboard showing 5.0/-5.0 instead of 3.9/-2.3

---

## The Problem (One Line)

Dashboard reads `summary.magnitude` (uncalibrated) instead of `axes.magnitude.value` (calibrated).

---

## The Fix (One Change)

**File:** `app/math-brain/page.tsx` line **4497**

**Change:**
```tsx
// BEFORE (WRONG):
const mag = Number(summary.magnitude ?? 0);

// AFTER (CORRECT):
const mag = Number(summary.axes?.magnitude?.value ?? summary.magnitude_calibrated ?? summary.magnitude ?? 0);
```

**Validation:**
```tsx
// Also verify line 4498 is already correct:
const val = Number(summary.valence_bounded ?? summary.valence ?? 0);  // ✅ Already reads calibrated
```

---

## Test Immediately

```bash
npm run dev
# Open Math Brain dashboard
# Enter test case: Oct 10, 2018 (Hurricane Michael)
# Birth: Oct 8, 1993, San Francisco CA
# Verify displays Magnitude 3.9, Bias -2.3 (NOT 5.0/-5.0)
```

---

## Run Full Test Suite

```bash
npm run test:ci
# Must pass: 11/11 Golden Standard tests
# Must pass: 2/2 Rendering tests
# Known: 9 pre-existing failures unrelated to this fix
```

---

## Commit Message

```
[2025-01-21] CRITICAL FIX: Dashboard reads calibrated Balance Meter values

- app/math-brain/page.tsx line 4497: Changed to read axes.magnitude.value
- Fixes Golden Standard fragmentation (was 5.0/-5.0, now 3.9/-2.3)
- Math engine unchanged (11/11 tests passing)

Co-authored-by: GitHub Copilot
```

---

## If This Doesn't Work

1. Check if Codex already modified this line
2. Verify backend returns `axes.magnitude.value` in summary
3. Add debug logging:
   ```tsx
   console.log('DEBUG summary:', JSON.stringify(summary, null, 2));
   ```
4. See full recovery report: `docs/EXPORT_FRAGMENTATION_RECOVERY_REPORT.md`

---

## Root Cause (Quick Explanation)

**Backend** averages daily `seismograph.magnitude` (uncalibrated 5.0) into `summary.magnitude`.  
**Dashboard** reads `summary.magnitude` directly, bypassing calibration pipeline.  
**Fix** reads from `axes.magnitude.value` which contains post-×50-scaling calibrated value (3.9).

**Why valence works:** Already reads `valence_bounded` (calibrated) instead of `valence` (raw).

---

## Next Steps (After Dashboard Fixed)

1. ✅ Fix dashboard (this guide)
2. 🔄 Fix backend summary calculation (see Priority 1 in recovery report)
3. 🛡️ Remove 'raw' from extractAxisNumber priority list (see Priority 3)
4. 🧪 Add regression tests (see Priority 5)

---

**Time to fix:** 2 minutes  
**Impact:** 🔴 CRITICAL (user-facing dashboard)  
**Risk:** 🟢 LOW (one-line change, isolated to data binding)
