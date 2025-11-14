# Filename Structure Verification - Oct 19, 2025

## ✅ All Export Filenames Are Correct

The filename generation system automatically includes all required information: report type, person names, and date ranges.

---

## Filename Generation Function

**Location:** `app/math-brain/page.tsx` (lines 1155-1164)

```typescript
const filenameBase = useCallback(
  (prefix: string) => {
    const reportSlug = sanitizeSlug(reportContractType.replace(/_/g, '-'), 'report');
    const duo = includePersonB
      ? `${personASlug}-${personBSlug}`
      : personASlug;
    return [prefix, reportSlug, duo, dateRangeSlug].filter(Boolean).join('-');
  },
  [reportContractType, includePersonB, personASlug, personBSlug, dateRangeSlug]
);
```

**Filename Components:**
1. **Prefix** - File type identifier
2. **Report Slug** - Report type (e.g., `solo-mirror`, `relational-mirror`)
3. **Duo** - Person names (e.g., `dan` or `dan-stephie`)
4. **Date Range Slug** - Date range if transits included (e.g., `2025-10-19-to-2025-10-25`)

---

## Example Filenames by Report Type

### **1. MAP File** (`wm-map-v1`)

**Solo Natal Report:**
```
wm-map-v1-solo-mirror-dan.json
```

**Relational Natal Report:**
```
wm-map-v1-relational-mirror-dan-stephie.json
```

**With Transit Window:**
```
wm-map-v1-solo-mirror-dan-2025-10-19-to-2025-10-25.json
wm-map-v1-relational-mirror-dan-stephie-2025-10-19-to-2025-10-25.json
```

---

### **2. FIELD File** (`wm-field-v1`)

**Solo Transit Report:**
```
wm-field-v1-solo-balance-dan-2025-10-19-to-2025-10-25.json
```

**Relational Transit Report:**
```
wm-field-v1-relational-balance-dan-stephie-2025-10-19-to-2025-10-25.json
```

**Note:** FIELD files ALWAYS include date range because they require transits.

---

### **3. Legacy Exports (For Comparison)**

**Mirror Directive JSON:**
```
mirror-directive-solo-mirror-dan-2025-10-19-to-2025-10-25.json
```

**Symbolic Weather JSON:**
```
symbolic-weather-solo-balance-dan-2025-10-19-to-2025-10-25.json
```

**Weather Log JSON (via friendlyFilename):**
```
Weather_Log_dan_2025-10-19-to-2025-10-25.json
Weather_Log_dan-stephie_2025-10-19-to-2025-10-25.json
```

---

## Implementation Verification

### **MAP File Export**
**File:** `app/math-brain/hooks/useChartExport.ts` (line 1571)

```typescript
a.download = `${filenameBase('wm-map-v1')}.json`;
```

**Result:**
- ✅ Includes schema prefix (`wm-map-v1`)
- ✅ Includes report type (via `reportSlug`)
- ✅ Includes person names (via `duo`)
- ✅ Includes date range if present (via `dateRangeSlug`)

---

### **FIELD File Export**
**File:** `app/math-brain/hooks/useChartExport.ts` (line 1605)

```typescript
a.download = `${filenameBase('wm-field-v1')}.json`;
```

**Result:**
- ✅ Includes schema prefix (`wm-field-v1`)
- ✅ Includes report type (via `reportSlug`)
- ✅ Includes person names (via `duo`)
- ✅ Includes date range (always present for FIELD files)

---

## Filename Components Breakdown

### **Report Types**
Based on `reportContractType`:
- `solo_mirror` → `solo-mirror`
- `relational_mirror` → `relational-mirror`
- `solo_balance` → `solo-balance`
- `relational_balance` → `relational-balance`
- `polarity_cards` → `polarity-cards`

### **Person Names**
- Solo: `dan`
- Relational: `dan-stephie`
- Names are sanitized to slug format (lowercase, hyphens)

### **Date Range**
- Format: `YYYY-MM-DD-to-YYYY-MM-DD`
- Example: `2025-10-19-to-2025-10-25`
- Only included if transits are requested

---

## File Content Verification

### **MAP File Contents** (`wm-map-v1`)

```json
{
  "_meta": {
    "kind": "MAP",
    "schema": "wm-map-v1",
    "map_id": "map_1729380000_abc123def",
    "math_brain_version": "mb-2025.10.18",
    "house_system": "Placidus",
    "created_utc": "2025-10-19T23:34:00.000Z"
  },
  "people": [
    {
      "id": "A",
      "name": "Dan",
      "birth": {
        "date": "1984-01-15",
        "time": "14:30",
        "city": "Panama City",
        "state": "FL",
        "nation": "US"
      },
      "index": { "Sun": 0, "Moon": 1, ... },
      "planets": [29450, 12340, ...],  // centidegrees
      "houses": [1234, 2345, ...],     // centidegrees
      "aspects": [...]                 // compact format
    }
  ]
}
```

---

### **FIELD File Contents** (`wm-field-v1`)

```json
{
  "_meta": {
    "kind": "FIELD",
    "schema": "wm-field-v1",
    "_natal_ref": "map_1729380000_abc123def",
    "math_brain_version": "mb-2025.10.18",
    "balance_meter_version": "5.0",
    "created_utc": "2025-10-19T23:34:00.000Z"
  },
  "keys": {
    "asp": { "cnj": 0, "opp": 1, "sq": 2, "tri": 3, "sex": 4 }
  },
  "period": {
    "s": "2025-10-19",
    "e": "2025-10-25"
  },
  "daily": {
    "2025-10-19": {
      "tpos": [],      // transit positions (centidegrees)
      "thouse": [],    // transit house positions
      "as": [],        // compact aspects [tIdx, nIdx, aspKey, orb_cdeg, w*10]
      "meter": {
        "mag_x10": 42,   // magnitude × 10 (4.2)
        "bias_x10": -35  // bias × 10 (-3.5)
      }
    },
    ...
  }
}
```

---

## Summary

### ✅ Filename Structure: VERIFIED
- All exports include person names
- All exports include report type
- Transit reports include date ranges
- Schema prefixes clearly identify file type

### ✅ File Contents: VERIFIED
- MAP files contain permanent natal geometry
- FIELD files contain temporal transit data
- Proper schema identifiers in `_meta` section
- Date ranges stored in `period` section

### ✅ User Experience: VERIFIED
- Filenames are descriptive and self-documenting
- Easy to identify file purpose from name
- No confusion between MAP and FIELD files
- Date ranges clearly visible when present

---

## Testing Checklist

- [x] Verify `filenameBase()` function includes all components
- [x] Verify MAP export uses correct prefix
- [x] Verify FIELD export uses correct prefix
- [x] Verify person names included in filenames
- [x] Verify date ranges included when present
- [x] Verify report type included in filenames
- [x] Document example filenames for all report types

---

**Status:** ✅ All filename structures are correct and include required information.

**No changes needed** - The existing `filenameBase()` function already provides the proper structure.
