# Archival Mode Integration Guide

## Quick Start: Replace html2canvas with Native PDF Generation

### Step 1: Import the Archival Mode Generator

In `app/math-brain/page.tsx`, add the import:

```typescript
import { generateArchivalModePDF } from '@/lib/pdf/archival-mode-generator';
import type { SeismographDataPoint } from '@/lib/pdf/seismograph-svg';
```

### Step 2: Replace `downloadGraphsPDF()` Function

**Before** (lines 2690-2757):
```typescript
async function downloadGraphsPDF() {
  // ... setup code ...
  
  const html2canvasModule = await import('html2canvas');
  const html2canvas = html2canvasModule?.default;
  
  const canvas = await html2canvas(target, {
    backgroundColor: '#0f172a',
    scale: Math.min(3, window.devicePixelRatio || 2),
    // ... options ...
  });
  
  const graphImage = await pdfDoc.embedPng(canvas.toDataURL('image/png'));
  // ... rest of screenshot-based generation ...
}
```

**After**:
```typescript
async function downloadGraphsPDF() {
  if (!result || reportType !== 'balance') {
    setToast('Balance Meter charts not available');
    setTimeout(() => setToast(null), 2000);
    return;
  }

  setGraphsPdfGenerating(true);

  try {
    const daily = frontStageTransitsByDate;
    const dates = Object.keys(daily)
      .filter((d) => d && d.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const dateRangeText = dates.length > 0
      ? `${new Date(dates[0]).toLocaleDateString()} - ${new Date(dates[dates.length - 1]).toLocaleDateString()}`
      : 'Complete Analysis Report';

    // Transform data for Archival Mode
    const seismographData: SeismographDataPoint[] = dates.map(date => {
      const dayData = daily[date];
      return {
        date,
        magnitude: Number(dayData?.seismograph?.magnitude ?? 0),
        directional_bias: extractBias(dayData),
        coherence: Number(dayData?.seismograph?.volatility ?? 0)
      };
    });

    const dailyReadings = dates.map(date => {
      const dayData = daily[date];
      return {
        date,
        magnitude: Number(dayData?.seismograph?.magnitude ?? 0),
        directional_bias: extractBias(dayData),
        coherence: Number(dayData?.seismograph?.volatility ?? 0),
        description: dayData?.climate_description || undefined
      };
    });

    // Generate PDF using Archival Mode
    const pdfBytes = await generateArchivalModePDF({
      title: 'Poetic Brain Reading Log - Visual Overview',
      dateRange: dateRangeText,
      seismographData,
      dailyReadings,
      provenance: {
        generated_at: new Date().toISOString(),
        house_system: result?.provenance?.house_system || 'Placidus',
        orbs_profile: result?.provenance?.orbs_profile || 'wm-tight-2025-11-v5',
        location: result?.provenance?.location || undefined
      },
      personA: {
        name: personA?.name || 'Person A',
        birth_data: personA
      },
      personB: includePersonB ? {
        name: personB?.name || 'Person B',
        birth_data: personB
      } : undefined
    });

    // Download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${friendlyFilename('symbolic-weather')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToast('Symbolic Weather Dashboard PDF downloaded successfully');
    setTimeout(() => setToast(null), 2500);
  } catch (error) {
    console.error('PDF generation failed:', error);
    setToast('Failed to generate charts PDF');
    setTimeout(() => setToast(null), 2500);
  } finally {
    setGraphsPdfGenerating(false);
  }
}

// Helper function (already exists in the file around line 2941)
const extractBias = (entry: any): number => {
  const seismo = entry?.seismograph;
  if (!seismo) return 0;
  if (typeof seismo.directional_bias === 'number') return seismo.directional_bias;
  if (typeof seismo.bias === 'number') return seismo.bias;
  if (typeof seismo.valence === 'number') return seismo.valence;
  if (typeof seismo.valence_bounded === 'number') return seismo.valence_bounded;
  if (typeof seismo.directional_bias?.value === 'number') return seismo.directional_bias.value;
  return 0;
};
```

### Step 3: Add CSS Import

In `app/math-brain/page.tsx` or `app/layout.tsx`, import the Archival Mode CSS:

```typescript
import '@/app/styles/archival-mode.css';
```

### Step 4: (Optional) Add Dashboard Classes

If you want to support browser print (Cmd+P / Ctrl+P) in addition to PDF download, add these classes to your dashboard components:

```tsx
<div className="raven-dashboard-container balance-graphs-container" ref={balanceGraphsRef}>
  <div className="dashboard-header">
    <div className="seismograph-column">
      {/* Your seismograph visualization */}
    </div>
    <div className="metadata-column">
      <div className="status-stamp-wb">WB</div>
      <div className="date-stamp">{dateRange}</div>
      <div className="coordinates">{location}</div>
    </div>
  </div>
  
  {/* Rest of dashboard */}
</div>
```

## Benefits of This Change

### Before (html2canvas approach)
- ❌ Width issues (shrinking, awkward margins)
- ❌ "Pasted box" effect (dark mode on white paper)
- ❌ Pixelated graphics (raster image)
- ❌ Large file sizes
- ❌ Slow generation (rendering overhead)

### After (Archival Mode approach)
- ✅ Fixed 7.5" width (respects page boundaries)
- ✅ Clean "printed" look (white paper, black ink)
- ✅ Vector graphics (sharp at any zoom)
- ✅ Smaller file sizes
- ✅ Faster generation (direct PDF elements)

## Testing Checklist

- [ ] Generate PDF with 7-day date range
- [ ] Generate PDF with 30-day date range
- [ ] Verify seismograph strip renders correctly
- [ ] Verify magnitude/bias values are accurate
- [ ] Check typography (monospace for data, serif for narrative)
- [ ] Verify page breaks work correctly
- [ ] Test with solo report (Person A only)
- [ ] Test with relational report (Person A + B)
- [ ] Verify provenance block is complete
- [ ] Check interpretation guide scales

## Rollback Plan

If issues arise, you can temporarily revert by:

1. Comment out the new `generateArchivalModePDF()` call
2. Uncomment the old `html2canvas` code
3. File a bug report with specific issues

## Performance Comparison

**Expected improvements**:
- Generation time: ~3-5 seconds → ~1-2 seconds
- File size: ~2-5 MB → ~500 KB - 1 MB
- Quality: 150 DPI raster → Infinite resolution vector

## Next Steps After Integration

1. **User Testing**: Get feedback on visual quality and usability
2. **Refinement**: Adjust typography, spacing, colors based on feedback
3. **Feature Additions**:
   - Add chart wheel embedding (if available)
   - Add optional "Screenshot Mode" toggle for users who prefer it
   - Add custom color themes (beyond Archival Mode)
4. **Documentation**: Update user-facing docs with new PDF features

## Troubleshooting

### Issue: PDF is blank
**Solution**: Check that `seismographData` and `dailyReadings` arrays are populated

### Issue: Dates are wrong
**Solution**: Verify date format is `YYYY-MM-DD` in the data

### Issue: Typography looks wrong
**Solution**: Ensure Archival Mode CSS is imported and fonts are available

### Issue: SVG not rendering
**Solution**: The current implementation uses text fallback if SVG fails. Check console for errors.

## Support

For questions or issues, refer to:
- `docs/ARCHIVAL_MODE_PDF_IMPLEMENTATION.md` (full specification)
- `lib/pdf/archival-mode-generator.ts` (implementation)
- `lib/pdf/seismograph-svg.ts` (SVG generation)
- `app/styles/archival-mode.css` (print styles)
