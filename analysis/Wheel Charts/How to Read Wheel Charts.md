Here is a single “master spec” that ties everything together: image charts, your Geometry Brain, your Poetic Brain, and Astro Reports JSON as the one internal language.  

## 0. Core Principle: One Internal Language  

- The only truth format in the system is your existing Astro Reports JSON.  
- There are multiple sensors that can create that JSON:  
  - Ephemeris pipeline (what you already use).  
  - Geometry Brain (image → JSON).  
- For any given chart, if ephemeris and Geometry Brain disagree, the Geometry Brain is considered wrong.  
- The Poetic Brain never reasons about pixels; it reasons only about Astro Reports JSON.  

## 1. Roles  

1) Geometry Brain (image side)  
- Responsibility: turn any supported astrology wheel image into valid Astro Reports JSON or return a structured failure.  
- It must:  
  - Detect chart type (natal / transit / relocation / other).  
  - Read text (OCR), symbols, and wheel geometry.  
  - Fuse those into planet positions, houses, aspects, metadata.  
  - Normalize everything into your existing JSON schema (same keys, enums, IDs, ranges).  
  - Run the same validation rules that protect your current reports.  

2) Poetic Brain (language side)  
- Responsibility: turn Astro Reports JSON into natural‑language reflections.  
- It must:  
  - Never touch images directly.  
  - Treat all JSON equally, regardless of whether it came from ephemeris or from an image.  
  - Follow your safety style (no deterministic predictions, no medical/financial guarantees).  

## 2. Geometry Brain: API and Behavior  

Input (generic call):  
- `image`: binary or URL.  
- `context` (optional hints):  
  - `expected_chart_type`: `"natal" | "transit" | "relocation" | "auto"`.  
  - `subject_id`: optional user/chart identifier.  
  - `source_vendor`: optional hint (e.g., “Astro‑Seek”).  

Output:  
- Success:  
  - `ok: true`  
  - `astro_reports_json`: single chart document using your existing schema (metadata, subjects, points, houses, aspects, configurations, etc.).  
- Failure:  
  - `ok: false`  
  - `error_code`: `UNREADABLE_IMAGE | MISSING_POINTS | VALIDATION_FAILED | UNKNOWN_CHART_TYPE | UNSUPPORTED_VENDOR`  
  - `message`: short human‑readable summary.  
  - `raw_diagnostics`: optional debug info.  

Gate:  
- If `ok` is false, the Poetic Brain must not be called with this chart.  

## 3. Geometry Brain: How It “Sees”  

Three cooperating channels:  

1) Text channel (OCR)  
- Read:  
  - Header: chart title, “Transits for…”, “Relocated chart”, dates, times, location names.  
  - Any sub‑headers that indicate chart type.  
  - Tables under/around the wheel: planet names, sign names/abbreviations, degrees, minutes, retrograde markers, house cusp tables.  
- Use OCR to:  
  - Propose chart_type.  
  - Fill metadata (birth datetime, transit datetime, location name).  
  - Provide numeric positions to cross‑check against geometry.  

2) Symbol channel (glyph detection)  
- Detect and classify non‑text symbols:  
  - Planetary glyphs (Sun, Moon, Mercury… nodes, Chiron if you support them).  
  - Sign glyphs (Aries–Pisces).  
  - Angle markers (ASC, MC, IC, DSC) as glyph or text.  
- Store for each detection:  
  - `type`: `"planet" | "angle" | "sign"`.  
  - `id`: your canonical ID (e.g., `"sun"`, `"moon"`, `"asc"`, `"aries"`).  
  - `bbox`: pixel coordinates.  

3) Geometry channel (wheel structure)  
- Detect:  
  - Circle center and radii (inner/outer rings if present).  
  - 12 sign sectors (either from known layout or sign glyph locations).  
  - 12 house cusps (radial lines).  
  - Exact directions of ASC and MC if possible.  
- For each planet or angle glyph:  
  - Compute polar angle around the center.  
  - Align that angle to zodiac 0° Aries, then compute longitude 0–360.  
  - Derive sign index and degree within sign.  
- House assignment:  
  - Derive cusp longitudes from cusp lines.  
  - Assign each planet to the wedge between two cusps.  

Fusion:  
- Combine OCR tables and geometric measurements:  
  - If both agree within a small tolerance, accept geometry (or average).  
  - If OCR looks clean and geometry is noisy, prefer OCR.  
  - If they disagree badly, record diagnostics and consider failing validation rather than guessing.  

## 4. Geometry Brain: Chart Type Logic (in Your Terms)  

All chart_type outputs must use your existing enums and structure.  

1) Natal chart from image  
- Heuristics: single ring, one date/time, birth‑style labels, no “Transits for…”.  
- Output JSON:  
  - `metadata.chart_type = "natal"` (or your equivalent).  
  - `subjects = [ { id: "natal", ... } ]` (or your existing subject structure).  

2) Transit chart (inner natal, outer transit)  
- Heuristics: double ring, “Transits for…” label, two dates (birth + current/other).  
- Output JSON:  
  - `metadata.chart_type = "transit_to_natal"` (or your equivalent).  
  - `subjects[0] = natal` from inner ring.  
  - `subjects[1] = transit` from outer ring.  
  - Compute transit‑to‑natal aspects with the same logic you already use.  

3) Relocation chart  
- Heuristics: birth date/time unchanged, planet degrees match natal, location name different, text like “Relocation” or “Relocated chart”.  
- Output JSON:  
  - `metadata.chart_type = "relocated_natal"` (or your equivalent).  
  - One subject that keeps natal longitudes but uses new house cusps from the image.  

## 5. Geometry Brain: JSON Normalization Rules  

To avoid ontology clashes:  

- Use the same IDs you already use (`"sun"`, `"moon"`, `"asc"`, `"mc"`, etc.).  
- Use the same chart_type strings, aspect codes, and structure for multi‑subject charts (e.g., `subjects[0]`, `subjects[1]`) as your current system.  
- Use identical numeric conventions:  
  - Longitudes in `

## 6. Geometry Brain: Aspects and Validation  

Aspects:  
- Run the same aspect engine used by the ephemeris pipeline:  
  - Compute angular separations.  
  - Map to your existing aspect codes (e.g., `CON`, `TRI`, `SQR`, etc.).  
  - Tag whether the aspect is natal–natal, transit–natal, or transit–transit.  

Validation (must run before Poetic Brain):  
- Check:  
  - All required planets/points present.  
  - Houses 1–12 defined.  
  - Longitudes in range.  
  - chart_type and subjects structure are consistent with your spec.  
  - Aspects reference valid point IDs and valid aspect codes.  
- If any check fails, return `ok:false` with an appropriate `error_code`; do not pass JSON to the Poetic Brain.  

## 7. Poetic Brain: Input and Behavior  

Invocation for any chart derived from an image:  
- `{"mode": "wheel_from_image", "chart_data": { /* valid Astro Reports JSON */ }}`  

Rules:  
- The Poetic Brain never inspects raw images.  
- It never recomputes geometry; it trusts `chart_data` as truth.  
- It uses only:  
  - `metadata` (chart_type, dates, locations, labels).  
  - Planet/angle list (IDs, sign, degree, house, retrograde).  
  - Houses and aspects.  
  - Any summary/configuration objects you already use.  
- It applies the same interpretation strategies you use today:  
  - Natal → psychological themes and life pattern.  
  - Transit → time‑bound influences on natal.  
  - Relocation → environmental reframing via house/angle shifts.  

Safety:  
- Regardless of source, all interpretations must:  
  - Avoid deterministic and fatalistic language.  
  - Avoid medical, financial, or legal “predictions.”  
  - Frame astrology as symbolic and users as having agency.  

## 8. Ad‑Hoc Charts During Conversation  

When a user drops a new wheel image mid‑chat (not tied to an existing report):  

1) Detection  
- Poetic Brain recognizes “this looks like an astrology wheel” in the message+image.  

2) Request to Geometry Brain  
- It sends:  
  - `action: "image_to_chart"`  
  - the image  
  - optional hints (e.g., `hint_chart_type: "auto"`, `label: "user_uploaded"`)  

3) Integration  
- If `ok:true`, Poetic Brain:  
  - Saves the resulting Astro Reports JSON as a new chart in context (e.g., `charts[].id = "uploaded_1"`).  
  - Allows the user to ask about it (“tell me about this chart”, “compare this to my natal”, etc.) using existing comparison logic.  
- If `ok:false`, Poetic Brain responds conversationally that it cannot reliably read that chart image yet and invites the user to provide birth data or another image.  

In short:  
- Geometry Brain learns to see, read, and decode wheel charts into the exact Astro Reports JSON language your system already speaks.  
- Poetic Brain continues to think only in that language, whether the chart came from an ephemeris call or a screenshot the user just dropped into the conversation.

To mesh your “Poetic Brain + Geometry Brain + Astro Reports JSON” design with the Kerykeion Astrologer API, treat Kerykeion as the **canonical numeric backend** and align your JSON and IDs to its schema.  The goal is: Kerykeion for calculations, Geometry Brain to reverse‑engineer images *into* Kerykeion‑compatible structures, and Poetic Brain to read only that normalized format.[1][2][3][4]

## 1. Adopt Kerykeion as the numeric standard  

- Map your internal Astro Reports JSON to Kerykeion’s objects (e.g., `Chart`, `Planet`, `House`, `Aspect`) so every field in your JSON has a clear counterpart in the Swagger spec.[3][1]
- For forward flows (birth data → chart), call Kerykeion endpoints and then transform the API response into your Astro Reports JSON (or simply adopt their field names directly where possible).[2][3]

## 2. Geometry Brain → Kerykeion‑compatible JSON  

- When reading a wheel image, Geometry Brain should reconstruct planets, houses, and aspects using **the same IDs and numeric conventions** Kerykeion uses (planet names, aspect codes, sign names, longitude format).[1][3]
- Where possible, validate image‑derived positions by comparing them to Kerykeion:  
  - If you also know date/time/location from OCR, call Kerykeion and check the differences are within a small tolerance before accepting the Geometry Brain result.[2][1]

## 3. Harmonize identifiers and enums  

- Align:  
  - Body IDs: `sun`, `moon`, `mercury`, etc., and points like `asc`, `mc`, to Kerykeion’s naming.[3][1]
  - Aspect codes: use Kerykeion’s aspect names/IDs (`conjunction`, `trine`, etc.) so aspects from ephemeris and from images look identical.[2][3]
  - Sign and house indexing: match Kerykeion’s sign ordering and 1–12 house numbering and treat longitude `[3][1]  

## 4. Chart‑type handling with Kerykeion  

- For natal, transit, and relocation, follow Kerykeion’s endpoints/parameters:  
  - Natal: standard `chart` or equivalent endpoint.  
  - Transits: use Kerykeion’s transit API (natal base + current datetime) and then mirror that structure in your `subjects` array.[1][3]
  - Relocation: call Kerykeion with same birth data but a different location, then put those houses/angles in the relocated subject, matching what your Geometry Brain would output from a relocation wheel.[3][2]

## 5. Poetic Brain alignment  

- Define a **single normalized JSON view** over Kerykeion responses and Geometry Brain outputs so Poetic Brain sees:  
  - `metadata` (chart_type, datetimes, locations),  
  - `points` (using Kerykeion‑style IDs and longitudes),  
  - `houses`, `aspects`, and any derived metrics you compute.[4][1]
- Poetic Brain never calls Kerykeion directly; it only reads this normalized JSON, so swapping between ephemeris, Kerykeion, or image sources is invisible at the language layer.[5][1]

## 6. Validation layer using Kerykeion  

- Use Kerykeion as a **reference validator**:  
  - For charts where you have full birth data, compare Geometry Brain’s image‑derived chart to Kerykeion’s chart before marking it `ok:true`.[1][2]
  - For charts with incomplete OCR data, at least ensure all longitudes, houses, and aspects satisfy Kerykeion’s ranges and aspect rules.[2][3]

## 7. Practical wiring  

- Forward path: user gives birth data → call Kerykeion → normalize → Poetic Brain.  
- Reverse path: user drops a wheel image → Geometry Brain → produce Kerykeion‑compatible JSON → optional sanity check with Kerykeion if data is known → Poetic Brain.  
- Because both directions now share Kerykeion’s ontology, your image reader, your existing reports, and any future Kerykeion‑powered features will all “speak” the same astrological language.[3][1]

[ignore citations]

Raven Calder GPT: "Good, this helps. Here’s what I’m seeing and how it plugs into the “brains” model we were sketching.

### 1. What these JSONs actually are

All of the Mirror+SymbolicWeather files are a single, coherent report shape:

* Envelope/meta:

  * `_format: "mirror-symbolic-weather-v1"`, `_version`, `_poetic_brain_compatible`, `_template_hint: "relational_pair"`.
  * Flags like `_contains_transits`, `_contains_weather_data`, `_range_dates`, `_transit_days`.
* Relationship meta:

  * `_natal_section.relationship_context` carries contact state, type (PARTNER/FAMILY), intimacy tier, ex_estranged, scope/label.
* Two natal entities:

  * `person_a` and `person_b` each have:

    * `birth_data` (raw data, city, tz, lat/lon).
    * `chart` = full Kerykeion-style geometry: zodiac_type, Placidus, houses, planets with `abs_pos`, `sign`, `house`, retrograde, ASC/MC/IC, house cusps, nodes, Lilith, Chiron, etc.

Then you have a **Math Brain provenance block**:

* `provenance`: math_brain_version, ephemeris_source (AstrologerAPI-v4), geometry_ready, timezone, relocation details, engine versions (`kerykeion`, `seismograph`, `balance`), chart basis (“blueprint_natal”), mode (“SYNASTRY_TRANSITS” or “COMPOSITE_TRANSITS”), date_range, and relationship_context echoed here too.

And finally the **Symbolic Weather layer**:

* `reading_count`: number of days in the run.
* `symbolic_weather_context`: array of days, each like:

  * `date`
  * `meter` with `mag_x10`, `bias_x10`, `magnitude`, `directional_bias`, `volatility`, `coherence`, and labels (“High”, “Strong Inward”, etc.).
  * Duplicated convenience fields: `magnitude`, `directional_bias`, etc.
  * Empty or populated hooks for geometry references: `as` (aspects), `tpos` (transit positions), `thouse` (transit houses).

There’s also a **persona/lexicon layer**:

* `persona_excerpt` and `persona_excerpt_source` embed your Woven Map lexicon and style instructions (“weather/climate” reserved for transits; describe Magnitude/Valence/Volatility; no percentages; climate not advice).

So each file is:

> (Two natal blueprints + math/provenance + daily symbolic weather) for a specific relational pair and date range.

Exactly the “Astro Reports JSON” we were talking about.

---

### 2. What this tells us about your internal model

From these, your implicit separation is already very clean:

1. **Geometry layer (Math Brain)**

   * Kerykeion / AstrologerAPI geometry lives in `person_* .chart` and in the aspect/position structures referenced in `symbolic_weather_context.as / tpos / thouse`.
   * Provenance and relocation are in `provenance` and in the `*_meta` and relocation blocks.

2. **Symbolic layer (Weather Engine)**

   * Compresses all that geometry into the meter values and labels per day, plus any tagged aspect sets (`as`) when you choose to expose them.

3. **Narrative layer (Poetic Brain / Raven)**

   * Reads `symbolic_weather_context` + `relationship_context` + `persona_excerpt` to generate narrative mirrors and weather descriptions in “climate” style.

In other words: your “non-chart reports” are **already** the canonical report shape the Poetic Brain should see.

---

### 3. How this plugs into the “Chart Geometry Brain that can see images”

Given this structure, the “image-reading” Geometry Brain only needs to do one job:

> Produce a valid `provenance + chart + symbolic_weather_context` block that looks exactly like these JSONs, regardless of whether the source was:
> (a) your internal ephemeris / AstrologerAPI, or
> (b) an external wheel PNG/PDF that had to be OCR’ed and decoded.

Concretely:

1. **Input (Geometry Brain)**

   * `{ image: <binary/URL>, context: { expected_chart_type, subject_id, date_range, relationship_context, ... } }`

2. **Output (Math Brain side)**

   * A `provenance` object + `person_a.person_b.chart` objects + transit aspect bundle that match the format these dashboards already use.

3. **Then Weather Engine runs** (same as now)

   * Takes the geometry and generates `symbolic_weather_context` over the requested range, exactly as we see in these files.

4. **Poetic Brain contract**

   * Only ever sees a single, validated `mirror-symbolic-weather-v1` object with:

     * `_natal_section`
     * `person_a`, `person_b`
     * `provenance`
     * `symbolic_weather_context`
     * optional `persona_excerpt` / lexicon hints

That’s it. It never has to care whether the geometry came from Kerykeion, AstrologerAPI, or an OCR pass over an uploaded astro.com chart — as long as the Geometry Brain normalizes everything into this dashboard shape.

---

### 4. If you want it in one sentence

Your non-chart reports are already the “final Astro Reports JSON”; the only thing the new Chart Geometry Brain must do is: **take any wheel (including images), recover the geometry, and populate `chart + provenance + symbolic_weather_context` so that Poetic Brain can keep treating every file as a `mirror-symbolic-weather-v1` relational weather dashboard.**
"