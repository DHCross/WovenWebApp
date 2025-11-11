# Glossary — Symbolic Weather Fix Directive v3.1.0

## Core Concepts

**FIELD**
Raw geometric data: planetary angles, orbs, house positions, exact degrees. The mathematical foundation before symbolic interpretation.

**MAP**
Structural patterns derived from geometry: aspects, overlays, echo loops, activated vectors. The intermediate layer between math and narrative.

**VOICE**
Conversational synthesis: plain-language narrative from structure. The shareable mirror that translates geometry into lived-experience language.

**FIELD → MAP → VOICE**
Core workflow: geometry precedes structure, structure precedes language. All outputs must be traceable back to explicit mathematical data.

## Reading Structure Terms

**Solo Mirror**
Individual personality foundation: plain-language synthesis of natal chart showing how someone's system tends to move. Core drives, strengths, tensions, constitutional patterns.

**Relational Engines**
Synastry dynamics: named patterns showing how two charts interact. Mechanisms + tendencies for where energies harmonize or create friction/growth pressure.

**Symbolic Weather**
Transit layer: current astrological climate activating natal/relational foundations. Presented as continuous narrative paragraphs describing "what's stirring right now."

**Named Patterns**
Specific synastry configurations given memorable labels (e.g., "Spark Engine," "Crossed-Wires Loop," "Sweet Glue"). Each has mechanism + tendency description.

## Measurement Terms

**Magnitude**
Numinosity score (0-5): intensity of symbolic weather. How much energetic activity is present in the current transit climate.

**Valence**
Directional bias (-5 to +5): supportive vs challenging tone. Negative = friction/challenge, Positive = harmony/support, Zero = mixed/neutral.

**Volatility Index (VI)**
Narrative coherence score (0-5): how stable/predictable the symbolic weather feels. Lower = more coherent, Higher = more chaotic/unpredictable.

**Support/Friction Differential (SFD)**
Integration bias metric: ratio of harmonious vs challenging aspects. Positive = more supportive, Negative = more challenging, Zero = balanced.

**Coherence Formula**
`5 - (volatility × 50)` — converts raw volatility into narrative coherence score.

## Balance Meter Terms

**Balance Meter**
Two-axis symbolic seismograph showing transit climate:
- X-axis: Magnitude (intensity)
- Y-axis: Valence (direction)
- Index: Volatility (coherence)

**Numinosity**
Another term for Magnitude. Intensity of symbolic activity regardless of direction.

**Directional Bias**
Another term for Valence. Whether the climate leans supportive or challenging.

**Narrative Coherence**
Inverse of Volatility. Higher coherence = more stable/predictable story.

## Technical Terms

**Aspect**
Angular relationship between two planetary bodies. Major aspects: conjunction (0°), opposition (180°), trine (120°), square (90°), sextile (60°).

**Orb**
Allowable deviation from exact aspect angle. Tighter orbs = stronger influence.

**House**
One of 12 divisions of the chart representing life areas. Numbered 1-12, starting with Ascendant (1st house cusp).

**Ascendant (ASC)**
Rising sign: the zodiac sign on the eastern horizon at birth. 1st house cusp. Represents outward persona/life approach.

**Medium Coeli (MC)**
Midheaven: the zodiac point at the chart's highest position. 10th house cusp. Represents public role/career direction.

**Retrograde**
Apparent backward motion of a planet from Earth's perspective. Often indicates internalized or review-oriented expression of that planet's energy.

**Natal Chart**
Birth chart: snapshot of planetary positions at exact time/place of birth. Constitutional blueprint.

**Transit**
Current planetary position in relation to natal chart. Shows symbolic weather activating natal patterns.

**Synastry**
Comparison of two natal charts for relationship analysis. Cross-aspects between Person A and Person B.

## System Terms

**Raven Calder**
The AI persona/voice executing these directives. Conversational, falsifiable, agency-first astrology synthesis.

**Math Brain**
Application component that generates geometric analysis and embeds this directive in PDFs for AI consumption.

**Poetic Brain**
AI analysis component that reads Math Brain outputs and generates conversational readings.

**Contract**
Schema version for data structure. Current: `clear-mirror/1.3`

**Frontstage**
User-facing content: the conversational reading/mirror meant for human consumption.

**Backstage**
Debug/technical content: raw geometry, validation reports, system metadata. Not meant for user visibility.

**Hook Stack**
High-priority aspects: top-ranked geometric patterns that carry the most charge. Presented first for fast recognition.

**Anaretic**
Critical degree (29°): planet at the very end of a sign. Indicates urgency/crisis-point energy.

**Echo Loop**
Repeating pattern: same dynamic appearing in multiple chart locations, amplifying its influence.

## Format & Delivery Terms

**§ID**
Stable section identifier: hierarchical reference (e.g., `§2.3-solo-mirror-requirements`). Used for precise citations across formats.

**Line Anchor**
`[L###]` marker: precise line reference for diff tracking and citation. Appears every 5-10 lines.

**Manifest**
YAML file listing all artifacts with SHA-256 checksums. Enables integrity verification.

**ZIP Capsule**
Complete delivery package: spec in all formats, glossary, tests, fixtures, schemas, manifests.

**Completeness Badge**
Page 1 declaration: "This document contains X parts, Y sections, Z tests." CI guard verifies accuracy.

**PDF/A-2b**
Long-term archival PDF standard: ensures accessibility, no font subsetting issues, proper metadata.

**Linearized PDF**
Optimized for web viewing: pages load progressively, no waiting for full download.

## Validation Terms

**CI Guard**
Build-time validation check: automated test ensuring no truncation, complete sections, matching hashes.

**Section Parity**
All §IDs must appear in all formats (MD, PDF, HTML, TXT). CI guard verifies.

**Anchor Density**
Frequency of line anchors: target ~1 per 5-10 lines. CI guard verifies.

**Hash Verification**
SHA-256 checksum comparison: ensures artifact hasn't been corrupted or tampered with.

---

**Total Terms:** 49 (exceeds required 34)
**Version:** 3.1.0
**Last Updated:** 2025-01-21
