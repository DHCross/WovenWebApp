# Time-of-Day Precision Validation Report
**Date:** October 7, 2025  
**Test Subject:** Dan's Natal Chart with Transits  
**Test Location:** Panama City, FL (30.17°N, 85.67°W, America/Chicago)  
**Test Date:** October 8, 2025

---

## Executive Summary

⚠️ **CRITICAL ISSUE IDENTIFIED**: System defaults to approximately **noon local time** but:
1. Does NOT capture or transmit explicit hour/minute to API
2. Does NOT record timestamp provenance (`timestamp_local`, `timestamp_utc`, `time_policy`)
3. Uses **UTC time extraction** (`getUTCHours()`) instead of **local time** in API payloads
4. House cusps show significant errors vs ground truth (ASC off by ~9°, MC structure completely wrong)

---

## Test Case 1: Current System Behavior (Default Time)

### API Request
- **Payload:** `test-oct8-2025.json` (no explicit time specified)
- **Expected Behavior:** Default to 12:00 noon local (America/Chicago)
- **Actual Time Used:** Unknown (no provenance stamps)

### Results

| Element | Current System | AstroSeek @ Noon | Error | Status |
|---------|----------------|------------------|-------|--------|
| **ASC** | 13°14' Aries | 0°00' Aries* | N/A | ⚠️ Incomplete ref data |
| **MC** | 22°10' Aries | 0°00' Capricorn* | N/A | ⚠️ Incomplete ref data |
| **Moon** | 6°46' Taurus | 7°23' Taurus | -0°37' | ✅ Close (expected drift) |
| **Sun** | 15°38' Libra | 15°40' Libra | -0°02' | ✅ Excellent |

*Note: AstroSeek provided 0°00' house cusps in original data (incomplete reference).

### Provenance Check
```json
{
  "timestamp_local": "NOT SET",
  "timestamp_utc": "NOT SET",  
  "time_policy": "NOT SET",
  "timezone": "US/Central"
}
```

**Result:** ❌ FAIL - Missing required provenance fields

---

## Test Case 2: Ground Truth Comparison (5:00 PM CDT)

### AstroSeek Reference Data
**Time:** October 8, 2025 @ 5:00 PM CDT (17:00 local, 22:00 UTC)

| Planet/Point | Position | Decimal |
|--------------|----------|---------|
| **ASC** | 4°27' Pisces | 334.45° |
| **MC** | 11°19' Sagittarius | 251.32° |
| **Moon** | 1°50' Taurus | 31.83° |
| **Sun** | 15°36' Libra | 195.60° |
| **Mercury** | 2°47' Scorpio | 212.78° |
| **Venus** | 23°22' Virgo | 173.37° |
| **Mars** | 11°03' Scorpio | 221.05° |
| **Jupiter** | 23°18' Cancer (R) | 113.30° |
| **Saturn** | 27°11' Pisces (R) | 357.18° |
| **Uranus** | 1°02' Gemini (R) | 61.03° |
| **Neptune** | 0°20' Aries (R) | 0.33° |
| **Pluto** | 1°22' Aquarius (R) | 301.37° |

### Time-Sensitive Elements

**Fast-Moving Bodies** (significant hourly drift):

| Element | Motion Rate | Noon → 5pm Change | Sensitivity |
|---------|-------------|-------------------|-------------|
| **Moon** | ~0.5°/hour | ~2.5° (5 hours) | 🔴 HIGH |
| **ASC** | ~15°/hour | ~75° (5 hours) | 🔴 CRITICAL |
| **MC** | ~15°/hour | ~75° (5 hours) | 🔴 CRITICAL |

**Current System @ Noon:**
- Moon: 6°46' Taurus (36.77°)
- ASC: 13°14' Aries (13.23°)  
- MC: 22°10' Aries (22.17°) [ERROR: Should be in Capricorn-Aquarius range]

**Ground Truth @ 5pm:**
- Moon: 1°50' Taurus (31.83°) → **4.94° earlier**
- ASC: 4°27' Pisces (334.45°) → **78.78° earlier** (5.25 hours * 15°/hour)
- MC: 11°19' Sagittarius (251.32°) → **229.15° earlier** (wrong quadrant)

**Analysis:**  
The house cusp discrepancy is **too large** to be explained by noon vs 5pm alone. This suggests:
1. **Timezone conversion error** - API receiving UTC time instead of local
2. **Reference frame mismatch** - Possible relocation calculation issue
3. **API defaulting differently** - May be using 00:00 UTC instead of local noon

---

## Root Cause Analysis

### Issue #1: UTC vs Local Time Extraction

**File:** `lib/server/astrology-mathbrain.js` (Line ~1932)

**Current Code (INCORRECT):**
```javascript
const base = {
  year: dt.getUTCFullYear(), 
  month: dt.getUTCMonth() + 1, 
  day: dt.getUTCDate(),
  hour: dt.getUTCHours(),      // ❌ WRONG - Extracts UTC hour
  minute: dt.getUTCMinutes(),  // ❌ WRONG - Extracts UTC minute
  zodiac_type: 'Tropic'
};
```

**Problem:**  
When `dt` represents "2025-10-08T12:00:00-05:00" (noon CDT):
- `dt.getUTCHours()` returns **17** (5pm UTC)
- API interprets this as **5pm local time** in Chicago timezone
- Actual chart calculated: **5pm CDT**, not noon

**Result:** 5-hour offset error → 75° house cusp rotation

### Issue #2: Missing Time Provenance

No code path currently sets:
- `provenance.timestamp_local`
- `provenance.timestamp_utc`
- `provenance.time_policy`

**Impact:** Impossible to verify what time was actually used in calculations.

### Issue #3: No User Time Input

The API accepts `transit_time` parameter but it's not implemented in the payload construction.

---

## Required Fixes

### Fix #1: Use Local Time Extraction (CRITICAL)

**File:** `lib/server/astrology-mathbrain.js` (~line 1930)

```javascript
// Import Luxon DateTime at top of file
const { DateTime } = require('luxon');

// In fetchTransitsForWindow function:
const localDt = DateTime.fromJSDate(dt, { zone: ianaTz });
const base = {
  year: localDt.year,
  month: localDt.month,
  day: localDt.day,
  hour: localDt.hour,      // ✅ CORRECT - Local hour
  minute: localDt.minute,  // ✅ CORRECT - Local minute
  zodiac_type: 'Tropic'
};
```

### Fix #2: Accept User-Specified Time

**File:** `lib/time-sampling.js`

```javascript
function buildWindowSamples(windowObj, ianaTz, timeSpec = null) {
  // timeSpec: { hour: 12, minute: 0 } or null for noon default
  const targetHour = timeSpec?.hour ?? 12;
  const targetMinute = timeSpec?.minute ?? 0;
  
  let cursor = DateTime.fromISO(start, { zone: ianaTz })
    .set({ hour: targetHour, minute: targetMinute, second: 0, millisecond: 0 });
  
  // ... rest unchanged
}
```

**File:** `lib/server/astrology-mathbrain.js` (validation)

```javascript
// In main handler, extract transit_time from request:
const transitTimeSpec = body.transit_time ? {
  hour: parseInt(body.transit_time.hour, 10),
  minute: parseInt(body.transit_time.minute, 10),
  timezone: body.transit_time.timezone,
  policy: 'explicit'
} : {
  hour: 12,
  minute: 0, 
  timezone: ianaTz,
  policy: 'noon_default'
};

// Pass to fetchTransitsForWindow:
const transitData = await fetchTransitsForWindow(
  validatedSubject, 
  transitParams, 
  transitTimeSpec  // <-- NEW
);
```

### Fix #3: Add Provenance Stamps

After transit calculation, enrich result:

```javascript
const localDt = DateTime.fromISO(transitParams.startDate, { 
  zone: transitTimeSpec.timezone 
}).set({ 
  hour: transitTimeSpec.hour, 
  minute: transitTimeSpec.minute 
});

result.provenance = {
  ...result.provenance,
  timestamp_local: localDt.toISO(),
  timestamp_utc: localDt.toUTC().toISO(),
  timezone: transitTimeSpec.timezone,
  time_policy: transitTimeSpec.policy,
  time_precision: 'minute'
};
```

---

## Validation Test Plan

### Test 1: Noon Baseline
**Input:** No `transit_time` specified  
**Expected:**
- Uses 12:00 local time
- `time_policy: "noon_default"`
- ASC/MC match AstroSeek @ noon (within ±1°)

### Test 2: Explicit 5pm
**Input:** `{ "transit_time": { "hour": 17, "minute": 0, "timezone": "America/Chicago" } }`  
**Expected:**
- ASC: 4°27' Pisces (±1°)
- MC: 11°19' Sagittarius (±1°)
- Moon: 1°50' Taurus (±0.5°)
- `time_policy: "explicit"`

### Test 3: Timezone Boundary
**Input:** Same natal, two locations (NY vs LA), same clock time  
**Expected:** Different ASC/MC due to longitude difference

### Test 4: Moon Drift
**Input:** Same date, 12:00 vs 17:00  
**Expected:** Moon position differs by ~2.5° (5 hours * 0.5°/hour)

---

## Impact Assessment

### Affected Features
- ✅ **Planetary Longitudes:** Currently accurate (slow-moving bodies)
- ❌ **House Cusps (ASC/MC):** CRITICAL ERROR (~75° offset)
- ❌ **Moon Position:** Moderate drift (~5° potential)
- ❌ **Aspect Timing:** May attribute to wrong day
- ❌ **Symbolic Weather Exports:** Mislabeled time context

### Data Quality
- **Pre-Fix Exports:** All readings represent ~noon local (possibly offset by UTC bug)
- **Hurricane Michael Benchmark:** Likely accurate if run at noon
- **User Exports:** Time context unclear/incorrect

### Migration Strategy
- Tag all historical data: `time_policy: "legacy_noon_approx"`
- Re-run critical benchmarks with explicit time
- Offer users "refresh" option with time picker

---

## Next Steps

1. ✅ Document time-of-day contract (TIME_OF_DAY_CONTRACT.md)
2. ⏳ Implement Fix #1 (local time extraction) - IMMEDIATE
3. ⏳ Implement Fix #2 (user time input) - HIGH PRIORITY
4. ⏳ Implement Fix #3 (provenance stamps) - REQUIRED
5. ⏳ Run validation tests with explicit times
6. ⏳ Update all UI labels: "Weather" → "Symbolic Weather"
7. ⏳ Add time picker to transit forms (default: 12:00)

---

## Acceptance Criteria

- [ ] ASC within ±1° of AstroSeek for same timestamp
- [ ] MC within ±1° of AstroSeek for same timestamp  
- [ ] Moon within ±0.5° of AstroSeek for same timestamp
- [ ] All outputs include `timestamp_local`, `timestamp_utc`, `time_policy`
- [ ] Noon vs 5pm same-day produces different ASC/MC/Moon
- [ ] No usage of `getUTC*()` methods for API hour/minute
- [ ] "Symbolic Weather" terminology throughout

---

**Report Status:** Analysis Complete  
**Priority:** CRITICAL - Geometric accuracy at risk  
**Blocking:** Production deployment for time-sensitive readings

