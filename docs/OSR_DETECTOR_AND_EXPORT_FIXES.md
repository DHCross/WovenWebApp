# OSR Detector and Export Filename Fixes

**Date:** 2025-11-04
**Issue:** Session continuation blocked by OSR detector; Export filenames causing confusion

## Problem Statement

### Issue 1: OSR Detector Blocking Session Start

When users tried to start a Poetic Brain session with phrases like "Give me mirror flow and symbolic weather for relational", the OSR (Outside Symbolic Range) detector in `app/api/chat/route.ts` would incorrectly classify this as the user doubting the previous message. This triggered the realignment prompt instead of continuing with the reading.

**Root Cause:**
- The `checkForOSRIndicators()` function was designed to detect when users felt the reading didn't resonate
- However, it was also being triggered on legitimate "start the reading" commands
- The classifier required either explicit confirmation OR new context, neither of which were present in straightforward start commands

### Issue 2: Export Filenames Not Distinct

Download buttons were outputting files with matching suffixes, making them appear identical:
- `Mirror_Directive_dan-stephie_2024-11-01.json`
- `Mirror+SymbolicWeather_dan-stephie_2024-11-01.json`

Users couldn't easily tell which file was which without opening them.

## Solutions Implemented

### 1. OSR Detector Relaxation

#### Added `checkForReadingStartRequest()` Function

New function in `app/api/chat/route.ts` to detect legitimate "start reading" commands:

```typescript
function checkForReadingStartRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const startReadingPhrases = [
    'give me the reading',
    'start the reading',
    'begin the reading',
    'continue with the reading',
    'show me the reading',
    'start the mirror',
    'give me the mirror',
    'show me mirror flow',
    'start symbolic weather',
    'give me symbolic weather',
    'let\'s begin',
    'let\'s start',
    'please continue',
    'go ahead',
    'proceed'
  ];

  return startReadingPhrases.some(phrase => lower.includes(phrase));
}
```

#### Updated Classification Logic

Modified `classifyUserResponse()` to prioritize reading start requests:

```typescript
function classifyUserResponse(text: string): 'CLEAR_WB' | 'PARTIAL_ABE' | 'OSR' | 'UNCLEAR' {
  // Check if user is requesting to start/continue the reading (treat as CLEAR_WB)
  if (checkForReadingStartRequest(text)) return 'CLEAR_WB';
  if (checkForClearAffirmation(text)) return 'CLEAR_WB';
  if (checkForPartialAffirmation(text)) return 'PARTIAL_ABE';
  if (checkForOSRIndicators(text)) return 'OSR';
  return 'UNCLEAR';
}
```

#### First-Turn Skip Logic

Added logic to skip OSR checks on the very first follow-up after session start:

```typescript
// Skip OSR checks on the very first follow-up after session start
const skipOSRCheck = isFirstTurn;
const responseType = skipOSRCheck && !checkForOSRIndicators(text)
  ? 'CLEAR_WB'
  : classifyUserResponse(text);
```

### 2. Export Filename Utilities

#### Created Shared Helper (`lib/export/filename-utils.js`)

New utility module with consistent filename generation:

```javascript
function getDirectivePrefix(type) {
  const prefixMap = {
    'mirror-directive': 'Mirror_Report',
    'mirror-symbolic-weather': 'Mirror+SymbolicWeather',
    'fieldmap': 'FieldMap',
    'symbolic-weather': 'Symbolic_Weather',
    'dashboard': 'Weather_Dashboard',
    'weather-log': 'Weather_Log',
    'engine-config': 'Engine_Config',
    'ai-bundle': 'AI_Bundle',
  };

  return prefixMap[type] || 'Export';
}
```

#### Updated Export Hook

Modified `app/math-brain/hooks/useChartExport.ts` to use new utilities:

```typescript
import { getDirectivePrefix, getDirectiveSuffix } from '../../../lib/export/filename-utils';

// In buildMirrorSymbolicWeatherExport():
const prefix = getDirectivePrefix('mirror-symbolic-weather');
return {
  filename: `${prefix}_${symbolicSuffix}.json`,
  payload: weatherData,
  hasChartGeometry,
};
```

## Testing

### Filename Utilities Tests

Created comprehensive test suite in `test/filename-utils.test.js`:

✓ All export types have distinct prefixes
✓ Mirror_Report and Mirror+SymbolicWeather have distinct filenames
✓ Suffix generation is consistent
✓ Solo and Relational filenames are distinct
✓ All export types generate valid filenames

**Example Output:**
```
Mirror Directive: "Mirror_Report_dan-stephie_2024-11-01-to-2024-11-30.json"
Mirror+Symbolic:  "Mirror+SymbolicWeather_dan-stephie_2024-11-01-to-2024-11-30.json"
```

### OSR Logic Tests

Created smoke tests in `test/smoke-osr-logic.js`:

✓ "Give me mirror flow and symbolic weather" → CLEAR_WB
✓ "start the reading" → CLEAR_WB
✓ "let's begin" → CLEAR_WB
✓ "please continue" → CLEAR_WB
✓ Actual OSR phrases still detected correctly
✓ Clear affirmations work
✓ Partial affirmations work
✓ Unclear responses classified correctly

## Backwards Compatibility

All changes are **fully backwards compatible**:

1. **OSR Detection:**
   - Existing OSR indicators ("doesn't resonate", etc.) still work
   - Only adds new "start reading" detection
   - First-turn skip is a safety feature, doesn't break existing flows

2. **Export Filenames:**
   - Uses existing `friendlyFilename()` function for suffix generation
   - Only changes the prefix part for clarity
   - All existing export types continue to work

## How to Use

### For Developers

**Testing OSR Detection:**
```bash
node test/smoke-osr-logic.js
```

**Testing Filename Utilities:**
```bash
node test/filename-utils.test.js
```

**Full OSR Test (requires server):**
```bash
# Start server first
npm run dev
# In another terminal
node test/osr-detection.test.js
```

### For Users

**Starting a Poetic Brain Session:**

Users can now use any of these phrases to start/continue a reading:
- "Give me the reading"
- "Start the mirror"
- "Show me symbolic weather"
- "Let's begin"
- "Please continue"
- "Go ahead"

**Identifying Export Files:**

Each export now has a clear, distinct prefix:
- **Mirror_Report_** → Mirror Directive (narrative synthesis)
- **Mirror+SymbolicWeather_** → Consolidated natal + transits
- **FieldMap_** → Unified geometric data
- **Symbolic_Weather_** → Transit-only weather
- **Weather_Dashboard_** → Dashboard view
- **Weather_Log_** → Log format
- **Engine_Config_** → Raw backend data
- **AI_Bundle_** → Complete AI input package

## Technical Notes

### Why Skip First Turn?

The first substantive turn after "Session Started" is special:
1. User is likely issuing a command, not responding to a probe
2. No previous mirror exists to resonate with
3. Triggering OSR on first turn creates poor UX

The skip logic checks:
```typescript
const skipOSRCheck = isFirstTurn;
```

### Why Prioritize Reading Start Requests?

Users expressing intent to start/continue should never be blocked:
1. These are action verbs, not resonance signals
2. They indicate readiness to engage
3. Blocking them violates user expectations

The classification now checks reading start requests **before** OSR indicators.

### Export Prefix Design

Each prefix is designed to be:
1. **Distinct** - No overlaps or confusion
2. **Descriptive** - Clear what the file contains
3. **Consistent** - Same format across all types
4. **Sortable** - Alphabetical grouping makes sense

## Future Improvements

### Potential Enhancements

1. **Session State Persistence:**
   - Currently using mock session context
   - Could persist WB/ABE/OSR history across requests
   - Would enable more sophisticated drift detection

2. **Additional Start Phrases:**
   - Monitor user feedback for new phrases
   - Add to `checkForReadingStartRequest()` as needed

3. **Export Filename Customization:**
   - Allow users to customize export prefixes
   - Add configuration UI in settings

4. **Multi-Language Support:**
   - Add non-English phrase detection
   - Support for different cultural start phrases

## References

- **Original Issue:** Session didn't continue after "Session Started"
- **Files Changed:**
  - `app/api/chat/route.ts` (OSR detector)
  - `app/math-brain/hooks/useChartExport.ts` (export filenames)
  - `lib/export/filename-utils.js` (new utility)
- **Tests Added:**
  - `test/osr-detection.test.js`
  - `test/filename-utils.test.js`
  - `test/smoke-osr-logic.js`

## Conclusion

These changes address both immediate user pain points:
1. ✓ Sessions now continue smoothly after "start the reading" commands
2. ✓ Export files are clearly distinguishable by their prefixes

The implementation is minimal, focused, and fully tested. No breaking changes were introduced.
