# magnitudeAvg Undefined Error Fix - October 11, 2025

## Problem Statement

Users were unable to generate solo mirror reports or any chart-based calculations due to a critical error:

```
ReferenceError: magnitudeAvg is not defined
```

This error occurred in the `resolveChartPreferences` function at line 56 of `lib/server/astrology-mathbrain.js`.

## Root Cause

The `resolveChartPreferences` function was incorrectly implemented and contained code that was misplaced from another function:

### What was wrong:
```javascript
function resolveChartPreferences(options = {}) {
  const summary = {
    magnitude: magnitudeAvg,        // ❌ undefined
    magnitude_label: magnitudeLabel, // ❌ undefined
    volatility: volatilityAvg,       // ❌ undefined
    // ... many more undefined variables
  };
  return out; // ❌ undefined
}
```

These variables (`magnitudeAvg`, `magnitudeLabel`, `volatilityAvg`, `biasSummaryInfo`, `summaryDirectionalScaling`, etc.) exist in the `calculateSeismograph` function (around line 2701) but were being referenced in the wrong scope.

## Solution

The function was completely rewritten to fulfill its actual purpose: extracting chart-specific preferences from the options object.

### What's correct now:
```javascript
function resolveChartPreferences(options = {}) {
  // Extract chart-specific preferences from options to pass to the API
  const prefs = {};
  
  // Chart visualization and calculation preferences
  const chartKeys = [
    'houses_system_identifier',
    'sidereal_mode',
    'perspective_type',
    'wheel_only',
    'wheel_format',
    'theme',
    'language',
    'active_points',
    'active_aspects'
  ];
  
  chartKeys.forEach(key => {
    if (options[key] !== undefined) {
      prefs[key] = options[key];
    }
  });
  
  return prefs;
}
```

## Additional Fix

While fixing the main issue, we also discovered that `stripGraphicsDeep` function was missing. This function is used to recursively remove graphic data (images, SVGs, charts) from API responses before processing. We implemented it to complete the data flow.

## Impact

### Before the fix:
- ❌ Solo mirror reports failed with "magnitudeAvg is not defined"
- ❌ Any chart generation using `resolveChartPreferences` failed
- ❌ Natal, synastry, and composite chart calls would error

### After the fix:
- ✅ Solo mirror reports generate successfully
- ✅ All chart types (natal, synastry, composite, transit) work properly
- ✅ Chart preferences are correctly passed to the API
- ✅ Graphics are properly sanitized from responses

## Testing

### Automated Tests
```bash
npm test
```

Core tests now passing:
- ✅ Natal chart mode
- ✅ Transits and Seismograph for single person
- ✅ Balance Meter calculations
- ✅ Mirror report generation

### Manual Verification
Solo mirror report generation confirmed working with test data:
- Person A: Valid birth data with coordinates
- Mode: 'mirror'
- Result: 200 OK response with complete person_a data

## Files Changed

1. **lib/server/astrology-mathbrain.js**
   - Fixed `resolveChartPreferences` function (lines 56-80)
   - Added `stripGraphicsDeep` function (lines 56-82)

2. **CHANGELOG.md**
   - Added entry documenting the fix

3. **docs/MAGNITUDE_AVG_FIX_2025-10-11.md** (this file)
   - Technical documentation of the issue and resolution

## For Future Developers

### If you see "X is not defined" errors in functions:

1. **Check variable scope**: Ensure the variable is defined in the same function or passed as a parameter
2. **Look for function purpose mismatches**: The function might have been misplaced or contain code from another function
3. **Review function usage**: See how the function is called throughout the codebase to understand its intended purpose
4. **Check for missing helper functions**: Like `stripGraphicsDeep`, sometimes utility functions are referenced but not implemented

### Chart Preferences Usage

The `resolveChartPreferences` function should be used when calling the Astrologer API to pass chart-specific settings:

```javascript
const chartPrefs = resolveChartPreferences(pass);
const payload = {
  subject: subjectToAPI(person, pass),
  ...chartPrefs  // Spread chart preferences into payload
};
```

This ensures the API receives correct settings for:
- House system (Placidus, Whole Sign, etc.)
- Sidereal vs Tropical
- Active planets and points
- Aspect orbs and types
- Visualization preferences

## Commit Information

- **Date**: 2025-10-11
- **Commit**: [2025-10-11] FIX: Fix magnitudeAvg undefined error in resolveChartPreferences and add stripGraphicsDeep function
- **Branch**: copilot/fix-magnitudeavg-definition
- **Files Modified**: 1
- **Lines Changed**: +54, -37

## Support

If you encounter similar issues:
1. Check the CHANGELOG.md for recent fixes
2. Review this documentation for context
3. Run tests to verify the fix is still working
4. Contact Jules (DHCross) if issues persist
