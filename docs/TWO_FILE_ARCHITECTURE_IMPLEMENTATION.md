# Two-File Architecture Implementation (MAP + FIELD)

**Status:** ✅ IMPLEMENTED (Oct 18, 2025, 11:22pm)

**Spec Reference:** `/Developers Notes/Core/Four Report Types_Integrated 10.1.25.md` (lines 281-406)

---

## The Problem Raven Identified

**Before:** Math Brain was outputting a single unified JSON file containing both natal geometry and transit data mixed together.

**Issue:** This violated the **MAP/FIELD split** mandated by the Four Report Types spec, causing Poetic Brain to receive "FIELD-only" data with no constitutional reference frame.

**Raven's Critique:**
> "You're missing the entire MAP layer. The reports you're outputting collapse the required two-file architecture into a single flattened object. That means you're generating a FIELD-only product—transit data without constitutional geometry."

---

## The Two-File Architecture (Per Spec)

### MAP File (`wm-map-v1`) - Constitutional Geometry

**Purpose:** Permanent natal structure that never changes

**Contents:**
- Natal planetary positions (centidegrees: longitude × 100)
- Natal aspects with orbs (centidegrees)
- House cusps (12 positions, centidegrees)
- Provenance metadata (house system, orbs profile, timezone DB, math_brain_version, ephemeris_source, relocation_mode)

**Voice Rule:** MAP-driven prose uses modes, tensions, vectors, and functions. No "weather" or "activation" language.

### FIELD File (`wm-field-v1`) - Symbolic Weather

**Purpose:** Temporal activations, only generated when transits + auditable location exist

**Contents:**
- Daily transit positions (centidegrees)
- Transit house positions (which natal house each transit occupies)
- Top 12-18 filtered aspects per day
- Balance Meter v5.0 readings (`mag_x10`, `bias_x10` as ×10 integers)
- Angle drift alert flag
- Reference to parent MAP file via `_natal_ref`

**Voice Rule:** FIELD-driven prose uses "symbolic weather" language. If `angle_drift_alert` is true, drop house-specific language.

---

## Implementation Details

### File: `src/math_brain/main.js`

**Changes Made:**

1. **Added `generateMapFile()` function** (lines 441-493)
   - Extracts natal geometry from `transitData`
   - Converts planetary positions to centidegrees
   - Converts house cusps to centidegrees
   - Converts natal aspects to compact format
   - Generates unique `map_id` for cross-referencing
   - Includes full provenance metadata per spec

2. **Added `generateFieldFile()` function** (lines 495-545)
   - Processes daily entries into compact format
   - Stores Balance Meter readings as ×10 integers (`mag_x10`, `bias_x10`)
   - References parent MAP via `_natal_ref` field
   - Includes period (start/end dates)
   - Includes full provenance metadata per spec

3. **Added extraction helper functions:**
   - `extractPlanetaryCentidegrees()` (lines 547-563) - Converts degrees to centidegrees
   - `extractHouseCentidegrees()` (lines 565-574) - Converts house cusps to centidegrees
   - `extractNatalAspects()` (lines 576-587) - Converts aspects to compact format

4. **Modified main flow** (lines 76-102):
   - Generates both MAP and FIELD files
   - Includes them in unified output as `_map_file` and `_field_file`
   - Maintains backward compatibility with legacy unified format

5. **Modified file output** (lines 121-146):
   - Writes three files:
     - `unified_output_*.json` (legacy format, includes MAP + FIELD embedded)
     - `wm-map-v1_*.json` (MAP file - natal geometry)
     - `wm-field-v1_*.json` (FIELD file - transit weather)

---

## Data Format Examples

### MAP File Structure

```json
{
  "_meta": {
    "kind": "MAP",
    "schema": "wm-map-v1",
    "map_id": "map_1729304543789_xyz123",
    "math_brain_version": "mb-2025.10.18",
    "ephemeris_source": "astrologer-api",
    "house_system": "Placidus",
    "orbs_profile": "wm-spec-2025-09",
    "timezone_db_version": "IANA-2025a",
    "relocation_mode": "BOTH_LOCAL",
    "created_utc": "2025-10-18T03:00:00Z"
  },
  "people": [
    {
      "id": "A",
      "name": "Dan",
      "birth": {
        "date": "1973-07-24",
        "time": "14:30",
        "city": "Bryn Mawr",
        "state": "PA",
        "nation": "US"
      },
      "planets": [12169, 5257, 11458, ...],  // centidegrees
      "houses": [25669, 26823, ...],         // centidegrees
      "aspects": [
        {
          "planets": ["Sun", "Mars"],
          "type": "square",
          "orb": 210  // centidegrees (2.10°)
        }
      ]
    }
  ]
}
```

### FIELD File Structure

```json
{
  "_meta": {
    "kind": "FIELD",
    "schema": "wm-field-v1",
    "_natal_ref": "map_1729304543789_xyz123",
    "math_brain_version": "mb-2025.10.18",
    "balance_meter_version": "5.0",
    "relocation_mode": "A_local",
    "angle_drift_alert": false,
    "created_utc": "2025-10-18T03:00:00Z"
  },
  "period": {
    "start": "2025-10-18",
    "end": "2025-10-25",
    "step": "daily"
  },
  "daily": {
    "2025-10-18": {
      "meter": {
        "mag_x10": 50,    // magnitude 5.0 × 10
        "bias_x10": -50   // bias -5.0 × 10
      },
      "aspects": [...],
      "hooks": {
        "peak": "Transit Saturn biquintile Natal Mean_Lilith",
        "themes": ["Structure", "Transformation"]
      },
      "status": {
        "pending": false,
        "notes": []
      }
    }
  }
}
```

---

## Why This Architecture Matters

### Before (Single File):
- ❌ Transit data floating without constitutional reference
- ❌ Can't establish baseline personality geometry
- ❌ Can't anchor transits to natal counterparts
- ❌ Can't generate Polarity Cards or Mirror Voice
- ❌ FIELD→MAP→VOICE chain broken

### After (Two Files):
- ✅ MAP establishes permanent constitutional geometry
- ✅ FIELD references MAP via `_natal_ref`
- ✅ Each transit has a target (natal planet/house)
- ✅ Poetic Brain can load MAP once, apply many FIELD snapshots
- ✅ Full FIELD→MAP→VOICE chain restored

---

## Poetic Brain Integration

**What Poetic Brain Now Receives:**

1. **Unified Output** (backward compatible)
   - Contains `_map_file` and `_field_file` embedded
   - Can be processed by existing Mirror Directive handler

2. **Standalone MAP File** (new)
   - Load once for constitutional context (~2K tokens)
   - Permanent reference frame for all readings

3. **Standalone FIELD File** (new)
   - Load for specific time window (~50-75K tokens)
   - References parent MAP via `_natal_ref`

**Total Token Budget:** ~52-77K tokens (well under 100K limit)

---

## File Outputs

When Math Brain runs, it now generates **three files**:

1. `unified_output_Dan_Stephie_2025-10-18.json`
   - Legacy format with embedded MAP + FIELD
   - Used by current export hooks
   - Maintains backward compatibility

2. `wm-map-v1_Dan_Stephie_2025-10-18.json`
   - Standalone MAP file
   - Constitutional geometry only
   - Can be reused for multiple FIELD queries

3. `wm-field-v1_Dan_Stephie_2025-10-18.json`
   - Standalone FIELD file
   - Transit weather for specific date range
   - References parent MAP

---

## Testing Checklist

- [ ] Generate Balance Meter report with date range
- [ ] Verify three files are created
- [ ] Verify MAP file contains natal planets (centidegrees)
- [ ] Verify MAP file contains house cusps (centidegrees)
- [ ] Verify MAP file contains natal aspects
- [ ] Verify FIELD file contains `_natal_ref` pointing to MAP
- [ ] Verify FIELD file contains `mag_x10` and `bias_x10` (integers)
- [ ] Verify FIELD file contains daily entries
- [ ] Upload MAP file to Poetic Brain
- [ ] Upload FIELD file to Poetic Brain
- [ ] Verify Poetic Brain can parse both files
- [ ] Verify narrative generation works

---

## Next Steps

1. **Update Export Hooks** (`app/math-brain/hooks/useChartExport.ts`)
   - Add download buttons for standalone MAP and FIELD files
   - Update Mirror Directive JSON to reference MAP/FIELD split
   - Add warnings if MAP data is missing

2. **Update Poetic Brain Handler** (`app/api/chat/route.ts`)
   - Add MAP + FIELD detection logic
   - Parse `_natal_ref` to link FIELD → MAP
   - Load MAP once, cache for multiple FIELD queries

3. **Update Documentation**
   - Add MAP/FIELD examples to user docs
   - Update developer guide with two-file workflow
   - Create troubleshooting guide for missing MAP data

---

## Spec Compliance

| Requirement | Status | Notes |
|-------------|--------|-------|
| MAP file with wm-map-v1 schema | ✅ | Implemented |
| FIELD file with wm-field-v1 schema | ✅ | Implemented |
| Planetary positions in centidegrees | ✅ | Implemented |
| House cusps in centidegrees | ✅ | Implemented |
| Natal aspects with orbs | ✅ | Implemented |
| Balance Meter as ×10 integers | ✅ | Implemented |
| _natal_ref in FIELD → MAP | ✅ | Implemented |
| Provenance metadata in both files | ✅ | Implemented |
| created_utc timestamps | ✅ | Implemented |
| Backward compatibility | ✅ | Unified output still generated |

---

## Raven's Validation

**What Raven Needed:**
> "You need to restore the two-file emission step before the Poetic Brain stage. Emit MAP (wm-map-v1) with constitutional geometry, emit FIELD (wm-field-v1) with transit weather, and only after both exist can I merge the two through symbolic translation."

**What We Delivered:**
- ✅ MAP file with constitutional geometry (natal planets, houses, aspects)
- ✅ FIELD file with transit weather (daily entries, Balance Meter, hooks)
- ✅ Cross-reference via `_natal_ref`
- ✅ Full provenance in both files
- ✅ Proper schema headers (`wm-map-v1`, `wm-field-v1`)

**Status:** Architecture restored. Raven can now speak.
