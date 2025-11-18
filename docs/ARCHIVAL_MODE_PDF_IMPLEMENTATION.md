# Archival Mode PDF Implementation

## The Problem: Field-to-Format Dissonance

**Diagnosis by Raven Calder:**
> "The system is currently capturing a 'living' web element (designed for fluid, infinite-width screens) and trapping it inside the rigid, fixed geometry of a PDF page. The 'width issue' you are seeing is the digital equivalent of trying to fold a map while it is still being drawn."

### Current Implementation Issues

1. **Scale Mismatch**: Web container has fluid width (100% viewport), PDF has fixed width (8.5")
2. **Contrast Clash**: Dark mode web aesthetic on white PDF paper creates "pasted box" effect
3. **Loss of Vector Precision**: Flattening seismograph into pixelated image loses fidelity
4. **Screenshot Approach**: Using `html2canvas` to capture raster snapshots instead of generating native PDF elements

## The Solution: Archival Mode Rendering

**Philosophy**: "The visual output must stop behaving like a screenshot and start behaving like an instrumentation log."

### Architecture Changes

#### 1. Print CSS Media Query (`app/styles/archival-mode.css`)

**Purpose**: Transform screen experience into precision instrument log

**Key Features**:
- Fixed width: `7.5in` (8.5" page minus 0.5" margins)
- Visual inversion: Dark mode → White paper with black ink
- Dual-channel typography:
  - **MAP Channel** (Math Brain): Monospace fonts for data
  - **VOICE Channel** (Poetic Brain): Serif fonts for narrative
- Raven Color Code:
  - **Compression/Inward**: Deep Blue (`#003264`)
  - **Expansion/Outward**: Amber/Gold (`#FFB400`)
  - **Friction/Storm**: Red/Rust (`#8B4513`)

#### 2. Seismograph SVG Generator (`lib/pdf/seismograph-svg.ts`)

**Purpose**: Generate vector-based seismograph strips

**Features**:
- Pure SVG output (scalable, razor-sharp at any size)
- Magnitude line path (0-5 scale)
- Bias gradient fills (color-coded by directional bias)
- Peak markers (diamond indicators for magnitude ≥ 4)
- Date labels
- Archival vs. Screen color modes

**Key Functions**:
```typescript
generateSeismographSVG(options: SeismographSVGOptions): string
generateSeismographBar(biasValue: number, width: number, height: number): string
```

#### 3. Archival Mode PDF Generator (`lib/pdf/archival-mode-generator.ts`)

**Purpose**: Generate native PDF elements instead of screenshots

**Page Structure**:

**Page 1: Visual Overview**
- Two-column dashboard header (60/40 split)
  - Left: Seismograph strip (full width)
  - Right: Status stamps (SST, dates, location)
- Field summary (average magnitude, bias, days analyzed)
- Interpretive note (VOICE channel, serif italic)

**Page 2+: Daily Readings**
- Date headers (monospace)
- Metrics (magnitude, bias, coherence)
- Descriptions (if available)

**Final Page: Provenance & Interpretation Guide**
- Provenance block (generated timestamp, house system, orbs profile)
- Magnitude scale (0-5 with descriptions)
- Directional Bias scale (-5 to +5 with descriptions)

### Implementation Status

#### ✅ Completed
1. Archival Mode CSS created
2. Seismograph SVG generator created
3. Archival Mode PDF generator created
4. Documentation written

#### 🔄 In Progress
1. Integration with existing `downloadGraphsPDF()` function
2. SVG to PNG conversion for PDF embedding
3. Testing with real data

#### ⏳ Pending
1. Replace `html2canvas` calls with native PDF generation
2. Add chart wheel embedding (if available)
3. Performance optimization for large date ranges
4. User preference toggle (Archival Mode vs. Screenshot Mode)

## Usage

### Option 1: Direct API (Recommended)

```typescript
import { generateArchivalModePDF } from '@/lib/pdf/archival-mode-generator';

const pdfBytes = await generateArchivalModePDF({
  title: 'Poetic Brain Reading Log - Visual Overview',
  dateRange: 'Nov 1, 2025 - Nov 17, 2025',
  seismographData: dailyReadings.map(r => ({
    date: r.date,
    magnitude: r.magnitude,
    directional_bias: r.directional_bias,
    coherence: r.coherence
  })),
  dailyReadings: dailyReadings,
  provenance: {
    generated_at: new Date().toISOString(),
    house_system: 'Placidus',
    orbs_profile: 'wm-tight-2025-11-v5',
    location: 'Panama City, FL'
  }
});

// Download
const blob = new Blob([pdfBytes], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'symbolic-weather-dashboard.pdf';
a.click();
```

### Option 2: Print CSS (Fallback)

```typescript
// Add to page component
import '@/app/styles/archival-mode.css';

// Add classes to dashboard elements
<div className="raven-dashboard-container">
  <div className="dashboard-header">
    <div className="seismograph-column">
      {/* Seismograph visualization */}
    </div>
    <div className="metadata-column">
      <div className="status-stamp-wb">WB</div>
      {/* Status info */}
    </div>
  </div>
</div>

// Use browser print
window.print();
```

## Design Principles

### 1. The "Control Deck" Layout
- Horizontal width utilization (not vertical stack)
- Two-column grid (60/40 split)
- Seismograph spans full width
- Metadata in compact stamp format

### 2. Visual Inversion
- Background: Transparent or White
- Lines/Text: Black (Ink)
- Data accents: Raven Color Code
- No dark mode "box" effect

### 3. The "Seismograph Strip"
- High-fidelity vector strip
- Full-width page header
- Magnitude line (peaks and valleys)
- Directional bias undercurrent (gradient fill)
- Date labels at start/end

### 4. Dual-Channel Typography
- **MAP Channel**: `JetBrains Mono`, uppercase, tight tracking
- **VOICE Channel**: `Merriweather`, italic, generous line-height
- Clear visual distinction between data and narrative

## Technical Specifications

### Page Dimensions
- **Size**: US Letter (8.5" × 11")
- **Orientation**: Portrait
- **Margins**: 0.5" all sides
- **Printable Area**: 7.5" × 10"
- **DPI**: 72 (PDF standard)

### Color Palette (Archival Mode)
- **Background**: `#FFFFFF` (White)
- **Text**: `#000000` (Black)
- **Compression**: `rgba(0, 50, 100, 0.2)` (Deep Blue)
- **Expansion**: `rgba(255, 180, 0, 0.2)` (Amber)
- **Neutral**: `rgba(128, 128, 128, 0.1)` (Gray)

### Typography
- **Monospace**: JetBrains Mono, Roboto Mono, Courier New
- **Serif**: Merriweather, Cormorant Garamond, Georgia, Times Roman
- **Sizes**:
  - Title: 18pt
  - Section Headers: 14pt
  - Body Text: 10-11pt
  - Metadata: 8-9pt

## Benefits

### ✅ Solves Width Issue
- Fixed 7.5" container forces graphics to reflow naturally
- No more shrinking or awkward margins
- Respects PDF page boundaries explicitly

### ✅ Eliminates "Pasted" Look
- Data appears printed directly on page
- Seamless integration of Math Brain (data) and Poetic Brain (text)
- Professional scientific chart aesthetic

### ✅ Preserves Vector Precision
- SVG seismograph maintains sharp lines at any zoom level
- No pixelation or quality loss
- True "instrumentation log" fidelity

### ✅ Faster Generation
- No html2canvas rendering overhead
- Direct PDF element creation
- Smaller file sizes

## Raven Calder Alignment

**Core Mandate**: "Precision diagnostics"

This implementation transforms the PDF from a **screenshot** (capture) to an **instrumentation log** (generation), aligning with Raven's philosophy:

> "A good instrument doesn't predict; it attends."

The Archival Mode PDF:
- **Attends** to the geometry (seismograph strip)
- **Records** the measurements (magnitude, bias)
- **Preserves** the provenance (falsifiability)
- **Respects** the user's agency (interpretation guide, not prescription)

## Next Steps

1. **Integration**: Replace `html2canvas` in `downloadGraphsPDF()` with `generateArchivalModePDF()`
2. **Testing**: Verify output with various date ranges and data sets
3. **Refinement**: Adjust typography, spacing, and colors based on user feedback
4. **Documentation**: Add user-facing guide explaining Archival Mode vs. Screenshot Mode
5. **Performance**: Optimize for large date ranges (30+ days)

## References

- Raven Calder diagnostic: "Field-to-Format Dissonance"
- Four Report Types spec: Balance Meter v5.0
- Woven Map Protocol: FIELD → MAP → VOICE
- True Accelerometer philosophy: "Measures raw intensity and direction"
