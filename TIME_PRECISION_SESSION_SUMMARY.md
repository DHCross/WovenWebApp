# Time-of-Day Precision: Session Summary
**Date:** October 7, 2025  
**Session Type:** Ground Truth Validation & Root Cause Analysis  
**Status:** ✅ Analysis Complete - Implementation Required

---

## What We Discovered

### 1. Validated Oct 8, 2025 Calculation

**Test:** Compared API output against AstroSeek ground truth for Oct 8, 2025

**Results:**
- ✅ Planetary longitudes: Excellent accuracy (within 0.05°)
- ❌ House cusps (ASC/MC): Severe errors (~75° offset)
- ⚠️  Moon position: 5° drift (expected for time-sensitive calculations)

### 2. Identified Critical UTC Bug

**Location:** `lib/server/astrology-mathbrain.js` line ~1932

**Problem:**
```javascript
// CURRENT (WRONG):
hour: dt.getUTCHours(),      // Extracts UTC hour
minute: dt.getUTCMinutes(),  // Extracts UTC minute
```

**Impact:**
- When system thinks it's calculating "noon CDT", it's actually sending **5pm CDT** to the API
- This causes **75° rotation** in house cusps (ASC/MC)
- Moon position drifts **~5°** from expected

**Root Cause:**  
`buildWindowSamples()` creates timestamps at "12:00 local" → converts to UTC → `getUTCHours()` extracts the **UTC** hour (17:00), not the local hour (12:00).

### 3. Missing Time Provenance

No outputs currently include:
- `timestamp_local` (when the chart was actually calculated)
- `timestamp_utc` (UTC equivalent)
- `time_policy` (how the time was determined)

**Impact:** Cannot reproduce or verify calculations.

### 4. No User Time Input

System hardcodes 12:00 noon for all daily calculations.

**Impact:** Cannot calculate specific times like "5:00 PM" or "9:00 AM"

---

## Documents Created

### 1. `TIME_OF_DAY_CONTRACT.md` (Comprehensive Specification)

**Contents:**
- Complete technical contract for time-of-day handling
- Input requirements (`transit_time` parameter)
- Provenance field specifications
- Semantic clarifications ("Symbolic Weather" is point-in-time, not 24h average)
- UI/UX requirements (time picker, defaults, labels)
- Implementation plan (Phases 1-4)
- Validation criteria
- Ground truth test cases

**Purpose:** Reference document for implementing time-aware calculations

### 2. `time-of-day-validation-report.md` (Detailed Analysis)

**Contents:**
- Executive summary of issues
- Test case results (current behavior vs ground truth)
- Root cause analysis with code examples
- Specific fixes required with file locations
- Validation test plan
- Impact assessment (affected features, data quality)
- Migration strategy for historical data
- Acceptance criteria checklist

**Purpose:** Technical diagnostic with actionable fixes

### 3. `oct8-validation-report.md` (First Validation)

**Contents:**
- Oct 8, 2025 noon calculation vs AstroSeek
- Planetary position comparison table
- Three-way validation (API, AstroSeek, Weather Log)
- Summary statistics on accuracy
- Initial validation verdict

**Purpose:** Baseline accuracy validation (pre-time-awareness)

### 4. Test Files

- `test-oct8-2025.json` - Noon baseline payload
- `test-oct8-5pm-2025.json` - 5pm test payload (for future testing)
- `api-response-oct8-full.json` - First validation response
- `api-response-oct8-noon.json` - Second validation (current behavior)

---

## Key Findings

### What's Working ✅

1. **Planetary Longitudes:** All slow-moving bodies match AstroSeek within 0.01° - 0.05°
2. **API Integration:** RapidAPI Astrologer working correctly with proper inputs
3. **Balance Meter Math:** v4.0 scaling correctly calibrated (×5 factor)
4. **Aspect Calculations:** 134 transit aspects detected and processed

### What's Broken ❌

1. **Time Extraction:** Using UTC hours instead of local hours (5-hour offset)
2. **House Cusps:** 75° rotation error due to time offset
3. **Provenance:** No timestamp tracking or time_policy documentation
4. **User Control:** Cannot specify custom times

### Why It Matters ⚠️

**Time-sensitive elements:**
- **ASC/MC:** Rotate 360° per day (~15°/hour) → 5-hour error = 75° error
- **Moon:** Moves ~0.5°/hour → 5-hour error = ~2.5° error
- **Aspect Timing:** Exact aspect times may be attributed to wrong days

**Falsifiability:** Cannot validate against AstroSeek if times don't match.

---

## Fix Roadmap

### Phase 1: Critical Fixes (IMMEDIATE)

**Priority:** CRITICAL  
**Blocking:** Production deployment for time-sensitive readings

1. **Fix UTC Time Extraction**
   - File: `lib/server/astrology-mathbrain.js` line ~1932
   - Change: `getUTCHours()` → `DateTime.fromJSDate(dt, {zone}).hour`
   - Test: ASC/MC should match AstroSeek within ±1°

2. **Add Time Provenance**
   - Add: `timestamp_local`, `timestamp_utc`, `time_policy` to all outputs
   - Test: Can reproduce calculations with same timestamp

### Phase 2: User Control (HIGH PRIORITY)

**Priority:** HIGH  
**Blocking:** User ability to specify custom times

1. **Accept `transit_time` Parameter**
   - Modify: API request validation to accept transit_time object
   - Test: Can request "5:00 PM" and get different results than noon

2. **Update `buildWindowSamples()`**
   - File: `lib/time-sampling.js`
   - Add: `timeSpec` parameter for custom hour/minute
   - Test: Different times produce different house cusps

3. **Add Time Picker UI**
   - Default: 12:00 noon local
   - Display: "ASC/MC rotate 15°/hour, Moon moves 0.5°/hour"
   - Test: User can select and calculate different times

### Phase 3: Documentation & Migration (REQUIRED)

**Priority:** REQUIRED  
**Blocking:** User clarity and historical data handling

1. **Update Terminology**
   - Change: "Weather" → "Symbolic Weather" everywhere
   - Rationale: "Weather" implies 24h average; readings are point-in-time

2. **Tag Historical Data**
   - Label: `time_policy: "legacy_noon_approx"` for pre-fix exports
   - Migration: Offer "refresh" option with time picker

3. **Add Tests**
   - Test: Noon vs 5pm same-day (different ASC/MC/Moon)
   - Test: Timezone boundaries (NY vs LA)
   - Test: Moon drift validation

---

## Validation Criteria

### ✅ Success Conditions

- [ ] ASC within ±1° of AstroSeek for same timestamp
- [ ] MC within ±1° of AstroSeek for same timestamp
- [ ] Moon within ±0.5° of AstroSeek for same timestamp
- [ ] All outputs include `timestamp_local`, `timestamp_utc`, `time_policy`
- [ ] Noon vs 5pm produces different ASC/MC/Moon values
- [ ] No `getUTC*()` usage for API hour/minute fields
- [ ] "Symbolic Weather" terminology used throughout
- [ ] User can specify custom times via `transit_time` parameter
- [ ] Time picker in UI defaults to noon with clear labeling

### ❌ Failure Conditions

- Any output where `timestamp_local` equals `timestamp_utc` (UTC-only)
- ASC/MC error > 5° vs AstroSeek for same timestamp
- Missing `time_policy` in provenance
- Using `getUTC*()` methods for API payload construction
- "Weather" terminology without "Symbolic" qualifier

---

## Impact Summary

### Current State

**Accuracy:** Planetary longitudes excellent, house cusps compromised  
**Usability:** Works for basic transit tracking, fails for precise timing  
**Reproducibility:** Cannot verify against external sources  
**User Trust:** At risk if users compare house cusps to AstroSeek

### Post-Fix State

**Accuracy:** Full geometric precision (all elements within tolerances)  
**Usability:** Time-aware calculations, user control over timestamps  
**Reproducibility:** Full provenance tracking enables verification  
**User Trust:** Professional-grade accuracy validated against industry standards

---

## Next Steps

1. **Review Documents**
   - Read `TIME_OF_DAY_CONTRACT.md` for complete specification
   - Read `time-of-day-validation-report.md` for technical details

2. **Prioritize Implementation**
   - Phase 1 fixes are **CRITICAL** (geometric accuracy)
   - Phase 2 is **HIGH** (user control)
   - Phase 3 is **REQUIRED** (clarity & compliance)

3. **Begin Implementation**
   - Start with UTC → local time conversion
   - Test against Oct 8 ground truth (5pm case)
   - Add provenance stamps
   - Implement user time input

4. **Validate & Deploy**
   - Run full test suite
   - Verify against AstroSeek for multiple timestamps
   - Update documentation
   - Deploy with migration plan

---

## Files Reference

**Documentation:**
- `TIME_OF_DAY_CONTRACT.md` - Complete specification
- `time-of-day-validation-report.md` - Technical analysis
- `oct8-validation-report.md` - Initial validation results
- `SESSION_SUMMARY.md` - This file

**Test Payloads:**
- `test-oct8-2025.json` - Noon baseline
- `test-oct8-5pm-2025.json` - 5pm test case

**API Responses:**
- `api-response-oct8-full.json` - First validation
- `api-response-oct8-noon.json` - Current behavior baseline

**Code Locations:**
- `lib/server/astrology-mathbrain.js` line ~1932 - UTC bug
- `lib/time-sampling.js` line 29 - Hardcoded noon
- `lib/server/astrology-mathbrain.js` validation - Add transit_time handling

---

## Ground Truth Reference

**Oct 8, 2025 @ 5:00 PM CDT (Panama City, FL)**

| Element | AstroSeek Ground Truth | Status |
|---------|------------------------|--------|
| ASC | 4°27' Pisces (334.45°) | ✅ Target |
| MC | 11°19' Sagittarius (251.32°) | ✅ Target |
| Moon | 1°50' Taurus (31.83°) | ✅ Target |
| Sun | 15°36' Libra (195.60°) | ✅ Already accurate |

**Test Command (future):**
```json
{
  "transit_time": {
    "hour": 17,
    "minute": 0,
    "timezone": "America/Chicago"
  }
}
```

**Expected Output:**
```json
{
  "provenance": {
    "timestamp_local": "2025-10-08T17:00:00-05:00",
    "timestamp_utc": "2025-10-08T22:00:00Z",
    "time_policy": "explicit",
    "time_precision": "minute"
  }
}
```

---

**Session Status:** ✅ COMPLETE  
**Next Owner:** Implementation team  
**Priority:** CRITICAL (Phase 1), HIGH (Phase 2), REQUIRED (Phase 3)
