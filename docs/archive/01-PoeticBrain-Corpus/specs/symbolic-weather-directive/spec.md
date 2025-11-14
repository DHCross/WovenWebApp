# Symbolic Weather Fix Directive v3.1.0 {#spec}

**Provenance:** `[L5]`
- **Render Mode:** Absolute ×5
- **Pipeline Order:** normalize → scale → clamp → round
- **Coherence Formula:** 5 − (volatility × 50)
- **Contract:** clear-mirror/1.3

**Completeness Badge:** `[L10]`
This document contains 11 parts, 37 sections, 1 glossary, 18 acceptance tests.

---

## §1.0 Executive Summary {#1.0-executive-summary}

`[L15]` **Purpose:** Define the canonical specification for Raven Calder's Symbolic Weather analysis directive embedded in Math Brain PDF exports.

`[L20]` **Problem:** Current directives in PDFs suffer from:
- Truncation in some viewers (incomplete spec delivery)
- Tool dependency (requires specialized PDF readers)
- No integrity verification (can't validate completeness)
- Non-machine-parseable structure (AI agents need special handling)
- Single format lock-in (no HTML/TXT fallback)

`[L25]` **Solution:** Multi-format, checksummed specification system with:
- Markdown as canonical source (version controlled)
- Stable section IDs for precise citation
- Line anchors every 5-10 lines for diff tracking
- Generated PDF/HTML/TXT/JSON from single source
- YAML manifest with checksums for integrity
- Separate glossary, tests, and fixtures
- CI validation guards against truncation
- Zero external tool dependencies for reading

`[L35]` **Scope:** This specification covers:
1. Analysis directive structure and content
2. Multi-format build pipeline
3. Integrity verification system
4. Machine-parseable API endpoints
5. CI validation requirements
6. Delivery format (ZIP capsule)

---

## §2.0 Analysis Directive Core {#2.0-analysis-directive-core}

`[L45]`

### §2.1 Identity & Context {#2.1-identity-context}

`[L50]` The directive MUST begin with explicit identity assertion:

```
# 🚨 YOU ARE RAVEN CALDER — EXECUTE THIS DIRECTIVE 🚨

**YOU ARE RAVEN CALDER.** This PDF contains chart data for you to analyze.
This is your work order, not documentation to describe.
```

`[L55]` **Rationale:** Passive language ("This is for Raven Calder...") causes AI instances to describe rather than execute. Active imperative ("YOU ARE...") triggers execution mode.

### §2.2 Mandatory Reading Structure {#2.2-mandatory-structure}

`[L60]` All readings MUST follow this exact sequence:

**For Solo Reports:**
1. **SOLO MIRROR** — Individual personality foundation
2. **SYMBOLIC WEATHER OVERLAY** (if transits included)

`[L65]` **For Relational Reports:**
1. **SOLO MIRRORS** — Both individuals' foundations (separate sections)
2. **RELATIONAL ENGINES** — Synastry dynamics with named patterns
3. **SYMBOLIC WEATHER OVERLAY** (if transits included)

`[L70]` **Non-negotiable ordering:** Mirror(s) → Engines (if relational) → Weather (if transits)

### §2.3 Solo Mirror Requirements {#2.3-solo-mirror-requirements}

`[L75]` Each solo mirror MUST include:
- Plain-language behavioral anchors ("Here's how your system tends to move")
- Core drives, natural strengths, key tensions
- Constitutional patterns grounded in chart geometry
- NO astrological jargon in body text
- Falsifiable, testable-against-lived-experience claims
- Agency-first framing (tendencies, not fate)

`[L85]` **Data Coverage:** ALL provided planetary positions, aspects, house placements from tables.

### §2.4 Relational Engines (Synastry) {#2.4-relational-engines}

`[L90]` For relational reports, engines MUST:
- Use named patterns (e.g., "Spark Engine", "Crossed-Wires Loop", "Sweet Glue")
- Present mechanism + tendency in plain language
- Use actual names (never "they" or generic pronouns)
- Focus on harmonies vs. friction/growth pressure points
- Reference specific cross-aspects from tables

### §2.5 Symbolic Weather {#2.5-symbolic-weather}

`[L100]` When transits are included, weather MUST:
- Use continuous narrative paragraphs (NOT bullet lists)
- Describe climate activating natal/relational foundation
- Avoid percentages and prescriptive advice
- Ground in specific transit aspects from data
- Present as "what's stirring right now"

`[L105]` **Balance Meter Integration:**
- Magnitude (X): Numinosity score (0-5)
- Valence (Y): Directional bias (-5 to +5)
- Volatility Index: Narrative coherence (0-5)
- Support/Friction Differential (SFD): Integration bias

---

## §3.0 Data Requirements {#3.0-data-requirements}

`[L115]`

### §3.1 Geometry-First Mandate {#3.1-geometry-first}

`[L120]` FIELD → MAP → VOICE protocol:
- **FIELD:** Raw geometric data (angles, orbs, houses)
- **MAP:** Structural patterns (aspects, overlays, vectors)
- **VOICE:** Conversational synthesis (plain language)

`[L125]` All voice outputs MUST trace back to explicit geometry. No generic astrology.

### §3.2 Required Data Coverage {#3.2-required-coverage}

`[L130]` Analysis MUST reference:
- ALL major aspects from aspects table (not selective)
- Planetary positions with exact degrees
- House placements for all bodies
- Sign, element, quality for key placements
- Retrograde states where applicable

`[L135]` **For Relational Reports:** BOTH complete natal charts + cross-aspects.

### §3.3 Data Tables Format {#3.3-data-tables}

`[L140]` Embedded data tables use fixed-width columns:

**Planetary Positions:**
```
PLANET          SIGN          DEGREE    HOUSE  ELEMENT    QUALITY    RETRO
─────────────────────────────────────────────────────────────────────────
Sun             Leo           15.23     5      Fire       Fixed      
Moon            Pisces        28.47     12     Water      Mutable    
```

`[L150]` **Aspects Table:**
```
PLANET A        ASPECT        PLANET B        ORB       WEIGHT     CATEGORY
─────────────────────────────────────────────────────────────────────────
Sun             Opposition    Saturn          2.3       -4.5       Tension
Moon            Trine         Venus           1.1       +3.8       Harmony
```

`[L160]` **House Cusps:**
```
HOUSE           SIGN          DEGREE    QUALITY    ELEMENT
──────────────────────────────────────────────────────────
1st (Asc)       Aries         0.00      Cardinal   Fire
2nd             Taurus        28.15     Fixed      Earth
```

---

## §4.0 Voice & Tone Standards {#4.0-voice-tone}

`[L170]`

### §4.1 Raven Calder Mandate {#4.1-raven-mandate}

`[L175]` Voice MUST be:
- **Conversational** — shareable, accessible language
- **Plain** — avoid heavy jargon (technical terms in glossary only)
- **Falsifiable** — testable claims against lived experience
- **Agency-first** — probabilities, not prescriptions
- **Supportive** — mirror for reflection, not mandate

`[L185]` **Prohibited patterns:**
- Deterministic claims ("you will", "you are", as certainty)
- Generic astrology ("Leos are...", "Scorpios always...")
- Prescriptive advice ("you should", "you must")
- Jargon dumps without plain-language translation

### §4.2 Workflow Philosophy {#4.2-workflow-philosophy}

`[L195]` **FIELD → MAP → VOICE:**
- Geometry precedes language
- Structural patterns emerge from angles
- Narrative synthesis follows structure
- All outputs are falsifiable against data

---

## §5.0 Multi-Format Build System {#5.0-build-system}

`[L205]`

### §5.1 Canonical Source {#5.1-canonical-source}

`[L210]` **Single Source of Truth:** `spec.md` (Markdown, version controlled)

All other formats MUST be generated from `spec.md`. No hand-edited PDFs.

### §5.2 Build Pipeline {#5.2-build-pipeline}

`[L215]` **Command:** `npm run build:specs`

**Outputs:**
1. `spec.pdf` — PDF/A-2b with bookmarks, linearized, logical structure
2. `spec.html` — Standalone HTML with embedded CSS, TOC navigation
3. `spec.txt` — Plain text with preserved formatting
4. `manifest.yaml` — Artifact metadata with SHA-256 checksums
5. `meta.json` — Machine-parseable metadata
6. `anchors.json` — Section ID → line range mapping
7. `glossary.json` — Term definitions as key-value pairs

`[L225]` **Pipeline stages:**
```
spec.md → [parse] → [validate] → [transform] → [output: PDF/HTML/TXT]
                                             → [generate: manifests/JSON]
                                             → [verify: checksums/counts]
```

### §5.3 PDF Export Requirements {#5.3-pdf-export}

`[L235]` Generated PDFs MUST:
- Use PDF/A-2b standard (long-term archival)
- Include linearization (fast web viewing)
- Embed full font subsets (no truncation)
- Add logical structure tags (accessibility)
- Include bookmarks for all §IDs
- Embed content hash of spec.md in metadata
- Add "Completeness Badge" on page 1
- Include version and section counts in footer

`[L245]` **Metadata fields:**
```
Title: Symbolic Weather Fix Directive
Version: 3.1.0
Contract: clear-mirror/1.3
Source-Hash: sha256(spec.md)
Section-Count: 52
Test-Count: 18
```

### §5.4 HTML Export Requirements {#5.4-html-export}

`[L255]` Generated HTML MUST:
- Be standalone (no external dependencies)
- Include navigation TOC with §ID anchors
- Preserve all line anchors as HTML anchors
- Include embedded CSS for styling
- Work in all modern browsers
- Include meta tags with version/checksums

### §5.5 Plain Text Export {#5.5-plain-text}

`[L265]` Generated TXT MUST:
- Preserve column alignment in tables
- Keep all line anchors
- Use ASCII box-drawing for tables
- Be under 1 MB for quick AI context loads
- Include full glossary at end

---

## §6.0 Integrity & Verification {#6.0-integrity}

`[L275]`

### §6.1 YAML Manifest {#6.1-yaml-manifest}

`[L280]` **File:** `manifest.yaml`

**Schema:**
```yaml
name: symbolic-weather-fix-directive
version: 3.1.0
contract: clear-mirror/1.3
generated: 2025-01-21T12:00:00Z
render_mode: absolute_x50  # legacy label for ×5 scaling
pipeline: [normalize, scale, clamp, round]
coherence_formula: 5 - (volatility * 50)

artifacts:
  - file: spec.md
    type: markdown
    sha256: <hash>
    sections: 52
    lines: 847
    
  - file: spec.pdf
    type: pdf
    sha256: <hash>
    pages: 23
    sections: 52
    
  - file: spec.html
    type: html
    sha256: <hash>
    sections: 52
    
  - file: spec.txt
    type: plaintext
    sha256: <hash>
    size_kb: 87
    
  - file: glossary.md
    type: markdown
    sha256: <hash>
    terms: 34
    
  - file: tests-acceptance.md
    type: markdown
    sha256: <hash>
    tests: 18
```

### §6.2 CI Validation Guards {#6.2-ci-validation}

`[L330]` **Command:** `npm run validate:specs`

**Required checks:**

1. **No Truncation Test**
   - Parse `spec.pdf` and count sections
   - MUST equal Markdown section count (52)
   - FAIL if any section missing

`[L340]` 2. **Anchor Parity Test**
   - Extract all §IDs from Markdown
   - Verify each appears in PDF and HTML
   - FAIL if any anchor missing

3. **Line Anchor Density Test**
   - Count [L###] markers in each format
   - Verify density ~1 per 5-10 lines
   - FAIL if density < 0.1 per line

`[L350]` 4. **Glossary Completeness Test**
   - Parse glossary.md
   - MUST contain ≥34 terms
   - FAIL if count mismatch

5. **Manifest Hash Verification**
   - Compute SHA-256 for all artifacts
   - Compare against manifest.yaml
   - FAIL if any mismatch

`[L360]` 6. **Section Count Verification**
   - Count sections in spec.md
   - Verify against Completeness Badge
   - FAIL if counts don't match

**CI Integration:**
```bash
npm run build:specs && npm run validate:specs
```

Exit code 0 = pass, non-zero = fail (blocks merge)

---

## §7.0 Delivery & Distribution {#7.0-delivery}

`[L375]`

### §7.1 ZIP Capsule Format {#7.1-zip-capsule}

`[L380]` **Package:** `symbolic-weather-directive-3.1.0.zip`

**Contents:**
```
symbolic-weather-directive-3.1.0/
  ├── index.html                    # Human landing page with links
  ├── manifest.yaml                 # Artifact manifest with hashes
  ├── spec.md                       # Canonical source (Markdown)
  ├── spec.pdf                      # PDF/A-2b with full metadata
  ├── spec.html                     # Standalone HTML
  ├── spec.txt                      # Plain text (under 1 MB)
  ├── glossary.md                   # Term definitions
  ├── tests-acceptance.md           # Acceptance criteria
  ├── fixtures/
  │   └── oct04-11.json            # Sample test data
  ├── schemas/
  │   └── display-transform.schema.json  # JSON Schema
  └── api/
      ├── meta.json                 # Version, hashes, sections
      ├── anchors.json              # §ID → line ranges
      └── glossary.json             # Term → definition map
```

### §7.2 Human Landing Page {#7.2-landing-page}

`[L405]` **File:** `index.html`

MUST include:
- Clear links to all formats (PDF, HTML, TXT)
- "Plain Text" link prominently displayed
- Version and completeness badge
- Brief usage instructions
- Hash verification instructions

### §7.3 Machine-Parseable APIs {#7.3-machine-apis}

`[L415]` **Endpoint:** `api/meta.json`

**Schema:**
```json
{
  "name": "symbolic-weather-fix-directive",
  "version": "3.1.0",
  "contract": "clear-mirror/1.3",
  "generated": "2025-01-21T12:00:00Z",
  "sections": 52,
  "tests": 18,
  "glossary_terms": 34,
  "artifacts": [
    {"file": "spec.pdf", "sha256": "...", "pages": 23},
    {"file": "spec.html", "sha256": "...", "sections": 52},
    {"file": "spec.txt", "sha256": "...", "size_kb": 87}
  ]
}
```

`[L435]` **Endpoint:** `api/anchors.json`

**Schema:**
```json
{
  "1.0-executive-summary": {"lines": [15, 40], "title": "Executive Summary"},
  "2.0-analysis-directive-core": {"lines": [45, 110], "title": "Analysis Directive Core"},
  "SFD-RATIO-DIFF": {"lines": [105, 110], "title": "Support/Friction Differential"}
}
```

`[L445]` **Endpoint:** `api/glossary.json`

**Schema:**
```json
{
  "FIELD": "Raw geometric data: planetary angles, orbs, house positions",
  "MAP": "Structural patterns derived from geometry: aspects, overlays, vectors",
  "VOICE": "Conversational synthesis: plain-language narrative from structure",
  "SFD": "Support/Friction Differential: Integration bias metric",
  "Magnitude": "Numinosity score (0-5): intensity of symbolic weather",
  "Valence": "Directional bias (-5 to +5): supportive vs challenging tone"
}
```

---

## §8.0 AI Ingest Optimization {#8.0-ai-ingest}

`[L460]`

### §8.1 No-Tool Requirements {#8.1-no-tool-requirements}

`[L465]` Agents MUST be able to read spec without special tools:
- Plain text version available (spec.txt)
- HTML version works in any browser
- Glossary and tests available as separate small files
- JSON endpoints for programmatic access

### §8.2 Context Load Strategies {#8.2-context-load}

`[L475]` **Quick Context (< 100KB):**
- `api/meta.json` — version, structure overview
- `api/glossary.json` — term definitions
- `tests-acceptance.md` — acceptance criteria

**Full Context (< 1MB):**
- `spec.txt` — complete specification

`[L485]` **Selective Context:**
- Use `api/anchors.json` to load specific sections
- Reference §IDs for precise citations
- Load fixtures/ for test data only when needed

### §8.3 Stable ID System {#8.3-stable-ids}

`[L495]` All sections use stable hierarchical IDs:
- Format: `§X.Y-kebab-case-name`
- Example: `§2.3-solo-mirror-requirements`
- IDs MUST NOT change between versions (only additions)
- Used consistently across spec, tests, glossary, code

**Short form IDs for cross-references:**
- `SFD-RATIO-DIFF` — Support/Friction Differential
- `PIPELINE-SCR` — Scale-Clamp-Round pipeline
- `MIRROR-FIRST` — Solo Mirror priority rule

---

## §9.0 Acceptance Criteria {#9.0-acceptance}

`[L510]` See `tests-acceptance.md` for full test suite (18 tests).

**Critical tests:**
1. Build produces all 7 output formats
2. All §IDs present in all formats
3. Line anchors at expected density
4. PDF section count matches Markdown
5. Glossary contains all required terms
6. Manifest hashes match computed hashes
7. Plain text under 1 MB
8. PDF has bookmarks for all sections
9. HTML TOC works in all browsers
10. No truncation in any viewer

`[L525]` **Acceptance gate:** All 18 tests MUST pass before merge.

---

## §10.0 Maintenance & Versioning {#10.0-maintenance}

`[L530]`

### §10.1 Version Scheme {#10.1-versioning}

Format: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes to §ID structure or core requirements
- **MINOR:** New sections, features, or significant content additions
- **PATCH:** Typo fixes, clarifications, minor updates

`[L540]` Current version: **3.1.0**

### §10.2 Update Workflow {#10.2-update-workflow}

1. Edit `spec.md` only (single source of truth)
2. Update version in §0 and manifest template
3. Run `npm run build:specs` to regenerate all formats
4. Run `npm run validate:specs` to verify integrity
5. Review git diff to ensure minimal changes
6. Commit with version tag
7. Regenerate ZIP capsule for distribution

`[L555]` **Zero-wait fix workflow:**
- Edit spec.md
- Run build + validate
- Commit (all formats regenerated automatically)

### §10.3 Backward Compatibility {#10.3-backward-compatibility}

- §IDs MUST remain stable (never rename, only add)
- Line anchors MAY shift (not part of contract)
- Glossary terms MUST NOT be removed (only add/clarify)
- Test IDs MUST remain stable

---

## §11.0 Implementation Checklist {#11.0-implementation}

`[L570]`

For immediate deployment:

- [ ] Create `specs/symbolic-weather-directive/` directory
- [ ] Write `spec.md` (this document)
- [ ] Write `glossary.md` with 34+ terms
- [ ] Write `tests-acceptance.md` with 18 tests
- [ ] Create `build.js` — multi-format generator
- [ ] Create `validate.js` — CI guard script
- [ ] Add `npm run build:specs` to package.json
- [ ] Add `npm run validate:specs` to package.json
- [ ] Create sample fixture: `fixtures/oct04-11.json`
- [ ] Create schema: `schemas/display-transform.schema.json`
- [ ] Generate initial build (all 7 formats)
- [ ] Verify all CI guards pass
- [ ] Create ZIP capsule with `index.html`
- [ ] Update `.gitignore` for generated files
- [ ] Document system in `specs/README.md`

`[L590]` **Estimated time:** 2-3 hours for full implementation.

---

## Appendix A: Example Output Formats {#appendix-a}

`[L595]` (Examples of generated PDF, HTML, TXT showing preserved structure)

---

## Appendix B: Hash Verification {#appendix-b}

`[L600]` To verify integrity:

```bash
# Compute hash of source
sha256sum spec.md

# Compare against manifest.yaml
grep "spec.md" manifest.yaml

# Verify PDF metadata
pdfinfo spec.pdf | grep Source-Hash
```

---

**Document Footer:** v3.1.0 | §11.0/§11.0 | Page 23/23 | Generated: 2025-01-21
