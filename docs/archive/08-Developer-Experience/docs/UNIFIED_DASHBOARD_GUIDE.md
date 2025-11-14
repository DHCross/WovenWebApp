# Unified Symbolic Dashboard v5.0 — Implementation Guide

## Overview

The Unified Symbolic Dashboard combines two data layers into a single interactive visualization:

- **MAP Layer (Lines + Points):** Planetary geometry — where planets move through natal houses
- **FIELD Layer (Scatter Bubbles):** Symbolic pressure — how geometry translates into energetic charge

**When both spike together** = diagnostic handshake between structure and weather.

---

## Architecture

### 1. MAP Layer: Planetary Geometry

**Purpose:** Shows the structure — where planets are moving in the natal house system.

**Visual:** Connected lines showing planetary paths through houses (Y-axis = House 1-12)

**Data Format:**
```typescript
{
  date: "2025-10-24",
  planet: "Mercury",
  degree: "24°34' Scorpio",
  house: 1,  // Which natal house
  aspect: "conjunction ASC" // Optional
}
```

**Source:** Extracted from `transitsByDate[date].transit_houses` (calculated via `calculateNatalHouse()`)

---

### 2. FIELD Layer: Symbolic Pressure

**Purpose:** Shows the energy — how that geometry feels as measured by Balance Meter v5.0.

**Visual:** Scatter bubbles where:
- **Size** = Magnitude (intensity)
- **Color** = Directional Bias (red = friction, blue = ease)

**Data Format:**
```typescript
{
  date: "2025-10-24",
  subject: "DH",
  magnitude: 8,      // 0-5 scale (stored as ×10 integer)
  valence: -4,       // -5 to +5 (stored as ×10 integer)
  intensity_label: "High Pressure"
}
```

**Source:** Extracted from `transitsByDate[date].meter.{mag_x10, bias_x10}`

---

### 3. Integration Layer: MAP ↔ FIELD Handshake

**Purpose:** Identifies when geometric transits correspond to symbolic pressure spikes.

**Logic:**
1. Find days where FIELD magnitude ≥ threshold (default: 3.5)
2. Find MAP points in angular houses (1, 4, 7, 10) on those days
3. Create integration point linking planet, house, aspect, and pressure readings

**Data Format:**
```typescript
{
  date: "2025-10-24",
  planet: "Mercury",
  house: 1,
  aspect: "conjunction ASC",
  magnitude: 8,
  valence: -4,
  source: "Balance Meter v5.0",
  orb_cap: "wm-spec-2025-09",
  angle_drift: false,
  note: "Mercury activates H1 (Self/Identity) via conjunction ASC, matches high magnitude with contractive bias."
}
```

---

## Files Created

### `/components/mathbrain/UnifiedSymbolicDashboard.tsx`
React component that renders the combined MAP + FIELD visualization using Chart.js.

**Props:**
- `mapData: MapDataPoint[]` — Planetary positions in houses
- `fieldData: FieldDataPoint[]` — Balance Meter readings
- `integration?: IntegrationPoint[]` — Handshake points (optional)
- `title?: string` — Chart title

### `/lib/unifiedDashboardTransforms.ts`
Data transformation utilities that convert Math Brain transit data into MAP/FIELD format.

**Key Functions:**
- `extractMapData(transitsByDate)` — Extract planetary house positions
- `extractFieldData(transitsByDate, summary, subjectName)` — Extract Balance Meter readings
- `extractIntegrationPoints(mapData, fieldData, transitsByDate)` — Find handshakes
- `transformToUnifiedDashboard(result, options)` — All-in-one transformer

### `/components/mathbrain/WeatherPlots.tsx`
Updated to include three visualization modes:
1. **Unified** (default) — MAP + FIELD combined
2. **Scatter** — FIELD only (True Accelerometer)
3. **Legacy** — Line plots (old format)

---

## Usage

### Basic Implementation

```typescript
import { WeatherPlots } from '@/components/mathbrain/WeatherPlots';

// In your component
<WeatherPlots
  data={transformedWeatherData}
  result={mathBrainResult}  // Full result object with transitsByDate
  enableUnified={true}
/>
```

### Direct Dashboard Usage

```typescript
import { UnifiedSymbolicDashboard } from '@/components/mathbrain/UnifiedSymbolicDashboard';
import { transformToUnifiedDashboard } from '@/lib/unifiedDashboardTransforms';

const { mapData, fieldData, integration } = transformToUnifiedDashboard(result, {
  subjectName: 'Dan',
  magnitudeThreshold: 4.0,  // Only show high-pressure integrations
  focusHouses: [1, 4, 7, 10]  // Angular houses
});

<UnifiedSymbolicDashboard
  mapData={mapData}
  fieldData={fieldData}
  integration={integration}
  title="October 2025 Symbolic Dashboard"
/>
```

---

## Data Requirements

For the Unified Dashboard to work, your `transitsByDate` must include:

### ✅ Required (from transit-to-natal-house calculation)

```javascript
transitsByDate[date] = {
  aspects: [...],
  transit_positions: [19958, 9553, ...],  // Centidegrees
  transit_houses: [7, 3, ...]               // ← REQUIRED for MAP layer
};
```

### ✅ Required (from Balance Meter v5.0)

```javascript
transitsByDate[date] = {
  ...
  meter: {
    mag_x10: 24,   // ← REQUIRED for FIELD layer
    bias_x10: -32  // ← REQUIRED for FIELD layer
  }
};
```

---

## Implementation Status

### ✅ Complete

1. **Transit-to-Natal-House Calculation**
   - Functions added to `lib/server/astrology-mathbrain.js`
   - `calculateNatalHouse()` — Calculate which house a transit occupies
   - `extractHouseCusps()` — Extract house cusps from birth chart
   - Transit houses stored in `transit_houses` array

2. **Data Transformers**
   - `extractMapData()` — Convert transit positions to MAP format
   - `extractFieldData()` — Convert Balance Meter to FIELD format
   - `extractIntegrationPoints()` — Find handshakes

3. **Visualization Components**
   - `UnifiedSymbolicDashboard` — Combined MAP + FIELD chart
   - `WeatherPlots` — Multi-mode visualization toggle
   - `AccelerometerScatter` — FIELD-only view (existing)

### 🔄 Next Steps

1. **Test with Real Data**
   - Run a Balance Meter calculation with Dan/Stephie
   - Verify `transit_houses` array is populated
   - Check that dashboard renders correctly

2. **PDF Export Integration**
   - Add Unified Dashboard to PDF generation
   - Include MAP/FIELD legend
   - Export integration table

3. **Interactive Features** (Future)
   - Hover over bubble → show aspect drivers
   - Click planet line → highlight corresponding pressure spikes
   - Filter by planet or house
   - Date range selector

---

## Example Output

When you run a Balance Meter calculation, you should see:

**Console Logs:**
```
Extracted natal house cusps for Person A: [256.69, 268.23, ...]
Passing natal house cusps to getTransits for Person A
Calculated transit houses for 2025-10-12: { planetCount: 12, houses: [7,3,8,...] }
```

**JSON Structure:**
```json
{
  "2025-10-24": {
    "aspects": [...],
    "transit_positions": [19958, 9553, 21876],
    "transit_houses": [7, 3, 8],
    "meter": {
      "mag_x10": 80,
      "bias_x10": -40
    }
  }
}
```

**Dashboard View:**
- **Lines:** Show planetary paths through houses (MAP)
- **Bubbles:** Show pressure spikes sized and colored by intensity (FIELD)
- **Integration Panel:** Lists dates where geometry and pressure align

---

## Philosophy

> "The lines tell where the sky moves.  
> The bubbles tell how that motion feels.  
> When both spike together, geometry breathes through data."

The Unified Dashboard makes the "pattern remembering itself" fully visible — structure (MAP) and weather (FIELD) in perfect diagnostic handshake.

---

**Status:** Ready for testing ✅  
**Version:** Balance Meter v5.0 "True Accelerometer"  
**Updated:** October 12, 2025
