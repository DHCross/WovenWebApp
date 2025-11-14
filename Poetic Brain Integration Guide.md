D# **📄 POETIC_BRAIN_INTEGRATION.md**

**(Fifth canonical document — completing the architecture set)**

Below is the final version, clean, formatted, and consistent with the Pure Next.js standard.

---

# ```markdown

# Poetic Brain Integration – WovenWeb Narrative Architecture

**Pure Next.js – Math Brain v2 – November 2025**

This document defines the **canonical bridge** between:

* **Math Brain** (deterministic data pipeline)
* **Poetic Brain / Raven** (generative narrative engine)

It works alongside:

* `ARCHITECTURE_OVERVIEW.md`
* `WOVENWEB_CODEMAP.md`
* `DEVELOPER_GUIDE.md`
* `API_REFERENCE.md`

This file defines, with precision, the role of the **VOICE layer** and the integration path between structured data and narrative output.

---

# 1. System Philosophy: The Two-Brain Model

The WovenWeb architecture contains **two distinct cognitive systems**:

---

## 1.1 Math Brain (Deterministic System Spine)

**Location:**

* `app/api/astrology-mathbrain/route.ts`
* `src/math-brain/*`

**Function:**
Math Brain performs **all deterministic computation**:

* chart math
* transit geometry
* seismograph metrics
* theme extraction
* mirror_data summary
* daily_entries structure

It generates a structured JSON object adhering to **ACC Spec v2** (defined in `API_REFERENCE.md`).

**Math Brain does *not* generate narrative.**

---

## 1.2 Poetic Brain (Generative Narrative Engine — “Raven”)

**Location:**
Not a code module.
It is a **knowledge corpus**, such as:

* `RavenCalder_Corpus/`
* System instruction prompts
* Narrative templates
* Symbolic mapping structures

**Function:**
Takes Math Brain’s structured JSON and produces **long-form narrative markdown**.

**Poetic Brain does *not* perform calculations.**

---

# 2. Authoritative Definition of the VOICE Layer

The VOICE Layer is the **bridge** between the two brains.

**Location:**
`src/math-brain/voice/`

**It is *not* the Poetic Brain.**
It’s the **server-side orchestrator** of the handoff.

---

## 2.1 Responsibilities of the VOICE Layer

1. **Receiving**
   Accepts the final structured JSON from Math Brain:

   * daily_entries
   * mirror_data
   * aggregate_scores
   * field_map

2. **Selecting**
   Chooses the correct Poetic Brain system instruction from the RavenCalder Corpus
   (ex: *Poetic_Codex_Card*, *Advice Ladder Tree*, *Weather Map Narrative*, etc.).

3. **Serializing**
   Converts the Math Brain JSON → a clean LLM-readable “User Prompt.”

4. **Executing**
   Performs a **server-side fetch** to a generative AI model.

5. **Returning**
   VOICE returns the raw markdown string to the Route Handler.

VOICE never shapes or mutates the Math Brain data.
It only transports it into narrative space.

---

# 3. Integration Flow (Authoritative, Pure Next.js Standard)

This is the definitive lifecycle:

```
Client → Route Handler → Math Brain → Unified Output JSON
                                 ↓
                             VOICE Layer
                                 ↓
                    External Poetic Brain (LLM)
                                 ↓
                     Narrative Markdown Returned
                                 ↓
           Route Handler merges markdown into finalOutput
                                 ↓
                          Client receives JSON+MD
```

### Full sequence:

1. A client POSTs to:
   `app/api/astrology-mathbrain/route.ts`

2. Route Handler runs the entire Math Brain pipeline:

   * FIELD → MAP → Interpretation
   * final structured JSON created in memory

3. Route Handler invokes VOICE:

   ```ts
   const narrative = await buildVoiceLayerResponse(finalOutput);
   ```

4. VOICE layer:

   * loads LLM system instruction
   * serializes Math Brain JSON
   * calls the LLM externally
   * returns markdown

5. Route Handler adds:

   ```ts
   finalOutput.markdown = narrative;
   ```

6. Client receives:

   * full structured JSON
   * final narrative markdown
   * all in a single transaction

---

# 4. Canonical External Model (Poetic Brain)

Poetic Brain is an **external LLM**, not a local subsystem.

### Service

**Google Generative AI**

### Model

`gemini-2.5-flash-preview-09-2025`

### Endpoint

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent
```

### Guardrail

API key is **server-only**, accessed exclusively by the VOICE layer:

```
process.env.GEMINI_API_KEY
```

It is never exposed to the client.

---

# 5. Integration Contract: Math Brain → Poetic Brain

### Math Brain guarantees:

* `daily_entries` array
* `mirror_data` summary
* `aggregate_scores`
* `field_map`
* ACC Spec v2 compliant structure

### Poetic Brain expects:

* a consistent JSON schema
* a matching system instruction
* clean serialized input

### VOICE ensures:

* schema integrity before serialization
* correct Poetic Brain prompt selection
* external model call fully server-side
* no browser exposure

Math Brain and Poetic Brain do *not* talk directly.
VOICE is the enforced boundary.

---

# 6. What This Document Replaces

This integration model removes ambiguity from all previous Poetic Brain documents, including:

* `RAVEN_PROTOCOL_IMPLEMENTATION_COMPLETE.md`
* `Developers Notes/Poetic Brain/*`
* `POETIC_BRAIN_SESSION_FLOW_ANALYSIS.md`
* Any “dual-server Poetic Brain” proposals
* Any Netlify-function-dependent narrative systems
* All legacy LLM-integration prototypes

It supersedes all prior diagrams, flowcharts, and notes describing Poetic Brain as a separate service.

---

# 7. Summary (Authoritative)

**Math Brain = deterministic; runs locally; produces structured truth.**
**Poetic Brain = generative; external; produces narrative meaning.**
**VOICE Layer = the bridge.**
**Route Handler = the unified, Pure Next.js entry + assembly point.**

All narrative generation must follow the integration flow defined above.
All future evolution of RavenCalder, narrative styles, or prompt frameworks must respect this boundary.

```

---

# **This completes your five-file architecture set.**

Now you have:

- **ARCHITECTURE_OVERVIEW.md** — high-level system  
- **WOVENWEB_CODEMAP.md** — guardrails & flow  
- **DEVELOPER_GUIDE.md** — usage & workflows  
- **API_REFERENCE.md** — canonical schema  
- **POETIC_BRAIN_INTEGRATION.md** — narrative integration  

This is now a modern, unified, clean documentation spine.

