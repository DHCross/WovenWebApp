# Math Brain Components

This directory will house refactored Math Brain UI components extracted from `app/math-brain/page.tsx` during Phase 2 of the refactor plan.

Component extraction checklist:

- [ ] `PersonForm.tsx` – encapsulate Person A/B birth data inputs
- [ ] `TransitControls.tsx` – symbolic weather configuration UI
- [x] `DownloadControls.tsx` – export actions (PDF/Markdown/JSON)
- [ ] `ResultDisplay.tsx` – render generated report content
- [ ] `WovenDomains.tsx` – display Balance Meter / Woven map domains
- [ ] `SnapshotButton.tsx` – controls for Snapshot-Now feature

> **Note:** Components should follow the controlled props pattern outlined in `Developers Notes/Refractoring Mathbrain/plan to split up Math Brain.md`. Update this checklist as each extraction lands.
