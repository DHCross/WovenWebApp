# Specifications System — Document Format Hardening

## Overview

This directory contains canonical specifications with multi-format build system and integrity verification. The goal is to ensure specifications are complete, auditable, and ingestible without special tools.

## Philosophy

**The mirror shouldn't require a periscope.**

- **Markdown as source of truth** — single canonical document under version control
- **Multi-format outputs** — PDF, HTML, TXT, JSON generated from one source
- **Stable section IDs** — precise citations across formats
- **Integrity verification** — SHA-256 checksums for all artifacts
- **Zero tool dependencies** — plain text and HTML work everywhere
- **CI validation guards** — automated checks prevent truncation/corruption

## Directory Structure

```
specs/
├── README.md (this file)
└── symbolic-weather-directive/
    ├── spec.md                          # Canonical source (Markdown)
    ├── glossary.md                      # Term definitions
    ├── tests-acceptance.md              # 18 acceptance tests
    ├── build.js                         # Multi-format generator
    ├── validate.js                      # CI validation script
    ├── manifest.yaml                    # Generated: artifact checksums
    ├── spec.html                        # Generated: standalone HTML
    ├── spec.txt                         # Generated: plain text
    ├── index.html                       # Generated: human landing page
    ├── fixtures/
    │   └── oct04-11.json               # Sample test data
    ├── schemas/
    │   └── display-transform.schema.json
    └── api/
        ├── meta.json                    # Generated: metadata
        ├── anchors.json                 # Generated: section IDs
        └── glossary.json                # Generated: term definitions
```

## Quick Start

### Build Specifications

```bash
# Generate all formats from spec.md
npm run build:specs

# Outputs:
# - spec.html (standalone HTML with TOC)
# - spec.txt (plain text, <1 MB)
# - manifest.yaml (checksums)
# - api/*.json (machine-parseable endpoints)
# - index.html (human landing page)
```

### Validate Specifications

```bash
# Run all validation tests
npm run validate:specs

# Run specific test
npm run validate:specs -- --test=TEST-003

# Tests verify:
# - Section count matches across formats
# - All anchors present in all formats
# - Checksums match manifest
# - Plain text under 1 MB
# - Glossary completeness
# - No external tool dependencies
```

## Specification Features

### Stable Section IDs

Every section has a stable hierarchical ID for precise citation:

```markdown
## §2.3 Solo Mirror Requirements {#2.3-solo-mirror-requirements}
```

- Format: `§X.Y-kebab-case-name`
- Never change between versions (only additions)
- Used consistently in spec, tests, glossary, code
- Enables precise cross-references and diffs

### Line Anchors

Precise line references every 5-10 lines:

```markdown
`[L50]` The directive MUST begin with explicit identity assertion:
```

- Format: `[L###]`
- Enables exact citations and diff tracking
- May shift between versions (not part of contract)
- Density verified by CI (~1 per 5-10 lines)

### Completeness Badge

Page 1 declaration verified by CI:

```
**Completeness Badge:** This document contains 8 parts, 52 sections, 1 glossary, 18 acceptance tests.
```

- Section count MUST match actual sections
- Test count MUST match tests-acceptance.md
- CI fails if counts mismatch

### Integrity Verification

All artifacts listed in `manifest.yaml` with SHA-256 checksums:

```yaml
artifacts:
  - file: spec.md
    sha256: abc123...
  - file: spec.html
    sha256: def456...
```

**Verify locally:**
```bash
sha256sum spec.md
# Compare against manifest.yaml
```

## Multi-Format Outputs

### HTML (spec.html)

- Standalone (no external dependencies)
- Navigation TOC with §ID anchors
- Embedded CSS for styling
- Works in all modern browsers

**Use when:** Interactive navigation needed, web viewing

### Plain Text (spec.txt)

- Under 1 MB for quick AI context loads
- Preserved column alignment in tables
- All line anchors included
- Works in any text editor

**Use when:** AI ingestion, grep/search, minimal overhead

### JSON APIs (api/*.json)

Machine-parseable endpoints:

- **meta.json** — version, checksums, section counts
- **anchors.json** — §ID → line range mapping
- **glossary.json** — term → definition key-value pairs

**Use when:** Programmatic access, selective loading

### Manifest (manifest.yaml)

Central artifact registry with:

- Version and contract information
- SHA-256 checksums for all files
- Render mode and pipeline configuration
- Generation timestamp

**Use when:** Integrity verification, CI validation

## CI Integration

### GitHub Actions Example

```yaml
name: Validate Specs

on: [push, pull_request]

jobs:
  specs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build:specs
      - run: npm run validate:specs
```

### Validation Tests

18 automated tests verify:

1. ✅ Multi-format generation (all files created)
2. ✅ Section count parity (MD = HTML = PDF)
3. ✅ Anchor presence (all §IDs in all formats)
4. ✅ Line anchor density (1 per 5-10 lines)
5. ✅ Manifest hash verification (checksums match)
6. ✅ Completeness badge accuracy (counts correct)
7. ✅ Plain text size limit (<1 MB)
8. ✅ Glossary completeness (≥34 terms)
9. ✅ Data tables present (all required formats)
10. ✅ JSON validity (parseable, schema-compliant)
11. ✅ Quick context size (files under limits)
12. ✅ No tool dependencies (TXT/HTML work everywhere)

**Exit code 0** = all pass (merge allowed)  
**Exit code 1** = failures (merge blocked)

## Update Workflow

### Making Changes

1. **Edit only `spec.md`** (single source of truth)
2. Update version if needed
3. Run `npm run build:specs` to regenerate all formats
4. Run `npm run validate:specs` to verify integrity
5. Review git diff to ensure minimal changes
6. Commit all generated files together
7. Tag with version if releasing

### Version Scheme

Format: `MAJOR.MINOR.PATCH`

- **MAJOR** — Breaking changes to §ID structure or core requirements
- **MINOR** — New sections, features, significant content additions
- **PATCH** — Typo fixes, clarifications, minor updates

Current version: **3.1.0**

### Backward Compatibility Rules

- §IDs MUST remain stable (never rename, only add)
- Line anchors MAY shift (not part of contract)
- Glossary terms MUST NOT be removed (only add/clarify)
- Test IDs MUST remain stable

## Distribution

### ZIP Capsule

Complete package for distribution:

```bash
# Create distribution package
cd specs/symbolic-weather-directive
zip -r symbolic-weather-directive-3.1.0.zip \
  index.html \
  manifest.yaml \
  spec.md \
  spec.html \
  spec.txt \
  glossary.md \
  tests-acceptance.md \
  fixtures/ \
  schemas/ \
  api/
```

**Contents:**
- All formats (MD, HTML, TXT)
- Glossary and tests
- Sample fixtures and schemas
- Machine-parseable JSON APIs
- Landing page (index.html)
- Integrity manifest

### Human Landing Page

Open `index.html` in browser for:

- Links to all formats
- Completeness badge display
- Version and status information
- Integrity verification instructions
- Quick access to glossary and tests

## AI Ingest Strategies

### Quick Context (<100 KB)

For fast loading when full spec not needed:

```bash
# Just metadata and definitions
curl api/meta.json
curl api/glossary.json
```

### Full Context (<1 MB)

Complete specification in plain text:

```bash
# Everything in one file
cat spec.txt
```

### Selective Context

Load specific sections using anchors:

```javascript
// Get section map
const anchors = await fetch('api/anchors.json').then(r => r.json());

// Load specific section by line range
const lines = spec.split('\n');
const section = lines.slice(
  anchors['2.3-solo-mirror-requirements'].line - 1,
  anchors['2.4-relational-engines'].line - 1
);
```

## Troubleshooting

### Build fails with "module not found"

```bash
# Install dependencies
npm install js-yaml
```

### Validation reports hash mismatch

```bash
# Regenerate all artifacts
npm run build:specs
```

### Plain text exceeds 1 MB

Edit `spec.md` to reduce content or split into multiple specs.

### Section count mismatch

Ensure all §IDs follow exact format: `§X.Y-kebab-case` with anchor `{#X.Y-kebab-case}`

## Best Practices

### When Writing Specs

- ✅ Use stable §IDs for all major sections
- ✅ Add line anchors every 5-10 lines
- ✅ Update Completeness Badge when adding sections
- ✅ Keep plain text output under 1 MB
- ✅ Define all terms in glossary.md
- ✅ Add acceptance tests for new requirements

### When Reviewing Changes

- ✅ Run `npm run validate:specs` before merge
- ✅ Verify §IDs haven't changed (only additions)
- ✅ Check manifest hashes are updated
- ✅ Ensure generated files committed together
- ✅ Test index.html in browser

### When Consuming Specs

- ✅ Use plain text for AI context loading
- ✅ Use HTML for human reading with navigation
- ✅ Use JSON APIs for programmatic access
- ✅ Verify checksums from manifest before trusting content
- ✅ Cite specific §IDs for precise references

## Future Enhancements

Potential additions (not yet implemented):

- [ ] PDF generation with pdf-lib (PDF/A-2b, linearized)
- [ ] Automatic changelog generation from git history
- [ ] Visual diff tool for specification changes
- [ ] Search index for full-text queries
- [ ] API versioning and deprecation tracking
- [ ] Multi-language translations with version sync

## Support

For issues or questions:

1. Check `tests-acceptance.md` for test details
2. Run validation with specific test: `npm run validate:specs -- --test=TEST-003`
3. Review build output for errors
4. Consult main project README and MAINTENANCE_GUIDE

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-21  
**Part of:** WovenWebApp Raven Calder System
