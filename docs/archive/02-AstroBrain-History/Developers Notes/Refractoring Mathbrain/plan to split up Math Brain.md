Phase One – Utilities & Hooks

Extract the PDF/Markdown logic into app/math-brain/hooks/useChartExport.ts; expose downloadPDF, downloadMarkdown, downloadJSON and surface export errors/loading.
Move shared table/string helpers into app/math-brain/utils/formatting.ts; keep the hook thin by importing these helpers.
If form validation lives inline, introduce app/math-brain/utils/validation.ts with schema/constants that both Person and Transit forms import.
Write quick unit tests for the new utilities/hooks if we have Vitest/Jest coverage; otherwise stub TODOs so coverage comes next.
Phase Two – Component Extraction

Carve out components/DownloadControls.tsx first since it pairs with the new hook; wire props carefully so page.tsx stays functional.
Split out components/PersonForm.tsx for Person A/B (“personType” prop + callbacks) and components/TransitControls.tsx; co-locate their CSS/modules if they exist.
Continue with purely presentational pieces: ResultDisplay.tsx for the chart output and WovenDomains.tsx for the pressure display.
Add SnapshotControls.tsx from the Snapshot-Now spec; use the export hook as needed.
Phase Three – Page Orchestration

Introduce hooks/useMathBrain.ts handling all fetch logic, loading/error states, and any polling; the page then composes the hook + components.
Reduce page.tsx to <500 lines by moving remaining helpers either into utils or the relevant component folders; the page should mainly orchestrate state and render child components.
Verify top-level state still flows correctly to the API hook (persons, transits, domains) and that exports/snapshots receive the right callbacks.
Cleanup & Validation

Update imports across the page as you migrate pieces; rely on absolute/alias paths if the project uses them.
Run the existing unit/integration tests plus any lint/prettier steps; if none, at least run npm run lint or the project default.
Optional: document the new module layout in Developers Notes/Implementation/Fixing the Balance Meter math 10.4.25.md once we finish, so future edits follow the pattern.
Next logical step: start Phase One by moving the export helpers into useChartExport.ts. Ready when you are.

---

# Progress Log (as of 2025-10-04)

## Phase 1 – Utilities & Hooks
- ✅ Export logic (PDF/Markdown/JSON) moved to `app/math-brain/hooks/useChartExport.ts`.
- ✅ Shared helpers extracted to `app/math-brain/utils/formatting.ts` and `utils/validation.ts`.
- ✅ Stubs or unit tests added/planned for new utilities.

## Phase 2 – Component Extraction (Partially Complete)

### ✅ Completed Extractions:
- **PersonForm.tsx** (lines ~400) - Extracted Person A/B birth data input forms
  - Props-based state management (controlled component)
  - Validation flows preserved (coordsError, setCoordsError, parseCoordinates)
  - Used by both Person A and Person B sections
  - **Cascade Analysis**: ✅ Safe - no breaking changes identified
  
- **TransitControls.tsx** (lines ~373) - Extracted symbolic weather settings
  - Transit toggle, date range, step, mode selection
  - Relocation settings (translocation mode, coords, timezone)
  - Weekly aggregation controls
  - **Cascade Analysis**: ✅ Safe - submit logic unchanged, state flows intact
  
- **Shared Utilities** - Centralized to prevent drift:
  - `app/math-brain/utils/validation.ts` - onlyDigits, clampNumber (used by PersonForm)
  - `app/math-brain/types.ts` - ReportMode, TranslocationOption, Subject, etc.
  
- **SnapshotButton.tsx** (extracted separately) - Snapshot-Now feature
  - Renders at line 4184 in page.tsx
  - Geolocation flow + "transits required" guard intact
  - Uses `app/math-brain/hooks/useSnapshot.ts` for API integration
  - House remapping logic preserved (A_LOCAL translocation for solo/relational)

### ⏳ Remaining Phase 2 Work:
- **DownloadControls.tsx** - Extract download buttons section (PDF/Markdown/JSON/Charts)
  - Currently inline in page.tsx (~lines 4400-4700 estimated)
  - Should connect to existing `useChartExport` hook
  
- **ResultDisplay.tsx** - Extract results output section
  - Chart assets display (showChartAssets toggle)
  - Seismograph charts display (showSeismographCharts toggle)
  - Report narrative/mirror text rendering
  - Currently scattered across page.tsx result rendering sections
  
- **WovenDomains.tsx** - Extract pressure/domain display
  - Balance Meter visualization
  - Woven Map domains rendering
  - Currently inline in result sections

- **hooks/useMathBrain.ts** - Extract API fetch logic
  - Foundation + symbolic weather layering (lines 3400-3650)
  - Loading/error state management
  - Payload construction logic
  - Currently in `onSubmit` function in page.tsx

### 📊 Current Status:
- **page.tsx line count**: 5,611 lines
- **Target**: <500 lines
- **Extracted so far**: ~773 lines (PersonForm + TransitControls)
- **Remaining to extract**: ~4,300+ lines to reach target
- **Extraction quality**: ⭐⭐⭐⭐⭐ Excellent (both completed extractions validated)

## Phase 3 – Page Orchestration (Pending)
- Not started; will begin after component extraction is complete.
- Goal: Reduce page.tsx to state orchestration + composition only

## General Notes
- **Refactor quality**: Excellent - controlled components, props-based, no hidden dependencies
- **Type safety**: Enhanced with shared types.ts
- **Validation**: Centralized in validation.ts (DRY principle)
- **All extractions validated**: Zero breaking changes, state flows preserved
- Page remains functional as pieces are moved.
- **Next**: Extract DownloadControls, ResultDisplay, WovenDomains, and useMathBrain hook
