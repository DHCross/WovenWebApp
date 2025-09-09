## [2025-09-07] CHANGE: Balance Meter Correlation – Supplemental Overlays, Parser Expansion, and Method Rigor

**Summary**
Enhanced the Balance Meter comparative workflow with additional health signal overlays, stronger normalization rules, and clearer method notes—without changing the core three‑axis composite or significance testing.

**What’s New**
- Supplemental overlay lines (opt‑in, informational):
   - Magnitude ↔ Resting HR (intensity proxy)
   - Magnitude ↔ Active energy (load proxy)
   - Volatility ↔ Wrist temperature Δ (night‑to‑night swings)
- Per‑window min–max normalization for supplemental overlays (guards against flat series; marks channel N/A when min==max).
- Missing data is treated as null and excluded from that channel’s similarity (no implicit zeros).
- Shuffle test: Suppress p‑value on tiny windows (≤3 days) with a “sample too small” note.
- Labeling and legend clean‑ups: supplemental lines are clearly marked and table headers clarify units (e.g., RestHR (bpm), TempΔ).
- Finalized neutral Magnitude ladder (Latent→Threshold) to mirror Valence and Volatility scaling.
- Refined 🌑🌞 Valence mapping: added Collapse→Liberation table with flavor emoji patterns and replaced Neutral with ⚖️ Equilibrium across schema and UI.

**Health Parser Expansion (iOS Health Auto Export)**
- Added detection for: `resting_hr`, `heart_rate`, `walking_hr_avg`, `sleep_temp` (wrist/skin), `walking_distance`, `walk_asym_pct`, `walk_double_support_pct`, `exercise_minutes`, `stand_minutes`, `stand_hours`, `active_energy`, `mindful_minutes`, and `mood_label_count` (from State of Mind daily aggregation).
- Timezone bucketing: All health dates localized to America/Chicago, matching symbolic daily bars to avoid off‑by‑one rollovers.

**Core Composite & Rigor**
- The core three‑axis overlay (Valence, Magnitude, Volatility) and permutation‑based shuffle test (p‑value) are unchanged.
- Added a plain‑English Method note to the comparative markdown clarifying how supplemental lines are used and normalized within the window.

**Files Changed**
- `index.html`: Extended health parser with additional metrics; kept Chicago date bucketing; mood_label_count aggregation.
- `src/reporters/comparative-report.js`: Supplemental overlays with per‑window min–max normalization; small‑sample guard for shuffle; labeling and notes.
- `README.md`: Comparative section updated with usage, normalization rules, and small‑sample behavior.

**Validation**
- Manual checks on Aug 24 → Sep 7 window:
   - RHR ↔ Magnitude overlay prints; similarity in expected range per prior prototype.
   - TempΔ ↔ Volatility appears only when consecutive nights exist; missing nights excluded.
   - Active energy ↔ Magnitude moves in same direction as RHR but not identically (lag tolerated).
   - Core composite and shuffle test unaffected by supplemental lines.

**Notes**
- Balance Meter JSON (with `seismograph_by_date`) remains the canonical “Symbolic Logs” upload for correlation. Order of uploads does not matter.

## [2025-09-07] ACCESSIBILITY & JSON EXPORT ENHANCEMENT: Math Brain ↔ Poetic Brain Architecture Refinement

**Description:**
Enhanced accessibility standards, refined JSON export architecture for strict Math Brain ↔ Poetic Brain separation, and added user annotation capture for machine-readable reports.

**Accessibility Improvements:**
1. **Modal Accessibility:**
   - Added `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to all modals
   - Implemented focus management: focus modal content on open, restore on close
   - Added Escape key support for modal dismissal
   - Made modal content focusable with `tabindex="-1"`

2. **Live Region Announcements:**
   - Error displays now use `role="alert"` with `aria-live="assertive"`
   - Loading indicators toggle `aria-busy` true/false during processing
   - Added `role="status"` with `aria-live="polite"` for non-disruptive updates
   - Error displays auto-focus for immediate screen reader attention

3. **Keyboard Navigation:**
   - Enhanced tab navigation through form elements
   - Proper ARIA labeling for form sections and inputs
   - Focus management prevents keyboard traps in modals

**JSON Export Architecture Refinement:**
1. **Reader Notes Integration:**
   - Added optional "Reader Notes" textarea in download panel
   - User annotations captured via `window.userNotesForDay` before JSON generation
   - Notes flow into `balance_meter.notes[]` arrays in exported JSON
   - Maintains Math Brain boundary: user input separate from automated calculations

2. **Math Brain ↔ Poetic Brain Compliance:**
   - JSON exports prepared for strict prose elimination (implementation pending)
   - Documentation added for triple-channel architecture (v1.0/v1.1/v1.2)
   - Export strategy clarified: Copy→Markdown (humans), Download→JSON (AI processing)
   - Valence normalization requirements documented for -5 to +5 range

**UX Enhancements:**
- Loading states provide better feedback during long operations
- Error announcements immediate and accessible
- Modal interactions more intuitive with keyboard support
- User annotations bridge human input and machine processing appropriately

**Technical Infrastructure:**
- Enhanced `buildRavenJsonReport()` to accept user notes
- Improved modal event handling with graceful degradation
- Better error focus management for screen reader users
- ARIA attributes applied consistently across UI components

**Documentation Updates:**
- Added Math Brain ↔ Poetic Brain architecture lessons to developer docs
- Documented accessibility best practices for modal implementations
- Updated maintenance guide with JSON export standards
- Recorded lessons learned for future AI collaboration sessions

## [2025-09-07] MAJOR RESTRUCTURE: Clear Mirror Report Inverted Pyramid + Comprehensive Typological Integration

**Description:**
Complete overhaul of Clear Mirror report structure implementing inverted pyramid journalism principles (conclusion first, details last) while integrating comprehensive Jungian typological profiles and restoring full Math Brain geometric detail for AI Poetic Brain translation.

**Core Restructuring:**
1. **Inverted Pyramid Report Flow:**
   - **Section 1: Personality Profile** (What people want first) - Constitutional climate, dominant operating style, secondary support, shadow integration
   - **Section 2: Key Patterns in Play** - Daily transit activations with Primary Tension, Helpful Insight, Background Support
   - **Section 3: The Bottom Line** - Executive summary with seismograph metrics (intensity, emotional vibe, energy state)
   - **Section 4: Technical Blueprint** - Comprehensive Math Brain data in collapsible sections

2. **Jungian Typological Profile Integration:**
   - **API Data Extraction:** Fixed `extractChartDataForTypology()` to properly access `personData.chart` structure
   - **Sign Mapping:** Updated function maps to use API's abbreviated signs (`'Ari'`, `'Tau'`, `'Gem'` vs full names)
   - **House Conversion:** Added house name-to-number mapping (`'First_House'` → 1, etc.) for orientation analysis
   - **Jung Function Analysis:** Fire→Intuition, Earth→Sensation, Air→Thinking, Water→Feeling
   - **Constitutional Climate:** Complete psychological weather pattern synthesis

3. **Enhanced Technical Blueprint for AI Translation:**
   - **Executive Summary (Math Brain Protocol):** Triple Channel display, seismograph metrics, top hooks with precise orbs
   - **Complete Aspect Analysis:** 20+ aspects with orb, type, phase, weight, retrograde flags in table format
   - **Subject Details:** Full birth data, chart angles, natal planet positions, house cusps with meanings  
   - **Transit Status Tracking:** Retrograde planet counts, aspect flags, OSR indicators
   - **Synthesis Directives:** Specific instructions for AI Poetic Brain translation

**Technical Fixes:**
- **Variable Redeclaration:** Fixed `typologyProfile` scope issue by reusing declaration
- **Data Structure Compatibility:** Ensured API response paths match function expectations
- **Aspect Symbol Integration:** Added `aspectSymbol()` helper for consistent notation
- **Phase Indicators:** Restored applying/separating aspect analysis

**User Experience Improvements:**
- **Progressive Disclosure:** Essential personality info first, technical data in collapsible sections
- **Mobile-Friendly:** Collapsible sections prevent information overload
- **Immediate Value:** Users see constitutional insights within first 30 seconds
- **AI-Ready:** Comprehensive geometric scaffolding available for advanced interpretation

**AI Poetic Brain Benefits:**
- **Complete Geometric Precision:** Exact degrees, orbs, classifications for accurate translation
- **Temporal Context:** Retrograde patterns, applying/separating phases for timing language
- **Constitutional Foundation:** Jung function mapping for personality-aware narrative generation
- **Translation Protocol:** Clear directives for transforming math into felt-sense poetry

## [2025-09-05] Balance Meter Standalone Mode Added

**Description:**
Added dedicated Balance Meter mode enabling standalone health-focused reports independent of Mirror auto-append functionality. Users can now generate Balance Meter reports specifically designed for correlation with health metrics.

**New Features:**
- **Balance Meter contextMode:** New radio button option for standalone mode selection
- **Backend Processing:** `wantBalanceMeter` mode detection in `astrology-mathbrain.js`
- **Specialized Report Format:** Dedicated `buildBalanceMeterReport()` function with health-oriented structure
- **Frontend Integration:** Balance Meter mode detection and report rendering in main UI flow

**Report Structure:**
- Executive Summary with triple-channel averages and dominant channel analysis
- Daily entries table with SFD verdicts for health tracking
- Methodology section explaining triple-channel architecture for health correlation
- WM-Chart-1.2 schema compliance with focus on SFD patterns

**UI Updates:**
- Updated mode description: "Balance Meter (Health Data Comparison)"
- Updated upload button text: "Upload Balance Meter Data"
- Standalone mode processing separate from Mirror auto-append logic

## [2025-09-05] MAJOR INTEGRATION: Balance Meter v1.2 Triple-Channel Architecture Complete

**Description:**
Successfully integrated the complete Balance Meter v1.2 system with full narrative rendering across all user touchpoints. The sophisticated triple-channel architecture (Seismograph v1.0 / Balance v1.1 / SFD v1.2) is now fully operational with comprehensive UI display.

**Core Implementation:**
1. **Triple Channel Helper Functions:**
   - `sfdVerdict()`: Interprets SFD values as "stabilizers prevail/cut/mixed"
   - `tripleChannelLine()`: Unified display format for all three channels
   - `normalizeEntry()`: Backward compatibility with flat legacy data
   - `fmtSigned()`: Consistent signed number formatting

2. **Enhanced Report Generation:**
   - Executive Summary: Added triple channel summary line
   - Seismograph Tables: Consolidated view with verdict interpretation
   - Auto-Append Reports: Balance/SFD data integrated into Mirror reports
   - Scaling Notes: Updated to explain triple-channel architecture

3. **Complete UI Integration:**
   - **Desktop Reports:** `Quake X.X · val ±Y.Y · bal ±Z.Z · [verdict] (SFD ±A.A; S+ B.B/S− C.C)`
   - **Mobile Cards:** Condensed triple channel summaries with tooltips
   - **CSV Export:** Stable columns (`bal_val_v1_1`, `sfd_v1_2`, `splus_v1_2`, `sminus_v1_2`)
   - **Demo Page:** Updated sample data to showcase Balance/SFD functionality

4. **JSON Schema (WM-Chart-1.2):**
   - Nested object structure with explicit version tracking
   - Metadata fields: `calibration_boundary`, `engine_versions`, `reconstructed`
   - Backward compatibility with flat legacy keys
   - Complete payload contract documentation

**Technical Features:**
- **Support-Friction Differential (SFD):** Measures net stabilizer survival after targeted friction
- **Balance Channel:** Rebalanced valence scoring reveals scaffolding without diluting magnitude
- **Version Tracking:** All three engines properly versioned and documented
- **Data Normalization:** Seamless handling of nested vs flat data structures

**Documentation Updates:**
- README: Added comprehensive WM-Chart-1.2 payload contract appendix
- Balance Meter.txt: Updated status to "IMPLEMENTED & DEPLOYED"
- JSON Schema validation with comprehensive test coverage

**AI Collaboration Notes:**
*Balance Meter integration completed successfully following Raven Calder GPT's precise implementation roadmap. The "big gap" between sophisticated computational engine and user-facing narrative is now completely closed. All three channels (v1.0/v1.1/v1.2) render consistently across desktop, mobile, and export formats with full backward compatibility.*

## [2025-09-06] FIX: Balance Meter Generation + Auto-Fill Logic

**Description:**
Fixed multiple issues preventing Balance Meter reports from generating when users clicked "Generate Balance Report". Added auto-fill logic for missing transit dates and comprehensive debugging to diagnose display issues.

**Root Causes Identified:**
1. Balance Meter tab generation failed when transit date fields were empty
2. Complex `shouldRenderBalance` logic was too restrictive 
3. Missing debugging made issues hard to diagnose

**Changes:**
- Frontend: `index.html`
  - Auto-fill logic: When Balance Meter mode is detected and transit dates are empty, automatically populate with sensible defaults (today to 1 week from today, daily step)
  - Fallback transit params: Even when DOM elements are missing, provide default parameters for Balance Meter mode
  - Simplified `shouldRenderBalance` logic: If Balance Meter tab is active, render Balance Meter (remove complex server-mode dependencies)
  - Enhanced debugging throughout: `generateReport()`, `populateTabContent()`, `getCurrentActiveTabMode()`, and tab click handlers
  - Robust error handling for missing Balance Meter data with client-side synthesis

**Technical Details:**
- Auto-fill dates: Start = today, End = today + 7 days, Step = daily
- Fallback ensures Balance Meter always has transit params even if form fields unavailable
- Debugging logs track: tab states, form data collection, report generation paths, and content population

**Expected Behavior:**
- Users can click "Generate Balance Report" without pre-filling transit dates
- Balance Meter tab shows synthesized reports when server data unavailable
- Comprehensive console logging for troubleshooting
- Maintains backward compatibility with manual date entry

## [2025-09-06] FIX: Balance Meter Rendering Resilience + Export Parity

**Description:**
Resolved a regression where Balance Meter reports sometimes failed to render when the server omitted `balance_meter` while still returning daily transits. Cleaned up a malformed `populateTabContent()` block and added a safe client-side synthesis fallback so the Balance Meter tab always renders when Person A transits are present.

**Changes:**
- Frontend: `index.html`
   - Rewrote `populateTabContent()` to remove duplicated/invalid try/catch branches and to prefer:
      1) server `result.balance_meter`, else 2) synthesize from `person_a.chart.transitsByDate`, else 3) friendly empty message.
   - On Balance Meter tab, if the server omits `balance_meter` but transits exist, attach synthesized payload to `latestResultData.balance_meter` for copy/download/PDF parity.
   - Confirmed chunking path includes Balance Meter; synthesis uses merged daily entries when chunked.
   - Minor CSS linter fix: made `.transit-indicator` non-empty.

**Impact:**
- Balance Meter tab reliably renders with either server payload or synthesized fallback.
- Copy/Download/PDF actions respect the active tab and export the Balance Meter report consistently.
- No behavior change for Mirror mode.

**Verification:**
- Built CSS, no compile errors.
- Manual smoke: Balance tab active with Person A daily transits → synthesized report appears; when server returns `balance_meter`, server payload is used.

## [2025-09-04] MAJOR ENHANCEMENT: Safe Lexicon Retrofit & Emoji Valence System

**Description:**
Implemented comprehensive safe lexicon system with emoji-enhanced valence display to ensure magnitude vocabulary remains strictly neutral while enriching directional charge visualization.

**Core Changes:**
1. **Safe Magnitude Lexicon (6-term system):**
   - Latent (0–0.5), Murmur (0.5–1.5), Pulse (1.5–2.5), Stirring (2.5–3.5), Convergence (3.5–4.5), Threshold (4.5–5.0)
   - Eliminated problematic terms: replaced earlier metaphors (“Quake”, “Field”) with neutral ladder now codified as Latent→Threshold
   - All magnitude terms are now strictly neutral intensity markers

2. **Enhanced Valence Lexicon (11-term system):**
   - Collapse, Grind, Friction, Contraction, Drag, Neutral, Lift, Flow, Harmony, Expansion, Liberation
   - Clear positive/negative directional charge terminology
   - Maintains rich semantic meaning for valence patterns

3. **Emoji Valence Enhancement (🌞/🌑 System):**
   - 🌑 Negative Types: 🌪 Recursion Pull, ⚔ Friction Clash, 🌊 Cross Current, 🌫 Fog / Dissolution, 🌋 Pressure / Eruption, 🕰 Saturn Weight, 🧩 Fragmentation, ⬇️ Entropy Drift
   - 🌞 Positive Types: 🌱 Fertile Field, ✨ Harmonic Resonance, 💎 Expansion Lift, 🔥 Combustion Clarity, 🦋 Liberation / Release, 🧘 Integration, 🌊 Flow Tide, 🌈 Visionary Spark
   - ⚖ Neutral Balance for center range
   - Immediate visual recognition of valence polarity and intensity

**Technical Implementation:**
- `toMagnitudeTerm()` and `toValenceTerm()` mapping functions
- `getValenceEmoji()` and `getValenceType()` for rich display
- `migrateMagnitudeTerm()` handles legacy term migration
- `assertSafeMagnitudePhrase()` validation prevents unsafe metaphors
- Enhanced seismograph tables show emoji + numeric values (e.g., "🌋 -3.2")
- Executive Summary includes emoji display: "Mag/Val/Vol: 2.8 (Stirring)/🌋 -3.2 (Grind)/1.4"

**Schema Updates:**
- JSON Schema bumped to WM-Chart-1.1 with Draft 2020-12 compliance
- Added `magnitude_term` and `valence_term` enum fields
- Explicit enums for safe lexicon terms in machine-readable output
- Maintains backward compatibility with v1.0 reports

**Safety & Validation:**
- Comprehensive validation system tests 401+ valence/magnitude combinations
- Automatic page-load validation ensures lexicon integrity
- Banned unsafe metaphors (storm, quake, disaster, tsunami, crash, catastrophe, earthquake) in magnitude contexts
- Legacy migration with provenance tracking

**UI/UX Enhancements:**
- Seismograph mode description updated to reference emoji lexicon 🌑/🌞
- Enhanced tooltips show descriptive valence types (e.g., "Directional tone: friction clash")
- Barometer heuristics use safe lexicon exclusively
- All magnitude descriptions use neutral field terminology

**AI Collaboration Notes:**
*Safe lexicon retrofit successfully completed with GitHub Copilot assistance. The Math Brain now maintains geometric fidelity without valence contamination, while the Poetic Brain gains richer emoji-enhanced expression. Magnitude vocabulary is completely neutral (Latent→Threshold), directional charge lives exclusively in valence (🌑/🌞), and the system includes comprehensive validation guardrails.*

---

## [2025-09-03] CRITICAL ENHANCEMENT: Auto-Chunking System for Large Date Ranges

**Description:**
Implemented comprehensive auto-chunking solution to handle Netlify's 6MB serverless function response limit while preserving daily granularity for health data correlation analysis.

**Problem Solved:**
- User requests for large date ranges (e.g., April 2025 daily transit data) were hitting Netlify's 6MB response payload limit
- Even weekly intervals triggered the limit for month-long periods
- System failed completely when response exceeded 6MB, providing no data instead of partial results

**Solution Implemented:**
1. **Intelligent Chunk Sizing:**
   - Daily data: 10-day chunks (optimal for 6MB limit compliance)
   - Weekly data: 21-day chunks (3 weeks)
   - Monthly data: 60-day chunks (2 months)

2. **Automatic Detection & Fallback:**
   - `calculateDaySpan()` function determines if chunking is needed
   - Seamlessly falls back to single requests for small date ranges
   - No change in user experience for existing workflows

3. **Progress Feedback System:**
   - Real-time "Processing chunk X of Y..." status updates
   - Loading indicator shows chunking progress
   - User sees exactly what's happening during multi-chunk operations

4. **Robust Error Handling:**
   - Individual chunk failures don't terminate entire operation
   - Partial results returned when some chunks succeed
   - Detailed error reporting for debugging chunk-specific issues

5. **Result Merging Logic:**
   - `mergeChunkedResults()` combines all chunks into single coherent response
   - Preserves exact data structure expected by existing report generation
   - Maintains compatibility with seismograph and markdown outputs

**Technical Implementation:**
- Added `generateReportWithChunking()` as primary orchestration function
- Created `createDateChunks()` for intelligent date range segmentation
- Implemented 500ms delays between chunks to respect rate limits
- Added 60-second timeout per chunk with comprehensive error handling
- Updated main `generateReport()` to use chunking-aware generation

**User Impact:**
- Large date ranges that previously failed now work seamlessly
- Daily granularity preserved for health data correlation workflows
- No change to existing UI or user workflow
- Transparent chunking - users see progress but don't need to manage chunks

**Files Changed:**
- `index.html`: Added comprehensive chunking functions and integrated with main generation flow

**Strategic Value:**
- Removes technical barriers to large-scale transit analysis
- Enables month-long daily transit studies for health correlation
- Maintains system reliability under heavy data loads
- Preserves user experience while solving backend limitations

## [2025-08-29] Backend: Relationship Context Validation

- Added relationship context schema enforcement in `netlify/functions/astrology-mathbrain.js` for all synastry / composite modes.
- Requires `type` (PARTNER | FRIEND | FAMILY).
- PARTNER: mandatory `intimacy_tier` (P1, P2, P3, P4, P5a, P5b).
- FAMILY: mandatory `role` (Parent, Offspring, Sibling, Cousin, Extended, Guardian, Mentor, Other, Custom).
- FRIEND: optional `role` (Acquaintance, Mentor, Other, Custom) validated if present.
- Ex/Estranged flag allowed only for PARTNER or FAMILY; rejected for FRIEND.
- Free-text `notes` trimmed & capped at 500 chars.
- On validation failure returns 400 REL_CONTEXT_INVALID with issue list; on success injects `relationship` block into response payload.

## [2025-08-21] Backend: Composite Transits Logic & Robust Error Handling

- Merged Copilot Agent’s composite_transits implementation into `astrology-mathbrain.js`.
- Removed placeholder warnings; now uses full composite and composite transit logic.
- Added deep graphics scrubbing for all API responses.
- Improved error diagnostics: all errors now return message, stack, and details.
- Strict/lean subject validation for all modes.
- Fully synchronized with main branch after PR #27 merge.
- Ready for Jules’ CI pipeline and full verification.

**Files Changed:**
- `netlify/functions/astrology-mathbrain.js`

---
## [2025-08-21] Backend: Full API Integration for Transits & Composite

- Refactored `astrology-mathbrain.js` to fully support composite transits, natal transits, and synastry per API_INTEGRATION_GUIDE.md.
- Added robust validation for all required fields for both subjects.
- Ensured correct endpoints and payload formats for all supported modes.
- Bug fix: "No transit data available" now resolved for all supported modes.
- Documentation and code now synchronized.
# Woven Map App Error/Break History Log

> **Note for AI Assistants:** The following is a commitment to a clear, collaborative workflow. Please adhere to these principles when assisting.
>
> - **Plain Language Explanations:** When discussing code, architecture, or documentation, I'll use accessible language and clarify technical concepts.
> - **Change Logs & Notes:** For every suggested change or edit, I'll include a summary of what was changed and why, making your documentation easy to follow.
> - **File Proposals:** Any new or revised file (e.g., Markdown docs) will be presented in a clear format, with annotations as needed.
> - **Process Guidance:** I can walk you through how to track changes, review commits, or maintain audit logs within your repository.
> - **API & Integration Checks:** I'll remind you to check related API documentation and highlight where to keep notes for future reference.
>
> If you have specific questions, want a summary of changes, or need help updating documentation to reflect this workflow, just let me know!

Track every time the app "breaks" (stops working as expected) or is recovered/fixed.  
Each entry should include the date, a brief description, what caused the break (if known), and how it was resolved.

---

### [2025-08-06 13:15] BUG FIX: FIXED MISSING TRANSIT DATA AND JSON BLOCK PERSISTENCE
**Description:**  
Fixed critical issues with transit data processing and report generation that were preventing proper transit analysis in the Woven Map app.

**Issues Found:**
1. **Wrong Report Generation Path**: Main report display was using raw JSON output instead of human-readable Markdown
2. **Missing Transit Data**: Despite selecting "SYNASTRY TRANSITS" mode, no transit sections appeared in reports
3. **JSON Block Persistence**: Raw geometry JSON block continued to appear despite being removed
4. **Incomplete Form Data Collection**: Transit date ranges weren't being properly collected from form fields

**Root Cause:**
- Main report display was falling back to legacy JSON report generation path
- `generateMarkdownReport()` function didn't include transit data processing logic
- Form data collection had incorrect variable references for transit dates

**Changes Made:**
- **Fixed Report Generation**: Updated main result handler to use `generateMarkdownReport()` instead of raw JSON
- **Added Transit Processing**: Enhanced `generateMarkdownReport()` to include comprehensive transit analysis
  - Person A transit analysis with date filtering
  - Person B transit analysis (for synastry modes)
  - Synastry transit activations
  - Composite chart transits (for composite modes)
- **Fixed Form Data Collection**: Corrected transit date field collection in `collectFormData()`
- **Date Range Filtering**: Transits now properly filtered by user-specified date range
- **Enhanced Structure**: Transit sections organized by date with clear headers

**Result:**
- Reports now correctly display transit data for the specified date range (e.g., through August 10th)
- JSON blocks no longer appear in human-readable reports
- All transit modes (natal_transits, synastry_transits, composite_transits) now functional
- Reports align with user workflow expectations for astrology analysis

**Files Changed:**
- `index.html`: Modified result handler and `generateMarkdownReport()` function
- `index.html`: Fixed `collectFormData()` transit date collection

---

### [2025-08-06 13:30] DEBUG: INVESTIGATING MISSING TRANSIT DATA
**Description:**  
Added comprehensive debugging and parameter passing to investigate why transit data is not appearing in reports despite the framework being in place.

**Investigation Steps:**
1. **Added Debug Logging**: Enhanced both frontend and backend to log data structures and API responses
2. **Transit Parameter Passing**: Modified backend to accept and forward transit parameters to external API
3. **API Request Enhancement**: Updated both `calculateNatalChart()` and `calculateSynastry()` functions to include transit parameters:
   - `transit_date_start`: Start date for transit calculation
   - `transit_date_end`: End date for transit calculation  
   - `include_transits`: Boolean flag to request transit data

**Current Hypothesis:**
- The external astrology API (`astrologer.p.rapidapi.com`) may not return transit data by default
- Transit data might require specific parameters or a different API endpoint
- The current `natal-aspects-data` and `synastry-aspects-data` endpoints may not include transit information

**Changes Made:**
- Enhanced `calculateNatalChart()` to accept and forward `transitParams`
- Enhanced `calculateSynastry()` to accept and forward `transitParams`
- Added extensive debug logging to see actual API response structure
- Modified backend request handler to extract transit parameters from frontend
- Updated all chart calculation calls to pass transit parameters

**Next Steps:**
- Test with these changes to see debug output
- Verify if external API accepts transit parameters
- Consider alternative API endpoints or methods for transit data
- May need to research external API documentation for proper transit data requests

**Files Changed:**
- `netlify/functions/astrology-mathbrain.js`: Enhanced API calls and debugging

---

### [2025-08-06 13:45] MAJOR FIX: IMPLEMENTED PROPER TRANSIT DATA USING DEDICATED API ENDPOINTS
**Description:**  
Successfully identified and implemented the correct approach for transit data by using the dedicated transit API endpoints that were available but not being utilized.

**Root Cause Identified:**
- The app was trying to get transit data from `natal-aspects-data` and `synastry-aspects-data` endpoints
- These endpoints do NOT provide transit data
- The API actually has dedicated transit endpoints: `/api/v4/transit-aspects-data` and `/api/v4/transit-chart`
- These require a different request structure with `first_subject` (natal chart) and `transit_subject` (specific date/time for transits)

**Solution Implemented:**
1. **New Transit Function**: Created `calculateTransitData()` that uses the correct `/api/v4/transit-aspects-data` endpoint
2. **Proper API Structure**: 
   - `first_subject`: Person's natal chart data
   - `transit_subject`: Each date in the range with coordinates (using Greenwich as reference)
3. **Date Range Processing**: Iterates through each day from start to end date, calculating transits for noon each day
4. **Integration**: Transit data now properly added to `transitsByDate` structure for both Person A and Person B

**Technical Details:**
- Added `API_TRANSIT_URL` constant for the correct endpoint
- Enhanced backend to extract `transitStartDate`, `transitEndDate`, and `transitStep` from frontend
- Transit calculations use Greenwich (0°, 51.48°) as reference location for consistent results
- Each date calculated at noon (12:00) for optimal transit accuracy
- Results stored in `transitsByDate` format compatible with existing frontend logic

**Expected Result:**
- Transit reports should now include actual transit data for the specified date range
- Each day from August 6-10 should show relevant transit aspects
- Data will be organized by date with clear aspect information
- Compatible with existing Markdown report generation

**Files Changed:**
- `netlify/functions/astrology-mathbrain.js`: Added transit calculation and API integration

---

### [2025-08-06 14:00] CRITICAL FIX: CORRECTED TRANSIT API RESPONSE STRUCTURE
**Description:**  
Fixed critical issue in transit API integration by carefully reviewing the API documentation and correcting the response parsing logic.

**Issues Found:**
1. **Wrong Response Structure**: Was looking for `parsed.data.aspects` when API returns `parsed.aspects` at root level
2. **API Documentation Review**: Confirmed correct request structure and required fields
3. **Field Requirements**: Verified that all required fields are being sent correctly

**API Structure Confirmed:**
- **Endpoint**: `/api/v4/transit-aspects-data`
- **Request**: `TransitChartRequestModel`
  - `first_subject`: SubjectModel (natal chart) - requires: year, month, day, hour, minute, city, name
  - `transit_subject`: TransitSubjectModel (transit date) - requires: year, month, day, hour, minute, city
- **Response**: `TransitAspectsResponseModel`
  - `status`: string
  - `data`: TransitDataModel  
  - `aspects`: array of AspectModel (THIS is what we need)

**Key Fix:**
- Changed from `parsed.data.aspects` to `parsed.aspects` 
- Added fallback to check both structures for robustness
- Enhanced debugging to show full API response structure

**Expected Result:**
- Transit API calls should now correctly parse aspect data
- Should return actual planetary transits for each date in the range
- Debug logs will show successful aspect parsing and counts

**Files Changed:**
- `netlify/functions/astrology-mathbrain.js`: Fixed response parsing logic

---

### [2025-08-06 13:00] CLEANUP: REMOVED JSON BLOCK FROM MARKDOWN REPORT
**Description:**  
Removed the "Raw Geometry Data" JSON block from the Markdown report to align with the app's focus on human-readable output.

**Previous Behavior:**
- Markdown reports included a large JSON block containing raw geometry data
- This was added for transparency/debugging but conflicted with the goal of human-readable output
- JSON block made reports less clean and harder to read

**Changes Made:**
- Removed "Raw Geometry Data" section from Markdown report generation
- Eliminated `JSON.stringify(data, null, 2)` output from reports
- Kept the report footer with generation attribution

**Rationale:**
- Aligns with focus on human-readable Markdown output
- Supports Raven Calder's workflow requirements
- JSON export functionality was already removed, so including JSON in reports was inconsistent
- Users who need raw data can still access it through browser developer tools if needed

**Files Changed:**
- `index.html`: Modified `generateMarkdownReport()` function

---

### [2025-08-06 11:30] ENHANCEMENT: DUAL RELOCATION SUPPORT
**Description:**  
Enhanced relocation feature to relocate both Person A and Person B by default, with option to exclude Person B from relocation when needed.

**Previous Behavior:**
- Relocation only calculated relocated chart for Person A
- Person B remained at original birth location
- This was inconsistent with typical relationship astrology use cases

**New Behavior:**
1. **Default**: When relocation is enabled with Person B present, both people are relocated to the same location
2. **Optional**: Checkbox to "Exclude Person B from relocation" when only Person A should be relocated
3. **Data Structure**: Separate `relocation_a` and `relocation_b` fields in API output instead of single `relocation` field

**Technical Changes:**
- **Backend** (`astrology-mathbrain.js`):
  - Modified relocation calculation to handle both Person A and Person B
  - Added `excludePersonB` flag support from frontend
  - Updated data structure to return `relocation_a` and `relocation_b` separately
  - Updated `buildWMChart()` function signature and logic
  
- **Frontend** (`index.html`):
  - Added "Exclude Person B from relocation" checkbox in relocation section
  - Checkbox only visible when Person B is present and relocation is enabled
  - Updated form data collection to include `excludePersonB` flag
  - Enhanced Markdown report generation to show relocation scope and both relocated chart summaries
  - Added `updateRelocationPersonBOption()` function for proper UI state management

**Rationale:**
When doing relationship astrology with relocation, astrologers typically want to see how both people's charts change when they're both in the new location together. This reflects real-world scenarios where couples relocate together and want to understand the relationship dynamics in the new place.

---

### [2025-08-05 14:45] FEATURE: EX RELATIONSHIP OPTION
**Description:**  
Added "ex (no longer)" checkbox option for relationship context to handle past relationships in diagnostic work.

**New Feature:**
- Added checkbox labeled "Ex (no longer active relationship)" below relationship type selection
- Checkbox can be applied to any relationship type (partner, friend, family)
- Status is captured in form data and passed through API
- Ex relationship status is prominently displayed in Markdown reports

**UI Changes:**
1. **Relationship Context Section**:
   - Added bordered separator with checkbox below relationship type radio buttons
   - Used red accent color for the checkbox to distinguish from other form elements
   - Clear labeling: "Ex (no longer active relationship)"

2. **Form Data Collection**:
   - Added `is_ex_relationship` boolean field to context object
   - Integrated with existing form validation and data flow

3. **Markdown Report Enhancement**:
   - Added "Relationship Context" section when Person B is present
   - Shows relationship type with ex status appended: "partner (ex - no longer active)"
   - Includes intimacy tier if specified

**Backend Integration:**
- Updated `buildWMChart()` function to include `is_ex_relationship` field
- Maintains backward compatibility with existing data structures
- Field defaults to `false` when not specified

**Strategic Value:**
- Enables more nuanced diagnostic work for past relationships
- Provides important context for Poetic Brain interpretation
- Acknowledges that relationship dynamics can persist beyond active involvement
- Supports comprehensive relational analysis across different relationship states

---

### [2025-08-05 12:30] FIX: COMPOSITE/SYNASTRY GEOMETRY LABELING
**Description:**  
Added proper geometry block labeling for composite and synastry data in Markdown reports.

**Issue:**  
User received feedback that "No composite or synastry geometry block was labeled in the markdown" when using synastry mode. The Markdown generation was including the data but without clear geometric section headers.

**Resolution:**
1. **Enhanced Synastry Section**:
   - Changed "Major Synastry Aspects" to "Synastry Geometry" with "Major Synastry Aspects" as subsection
   - Provides clearer geometric context labeling

2. **Added Composite Support**:
   - Added "Composite Chart Summary" section for composite chart planetary positions
   - Added "Composite Geometry" section with "Composite Chart Aspects" subsection
   - Ensures composite mode has proper geometric block labeling

3. **Improved Structure**:
   - Clear hierarchical labeling: ## Geometry Type → ### Specific Data
   - Consistent formatting across natal, synastry, and composite modes
   - Better semantic organization for geometric data interpretation

**Expected Impact:**
- Resolves missing geometry block labeling issue
- Provides clearer structure for Poetic Brain interpretation
- Maintains consistency across all context modes

---

### [2025-08-04 16:15] USER INTERFACE SIMPLIFICATION
**Description:**  
Removed JSON download option from user-facing interface, keeping only Markdown download for reports.

**Rationale:**  
Per Raven Calder's workflow, the JSON output is primarily for internal API debugging and development purposes. End users of the Woven Map system work with human-readable Markdown reports that translate the geometric data into accessible language. Removing JSON from the user interface simplifies the experience and aligns with the Math Brain/Poetic Brain separation of concerns.

**Changes Made:**
1. **HTML Interface**:
   - Removed JSON download button from report output section
   - Cleaned up button layout to maintain visual balance

2. **JavaScript**:
   - Removed `downloadJsonBtn` from global variable declarations
   - Removed JSON download event handler and initialization
   - Kept `latestResultData` storage intact for potential future debugging needs

3. **Preserved Functionality**:
   - Markdown download remains fully functional
   - Copy Data button still provides clipboard access to raw data if needed
   - Internal JSON handling preserved for API communication

**Strategic Benefits:**
- Simplified user experience focused on practical output format
- Maintains clear separation between Math Brain (geometry) and Poetic Brain (interpretation)
- Reduces potential confusion about which format to use
- Aligns interface with actual user workflow patterns

---

### [2025-08-03 16:50] FIX
**Symptom:**  
The application returned a 404 "Not Found" error when clicking the "Compute Astrological Geometry" button.

**Suspected Cause:**  
The front-end JavaScript in `index.html` was making a `fetch` request directly to the internal Netlify function path (`/.netlify/functions/astrology-mathbrain`) instead of using the public-facing API endpoint defined in `netlify.toml`.

**How Diagnosed:**  
Compared the `fetch` URL in `index.html` with the `[[redirects]]` rules in `netlify.toml`. The request was not using the `/api/astrology-mathbrain` path that Netlify was configured to listen for.

**Resolution:**  
Modified the `fetch` call in `index.html` to use the correct endpoint: `/api/astrology-mathbrain`. This allows Netlify to properly handle the request and redirect it to the serverless function, resolving the 404 error.

---

### [2025-08-04 10:00] BREAK
**Symptom:**  
The application loads as a blank white page. The HTML content is present, but no styling is applied, and the layout is broken.

**Suspected Cause:**  
The Tailwind CSS build process was failing, so the `dist/output.css` file was not being generated. Without this file, the browser cannot apply any of the application's styles.

**How Diagnosed:**  
1.  Checked the browser's developer console, which showed a 404 error for the file `dist/output.css`.
2.  Verified that the `dist/` directory was missing from the project structure.
3.  Ran the build script (`npm run build:css`) and observed errors indicating that the `tailwindcss` command was not found.
4.  Investigated `node_modules/.bin` and confirmed the `tailwindcss` executable was missing, pointing to an incomplete or corrupted `npm install`.

**Resolution:**  
The issue was traced to a problem with the local `node_modules` installation. The following steps were taken to resolve it:
1.  Deleted the `node_modules` directory and the `package-lock.json` file to ensure a clean slate.
2.  Ran `npm install` to reinstall all dependencies according to `package.json`.
3.  After a successful installation, the `tailwindcss` executable was present in `node_modules/.bin`.
4.  Ran `npm run build:css`, which successfully generated the `dist/output.css` file.
5.  Restarted the Netlify dev server (`netlify dev`). The app now loads correctly with all styles applied.

---

### [2025-08-03 16:45] FIX
**Symptom:**  
The "Compute Astrological Geometry" button did not trigger any action when clicked. No error messages were displayed, and no API requests were made.

**Suspected Cause:**  
Multiple issues were identified:
1. Global variables for UI elements were not properly initialized before event handlers were set up
2. Form data collection was not properly handling all required fields
3. The error handling was not displaying detailed information about missing fields

**How Diagnosed:**  
1. Added console logging to the `generateReport()` and `collectFormData()` functions
2. Examined server-side validation in `astrology-mathbrain.js` to identify required fields
3. Tested form submission and observed 400 error: "Missing required fields for Person A"

**Resolution:**  
1. Enhanced the `collectFormData()` function to ensure all required fields are properly collected
2. Added additional validation in the `generateReport()` function to check for missing fields
3. Improved the `parseCoordinates()` function with better error handling and logging
4. Updated the DOMContentLoaded event listener to properly initialize all global variables
5. Added console logging throughout to better diagnose future issues

---

### [2025-08-03 20:30] CRITICAL FIX
**Symptom:**  
The "Compute Astrological Geometry" button produced a 400 error: "Missing required fields for Person A (Missing: year, month, day, hour, minute, latitude, longitude, zodiac_type, timezone)". All required fields were missing from the API request.

**Root Cause:**  
The `collectFormData()` function was fundamentally broken. The validation logic was checking for missing fields but not throwing errors when they were found, allowing invalid data to be sent to the API. The function also had poor error handling and insufficient logging.

**How Diagnosed:**  
1. Browser console showed the exact error message with missing fields
2. Added extensive logging to trace the form data collection process
3. Confirmed that the NotebookLM analysis was correct - this was a persistent data formatting mismatch between frontend and backend

**Resolution:**  
1. **Completely rewrote `collectFormData()` function** with:
   - Extensive logging at each step
   - Proper validation with error throwing for missing fields
   - Better handling of empty or undefined values
   - Step-by-step parsing of date, time, and coordinate data

2. **Implemented Strategic Recommendations from NotebookLM Analysis**:
   - Created `config.js` to centralize API endpoint configuration
   - Added environment validation scripts to `package.json`
   - Updated `.env.example` with better documentation
   - Implemented contract-first development approach

3. **Enhanced Error Handling**:
   - Used centralized configuration for API endpoints
   - Added timeout configuration for API requests
   - Improved error messages with detailed debugging information

**Key Insight:**  
The NotebookLM analysis was spot-on. This issue represented exactly what it identified as "Mistake 1: Persistent Data Formatting Mismatches and Missing Required Fields." The fix required implementing all four strategic recommendations to prevent recurrence.

---

### [2025-08-03 20:45] STRATEGIC IMPLEMENTATION
**Description:**  
Implemented comprehensive fixes based on NotebookLM analysis to address recurring technical challenges:

1. **Contract-First Development**:
   - Created `config.js` with centralized configuration
   - Standardized API endpoint management
   - Added validation configuration matching backend requirements

2. **Environment Variable Management**:
   - Enhanced `.env.example` with clear documentation
   - Added `check-env` script to validate environment setup
   - Created `start:local` script that validates environment before starting

3. **Improved Debugging and Logging**:
   - Added `WovenMapConfig.debugLog()` for consistent logging
   - Implemented extensive form data validation logging
   - Added step-by-step debugging in `collectFormData()`

4. **Automated Environment Checks**:
   - Modified npm scripts to validate `.env` file existence
   - Added CSS build step to local development workflow
   - Implemented graceful error handling for missing configuration

**Expected Impact:**  
These changes should eliminate the four recurring issues identified in the NotebookLM analysis:
- Data formatting mismatches between frontend and backend
- API endpoint routing issues
- Missing environment variable configuration
- Improper HTTP method usage

**Next Steps:**  
- Test the application to confirm the "Compute Astrological Geometry" button now works
- Monitor for any remaining validation issues
- Consider implementing client-side schema validation library for additional robustness

---

### [2025-08-04] PLANNED DEVELOPMENT
**Description:**  
Planning to restructure site architecture to create a proper homepage with navigation to multiple sections:

**Planned Changes:**
1. **Homepage Creation**:
   - Move current Woven Map app from root (`index.html`) to subdirectory (`/app/` or `/woven-map/`)
   - Create new professional homepage at root
   - Add navigation and branding for personal/professional presence

2. **Content Expansion**:
   - Add section for upcoming book project
   - Create space for additional tools and resources
   - Implement proper site navigation and structure

3. **Site Architecture**:
   - Homepage: Landing page with overview and navigation
   - `/woven-map/`: Current astrological geometry app
   - `/book/`: Information about planned publication
   - Future: Additional tools and content areas

**Strategic Benefits:**
- Separates specific tool from general web presence
- Provides foundation for content expansion
- More professional presentation for visitors
- Scalable structure for future projects

**Technical Considerations:**
- Update Netlify redirects and deployment configuration
- Ensure all existing bookmarks/links remain functional
- Maintain API endpoints and function routing
- Consider SEO implications of URL structure changes

**Status:** Planning phase - not yet implemented
## 2025-09-05

- Cutover to WM-Chart-1.2. The engine now emits a single payload that includes:
  - Seismograph (v1.0) numbers computed inside the new build (magnitude/valence unchanged).
  - Balance (v1.1) rebalanced valence and SFD (v1.2) support differential, emitted alongside when computed.
- Provenance metadata added to every response:
  - `meta.calibration_boundary: "2025-09-05"`
  - `meta.engine_versions: { seismograph: "v1.0", balance: "v1.1", sfd: "v1.2" }`
  - `meta.reconstructed: true` when requested dates precede the boundary (no historical archives; earlier dates are on‑the‑fly recomputations).
- No external archive exists prior to this date; a single engine and payload format replaces legacy outputs.

### Appendix shape migration
- JSON Appendix now emits an array of per-day entries using nested channels:
  - `seismograph: { magnitude, valence, version }`
  - optional `balance: { magnitude, valence, version }`
  - optional `sfd: { sfd, sPlus, sMinus, version }`
- Flat keys (e.g., `balance`, `sfd`, `splus`, `sminus`) are deprecated in appendix output from this date; UI normalizer accepts both during a short bridge.
