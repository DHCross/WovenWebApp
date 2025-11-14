# Math Brain Page Refactoring Plan

## Current State
- **File:** `app/math-brain/page.tsx`
- **Size:** 6,018 lines
- **Status:** Monolithic component that needs to be broken into smaller, maintainable pieces

## Problem
The math-brain page has grown too large and handles too many responsibilities:
1. Form state management (Person A & B)
2. API calls to astrology services
3. Report generation and display
4. PDF export
5. Chart asset management
6. Layer visibility controls
7. Saved charts management
8. Multiple report modes (natal, transits, synastry, composite)

## Proposed Component Structure

### 1. **Form Components** (in `components/mathbrain/forms/`)
- `PersonForm.tsx` - Reusable form for Person A or B birth data
- `TransitForm.tsx` - Date range and transit settings
- `RelocationForm.tsx` - Current location for Balance Meter
- `ReportModeSelector.tsx` - Choose between natal/transits/synastry/composite

### 2. **Report Display Components** (in `components/mathbrain/reports/`)
- `ReportHeader.tsx` - Constitutional data header (birth info, house system, etc.)
- `BlueprintSection.tsx` - Natal chart baseline climate
- `WeatherSection.tsx` - Transit activations and Balance Meter
- `PlanetaryPositionsTable.tsx` - Table of all planetary positions
- `AspectsTable.tsx` - Major aspects display
- `ChartWheelsGallery.tsx` - Display chart wheel images (already partially exists)

### 3. **State Management Hooks** (in `lib/hooks/`)
- `usePersonForm.ts` - Manage person birth data state
- `useReportGeneration.ts` - Handle API calls and report generation
- `useSavedCharts.ts` - Manage saved charts
- `useLayerVisibility.ts` - Control which report sections are visible

### 4. **PDF Export** (in `lib/pdf/`)
- `generateReportPDF.ts` - Extract PDF generation logic from main component
- `pdfSections.ts` - Helpers for rendering each report section

### 5. **Main Container**
- `app/math-brain/page.tsx` - Orchestrate components, minimal logic
  - Import all subcomponents
  - Pass state down via props
  - Coordinate between form and report display

## Migration Strategy

### Phase 1: Extract Forms (Week 1)
1. Create `components/mathbrain/forms/PersonForm.tsx`
2. Move Person A and Person B form logic
3. Test form validation and submission
4. Replace inline forms in main page with `<PersonForm />`

### Phase 2: Extract Report Display (Week 2)
1. Create report display components
2. Move rendering logic from main page
3. Ensure all data flows correctly
4. Add constitutional data header component

### Phase 3: Extract State Management (Week 3)
1. Create custom hooks for state
2. Move useState and useEffect logic
3. Test state updates and API calls
4. Ensure saved charts still work

### Phase 4: Extract PDF Generation (Week 4)
1. Move PDF export to separate module
2. Test PDF generation with all report types
3. Verify chart wheels appear in PDFs

### Phase 5: Testing & Cleanup (Week 5)
1. Integration testing
2. Remove dead code
3. Update documentation
4. Performance optimization

## Benefits
- **Maintainability:** Easier to find and fix bugs
- **Testability:** Each component can be tested independently
- **Reusability:** Components can be used in other parts of the app
- **Performance:** Smaller components = better React rendering
- **Developer Experience:** Easier to onboard new developers

## Estimated Timeline
5 weeks for full refactoring with testing

## Risk Mitigation
- Keep original file as backup until refactoring is complete
- Incremental migration (one component at a time)
- Comprehensive testing after each phase
- Feature flag to toggle between old/new implementations during migration

## Success Criteria
- [ ] Main page.tsx under 500 lines
- [ ] All components under 300 lines each
- [ ] 100% feature parity with current implementation
- [ ] All tests passing
- [ ] No regressions in PDF export or chart display
