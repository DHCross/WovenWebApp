# Lessons Learned: Person B Relocation Bug (Dec 2025)

## Issue Summary

**Date**: 2025-12-01  
**Component**: Math Brain - Relational Field Engine  
**Severity**: Critical  
**Status**: ✅ Fixed

### The Bug

Person B's relocated chart was not being fetched in synastry modes (`SYNASTRY_TRANSITS`, `BOTH_LOCAL`), causing Person B's "Felt Weather" to incorrectly use natal house cusps instead of relocated house cusps. This meant Person B's daily symbolic weather readings were based on their birth location's sky geometry rather than their current location.

### Root Cause

The code in `lib/server/astrology-mathbrain.js` correctly implemented Person A's relocation logic (lines 2785-2842) but failed to replicate this pattern for Person B in the `SYNASTRY_TRANSITS` block (originally at lines 3320-3336).

**Missing logic:**
1. Detection of when Person B relocation should apply
2. Fetching Person B's relocated chart with new coordinates
3. Passing relocated house cusps to transit calculations

## Key Technical Insights

### 1. AstrologerAPI DOES Support Relocation

**Misconception**: Earlier analysis suggested the AstrologerAPI couldn't recalculate house cusps for relocated locations.

**Reality**: The `/api/v4/birth-chart` endpoint automatically recalculates location-dependent values (house cusps, Ascendant, MC) when you provide different geographic coordinates with the same birth time.

**How it works:**
```javascript
// Same birth time, different location
const relocatedSubject = {
  year: 1968, month: 4, day: 16,  // Birth time unchanged
  hour: 18, minute: 37,
  latitude: 30.20,    // New location
  longitude: -85.66,  // New location
  timezone: 'America/Chicago'  // New timezone
};

const relocated = await fetchNatalChartComplete(relocatedSubject, ...);
// API returns NEW house cusps for the relocated location!
```

### 2. Relocation vs. Transit Differences

**What changes with relocation:**
- ✅ House cusps (all 12 houses)
- ✅ Ascendant and MC (local horizon/meridian)
- ✅ Transit-to-house assignments
- ❌ Planetary positions (universal, same everywhere)
- ❌ Transit-to-natal aspects (aspects between planets)

### 3. Code Replication Pattern

The fix followed the successful Person A pattern:

```javascript
// 1. Detect if relocation applies
const bRelocationApplies = translocationApplies && (
  relocationMode === 'both_local' ||
  relocationMode === 'b_local'
);

// 2. Fetch relocated chart
if (bRelocationApplies) {
  const personBRelocated = await fetchNatalChartComplete(
    relocatedSubjectB,
    headers,
    pass,
    'person_b_relocated',
    'translocation_felt_weather_b'
  );
  
  // 3. Use relocated cusps
  activeHouseCuspsB = personBRelocated.chart.house_cusps;
}

// 4. Pass to transit calculation
await getTransits(subjectForTransitsB, {...}, headers, {
  ...pass,
  natalHouseCusps: activeHouseCuspsB  // ← Critical parameter
});
```

## Testing Strategy

### What Worked
- **Integration test**: `test/both-local-relocation.test.js` verified end-to-end functionality (3/3 tests passing)
- **Mocked API responses**: Allowed testing without external API calls
- **Log inspection**: Verified relocated chart fetch via log messages

### What Didn't Work
- **Custom test with simplified mocks**: Mock data structure didn't match the complex structure expected by `fetchNatalChartComplete`
- **Lesson**: When creating test mocks, study the actual data extraction logic, don't guess the structure

## Prevention Strategies

### 1. Code Architecture
**Problem**: Duplicate logic paths for Person A and Person B increase bug surface area.

**Future improvement**: Create a reusable `handleRelocation(person, relocationConfig)` function that both Person A and Person B can call.

### 2. Testing
**Problem**: No specific test for Person B relocation until bug was discovered.

**Future improvement**: Add parametric tests that verify identical behavior for both persons:
```javascript
['personA', 'personB'].forEach(person => {
  test(`${person} relocation applies correctly`, ...);
});
```

### 3. JSON Inspection Protocol
Per user requirements, implement automated checks that verify:
- House cusps changed from natal to relocated
- Transit-to-house assignments reflect relocation
- Both `chart_relocated` and `chart_natal` are present
- Dual house sets exist for synastry modes

## Technical Debt Identified

1. **DUAL_NATAL_TRANSITS mode**: Needs same fix applied (around line 3074)
2. **MAP layer visualization**: No dual-relocated house visualization yet
3. **Debug tooling**: No debug panel for verifying relocation application
4. **Directional bias calculation**: May need adjustment for dual-relocated scenarios

## References

- **Fix commit**: Person B relocation logic in `SYNASTRY_TRANSITS` mode
- **Test suite**: `test/both-local-relocation.test.js`
- **Implementation plan**: `.gemini/antigravity/brain/.../implementation_plan.md`
- **Walkthrough**: `.gemini/antigravity/brain/.../walkthrough.md`

## Verification Checklist

When implementing similar fixes:
- [ ] Code pattern replicated for all relevant persons
- [ ] Relocation detection logic covers all modes
- [ ] House cusps passed to all downstream calculations
- [ ] Both natal and relocated charts stored separately
- [ ] Tests verify actual house cusp changes in output
- [ ] Logs confirm relocated chart fetch
- [ ] JSON inspection reveals true relocation (per audit criteria)
