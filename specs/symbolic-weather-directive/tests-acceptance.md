# Acceptance Tests — Symbolic Weather Fix Directive v3.1.0

## Test Suite Overview

**Total Tests:** 18
**Categories:** Build, Integrity, Format, Content, AI Ingest
**Pass Criteria:** ALL tests must pass for release acceptance

---

## Build Tests

### TEST-001: Multi-Format Generation
**Description:** Build command produces all required output formats.

**Command:** `npm run build:specs`

**Expected Outputs:**
- `spec.md` (source, already exists)
- `spec.pdf`
- `spec.html`
- `spec.txt`
- `manifest.yaml`
- `api/meta.json`
- `api/anchors.json`
- `api/glossary.json`

**Pass Criteria:** All 8 files exist after build.

**Failure Mode:** Exit code 1 if any file missing.

---

### TEST-002: Build Reproducibility
**Description:** Multiple builds produce identical outputs (deterministic).

**Steps:**
1. Run `npm run build:specs`
2. Capture checksums of all outputs
3. Delete all generated files
4. Run `npm run build:specs` again
5. Compare checksums

**Pass Criteria:** All checksums match between builds.

**Exception:** Timestamp fields in meta.json may differ (excluded from hash).

---

## Integrity Tests

### TEST-003: Section Count Verification
**Description:** PDF section count matches Markdown section count.

**Steps:**
1. Parse `spec.md` and count all §ID markers
2. Parse `spec.pdf` and extract bookmarks/sections
3. Compare counts

**Expected:** 52 sections in both formats

**Pass Criteria:** Counts match exactly.

**Failure Mode:** PDF truncation likely if counts differ.

---

### TEST-004: Anchor Parity
**Description:** All §IDs in Markdown appear in PDF and HTML.

**Steps:**
1. Extract all §ID markers from `spec.md`
2. Search for each §ID in `spec.pdf` (text extraction)
3. Search for each §ID in `spec.html` (DOM inspection)

**Pass Criteria:** 100% of §IDs found in all formats.

**Failure Mode:** Missing anchors indicate format conversion issues.

---

### TEST-005: Line Anchor Density
**Description:** Line anchors appear at expected frequency.

**Steps:**
1. Count total lines in `spec.md`
2. Count `[L###]` markers
3. Calculate density: markers / lines

**Expected Density:** 0.1 to 0.2 (1 per 5-10 lines)

**Pass Criteria:** Density within expected range.

---

### TEST-006: Manifest Hash Verification
**Description:** SHA-256 hashes in manifest match actual file hashes.

**Steps:**
1. For each artifact in `manifest.yaml`:
2. Compute `sha256sum <file>`
3. Compare against manifest value

**Pass Criteria:** All hashes match.

**Failure Mode:** Artifact corruption or manifest out-of-sync.

---

### TEST-007: Completeness Badge Accuracy
**Description:** Counts in Completeness Badge match actual content.

**Steps:**
1. Extract badge from page 1 of spec
2. Parse declared counts (parts, sections, tests)
3. Count actual sections in spec.md
4. Count tests in tests-acceptance.md

**Expected:** 8 parts, 52 sections, 18 tests

**Pass Criteria:** All counts accurate.

---

## Format Tests

### TEST-008: PDF Structure Compliance
**Description:** Generated PDF meets PDF/A-2b requirements.

**Checks:**
- PDF version ≥ 1.4
- Bookmarks present for all §IDs
- Fonts fully embedded (no subsets)
- Logical structure tags present
- Metadata includes Source-Hash field

**Tools:** `pdfinfo`, `pdffonts`, `pdftotext`

**Pass Criteria:** All checks pass.

---

### TEST-009: PDF Linearization
**Description:** PDF is linearized for fast web viewing.

**Command:** `pdfinfo spec.pdf | grep "Optimized"`

**Expected Output:** `Optimized: yes`

**Pass Criteria:** Linearization enabled.

---

### TEST-010: HTML Standalone
**Description:** HTML file works without external dependencies.

**Steps:**
1. Disable network in browser
2. Open `spec.html` locally
3. Verify all styles render
4. Verify TOC navigation works

**Pass Criteria:** Full functionality offline.

---

### TEST-011: Plain Text Size Limit
**Description:** Plain text version is under 1 MB for quick AI loads.

**Command:** `du -k spec.txt`

**Expected:** < 1024 KB

**Pass Criteria:** File size within limit.

---

## Content Tests

### TEST-012: Glossary Completeness
**Description:** Glossary contains required minimum terms.

**Steps:**
1. Parse `glossary.md`
2. Count defined terms (headings + bold terms)

**Expected:** ≥ 34 terms

**Pass Criteria:** Meets or exceeds minimum.

---

### TEST-013: Data Tables Present
**Description:** All required data table formats are documented.

**Required Tables:**
- Planetary Positions
- Aspects Table
- House Cusps

**Pass Criteria:** All 3 table formats appear in spec with column headers.

---

### TEST-014: Stable ID Coverage
**Description:** All referenced stable IDs are defined in spec.

**Steps:**
1. Extract all stable IDs from spec (§X.Y-name format)
2. Find all ID references (links to §IDs)
3. Verify all references point to defined IDs

**Pass Criteria:** No broken internal references.

---

## AI Ingest Tests

### TEST-015: JSON API Schema Validation
**Description:** Generated JSON APIs match expected schemas.

**Files to Validate:**
- `api/meta.json` against meta schema
- `api/anchors.json` against anchors schema
- `api/glossary.json` against glossary schema

**Pass Criteria:** All JSON valid and schema-compliant.

---

### TEST-016: Quick Context Size
**Description:** Quick context files are small enough for fast loading.

**Limits:**
- `api/meta.json` < 10 KB
- `api/glossary.json` < 50 KB
- `tests-acceptance.md` < 20 KB

**Pass Criteria:** All files within size limits.

---

### TEST-017: No External Tool Requirements
**Description:** Spec is readable without special tools.

**Verification:**
1. Open `spec.txt` in basic text editor (cat, less, notepad)
2. Open `spec.html` in any browser
3. Verify both are fully readable

**Pass Criteria:** No tool dependencies.

---

## Integration Tests

### TEST-018: ZIP Capsule Integrity
**Description:** Complete ZIP package contains all required files.

**Required Contents:**
```
symbolic-weather-directive-3.1.0/
  ├── index.html
  ├── manifest.yaml
  ├── spec.md
  ├── spec.pdf
  ├── spec.html
  ├── spec.txt
  ├── glossary.md
  ├── tests-acceptance.md (this file)
  ├── fixtures/oct04-11.json
  ├── schemas/display-transform.schema.json
  └── api/
      ├── meta.json
      ├── anchors.json
      └── glossary.json
```

**Pass Criteria:** All files present in ZIP with correct structure.

---

## Test Execution

### Manual Test Run
```bash
# Run full test suite
npm run validate:specs

# Run individual test
npm run validate:specs -- --test=TEST-003
```

### CI Integration
```yaml
# .github/workflows/specs.yml
- name: Build Specs
  run: npm run build:specs

- name: Validate Specs
  run: npm run validate:specs
```

**CI Gate:** Merge blocked if any test fails.

---

## Test Results Template

```
SYMBOLIC WEATHER DIRECTIVE — TEST RESULTS
Version: 3.1.0
Date: 2025-01-21

BUILD TESTS
  ✅ TEST-001: Multi-Format Generation
  ✅ TEST-002: Build Reproducibility

INTEGRITY TESTS
  ✅ TEST-003: Section Count Verification
  ✅ TEST-004: Anchor Parity
  ✅ TEST-005: Line Anchor Density
  ✅ TEST-006: Manifest Hash Verification
  ✅ TEST-007: Completeness Badge Accuracy

FORMAT TESTS
  ✅ TEST-008: PDF Structure Compliance
  ✅ TEST-009: PDF Linearization
  ✅ TEST-010: HTML Standalone
  ✅ TEST-011: Plain Text Size Limit

CONTENT TESTS
  ✅ TEST-012: Glossary Completeness
  ✅ TEST-013: Data Tables Present
  ✅ TEST-014: Stable ID Coverage

AI INGEST TESTS
  ✅ TEST-015: JSON API Schema Validation
  ✅ TEST-016: Quick Context Size
  ✅ TEST-017: No External Tool Requirements

INTEGRATION TESTS
  ✅ TEST-018: ZIP Capsule Integrity

SUMMARY: 18/18 PASSED
STATUS: ✅ READY FOR RELEASE
```

---

**Version:** 3.1.0
**Last Updated:** 2025-01-21
**Next Review:** After each spec version increment
