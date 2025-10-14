# Math Brain v2 - UI Integration TODO

**Date**: October 13, 2025  
**Status**: PARTIALLY COMPLETE - Toggle added, handlers need wiring

---

## ✅ COMPLETED

### 1. UI Component Updated
**File**: `app/math-brain/components/DownloadControls.tsx`

**Changes**:
- Added `useV2` and `onToggleV2` props to interface
- Added v2 toggle checkbox with Beta badge
- Updated button labels to show "(v2 - AI Optimized)" when enabled
- Changed descriptions to reflect v2 format benefits

**What Users See**:
```
☑ Use Math Brain v2 (AI-Optimized Format) [Beta]
    Smaller files (~100KB), cleaner structure, no hallucination risk
```

---

## ⚠️ TODO: Wire Up the Handlers

### 2. Parent Component State (NOT DONE)
**File**: `app/math-brain/page.tsx`

**What's Needed**:
```tsx
// Add state
const [useV2, setUseV2] = useState(false);

// Pass to DownloadControls
<DownloadControls
  useV2={useV2}
  onToggleV2={setUseV2}
  onDownloadMarkdown={useV2 ? downloadMarkdownV2 : downloadResultMarkdown}
  onDownloadSymbolicWeather={useV2 ? downloadSymbolicWeatherV2 : downloadSymbolicWeatherJSON}
  // ... other props
/>
```

### 3. V2 Download Handlers (NOT DONE)
**File**: `app/math-brain/page.tsx` (or hooks/useChartExport.ts)

**What's Needed**:
```tsx
async function downloadMarkdownV2() {
  if (!result) return;
  
  // Call API with use_v2 flag
  const response = await fetch('/api/astrology-mathbrain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Math-Brain-Version': 'v2'
    },
    body: JSON.stringify({
      use_v2: true,
      personA: result.person_a.details,
      personB: result.person_b?.details,
      window: {
        start: startDate,
        end: endDate,
        step: 'daily'
      }
    })
  });
  
  const data = await response.json();
  
  if (data.success && data.version === 'v2') {
    // Download the markdown_reading
    const blob = new Blob([data.markdown_reading], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.download_formats.mirror_report.filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

async function downloadSymbolicWeatherV2() {
  // Similar but download unified_output as JSON
  // ... (follow same pattern)
}
```

---

## 🎯 CURRENT STATE

**What Works**:
- ✅ Toggle appears in UI
- ✅ Button labels change when v2 is enabled
- ✅ User can enable/disable v2

**What Doesn't Work**:
- ❌ Clicking download buttons still uses legacy format (v2 flag is ignored)
- ❌ No actual API call with `use_v2: true`
- ❌ V2 data doesn't reach the user

**Why**:
The existing download system is tightly coupled to the legacy format. The handlers in `useChartExport.ts` (lines 785-1400) generate exports from the existing `result` object structure, not by calling the API with v2 flags.

---

## 📋 INTEGRATION STRATEGY

### Option A: Simple Wrapper (Recommended)
Add v2 handlers directly in `page.tsx` that:
1. Take current form data
2. Call `/api/astrology-mathbrain` with `use_v2: true`
3. Download the response files
4. Bypass the existing `useChartExport` hook entirely when v2 is enabled

**Pros**: Clean separation, doesn't touch legacy code  
**Cons**: Some code duplication

### Option B: Extend useChartExport
Modify `useChartExport` hook to accept `useV2` param and branch logic.

**Pros**: Centralized download logic  
**Cons**: More complex, risks breaking legacy exports

---

## 🚀 QUICK WIN: API-Only Access

**Current Workaround**: Users can already access v2 by calling the API directly:

```bash
curl -X POST https://your-domain.com/api/astrology-mathbrain \
  -H "Content-Type: application/json" \
  -H "X-Math-Brain-Version: v2" \
  -d '{"use_v2": true, "personA": {...}, ...}'
```

The toggle just isn't wired up yet.

---

## ⏱️ ESTIMATED TIME TO COMPLETE

- **Option A**: 30-45 minutes (new handlers in page.tsx)
- **Option B**: 1-2 hours (refactor useChartExport hook)

---

**Next Step**: Implement Option A (simple wrapper handlers) to complete UI integration.
