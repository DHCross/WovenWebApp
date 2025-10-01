# Linter Specifications for Automated Enforcement

**Last Updated:** October 1, 2025  
**Extracted From:** RavenCalder_Corpus_Complete_9.25.25.md  
**Status:** Active Technical Specification

---

## Overview

This document defines automated quality checks (linters) to ensure the Raven Calder corpus maintains its structural and stylistic integrity. These rules enforce the **Frontstage/Backstage separation**, validate YAML structure, and prevent common quality issues.

---

## Core Principles

### Frontstage vs. Backstage Separation

**Frontstage** content (user-facing):
- Must use plain, conversational language
- Cannot contain technical astrological terms
- Must be falsifiable and possibility-based
- Should be emotionally resonant but not generic

**Backstage** content (operator/developer):
- May contain technical terms
- Includes geometric calculations
- Contains diagnostic notes
- Not shown to end users

---

## Linter 1: Frontstage Content Validator

### Purpose

Scan all user-facing text blocks for forbidden technical keywords to enforce the Frontstage voice requirements.

### Scope

**Files/Blocks to Check:**
- All Poetic Codex `Card.Poem` fields
- `Initial_Reading_Mode.Plain_Voice_Blocks.*` fields
- Any content marked with `FRONTSTAGE` tags
- Report "Frontstage Preface" sections
- Report "Mirror" sections (when not in technical backstage)

**Files/Blocks to Skip:**
- `Mirror_Engine.Diagnostic_Notes` fields
- `Astro_Signature.*` fields
- Content marked with `BACKSTAGE` tags
- Technical documentation files

### Forbidden Keywords

#### Planet Names
- Sun
- Moon
- Mercury
- Venus
- Mars
- Jupiter
- Saturn
- Uranus
- Neptune
- Pluto
- Chiron

#### Sign Names
- Aries
- Taurus
- Gemini
- Cancer
- Leo
- Virgo
- Libra
- Scorpio
- Sagittarius
- Capricorn
- Aquarius
- Pisces

#### Angle/Point Names
- ASC
- Ascendant
- MC
- Midheaven
- IC
- Imum Coeli
- DSC
- Descendant
- North Node
- South Node
- Part of Fortune

#### Technical Terms
- degrees
- orbs
- conjunction
- opposition
- square
- trine
- sextile
- quintile
- aspects
- house (when referring to astrological houses)
- natal
- transit
- synastry
- progressed
- return
- retrograde (unless used in non-technical context)

### Implementation

```javascript
// Pseudocode
function lintFrontstage(content, filePath, lineNumber) {
  const forbiddenTerms = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 
    'Uranus', 'Neptune', 'Pluto', 'Chiron',
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    'ASC', 'Ascendant', 'MC', 'Midheaven', 'IC', 'DSC', 'Descendant',
    'North Node', 'South Node', 'Part of Fortune',
    'degrees', 'orbs', 'conjunction', 'opposition', 'square', 'trine', 
    'sextile', 'aspects', 'natal', 'transit', 'synastry'
  ];
  
  const violations = [];
  
  for (const term of forbiddenTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = content.match(regex);
    
    if (matches) {
      violations.push({
        file: filePath,
        line: lineNumber,
        term: term,
        count: matches.length,
        severity: 'ERROR'
      });
    }
  }
  
  return violations;
}
```

### Exception Handling

**Allowed Exceptions:**
- "retrograde" when used metaphorically ("retrograde motion in my thinking")
- "house" when referring to physical buildings ("went back to the house")
- "transit" when referring to physical travel ("public transit")

**Implementation:** Use context checking or manual review for edge cases.

### Output Format

```
ERROR: Frontstage violation in /path/to/file.md:42
  Forbidden term: "Saturn"
  Context: "...when Saturn squares your Moon..."
  Suggestion: Rewrite using plain language or move to Diagnostic_Notes

ERROR: Frontstage violation in /path/to/file.md:87
  Forbidden term: "conjunction"
  Context: "...the conjunction of Mars and Venus..."
  Suggestion: Use "meeting" or "alignment" or move to backstage
```

---

## Linter 2: Poetic Codex Structure Validator

### Purpose

Ensure all Poetic Codex cards follow the mandated structure: **Poem first, pure, then explanation**.

### Rules

#### Rule 2.1: Poem Block Required
- Every card MUST have a `Card.Poem` field
- `Card.Poem` MUST be a non-empty string

#### Rule 2.2: Poem Purity
- `Card.Poem` MUST NOT contain:
  - Emoji characters (🔴, 🟠, etc.)
  - Image links (`![...]`)
  - Table syntax (`|`, `---`)
  - Keywords: "Legend", "Explanation Table", "FIELD", "MAP", "VOICE" (these belong in separate sections)

#### Rule 2.3: Explanation Separation
- If an explanation table exists, it MUST appear in a separate section
- Explanation table MUST NOT appear within `Card.Poem`

#### Rule 2.4: Color Code Isolation
- Emoji color codes (🔴🟠🟢🔵🟣⚪⚫) MUST only appear in:
  - Explanation tables
  - Legend sections
  - `Mirror_Engine.Diagnostic_Notes`
- They MUST NOT appear in `Card.Poem`

### Implementation

```javascript
function lintPoeticCodexStructure(card, cardId) {
  const violations = [];
  
  // Rule 2.1: Poem Block Required
  if (!card.Card?.Poem || card.Card.Poem.trim() === '') {
    violations.push({
      cardId: cardId,
      rule: '2.1',
      severity: 'ERROR',
      message: 'Card.Poem field is required and must not be empty'
    });
  }
  
  // Rule 2.2: Poem Purity - Check for emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;
  if (emojiRegex.test(card.Card?.Poem || '')) {
    violations.push({
      cardId: cardId,
      rule: '2.2',
      severity: 'ERROR',
      message: 'Card.Poem must not contain emoji characters'
    });
  }
  
  // Rule 2.2: Poem Purity - Check for forbidden keywords
  const forbiddenInPoem = ['Legend', 'Explanation Table', 'FIELD', 'MAP', 'VOICE'];
  for (const keyword of forbiddenInPoem) {
    if ((card.Card?.Poem || '').includes(keyword)) {
      violations.push({
        cardId: cardId,
        rule: '2.2',
        severity: 'ERROR',
        message: `Card.Poem must not contain keyword: "${keyword}"`
      });
    }
  }
  
  // Rule 2.3: Explanation Separation
  const tableMarker = /\|.*\|/;
  if (tableMarker.test(card.Card?.Poem || '')) {
    violations.push({
      cardId: cardId,
      rule: '2.3',
      severity: 'ERROR',
      message: 'Card.Poem must not contain table syntax; use separate explanation section'
    });
  }
  
  return violations;
}
```

### Output Format

```
ERROR: Poetic Codex structure violation in card_20251001_123456
  Rule: 2.2
  Message: Card.Poem must not contain emoji characters
  Location: Card.Poem line 3

WARNING: Poetic Codex structure violation in card_20251001_789012
  Rule: 2.3
  Message: Card.Poem must not contain table syntax
  Suggestion: Move explanation table to separate section
```

---

## Linter 3: YAML Frontmatter Validator

### Purpose

Check for the presence and format of required YAML frontmatter fields in all report templates and cards.

### Required Fields for All Report Types

```yaml
---
VERSION: string (must match document top-level version)
Report_Type: enum (Solo Mirror | Relational Mirror | Solo Balance | Relational Balance)
Diagnostic_Notes: string (operator-only)
Socratic_Prompt: string (user-facing)
Prompt_Generation_Method: string (brief logic summary)
Hook_Stack_Geometry: string (operator-only)
resonance_status: enum (Pending | Confirmed | OSR)
---
```

### Validation Rules

#### Rule 3.1: All Required Fields Present
```javascript
const requiredFields = [
  'VERSION',
  'Report_Type',
  'Diagnostic_Notes',
  'Socratic_Prompt',
  'Prompt_Generation_Method',
  'Hook_Stack_Geometry',
  'resonance_status'
];
```

#### Rule 3.2: VERSION Format
- Must be a string
- Must match pattern: `YYYY-MM-DD vX.Y` or `YYYY-MM-DD vX.Y.Z`
- Example: `"2025-09-22 v24.3"`

#### Rule 3.3: Report_Type Enumeration
Allowed values:
- `"Solo Mirror"`
- `"Relational Mirror"`
- `"Solo Balance"`
- `"Relational Balance"`

#### Rule 3.4: resonance_status Enumeration
Allowed values:
- `"Pending"` - Awaiting user confirmation
- `"Confirmed"` - User has confirmed resonance
- `"OSR"` - Out of Symbolic Range (no resonance)

### Implementation

```javascript
function lintYAMLFrontmatter(frontmatter, filePath) {
  const violations = [];
  const requiredFields = [
    'VERSION', 'Report_Type', 'Diagnostic_Notes', 'Socratic_Prompt',
    'Prompt_Generation_Method', 'Hook_Stack_Geometry', 'resonance_status'
  ];
  
  // Rule 3.1: Required Fields
  for (const field of requiredFields) {
    if (!(field in frontmatter)) {
      violations.push({
        file: filePath,
        rule: '3.1',
        severity: 'ERROR',
        message: `Missing required field: ${field}`
      });
    }
  }
  
  // Rule 3.2: VERSION Format
  if (frontmatter.VERSION) {
    const versionPattern = /^\d{4}-\d{2}-\d{2} v\d+\.\d+(\.\d+)?$/;
    if (!versionPattern.test(frontmatter.VERSION)) {
      violations.push({
        file: filePath,
        rule: '3.2',
        severity: 'ERROR',
        message: `VERSION format invalid: "${frontmatter.VERSION}". Expected: "YYYY-MM-DD vX.Y"`
      });
    }
  }
  
  // Rule 3.3: Report_Type Enumeration
  const validReportTypes = [
    'Solo Mirror', 'Relational Mirror', 
    'Solo Balance', 'Relational Balance'
  ];
  if (frontmatter.Report_Type && !validReportTypes.includes(frontmatter.Report_Type)) {
    violations.push({
      file: filePath,
      rule: '3.3',
      severity: 'ERROR',
      message: `Invalid Report_Type: "${frontmatter.Report_Type}". Must be one of: ${validReportTypes.join(', ')}`
    });
  }
  
  // Rule 3.4: resonance_status Enumeration
  const validStatuses = ['Pending', 'Confirmed', 'OSR'];
  if (frontmatter.resonance_status && !validStatuses.includes(frontmatter.resonance_status)) {
    violations.push({
      file: filePath,
      rule: '3.4',
      severity: 'ERROR',
      message: `Invalid resonance_status: "${frontmatter.resonance_status}". Must be one of: ${validStatuses.join(', ')}`
    });
  }
  
  return violations;
}
```

### Output Format

```
ERROR: YAML frontmatter violation in /reports/2025-10-01-reading.md
  Rule: 3.1
  Message: Missing required field: Socratic_Prompt

ERROR: YAML frontmatter violation in /reports/2025-10-01-reading.md
  Rule: 3.3
  Message: Invalid Report_Type: "Solo Reading". Must be one of: Solo Mirror, Relational Mirror, Solo Balance, Relational Balance
```

---

## Linter 4: Placeholder Detector

### Purpose

Scan the entire document for any remaining placeholder tags to ensure all content has been properly inlined or resolved.

### Placeholder Patterns

#### Pattern 4.1: Content From Placeholders
- Pattern: `[Content from ...]`
- Example: `[Content from section 2.3]`

#### Pattern 4.2: File Reference Placeholders
- Pattern: `file://...`
- Example: `file:///path/to/document.md`

#### Pattern 4.3: TODO/TBD Markers
- Pattern: `TODO:`, `TBD:`, `FIXME:`, `XXX:`
- Example: `TODO: Add example here`

#### Pattern 4.4: Ellipsis Placeholders
- Pattern: `...` when used as content placeholder (not punctuation)
- Context-sensitive: flag only when alone on a line or in technical fields

### Implementation

```javascript
function lintPlaceholders(content, filePath) {
  const violations = [];
  const lines = content.split('\n');
  
  const placeholderPatterns = [
    { pattern: /\[Content from .*?\]/, severity: 'ERROR', message: 'Content placeholder not resolved' },
    { pattern: /file:\/\//, severity: 'ERROR', message: 'File reference placeholder not resolved' },
    { pattern: /\bTODO:/i, severity: 'WARNING', message: 'TODO marker present' },
    { pattern: /\bTBD:/i, severity: 'WARNING', message: 'TBD marker present' },
    { pattern: /\bFIXME:/i, severity: 'WARNING', message: 'FIXME marker present' },
    { pattern: /\bXXX:/i, severity: 'WARNING', message: 'XXX marker present' },
  ];
  
  lines.forEach((line, index) => {
    for (const { pattern, severity, message } of placeholderPatterns) {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: index + 1,
          severity: severity,
          message: message,
          context: line.trim()
        });
      }
    }
    
    // Pattern 4.4: Standalone ellipsis
    if (line.trim() === '...' || line.trim() === '…') {
      violations.push({
        file: filePath,
        line: index + 1,
        severity: 'WARNING',
        message: 'Standalone ellipsis may be a placeholder',
        context: line.trim()
      });
    }
  });
  
  return violations;
}
```

### Output Format

```
ERROR: Placeholder detected in /docs/report-template.md:145
  Message: Content placeholder not resolved
  Context: [Content from section 3.2]

WARNING: Placeholder detected in /docs/implementation-guide.md:67
  Message: TODO marker present
  Context: TODO: Add code example here

ERROR: Placeholder detected in /docs/integration.md:23
  Message: File reference placeholder not resolved
  Context: See: file:///Users/dan/Documents/notes.md
```

---

## Linter 5: Balance Meter Consistency Checker

### Purpose

Ensure Balance Meter metrics are used consistently and within valid ranges across all reports.

### Validation Rules

#### Rule 5.1: Magnitude Range
- Must be numeric
- Must be within range: 0–5 (inclusive)
- Can be integer or decimal (e.g., 4.5)

#### Rule 5.2: Valence Range
- Must be numeric
- Must be within range: -5 to +5 (inclusive)
- Can be integer or decimal

#### Rule 5.3: Volatility Range
- Must be numeric
- Must be within range: 0–5 (inclusive)
- Must be non-negative (ascending only)

#### Rule 5.4: SFD Range
- `SFD_disc` must be one of: -1, 0, +1
- `SFD_cont` must be within range: -1.0 to +1.0
- `Splus` and `Sminus` must be within range: 0–5

#### Rule 5.5: Emoji Consistency
- Magnitude emoji must match value range:
  - 0–1: Latent/Murmur
  - 2: Pulse
  - 3: Stirring
  - 4: Convergence
  - 5: Threshold
- Volatility emoji must follow ladder:
  - 0: ➿
  - 1-2: 🔄
  - 2-3: 🔀
  - 3-4: 🧩
  - 5: 🌀

### Implementation

```javascript
function lintBalanceMeter(metrics, reportId) {
  const violations = [];
  
  // Rule 5.1: Magnitude
  if (metrics.magnitude !== undefined) {
    if (typeof metrics.magnitude !== 'number' || 
        metrics.magnitude < 0 || metrics.magnitude > 5) {
      violations.push({
        reportId: reportId,
        rule: '5.1',
        severity: 'ERROR',
        message: `Invalid Magnitude: ${metrics.magnitude}. Must be 0-5.`
      });
    }
  }
  
  // Rule 5.2: Valence
  if (metrics.valence !== undefined) {
    if (typeof metrics.valence !== 'number' || 
        metrics.valence < -5 || metrics.valence > 5) {
      violations.push({
        reportId: reportId,
        rule: '5.2',
        severity: 'ERROR',
        message: `Invalid Valence: ${metrics.valence}. Must be -5 to +5.`
      });
    }
  }
  
  // Rule 5.3: Volatility
  if (metrics.volatility !== undefined) {
    if (typeof metrics.volatility !== 'number' || 
        metrics.volatility < 0 || metrics.volatility > 5) {
      violations.push({
        reportId: reportId,
        rule: '5.3',
        severity: 'ERROR',
        message: `Invalid Volatility: ${metrics.volatility}. Must be 0-5.`
      });
    }
  }
  
  // Rule 5.4: SFD
  if (metrics.SFD_disc !== undefined) {
    if (![−1, 0, 1].includes(metrics.SFD_disc)) {
      violations.push({
        reportId: reportId,
        rule: '5.4',
        severity: 'ERROR',
        message: `Invalid SFD_disc: ${metrics.SFD_disc}. Must be -1, 0, or +1.`
      });
    }
  }
  
  return violations;
}
```

---

## Linter 6: Cross-Reference Validator

### Purpose

Ensure all internal document links are valid and point to existing files or sections.

### Rules

#### Rule 6.1: Markdown Link Syntax
- Pattern: `[Link Text](path/to/file.md)`
- Validate that file exists at specified path

#### Rule 6.2: Section Anchor Links
- Pattern: `[Link Text](#section-anchor)`
- Validate that anchor exists in document

#### Rule 6.3: Relative Path Resolution
- Ensure relative paths resolve correctly from document location

### Implementation

```javascript
function lintCrossReferences(content, filePath, fileSystem) {
  const violations = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkPattern.exec(content)) !== null) {
    const [fullMatch, linkText, linkPath] = match;
    
    // Skip external URLs
    if (linkPath.startsWith('http://') || linkPath.startsWith('https://')) {
      continue;
    }
    
    // Rule 6.2: Section anchors
    if (linkPath.startsWith('#')) {
      const anchor = linkPath.substring(1);
      if (!fileHasAnchor(content, anchor)) {
        violations.push({
          file: filePath,
          rule: '6.2',
          severity: 'WARNING',
          message: `Broken anchor link: ${linkPath}`,
          context: fullMatch
        });
      }
      continue;
    }
    
    // Rule 6.1 & 6.3: File links
    const resolvedPath = resolvePath(filePath, linkPath);
    if (!fileSystem.exists(resolvedPath)) {
      violations.push({
        file: filePath,
        rule: '6.1',
        severity: 'ERROR',
        message: `Broken file link: ${linkPath}`,
        context: fullMatch,
        resolvedPath: resolvedPath
      });
    }
  }
  
  return violations;
}
```

---

## Integration and CI/CD

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running Raven Calder linters..."

# Run all linters
node scripts/run-linters.js --staged

if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Commit aborted."
  echo "Fix violations or use 'git commit --no-verify' to skip (not recommended)."
  exit 1
fi

echo "✅ All linters passed."
exit 0
```

### CI Pipeline (GitHub Actions)

```yaml
name: Lint Corpus

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint:corpus
      - name: Upload lint report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: lint-report
          path: lint-report.json
```

---

## Command-Line Interface

### Usage

```bash
# Run all linters
npm run lint:corpus

# Run specific linter
npm run lint:frontstage
npm run lint:poetic-codex
npm run lint:yaml
npm run lint:placeholders
npm run lint:balance-meter
npm run lint:cross-refs

# Run with auto-fix (where possible)
npm run lint:corpus -- --fix

# Output formats
npm run lint:corpus -- --format=json > lint-report.json
npm run lint:corpus -- --format=junit > lint-report.xml
npm run lint:corpus -- --format=html > lint-report.html
```

### Exit Codes

- `0` - All checks passed
- `1` - Errors found (blocking)
- `2` - Warnings found (non-blocking)

---

## Reporting Format

### Console Output

```
Running Raven Calder Linters v1.0...

✅ Frontstage Linter: PASSED (0 violations)
❌ Poetic Codex Linter: FAILED (3 errors, 1 warning)
⚠️  YAML Linter: WARNINGS (2 warnings)
✅ Placeholder Detector: PASSED (0 violations)
✅ Balance Meter Checker: PASSED (0 violations)
⚠️  Cross-Reference Validator: WARNINGS (1 warning)

=== Summary ===
Total Files Scanned: 47
Errors: 3
Warnings: 3
Time: 2.3s

See lint-report.json for details.
```

### JSON Report Schema

```json
{
  "version": "1.0",
  "timestamp": "2025-10-01T12:34:56Z",
  "summary": {
    "filesScanned": 47,
    "errors": 3,
    "warnings": 3,
    "passed": 4
  },
  "linters": {
    "frontstage": {
      "status": "passed",
      "violations": []
    },
    "poeticCodex": {
      "status": "failed",
      "violations": [
        {
          "file": "/path/to/card.yaml",
          "line": 12,
          "rule": "2.2",
          "severity": "error",
          "message": "Card.Poem must not contain emoji characters",
          "context": "You feel the 🔥 rising..."
        }
      ]
    }
  }
}
```

---

## See Also

*   `/Core/Four Report Types_Integrated 10.1.25.md` - Primary architecture reference
*   `/Poetic Brain/POETIC_CODEX_CARD_SPEC.md` - Card structure specification
*   `/Implementation/SEISMOGRAPH_GUIDE.md` - Balance Meter technical details

---

**Version:** 1.0  
**Maintenance:** Review when new content types or validation rules are added
