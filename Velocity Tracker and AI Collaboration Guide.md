# Concept Guide: The "Velocity Project"

**Status:** Archived (Historical Sub-Project)

This document provides conceptual and historical context for the **Velocity Project** and **Velocity Tracker** referenced in legacy repository files.

This concept is **not** part of the current **Pure Next.js** architecture and is **not** referenced in the canonical documentation set (e.g., `ASTRO_BRAIN.md`, `API_REFERENCE.md`).

---

## 1. Historical Concept

The **Velocity Project** appears to have been a distinct R&D initiative that ran parallel to the core **Astro Brain** development.

Based on archived file names and content, this project's goals included:

- Defining and exploring symbolic **“velocity”** as a metric.  
- Measuring and tracking **recognition** and **attribution** across features or outputs.  
- Building tooling to **track**, **forecast**, and **analyze** these metrics over time.

This project was comprehensive and included:

- A formal thesis:  
  `docs/VELOCITY_PRODUCT_THESIS_2025-11-11.md`
- A whitepaper:  
  `docs/velocity-whitepaper.md`
- Specific tracking setup:  
  `docs/VELOCITY_TRACKING_SETUP.md`
- Forecasting models:  
  `docs/velocity-forecast.md`
- Analysis and tooling:  
  `docs/VELOCITY_ANALYSIS.md`  
  `packages/velocity-toolkit/README.md`

---

## 2. Key Archived Files

The **Velocity Project** is not defined by a single file but by a **collection** of related documents and code.

The key files for understanding this project (all of which belong in the `/archive/06-Velocity-Project/` folder) include:

- `docs/VELOCITY_PRODUCT_THESIS_2025-11-11.md`  
- `docs/VELOCITY_RECOGNITION_ATTRIBUTION_2025-11-11.md`  
- `docs/VELOCITY_TRACKING_SETUP.md`  
- `docs/VELOCITY_TOOLKIT_README.md`  
- `docs/VELOCITY_ANALYSIS.md`  
- `docs/velocity-forecast.md`  
- `docs/velocity-whitepaper.md`  
- `VELOCITY_RETROSPECTIVE.md`  
- `packages/velocity-toolkit/README.md`

These documents collectively describe:

- The conceptual foundations of “velocity”  
- Proposed productization and measurement strategies  
- Implementation notes for a “velocity toolkit”  
- Retrospective and analysis of the effort

---

## 3. Current Status: Archived

The **Velocity Project** and its associated **Velocity Tracker**:

- Were **not merged** into the final, canonical **Pure Next.js** architecture.  
- Are **not referenced** by the current Astro Brain or Poetic Brain specs.  
- Exist now as a **separate, historical research body**, preserved for reference.

In the current system:

- Core **Astro Brain** metrics are defined exclusively by the **Seismograph** engine  
  (`src/math-brain/seismograph-engine.js`), which produces:

  - `magnitude`  
  - `directional_bias`  
  - `volatility`

- These are the **only metrics standardized** in `API_REFERENCE.md` (ACC Spec v2).

The **“Velocity”** metrics and associated tooling are therefore considered:

- **Archived R&D**, not part of the current runtime or public API.  
- Useful as historical context and inspiration, but **not active or supported** in the production architectu
