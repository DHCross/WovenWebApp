Woven Map — Revised Report Guide (Lessons Learned)

This is a consolidated, updated version of the “Four Report Types” doc. It preserves the original architecture (Mirror Flow vs Balance Meter; FIELD → MAP → VOICE; Poetic Brain) while integrating practical, operational, and product-level lessons discovered during implementation and live testing (API quirks, relocation complexity, provenance needs, orbs policies, fallback behaviors, UX for non-programmers, and developer tooling).

⸻

High-level changes (what we learned and applied)
	•	Provenance matters. Every report must stamp house system, orbs profile, relocation mode, timezone DB, engine versions, and math_brain_version so results remain auditable and reproducible.
	•	Relocation is powerful but brittle. House reanchoring (A_local/B_local) is essential for Balance Meter accuracy — but it depends on precise location inputs and upstream resolver behavior. We implemented robust fallbacks and an “Angle Drift Cone” for ambiguous cases.
	•	Upstream transit endpoints are finicky. City-only vs coords-only vs city+state behave differently across providers. We added adapter logic, explicit geocoding modes, and a clear developer UX for GeoNames or city+state.
	•	Orbs and pre-weight filters must be explicit. Use strict orb caps and documented Moon/outer rules (+Moon +1°, outer→personal −1°) applied before weighting.
	•	Reports must gracefully show missing data. When the provider returns no aspects, the report template renders fully but with explicit “no aspects received” placeholders and simulated examples flagged as such.
	•	User-facing simplicity + developer detail. Non-programmer UI can remain minimal (date + birth city) — the adapter/back-end does the heavy lifting and documents required options for power users.
	•	Falsifiability and user feedback are central. SST, Drift Index, Session Scores, and micro-probes are unchanged but tightened so misses are calibration data, not shame.

⸻

1. Report Types (cleaned & updated)

Two Categories of Atmospheric Intelligence
	•	Mirror Flow — qualitative, recognition-first. Works with natal/synastry alone (low location sensitivity).
	•	Balance Meter — quantitative, transit-dependent. High location sensitivity; relocation recommended when life events are geographically anchored.

Key addition:
	•	Each report must include provenance header and a status block describing whether live aspects/transits were received, and if not, which fallback was used (simulated sample, coords-only, city+state, etc.).

⸻

2. Mirror Flow Reports (qualitative, low-location)

Purpose
	•	Reflection and recognition. Poetic, body-first language.

Inputs
	•	Natal geometry (birth date/time/place). Transit overlay optional.

Subtypes & outputs (unchanged)
	•	Solo Mirror, Relational Mirror (synastry), Polarity Cards, Mirror Voice, Actor/Role composites.

Implementation note
	•	Mirror Flow runs without translocation; it is robust to missing timezone precision and is our “first-read” product for non-technical users.

⸻

3. Balance Meter Reports (quantitative, transit-sensitive)

Purpose
	•	Symbolic seismograph: magnitude (0–5), valence (−5..+5), volatility (0–5) across a time window.

Inputs (required)
	•	Natal birth data (date/time/place) AND
	•	Transit window (from / to / step)
	•	Relocation mode: None | A_local | B_local (midpoint optional but discouraged by default)
	•	House system (default: Placidus for diagnostic work)
	•	Orbs profile (e.g., wm-spec-2025-09)

New rules & operational notes
	•	Relocation default: For dyads/Balances default to A_local unless flagged. Midpoint is supported only when explicitly chosen; we recommend against it for most use-cases.
	•	Orbs (pre-weight filter): Conjunction/Opposition 8°, Square/Trine 7°, Sextile 5°; Moon gets +1°, outer→personal −1° (outer = Jupiter/Saturn/Uranus/Neptune/Pluto; personal = Sun/Moon/Mercury/Venus/Mars).
	•	Provenance stamping: house_system, house_system_name, orbs_profile, timezone_db_version, relocation_mode, relocation_coords, math_brain_version, ephemeris_source, engine versions (seismograph/balance/sfd).
	•	When aspects are missing: The report still delivers structure and voice, with explicit placeholders: “no aspects received for this day — drivers[] empty.” Simulated examples may be shown only when explicitly labeled as simulated.
	•	SFD & Balance Channel: Present but will compute only when drivers[] exist. Reports show whether these channels are live or pending.

⸻

4. Scoring and Math (Weight Belt, SFD, Balance Channel)

Core computation (unchanged but explicit)
	•	Aspect base weights: Trine +0.40, Sextile +0.25, Conjunction ±0 (contextual), Square −0.50, Opposition −0.45.
	•	Modifiers: Angularity (ASC/MC) ±0.10–0.20, Applying +0.10 / Separating −0.05, Multi-hit stack volatility kick −0.10.
	•	SFD (Support–Friction Differential): SupportSum − CounterSum scaled to bipolar −5..+5.
	•	Balance Channel (v1.1): Rebalances valence to reveal stabilizers (boost Jupiter/Venus contributions while preserving magnitude).

SST guardrail
	•	Lived pings (WB / ABE / OSR) can flip theoretical valences. Systems log ping history and evolve.

⸻

5. Relocation (Translocation) — clarified

What it does
	•	Reanchors ASC/MC and house cusps to another set of lat/lon — planets stay natal degrees, houses change where that energy “lands.”

When to use
	•	Event/location analysis, local crises, planning an event in a city, long-distance relational windows where one party is local.

Practical constraints & lessons
	•	Upstream resolvers behave differently depending on payload shape:
	•	coords-only (lat/lon/tz) vs city+state,nation vs city,nation — some endpoints require city+state to return transit aspects consistently.
	•	Some providers also accept geonames_username which stabilizes name resolution.
	•	UX design choices:
	•	For most users, ask for birth city and current city (for relocation). Behind the scenes map to either coords-only or city+state based on adapter heuristics and available environment (GEONAMES_USERNAME).
	•	Provide a clear note in UI: “Relocation accuracy improves if you provide city + state or use GeoNames (optional free sign-up).”
	•	Angle Drift Cone: When a user declines precise coords or time is uncertain, compute a cone across plausible coordinates and show whether house assignments are stable or ambiguous. If ambiguous, degrade to sign/planet language rather than house-specific claims.

⸻

6. API & Adapter behavior (developer lessons)

Required behavior (adapter responsibilities)
	•	Accept the simplified subjectA/subjectB/transits/houses/relocation_mode JSON shape (human-friendly).
	•	Auto-select one geocoding mode and do not mix modes per run:
	•	City-mode: send city, state, nation (no lat/lon/tz) — recommended for reliability.
	•	Coords-mode: send lat, lng (or lat, lon depending on upstream) and tz_str — for maximum precision.
	•	Stamp provenance: house system, orbs profile, timezone_db_version, relocation_mode, relocation_coords.
	•	Enforce orb caps and Moon/outer adjustments before weight calculation.
	•	Emit drivers[] with normalized fields: { a, b, type, orb, applying, weight, is_transit }.
	•	If upstream returns empty, return full report structure and explicit placeholders (e.g., drivers: [], seismograph.pending: true) so UI can render consistent pages.

Config hints
	•	GEONAMES_USERNAME: optional env var. If present, adapter prefers city-mode using geonames for resolution; if absent, adapter falls back to coords-only or city+state heuristics.
	•	Relocation default: dyad reports default to A_local. Allow user override.

⸻

7. UX & Non-programmer simplicity

Minimum user fields (what we ask in UI)
	•	Name
	•	Birth date
	•	Birth time (approx OK; warn on house precision)
	•	Birth city
	•	Mode: Natal or Natal + Transits
	•	If Transits: Ask for start/end dates and whether to anchor analysis to your current city (Yes → ask current city).

Helpful UX copy
	•	“For location-sensitive reports (Balance Meter), accuracy improves if you provide city + state (or allow device location). Optional: sign into GeoNames for improved place resolution.”
	•	If aspects fail to return, show friendly explanation and options: “We didn’t receive live transit aspects for these dates — you can retry with city+state, coords, or enable GeoNames. Meanwhile the report layout is ready.”

⸻

8. Fail states & graceful degradation (operational)
	•	No aspects received: show full report, mark drivers[] empty and seismograph pending, include simulated examples explicitly labeled as simulated.
	•	Partial days returned: populate days that returned aspects; mark others pending.
	•	House ambiguity: show Angle Drift Alert and degrade house language to planet/sign tone.
	•	Invalid relocation_mode: return 400 and descriptive message (midpoint is allowed only if explicitly requested; default is A_local).
	•	Orbs mismatch: adapter enforces orb profile but includes orbs_profile in provenance for traceability.

⸻

9. Testing, QA, and Falsifiability (product rules)
	•	Session Scores: measure WB / ABE / OSR from user feedback.
	•	14-day pilot: required for new users to seed personal tuning (capacity gain g, SST flips).
	•	Logging & audit: Every report must include a provenance block and raw geometry appendix for debugging and user transparency.
	•	Automated schema checks: assert drivers[] present shape and required provenance fields exist in CI.

⸻

10. Developer Quick Reference (payload examples)

Minimal Solo Balance Meter (A_local)

{
  "report_type":"solo_balance_meter",
  "subjectA":{
    "name":"DH Cross",
    "birth":{ "date":"1973-07-24","time":"14:30","city":"Bryn Mawr","state":"PA","nation":"US" },
    "A_local":{ "city":"Panama City","state":"FL","nation":"US" }
  },
  "transits":{ "from":"2025-09-01","to":"2025-09-30","step":"1d" },
  "houses":"Placidus",
  "relocation_mode":"A_local",
  "orbs_profile":"wm-spec-2025-09"
}

Relational Balance Meter (A_local)

{
  "report_type":"relational_balance_meter",
  "subjectA":{ ... },
  "subjectB":{
    "name":"Stephie",
    "birth":{ "date":"1965-04-18","time":"18:37","city":"Albany","state":"GA","nation":"US" }
  },
  "transits":{ "from":"2025-09-01","to":"2025-09-30","step":"1d" },
  "houses":"Placidus",
  "relocation_mode":"A_local",
  "orbs_profile":"wm-spec-2025-09"
}

Notes:
	•	If you prefer coords-only, remove city/state/nation and include lat/lon and tz_str.
	•	Provide GEONAMES_USERNAME in .env if you want to stabilize city resolution (optional, free).

⸻

11. Poetic Brain & Feedback Loop (unchanged but tightened)
	•	Hook Stack, Poetic Brain Translation (FIELD→MAP→VOICE), SST, Drift Index, Session Scores, Wrap-Up Card, Adaptive Loop remain core components.
	•	New: Each Poetic Brain output must include a tiny provenance line linking to the Balance Meter seismograph/day (if transits used) and note whether language is derived from natal geometry or transit activation.

⸻

12. Closing: product philosophy (refined)
	•	We keep falsifiability first and recognition before diagnosis.
	•	The system must be traceable: every poetic line maps to a math anchor (or a clear note explaining lack of transit anchors).
	•	We prefer clarity over magical-sounding certainty. If the system has ambiguous inputs (time, location, missing aspects), the UI and voice must call that out and offer pragmatic fixes (provide state, enable GeoNames, or accept Angle Drift Cone language).

⸻

