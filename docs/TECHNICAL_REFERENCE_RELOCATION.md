# Technical Reference: Chart Relocation in The Woven Map

## Overview

Chart relocation (also called "local space astrology" or "astrocartography") adjusts a birth chart for a different geographic location while maintaining the original birth time. This document explains how relocation works in The Woven Map's Math Brain.

## Astrological Foundation

### What Changes With Relocation

| Component | Changes? | Why |
|-----------|----------|-----|
| Planetary Positions | ❌ No | Planets are at specific zodiacal degrees at a given moment (universal) |
| House Cusps | ✅ Yes | Houses are determined by local horizon and meridian (location-specific) |
| Ascendant | ✅ Yes | The degree of the zodiac rising on the eastern horizon (local) |
| MC (Midheaven) | ✅ Yes | The degree of the zodiac at the southern meridian (local) |
| Planetary Aspects | ❌ No | Angular relationships between planets don't change |
| Transit-to-House | ✅ Yes | Where transiting planets land in houses changes with relocation |

### Example

**Birth Data**: July 24, 1973, 2:30 PM  
**Birth Location**: Philadelphia, PA (40.0°N, 75.3°W)  
**Relocated To**: Panama City, FL (30.2°N, 85.7°W)

| Element | Natal (Philadelphia) | Relocated (Panama City) |
|---------|---------------------|------------------------|
| Sun position | 1° Leo | 1° Leo (unchanged) |
| Moon position | 15° Pisces | 15° Pisces (unchanged) |
| Ascendant | ~20° Scorpio | ~25° Scorpio (changed!) |
| MC | ~15° Virgo | ~20° Virgo (changed!) |
| Sun in House | 9th House | 8th House (changed!) |

## Technical Implementation

### API Usage

The AstrologerAPI's `/api/v4/birth-chart` endpoint calculates houses based on the coordinates provided:

```javascript
const natalChart = await fetch('https://astrologer.p.rapidapi.com/api/v4/birth-chart', {
  method: 'POST',
  body: JSON.stringify({
    year: 1973,
    month: 7,
    day: 24,
    hour: 14,
    minute: 30,
    latitude: 40.0259,   // Birth location
    longitude: -75.3138,
    timezone: 'America/New_York'
  })
});

const relocatedChart = await fetch('https://astrologer.p.rapidapi.com/api/v4/birth-chart', {
  method: 'POST',
  body: JSON.stringify({
    year: 1973,      // Same birth time
    month: 7,
    day: 24,
    hour: 14,
    minute: 30,
    latitude: 30.2027,   // Different location
    longitude: -85.6579,
    timezone: 'America/Chicago'  // Different timezone
  })
});
```

**Key insight**: The API doesn't have a separate "relocation" endpoint - you simply request a birth chart with different coordinates.

### Code Pattern in Math Brain

```javascript
// 1. Determine if relocation applies
const relocationApplies = 
  translocationContext?.applies === true &&
  (relocationMode === 'both_local' || 
   relocationMode === 'a_local' ||
   relocationMode === 'b_local');

// 2. Construct relocated subject
const relocatedSubject = {
  ...originalSubject,
  latitude: relocatedCoords.latitude,
  longitude: relocatedCoords.longitude,
  timezone: relocatedCoords.tz,
  city: relocatedCoords.city || 'Relocated Location'
};

// 3. Fetch relocated chart
const relocatedChart = await fetchNatalChartComplete(
  relocatedSubject,
  headers,
  pass,
  'person_a_relocated',
  'translocation_felt_weather'
);

// 4. Use relocated house cusps
const activeHouseCusps = relocatedChart.chart.house_cusps;

// 5. Pass to transit calculations
const { transitsByDate } = await getTransits(
  relocatedSubject,
  transitParams,
  headers,
  { ...pass, natalHouseCusps: activeHouseCusps }
);
```

### Data Structure

The relocated chart is stored alongside the natal chart:

```json
{
  "person_a": {
    "chart_natal": {
      "house_cusps": [10, 40, 70, ...],
      "angles": {
        "Ascendant": { "abs_pos": 10 },
        "Medium_Coeli": { "abs_pos": 100 }
      }
    },
    "chart_relocated": {
      "house_cusps": [15, 45, 75, ...],
      "angles": {
        "Ascendant": { "abs_pos": 15 },
        "Medium_Coeli": { "abs_pos": 105 }
      }
    },
    "chart": {
      // Active chart = relocated when relocation applies
      "house_cusps": [15, 45, 75, ...]
    }
  }
}
```

## Relocation Modes

| Mode | Person A | Person B | Use Case |
|------|----------|----------|----------|
| `A_local` | Relocated | Natal | Solo report for Person A at current location |
| `B_local` | Natal | Relocated | Solo report for Person B at current location |
| `Both_local` | Relocated | Relocated | Synastry report for both at shared location |
| `Midpoint` | Relocated | Relocated | Composite chart at midpoint location |
| `Natal` | Natal | Natal | Birth location analysis only |

## Transit Calculations

### House Assignment

When calculating transits, the system determines which house a transiting planet occupies:

```javascript
function calculateTransitHouse(transitPosition, houseCusps) {
  // Find which house the transit falls into
  for (let i = 0; i < 12; i++) {
    const currentCusp = houseCusps[i];
    const nextCusp = houseCusps[(i + 1) % 12];
    
    if (isPositionInHouse(transitPosition, currentCusp, nextCusp)) {
      return i + 1; // Return 1-indexed house number
    }
  }
}
```

**Critical**: This uses the relocated house cusps when relocation is active, ensuring correct house placement.

## Verification

### JSON Inspection Checklist

To verify relocation was truly applied (per Raven Calder's audit criteria):

1. **House Cusps Changed**
   ```json
   "chart_natal": { "house_cusps": [10, 40, 70, ...] }
   "chart_relocated": { "house_cusps": [15, 45, 75, ...] }
   ```
   ✅ Cusps should differ by 5-50° depending on distance relocated

2. **Ascendant/MC Changed**
   ```json
   "natal_asc": 10,
   "relocated_asc": 15
   ```
   ✅ Difference confirms horizon rotation

3. **Transit Houses Reflect Relocation**
   ```json
   "transitsByDate": {
     "2025-10-18": {
       "Sun": { "house": 5 }  // Different from natal house
     }
   }
   ```

4. **Relocation Metadata Present**
   ```json
   "relocation_summary": {
     "active": true,
     "mode": "both_local",
     "coordinates": { "lat": 30.20, "lon": -85.66 }
   }
   ```

## Common Pitfalls

### 1. Timezone Mismatch
**Problem**: Using natal timezone with relocated coordinates  
**Solution**: Update timezone to match relocated location

### 2. Missing House Cusps Parameter
**Problem**: Calling `getTransits` without `natalHouseCusps`  
**Solution**: Always pass relocated cusps via options parameter

### 3. Overwriting Natal Chart
**Problem**: Losing natal chart data when storing relocated  
**Solution**: Store both as separate properties (`chart_natal`, `chart_relocated`)

### 4. Person B Not Relocated
**Problem**: Only Person A gets relocated in synastry  
**Solution**: Apply same relocation pattern for both persons

## References

- [AstrologerAPI Documentation](https://rapidapi.com/psilo/api/astrologer)
- [Relocation Astrology Principles](https://www.astro.com/astrology/in_acg_e.htm)
- Internal: `lib/server/astrology-mathbrain.js` (lines 2785-2842, 3320-3395)
- Tests: `test/both-local-relocation.test.js`
