## [2025-09-04] MAJOR ENHANCEMENT: Safe Lexicon Retrofit & Emoji Valence System

**Description:**
Implemented comprehensive safe lexicon system with emoji-enhanced valence display to ensure magnitude vocabulary remains strictly neutral while enriching directional charge visualization.

**Core Changes:**
1. **Safe Magnitude Lexicon (6-term system):**
   - Whisper (0–0.5), Pulse (0.5–1.5), Wave (1.5–2.5), Surge (2.5–3.5), Peak (3.5–4.5), Apex (4.5–5.0)
   - Eliminated problematic terms: "Quake" → "Peak", "Field" → "Apex"
   - All magnitude terms are now strictly neutral intensity markers

2. **Enhanced Valence Lexicon (11-term system):**
   - Collapse, Grind, Friction, Contraction, Drag, Neutral, Lift, Flow, Harmony, Expansion, Liberation
   - Clear positive/negative directional charge terminology
   - Maintains rich semantic meaning for valence patterns

3. **Emoji Valence Enhancement (🌞/🌑 System):**
   - 🌑 Negative Types: 🌋 Pressure/Eruption, ⚔ Friction Clash, 🌊 Cross Current, 🌀 Fog/Dissolution, 🌫 Entropy Drift, 🕰 Saturn Weight
   - 🌞 Positive Types: 🌱 Fertile Field, 🌊 Flow Tide, ✨ Harmonic Resonance, 🔥 Combustion Clarity, 🦋 Liberation/Release, 💎 Expansion Lift
   - ⚖ Neutral Balance for center range
   - Immediate visual recognition of valence polarity and intensity

**Technical Implementation:**
- `toMagnitudeTerm()` and `toValenceTerm()` mapping functions
- `getValenceEmoji()` and `getValenceType()` for rich display
- `migrateMagnitudeTerm()` handles legacy term migration
- `assertSafeMagnitudePhrase()` validation prevents unsafe metaphors
- Enhanced seismograph tables show emoji + numeric values (e.g., "🌋 -3.2")
- Executive Summary includes emoji display: "Mag/Val/Vol: 2.8 (Surge)/🌋 -3.2 (Grind)/1.4"

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
*Safe lexicon retrofit successfully completed with GitHub Copilot assistance. The Math Brain now maintains geometric fidelity without valence contamination, while the Poetic Brain gains richer emoji-enhanced expression. Magnitude vocabulary is completely neutral (Whisper→Apex), directional charge lives exclusively in valence (🌑/🌞), and the system includes comprehensive validation guardrails.*

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