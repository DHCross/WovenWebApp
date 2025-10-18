# Bug Fix: Both_local Relocation Coordinate Extraction

**Date:** 2025-10-18  
**Issue:** "Both_local relocation requires shared coordinates" error  
**Status:** ✅ Fixed

## Problem

When using `Both_local` relocation mode with coordinates provided in `translocationBlock.current_location`, the system was throwing an error:

```json
{
  "success": false,
  "error": "Math Brain v2 processing failed",
  "detail": "Both_local relocation requires shared coordinates",
  "code": "LOCATION_REQUIRED",
  "legacyStatusCode": 400
}
```

## Root Cause

The coordinate extraction logic in `lib/server/astrology-mathbrain.js` was checking for coordinates in multiple locations:
- `translocationBlock.coords.latitude/longitude`
- `translocationBlock.latitude/longitude`
- `body.custom_location.latitude/longitude`
- `aLocal.latitude/longitude`
- `bLocal.latitude/longitude`

However, it was **NOT** checking `translocationBlock.current_location.latitude/longitude`, which is the structure used by the frontend when sending relocation requests with coordinates.

## Solution

Added support for `translocationBlock.current_location` as the **primary** location to check for coordinates in both `Both_local` and `A_local` relocation modes.

### Code Changes

**File:** `lib/server/astrology-mathbrain.js`

**Both_local mode (line ~4303):**
```javascript
// Check translocationBlock.current_location first (most common structure)
if (translocationBlock?.current_location && 
    typeof translocationBlock.current_location.latitude === 'number' && 
    typeof translocationBlock.current_location.longitude === 'number') {
  return { 
    lat: Number(translocationBlock.current_location.latitude), 
    lon: Number(translocationBlock.current_location.longitude), 
    tz: translocationBlock.current_location.timezone, 
    label: translocationBlock.current_location.label 
  };
}
```

**A_local mode (line ~4261):**
```javascript
// Check translocationBlock.current_location first (most common structure)
if (translocationBlock?.current_location && 
    typeof translocationBlock.current_location.latitude === 'number' && 
    typeof translocationBlock.current_location.longitude === 'number') {
  return { 
    lat: Number(translocationBlock.current_location.latitude), 
    lon: Number(translocationBlock.current_location.longitude), 
    tz: translocationBlock.current_location.timezone 
  };
}
```

## Request Structure

The fix supports the following request structure:

```json
{
  "mode": "SYNASTRY_TRANSITS",
  "relocation_mode": "BOTH_LOCAL",
  "translocation": {
    "applies": true,
    "method": "BOTH_LOCAL",
    "current_location": {
      "latitude": 30.202741997200352,
      "longitude": -85.6578987660695,
      "timezone": "America/Chicago",
      "label": "30.20°N, 85.66°W"
    }
  },
  "personA": { ... },
  "personB": { ... }
}
```

## Testing

### New Tests Added

1. **test/both-local-relocation.test.js**
   - Test Both_local with `translocationBlock.current_location` ✅
   - Test Both_local with `translocationBlock.coords` (legacy) ✅
   - Test A_local with `translocationBlock.current_location` ✅

2. **test/verify-bug-fix.js**
   - Direct verification using the exact failing payload from the bug report ✅

### Test Results

All tests pass:
```
📊 Test Results: 3 passed, 0 failed, 3 total
🎉 All tests passed!
```

### Regression Testing

Existing test suite (19 tests) continues to pass:
```
📊 Test Results: Passed: 19, Failed: 0, Total: 19
🎉 All tests passed!
```

## Impact

- ✅ Both_local relocation now works with `current_location` structure
- ✅ A_local relocation now works with `current_location` structure
- ✅ Backward compatibility maintained with legacy coordinate structures
- ✅ No breaking changes to existing functionality

## Related Files

- `lib/server/astrology-mathbrain.js` - Main fix
- `test/both-local-relocation.test.js` - Comprehensive test coverage
- `test/verify-bug-fix.js` - Direct bug verification

## Verification

The exact failing request from the bug report now succeeds:

```
✅ BUG FIXED: Request that was failing now succeeds!

Response Details:
  Status: 200
  Relocation Active: true
  Relocation Mode: both_local
  Location Label: 30.20°N, 85.66°W
```

## Notes

The fix prioritizes `current_location` as the first location to check, which aligns with how the frontend sends relocation data. The fallback checks for legacy structures remain in place to ensure backward compatibility.
