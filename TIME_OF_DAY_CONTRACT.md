# Time-of-Day Precision Contract for Balance Meter v4.0
**Status:** REQUIRED FIX  
**Priority:** HIGH - Affects geometric accuracy  
**Date:** October 7, 2025

---

## Problem Statement

The current implementation defaults all transit calculations to **12:00 noon local time**, regardless of user input. This causes:

1. **House Cusp Errors**: ASC/MC rotate 360° per day (~15°/hour). A 5-hour offset produces ~75° error.
2. **Moon Position Drift**: Moon moves ~0.5°/hour. Noon vs 5pm = ~2.5° difference.
3. **Aspect Timing Issues**: Exact aspect times can be missed or incorrectly attributed to wrong days.
4. **Falsifiability Violation**: Ground truth comparisons with AstroSeek fail when times don't match.

### Current Behavior

**File:** `lib/time-sampling.js`  
**Line 29:** `hour: 12, minute: 0` hardcoded for all samples

```javascript
let cursor = DateTime.fromISO(start, { zone: ianaTz })
  .set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
```

**Result:** All "daily" symbolic weather readings represent 12:00 noon, not user-specified times.

---

## Required Contract

### 1. Input Requirements (Non-Negotiable)

Every transit calculation MUST accept:

```typescript
interface TransitTimeSpec {
  hour: number;           // 0-23
  minute: number;         // 0-59
  timezone: string;       // IANA timezone (e.g., "America/Chicago")
  time_policy?: string;   // "explicit" | "noon_default" | "now"
}
```

**Accepted Input Sources:**
- **Explicit**: User provides `{ hour: 17, minute: 0, timezone: "America/Chicago" }`
- **"Now" mode**: Auto-fill current local time for "today" runs
- **Default fallback**: If omitted, use `12:00` local time + stamp `time_policy: "noon_default"`

**NEVER default to midnight (00:00)** - this produces worst-case house cusp errors.

### 2. API Payload Requirements

When calling RapidAPI Astrologer `/api/v4/transits`:

```javascript
const transit_subject = {
  year: dt.getFullYear(),      // Local year
  month: dt.getMonth() + 1,    // Local month
  day: dt.getDate(),           // Local day
  hour: dt.getHours(),         // Local hour (NOT UTC)
  minute: dt.getMinutes(),     // Local minute (NOT UTC)
  latitude: 30.166667,
  longitude: -85.666667,
  timezone: "America/Chicago", // IANA timezone
  city: "Panama City",
  nation: "US",
  zodiac_type: "Tropic"
};
```

**Critical:** The API expects **local time coordinates**, not UTC. Current code incorrectly uses `getUTCHours()` / `getUTCMinutes()`.

### 3. Provenance Requirements

Every calculation output MUST include:

```javascript
{
  "timestamp_local": "2025-10-08T17:00:00-05:00",  // ISO 8601 with offset
  "timestamp_utc": "2025-10-08T22:00:00Z",         // UTC equivalent
  "timezone": "America/Chicago",                   // IANA timezone
  "time_policy": "explicit",                       // How time was determined
  "time_precision": "minute",                      // Granularity (minute/hour/day)
  "coordinates": {
    "lat": 30.166667,
    "lon": -85.666667,
    "label": "Panama City, FL"
  },
  "houses_system": "Placidus",
  "relocation_mode": "Both_local"
}
```

**Time Policy Values:**
- `"explicit"` - User provided exact time
- `"noon_default"` - System defaulted to 12:00 local (no time specified)
- `"now"` - Auto-captured current time for "today" runs
- `"legacy_midnight"` - Old calculations (pre-fix) using 00:00 - DO NOT USE

### 4. Semantic Clarifications

**"Daily Symbolic Weather"** is **NOT a 24-hour average**. It is a **point-in-time snapshot** at the specified timestamp.

For multi-sample profiles (morning/noon/evening):
- Calculate 3 separate readings (06:00, 12:00, 18:00)
- Report min/mean/max per axis
- Label clearly: `"time_series_mode": "daily_profile"` with `sample_times` array

### 5. UI/UX Requirements

**Default Behavior:**
- Show time picker defaulting to 12:00 local
- Display: _"Transits are time-specific. Default: noon local time. Moon/angles change hourly."_

**Time Display:**
- Always show timestamp with timezone: "Oct 8, 2025 @ 5:00 PM CDT"
- Include tooltip: _"ASC/MC rotate 15°/hour, Moon moves 0.5°/hour"_

**Export Labels:**
- Replace "Weather Log" → "Symbolic Weather Log"
- File naming: `Symbolic_Weather_dan_2025-10-08_17-00-CDT.json`

---

## Implementation Plan

### Phase 1: Core Time Handling (IMMEDIATE)

**File:** `lib/time-sampling.js`

```javascript
function buildWindowSamples(windowObj, ianaTz, timeSpec = null) {
  // timeSpec: { hour: 12, minute: 0 } or null for noon default
  const defaultHour = timeSpec?.hour ?? 12;
  const defaultMinute = timeSpec?.minute ?? 0;
  
  let cursor = DateTime.fromISO(start, { zone: ianaTz })
    .set({ hour: defaultHour, minute: defaultMinute, second: 0, millisecond: 0 });
  
  // ... rest of function
}
```

**File:** `lib/server/astrology-mathbrain.js` (line ~1930)

```javascript
// BEFORE (WRONG - uses UTC):
const base = {
  year: dt.getUTCFullYear(), 
  month: dt.getUTCMonth() + 1, 
  day: dt.getUTCDate(),
  hour: dt.getUTCHours(),      // ❌ WRONG
  minute: dt.getUTCMinutes(),  // ❌ WRONG
  zodiac_type: 'Tropic'
};

// AFTER (CORRECT - uses local time):
const localDt = DateTime.fromJSDate(dt, { zone: ianaTz });
const base = {
  year: localDt.year,
  month: localDt.month,
  day: localDt.day,
  hour: localDt.hour,      // ✅ CORRECT
  minute: localDt.minute,  // ✅ CORRECT
  zodiac_type: 'Tropic'
};
```

### Phase 2: API Contract Updates

**File:** `lib/server/astrology-mathbrain.js` (validation layer)

Add `transit_time` to accepted request parameters:

```javascript
function validateRequest(body) {
  // ... existing validation
  
  if (body.transit_time) {
    if (typeof body.transit_time.hour !== 'number' || 
        body.transit_time.hour < 0 || body.transit_time.hour > 23) {
      return { valid: false, error: 'transit_time.hour must be 0-23' };
    }
    if (typeof body.transit_time.minute !== 'number' || 
        body.transit_time.minute < 0 || body.transit_time.minute > 59) {
      return { valid: false, error: 'transit_time.minute must be 0-59' };
    }
    if (!body.transit_time.timezone || 
        !DateTime.local().setZone(body.transit_time.timezone).isValid) {
      return { valid: false, error: 'transit_time.timezone must be valid IANA timezone' };
    }
  }
  
  return { valid: true };
}
```

### Phase 3: Provenance Enrichment

Add to all transit calculation outputs:

```javascript
function enrichProvenance(result, transitParams, timeSpec) {
  const localDt = DateTime.fromISO(transitParams.startDate, { 
    zone: timeSpec.timezone 
  }).set({ hour: timeSpec.hour, minute: timeSpec.minute });
  
  result.provenance = {
    ...result.provenance,
    timestamp_local: localDt.toISO(),
    timestamp_utc: localDt.toUTC().toISO(),
    timezone: timeSpec.timezone,
    time_policy: timeSpec.policy || "explicit",
    time_precision: "minute",
    // ... existing provenance fields
  };
}
```

### Phase 4: Testing

**Test Cases:**

1. **Noon vs 5pm same-day** - Different Moon/ASC/MC
2. **Midnight vs noon** - House cusp rotation validation  
3. **Timezone boundary** - CDT vs EST comparison
4. **"Now" mode** - Auto-capture current time
5. **Default fallback** - Missing time → noon + policy stamp
6. **Ground truth** - Oct 8 @ 5pm vs AstroSeek

---

## Validation Criteria

### ✅ Pass Conditions

1. **ASC/MC Accuracy**: Within ±1° of AstroSeek for same timestamp
2. **Moon Position**: Within ±0.5° of AstroSeek for same timestamp
3. **Time Policy**: All outputs have `time_policy` field
4. **Timezone Handling**: UTC ↔ local conversions preserve wall-clock time
5. **Reproducibility**: Same timestamp → identical output

### ❌ Fail Conditions

1. Any output with `timestamp_local` = `timestamp_utc` (indicates UTC-only)
2. ASC/MC > 5° error vs ground truth
3. Missing `time_policy` provenance
4. Using `getUTC*()` methods for API payload hour/minute

---

## Migration Strategy

### Backward Compatibility

**Legacy Exports** (pre-fix):
- Tag with `time_policy: "legacy_midnight"` or `time_policy: "legacy_noon"`
- Do NOT recompute automatically
- If user re-runs, new calculation gets explicit timestamp

**Display Notice:**
_"This reading was calculated with system default time. Re-run for time-specific results."_

---

## Ground Truth Test Case

**Oct 8, 2025 @ 5:00 PM CDT (Panama City, FL)**

| Element | AstroSeek Ground Truth | Expected API Result |
|---------|------------------------|---------------------|
| **ASC** | 4°27' Pisces | 4°27' ±1° |
| **MC** | 11°19' Sagittarius | 11°19' ±1° |
| **Moon** | 1°50' Taurus | 1°50' ±0.5° |
| **Sun** | 15°36' Libra | 15°36' ±0.05° |

**Payload:**
```json
{
  "transit_time": {
    "hour": 17,
    "minute": 0,
    "timezone": "America/Chicago"
  }
}
```

**Expected Provenance:**
```json
{
  "timestamp_local": "2025-10-08T17:00:00-05:00",
  "timestamp_utc": "2025-10-08T22:00:00Z",
  "time_policy": "explicit"
}
```

---

## Acceptance Checklist

- [ ] `buildWindowSamples()` accepts `timeSpec` parameter
- [ ] API payload uses local time (not UTC) for hour/minute
- [ ] All outputs include `timestamp_local`, `timestamp_utc`, `time_policy`
- [ ] UI shows time picker with noon default
- [ ] "Symbolic Weather" terminology used throughout
- [ ] Ground truth test passes (Oct 8 @ 5pm)
- [ ] Documentation updated (README, API docs)
- [ ] Legacy data tagged appropriately

---

## References

- **AstrologerAPI Schema**: `hour` and `minute` fields expect local time
- **Luxon DateTime**: `.toLocal()` vs `.toUTC()` conversions
- **IANA Timezones**: `America/Chicago`, `America/New_York`, etc.
- **ISO 8601**: Timestamp format with offset (e.g., `2025-10-08T17:00:00-05:00`)

---

**Next Steps:**
1. Run test with explicit 5pm time
2. Compare ASC/MC/Moon against ground truth
3. Implement fixes in phases
4. Update all documentation references
