Perfect. I’ll generate the **full, final versions** of the four documents you’ll keep at the root of the repo:

* `ARCHITECTURE_OVERVIEW.md`
* `WOVENWEB_CODEMAP.md`
* `DEVELOPER_GUIDE.md`
* `API_REFERENCE.md` (the canonical spec)

I’ll write them cleanly, concisely, modernized for the **Pure Next.js architecture**, and cross-consistent so they can live together without contradiction.

Below are the **four complete Markdown files**, ready for drop-in use.

---

# **📄 ARCHITECTURE_OVERVIEW.md**

```markdown
# WovenWebApp – Architecture Overview  
**Pure Next.js – Math Brain v2 – November 2025**

This document is the canonical, high-level description of the WovenWeb architecture.  
It replaces all previous architectural notes, refactor plans, and “hybrid beast” documentation.

---

# 1. Architectural Philosophy

## Pure Next.js Standard
The entire application—frontend UI, backend logic, API routes, and export generation—runs inside the Next.js App Router.

**No Netlify Functions.  
No static index.html.  
No multi-port dev environment.**

The framework is the single source of truth.

---

# 2. System Spine (Core Flow)

```

Route Handler
↓
Transit Engine (Date Loop + Retry Path)
↓
FIELD Layer (raw geometry)
↓
MAP Layer (Seismograph + metrics)
↓
Interpretation Layer (themes, relational hooks)
↓
VOICE Layer (markdown reading)
↓
Unified Output (ACC-compliant export)

```

---

# 3. Entry Point (Authoritative)

**File:** `app/api/astrology-mathbrain/route.ts`

This is the only backend ingress into the Math Brain system.  
All POST requests use this Route Handler.  
All exports are shaped here.

---

# 4. Backend Modules

### Transit Engine  
**File:** `src/math-brain/api-client.js`  
Handles transit fetch loop and fallback recovery.

### Seismograph  
**File:** `src/math-brain/seismograph-engine.js`  
Generates magnitude, directional bias, volatility.

### Interpretation Layer  
**File:** `src/math-brain/interpretation/`  
Extracts themes, narrative structures, relational dynamics.

### VOICE Layer (Markdown/Narrative)  
**File:** `src/math-brain/voice/`  
Transforms MAP + Interpretation output into markdown text.

### Main Math Brain Orchestrator  
**File:** `src/math_brain/main.js`

---

# 5. Unified Output (ACC Spec v2)

All Math Brain results must contain:

- `daily_entries`  
- `mirror_data`  
- `aggregate_scores`  
- `field_map`  
- `transits` (legacy alias, optional)

---

# 6. Expected Flow

1. User requests a chart  
2. Transit engine fetches per-day geometry  
3. FIELD → MAP → Interpretation run sequentially  
4. VOICE generates markdown  
5. Unified output returned to frontend  
6. Exports rendered on client

---

# 7. Key Invariants

- Route Handler owns the schema  
- daily_entries must never be missing  
- Seismograph helpers must always be provided  
- Transit loop and fallback must stay in sync  
- mirror_data must be defined (summary uses latest day)

---

# 8. What This Replaces

This overview supersedes:
- old Next.js + Netlify hybrid diagrams  
- transitional refactor notes  
- “hybrid beast” architecture  
- prior session summaries  
- static HTML documentation  

This is the authoritative description going forward.

```

---

# **📄 WOVENWEB_CODEMAP.md**

````markdown
# WovenWeb Codemap & Guardrails  
**Authoritative System Flow – Pure Next.js Edition**

This codemap defines not just *the shape* of the system, but the *laws* that keep it stable.

Every guardrail below prevents a known regression.

---

# 1. Entry Point (Keystone)

### Route Handler  
**File:** `app/api/astrology-mathbrain/route.ts`

All computation, validation, and export flows originate here.

**Guardrails:**
- Codemap traces must never reference test routes  
- Output schema defined here is the canonical one  
- VOICE layer depends on this shape

---

# 2. Transit Engine (High-Risk Surface)

**File:** `src/math-brain/api-client.js`

### Guardrail A – Transit Loop  
(≈ Line 264)  
Must iterate exactly one result per requested day.

### Guardrail B – Fallback Path  
(≈ Lines 287–310)  
Loop and fallback must remain synchronized.  
If one changes, the other must be updated.

### Guardrail C – Retry Helper  
`apiCallWithRetry` lives inside this file.

---

# 3. FIELD Layer

- Holds raw geometry for each day  
- No interpretation  
- Directly feeds MAP layer

**Guardrail:**  
FIELD array length = number of days requested.  
Never allow silent drops.

---

# 4. MAP Layer (Seismograph + Metrics)

### Seismograph Engine  
**File:** `src/math-brain/seismograph-engine.js`

**Guardrail:**  
`calculateSeismograph` requires `options.helpers`.  
Missing helpers = silent zeroing or crashes.

---

# 5. Interpretation Layer

### Purpose  
Extracts themes, symbolic weather, strain/support patterns.

### Guardrail:  
`daily_entries` must exist before Interpretation runs.  
This is required by the ACC Spec.

---

# 6. VOICE Layer (Narrative Builder)

### Purpose  
Turns MAP + Interpretation structures into Markdown.

**Guardrail:**  
VOICE never defines structure—only transforms it.  
Final shape must be owned by Route Handler.

---

# 7. Unified Output (Summary Builder)

### mirror_data  
**Bug Fix Reference:**  
Summary must use:

```ts
const latest = daily_entries.at(-1) || null;
mirror_data: latest?.mirror_data ?? null
````

### daily_entries

Must be present in final output:

```ts
daily_entries: dailyEntries
```

### Guardrail:

If daily_entries is missing → Route Handler refuses to make a report.

---

# 8. Pure Next.js Constraints

* No Netlify Functions
* No second server (no port 8888)
* No static root pages shadowing routes
* No hybrid architecture components
* All computation lives inside `/app` or `/src`

---

# 9. Permanent Regression Traps to Avoid

* Missing Seismograph helpers
* Out-of-sync transit loop/fallback
* Undefined mirror_data
* Absent daily_entries
* Shadowed routes
* Dual-architecture drift

These must never return.

---

# 10. Diagram Anchor Labels

Use these labels in your architecture diagram:

* **Route Handler (Pure Next.js): app/api/astrology-mathbrain/route.ts**
* **Transit Loop + Fallback Sync – api-client.js (264–310)**
* **Seismograph Requires Helpers – seismograph-engine.js**
* **ACC Spec: daily_entries Required**
* **mirror_data Summary – uses latest daily entry**
* **Pure Next.js Standard – One Architecture Only**

````

---

# **📄 DEVELOPER_GUIDE.md**

```markdown
# Developer Guide – WovenWebApp (Pure Next.js)

This guide replaces all previous onboarding documents, session summaries, TODO lists, and refactor notes.

---

# 1. Running the App

```bash
npm install
npm run dev
````

Local server runs exclusively on:

**[http://localhost:3000](http://localhost:3000)**

No Netlify proxy ports.
No hybrid environment.

---

# 2. Running Math Brain Locally

### POST Endpoint

```
POST /api/astrology-mathbrain
```

Example:

```bash
curl -X POST http://localhost:3000/api/astrology-mathbrain \
  -H "Content-Type: application/json" \
  -d '{ "subject": {...}, "settings": {...} }'
```

Should return:

* daily_entries
* mirror_data
* field_map
* aggregate_scores
* markdown (if requested)

---

# 3. Validating Output (Sanity Check)

### Step 1 — Check daily_entries exists

```json
{
  "daily_entries": [...]
}
```

### Step 2 — Check mirror_data summary

```json
"mirror_data": { ... }
```

### Step 3 — Check markdown renders

Route handler only builds markdown when `daily_entries.length > 0`.

---

# 4. Tests

### Unit Tests

```bash
npm run test
```

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

---

# 5. Common Failure Modes

### 1. `ReferenceError: mirrorData is not defined`

Fix: Summary must use `latestDay.mirror_data`.

### 2. Report not generating

Cause: daily_entries missing.
Fix: Add `daily_entries: dailyEntries` to finalOutput.

### 3. Seismograph returning zeros

Cause: Missing helpers.
Fix: Pass helpers explicitly.

### 4. Transits wrong count

Cause: Loop and fallback out of sync.
Fix: Update both paths together.

---

# 6. Deployment Notes

* Use the official Netlify Next.js plugin
* No Netlify Functions
* Disable auto-deploys during large refactors
* Only deploy from main when local POST checks pass

---

# 7. Coding Standards

* All inputs validated with Zod
* All backend logic typed (TS phase ongoing)
* Route Handler is canonical API shape
* Mirror summary uses latest day
* ACC Spec enforced on exports

---

# 8. Developer Tools

* VS Code Simple Browser for live preview
* Playwright for E2E flows
* Vitest for fast unit tests
* GitHub Actions for CI

---

# 9. Folder Structure Summary

```
app/
  api/
    astrology-mathbrain/route.ts   (entry point)
  math-brain/                      (frontend UI)

src/
  math-brain/api-client.js         (transits)
  math-brain/seismograph-engine.js
  math-brain/interpretation/
  math-brain/voice/
  math_brain/main.js               (summary builder)
```

This is the modern, Pure-Next.js-aligned structure.

````

---

# **📄 API_REFERENCE.md**

```markdown
# API Reference – Math Brain (Pure Next.js)

This is the authoritative schema and payload reference for the WovenWebApp Math Brain API.

---

# 1. Endpoint

````

POST /api/astrology-mathbrain

````

Consumes JSON.  
Produces JSON + optional markdown.

---

# 2. Request Body

```json
{
  "subject": {
    "name": "string",
    "year": 1973,
    "month": 1,
    "day": 24,
    "hour": 17,
    "minute": 55,
    "timezone": "America/Chicago",
    "latitude": 30.16,
    "longitude": -85.66
  },
  "settings": {
    "start_date": "YYYY-MM-DD",
    "days": 7,
    "zodiac_type": "Tropic" 
  }
}
````

Validated with Zod.

---

# 3. Successful Response Structure (ACC Spec v2)

```json
{
  "daily_entries": [...],
  "mirror_data": {...},
  "aggregate_scores": {...},
  "field_map": {...},
  "transits": [...],      
  "markdown": "string"
}
```

---

# 4. Field Definitions

### `daily_entries`

Array of per-day records containing:

* raw transit geometry
* seismograph metrics
* interpretation notes
* mirror_data (per-day)

### `mirror_data` (summary)

Derived from the last daily entry.

### `aggregate_scores`

Seismograph + MAP rollups.

### `field_map`

Raw FIELD output.

### `markdown`

Narrative VOICE layer reading.

---

# 5. Example Response

```json
{
  "daily_entries": [
    {
      "date": "2025-03-20",
      "transits": [...],
      "seismograph": {...},
      "mirror_data": {...},
      "themes": [...]
    }
  ],
  "mirror_data": { ... },
  "aggregate_scores": { ... },
  "field_map": { ... },
  "markdown": "# Your Reading\n..."
}
```

---

# 6. Error Responses

### Missing daily_entries

```
400 – MissingRequiredField
```

### Mirror summary undefined

```
500 – SummaryBuilderError
```

### Invalid subject

```
400 – ZodValidationError
```

---

# 7. Official Guarantees

* `daily_entries` always returned if input is valid
* Summary `mirror_data` always derived from last day
* Markdown always generated when daily_entries > 0
* Transit count always equals requested days

These invariants must hold for correctness.

```

---

WovenWebApp – Narrative Layer IntegrationPure Next.js – Math Brain v2 – November 2025This document is the canonical bridge between the Math Brain (data pipeline) and the Poetic Brain (narrative engine). It works in conjunction with the ARCHITECTURE_OVERVIEW.md and API_REFERENCE.md.Its purpose is to authoritatively define the function of the VOICE layer.1. The "Two Brains" PhilosophyThe WovenWeb system consists of two distinct, decoupled "brains":The Math Brain (The System Spine)Code: app/api/astrology-mathbrain/route.ts and src/math-brain/Function: A deterministic, local data pipeline. It ingests user data and generates a structured, objective JSON object that adheres to the ACC Spec v2 (see API_REFERENCE.md). It does not generate narrative.The Poetic Brain (The Narrator, "Raven")Code: This is not a code module, but a knowledge corpus (i.e., the RavenCalder_Corpus/).Function: A generative, subjective narrator. It ingests the structured JSON from the Math Brain and produces a human-readable, narrative markdown reading. It does not perform calculations.This document defines the integration that connects them.2. Authoritative Definition: The VOICE LayerThe VOICE layer, referenced in the ARCHITECTURE_OVERVIEW.md, is the key to this integration.File: src/math-brain/voice/The VOICE layer is NOT the Poetic Brain.The VOICE layer is a server-side API client and pre-processor. Its sole responsibility is to orchestrate the "handoff" from the Math Brain to the Poetic Brain (the LLM).Its process is as follows:Receives: The final, structured JSON data (e.g., daily_entries, aggregate_scores) from the Math Brain's main orchestrator.Selects: The appropriate "System Instruction" from the RavenCalder_Corpus based on the requested report type (e.g., Poetic_Codex_Card..., Advice Ladder Tree...).Serializes: The structured JSON data into a clean, LLM-readable format for the "User Prompt."Executes: A fetch call to the external Generative AI API.Returns: The raw markdown string from the API's response.3. The "Handoff" Flow (Pure Next.js Standard)To maintain the "Pure Next.js" standard and protect API keys, the entire handoff occurs on the server inside a single API route. The client never calls the LLM directly.A user POSTs a request to app/api/astrology-mathbrain/route.ts.The Route Handler runs the entire Math Brain pipeline (FIELD -> MAP -> Interpretation).A final, structured JSON object (ACC Spec v2) is generated locally.The Route Handler holds this JSON object in memory.The Route Handler calls the VOICE layer, passing it the JSON data.The VOICE layer (running on the server) executes a fetch call to the external Generative AI API.The LLM (Poetic Brain) receives the RavenCalder_Corpus as its System Instruction and the Math Brain JSON as its User Prompt.The LLM returns a narrative markdown string.The VOICE layer returns this string to the Route Handler.The Route Handler adds this string to the final object: finalOutput.markdown = narrativeString;.The complete response (ACC Spec v2 JSON + narrative markdown) is sent to the client in a single transaction.4. Canonical Endpoint (Poetic Brain)The "Poetic Brain" is not a local server. It is an external, third-party generative model.Service: Google Generative AI APIModel: gemini-2.5-flash-preview-09-2025Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContentGuardrail: The API key (process.env.GEMINI_API_KEY) for this service must be a server-side environment variable. It is only accessed by the VOICE layer and is never exposed to the client.5. What This ReplacesThis integration model renders the following concepts obsolete:All "Poetic Brain" logic as a separate, local server (e.g., a port 8888 or Python service).Any client-side logic for generating narratives.All ambiguity about the VOICE layer's purpose. The VOICE layer is the bridge, not the destination.
```
