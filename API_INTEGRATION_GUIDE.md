

# Woven Map — Revised Report Guide (Lessons Learned)

A single, practical guide that preserves the original architecture (Mirror Flow vs Balance Meter; FIELD → MAP → VOICE; Poetic Brain) while integrating operational lessons discovered during implementation and live testing: API resolver quirks, relocation brittleness, provenance needs, orb policy, formation/fallback rules, developer UX, and QA checks.

---

## At-a-glance: What changed (quick summary)

- Provenance is required. Every report must stamp house system, orbs_profile, relocation_mode, timezone_db_version, engine versions and math_brain_version.
- Relocation is valuable — and fragile. A_local/B_local reanchors houses but depends on reliable geocoding. We added fallbacks and an Angle Drift Cone for ambiguous inputs.
- Do not mix geocoding modes per run. Either coords-only or city-mode (with optional GeoNames) for the whole transit window.
- Orb policy enforced pre-weight. Conj/Opp 8°, Sq/Tr 7°, Sext 5°; Moon +1°; outer→personal −1°.
- Reports must render even when data is missing. Use explicit “no aspects received” placeholders and clearly-labeled simulated examples if needed.
- Non-programmer UX stays minimal. The backend/adaptor hides complexity but exposes clear UI hints and admin debug guidance.

---

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

Log orbs_profile in provenance.

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
