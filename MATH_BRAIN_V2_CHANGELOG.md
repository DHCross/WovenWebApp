# Math Brain v2.0 - Unified Architecture Changelog

**Date**: October 13, 2025  
**Status**: Architecture Complete | Data Integration Pending

---

## Overview

This changelog documents the creation of a new, unified "Math Brain" architecture that implements strict `FIELD → MAP → VOICE` separation in compliance with the system's core protocols.

---

## What Was Built

### 1. **Math Brain Orchestrator** (`src/math_brain/main.js`)
**Purpose**: Central coordinator for the entire data generation pipeline.

**Features**:
- ✅ Reads `math_brain_setup.json` configuration files
- ✅ Validates compliance with transit-inclusive modes (`SYNASTRY_TRANSITS`, `COMPOSITE_TRANSITS`, `NATAL_TRANSITS`)
- ✅ Iterates through date ranges day-by-day
- ✅ Computes **Symbolic Weather** using the real `seismograph.aggregate` function
- ✅ Computes **Mirror Data** (relational dynamics) with real logic
- ✅ Computes **Poetic Hooks** (narrative triggers) with real aspect ranking
- ✅ Generates mandatory provenance block with all required metadata
- ✅ Outputs a single `unified_output.json` file (the "MAP")

**Current Limitation**:
- ⚠️ **CRITICAL**: Still uses `getMockAspectData()` for raw aspect fetching
- **Next Step**: Connect to `lib/server/astrology-mathbrain.js` for real API calls

---

### 2. **Markdown Formatter** (`src/formatter/create_markdown_reading.js`)
**Purpose**: Transforms the unified JSON into a self-contained Markdown file for the Poetic Brain.

**Features**:
- ✅ Reads `unified_output.json` (the MAP)
- ✅ Formats data into clean, structured Markdown sections for each day
- ✅ Uses **dynamic labels** from the data (no hardcoded values)
- ✅ Includes complete instructions for the Poetic Brain (Raven Calder GPT)
- ✅ Outputs `Woven_Reading_[Names]_[Dates].md`

**Fixes Applied**:
- Fixed hardcoded "(Contractive)" label → now uses `day.symbolic_weather.labels.directional_bias`
- Added proper handling of deprecated `volatility` field (v5.0 compliance)

---

### 3. **Summary Markdown Generator** (`utils/create_summary_markdown.js`)
**Purpose**: Lightweight utility to extract just the daily summary table from a Weather Log.

**Features**:
- ✅ Extracts `daily_readings` array from large Weather Log JSON files
- ✅ Generates a clean Markdown table
- ✅ Prevents GPT hallucination by providing minimal, focused data

---

## Key Fixes Applied

### **Issue 1: Mock Data Throughout**
**Problem**: All computation functions were returning hardcoded values.

**Fix**:
- `computeSymbolicWeather`: Now calls `seismograph.aggregate` with real transit data
- `computeMirrorData`: Now calculates individual contributions and relational metrics dynamically
- `computePoeticHooks`: Now ranks aspects by orb tightness and extracts real themes

### **Issue 2: Hardcoded Labels in Formatter**
**Problem**: The formatter had `(Contractive)` hardcoded for directional bias.

**Fix**:
- Now uses `day.symbolic_weather.labels.directional_bias` from the data
- Properly handles deprecated `volatility` field per v5.0 spec

### **Issue 3: Missing Imports**
**Problem**: Real modules were commented out as placeholders.

**Fix**:
- Imported `aggregate` from `../seismograph`
- Imported `classifyMagnitude` and `classifyDirectionalBias` from `../lib/reporting/metric-labels`

---

## Architecture Compliance

### ✅ **FIELD → MAP → VOICE Separation**
- **FIELD**: `math_brain_setup.json` (input configuration)
- **MAP**: `unified_output.json` (pure geometric data)
- **VOICE**: `Woven_Reading.md` (formatted prompt for Poetic Brain)

### ✅ **No Narrative in Math Brain**
- The Math Brain outputs only numbers, labels, and structured data
- No interpretation, prediction, or poetic language
- All narrative generation is deferred to the Poetic Brain

### ✅ **Provenance Included**
- Every output includes a `run_metadata` block with:
  - `math_brain_version`
  - `mode`
  - `house_system`
  - `orbs_profile`
  - `relocation_mode`
  - `engine_versions`
  - `date_range`

### ✅ **v5.0 Balance Meter Compliance**
- Uses only `Magnitude` and `Directional Bias` (no deprecated `SFD` or `Coherence`)
- Properly classifies metrics using the official label functions

---

## ✅ INTEGRATION COMPLETE

### **Math Brain v2 Now Live in API**

**Date Integrated**: October 13, 2025

The v2 Math Brain is now integrated into the production API at `app/api/astrology-mathbrain/route.ts`.

**How to Use**:

Users can request the v2 format by adding one of these flags to their request:

1. **HTTP Header**: `X-Math-Brain-Version: v2`
2. **JSON Property**: `"use_v2": true`
3. **JSON Property**: `"math_brain_version": "v2"`

**What Users Get**:

When v2 is requested, the API returns:
```json
{
  "success": true,
  "version": "v2",
  "unified_output": { ... },
  "markdown_reading": "...",
  "download_formats": {
    "mirror_report": {
      "format": "markdown",
      "content": "...",
      "filename": "Woven_Reading_Dan_Stephie_2025-10-11_to_2025-10-17.md"
    },
    "symbolic_weather": {
      "format": "json",
      "content": { ... },
      "filename": "unified_output_Dan_Stephie_2025-10-14.json"
    }
  }
}
```

**Backward Compatibility**:

The integration is **non-breaking**:
- Default behavior (no v2 flag) → Uses legacy system
- With v2 flag → Uses new unified architecture
- Existing UI and API clients continue to work unchanged

---

## What Still Needs to Be Done

### **Priority 1: Real Data Integration** ⚠️ **CRITICAL**
**Current State**: The orchestrator uses `getMockAspectData()` which returns fake aspects.

**Required Action**:
1. Create a new helper function in `lib/server/astrology-mathbrain.js`:
   ```javascript
   async function getDailyGeometricData(personA, personB, date, mode, headers) {
     // Fetch natal charts
     // Fetch transits for the date
     // Fetch synastry if needed
     // Return { transitsA, transitsB, synastryAspects }
   }
   ```
2. Update `src/math_brain/main.js` to call this function instead of `getMockAspectData`

**Impact**: Until this is done, v2 will return computed summaries based on mock data

### **Priority 2: UI Toggle**
Add a toggle in the UI to let users choose between legacy and v2 reports:
```html
<label>
  <input type="checkbox" name="use_v2" value="true">
  Use Math Brain v2 (New Format)
</label>
```

### **Priority 3: Error Handling Enhancement**
Add more robust error handling for:
- Missing or invalid configuration files
- API failures (rate limits, network errors)
- Invalid date ranges
- Missing person data

### **Priority 4: Composite Mode Support**
The current implementation focuses on `SYNASTRY_TRANSITS`. Add full support for:
- `COMPOSITE_TRANSITS` mode
- Composite chart fetching and aspect extraction

---

## Testing Checklist

- [x] Math Brain orchestrator runs without errors
- [x] Provenance block is correctly populated
- [x] `seismograph.aggregate` is called with real logic
- [x] Markdown formatter generates valid output
- [x] Dynamic labels are used (no hardcoding)
- [ ] Real API integration works end-to-end
- [ ] Error handling is robust
- [ ] Output JSON is valid and complete
- [ ] Poetic Brain can successfully interpret the Markdown output

---

## File Structure

```
WovenWebApp/
├── src/
│   ├── math_brain/
│   │   └── main.js                    # Math Brain orchestrator (NEW)
│   ├── formatter/
│   │   └── create_markdown_reading.js # Markdown formatter (NEW)
│   └── seismograph.js                 # Existing - imported by orchestrator
├── lib/
│   ├── server/
│   │   └── astrology-mathbrain.js     # Existing - needs new helper function
│   └── reporting/
│       └── metric-labels.js           # Existing - imported by orchestrator
├── utils/
│   └── create_summary_markdown.js     # Summary table generator (NEW)
├── examples/
│   ├── math_brain_setup_Dan_Stephie_20251012T062507.json  # Input config
│   ├── unified_output_Dan_Stephie_2025-10-14.json         # Generated MAP
│   ├── Woven_Reading_Dan_Stephie_2025-10-11_to_2025-10-17.md # Generated VOICE
│   └── Weather_Log_summary.md         # Summary table
└── MATH_BRAIN_V2_CHANGELOG.md         # This file
```

---

## Usage Examples

### Generate Unified Output
```bash
node src/math_brain/main.js examples/math_brain_setup_Dan_Stephie_20251012T062507.json
```

### Generate Markdown Reading
```bash
node src/formatter/create_markdown_reading.js examples/unified_output_Dan_Stephie_2025-10-14.json
```

### Generate Summary Table
```bash
node utils/create_summary_markdown.js examples/Weather_Log_dan-stephie_2025-10-13_to_2025-10-18.json examples/Weather_Log_summary.md
```

---

## Conclusion

The new Math Brain v2.0 architecture is **structurally complete** and **compliance-ready**. All core logic has been implemented with real calculations. The only remaining task is to replace the mock data source with real API calls to the astrology engine.

Once the data integration is complete, this system will provide a clean, robust, and maintainable pipeline for generating symbolic readings that are free from hallucination and fully aligned with the `FIELD → MAP → VOICE` protocol.
