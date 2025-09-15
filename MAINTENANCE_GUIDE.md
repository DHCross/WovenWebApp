
# Woven Map App: Best Practices & Maintenance Guide

This document outlines the best practices for maintaining, updating, and troubleshooting the Woven Map App. It now incorporates consolidated lessons learned from live operation, API quirks, and product evolution (2025-09).

---


## 0. **Key Lessons Learned (2025-09)**

- **Provenance is critical:** Every report must stamp provenance (house system, orbs profile, relocation mode, timezone DB, engine versions, math_brain_version) for auditability and reproducibility.
- **Relocation is powerful but brittle:** House reanchoring (A_local/B_local) is essential for Balance Meter accuracy, but depends on precise location and upstream resolver behavior. Robust fallbacks and “Angle Drift Cone” are implemented for ambiguous cases.
- **API payload quirks:** Upstream transit endpoints are finicky. City-only vs coords-only vs city+state behave differently. Adapter logic and explicit geocoding modes (GeoNames, city+state) are supported. Developer UX is clear about these requirements.
- **Orbs and filters:** Strict orb caps and documented Moon/outer rules (+Moon +1°, outer→personal −1°) are enforced before weighting. Orbs profile is always explicit in provenance.
- **Graceful fallback:** If the provider returns no aspects, the report template renders fully with explicit “no aspects received” placeholders and simulated examples flagged as such. Partial days are handled, and Angle Drift Alerts are shown for house ambiguity.
- **User simplicity + developer detail:** UI remains minimal for non-programmers (date + birth city). The backend/adapter handles complexity and documents all required options for power users. Clear UX copy guides users on location accuracy and fallback options.
- **Falsifiability and feedback:** SST, Drift Index, Session Scores, and micro-probes are enforced. Misses are calibration data, not user error. Every report includes a provenance block and raw geometry appendix for transparency.

---

- **Keep a CHANGELOG.txt in the root directory.**
  - Log every update, fix, break, or recommendation.
  - Use a standardized format: `[YYYY-MM-DD HH:MM] [TYPE: BREAK/FIX/CHANGE/UPDATE] Description`.
  - Include enough detail for future reference and debugging.

## 2. **Dependency Management**

- **Regularly audit and update dependencies (e.g., npm packages).**
  - Outdated dependencies can introduce security risks and bugs.
  - After updates, test thoroughly to check for breaking changes.

## 3. **Environment Variables & API Keys**

- **Always use environment variables for secrets (e.g., RAPIDAPI_KEY).**
  - Never commit API keys or secrets to source control.
  - Keep an `.env.example` file with placeholder values for onboarding.

## 4. **File Organization & Cleanliness**

- **Keep the file structure simple and decluttered.**
  - Remove unused or obsolete files regularly.
  - Place important files like README.md, CHANGELOG.txt, and LICENSE.txt in the root directory.

## 5. **Configuration & Build Scripts**

- **Ensure configuration files (e.g., tailwind.config.js, tsconfig.json) are up-to-date.**
  - Scripts in `package.json` should allow easy build, development, and testing workflows.
  - Example:

    # Woven Map — Maintenance & Operational Guide (Unified)

    This guide consolidates all maintenance, operational, and troubleshooting rules for the Woven Map backend (Math Brain), reflecting the latest unified report guide and live operational lessons. It supersedes all prior fragmented maintenance notes.

    ---

    ## 1. Core Maintenance Principles

    - **Provenance is required:** Every report and API response must include a provenance block (house system, orbs_profile, relocation_mode, timezone DB, engine versions, math_brain_version, and per-day provenanceByDate).
    - **Relocation is valuable but fragile:** A_local/B_local is essential for Balance Meter but depends on reliable geocoding. Fallbacks and Angle Drift Cone are implemented for ambiguous cases.
    - **Formation locking:** Never mix geocoding modes (coords-only vs city-mode) within a single run window. Formation is chosen once and locked for all days in the window.
    - **Orb policy:** Strict orb caps (8/7/5 + Moon/outer rules) are enforced before weighting. Orbs profile is always explicit in provenance.
    - **Fallbacks:** If the provider returns no aspects, the report template renders with explicit “no aspects received” placeholders and simulated examples flagged as such. Partial days are handled, and Angle Drift Alerts are shown for house ambiguity.
    - **drivers[] normalization:** All drivers must be normalized and present (empty array if none) for stable UI rendering.
    - **QA and logging:** Automated schema checks, detailed logging, and retry/backoff for 429/500 errors are required.

    ---

    ## 2. Maintenance Checklist

    1. **Environment variables:**
      - `RAPIDAPI_KEY` (required)
      - `GEONAMES_USERNAME` (optional, stabilizes city-mode)
    2. **API health:**
      - Test with known-good payloads using `/api-test.html` or `test-improvements.js`
      - Check for 422/429/500 errors and log full upstream request/response (trimmed)
    3. **Provenance verification:**
      - Use `scripts/probe-provenance.js` to verify provenance and drivers[]
      - Confirm per-day provenanceByDate entries for all days in a window
    4. **Relocation/formation:**
      - Confirm formation is locked for the window (no mixing city/coords)
      - If aspects missing, try toggling formation and retry
    5. **Orbs and weights:**
      - Confirm orb clamping is applied pre-weight
      - Check orbs_profile in provenance
    6. **drivers[]:**
      - Ensure drivers[] is always present (empty if none)
      - Check for normalization (a, b, type, orb, applying, weight, is_transit)
    7. **Fallbacks:**
      - If no aspects, ensure placeholders and simulated examples are rendered and flagged
    8. **Logging and error handling:**
      - Log all validation errors, upstream failures, and retry attempts
      - Use exponential backoff for 429 errors
    9. **Testing:**
      - Run automated schema checks in CI
      - Use test pages and scripts for manual QA

    ---

    ## 3. Troubleshooting Appendix (Quick Reference)

    1. **drivers[] empty:**
      - Check provenanceByDate.formation (coords vs city)
      - If formation=city_state_geonames but aspect_count=0, ensure GEONAMES_USERNAME is valid
      - If formation=coords but upstream returns 422 requiring city, try city+state formation
    2. **House differences vs old reports:**
      - Verify relocation_mode used (A_local vs None)
      - Confirm house system (Placidus vs Whole Sign)
      - Check exact event timestamp (small time shifts can move cusps)
    3. **Strange orbs/weights:**
      - Ensure orb clamping applied pre-weight (8/7/5 + Moon/outer adjustments)
      - Check orbs_profile in provenance
    4. **API errors (422/429/500):**
      - Log full upstream request/response (trimmed)
      - For 429, use exponential backoff and retry
      - For 422, check payload shape and formation
    5. **GeoNames/city-mode issues:**
      - Ensure GEONAMES_USERNAME is set and valid
      - If city lookup fails, fallback to coords-only
    6. **UI/UX issues:**
      - Ensure all required fields are present in the frontend form
      - Validate before submission
      - Log and display clear error messages

    ---

    ## 4. Admin/Dev Tools

    - `scripts/probe-provenance.js` — probe provenance and drivers[]
    - `test-improvements.js`, `test-coords.js` — test payloads and formation
    - `debug-api.html`, `debug-test.html` — manual API testing

    ---

    ## 5. Best Practices

    - Always update documentation when operational rules change
    - Keep all environments in sync (dev/prod)
    - Never commit secrets; rotate keys regularly
    - Use contract-first development (openapi.json)
    - Log all errors and provenance for auditability

    ---

    ## 6. Product Philosophy (restated)

    - Falsifiability first: every poetic line must trace to a math anchor or be explicitly labeled as simulated
    - Recognition before diagnosis: FIELD → MAP → VOICE
    - Graceful honesty: if aspects are missing or ambiguous, call it out and provide practical fixes
    - Human in the loop: calibrations use lived pings; the system learns

    ---

    ## 7. Quick Reference

    - `npm run check-env` — verify environment
    - `npm run dev` — local dev
    - `netlify dev` — local Netlify server
    - `npm run build:css` — production CSS build

    For further details, see `README.md` and `API_INTEGRATION_GUIDE.md`.
---

## Quick Checklist Before Each Update

- [ ] Update CHANGELOG.md with details of the change.
- [ ] Ensure dependencies are up-to-date.
- [ ] Test for errors and validate user flows.
- [ ] Verify safe lexicon validation passes (check browser console for ✅).
- [ ] Check JSON exports contain no prose (only enums/numbers/glyphs).
- [ ] Test accessibility features (keyboard navigation, screen reader announcements).
- [ ] Clean up unused files and double-check .env handling.
- [ ] Commit with a clear, descriptive message.

---

## Troubleshooting Tips

- **App not working?**  
  - Check CHANGELOG.md for recent changes.
  - Verify API keys and environment variables.
  - Review error messages and validation logic.

- **Styling issues?**  
  - Rebuild CSS (`npm run build:css`).
  - Ensure all relevant files are included in `tailwind.config.js`.

- **API errors?**  
  - Check for outdated or missing dependencies.
  - Make sure the API key is present and correct.

---

By following these practices, you'll make the Woven Map App easier to maintain, more resilient to mistakes, and welcoming to collaborators.

---

## Balance Meter (v1.1) + SFD (v1.2) — Developer Notes

- Module: `src/balance-meter.js` (wired into engine, always on).
- Exports:
  - `computeBalanceValence(dayAspects): number` → normalized −5..+5 (rebalanced valence)
  - `computeSFD(dayAspects): { SFD, Splus, Sminus }` → all in −5..+5
- Input shape: array of aspect objects with fields commonly present in our pipeline:
  - `aspect|type|_aspect` (e.g., `trine`, `square`), `p1_name|transit|a`, `p2_name|natal|b`, `orb|orbit|_orb`
- Implementation follows Balance Meter.txt (v1.2 Draft): supportive vs counter sets, linear orb taper, symmetric sensitivity boosts, and tanh normalization.
- Engine emits WM‑Chart‑1.2 unconditionally with per‑day `balance`, `sfd`, `splus`, `sminus` adjacent to Seismograph metrics.
- Provenance fields added:
  - `meta.calibration_boundary: "2025-09-05"`
  - `meta.engine_versions: { seismograph: "v1.0", balance: "v1.1", sfd: "v1.2" }`
  - `meta.reconstructed: boolean` (true when requested date < boundary)

---

## 10. **Development Roadmap & Future Integration**

*Last updated: September 11, 2025*

### **Current State (September 2025)**
✅ **Math Brain**: Core astrological calculations with triple-channel Balance Meter  
✅ **Auth0 Integration**: Google Login authentication system ready  
✅ **Dual Report Generation**: Mirror + Balance Meter simultaneous generation  
✅ **Visual Meters**: Triple-channel graphic displays (Seismograph v1.0, Balance v1.1, SFD v1.2)  

### **Phase 1: Poetic Brain Integration (Upcoming)**
🔮 **Target**: Clone and migrate Poetic Brain for authenticated users  
- **Access Level**: Google Login required (no paywall initially)
- **Integration**: Enhance narrative generation using existing report structure
- **UI Enhancement**: Add "Poetic" tab for authenticated users
- **Data Flow**: Poetic content stored alongside technical data in `latestResultData`

### **Phase 2: Premium Tier Architecture (Future)**
💎 **Target**: Tiered access system with premium features  
- **Free**: Math Brain + Balance Meter reports (current functionality)
- **Authenticated**: + Poetic Brain narrative enhancement
- **Premium**: + Advanced features, extended date ranges, priority processing

### **Technical Implementation Notes**
- **Foundation Ready**: Current dual report system designed to accommodate poetic narratives
- **Auth Integration**: Auth0 user context available for personalized content
- **Scalable Architecture**: Netlify serverless functions can handle tiered processing
- **Storage Strategy**: Multi-report structure supports narrative + technical data
- **UI Expandability**: Tab system designed for additional report types

### **Migration Considerations**
- **Poetic Brain Clone**: Separate migration from existing Poetic Brain repository
- **User Experience**: Natural upgrade path (anonymous → authenticated → premium)
- **Backward Compatibility**: Existing functionality preserved for all user levels
- **Performance**: Ensure poetic generation doesn't impact core Math Brain performance

### **Development Priorities**
1. **Auth-gated Features**: Prepare UI/UX for authenticated vs anonymous users
2. **Poetic Integration Points**: Identify optimal insertion points in report generation
3. **Content Management**: Design system for storing/retrieving poetic narratives
4. **Testing Strategy**: Ensure seamless experience across all access levels
