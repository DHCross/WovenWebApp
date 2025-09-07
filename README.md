# **Woven Map Report Generator (WovenWebApp)**

This is a web-based application designed to generate a detailed astrological report for a primary individual (Person A), with an optional second individual (Person B) for synastry and relationship analysis. It uses a static HTML and JavaScript front-end that communicates with a Netlify serverless function to fetch data from an external astrology API. When a Person B is provided, you can toggle the **Include Synastry Analysis** checkbox to append synastry aspects and house overlays to the generated report.

## **Key Features**

### **Safe Lexicon System**
- **Neutral Magnitude Terms**: Whisper, Pulse, Wave, Surge, Peak, Apex (strictly intensity-only, no negative bias)
- **Rich Valence Terms**: Collapse, Grind, Friction, Contraction, Drag, Neutral, Lift, Flow, Harmony, Expansion, Liberation
- **Emoji Valence Display**: 🌑 Negative (🌋⚔🌊🌀🌫🕰) and 🌞 Positive (🌱🔥✨🦋💎) visual indicators
- **Schema v1.2**: Machine-readable JSON includes both numeric and term values

### **Seismograph Mode**
- Maps symbolic field currents over time with Magnitude/Valence/Volatility metrics
- Enhanced emoji display shows valence polarity at a glance (e.g., "🌋 -3.2")
- Queue Analysis & Filters for pattern recognition
- CSV export capability for further analysis

### **Balance Meter Mode**
- Standalone triple-channel reports optimized for health data correlation
- Focus on Support-Friction Differential (SFD) and Balance Channel patterns
- Daily verdicts: "stabilizers prevail", "cuts", or "mixed" for health tracking
- Designed for comparison with heart rate variability, sleep quality, mood data
- Generates WM-Chart-1.2 compliant reports with methodology section

API Page: https://rapidapi.com/gbattaglia/api/astrologer

## **Core Technology**

*   **Front-End:** Plain HTML, JavaScript, and Tailwind CSS.
*   **Back-End:** A single serverless function (`astrology-mathbrain.js`) deployed on Netlify.
*   **External API:** [Astrologer API on RapidAPI](https://rapidapi.com/tg4-solutions-tg4-solutions-default/api/astrologer)

## **Documentation Structure**

### **Core Documentation**
- **README.md** (this file) - Main application overview and features
- **MAINTENANCE_GUIDE.md** - Operational guidelines and best practices
- **CHANGELOG.md** - Change history and development timeline
- **Lessons Learned for Developer.md** - Development insights and architecture
- **MATH_BRAIN_COMPLIANCE.md** - Technical compliance requirements
- **copilot_fix_recovery.md** - Emergency recovery procedures

### **User & Technical Guides**
- **QUEUE_ANALYSIS_FILTERS_GUIDE.md** - User guide for seismograph features
- **SEISMOGRAPH_GUIDE.md** - Technical seismograph implementation
- **REPORT_REQUIREMENTS.md** - Report specification requirements
- **API_REFERENCE.md** - Focused API reference for endpoints we use
- **API_INTEGRATION_GUIDE.md** - Integration patterns and examples
- **GIT_MERGE_CONFLICT_BEST_PRACTICES.md** - Git workflow template

### **Implementation Guides**
- **BACKEND_DEVELOPMENT_GUIDE.md** - Comprehensive backend development guide
  - Consolidates improvements, debugging, testing, and production readiness
  - Includes transit debugging procedures and performance optimization
  - Error handling matrix and monitoring strategies

### **Planning & Theoretical**
- **docs/planning/HOMEPAGE_PLANNING.md** - Website restructuring plans
- **docs/planning/PRECISION_MYSTICISM_NOTES.md** - Theoretical foundations

## **Appendix: Payload Contract (WM-Chart-1.2)**

The Balance Meter system implements a triple-channel architecture that extends the base seismograph with sophisticated pattern analysis:

### **Channel Structure**

**Seismograph v1.0** (Base Layer):
- `magnitude`: Field intensity (0-10) with enhanced normalization
- `valence`: Net tension (-5 to +5) with asymmetric amplification  
- `volatility`: Charge dispersion with weighted planetary factors

**Balance Channel v1.1** (Rebalanced Layer):
- `balance.valence`: Gentler valence scoring with Moon-Saturn soft aspect handling
- `balance.magnitude`: Inherits from seismograph for consistency
- `balance.version`: "v1.1" for tracking

**Support-Friction Differential v1.2** (Advanced Layer):
- `sfd.sfd`: Final differential (S+ − S−) clamped to -5/+5 range
- `sfd.sPlus`: Support channel (benefic aspects, stabilizers)
- `sfd.sMinus`: Counter channel (friction patterns, destabilizers) 
- `sfd.version`: "v1.2" for tracking

### **JSON Schema (WM-Chart-1.2)**

```json
{
  "date": "2025-09-05",
  "seismograph": {
    "magnitude": 5.0,
    "valence": -5.0,
    "volatility": 4.2,
    "version": "v1.0"
  },
  "balance": {
    "magnitude": 5.0,
    "valence": -3.0,
    "version": "v1.1"
  },
  "sfd": {
    "sfd": -1.5,
    "sPlus": 1.2,
    "sMinus": 2.7,
    "version": "v1.2"
  },
  "meta": {
    "calibration_boundary": "2025-09-05",
    "engine_versions": {
      "seismograph": "v1.0",
      "balance": "v1.1", 
      "sfd": "v1.2"
    },
    "reconstructed": false
  }
}
```

### **UI Display Mapping**

**Reports**: Triple channel line format: `Quake X.X · val ±Y.Y · bal ±Z.Z · [verdict] (SFD ±A.A; S+ B.B/S− C.C)`

**CSV Export**: Stable column names preserve data integrity:
- `mag_v1_0`, `val_v1_0`, `vol` (seismograph)
- `bal_val_v1_1` (Balance Channel)  
- `sfd_v1_2`, `splus_v1_2`, `sminus_v1_2` (SFD components)
- `calibration_boundary`, `reconstructed`, `engine_versions`

**Mobile Cards**: Condensed triple channel summary with verdict interpretation

**JSON Appendix**: Nested object structure maintains version tracking and backward compatibility with flat legacy keys

## **Development**

### **Prerequisites**

*   [Node.js](https://nodejs.org/) and npm
*   A [Netlify](https://www.netlify.com/) account for deployment
*   A RapidAPI account to get an Astrologer API key

### **Setup**

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory and add your RapidAPI key:
    ```
    VITE_ASTROLOGER_API_KEY=your_rapidapi_key_here
    ```
    *Note: This key is used by the Netlify function during local development and needs to be set in the Netlify UI for production.*

### **Running Locally**

Use the Netlify CLI to run the site with the serverless function:

```bash
npm run dev
```

This command, defined in `package.json`, starts a local development server and watches for changes.

### **Building for Production**

To build the minified CSS for production, run:

```bash
npm run build:css
```

This script is automatically run by Netlify during the deployment process.

## **(Experimental) Health Auto Export Comparative Integration**

Math Brain can optionally ingest an Apple Health dataset exported via the iOS **Health Auto Export** app and correlate daily physiological / mood metrics with the Woven Map Seismograph (magnitude, valence, volatility, hooks). This powers comparative markdown reports and downstream Uncanny (falsifiability) scoring.

### Recommended Export (Best Case)
Use the Health Auto Export app:

1. Quick Export tab
2. Aggregation Interval: `days`
3. Aggregate Data: ON
4. Include metrics:
  * HRV (Heart Rate Variability)
  * Resting Heart Rate
  * Sleep Sessions
  * (Optional) State Of Mind / Mood (or supply the separate CSV – both work)

If you export raw (Aggregate OFF) the parser will still daily‑aggregate; the file is just larger.

### What The Parser Auto‑Detects (Schema Flexible)
Case‑insensitive, alias matching — no manual toggles needed:

| Concept | Accepted Keys / Heuristics |
|---------|----------------------------|
| HRV | `heartRateVariability`, contains `variability`, units `ms` |
| Resting HR | `restingHeartRate`, contains `rest` + `heart` |
| Sleep | `sleepSessions`, `sleep`, `sleepData` (start/end aggregated → hours on wake day) |
| Mood Valence | `stateOfMind` entries (`daily_mood`, `momentary_emotion`) averaged per calendar day |
| Date | Any ISO timestamp (timezone localized to America/Chicago unless specified) |

Unused streams (for now) are ignored: workouts, cycle tracking, ECG, heart notifications, symptoms. They can be included safely.

### Two Gotchas
* Keep timezone consistent with charting (Central / America/Chicago by default).
* If Seismograph Magnitude is statistically flat (near‑zero variance) the system automatically shifts primary comparison emphasis to Volatility.

### Output (When Comparative Mode Implemented)
Generates a markdown report containing:

* Range header and timezone
* Daily comparative table: physiological metrics + symbolic metrics + hooks
* Overlay charts (e.g., HRV ↔ Magnitude / Volatility; Sleep ↔ Volatility)
* Optional “Uncanny Window Audit” (rolling correlation windows; six‑factor scoring)

### Privacy & Handling
* Health JSON stays in the local browser session (no server round‑trip) unless you manually export a combined report.
* No third‑party analytics or storage.
* You control deletion (refresh / clear state).

### Philosophy Alignment
Mirror, not mandate: outputs are reflective pattern summaries, **not** medical advice or deterministic claims. When something does not resonate it is treated as Outside Symbolic Range (OSR) and excluded from narrative synthesis.

### Troubleshooting
| Issue | Likely Cause | Resolution |
|-------|--------------|-----------|
| Missing HRV column | Metric not selected in export | Re‑export with HRV enabled (Quick Export → Select Health Metrics) |
| All sleep values 0 | Sessions exported raw with unexpected keys | Ensure `sleepSessions` present or enable aggregation |
| Time shift (date off by one) | Timezone difference / UTC midnight crossover | Confirm device timezone & keep Central alignment |
| Mood not aggregated | Only momentary emotions exported | Enable daily mood or accept sparser alignment |

### Roadmap (Planned Enhancements)
* Inline canvas → PNG chart embedding
* Rolling Pearson correlation + rarity scoring
* Adjustable sync/break thresholds & window length
* Additional metric channels (HRV SDNN vs RMSSD detection, HRV trend slope, sleep efficiency)

> If a new key appears in your export that is not recognized, the parser can be extended with a single alias entry—no architectural change required.

---

## **External API: Astrologer API**

This project relies on the Astrologer API to perform all astrological calculations.

### **Authentication**

All requests to the Astrologer API must include the following headers:

* X-RapidAPI-Key: Your personal API key.  
* X-RapidAPI-Host: astrologer.p.rapidapi.com

The serverless function is responsible for adding these headers to the outgoing request. The API key is stored as an environment variable in Netlify.

### **Primary Endpoint Used**

The application primarily interacts with the natal-aspects-data endpoint to get the core chart and aspect information for each person.

* **Method:** POST  
* **URL:** https://astrologer.p.rapidapi.com/api/v4/natal-aspects-data

#### **Request Body Structure**

The API expects a JSON object containing a subject key. The subject object must include the following fields:

{  
  "subject": {  
    "year": 1973,  
    "month": 7,  
    "day": 24,  
    "hour": 14,  
    "minute": 30,  
    "latitude": 40.0167,  
    "longitude": \-75.3167,  
    "timezone": "America/New\_York",  
    "city": "Bryn Mawr",  
    "nation": "US",  
    "name": "DH Cross",  
    "zodiac\_type": "Tropic"  
  }
}

> **Note**: The `nation` field must be a 2-letter country code following the ISO 3166-1 alpha-2 standard (e.g., `US`).

#### **Example JavaScript fetch Request**

This is how the front-end calls the Netlify function, which then calls the Astrologer API.

const subjectData \= {  
    year: 1973,  
    month: 7,  
    day: 24,  
    hour: 14,
    minute: 30,
    latitude: 40.0167,
    longitude: \-75.3167,
    timezone: "America/New\_York",  
    city: "Bryn Mawr",  
    nation: "US",  
    name: "DH Cross",  
    zodiac\_type": "Tropic"  
};

const getChartDataFromApi = async (subject) => {
    const response = await fetch('/api/astrology-mathbrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject })
    });

    if (\!response.ok) {  
        const errorData \= await response.json();  
        throw new Error(errorData.error || 'An unknown server error occurred.');  
    }

    return response.json();  
};

// Usage:  
// const chartData \= await getChartDataFromApi(subjectData);

#### **Success Response Structure**

A successful response from the API is a JSON object containing the status, the full data object for the subject, and a list of astrological aspects.

{  
  "status": "success",  
  "data": {  
    "subject": {  
      // ... extensive astrological data for the subject  
    }  
  },  
  "aspects": \[  
    {  
      "p1\_name": "Sun",  
      "p2\_name": "Moon",  
      "aspect": "trine",  
      "orbit": 2.5  
      // ... other aspect properties  
    }  
  \]  
}

## **Setup and Deployment**

This project is deployed on Netlify and linked to a GitHub repository.

### **Environment Variables**

To run this project, you must set the following environment variable in the Netlify site settings (Site settings \> Build & deploy \> Environment):

* **Key:** RAPIDAPI\_KEY  
* **Value:** Your secret key from RapidAPI for the Astrologer API.

### **Local Development Instructions**

To run this project locally using Netlify CLI:

1. Install [Node.js](https://nodejs.org/) (recommended version: 18.x or higher).
2. Install Netlify CLI (if not already installed):
   ```
   npm install -g netlify-cli
   ```
3. Create a `.env` file in the root of the project (optional) or set the environment variable in your shell:
   ```
   RAPIDAPI_KEY=your_rapidapi_key_here
   ```
4. Start the local dev server:
   ```
   netlify dev
   ```

This will proxy requests to your serverless function and allow full front-end + back-end testing in development mode.

### **File Structure**

* index.html: The main application file containing the UI and front-end JavaScript.  
* netlify/functions/astrology.js: The serverless function that securely calls the RapidAPI endpoint.  
* netlify.toml: The Netlify configuration file that specifies the functions directory.

### **Troubleshooting**

- **Relational drop-down hidden**: The relationship options only appear when both Person A and Person B fields are fully populated. Ensure each date is in `MM-DD-YYYY` format and each time is `HH:MM`. Invalid or missing data will keep the drop-down collapsed.
- **External API error**: This message indicates the serverless function could not reach the Astrologer API. Double‑check that the `RAPIDAPI_KEY` environment variable is defined in your Netlify site settings or a local `.env` file (copy `.env.example` to `.env`). After updating the variable, restart `netlify dev` (or redeploy) so the new environment is loaded.
## 🌀 Raven Calder Synastry Glossary (for Poetic Brain Compatibility)

| Term | Definition |
| --- | --- |
| Bidirectional Aspect | Each synastry aspect must be rendered from both A→B and B→A perspectives. Required for narrative reflection generation. |
| Echo Loop | A dyadic repeating cycle formed by one or more synastry aspects under 3° orb, creating a self-reinforcing emotional or behavioral dynamic. |
| REF (Relational Echo Field) | A macro structure triggered when two or more Echo Loops converge around a shared theme. Flagged as REF-[PolarityCode] (e.g. REF-F21). |
| Polarity Code | A unique identifier linked to a specific dynamic type (e.g. F21 = "Frictional Attraction & Wound Trigger"). These come from the internal Symbolic Spectrum Table (SST). |
| Orb | The difference in degrees between the two planetary positions in an aspect. For majors: ±3°; for minors: ±1°. Exact math matters. |
| Geometry-First Diagnostic Rule | A Raven Calder system rule: all interpretations derive from exact planetary angle math, not archetype or psychological projection. |
| Angle | The precise degree of angular separation between two planetary bodies. Required for Raven’s FIELD → MAP → VOICE processing. |
| FIELD | The raw astrological data layer: charts, transits, aspects, orbs, houses. |
| MAP | The interpreted structural pattern of dynamics, such as Echo Loops, house overlays, or activated geometry. |
| VOICE | The narrative synthesis layer that generates journal-style outputs, symbolic interpretation, or mirrored dialogue. |
| synastry_id_hash | Optional: a unique identifier per synastry aspect or pair, used for tracing and cross-referencing in logs or modular journal building. |
| Daily Overlay Tracking | Optional timestamping of synastry aspects that are exact or activated on specific dates (e.g. in a Five-Day Synastry Field report). |
| Tier-2 OSR Bridge | A symbolic overlay logic system that connects dynamic field movement (transits) to static relationship geometry. Used in daily or week-range diagnostic field mapping. |

## **GitHub Copilot Integration**

This repository includes comprehensive GitHub Copilot instructions to ensure smooth AI-assisted development:

- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - Complete guide for AI assistants working on this repository
- **`npm run verify-copilot`** - Automated verification of Copilot setup and configuration
- **Integrated Documentation** - All existing guides (MAINTENANCE_GUIDE.md, "Lessons Learned for Developer.md", etc.) are referenced in the Copilot instructions

For AI assistants: Always review the Copilot instructions before making changes to ensure adherence to established workflows, testing protocols, and documentation standards.

## **License**

This project is licensed under the [MIT License](LICENSE.txt).

# GitHub Copilot Instructions for WovenWebApp

## Project Overview

WovenWebApp is a web-based astrological chart analysis application that generates detailed reports for individuals and relationships. It consists of a static HTML/JavaScript frontend with Tailwind CSS and a Netlify serverless function backend that interfaces with the RapidAPI Astrologer API.

### Core Architecture
- **Frontend**: Plain HTML, JavaScript, Tailwind CSS
- **Backend**: Single Netlify serverless function (`astrology-mathbrain.js`)
- **External API**: [Astrologer API on RapidAPI](https://rapidapi.com/tg4-solutions-tg4-solutions-default/api/astrologer)
- **Deployment**: Netlify with environment variables for API keys

## Essential Documentation

Before making any changes, **always** review these key documents:

1. **[README.md](../README.md)** - Setup instructions, API integration details, troubleshooting
2. **[MAINTENANCE_GUIDE.md](../MAINTENANCE_GUIDE.md)** - Best practices, error handling, file organization
3. **[CHANGELOG.md](../CHANGELOG.md)** - Complete change history with AI assistant collaboration notes
4. **[Lessons Learned for Developer.md](../Lessons%20Learned%20for%20Developer.md)** - Critical insights about AI assistant context and IDE integration
5. **[copilot_fix_recovery.md](../copilot_fix_recovery.md)** - **Emergency recovery when AI assistants cause problems**
6. **[MATH_BRAIN_COMPLIANCE.md](../MATH_BRAIN_COMPLIANCE.md)** - Technical compliance requirements
7. **[API_INTEGRATION_GUIDE.md](../API_INTEGRATION_GUIDE.md)** - API integration specifications

## Development Workflow Guidelines

### 1. Environment Setup
```bash
# Always check environment first
npm run check-env

# For local development
npm run dev

# For production CSS build
npm run build:css
```

### 2. Code Changes Protocol

**Before Making Changes:**
- Review the CHANGELOG.md for recent updates and known issues
- Check MAINTENANCE_GUIDE.md for relevant best practices
- Verify API key configuration in .env.example
- Run `netlify dev` to test the current state

**When Making Changes:**
- Make minimal, surgical modifications
- Test changes locally with `netlify dev`
- Update relevant documentation if the change affects setup or usage
- Follow the existing code patterns and styling

### 3. Commit Message Standards

Use descriptive commit messages following the existing pattern in CHANGELOG.md:

```
[YYYY-MM-DD] TYPE: Brief description

Types: FIX, FEATURE, BREAK, CHANGE, UPDATE, CRITICAL FIX
```

Examples:
- `[2025-01-21] FIX: Resolve API validation error for invalid coordinates`
- `[2025-01-21] FEATURE: Add composite transit support`
- `[2025-01-21] UPDATE: Enhance error messages for better debugging`

### 4. Testing & Verification

**Required Testing Steps:**
1. **Local Function Testing**: Use `netlify dev` to test serverless functions
2. **API Integration**: Verify all API endpoints work with test data
3. **Error Handling**: Test with invalid inputs to verify error messages
4. **Environment Variables**: Ensure both development and production configs work
5. **CSS Build**: Run `npm run build:css` and verify styling

**Test Data Sources:**
- Use existing test files: `test-improvements.js`, `test-coords.js`
- Reference `FORM_DATA_EXAMPLE.md` for valid input formats
- Check `debug-api.html` and `debug-test.html` for debugging tools

### 5. Error Handling Best Practices

**From MAINTENANCE_GUIDE.md:**
- Always use environment variables for secrets (never commit API keys)
- Provide clear, user-friendly error messages
- Log detailed error information for debugging
- Validate all input data before API calls
- Handle network failures gracefully

**Common Issues & Solutions:**
- **"Server misconfiguration"**: Check RAPIDAPI_KEY environment variable
- **"Port already in use"**: Stop existing netlify dev processes
- **API errors**: Verify API key and request format
- **Styling issues**: Run `npm run build:css`

## AI Assistant Context Management

**Critical Insight from "Lessons Learned for Developer.md":**

Different AI assistant interfaces have different context views:
- **IDE Copilot**: Has live file system access, can be refreshed
- **Web Copilot**: Limited to uploaded/attached files, requires manual context updates

**Best Practices:**
- If an AI reports missing files that exist, it's a context sync issue
- Use VS Code for full-context AI assistance when possible
- Re-upload files to web interfaces after local changes
- Provide clear file paths when referencing code

## File Organization & Key Locations

### Core Application Files
- `index.html` - Main application UI and frontend logic
- `netlify/functions/astrology-mathbrain.js` - Serverless function
- `src/input.css` - Tailwind CSS source
- `dist/output.css` - Built CSS (auto-generated)

### Configuration Files
- `.env.example` - Environment variable template
- `netlify.toml` - Netlify configuration
- `package.json` - Dependencies and scripts
- `tailwind.config.js` - Tailwind CSS configuration

### Documentation (Always Keep Updated)
- `README.md` - Primary documentation
- `MAINTENANCE_GUIDE.md` - Best practices guide
- `CHANGELOG.md` - Change history
- All other `.md` files contain important context

## Branch Protection & Merge Guidelines

### Agent Permissions
- AI agents should work on feature branches
- Main branch requires human review before merging
- Assign Jules or repository owner for final verification
- Use clear branch names: `feature/description` or `fix/issue-number`

### Conflict Resolution
1. **Manual Review Required**: For conflicts in core files (`index.html`, `astrology-mathbrain.js`)
2. **Documentation Conflicts**: Merge both perspectives with clear attribution
3. **Configuration Conflicts**: Always defer to production-tested configurations
4. **Use Established Patterns**: Follow existing code style and error handling patterns

### Merge Checklist
- [ ] All tests pass locally (`netlify dev` works)
- [ ] No API keys or secrets committed
- [ ] CHANGELOG.md updated with changes
- [ ] Documentation updated if needed
- [ ] CSS built for production if styles changed (`npm run build:css`)
- [ ] Human reviewer assigned

## Continuous Improvement

### Documentation Updates
- Update this file when development patterns change
- Add new lessons to "Lessons Learned for Developer.md"
- Keep MAINTENANCE_GUIDE.md current with new best practices
- Document any new edge cases or solutions

### Code Quality Standards
- Follow existing error handling patterns
- Use descriptive variable names matching current codebase
- Maintain consistency with established file organization
- Preserve the FIELD → MAP → VOICE architectural principles

## Emergency Contacts & Escalation

**For Critical Issues:**
- Repository Owner: Jules (DHCross)
- Production Deployment: Netlify dashboard
- API Issues: Check RapidAPI status and key validity
- Build Issues: Verify Node.js version and dependencies

**Escalation Triggers:**
- Breaking changes to main functionality
- API integration failures
- Security concerns (exposed keys, etc.)
- Major architectural changes

---

## Quick Reference Commands

```bash
# Environment check
npm run check-env

# Local development
npm run dev

# CSS production build
npm run build:css

# Test environment variables
echo $RAPIDAPI_KEY

# Kill stuck processes (if port in use)
pkill -f netlify
```

**Remember**: Always review existing documentation before making changes, test thoroughly with `netlify dev`, and maintain the high documentation standards established in this repository.
### Migration note (2025‑09‑05)

As of 2025‑09‑05 the Seismograph runs inside WM‑Chart‑1.2; prior external “logs” do not exist. Any earlier dates are reconstructed, not historical.

### Appendix shape migration (WM‑Chart‑1.2)
- Payload adopts nested channels per day: 
  - `seismograph: { magnitude, valence, version: 'v1.0' }`
  - optional `balance: { magnitude, valence, version: 'v1.1' }`
  - optional `sfd: { sfd, sPlus, sMinus, version: 'v1.2' }`
- Provenance is explicit in every entry: `meta.calibration_boundary`, `meta.engine_versions`, `meta.reconstructed`.
- Flat keys (e.g., `balance`, `sfd`, `splus`, `sminus`) are deprecated; a short bridge remains via UI normalizer, but consumers should prefer nested.
- CSV export column map (when present): `mag_v1_0, val_v1_0, bal_val_v1_1, sfd_v1_2, splus_v1_2, sminus_v1_2, calibration_boundary, reconstructed, engine_versions`.
