# "Snapshot Now" Feature Implementation Plan

**Date:** October 4, 2025
**Status:** Ready to Implement
**Effort:** ~30 minutes

## Overview

Add "Snapshot This Moment" functionality to Math Brain to capture real-time relocated transit data. This leverages **existing relocation engine**—no backend changes needed.

## What You Already Have ✅

### Backend (100% Complete)
- ✅ Relocation engine ([lib/relocation-shim.js](../../lib/relocation-shim.js))
- ✅ Placidus calculation ([lib/relocation-houses.js](../../lib/relocation-houses.js))
- ✅ Translocation modes: `A_local`, `B_local`, `Both_local`
- ✅ Astrologer API integration with 3-tier fallback
- ✅ Transit chunking (5 concurrent max)

### What's Missing (UI Only)
- ❌ "Snapshot Now" button
- ❌ Geolocation picker
- ❌ Single-moment mode (currently requires date range)

## Implementation

### 1. Add Helper Function (lib/utils/snapshot.ts)

```typescript
export async function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      }),
      () => resolve(null) // Fallback on permission denial
    );
  });
}

export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
```

### 2. Add State Variables (app/math-brain/page.tsx)

```typescript
const [snapshotMode, setSnapshotMode] = useState(false);
const [snapshotLocation, setSnapshotLocation] = useState<{ lat: number; lon: number } | null>(null);
```

### 3. Add Snapshot Handler

```typescript
async function handleSnapshotNow() {
  setLoading(true);
  setError(null);

  try {
    // Get current location
    const location = await getUserLocation();
    if (!location) {
      setError('Location permission denied. Please enter coordinates manually.');
      setLoading(false);
      return;
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Use existing Math Brain with single-day window
    const payload = {
      personA: {
        ...personA,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: getCurrentTimezone()
      },
      personB: includePersonB ? personB : undefined,
      relocation_mode: 'A_local',
      translocation: {
        applies: true,
        method: 'A_local',
        current_location: {
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: getCurrentTimezone()
        }
      },
      start: todayStr,
      end: todayStr,
      step: 'day',
      mode: reportType
    };

    const response = await fetch('/api/astrology-mathbrain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    setResult(data);
    setSnapshotMode(true);
    setSnapshotLocation(location);

  } catch (err) {
    setError(err instanceof Error ? err.message : 'Snapshot failed');
  } finally {
    setLoading(false);
  }
}
```

### 4. Add UI Button (insert before "Generate Report" button)

```tsx
{/* Snapshot Controls */}
<div className="mb-4 flex gap-2">
  <button
    type="button"
    onClick={handleSnapshotNow}
    disabled={loading}
    className="inline-flex items-center gap-2 rounded-md border border-purple-600 bg-purple-700/30 px-4 py-2 text-sm text-white hover:bg-purple-700/40 disabled:opacity-50"
  >
    📸 Snapshot This Moment
  </button>

  {snapshotMode && snapshotLocation && (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span>📍 {snapshotLocation.lat.toFixed(2)}°N, {snapshotLocation.lon.toFixed(2)}°W</span>
      <button
        onClick={() => setSnapshotMode(false)}
        className="text-purple-400 hover:text-purple-300"
      >
        ✕ Clear
      </button>
    </div>
  )}
</div>
```

### 5. Update Result Display (add after existing result section)

```tsx
{snapshotMode && result && (
  <div className="mt-6 rounded-lg border border-purple-700 bg-purple-900/20 p-4">
    <h3 className="mb-3 text-lg font-semibold text-purple-300">
      🕐 Snapshot: {new Date().toLocaleString()}
    </h3>

    {/* Woven Map Domains */}
    <div className="grid grid-cols-2 gap-4">
      {['Self (H1)', 'Connection (H2)', 'Growth (H3)', 'Responsibility (H4)'].map(domain => {
        const houseNum = parseInt(domain.match(/\d/)?.[0] || '1');
        const planets = result.person_a?.chart?.positions?.filter(
          (p: any) => p.house === houseNum
        ) || [];

        return (
          <div key={domain} className="rounded border border-slate-700 bg-slate-800/50 p-3">
            <h4 className="mb-2 text-sm font-medium text-slate-300">{domain}</h4>
            {planets.length > 0 ? (
              <ul className="space-y-1 text-xs text-slate-400">
                {planets.map((p: any) => (
                  <li key={p.name}>
                    {p.name} in {p.sign} ({p.degree?.toFixed(1)}°)
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No planets</p>
            )}
          </div>
        );
      })}
    </div>

    {/* Relocated Houses */}
    <div className="mt-4 text-xs text-slate-400">
      <p><strong>ASC:</strong> {result.person_a?.chart?.houses?.asc?.sign} {result.person_a?.chart?.houses?.asc?.degree?.toFixed(1)}°</p>
      <p><strong>MC:</strong> {result.person_a?.chart?.houses?.mc?.sign} {result.person_a?.chart?.houses?.mc?.degree?.toFixed(1)}°</p>
    </div>
  </div>
)}
```

## How It Works

### Data Flow
```
User clicks "Snapshot Now"
  ↓
navigator.geolocation gets current coords
  ↓
Build payload with today's date + current location
  ↓
POST to /api/astrology-mathbrain with relocation_mode: 'A_local'
  ↓
Backend relocation shim intercepts (already implemented!)
  ↓
Returns relocated chart with:
  - Same planetary positions (universal sky)
  - Recalculated houses for current location (local rooms)
  - Aspects with orbs
  ↓
UI displays:
  - Woven Map domains (H1-4 pressure points)
  - Relocated ASC/MC
  - Timestamp + location
```

### Backend Code Reuse

**Your existing code handles everything:**

1. **Relocation** (lib/relocation-shim.js:38-95)
   - Already intercepts `relocation_mode: 'A_local'`
   - Already recalculates Placidus houses
   - Already preserves planetary positions

2. **API Call** (lib/server/astrology-mathbrain.js:1877-2123)
   - Already chunks requests (5 max concurrent)
   - Already has 3-tier fallback (API → internal → mock)
   - Already returns aspects with orbs

3. **Translocation** (lib/server/astrology-mathbrain.js:3695-3779)
   - Already validates translocation block
   - Already applies current_location coords
   - Already updates provenance metadata

## Testing

### Manual Test
1. Open Math Brain page
2. Click "📸 Snapshot This Moment"
3. Allow location permission
4. Verify:
   - Shows current coords
   - ASC/MC calculated for current location
   - Planets mapped to H1-4 domains
   - Timestamp shows "now"

### Expected Output (Lynn Haven FL example)
```
Snapshot: 10/4/2025, 3:31:00 PM CDT
📍 30.89°N, -85.65°W

Self (H1): Sun in Libra (11.5°)
Connection (H2): Moon in Aquarius (20.2°), Mercury in Scorpio (26.8°)
Growth (H3): Mars in Cancer (28.1°), Jupiter in Gemini (22.5°)
Responsibility (H4): Saturn in Pisces (27.1°), Neptune in Aries (0.1°)

ASC: Capricorn 14.3°
MC: Libra 8.7°
```

## Optional Enhancements (Future)

### Chart.js Visual Wheel (30 min)
```tsx
import { PolarArea } from 'react-chartjs-2';

function TransitWheel({ positions }: { positions: any[] }) {
  const data = {
    labels: positions.map(p => p.name),
    datasets: [{
      data: positions.map(p => p.degree),
      backgroundColor: positions.map((_, i) =>
        ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'][i % 5]
      )
    }]
  };

  return <PolarArea data={data} />;
}
```

### Location History (localStorage)
```typescript
const recentLocations = JSON.parse(localStorage.getItem('snapshot_locations') || '[]');
// Add dropdown to select recent locations
```

### Multi-Timezone Support
```typescript
// Show snapshot in both local time and UTC
<p>Local: {new Date().toLocaleString()}</p>
<p>UTC: {new Date().toISOString()}</p>
```

## Files to Modify

1. `lib/utils/snapshot.ts` (NEW) - Helper functions
2. `app/math-brain/page.tsx` - Add UI + handler

**Total effort:** ~30 minutes
**Lines of code:** ~100
**Backend changes:** ✅ None needed (already complete!)

---

## Summary

Your relocation engine is **production-ready**. All you need is:
- ✅ UI button (5 min)
- ✅ Geolocation handler (5 min)
- ✅ Snapshot display (20 min)

**The "magic" already exists—just wire it to a button!**
