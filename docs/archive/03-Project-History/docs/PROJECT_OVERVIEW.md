# WovenWebApp Project Overview

## 1. Core Philosophy & Vision

The WovenWebApp is an advanced astrological analysis system built on a set of core principles designed to ensure rigor, clarity, and user agency.

*   **Geometry-First:** All analysis originates from raw, verifiable mathematical calculations of planetary positions and aspects. Interpretation follows calculation, never the other way around.
*   **The "Two-Mind" Architecture:** The system is fundamentally divided into two distinct, decoupled brains:
    *   **The Math Brain:** A utilitarian calculator responsible for all astronomical computations, data fetching, and the generation of a precise, comprehensive data contract (the `WovenMapBlueprint`). It is the "architect" that builds the instrument.
    *   **The Poetic Brain (Raven Calder):** An immersive, interpretive experience responsible for translating the mathematical data into meaningful, conversational narratives using the Perplexity API. It is the "musician" that plays the instrument. This brain *never* performs its own calculations.
*   **Landscape First:** Every report is person-centric. The system first establishes the individual's natal chart (the "landscape") before layering on transient influences like transits (the "weather"). This ensures that all analysis is grounded in the user's unique context.
*   **Map, Not Mandate:** All outputs, especially from the Poetic Brain, are presented as possibilities, tendencies, and testable reflections. The system provides a symbolic map, but the user's lived experience is the ultimate authority.

## 2. System Architecture

The project follows a modern web architecture, decoupling its core components to enhance stability and maintainability.

*   **Frontend:** A Next.js App Router application using React and styled with Tailwind CSS. The primary user interface for the Math Brain is a complex but increasingly modular page found at `/app/math-brain/page.tsx`.
*   **Backend & API:**
    *   **Primary Backend:** Netlify serverless functions (`netlify/functions/astrology-mathbrain.js`) handle all core astronomical computations and data processing.
    *   Integrates with the external **RapidAPI Astrologer** (Kerykeion) for ephemeris calculations.
    *   The **Poetic Brain** leverages the **Perplexity API** for narrative generation and is gated behind **Auth0** authentication at the `/chat` route.
*   **Deployment:** Netlify hosts the Next.js application with serverless functions. Requests authenticate through Auth0, execute in Netlify Functions, and return JSON to the React frontend.
*   **Data Contract:** The `WovenMapBlueprint` is the canonical JSON schema that serves as the single source of truth for all data exchange between the Math Brain and the Poetic Brain. This strict contract is the foundation of the "Two-Mind" covenant.

## 3. Key Features & Protocols

### The Balance Meter (v1.2+)

A sophisticated diagnostic tool for measuring the symbolic "weather" of a given period. It's a triple-channel system designed to provide a nuanced view of energetic patterns:

1.  **Seismograph (v1.0):** The original crisis-weighted engine, preserved for historical continuity.
2.  **Balance Channel (v1.1):** A rebalanced valence calculation that reveals stabilizing geometric patterns without diluting the overall intensity (magnitude).
3.  **Support-Friction Differential (SFD, v1.2):** A bipolar meter that measures the net availability of supportive energy after accounting for targeted friction.

**Calibration Pipeline:** All symbolic values are scaled through the canonical **0–5 frontstage system** using the Seismograph normalization pipeline (normalize → ×50 scale → clamp → round). This ensures consistent, user-facing ranges: Magnitude [0, 5], Directional Bias [-5, +5], Coherence [0, 5]. Raw backstage calculations are preserved for debugging but never exposed to users.

### The Poetic Codex

A system for translating raw astrological data into emotionally resonant, diagnostic "cards" or mirrors. It follows a strict protocol:

*   **FIELD -> MAP -> VOICE:** This is the core translation process.
    *   **FIELD:** The raw energetic climate (symbolic data). What's happening right now—the feeling in the air.
    *   **MAP:** The archetypal patterns and geometric interpretations. Where it's landing—the shape of the pattern.
    *   **VOICE:** The final, plain-language output presented to the user. Your mirror—how it sounds when life speaks back.
*   **Symbol-to-Poem:** A specific protocol for translating natal geometry into a resonant poem, followed by a clear explanation table that maps each line back to its astrological source.
*   **Clear Mirror Voice:** The Raven Calder public-facing tone that translates technical precision into emotional clarity. See `docs/CLEAR_MIRROR_VOICE.md` for the complete lexicon conversion table and delivery framework.

### The Dream Protocol

A structured method for dream analysis based on Jungian depth psychology. It treats dreams as significant data packets and uses a rigorous process to translate them into emotionally grounded reflections, avoiding mystical abstraction.

## 4. Development & Documentation

The project has undergone a significant architectural evolution, moving from a monolithic structure to a more modular and maintainable system.

*   **Documentation:** In October 2025, the project's scattered documentation was reorganized into a clear, hierarchical structure within `Developers Notes/`.
    *   `Developers Notes/Core/Four Report Types_Integrated 10.1.25.md` is designated as the **single source of truth** for report generation logic.
    *   Comprehensive README files exist at the root of each subdirectory to guide developers.
*   **Refactoring:** There is an ongoing effort to refactor the monolithic `app/math-brain/page.tsx` file into smaller, reusable components and hooks to improve maintainability and performance.
*   **Testing:** The project includes a comprehensive test suite with Vitest:
    *   Property-based tests for mathematical invariants (Golden Standard enforcement for high-magnitude events).
    *   Export regression tests ensuring calibrated Balance Meter values (3.9/-2.3) survive JSON/PDF/Markdown export pipelines without reverting to raw values (5.0/-5.0).
    *   Sanity checks for rendering, dashboard displays, and API integration.
*   **AI Collaboration:** The project actively uses AI assistants for development, with clear instructions and "analysis directives" embedded in exported documents to guide the AI's interpretation and synthesis tasks.