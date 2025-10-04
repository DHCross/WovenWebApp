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