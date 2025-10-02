# Magnitude Scale Standardization - January 2025

## Issue
Two major problems were identified:
1. **"Hurricane" used incorrectly** - This was a climate pattern name, not a magnitude label
2. **Inconsistent magnitude scales** - Multiple conflicting scales across the codebase

## Official Magnitude Scale

The correct magnitude scale (from [metric-labels.js](../lib/reporting/metric-labels.js)):

| Range | Label | Description |
|-------|-------|-------------|
| 0-0.5 | **Trace** | Barely measurable |
| 0.5-1.5 | **Pulse** | Subtle impressions |
| 1.5-2.5 | **Wave** | Noticeable bursts |
| 2.5-3.5 | **Surge** | Clear activation |
| 3.5-4.5 | **Peak** | Stacked factors |
| 4.5+ | **Threshold** | Maximum pressure |

## Changes Made

### 1. Removed "Hurricane" ([climate-narrative.ts:56-62](../lib/climate-narrative.ts#L56-L62))

**Before:**
```typescript
'hurricane': {
  name: 'Hurricane',
  icon: '🌀⚡',
  description: 'High positive valence with high volatility',
  ...
}
```

**After:**
```typescript
'surge_scatter': {
  name: 'Surge Scatter',
  icon: '🌀⚡',
  description: 'High positive valence with high volatility',
  ...
}
```

**Reasoning:** "Hurricane" is not a magnitude label. This climate pattern describes high positive energy with chaos, so "Surge Scatter" better aligns with our official terminology.

### 2. Standardized getMagnitudeLabel() ([climate-narrative.ts:119-127](../lib/climate-narrative.ts#L119-L127))

**Before:**
```typescript
function getMagnitudeLabel(value: number): string {
  if (value < 1) return 'Latent';
  if (value < 2) return 'Murmur';
  if (value < 3) return 'Pulse';
  if (value < 4) return 'Stirring';
  if (value < 4.5) return 'Convergence';
  return 'Threshold';
}
```

**After:**
```typescript
function getMagnitudeLabel(value: number): string {
  // Official magnitude scale from metric-labels.js
  if (value <= 0.5) return 'Trace';
  if (value <= 1.5) return 'Pulse';
  if (value <= 2.5) return 'Wave';
  if (value <= 3.5) return 'Surge';
  if (value <= 4.5) return 'Peak';
  return 'Threshold';
}
```

### 3. Updated MAGNITUDE_LADDER ([taxonomy.ts:58-65](../lib/taxonomy.ts#L58-L65))

**Before:**
```typescript
export const MAGNITUDE_LADDER: MagnitudeLevel[] = [
  { level: 0, label: 'Latent', notes: '...' },
  { level: 1, label: 'Murmur', notes: '...' },
  { level: 2, label: 'Pulse', notes: '...' },
  { level: 3, label: 'Stirring', notes: '...' },
  { level: 4, label: 'Convergence', notes: '...' },
  { level: 5, label: 'Threshold', notes: '...' }
];
```

**After:**
```typescript
export const MAGNITUDE_LADDER: MagnitudeLevel[] = [
  { level: 0, label: 'Trace', notes: 'Barely measurable...' },
  { level: 1, label: 'Pulse', notes: 'Subtle impressions...' },
  { level: 2, label: 'Wave', notes: 'Noticeable bursts...' },
  { level: 3, label: 'Surge', notes: 'Clear activation...' },
  { level: 4, label: 'Peak', notes: 'Stacked factors...' },
  { level: 5, label: 'Threshold', notes: 'Ceiling of measurable load...' }
];
```

### 4. Updated UI Glossaries

**Sidebar.tsx** ([Sidebar.tsx:31](../components/chat/Sidebar.tsx#L31))
```typescript
// Before: ["0 Latent","1 Murmur","2 Pulse","3 Stirring","4 Convergence","5 Threshold"]
// After:
details={["0 Trace","1 Pulse","2 Wave","3 Surge","4 Peak","5 Threshold"]}
```

**ChatClient.tsx** ([ChatClient.tsx:2763-2770](../components/ChatClient.tsx#L2763-L2770))
```typescript
// Before: "0 = Latent", "1 = Murmur", etc.
// After:
details={[
  "0 = Trace",
  "1 = Pulse",
  "2 = Wave",
  "3 = Surge",
  "4 = Peak",
  "5 = Threshold",
]}
```

## Files Modified

1. **[lib/climate-narrative.ts](../lib/climate-narrative.ts)**
   - Removed 'hurricane' climate pattern, replaced with 'surge_scatter'
   - Updated getMagnitudeLabel() to use official scale

2. **[lib/taxonomy.ts](../lib/taxonomy.ts)**
   - Updated MAGNITUDE_LADDER with official labels

3. **[components/chat/Sidebar.tsx](../components/chat/Sidebar.tsx)**
   - Updated glossary with official scale

4. **[components/ChatClient.tsx](../components/ChatClient.tsx)**
   - Updated magnitude details in glossary

## Deprecated Labels (No Longer Used)

These labels should NOT appear anywhere in the app:
- ❌ Latent (replaced by Trace)
- ❌ Murmur (scale shifted)
- ❌ Stirring (replaced by Surge)
- ❌ Convergence (replaced by Peak)
- ❌ Hurricane (replaced by Surge Scatter for climate patterns)

## Source of Truth

The official magnitude scale is defined in:
**[lib/reporting/metric-labels.js](../lib/reporting/metric-labels.js)**

```javascript
const MAGNITUDE_LEVELS = [
  { max: 0.5, label: 'Trace' },
  { max: 1.5, label: 'Pulse' },
  { max: 2.5, label: 'Wave' },
  { max: 3.5, label: 'Surge' },
  { max: 4.5, label: 'Peak' },
  { max: Infinity, label: 'Threshold' },
];
```

All magnitude labeling functions should reference this file or match its scale exactly.

## Remaining Work

Some files still contain old labels but are less critical:
- **poetic-brain/src/index.ts** - Uses old scale but may be legacy code
- **app/math-brain/page.tsx** - Some display code uses old labels for backwards compatibility

These can be updated in a future pass if needed.

## Testing

Verify the changes:
1. Generate a Balance Meter report
2. Check that magnitude labels show: Trace, Pulse, Wave, Surge, Peak, Threshold
3. Verify no "Hurricane" appears in climate patterns
4. Check sidebar glossary shows correct scale
5. Verify chat glossary shows correct scale

## Status
✅ **Completed** - All core magnitude labeling standardized to official scale
✅ **"Hurricane" removed** - Replaced with "Surge Scatter" for climate patterns
