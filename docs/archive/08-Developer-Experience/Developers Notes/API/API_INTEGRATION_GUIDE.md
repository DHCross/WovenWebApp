# Woven Map — Revised Report Guide (Lessons Learned)
A note on API endpoints:

**Relationship Endpoints:**
- `/api/v4/synastry-chart` — for synastry (relationship) reports
- `/api/v4/composite-chart` — for composite (merged chart) reports

**Parameter Naming (Standardized):**
- Both endpoints use `first_subject` and `second_subject` for input payloads.


A single, practical guide that preserves the original architecture (Mirror Flow vs Balance Meter; FIELD → MAP → VOICE; Poetic Brain) while integrating operational lessons discovered during implementation and live testing: API resolver quirks, relocation brittleness, provenance needs, orb policy, formation/fallback rules, developer UX, and QA checks.


## FieldMap QA + Volatility Modernization Checklist (v5)

Use this checklist to regenerate or validate FieldMap JSON files under Balance Meter v5 with Raven Calder integration. It merges our translocation learnings with the volatility-computation update.

### 1) Header and Meta — update legacy markers

Replace any legacy values:

```jsonc
// legacy examples
"orbs_profile": "wm-spec-2025-09",
"math_brain_version": "mb-2025.10.18",
"timezone": "US/Central"
```

With v5 identifiers:

```jsonc
"orbs_profile": "wm-tight-2025-11-v5",
"balance_meter_version": "5.0",
"timezone": "America/Chicago" // IANA
```

### 2) Remove relational artifacts for solo runs

Eliminate fields produced by the dual-mirror exporter when validating a single-subject file:

- `relational_summary`
- Empty `people[].planets` arrays or ordinal-encoded `houses` payloads

### 3) Provenance (MANDATORY)

Every FieldMap must include a provenance block that records the translocation-aware engine:

```jsonc
"provenance": {
  "chart_basis": "felt_weather_relocated",
  "seismograph_chart": "relocated",
  "translocation_applied": true
}
```

If this is missing, the file likely came through a legacy path.

### 4) Coordinates and houses — human-readable

Use decimal degrees for lat/lon and proper house cusp arrays. Large integers for houses indicate legacy ordinal encoding and should be regenerated.

### 5) Aspect weights — v5 fixed curve

Verify the weight curve before aggregation:

| Aspect      | Weight |
| ----------- | ------ |
| Trine       | +0.40  |
| Sextile     | +0.25  |
| Square      | −0.50  |
| Opposition  | −0.45  |
| Conjunction | ±0.00  |

Moon +1° cap exception; outer→personal −1° cap. Ensure the absolute-orb cap check is applied: `if (Math.abs(orb) > cap) drop`.

### 6) Magnitude/Bias — normalized values

If raw fields appear as `mag_x10` / `bias_x10` at their theoretical limits (e.g., 50, −50), ensure the interpreter normalizes to human-scale outputs:

- Magnitude ≈ 0.0–5.0
- Directional Bias ≈ −5.0..+5.0

### 7) Volatility — computed downstream (v5 change)

- Remove or ignore any raw `volatility` in FieldMap
- Ensure aspects include `orb_deg` and total aspect count — inputs to interpreter
- Interpreter emits:

```jsonc
"interpreted_volatility": <0–5>,
"volatility_source": "computed_interpreter_v5"
```

### 8) Provenance ↔ Mirror handshake

Crosswalk for interpreter alignment:

| FieldMap key             | MirrorDirective key      | Relation |
| ------------------------ | ------------------------ | -------- |
| `mag_x10`                | `magnitude`              | ÷10      |
| `bias_x10`               | `directional_bias`       | ÷10      |
| `provenance.chart_basis` | `mirror_meta.chart_basis`| identical|
| (no `volatility`)        | `interpreted_volatility` | computed |

### 9) Schema/version tag

Footer should advertise v5 exporter:

```jsonc
"_meta": {
  "schema_version": "wm-fieldmap-v5",
  "exporter": "RavenCalder-5.0.1"
}
```

### 10) Validation run — expected hurricane benchmark

Run the local test against the hurricane date window. Expect approximately:

```
Magnitude: 4.0 ± 0.1
Directional Bias: −4.8 ± 0.2
interpreted_volatility: ≈ 0.0–0.5
provenance.translocation_applied: true
```

Bottom line: strip raw volatility, enforce v5 provenance/orbs, and let the interpreter compute volatility dynamically. This keeps Mirror Flow and FieldMap numerically and philosophically aligned with Felt‑Weather standards.


- Provenance is required. Every report must stamp house system, orbs_profile, relocation_mode, timezone_db_version, engine versions and math_brain_version.
- Relocation is valuable — and fragile. A_local/B_local reanchors houses but depends on reliable geocoding. We added fallbacks and an Angle Drift Cone for ambiguous inputs.
- Do not mix geocoding modes per run. Either coords-only or city-mode (with optional GeoNames) for the whole transit window.
- Orb policy enforced pre-weight. Conj/Opp 8°, Sq/Tr 7°, Sext 5°; Moon +1°; outer→personal −1°.
- Reports must render even when data is missing. Use explicit “no aspects received” placeholders and clearly-labeled simulated examples if needed.
- Non-programmer UX stays minimal. The backend/adaptor hides complexity but exposes clear UI hints and admin debug guidance.

---

## UI: Transit Overlay vs FIELD Relocation (copy + UX guidance)

Purpose
- Make the difference between "Transit Overlay" (visual-only hybrid) and "FIELD Relocate" (canonical, computational) explicit and discoverable. This prevents accidental use of hybrid geometry in Balance Meter and symbolic-weather calculations.

Primary UI affordances (recommended)
- Mode selector: two radio buttons (or segmented control) presented where the user picks how transits should be handled for this run.
  - Label: "Transit Mode"
  - Options:
    - "FIELD (Relocate natal + transits)" — recommended default for symbolic weather and Balance Meter calculations
    - "Transit Overlay (visual only)" — exploratory visualization; not used for computation
- Confirm dialog (only when switching to Overlay from FIELD): small non-blocking toast or inline help explaining consequences.

Exact copy to use (pasteable)

- Control label:
  "Transit Mode"

- FIELD option (primary)
  Title: "FIELD (Relocate natal + transits)"
  Short summary / tooltip:
  "Anchor both natal and transit geometry to the same observer location/time. Use this for canonical symbolic-weather and Balance Meter outputs — the system will request houses from the upstream API and treat them as canonical."

  Long tooltip (hover / info panel):
  "FIELD relocates the entire chart frame to the selected observer location and time, recomputing ASC/MC and house cusps for that location. This unified geometry is the canonical input used for all Woven Map calculations (Seismograph, Balance Meter, symbolic weather). Recommended."

- Overlay option (secondary)
  Title: "Transit Overlay (visual only)"
  Short summary / tooltip:
  "Show transits calculated for the current location overlaid on the natal houses anchored to birth coordinates. Exploratory only — not used for Balance Meter or symbolic-weather math."

  Long tooltip:
  "Transit Overlay superimposes the current sky over the natal chart. Natal houses remain anchored to the birth coordinates while transit angles reflect the new location. This creates a hybrid view useful for exploration, but it is not the canonical geometry for automated field calculations."

- Small confirmation message when choosing Overlay (non-blocking):
  "Heads up: Transit Overlay is visual-only. If you want canonical symbolic-weather results, choose FIELD (Relocate natal + transits)."

- Inline Help / footer note near export buttons:
  "Exports labeled 'FIELD Chart' use relocated geometry (recommended for calculations). Exports labeled 'Overlay' are hybrid views and are intended for visual exploration only."

Behavioral guidance for front-end engineers
- Default selection: FIELD (Relocate natal + transits) for any flow that produces seismograph, balance meter, or generated poetic readings. Only enable Transit Overlay as an explicit, secondary selection.
- Persistence: Persist user's last choice in session / local storage but always surface the tooltip for novice users.
- Visual indicator: Add a small badge to any exported FieldMap or report with the tag: "geometry: FIELD" or "geometry: OVERLAY" (this also appears in provenance).
- Accessibility: Tooltips and confirmation UI must be keyboard accessible and screen-reader friendly.

Sample UI toggle JSON (for telemetry)
```json
{
  "label": "Transit Mode",
  "selected": "FIELD",
  "options": [
    { "key": "FIELD", "title": "FIELD (Relocate natal + transits)", "recommended": true },
    { "key": "OVERLAY", "title": "Transit Overlay (visual only)", "recommended": false }
  ]
}
```

## Adapter contract: include_houses for FIELD
When the UI choice is FIELD (the default for Balance Meter / symbolic-weather), the adapter MUST request houses from the upstream provider.

- Use endpoints:
  - `POST /api/v4/birth-chart` (for natal + relocated natal houses)
  - `POST /api/v4/transit-chart` (for transit windows) OR `POST /api/v4/transit-aspects-data` followed by a houses request when needed
- Required request flags:
  - `include_houses: true`
  - `include_aspects: true` (for drivers)
- If the upstream response omits houses, the adapter must:
  1. Re-attempt a call to an endpoint that returns houses (e.g., birth-chart / transit-chart).
  2. If upstream cannot provide houses, compute houses locally (Swiss Ephemeris or equivalent) and stamp provenance.house_engine accordingly.

Provenance contract (fields required)
Every FIELD Chart export must contain a provenance block with, at minimum, these keys:

```json
{
  "schema": "BM-v5",
  "house_system": "Placidus",
  "orbs_profile": "wm-tight-2025-11-v5",
  "relocation_mode": "None|A_local|B_local|Both_local",
  "relocation_coords": { "lat": 40.0, "lng": -75.0 },
  "house_engine": "astrologer.p.rapidapi.com@v4.0|local-swiss-ephemeris@vX.Y|missing_upstream",
  "has_transits": true,
  "drivers_count": 4,
  "house_shift_summary": [{ "num": 1, "delta_deg": -2.12 }, ...] || "not_provided",
  "tz": "America/New_York",
  "math_brain_version": "vX.Y",
  "notes": ["upstream houses used", "include_houses flag set"]
}
```

- `relocation_mode`: set by comparing the supplied coords with natal coords and/or by computing house deltas (any non-trivial deltas => A_local).
- `house_engine`: set to `'astrologer.p.rapidapi.com@v4.0'` when upstream houses used; `'local-swiss-ephemeris@x.y'` when computed locally; `'missing_upstream'` when neither was available (caller must retry).
- `house_shift_summary`: optional but recommended. If present, must include all houses 1..12 and deltas.

Backward compatibility note
- When a stored FieldMap or legacy export does not include provenance or uses overlay geometry, mark it explicitly as `geometry: OVERLAY` in the metadata and recommend a re-run via FIELD mode for canonical recalculation.

## 1. Report Types — core distinction

**Mirror Flow (qualitative)**
- Purpose: Recognition & self-reflection.
- Inputs: Natal geometry (transits optional).
- Location sensitivity: Low — works without relocation.
- Output: Poetic FIELD → MAP → VOICE translations, polarity cards, actor/role composites.

**Balance Meter (quantitative)**
- Purpose: Pressure diagnostics (symbolic seismograph).
- Inputs: Natal + precise transit window + relocation option (recommended when event is place-specific).
- Location sensitivity: High — houses/angles relocate and change how transits land.
- Output: Time-series of Magnitude (0–5), Valence (−5..+5), Volatility (0–5); drivers[] per day; SFD/Balance Channel.

All reports must include a provenance header and a status block describing whether live transits were received or which fallback was used.

---

## 2. Provenance — mandatory fields

Include at minimum:
- house_system and house_system_name (e.g., “P”, “Placidus”)
- orbs_profile (e.g., “wm-spec-2025-09”)
- timezone_db_version (IANA/system)
- relocation_mode (None | A_local | B_local | midpoint — midpoint opt-in)
- relocation_coords when applicable
- math_brain_version, ephemeris_source, engine_versions (seismograph, balance, sfd)
- provenanceByDate (per-day endpoint/formation/attempts/aspect_count)

Why: audits, reproducibility, UI diagnostics, and debugging.

---

## Timezone Handling

### [2025-09-19] Coordinate-Based Timezone Lookup

**Requirement:**
- All Math Brain API requests must include a valid IANA timezone string (e.g., "America/New_York") for each subject.
- Use tz-lookup to resolve timezone from latitude/longitude; use luxon to compute DST-aware UTC offset.
- Do not rely on city/nation fields for timezone; GeoNames is optional and only used if explicitly provided by the user.

**Implementation:**
- Frontend collects coordinates and (optionally) explicit timezone or GeoNames username
- Backend resolves timezone string from coordinates before sending to API
- SubjectModel schema enforces timezone as a required field

---

## 3. Relocation rules & practical guidance

**What relocation does**

Reanchors ASC/MC and house cusps to a new geographic point. Planets keep natal longitudes; houses change where energies manifest.

**When to use**
- Localized events (storms, disasters, local gatherings)
- When the reading must represent “where life is happening now”
- Long-distance relationship analysis (prefer A_local/B_local rather than midpoint)

**Best practices & guards**
- Default dyad behavior: Relational Balance Meter defaults to A_local.
- Midpoint: only valid for Relational Balance with both persons present. Other combinations return `invalid_relocation_mode_for_report`.
- Angle Drift Cone: If time/place are ambiguous, compute multiple plausible house placements; if houses disagree, degrade to planet/sign language and flag angle ambiguity to user.
- UI copy: Prompt users for city + state (US) or coords; note that GeoNames stabilizes lookups.

---

## 4. Geocoding & formation rules (adapter contract)

**Fundamental rule:** Pick one formation per run and never mix modes across the same window.

**Formations**
- coords-only — send lat, lng (or lat/lon depending on provider), tz_str. Do not include city/nation.
- city-mode — send city, state (optional), nation and, when available, geonames_username. Do not send lat/lon/tz.

**Adapter behavior (recommended)**
- Prefer coords-only for transit subjects when coordinates exist.
- For natal endpoints:
  - If GEONAMES_USERNAME is configured and city/nation present → use city+GeoNames first.
  - Else fallback to coords-only.
  - Final fallback: city-only without GeoNames (some providers accept it).
- Lock formation for the entire window; record formation in provenanceByDate.

**Fallback sequence (per day)**
1. transit-aspects-data with chosen formation
2. If empty → transit-chart with same formation
3. If still empty → flip formation once (coords ↔ city-mode) and try again
4. If still empty → mark day as no aspects received and include simulated examples only when explicitly flagged

---

## 5. Orb policy (pre-weight filter)

Apply before weighting/scoring:
- Conjunction/Opposition: max 8°
- Square/Trine: max 7°
- Sextile: max 5°
- Moon rule: +1° when Moon is the pair member
- Outer→personal: −1° when Jupiter/Saturn/Uranus/Neptune/Pluto aspects Sun/Moon/Mercury/Venus/Mars

⚠️ **Critical Fix · Oct 2025** — Upstream returns negative orbs for applying aspects. Always compare against the cap using the absolute value:

```javascript
// ❌ Buggy (filtered out every applying aspect)
if (orb > effectiveCap) dropReason = 'OUT_OF_CAP';

// ✅ Fixed
if (Math.abs(orb) > effectiveCap) dropReason = 'OUT_OF_CAP';
```

Without the absolute check, applying aspects (e.g., `orb === -3.2`) were rejected even though the magnitude was well within the cap, causing empty driver lists and Balance Meter zeros.

Log `orbs_profile` and drop reasons in provenance for auditing.

---

### Synastry / Relational Modes — Person B Natal Fix (Oct 2025)

- All relational paths now call [`fetchNatalChartComplete()`](../../lib/server/astrology-mathbrain.js#L1996) for both subjects.
- Person B receives **full natal aspects** and **house cusps** (previously missing in `SYNASTRY_TRANSITS`).
- Synastry payload schema now mirrors Person A:

```jsonc
{
  "person_a": { "aspects": [...76], "chart": { "house_cusps": [12] } },
  "person_b": { "aspects": [...67], "chart": { "house_cusps": [12] } }
}
```

If you spot empty Person B aspects in future logs, it indicates the unified helper was bypassed—refactor the code path instead of patching the response.

---

## 6. drivers[] normalized shape

Each returned driver (per-day top aspects) should be normalized and include compatibility fields:

```
{
  "a": "Venus",
  "b": "Saturn",
  "type": "square",
  "orb": 2.1,
  "applying": true,
  "weight": 1.32,
  "is_transit": true,
  "planet1": "Venus",
  "planet2": "Saturn",
  "name": "Venus square Saturn"
}
```

Drivers are sorted by weight. drivers[] must be present (empty array when upstream returns none) to ensure stable UI rendering.

---

## 7. Missing-data policy (graceful degradation)

- If no aspects for a day: include full UI/report structure and explicit placeholders:
  - drivers: []
  - seismograph: { magnitude: null, valence: null, volatility: null, status: "no aspects received" }
- Label simulated drivers clearly when shown (for layout QA only).
- For partial days, populate available days; mark others pending.
- Provide clear UI guidance: “No aspects received for these dates — try city+state, enable GeoNames, or use coords for the transit subject.”

---

## 8. The Math backbone (Weight Belt, SFD, Balance Channel)

- Aspect base weights (defaults):
  - Trine: +0.40
  - Sextile: +0.25
  - Conjunction: ±0 (contextual)
  - Square: −0.50
  - Opposition: −0.45
- Modifiers: Angularity (ASC/MC) ±0.10–0.20; Applying +0.10 / Separating −0.05; 3+ stack volatility kicker −0.10
- SFD: SupportSum − CounterSum, scaled to −5..+5
- Balance Channel v1.1: rebalances valence, boosting stabilizers (Jupiter/Venus), softening hard aspects to reveal support under load
- SST guardrail: Lived pings (WB/ABE/OSR) can flip theoretical signs; the system learns from user feedback and pings

Always include a short numeric audit in the report appendix showing component contributions to SFD and magnitude.

---

## 9. UX: what we ask of users & simple copy

Minimum fields (UI):
- Name
- Birth date
- Birth time (exact preferred; warn if approximate)
- Birth city (UI asks for state for US)
- Mode: Natal vs Natal+Transits
- If Transits: start / end / step and whether to anchor to current city

**GeoNames UI copy (drop-in)**
- Tooltip: “Optional: Add a GeoNames username to stabilize city lookups for natal charts. It’s free and server-only.”
- Inline helper: “GeoNames (optional): a free username lets the server resolve birth cities reliably. If present and you enter city + nation, natal prefers city-mode; otherwise we fall back to coordinates.”
- Settings description (admin): “GEONAMES_USERNAME: one server account stabilizes city resolution for all users.”

If aspects are missing: show clear fix suggestions and an action button for “Retry with coords” or “Provide state / enable GeoNames”.

---

## 10. Developer & API guidance (payloads, probes, provenance)

**Canonical payload shapes**

Relational Balance Meter (A_local)

```
{
  "report_type":"relational_balance_meter",
  "subjectA":{
    "name":"DH Cross",
    "birth":{ "date":"1973-07-24","time":"14:30","city":"Bryn Mawr","state":"PA","nation":"US" },
    "A_local":{ "city":"Panama City","state":"FL","nation":"US" }
  },
  "subjectB":{
    "name":"Stephie",
    "birth":{ "date":"1965-04-18","time":"18:37","city":"Albany","state":"GA","nation":"US" }
  },
  "transits":{ "from":"2025-09-01","to":"2025-09-30","step":"1d" },
  "houses":"Placidus",
  "relocation_mode":"A_local",
  "orbs_profile":"wm-spec-2025-09"
}
```

Coords-only note: remove city/state/nation and include lat, lon (or lng per upstream), tz_str.

**Probe script & verification checklist (dev)**
- Add RAPIDAPI_KEY and optional GEONAMES_USERNAME to .env.
- Run dev server: npm run dev or netlify dev.
- Run probe: node scripts/probe-provenance.js.
- Check output:
  - provenance top-level present
  - provenanceByDate entries per day with formation, endpoint, attempts, aspect_count
  - For days with aspects: transitsByDate[date].drivers is non-empty
  - If drivers[] empty but provenance shows formation=city_state_geonames and aspect_count=0, try toggling to coords for the transit instant as fallback.

---

## 11. Testing & QA rules

- 14-day pilot for new users to seed SST/personalization (3 short pings/day).
- Automated schema checks in CI to assert drivers[] shape and required provenance fields.
- Logging: log raw upstream request/response (trimmed) for 422/429/500 with per-day provenance to speed debugging.
- Backoff: treat 429 as retryable with exponential backoff; log attempts and final error body.

---

## 12. Product philosophy (restate)

- Falsifiability first. Every poetic line must trace to a math anchor or be explicitly labeled as non-transit/simulated.
- Recognition before diagnosis. Start with FIELD (felt sense), then MAP (geometry), then VOICE (actionable prompts).
- Graceful honesty. If inputs are ambiguous or aspects are missing, call it out and provide practical fixes.
- Human in the loop. Calibrations use lived pings; the system learns.

---

## 13. Quick appendix (troubleshooting checklist)

1. drivers[] empty:
  - Check provenanceByDate.formation (coords vs city).
  - If formation=city_state_geonames but aspect_count=0, ensure GEONAMES_USERNAME is valid.
  - If formation=coords but upstream returns 422 requiring city, try city+state formation.
2. House differences vs old reports:
  - Verify relocation_mode used (A_local vs None).
  - Confirm house system (Placidus vs Whole Sign).
  - Check exact event timestamp (small time shifts can move cusps).
3. Strange orbs/weights:
  - Ensure orb clamping applied pre-weight (8/7/5 + Moon/outer adjustments).
  - Check orbs_profile in provenance.

---

## Vertex AI User Role and Gemini API Access (2025-10-02)

You're correct: when assigning access in Google Cloud, the role for AI model APIs is called **Vertex AI User** (or similar)—not "Gemini" specifically.

**Explanation:**
- **Vertex AI** is Google Cloud’s managed AI platform. The Gemini large language model (LLM) is one model available through Vertex AI, along with others.
- Granting the "Vertex AI User" role lets a user access all Vertex AI services, including Gemini, so your tester can use the Gemini API in that project.
- There is no permission called "Gemini"; it's controlled by the broader Vertex AI role.

**Summary:**  
Choosing the Vertex AI role was the correct advice. It covers Gemini and future Google-managed models accessible in Vertex AI. Your tester will be able to use Gemini when you grant her "Vertex AI User" (or any appropriate AI/ML role) privileges for your project.

[Google Cloud IAM Console](https://console.cloud.google.com/iam-admin/iam?project=analog-codex-423606-r2)

---

## UI: Transit Overlay vs FIELD Relocation (copy + UX guidance)

Purpose
- Make the difference between "Transit Overlay" (visual-only hybrid) and "FIELD Relocate" (canonical, computational) explicit and discoverable. This prevents accidental use of hybrid geometry in Balance Meter and symbolic-weather calculations.

Primary UI affordances (recommended)
- Mode selector: two radio buttons (or segmented control) presented where the user picks how transits should be handled for this run.
  - Label: "Transit Mode"
  - Options:
    - "FIELD (Relocate natal + transits)" — recommended default for symbolic weather and Balance Meter calculations
    - "Transit Overlay (visual only)" — exploratory visualization; not used for computation
- Confirm dialog (only when switching to Overlay from FIELD): small non-blocking toast or inline help explaining consequences.

Exact copy to use (pasteable)

- Control label:
  "Transit Mode"

- FIELD option (primary)
  Title: "FIELD (Relocate natal + transits)"
  Short summary / tooltip:
  "Anchor both natal and transit geometry to the same observer location/time. Use this for canonical symbolic-weather and Balance Meter outputs — the system will request houses from the upstream API and treat them as canonical."

  Long tooltip (hover / info panel):
  "FIELD relocates the entire chart frame to the selected observer location and time, recomputing ASC/MC and house cusps for that location. This unified geometry is the canonical input used for all Woven Map calculations (Seismograph, Balance Meter, symbolic weather). Recommended."

- Overlay option (secondary)
  Title: "Transit Overlay (visual only)"
  Short summary / tooltip:
  "Show transits calculated for the current location overlaid on the natal houses anchored to birth coordinates. Exploratory only — not used for Balance Meter or symbolic-weather math."

  Long tooltip:
  "Transit Overlay superimposes the current sky over the natal chart. Natal houses remain anchored to the birth coordinates while transit angles reflect the new location. This creates a hybrid view useful for exploration, but it is not the canonical geometry for automated field calculations."

- Small confirmation message when choosing Overlay (non-blocking):
  "Heads up: Transit Overlay is visual-only. If you want canonical symbolic-weather results, choose FIELD (Relocate natal + transits)."

- Inline Help / footer note near export buttons:
  "Exports labeled 'FIELD Chart' use relocated geometry (recommended for calculations). Exports labeled 'Overlay' are hybrid views and are intended for visual exploration only."

Behavioral guidance for front-end engineers
- Default selection: FIELD (Relocate natal + transits) for any flow that produces seismograph, balance meter, or generated poetic readings. Only enable Transit Overlay as an explicit, secondary selection.
- Persistence: Persist user's last choice in session / local storage but always surface the tooltip for novice users.
- Visual indicator: Add a small badge to any exported FieldMap or report with the tag: "geometry: FIELD" or "geometry: OVERLAY" (this also appears in provenance).
- Accessibility: Tooltips and confirmation UI must be keyboard accessible and screen-reader friendly.

Sample UI toggle JSON (for telemetry)
```json
{
  "label": "Transit Mode",
  "selected": "FIELD",
  "options": [
    { "key": "FIELD", "title": "FIELD (Relocate natal + transits)", "recommended": true },
    { "key": "OVERLAY", "title": "Transit Overlay (visual only)", "recommended": false }
  ]
}
```

## Adapter contract: include_houses for FIELD
When the UI choice is FIELD (the default for Balance Meter / symbolic-weather), the adapter MUST request houses from the upstream provider.

- Use endpoints:
  - `POST /api/v4/birth-chart` (for natal + relocated natal houses)
  - `POST /api/v4/transit-chart` (for transit windows) OR `POST /api/v4/transit-aspects-data` followed by a houses request when needed
- Required request flags:
  - `include_houses: true`
  - `include_aspects: true` (for drivers)
- If the upstream response omits houses, the adapter must:
  1. Re-attempt a call to an endpoint that returns houses (e.g., birth-chart / transit-chart).
  2. If upstream cannot provide houses, compute houses locally (Swiss Ephemeris or equivalent) and stamp provenance.house_engine accordingly.

Provenance contract (fields required)
Every FIELD Chart export must contain a provenance block with, at minimum, these keys:

```json
{
  "schema": "BM-v5",
  "house_system": "Placidus",
  "orbs_profile": "wm-tight-2025-11-v5",
  "relocation_mode": "None|A_local|B_local|Both_local",
  "relocation_coords": { "lat": 40.0, "lng": -75.0 },
  "house_engine": "astrologer.p.rapidapi.com@v4.0|local-swiss-ephemeris@vX.Y|missing_upstream",
  "has_transits": true,
  "drivers_count": 4,
  "house_shift_summary": [{ "num": 1, "delta_deg": -2.12 }, ...] || "not_provided",
  "tz": "America/New_York",
  "math_brain_version": "vX.Y",
  "notes": ["upstream houses used", "include_houses flag set"]
}
```

- `relocation_mode`: set by comparing the supplied coords with natal coords and/or by computing house deltas (any non-trivial deltas => A_local).
- `house_engine`: set to `'astrologer.p.rapidapi.com@v4.0'` when upstream houses used; `'local-swiss-ephemeris@x.y'` when computed locally; `'missing_upstream'` when neither was available (caller must retry).
- `house_shift_summary`: optional but recommended. If present, must include all houses 1..12 and deltas.

Backward compatibility note
- When a stored FieldMap or legacy export does not include provenance or uses overlay geometry, mark it explicitly as `geometry: OVERLAY` in the metadata and recommend a re-run via FIELD mode for canonical recalculation.
