# Clear Mirror PDF Export Implementation

**Date:** 2025-01-21  
**Feature:** Post-Session Clear Mirror PDF Export with Skip Wrap-Up Option

## Overview

Added Clear Mirror PDF export feature to Poetic Brain that:
1. Allows users to skip the wrap-up rubric and go directly to Clear Mirror export
2. Offers Clear Mirror PDF export after completing the session wrap-up
3. Generates E-Prime formatted reports with Core Insights, Polarity Cards, and symbolic footnotes
4. Supports both solo and relational report types

## Architecture

### Flow Diagram

```
User clicks "Wrap Up" → SessionWrapUpModal appears
                        ↓
                Two options:
                ├─ "Continue to wrap-up" → Full rubric → WrapUpCard → Export options
                └─ "Skip to Clear Mirror Export" → Direct to Clear Mirror PDF modal
                                                    ↓
                                        Clear Mirror Export Modal
                                        - Shows report type (solo/relational)
                                        - Describes export contents
                                        - Generate PDF button
                                                    ↓
                                        PDF Generation
                                        - Converts reportContexts → ClearMirrorData
                                        - Uses clear-mirror-template.ts for formatting
                                        - Generates PDF with html2pdf.js
                                                    ↓
                                        Session Reset (clean state)
```

### Components Modified

**1. SessionWrapUpModal.tsx**
- Added `onSkipToExport?: () => void` prop
- Added "Skip to Clear Mirror Export" button (only shown if reportContexts exist)
- Button styled with blue theme to distinguish from "Continue to wrap-up"

**2. ChatClient.tsx**
- Added `showClearMirrorExport` state
- Added handlers:
  - `handleSkipToExport()` - Closes wrap-up modal, opens Clear Mirror export
  - `handleGenerateClearMirrorPDF()` - Generates PDF, resets session
  - `handleCloseClearMirrorExport()` - Cancels export, resets session
- Added Clear Mirror Export Modal (rendered when `showClearMirrorExport === true`)
- Updated `SessionWrapUpModal` to pass `onSkipToExport` prop
- Updated `WrapUpCard` to pass `onExportClearMirror` prop

**3. WrapUpCard.tsx**
- Added `onExportClearMirror?: () => void` prop
- Added "🪞 Clear Mirror PDF" export button (only shown if prop provided)
- Updated export description list to include Clear Mirror option
- Added `.clear-mirror` CSS styling (emerald/green theme)

### New Files Created

**1. lib/pdf/clear-mirror-pdf.ts**
- **Purpose:** PDF generation from ClearMirrorData
- **Key Function:** `generateClearMirrorPDF(data: ClearMirrorData): Promise<void>`
- **Features:**
  - Converts markdown to styled HTML
  - Custom CSS for E-Prime formatting, footnotes, WB/ABE/OSR marks
  - Handles solo and relational filename generation
  - Uses html2pdf.js for PDF rendering
  - Proper cleanup of DOM elements after generation

**2. lib/pdf/clear-mirror-context-adapter.ts**
- **Purpose:** Converts ChatClient's ReportContext[] to ClearMirrorData
- **Key Function:** `buildClearMirrorFromContexts(contexts: ReportContext[]): ClearMirrorData`
- **Features:**
  - Detects solo vs relational based on context count
  - Extracts person names from contexts
  - Generates template placeholders for all sections
  - Includes directional dynamics for relational reports ("When A does X, B feels Y")
  - Provides symbolic geometry footnotes

## Data Flow

```
reportContexts (from Math Brain upload)
        ↓
buildClearMirrorFromContexts()
        ↓
ClearMirrorData (structured template)
        ↓
generateClearMirrorMarkdown()
        ↓
Markdown text with E-Prime, footnotes
        ↓
markdownToHTML()
        ↓
Styled HTML with CSS
        ↓
html2pdf.js
        ↓
Downloaded PDF file
```

## Report Structure

### Solo Mirror
- Frontstage Preface
- Frontstage (E-Prime narrative with footnotes)
- Resonant Summary
- Core Insights (3-5 highest-magnitude patterns)
- Personality Blueprint
- 4 Polarity Cards
- Integration
- Inner Constitution
- Mirror Voice
- Socratic Closure (WB/ABE/OSR marking)
- Structure Note
- Developer Audit Layer (collapsible tables)

### Relational Mirror
- All solo sections PLUS:
- Individual Field Snapshots (Person A and Person B)
- Relational Core Insights (directional dynamics)
- Dyadic Mirror Voice
- Relational audit tables

## Technical Implementation Details

### E-Prime Compliance
- No "is/am/are/was/were/be/being/been" constructions
- Process verbs: "navigates", "channels", "activates", "perceives"
- Symbolic geometry referenced via inline footnotes (¹,²,³)

### Symbolic Footnotes
- Format: `♂︎☍☉ @ 0.2° • M=3.8 • WB`
- Inline markers in superscript
- Consolidated at end of each section

### WB/ABE/OSR Marking System
- **WB (Well-Built):** Green color (#22c55e) - Pattern lands
- **ABE (Almost But Edited):** Orange (#f59e0b) - Partial resonance
- **OSR (Off, Subjectively Rejected):** Red (#ef4444) - Pattern doesn't fit

### PDF Styling
- Letter format (8.5" x 11")
- 0.5" margins
- Inter font family
- Custom CSS for each section type
- Page breaks before major headers
- High-quality rendering (scale: 2, quality: 0.98)

## User Experience

### Skip Wrap-Up Flow
1. User clicks "Wrap Up" button in chat
2. Modal appears with three options:
   - "Return to session" (cancel)
   - "Skip to Clear Mirror Export" (new!)
   - "Continue to wrap-up" (existing)
3. Selecting "Skip to Clear Mirror Export":
   - Bypasses rubric entirely
   - Opens Clear Mirror export modal
   - Shows report type (solo/relational) and person names
   - Single-click PDF generation
   - Auto-resets session after download

### Post-Rubric Flow
1. User completes wrap-up rubric
2. WrapUpCard displays with export options
3. Four export buttons available:
   - 📄 Export JSON (session telemetry)
   - 📋 Session PDF (Actor/Role composite, rubric)
   - 📊 Export CSV (resonance metrics)
   - 🪞 Clear Mirror PDF (new!) - formatted natal/relational report
4. Clicking Clear Mirror button:
   - Closes WrapUpCard
   - Opens Clear Mirror export modal
   - Same flow as skip-wrap-up option

## Current State: Template Placeholders

**Important:** The current implementation uses **template placeholders** for narrative content. Actual language generation will come from Raven Calder API integration in a future update.

### What's Implemented Now
- Full PDF generation pipeline
- Proper E-Prime formatting
- Symbolic footnote structure
- Solo and relational variants
- WB/ABE/OSR marking system
- Developer audit layer

### What's Still Placeholder
- Frontstage narrative text
- Core Insights descriptions
- Polarity Card narratives
- Mirror Voice reflections
- All section content (geometry is placeholder)

### Future Integration
The next phase will:
1. Extract actual geometry from `reportContexts[].content` (Math Brain output)
2. Call Raven Calder API to translate geometry → E-Prime language
3. Populate template sections with real Raven-generated content
4. Maintain existing PDF structure and formatting

## Error Handling

### PDF Generation Failure
- Try/catch wraps entire generation process
- Fallback error message displayed to user
- Console logging with eslint disable comment
- Proper DOM cleanup in finally block

### Missing Report Context
- "Skip to Clear Mirror Export" button only shown if `reportContexts.length > 0`
- Modal displays "Unknown" if person names missing
- Graceful handling of incomplete context data

### File Download Issues
- html2pdf.js handles cross-browser compatibility
- Filename sanitization for solo/relational formats
- Timestamp included in filename for uniqueness

## Testing Checklist

- [ ] Skip wrap-up → Clear Mirror PDF export (solo report)
- [ ] Skip wrap-up → Clear Mirror PDF export (relational report)
- [ ] Complete rubric → Export Clear Mirror PDF (solo)
- [ ] Complete rubric → Export Clear Mirror PDF (relational)
- [ ] Cancel Clear Mirror export → session resets properly
- [ ] Generate PDF → file downloads with correct name
- [ ] No report contexts → Skip button doesn't appear
- [ ] PDF content includes all sections
- [ ] E-Prime formatting correct (no "is/am/are")
- [ ] Symbolic footnotes rendered properly
- [ ] WB/ABE/OSR color coding displays

## Files Changed Summary

### Modified
- `components/SessionWrapUpModal.tsx` - Added skip option
- `components/ChatClient.tsx` - Added state management and modal
- `components/WrapUpCard.tsx` - Added Clear Mirror export button

### Created
- `lib/pdf/clear-mirror-pdf.ts` - PDF generation utility
- `lib/pdf/clear-mirror-context-adapter.ts` - Data transformation

### Unchanged (Used)
- `lib/templates/clear-mirror-template.ts` - Template structure (already existed)
- `lib/templates/clear-mirror-builder.ts` - Data builder (already existed)

## Dependencies

- `html2pdf.js` - PDF generation (already in project)
- `@/lib/templates/clear-mirror-template` - Template structure
- `@/lib/relocation` - RelocationSummary type

## Future Enhancements

1. **Raven API Integration**
   - Replace placeholder text with actual Raven-generated content
   - Extract geometry from Math Brain output
   - Call Poetic Brain API for language translation

2. **PDF Customization Options**
   - Toggle audit layer visibility
   - Select which sections to include
   - Choose between condensed/expanded format

3. **Export History**
   - Save generated PDFs to user account
   - Track export timestamps
   - Allow re-download of previous exports

4. **Advanced Formatting**
   - Custom CSS themes
   - Font size options
   - Print-optimized vs screen-optimized layouts

## Notes for Developers

- Clear Mirror PDF is **separate** from Session PDF (Actor/Role diagnostics)
- Session PDF = resonance telemetry, rubric scores, Actor/Role composite
- Clear Mirror PDF = natal/relational mirror, Core Insights, symbolic weather
- Both use html2pdf.js but have completely different content structures
- reportContexts come from Math Brain uploads in ChatClient
- Current content is template-based; production will integrate Raven Calder

## Git Commit Message

```
[2025-01-21] FEATURE: Add Clear Mirror PDF export with skip wrap-up option

- Added "Skip to Clear Mirror Export" button to SessionWrapUpModal
- Created Clear Mirror export modal in ChatClient with report type detection
- Added Clear Mirror PDF button to WrapUpCard export options
- Built PDF generation utility (lib/pdf/clear-mirror-pdf.ts)
- Created context adapter (lib/pdf/clear-mirror-context-adapter.ts)
- Supports solo and relational report variants
- E-Prime formatting with symbolic footnotes and WB/ABE/OSR marks
- Template placeholders (awaiting Raven API integration)

User can now skip wrap-up rubric and go directly to Clear Mirror export,
or export Clear Mirror PDF after completing session wrap-up.
```
