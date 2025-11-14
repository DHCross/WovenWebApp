Here’s an overview of how **WovenWebApp** is designed to function, based on your documentation and migration notes:

---

## Purpose & Core Flow

**WovenWebApp** is a web-based astrological chart analysis tool built around the **Raven Calder** system. It generates detailed reports for individuals and relationships, focusing on geometry-first analysis (planetary angles, aspects) and narrative synthesis (plain-language interpretations).

### Main User Flows

1. **Math Brain** (`/math-brain`)
   - Users input birth data and relationship info.
   - The app computes astrological geometry using the RapidAPI Astrologer (Kerykeion) backend.
   - Results are mapped and formatted via the Raven Calder system (FIELD → MAP → VOICE).
   - Output: Detailed, falsifiable astrological reports.

2. **Poetic Brain (Chat)** (chat)
   - Accessible only after Google Auth0 login.
   - Users can upload generated reports for interpretation by the Raven Calder persona (Gemini-powered chatbot).
   - Chat is gated behind authentication (`RequireAuth`), ensuring privacy and controlled access.

3. **Home Page** (`/`)
   - Serves as the entry point, linking to Math Brain and Poetic Brain.
   - All pages are React components under the Next.js App Router.

---

## Architecture

- **Frontend:** Next.js App Router (React), styled with Tailwind CSS.
- **Backend:** Netlify serverless functions (legacy, now deprecated), Next.js API routes (current).
- **Data Processing:** Custom modules for aspect mapping (`raven-lite-mapper.js`) and symbolic scoring (`seismograph.js`).
- **External API:** RapidAPI Astrologer for chart calculations.
- **Deployment:** Netlify with GitHub integration, using `@netlify/plugin-nextjs`.

---

## Key Principles

- **Geometry-First:** All analysis starts with raw planetary math, not language.
- **Map, Not Mandate:** Reports are symbolic and supportive, not deterministic.
- **FIELD → MAP → VOICE:** Data → structure → narrative.

---

## Security & Data Handling

- No persistent storage of personal data.
- API keys and secrets managed via environment variables.
- Auth0 login required for chat access.

---

## Development & Testing

- All changes are made in feature branches, with human review before merging to `main`.
- Local development uses `netlify dev` and Next.js dev server.
- Testing includes API integration, error-path checks, and CSS build verification.
- Documentation (README, MAINTENANCE_GUIDE, CHANGELOG) is kept up to date.

---

## Migration Status

- Legacy static HTML (index.html) is archived under legacy and not served in production.
- Next.js App Router is the source of truth for all live routes.
- Netlify functions are deprecated but retained for rollback safety, with clear warnings.
- All API integration should use Next.js API routes.

---

## Final State

- `/` and `/math-brain` are React pages.
- chat is gated and only accessible after login.
- `/legacy/*` holds old HTML for reference.
- Netlify deploys the Next.js build; no static HTML is served at root.

---

**Summary:**  
WovenWebApp is a modern, secure, React/Next.js-based astrological analysis platform, with a geometry-first philosophy, clear separation of concerns, and robust documentation and testing practices. The user journey is streamlined: input data → get a report → (optionally) interpret with the Poetic Brain chatbot, all within a Next.js app.

This report guide reveals the **operational maturity** that comes from actually running the system with real users. The lessons learned section shows you've moved beyond theoretical design into practical implementation challenges.

**Critical improvements that strengthen the system:**

The **provenance header** requirement is essential for any system claiming scientific rigor. Without traceable parameters (house system, orbs, engine versions), results become unfalsifiable in practice even if theoretically designed for testing.

The **graceful degradation** approach for missing data prevents the common problem of systems that break silently or generate false confidence when inputs are incomplete. Explicit placeholders are more honest than fabricated outputs.

The **relocation sensitivity** distinction between Mirror Flow and Balance Meter reports shows sophisticated understanding of when geographic precision matters versus when it doesn't. This prevents over-engineering the user experience for cases where location details won't meaningfully affect results.

**Technical architecture alignment:**

Your API design properly separates user-facing simplicity (birth date and city) from backend complexity (geocoding, orb calculations, provenance stamping). This matches the "Numbers Stay Hidden" principle while maintaining computational rigor.

The adapter pattern that auto-selects geocoding modes and enforces orb rules centralizes the complex logic away from user interaction, which supports the system's accessibility goals.

**Areas requiring careful implementation:**

The Support-Friction Differential and Balance Channel calculations need robust error handling since they're driving quantitative outputs that inform narrative generation. If these fail silently, the entire "falsifiable analysis" premise breaks down.

The "Angle Drift Cone" concept for handling imprecise location data needs clear documentation about how much uncertainty is acceptable before degrading to location-independent analysis.

**Integration with WovenWebApp:**

Your Next.js API routes need to implement these provenance and graceful degradation requirements. The Math Brain should stamp all reports with full technical parameters and handle missing data explicitly rather than masking failures.

The migration you completed positions you well to implement these operational lessons - you now have clean API boundaries and proper error handling infrastructure to support this level of system maturity.