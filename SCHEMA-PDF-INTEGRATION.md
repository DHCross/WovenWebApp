# Schema Rule-Patch Integration with PDF Generation

This document describes the complete integration of the Schema Rule-Patch system with PDF generation, addressing both Raven Calder's specifications and PDF sanitization requirements.

## Overview

The enhanced system provides:

1. **Contract-compliant report generation** with mode enforcement
2. **PDF-safe text sanitization** for astrological symbols and Unicode characters
3. **Integrated validation** ensuring reports meet both schema and encoding requirements
4. **Comprehensive reporting** with contract compliance details in PDF exports

## Architecture Components

### 1. Schema Rule-Patch Core (`src/schema-rule-patch.ts`)

Implements Raven Calder's contract specification:

- **Mode validation**: `natal-only`, `balance`, `relational-balance`, `relational-mirror`
- **Frontstage policy enforcement**: `allow_symbolic_weather`, `autogenerate`
- **Balance field stripping**: Automatically removes `indices`, `transitsByDate`, `seismograph` from natal-only reports
- **Contract versioning**: All reports stamped with `clear-mirror/1.3`

### 2. PDF Sanitization (`src/pdf-sanitizer.ts`)

Addresses the pdf-lib WinAnsi encoding limitations:

- **Glyph mapping**: 200+ astrological symbols → ASCII equivalents
- **Smart replacement logic**: Avoids double-replacement issues
- **Unicode range handling**: Converts problematic character ranges
- **JSON sanitization**: Deep cleaning of report objects

### 3. Frontstage Renderer (`src/frontstage-renderer.ts`)

Mode-specific content generation:

- **Natal-only mode**: Never generates symbolic weather
- **Balance mode**: Requires indices for weather generation
- **Backstage logging**: Debug information without user exposure

### 4. Contract Linter (`src/contract-linter.ts`)

Validation and auto-fixing:

- **Pre-render validation**: Catches violations before Poetic Brain
- **Auto-fixes**: Missing policies, contract versions
- **Human-readable reports**: Actionable error messages

## PDF Integration Points

### Enhanced PDF Generation (`app/math-brain/page.tsx`)

The PDF generation now includes:

```typescript
// 1. Mode determination
const reportMode = reportType === 'balance' ? 'balance' : 'natal-only';

// 2. Schema compliance validation
const mirrorResult = await renderShareableMirror({
  geo: null,
  prov: { source: 'pdf-export' },
  mode: reportMode,
  options: processedOptions
});

// 3. Text sanitization for PDF safety
const sanitizedReport = sanitizeReportForPDF({
  renderedText,
  rawJSON: processedResult
});

// 4. Contract compliance section in PDF
if (contractCompliant) {
  sections.push({
    title: 'Schema Rule-Patch Compliance',
    body: sanitizeForPDF(complianceText),
    mode: 'regular'
  });
}
```

### PDF Content Structure

Each PDF now contains:

1. **Schema Rule-Patch Compliance Section**
   - Contract version and mode
   - Frontstage policy settings
   - Schema-enforced render components
   - Backstage validation notes

2. **Rendered Summary** (sanitized)
   - All astrological glyphs converted to text
   - Unicode characters mapped to ASCII-safe equivalents

3. **Contract Validation Report**
   - Linting results with warnings/errors
   - Auto-fixes applied during processing

4. **Raw JSON Snapshot** (sanitized)
   - Complete data payload with clean encoding
   - All text fields processed for PDF compatibility

## Key Features

### 🔒 Contract Enforcement

```typescript
// Natal-only mode automatically strips balance data
const payload = {
  mode: 'natal-only',
  person_a: { /* chart data */ },
  indices: { days: [...] }, // ❌ Will be stripped
  transitsByDate: {...}     // ❌ Will be stripped
};

const result = enforceNatalOnlyMode(payload);
// Result: Clean natal-only payload with balance fields removed
```

### 🧹 PDF Sanitization

```typescript
// Before: "Sun ☉ in Leo ♌ trine Moon ☽ (3°42′)"
// After:  "Sun in Leo trine Moon (3deg42')"

const sanitized = sanitizeForPDF(astrologyText);
// All glyphs converted to ASCII-safe equivalents
```

### ✅ Validation Pipeline

```typescript
const { payload: clean, result: lint } = lintAndFixPayload(input);

if (!lint.valid) {
  // Hard stop - do not proceed to Poetic Brain
  console.error('Contract violations:', lint.errors);
} else {
  // Safe to render
  const rendered = await renderFrontstage(clean);
}
```

## Testing

Comprehensive test coverage ensures:

- Schema rule enforcement works correctly
- PDF sanitization handles all symbol types
- Integration between systems is seamless
- Contract compliance is properly validated

Run tests:
```bash
npx jest test/schema-rule-patch.test.ts
npx jest test/pdf-schema-integration.test.ts
```

## Usage Examples

### Natal-Only Report
```typescript
const natalReport = await renderShareableMirror({
  geo: null,
  prov: { source: 'user-input' },
  mode: 'natal-only',
  options: {
    mode: 'natal-only',
    person_a: { chart: { planets: [...] } }
  }
});

// Result:
// - contract: 'clear-mirror/1.3'
// - mode: 'natal-only'
// - symbolic_weather: null (always)
// - picture: Clean blueprint without transits
```

### Balance Report with PDF Export
```typescript
// Generate report with schema compliance
const balanceReport = await renderShareableMirror({
  mode: 'balance',
  options: {
    window: { start: '2025-09-14', end: '2025-10-03' },
    indices: { days: [...] }
  }
});

// Export to PDF with sanitization
const pdfData = {
  contract_compliance: {
    contract: balanceReport.contract,
    mode: balanceReport.mode,
    frontstage_policy: balanceReport.frontstage_policy
  },
  sanitized_content: sanitizeReportForPDF({
    renderedText: reportHTML,
    rawJSON: balanceReport
  })
};
```

## Migration Notes

### For Existing Code

1. **Mode Parameter**: Add `mode` parameter to `renderShareableMirror` calls
2. **PDF Functions**: Update PDF generation to use `sanitizeForPDF`
3. **Validation**: Run contract linting before critical operations

### For New Features

1. Always use the schema rule-patch system for new reports
2. Include contract compliance in all PDF exports
3. Validate payloads with the contract linter
4. Sanitize all text content before PDF generation

## Monitoring & Alerts

Recommended telemetry:

- **Stripped fields counter**: Track natal-only violations
- **Linter blocks**: Monitor validation failures
- **Legacy fallbacks**: Alert when new system fails
- **PDF encoding errors**: Track sanitization effectiveness

## Rollback Plan

If issues arise:

1. **Feature flag**: Toggle off schema enforcement in `renderShareableMirror`
2. **Fallback mode**: System gracefully degrades to legacy rendering
3. **PDF sanitization**: Can be disabled independently if needed
4. **Monitoring**: Alerts trigger automatic rollback if error rates spike

## Bottom Line

This integration delivers on Raven Calder's vision while solving the PDF encoding problems:

- ✅ **Natal-only mode** never leaks balance data
- ✅ **Symbolic weather** is contract-controlled
- ✅ **PDF exports** work reliably across all systems
- ✅ **Trust & falsifiability** - users get exactly what they selected
- ✅ **Contract compliance** is visible and auditable

The system is robust, testable, and maintains backward compatibility while enforcing the new schema rules.