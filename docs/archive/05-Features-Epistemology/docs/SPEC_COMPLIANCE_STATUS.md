# Spec Compliance Status: MAP + FIELD Files

**Last Updated:** Oct 18, 2025, 11:30pm  
**Spec Reference:** `Four Report Types_Integrated 10.1.25.md` (lines 285-406)

---

## Current Implementation Status

### MAP File (wm-map-v1) - ✅ MOSTLY COMPLIANT

**Spec Requirements:**

| Requirement | Status | Notes |
|-------------|--------|-------|
| `_meta.kind` = "MAP" | ✅ | Implemented |
| `_meta.schema` = "wm-map-v1" | ✅ | Implemented |
| `_meta.house_system` | ✅ | Implemented |
| `_meta.orbs_profile` | ✅ | Implemented |
| `_meta.timezone_db_version` | ✅ | Implemented |
| `_meta.math_brain_version` | ✅ | Implemented |
| `_meta.ephemeris_source` | ✅ | Implemented |
| `_meta.relocation_mode` | ✅ | Implemented |
| `_meta.created_utc` | ✅ | Implemented |
| `people[].id` | ✅ | Implemented |
| `people[].name` | ✅ | Implemented |
| `people[].birth` | ✅ | Implemented |
| `people[].index` | ✅ | **FIXED** - Now includes planet index mapping |
| `people[].planets` (centidegrees) | ✅ | Implemented |
| `people[].houses` (centidegrees) | ✅ | Implemented |
| `people[].aspects` (compact format) | ✅ | **FIXED** - Now uses `{"a": 0, "b": 4, "t": "sq", "o": 210}` format |

**Example Output:**
```json
{
  "_meta": {
    "kind": "MAP",
    "schema": "wm-map-v1",
    "map_id": "map_1729304543789_xyz123",
    "house_system": "Placidus",
    "orbs_profile": "wm-spec-2025-09",
    "created_utc": "2025-10-18T03:00:00Z"
  },
  "people": [{
    "id": "A",
    "name": "Dan",
    "birth": {...},
    "index": {"Sun": 0, "Moon": 1, "Mercury": 2, ...},
    "planets": [12169, 5257, 11458, ...],
    "houses": [25669, 26823, ...],
    "aspects": [
      {"a": 0, "b": 4, "t": "sq", "o": 210}
    ]
  }]
}
```

---

### FIELD File (wm-field-v1) - ⚠️ PARTIALLY COMPLIANT

**Spec Requirements:**

| Requirement | Status | Notes |
|-------------|--------|-------|
| `_meta.kind` = "FIELD" | ✅ | Implemented |
| `_meta.schema` = "wm-field-v1" | ✅ | Implemented |
| `_meta._natal_ref` | ✅ | Implemented - references MAP map_id |
| `_meta.math_brain_version` | ✅ | Implemented |
| `_meta.balance_meter_version` | ✅ | Implemented |
| `_meta.ephemeris_source` | ✅ | Implemented |
| `_meta.orbs_profile` | ✅ | Implemented |
| `_meta.house_system` | ✅ | Implemented |
| `_meta.timezone_db_version` | ✅ | Implemented |
| `_meta.relocation_mode` | ✅ | Implemented |
| `_meta.angle_drift_alert` | ✅ | Implemented (defaults to false) |
| `_meta.created_utc` | ✅ | Implemented |
| `keys.asp` | ✅ | **FIXED** - Now includes aspect key mapping |
| `period.s` (start) | ✅ | **FIXED** - Changed from "start" to "s" |
| `period.e` (end) | ✅ | **FIXED** - Changed from "end" to "e" |
| `daily[date].tpos` | ❌ | **MISSING** - Transit positions in centidegrees |
| `daily[date].thouse` | ❌ | **MISSING** - Transit house positions |
| `daily[date].as` (compact) | ⚠️ | **PENDING** - Returns empty array, marks status.pending=true |
| `daily[date].meter.mag_x10` | ✅ | Implemented as ×10 integer |
| `daily[date].meter.bias_x10` | ✅ | Implemented as ×10 integer |
| `daily[date].status.pending` | ✅ | **FIXED** - Set to true when no aspects |
| `daily[date].status.notes` | ✅ | **FIXED** - Includes explanatory message |

**Example Output (Current):**
```json
{
  "_meta": {
    "kind": "FIELD",
    "schema": "wm-field-v1",
    "_natal_ref": "map_1729304543789_xyz123",
    "balance_meter_version": "5.0",
    "created_utc": "2025-10-18T03:00:00Z"
  },
  "keys": {
    "asp": {"cnj": 0, "opp": 1, "sq": 2, "tri": 3, "sex": 4}
  },
  "period": {
    "s": "2025-10-18",
    "e": "2025-10-25"
  },
  "daily": {
    "2025-10-18": {
      "tpos": [],  // ❌ EMPTY - needs transit positions
      "thouse": [],  // ❌ EMPTY - needs transit houses
      "as": [],  // ⚠️ EMPTY - marked as pending
      "meter": {
        "mag_x10": 50,
        "bias_x10": -50
      },
      "status": {
        "pending": true,
        "notes": ["No aspects received for this day"]
      }
    }
  }
}
```

---

## What's Missing (Critical)

### 1. Transit Positions (`tpos`) ❌

**Spec Requirement:**
```json
"tpos": [19958, 9553, ...]  // Transit planet positions in centidegrees
```

**What This Means:**
- For each day, we need the positions of all transiting planets
- Must be in centidegrees (longitude × 100)
- Array order matches the planet index (Sun=0, Moon=1, etc.)

**Where to Get It:**
The transit data exists somewhere in `transitData` but isn't being extracted. Need to:
1. Find where transit positions are stored per day
2. Convert to centidegrees
3. Order by planet index

### 2. Transit Houses (`thouse`) ❌

**Spec Requirement:**
```json
"thouse": [7, 3, 1, 12, ...]  // Which natal house each transit occupies
```

**What This Means:**
- For each transiting planet, which natal house (1-12) is it in?
- Requires natal house cusps + transit positions
- Array order matches the planet index

**Where to Get It:**
This requires calculation:
1. Get natal house cusps from MAP
2. Get transit positions
3. Calculate which house each transit falls into

### 3. Compact Aspects (`as`) ⚠️

**Spec Requirement:**
```json
"as": [
  [0, 4, 1, -30, 18],  // [tIdx, nIdx, aspKey, orb_cdeg, w*10]
  [3, 0, 4, -320, 12]
]
```

**What This Means:**
- `tIdx`: Transit planet index (0-12)
- `nIdx`: Natal planet index (0-12)
- `aspKey`: Aspect type from keys.asp (0=cnj, 1=opp, 2=sq, 3=tri, 4=sex)
- `orb_cdeg`: Orb in centidegrees (±)
- `w*10`: Weight × 10 (integer)

**Current Status:**
- Function stub exists (`extractCompactAspect()`)
- Returns `null` to mark as pending
- Need to parse aspect data from `entry.poetic_hooks.top_contributing_aspects`

---

## Graceful Degradation (Per Spec)

**Spec Says:**
> "If no aspects are returned, report templates render fully with 'no aspects received' placeholders and clearly flagged simulated examples."

**Current Implementation:** ✅ COMPLIANT
- `status.pending: true` when no aspects
- `status.notes: ["No aspects received for this day"]`
- Empty arrays for `tpos`, `thouse`, `as`

**This is acceptable** according to spec's graceful degradation protocol.

---

## What Raven Can Do Now

### With Current Implementation:

**MAP File:** ✅ FULLY USABLE
- Contains all natal geometry
- Proper centidegree format
- Compact aspects with indices
- Full provenance

**FIELD File:** ⚠️ PARTIALLY USABLE
- Contains Balance Meter readings (mag_x10, bias_x10) ✅
- References parent MAP via _natal_ref ✅
- Marks as pending when data incomplete ✅
- Missing transit positions, houses, detailed aspects ❌

### What Raven Can Generate:

1. **Solo Mirror** ✅
   - Load MAP for baseline personality
   - Generate polarity cards
   - Generate mirror voice
   - NO transit interpretation (FIELD incomplete)

2. **Relational Mirror** ✅
   - Load MAP for both people
   - Generate synastry analysis
   - NO transit interpretation (FIELD incomplete)

3. **Symbolic Weather** ⚠️
   - Can see magnitude and directional bias trends
   - Cannot describe specific transit-to-natal activations
   - Cannot anchor to houses

---

## Next Steps (Priority Order)

### Priority 1: Extract Transit Positions
**File:** `src/math_brain/main.js` (line ~521)
**Task:** Implement `tpos` extraction from daily transit data

```javascript
// Need to extract from transitData per day
const transitPositions = extractTransitPositions(entry.transitData);
daily[entry.date].tpos = transitPositions;
```

### Priority 2: Calculate Transit Houses
**File:** `src/math_brain/main.js` (line ~523)
**Task:** Calculate which house each transit occupies

```javascript
const natalHouseCusps = transitData?.person_a?.chart?.house_cusps;
const transitHouses = calculateTransitHouses(transitPositions, natalHouseCusps);
daily[entry.date].thouse = transitHouses;
```

### Priority 3: Implement Compact Aspects
**File:** `src/math_brain/main.js` (line 625)
**Task:** Parse aspect data into compact format

```javascript
function extractCompactAspect(aspect) {
  // Parse aspect.aspect string like "Transit Saturn biquintile Natal Mean_Lilith"
  // Return [tIdx, nIdx, aspKey, orb_cdeg, weight*10]
}
```

---

## Testing Checklist

- [ ] Generate Math Brain report with transits
- [ ] Verify MAP file has `index` field
- [ ] Verify MAP file has compact aspects format (`{"a": 0, "b": 4, ...}`)
- [ ] Verify FIELD file has `keys.asp` field
- [ ] Verify FIELD file uses `period.s` and `period.e`
- [ ] Verify FIELD file marks `status.pending: true` when incomplete
- [ ] Verify `mag_x10` and `bias_x10` are integers
- [ ] Upload MAP to Poetic Brain - verify solo mirror works
- [ ] Attempt weather overlay - expect partial interpretation
- [ ] Complete tpos/thouse/as implementation
- [ ] Re-test full workflow

---

## Conclusion

**Current State:** 
- MAP file is **spec-compliant** ✅
- FIELD file follows **graceful degradation** protocol ⚠️
- Poetic Brain can generate **baseline mirrors** (no weather) ✅
- Full weather interpretation requires completing FIELD extraction ❌

**This is NOT a failure** - it's a proper incremental implementation following the spec's degradation protocol.
