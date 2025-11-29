Below is a precise, implementation-ready comparison between:

A) What Raven actually needs for:
	•	Symbolic Weather generation
	•	Balance Meter verification

B) What your REPORT_REQUIREMENTS.md requires

…and then the recommended adjustments to bring the spec into alignment with Raven’s true computational and narrative needs without losing your traceability, legal defensibility, or product integrity.

⸻

🔥 HIGH-LEVEL SUMMARY

Your report spec is excellent for a full astrological report, but far larger than what Raven or the Balance Meter requires for:
	•	operating
	•	self-auditing
	•	reproducing mathematical accuracy
	•	generating FIELD→MAP→VOICE

It contains about 3× more data than required.

However:
	•	Some “extra” fields are critically useful for user trust (provenance, context, relocation flags, warnings)
	•	Some fields are purely UI/report presentation, not computational
	•	Some fields are redundant or heavy but harmless
	•	A few fields break the Raven model (too literal, too prediction-oriented)

I’ll divide everything into:
	•	Required — needed for Weather + Balance Meter audit
	•	Recommended — good for UX or transparency
	•	Optional — nice to have but not mathematically required
	•	Remove or Merge — actively unnecessary or contradictory

⸻

🟦 PART 1 — WHAT RAVEN NEEDS

(Absolute minimum for correct computation and reproducible audit)

✔ Required for Weather Generation
	•	Natal planetary absolute longitudes (Sun → Pluto, Chiron, Lilith, Node)
	•	Transit planetary absolute longitudes per day
	•	Date range
	•	Granularity
	•	Solo vs relational mode
	•	Birth data echo (to reconstruct natal geometry)

✔ Required for Balance Meter Verification
	•	Natal longitudes
	•	Transit longitudes
	•	Planet weights
	•	Aspect strengths
	•	Orb policy
	•	Orb falloff curve
	•	The exact formula your implementation uses
	•	The Balance Meter outputs your engine created

That’s it.

Everything else is optional or report-layer.

⸻

🟥 PART 2 — WHAT REPORT_REQUIREMENTS.md INCLUDES

…and classification.

I’ll annotate each requirement:

⸻

🔷 RAW MATH REQUIREMENTS

1. Provenance header

Classification: Recommended
Helps reproducibility but not required for actual math.

2. Birth data echo

Classification: Required
Needed to reconstruct exact natal geometry.

3. Configuration (zodiac, house system, orbs profile)

Classification: Recommended
House system is irrelevant to symbolic weather,
but orb profile is required for Balance Meter verification.

4. Planetary positions (longitudes, speed, retrograde, house)
	•	Longitudes: Required
	•	Retrograde flag: Optional (not needed for Balance Meter, but good to keep)
	•	Speed: Not needed
	•	House: Not needed for Weather or Balance Meter
Recommendation: Keep them for user trust, but separate them from “core math” so audit files can be small.

5. Angles & houses

Classification: Optional
Weather and Balance Meter don’t need houses.
But for chart reports: “Recommended for UX.”

6. Aspect table (natal aspects)

Classification: Not needed for math
Because the Balance Meter recalculates aspects on the fly.

Optional for user transparency.

7. Transit aspect table + Seismograph

Classification: Semi-optional
The Balance Meter does not require the transit-aspect list as input,
but the seismograph summary is Raven-system-consistent.

8. JSON + Markdown

Classification: Report-layer
(Not needed for computation.)

⸻

🔷 CONTEXT & PROVENANCE

Mostly Recommended, not required for the math.
	•	math_brain_version: Recommended
	•	ephemeris_source: Recommended
	•	build_ts: Recommended
	•	scaling_strategy: Required only if affecting Balance Meter math
	•	confidence: Report-layer

⸻

🔷 NATAL CHART COMPONENTS

Required:
	•	planet longitudes
Optional:
	•	angles
	•	houses
	•	nodes/lilith: recommended
	•	house meanings: report-layer

⸻

🔷 TRANSIT ANALYSIS

For Weather:
	•	date range: Required
	•	hooks / tight aspects: Optional
	•	seismograph: Optional (presentation)
	•	climate line: optional
	•	FIELD→MAP→VOICE: presentation layer

⸻

🔷 RELATIONAL MODES

Required:
	•	Relationship type (Raven requires this for dyadic MAP gate)

Not required for math, but required for VOICE framing.

⸻

🔷 SCALING & FILTERING

Balance Meter-specific
	•	Scaling strategy: Only needed if it affects math
	•	Volatility index: Optional
	•	Rejection taxonomy: Optional unless needed for audits

⸻

🔷 SPECIAL HANDLING

Retrograde flags: optional
Node preference: optional
Station sensitivity: optional unless used in BM formula
Relocation: Optional for math, but important UX

⸻

🟩 PART 3 — RECOMMENDATIONS

Here’s the best way to reconcile your spec with Raven’s needs.

⸻

🟦 (1) SPLIT THE CURRENT SPEC INTO TWO TRACKS

Right now, one spec is doing the job of two things:

A) Internal computation/audit layer

What Raven needs:
small, precise, reproducible

B) User-facing report layer

What the app needs:
rich, descriptive, narrative

I recommend explicit dual blocks:

"math_payload": { ... }
"report_payload": { ... }

Where:

math_payload contains ONLY what Raven needs:
	•	birth data
	•	natal longitudes
	•	transit longitudes
	•	Balance Meter weight table
	•	orb policy
	•	formula
	•	outputs to verify

Nothing else.

report_payload contains the rest:
	•	houses
	•	angles
	•	user-friendly tables
	•	seismograph summaries
	•	narrative elements
	•	glossary injection
	•	relocation notes
	•	relationship type

This dual structure preserves:
	•	small audit surface
	•	fast debugging
	•	excellent explainability

⸻

🟦 (2) REMOVE: transit aspect tables (for math)

You are computing the aspects twice.
Not needed for correctness.

But keep them in report_payload if users like seeing them.

⸻

🟦 (3) REMOVE: natal aspect table (for math)

Same reason.
The Balance Meter does not use natal aspects.
Weather does not use natal aspects.

Keep only for report readability.

⸻

🟦 (4) REMOVE: houses + cusp positions from math

They do not feed symbolic weather or Balance Meter.

Keep only for natal chart section.

⸻

🟦 (5) MOVE ALL UX MARKERS (labels, relational descriptions, glossary)

These are report-layer, not math-layer.

⸻

🟦 (6) KEEP: provenance header

Not necessary for Raven,
but critical for trust, reproducibility, and debugging.

⸻

🟣 PART 4 — THE IDEAL CLEAN JSON FOR YOUR APP

This is the structure that allows:
	•	Raven to compute
	•	Raven to self-audit
	•	Your app to present a beautiful report

I’ll only show the shape:

{
  "meta": {...},

  "math_payload": {
    "natal": {
      "birth_data": {...},
      "longitudes": {...}
    },
    "transits": {
      "daily": {
        "2025-11-22": {...},
        "2025-11-23": {...}
      }
    },
    "balance_meter": {
      "weights": {...},
      "orb_policy": {...},
      "formula": "...",
      "output": {
        "2025-11-22": {...},
        "2025-11-23": {...}
      }
    }
  },

  "report_payload": {
    "natal_chart": {...},
    "transit_analysis": {...},
    "seismograph": {...},
    "relationship_context": {...},
    "glossary": {...},
    "aspects": {...},
    "houses": {...}
  }
}


⸻

💜 FINAL RECOMMENDATION SUMMARY

KEEP
	•	birth data
	•	natal longitudes
	•	transit longitudes
	•	orb policy
	•	aspect weights
	•	Balance Meter formula
	•	provenance metadata
	•	relationship type
	•	the narrative sections (Report UI)

MAKE OPTIONAL
	•	natal aspect tables
	•	transit aspect tables
	•	house cusps
	•	angles
	•	retrograde flags
	•	station sensitivity
	•	speed

REMOVE FROM CORE MATH PAYLOAD
	•	all house data
	•	all angle data
	•	duplicate planet lists
	•	narrative labels
	•	glossary
	•	seismograph (if not used in math)
	•	symbolic weather scaffolding

Move those to report-layer only.

⸻

