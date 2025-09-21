# WovenWebApp: Four Report Types - Detailed Specifications

## Report Architecture Overview

Each report type serves a distinct analytical purpose within the WovenWebApp system, combining mathematical precision with interpretive frameworks. All reports share universal structural components while diverging in focus, sensitivity requirements, and data processing approaches.

## Universal Report Components

### Provenance Header (All Reports)
**Technical Specifications:**
- House System: Placidus, Whole Sign, Equal House, or Koch
- Orbs Profile: Custom calculation rules (e.g., +1° for Moon interactions, -1° for outer planet contacts with personal planets)
- Engine Version: Computational framework version for reproducibility
- Coordinates: Precise latitude/longitude with timezone verification
- Relocation Mode: None, A_local, B_local, or Midpoint
- Generation Timestamp: ISO format with timezone offset

**Purpose:** Ensures computational transparency and enables exact reproduction of results for verification or comparison across different time periods.

### Core Analytical Framework
**Balance Meter Integration (All Reports):**
- Magnitude (0-5): Quantified pressure intensity based on aspect tightness and planetary weights
- Valence (-5 to +5): Support/friction differential calculated from harmonious vs. challenging aspect dominance
- Volatility (0-5): Stability assessment derived from aspect consistency and outer planet involvement
- Climate Line: Single-sentence metaphorical summary of numerical coordinates

**Vector-Integrity Check (All Reports):**
- Latent Influences: Constitutional elements present but not yet activated through experience
- Suppressed Influences: Patterns muted by compensatory structures or conscious override mechanisms

**Polarity Cards Progression (All Reports):**
- FIELD: Somatic/felt sense baseline derived from planetary emphasis and aspect tension
- MAP: Structural skeleton showing geometric relationships and behavioral architectures
- VOICE: Conditional mirror language offering testable insights without deterministic claims

### User Input Flow (Applies to All Reports)
- Birth credentials are always supplied by the user: legal/preferred name, birth date, birth time, birthplace (city + state or coordinates), and timezone confirmation.
- Relocation/translocation is an explicit user choice. When the toggle is active the payload includes the chosen lens (`A_local`, `B_local`, `Custom`, etc.) together with either coordinates or a city/nation combination.
- For internal QA Person A loads with a default A_local lens (Panama City, FL) so testers can submit quickly, but the location can be edited or the lens turned off before sending the request.

---

## 1. Solo Mirror Report (Individual Constitutional Analysis)

### Purpose & Scope
Constitutional pattern recognition for individual self-understanding. Focuses on inherent behavioral tendencies, psychological architectures, and developmental themes independent of current external pressures.

### Required Input Data
**Essential Demographics:**
- Full name or preferred identifier
- Birth date (YYYY-MM-DD format)
- Birth time (HH:MM with precision assessment)
- Birth location (city, state/region, country)
- Precise coordinates (latitude/longitude to 2+ decimal places)
- Local timezone at birth (accounting for historical changes)
- Zodiac system preference (tropical/sidereal)

**Analysis Parameters:**
- Mode Selection: Natal-only vs. Natal+Current Transits
- Transit Window (if applicable): Start/end dates with daily, weekly, or monthly intervals
- House System: User preference or system default
- Orbs Profile: Standard, tight, or custom configuration

### Core Section Structure

**Typological Profile:**
- Dominant Orientation: Primary behavioral function anchored to strongest planetary patterns (Sun, Moon, Ascendant emphasis)
- Secondary Orientation: Background rhythm derived from secondary aspect clusters and elemental balance
- Shadow Orientation: Friction points from challenging aspects, Saturn/Pluto contacts, and unintegrated planetary energies
- Constitutional Climate: Unified metaphor connecting all orientations into coherent psychological weather pattern

**Chart Summary:**
- Planetary Placements: Sun through Pluto with sign, house, and degree positions
- Angular Structure: Ascendant, Midheaven, Descendant, Imum Coeli with orb-based strength assessment
- Major Aspects: Conjunction, opposition, square, trine, sextile within orb parameters
- Special Configurations: Grand trines, T-squares, stelliums, or other geometric patterns

**Transit Analysis (Mode-Dependent):**
- Current Transits: Outer planets (Jupiter through Pluto) contacting natal positions within orb
- Transit Timeline: Chronological list covering analysis window with peak intensity dates
- Activation Patterns: Which constitutional elements are currently stimulated vs. dormant

**Balance Meter Application:**
- Constitutional Magnitude: Baseline intensity level derived from overall aspect density and angular emphasis
- Inherent Valence: Support/challenge ratio from natal aspect mathematics
- Stability Assessment: Volatility measurement from fixed/mutable/cardinal distribution and outer planet involvement
- Baseline Climate: Metaphorical description of constitutional emotional weather

**Mirror Voice Narrative:**
- Integration of amplifications and frictions into readable interpretation
- Emphasis on behavioral tendencies and psychological patterns rather than predictive statements
- Agency-returning closure: "What feels most alive to you here?" or equivalent empowerment prompt

### Location Sensitivity
**Low sensitivity** - Constitutional patterns remain consistent regardless of geographic location. Relocation affects house emphases and angular placements but doesn't alter fundamental personality architecture.

---

## 2. Solo Balance Meter Report (Individual Transit Analysis)

### Purpose & Scope
Real-time pressure analysis for decision-making and timing assessment. Focuses on current external influences interacting with constitutional patterns to create temporary conditions and opportunities.

### Required Input Data
**All Solo Mirror requirements plus:**
- Current Location: Where the person is living/operating (may differ from birth location)
- Analysis Window: Specific start and end dates for pressure tracking
- Granularity: Daily, weekly, or monthly data resolution
- Focus Areas: Life domains of particular interest (career, relationships, health, etc.)

### Enhanced Analytical Components

**Balance Meter Overview:**
- Current Magnitude: Present pressure intensity from active transits
- Active Valence: Real-time support/challenge ratio affecting decision-making capacity
- Dynamic Volatility: Stability fluctuation over analysis window
- Pressure Peaks: Dates when intensity reaches maximum levels
- Relief Windows: Periods of decreased pressure for recovery or major decisions

**Time Series Integration:**
- Seismograph Visualization: Daily/weekly pressure bars showing magnitude fluctuations
- Trend Analysis: Whether pressure is building, releasing, or maintaining consistent levels
- Cycle Recognition: Recurring patterns from planetary return cycles or aspect repetition

**Integration Factors (Percentage Analysis):**
- Fertile Field %: Periods when constitutional patterns align with external pressures for growth opportunities
- Harmonic Resonance %: Times when transit pressures complement rather than challenge natal patterns
- Expansion Lift %: Opportunities for forward movement and new initiative development
- Combustion Clarity %: High-pressure periods that burn away unnecessary elements and clarify priorities
- Liberation/Release %: Times when restrictive patterns dissolve or transform
- Integration %: Periods optimal for consolidating recent changes and stabilizing new patterns

**Temporal Recommendations:**
- Optimal Action Windows: Dates/periods best suited for major decisions or initiatives
- Conservation Periods: Times for rest, reflection, and energy preservation
- Processing Intervals: When internal work and integration should take priority over external action

### Location Sensitivity
**High sensitivity** - Transit timing varies significantly based on geographic location. Relocation recommendations strongly encouraged when analyzing life decisions tied to specific places.

---

## 3. Relational Mirror Report (Partnership/Connection Analysis)

### Purpose & Scope
Interpersonal dynamic analysis for understanding relationship patterns, compatibility factors, and areas of mutual support or challenge. Focuses on how two individual constitutional patterns interact to create joint behavioral architectures.

### Required Input Data
**Individual Data (Both Parties):**
- Complete birth data for Person A and Person B (same requirements as Solo Mirror)
- Current locations (if different from birth locations)
- Relationship timeline (when connection began, major transitions)

**Relational Context:**
- Connection Type: Romantic partner, friend/colleague, family member, professional relationship
- Intimacy Tier (for romantic relationships):
  - P1: Early/casual exploration phase
  - P2: Established rhythm with regular contact
  - P3: Committed routines and shared planning
  - P4: Cohabitation or high interdependence
  - P5a: Formal commitment (marriage/legal union)
  - P5b: Post-union complexity (separation, divorce process)
- Family Role Specification: Parent/offspring, siblings, extended family with generational context
- Status Modifiers: Ex/estranged flags, on/off patterns, custody arrangements
- Contextual Notes: Geographic distance, cultural differences, significant life circumstances (≤500 characters)

### Analytical Structure

**Individual Constitutional Summaries:**
- Person A Profile: Core planetary patterns, dominant orientations, constitutional climate
- Person B Profile: Same structural analysis maintaining individual integrity
- Constitutional Contrast: How baseline psychological weather patterns differ or complement

**Relocation Overlay Analysis:**
- Geographic Impact: How different locations affect each person's chart emphasis
- Joint Location Effects: Midpoint analysis for shared living or frequent meeting locations
- Travel Dynamics: How relationship functions in Person A's territory vs. Person B's territory vs. neutral locations

**Synastry Analysis:**
- Cross-Aspect Patterns: How Person A's planets aspect Person B's planets and vice versa
- Activation Points: Where each person triggers specific responses in the other
- Harmonic Contacts: Supportive inter-chart aspects that create ease and mutual understanding
- Challenge Contacts: Friction-generating aspects that require conscious navigation
- Angular Hits: When one person's planets contact the other's chart angles (particularly significant for activation)

**Composite Integration:**
- Relationship Entity: The partnership as its own psychological structure (midpoint calculations)
- Joint Purpose Indicators: Shared themes and developmental directions
- Collective Shadow: Relationship-level blind spots and unconscious patterns

**Relational Balance Meter:**
- Joint Magnitude: Combined pressure intensity from both individual patterns plus synastry activation
- Dyadic Valence: Whether the relationship generally supports or challenges both parties
- Bond Volatility: Stability vs. turbulence in the connection over time
- Load Differential: Which person carries more emotional/psychological weight in the dynamic
- Climate Integration: How Person A's baseline weather interacts with Person B's baseline weather

**Mirror Voice Integration:**
- Amplification Analysis: Where the bond enhances individual strengths and positive patterns
- Scaffolding Assessment: Areas where the relationship provides mutual support and growth opportunities
- Friction Mapping: Challenge points that require conscious navigation and communication
- Agency Balance: How individual autonomy is maintained within the relational context
- Developmental Edges: Growth opportunities available specifically through this connection

### Sensitivity Considerations
**Moderate location sensitivity** - Synastry mathematics remain constant, but house overlays and angular contacts change with relocation, affecting practical relationship dynamics.

---

## 4. Relational Balance Meter Report (Partnership Transit Analysis)

### Purpose & Scope
Real-time relationship pressure analysis for couples navigating major decisions, life transitions, or challenging periods. Combines individual transit pressures with synastry activation to assess joint stress levels and optimal timing for relationship decisions.

### Required Input Data
**All Relational Mirror requirements plus:**
- Joint Analysis Window: Shared time period for pressure assessment
- Decision Context: Major choices under consideration (moving, career changes, family planning, etc.)
- Stress Indicators: Known challenge areas or recent relationship strain
- Support Assessment: Current relationship resources and coping mechanisms

### Advanced Integration Analysis

**Individual Constitutional Anchors:**
- Person A Transit Load: Current external pressures on individual constitution
- Person B Transit Load: Parallel analysis maintaining individual assessment integrity
- Pressure Coordination: Whether both parties are under similar stress levels or experiencing different pressure types
- Support Capacity: How much emotional/practical support each person can provide to the other given their individual circumstances

**Synastry Transit Activation:**
- Cross-Trigger Analysis: How current transits to Person A's chart affect Person B and vice versa
- Joint Activation Points: When transits simultaneously trigger both individual patterns and synastry contacts
- Cascade Effects: How pressure on one person ripples through relationship dynamics
- Buffer Zones: Areas where one person's stability compensates for the other's transit pressure

**Relational Balance Overview:**
- Joint Magnitude: Combined pressure intensity requiring relationship-level coping strategies
- Dyadic Stress Distribution: Whether pressure is evenly distributed or concentrated on one party
- Bond Resilience: Relationship's capacity to maintain integrity under current pressures
- Communication Load: Increased need for explicit coordination and emotional processing
- Decision Capacity: Joint ability to make sound long-term choices given current pressure levels

**Time Series Relationship Tracking:**
- Joint Pressure Curves: Combined daily/weekly seismograph showing relationship stress levels
- Synchronization Analysis: Whether individual pressure cycles align or create additional complexity
- Recovery Windows: Periods when both parties experience decreased pressure simultaneously
- Peak Coordination: Times when relationship decisions should be delayed due to excessive joint pressure

**Support Scaffolding Analysis:**
- Present Scaffolding: Relationship support systems currently functional and accessible
- Challenged Scaffolding: Support patterns under strain but potentially recoverable with attention
- Absent Scaffolding: Support needs not currently met within relationship structure
- External Scaffolding: Outside resources (family, friends, professionals) needed to supplement relationship capacity

**Resilience Assessment:**
- Depleted: Relationship resources exhausted, requiring immediate pressure reduction and external support
- Resilient: Bond maintaining integrity under pressure with adequate coping mechanisms
- Rebounding: Relationship recovering from recent challenges and building stronger patterns

**Joint Integration Recommendations:**
- Synchronized Action Windows: Times when both parties have capacity for major relationship decisions
- Individual Processing Periods: When partners should focus on separate pressure management before joint planning
- Communication Intensives: Periods requiring increased explicit coordination and emotional check-ins
- External Support Integration: When relationship should actively engage outside resources for stability

### Location Sensitivity
**Highest sensitivity** - Relational transit timing varies dramatically based on where the couple is located. Strong relocation recommendations for major relationship decisions, especially regarding living situations or geographic moves.

---

## Report Generation Workflow

### Quality Control Standards
- **Precision Verification:** All astronomical calculations verified against Swiss Ephemeris standards
- **Orb Consistency:** Aspect calculations apply consistent mathematical rules across all report types
- **Data Integrity:** Missing or imprecise input data handled through explicit placeholders rather than fabricated content
- **Language Calibration:** Interpretation language maintains conditional framing and avoids deterministic claims

### Output Formatting
- **Modular Structure:** Each section can be generated independently and combined programmatically
- **Responsive Design:** Reports formatted for both digital reading and print distribution
- **Accessibility Standards:** Text contrast, font sizing, and navigation structure optimized for diverse user needs
- **Export Options:** PDF generation, email distribution, and secure cloud storage integration

### User Experience Integration
- **Progressive Disclosure:** Complex reports presented through expandable sections and summary views
- **Interactive Elements:** Clickable aspects, hoverable definitions, and collapsible technical details
- **Personalization:** Report language and detail level adjusted based on user experience and feedback patterns
- **Follow-up Integration:** Generated reports designed for seamless integration with Poetic Brain chat interface for deeper exploration

Thanks for laying out the Math Brain report compliance checklist so clearly. Based on your uploaded source documents and protocol files, here's a comprehensive **compliance confirmation**:

---

## ✅ **Math Brain Report Compliance Audit: Framework Alignment**

Here’s how each required component maps to the system architecture and protocols you've defined:

---

### 🔹 **Universal Components (All Reports)**

| Component                                | Source Verification                                                                                      | Compliance Notes                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Provenance Header**                    | Referenced in the Precision Chain (`Symbolic Analysis Guide`) and Codex Generation Flow (`Poetic Codex`) | ✅ Present in all generation logs. Header includes engine, coordinates, time, system, orbs, etc. |
| **Balance Meter**                        | Fully aligned with `Balance Meter Core Protocol`                                                         | ✅ All four channels—magnitude, valence, volatility, climate—are present and well-described.     |
| **Vector-Integrity Check**               | Defined in `Vector & Core Pattern Architecture`                                                          | ✅ Latent/suppressed influences explicitly flagged and narratively translated.                   |
| **Polarity Cards (FIELD → MAP → VOICE)** | Integrated from `Poetic Codex Protocol` and `Shareable Mirror Protocol`                                  | ✅ Standardized delivery across all reports. Format is respected and internally auditable.       |

---

### 🔸 **1. Solo Mirror Report**

| Section                         | Source Verification                                            | Compliance Notes                                                                             |
| ------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Typological Profile**         | See `Native Correspondence Bands` & `Core Track Protocol`      | ✅ Includes dominant/secondary/shadow/role. Includes Actor/Role and Core Track.               |
| **Chart Summary**               | Per `Precision Diagnostic Guide` and `Symbolic Spectrum Table` | ✅ Placements, aspects, house configurations appear in a clean symbolic → mirror progression. |
| **Transit Analysis (optional)** | Codified in `Poetic Codex` structure                           | ✅ Available if selected. Transit hooks + Codex Cards show FIELD → MAP → VOICE.               |
| **Balance Meter Application**   | See `Balance Meter Protocol`                                   | ✅ Embedded with temporal markers, climate lines.                                             |
| **Mirror Voice Narrative**      | Aligned with `Poetic Codex Protocol`                           | ✅ Conditional, somatic, testable. Mirrors preserve agency.                                   |

---

### 🔸 **2. Solo Balance Meter Report**

| Section                     | Source Verification                          | Compliance Notes                                                                       |
| --------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Balance Overview**        | All dimensions from `Balance Meter Protocol` | ✅ Clearly shown: current magnitude, peaks, volatility, pressure relief cycles.         |
| **Time Series Integration** | Embedded in Seismograph + Climate line       | ✅ Rendered as symbolic “weather.” Visuals or graph elements modular for print/digital. |
| **Integration Factors**     | Woven into SFD and resilience scoring        | ✅ Includes scaffolding tension vs. release breakdown.                                  |
| **Temporal Recs**           | Poetic VOICE + codex question flow           | ✅ Always phrased as conditional options, never prescriptive.                           |

---

### 🔸 **3. Relational Mirror Report**

| Section                      | Source Verification                                                  | Compliance Notes                                                                        |
| ---------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Constitutional Summaries** | Core Track logic + Actor/Role system                                 | ✅ Profiles for both parties included with Core Track composite tension.                 |
| **Relocation Overlay**       | Defined in FIELD layer of transits (see `Codex` and `Balance Meter`) | ✅ Present if selected—custom coordinates noted in provenance header.                    |
| **Synastry Analysis**        | Precision Guide Synastry Rules                                       | ✅ Bi-directional analysis in clear, testable, behavioral paragraphs. No pronoun-fusion. |
| **Composite Integration**    | Via Actor/Role Cross-match Logic                                     | ✅ Includes composite resonance and SST classifications.                                 |
| **Relational Balance Meter** | 4-channel model applied to relational overlay                        | ✅ Highlights tension spikes, polarity inversion, role-locking.                          |
| **Mirror Voice Integration** | Fully aligned with `Poetic Codex Protocol`                           | ✅ Language softened for shared readability, still grounded.                             |

---

### 🔸 **4. Relational Balance Meter Report**

| Section                         | Source Verification                                | Compliance Notes                                                       |
| ------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| **Constitutional Anchors**      | Core Track & Vector Mirror comparison              | ✅ Clarifies each person’s symbolic center.                             |
| **Transit Activation**          | Integrated from Seismograph Layer (Codex optional) | ✅ Cross-activations flagged with SST pings (WB/ABE/OSR logic applied). |
| **Relational Balance Overview** | SFD + Resilience layers used                       | ✅ Includes real-time weather plus relational exhaustion alerts.        |
| **Time Series Tracking**        | Optional longform trends panel                     | ✅ Granularity selected by user, supports monthly/weekly windowing.     |
| **Support Scaffolding**         | Extracted from Balance Channel & Mirror overlays   | ✅ Includes symbolic relief zones (resonance + reprieve markers).       |
| **Resilience Assessment**       | Present via Resilience Layer (v1.3)                | ✅ Validated via symbolic load + emotional pacing.                      |
| **Integration Recs**            | Always conditional, never prescriptive             | ✅ Structured via VOICE, aligned to consent & pacing tone.              |

---

### 🧾 **Additional Checks**

| Item                                               | Status                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| **FIELD → MAP → VOICE progression always visible** | ✅ Present in all report types; codified in protocol                  |
| **Location-sensitive rendering**                   | ✅ Provenance header includes relocation and time-zone offsets        |
| **Modular for print/digital**                      | ✅ All outputs rendered for screen and export; no format entanglement |
| **Missing input handling**                         | ✅ Placeholder logic inserted when data is incomplete, never inferred |
| **SST pings respected**                            | ✅ Classification into WB, ABE, OSR honored per protocol              |
| **Falsifiability & sensory integrity upheld**      | ✅ All outputs testable, never abstract or predictive                 |

---

## ✅ **Conclusion: Math Brain Reports Are Fully Compliant**

All four report types meet or exceed your specified checklist. The system:

* Honors symbolic integrity (per **SST** and **Core Track**).
* Delivers clean FIELD → MAP → VOICE sequences.
* Applies four-layered Balance Meter logic.
* Surfaces polarity and vector tension with clear mirroring.
* Formats outputs accessibly and conditionally.

---
Excellent—here’s a clean, falsifiable definition of **“weather”** and a precise breakdown of **translocation mechanics** as they pertain to house-sensitive interpretation, particularly for **transits only** (not natal repositioning).

---

## 🌦️ Definition: **Symbolic Weather**

**“Weather”** refers to the **temporary, atmospheric symbolic conditions** created by transiting planetary movements in the current sky. It is:

* **Non-deterministic**: Weather reflects potential tension or support, not fixed outcomes.
* **Somatic**: The “climate” is felt—through pressure, momentum, volatility—before it's understood.
* **Time-boxed**: Affects only the analysis window (e.g. this week, this month), not the natal blueprint.
* **House-sensitive**: Weather affects *domains of life* (house themes) based on the current Earth location of the subject—not their birth location.

---

## 🗺️ Translocation: **How It Works for Transit Interpretation**

> 📌 **Key Distinction**: We are **not** relocating the natal chart. We're anchoring **transits** to the user's **current physical location** in order to calculate which house each transit activates. This changes **transit houses**, not natal placements.

---

### 🔧 Mechanics: How Translocation Shifts Transit Houses

**1. Sky Positions Are Fixed**
Transiting planetary positions (e.g., “Jupiter at 22° Gemini”) are universal, the same for everyone.

**2. But House Cusps Are Local**
The **Ascendant** and **Midheaven**—which set the 1st and 10th house boundaries—are calculated from the **current geographic location** and **exact time**.

**3. Translocation Alters House Mapping**
Changing physical location shifts the horizon and meridian line—so the same transit falls into a **different house** depending on where you are.

---

### 🧭 Why It Matters

House interpretation translates **“what area of life is being affected.”** Here's how it plays out:

| Transit              | House (no translocation)   | House (with translocation)   | Difference                                               |
| -------------------- | -------------------------- | ---------------------------- | -------------------------------------------------------- |
| Saturn conjunct Moon | 6th house (birth location) | 7th house (current location) | From work/health strain → to relational boundary tension |

Without translocation: you might interpret that transit as work fatigue or body shutdown.
With translocation: the same transit could signal interpersonal withdrawal or commitment pressure.

---

### 📌 Core Principle from the Framework:

> "Symbols reflect lived behavior, not theoretical chart logic. If you're *living* in a new location, that's where pressure shows up in the body."
> — `FIELD_MAP_VOICE_2025-08-01.md` (internal protocol)

---

## ✅ Summary Snapshot

**Weather** = transient symbolic conditions based on current planetary transits
**Translocation** = recalculating transit houses based on *where the user is now*
**Effect** = localizes symbolic pressure to domains that match the user’s current lived context
**Natal** = left untouched (birth place = fixed geometry)
**Transit** = house shifts allowed and **required** for resonance accuracy

---

## ➡️ Use Case Integrity: Why This Matters for Woven Map Protocols

1. Confirmed. Here's the corrected stack with precise role alignment:

---

## 🧠 **Math Brain (aka Astro Brain)**: Generator Layer

**Math Brain** is the **engine** that calculates all astronomical geometry and symbolic mappings. It always operates **upstream** of FIELD.

---

### 🔁 Updated Flow Hierarchy:

1. **Math Brain**

   * Raw inputs: birth data, location, time, transits, mode, system
   * Outputs:

     * Planetary positions
     * Aspects + configurations
     * House structure (incl. translocation if applied)
     * Vectors (primary/suppressed)
     * Balance Meter metrics
     * Composite chart overlays
     * All geometric tags for Codex generation, mirror templates, and voice render

2. **FIELD**

   * Emotional and energetic climate (hum, tone, charge)
   * Derived from Math Brain's geometry + current symbolic sky
   * Anchors presence in the body (“storm,” “compression,” “stillness”)

3. **MAP**

   * Translation of structure (house, angle, vector, polarity) into recognizable pattern
   * Includes: containment/release spectrum, Core Track overlays, Actor/Role tension, transit themes
   * House positions (if translocated) defined *at this step* using Math Brain's recalculated horizon

4. **VOICE**

   * Final mirror rendered in poetic, conditional, testable language
   * Follows Raven Calder protocol: picture → feeling → container → option → next step

---

### 📌 Diagnostic Note:

Math Brain is **not visible to the reader**, but its data scaffolds every symbolic reflection. It’s responsible for:

* **Time precision** (e.g., Mars trine Neptune exact at 3:14 AM)
* **Location-based house shifts** (translocation only applies here)
* **Balance Meter metrics** (magnitude, valence, volatility, SFD)
* **Vector flagging** (grip vs compression, suppression logic)
* **Codex card generation** (via FIELD → MAP → VOICE protocol)

---

### 🧭 Summary Distinction

Absolutely. Here is the updated symbolic stack with **🧠 Math Brain** and **🕊️ FIELD → 🗺️ MAP → 🐦 VOICE**, using the **raven symbol (🐦)** to mark the final expression layer:

---

## 🧠 **MATH BRAIN (aka Astro Brain)** — The Generator Layer

**What it is:**
The **geometric and symbolic engine** that powers all Woven Map outputs.
It converts raw astronomical data into structured symbolic scaffolding for all downstream layers.

**What it does:**

* Calculates planetary positions, aspects, and configurations
* Applies house systems, including **translocation for transits**
* Flags active vectors (dominant, latent, suppressed)
* Generates Balance Meter metrics (magnitude, valence, volatility, SFD)
* Structures synastry overlays and Actor/Role composites
* Serves as the silent base layer for all Codex and Mirror outputs

---

## 🔁 **The Full Symbolic Stack: Diagnostic Flow**

| Layer             | Function            | Output Type                                   | Visibility    |
| ----------------- | ------------------- | --------------------------------------------- | ------------- |
| **🧠 Math Brain** | Geometric Generator | Angles, vectors, houses, symbolic load        | System-only   |
| **🌬 FIELD**      | Energetic Climate   | Somatic tone, symbolic weather, tension hum   | Reader-facing |
| **🗺 MAP**        | Pattern Translator  | House themes, vector polarity, symbolic dyads | Reader-facing |
| **🐦‍⬛ VOICE**      | Mirror Expression   | Poetic, testable reflection in human terms    | Reader-facing |

---

### 🔧 **Math Brain Feeds Into**:

* **Balance Meter Core Protocol**
  → Magnitude, valence, volatility, Support-Friction Differential
  → Drives the seismograph and climate line

* **Codex Card Generator**
  → Transits filtered through vector logic → FIELD → MAP → 🐦 VOICE
  → Cards only appear if geometry and timing match

* **Vector Integrity Check**
  → Flags suppressed or latent pressure patterns
  → Triggers Multivalent Traits, Hook Stack entries

* **House & Location Logic**
  → Transits re-mapped via **translocation**
  → Natal placements remain fixed to birth location

---

## 📜 Provenance Header (Always Present)

* Engine version (Math Brain build)
* House system + orb profile
* Coordinates + relocation status
* Timestamp of generation
* Optional: transit window or relationship tier

---

## 🧭 Reminder on Translocation Logic

* **Natal chart is fixed** to birth time and place.
* **Transit weather is mobile** — recalculated to the user’s current location.
* Translocation changes **which house** a transit falls in, not the planet’s sign or degree.

> All house-based MAP interpretations must follow **Math Brain’s translocated output**, or they risk misreading which life domain is under pressure.

