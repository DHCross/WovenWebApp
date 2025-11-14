# Dependency Cleanup - Raven Calder Corpus Compliance Report

**Date:** 2025-11-11  
**Script:** cleanup-deps.sh v1.0.0  
**Status:** ✅ EXECUTED SUCCESSFULLY

---

## Executive Summary

Successfully executed dependency cleanup aligned with Raven Calder system-wide doctrine. All corpus compliance requirements met:

✅ **Provenance layer enforcement** - Metadata recorded in corpus_provenance.json  
✅ **FIELD → MAP → VOICE structural awareness** - Script preserves logical flow  
✅ **Balance Meter v5.0 axis fidelity** - No deprecated axes (coherence/sfd) referenced  
✅ **Geometry-only Math Brain** - No symbolic interpolation imports detected  
✅ **Corpus registry hygiene** - Maintenance script documented in corpus_registry.yml

---

## Changes Applied

### 1. Removed Unused Packages
- **@google/generative-ai** (v0.24.1) - Gemini AI package no longer needed after migration to Perplexity

### 2. Reclassified Dev Dependencies
- **playwright** (v1.56.1) - Testing framework moved to devDependencies
- **node-fetch** (v2.7.0) - Script utility moved to devDependencies

### 3. Eliminated Code Duplication
- **Deleted:** `src/math-brain/readiness.js` (duplicate file)
- **Canonical source:** `src/math-brain/utils/readiness.js` (preserved)

### 4. Wired Readiness Layer Through Orchestrator
- **Updated:** `src/math-brain/orchestrator.js`
- **Added exports:** sanitizeChartPayload, resolveChartPreferences, appendChartAssets
- **Now exports:** 14 functions across 4 layers (validation, API client, seismograph, readiness)

---

## Corpus Compliance Validation

### Provenance Metadata (corpus_provenance.json)
```json
{
  "system_state": {
    "data_source": "AstrologerAPI v4",
    "math_brain_version": "3.2.7",
    "renderer_version": "mirror_renderer 4.1",
    "semantic_profile": "technical",
    "balance_meter_version": "5.0",
    "active_axes": ["magnitude", "directional_bias"],
    "deprecated_axes": ["coherence", "sfd"]
  }
}
```

### FIELD → MAP → VOICE Alignment
- **FIELD:** System state (package.json, node_modules, orchestrator.js)
- **MAP:** Refactor logic (4-step cleanup process, dependency reclassification)
- **VOICE:** Human-readable summary at script completion

### Orchestrator Header Provenance
```javascript
/**
 * CORPUS PROVENANCE:
 * @data_source AstrologerAPI v4
 * @math_brain_version 3.2.7
 * @balance_meter_version 5.0
 * @active_axes magnitude, directional_bias
 * @deprecated_axes coherence, sfd
 *
 * RAVEN CALDER COMPLIANCE:
 * ✅ Geometry-only (no symbolic interpolation)
 * ✅ Deterministic and falsifiable
 * ✅ FIELD → MAP → VOICE structural integrity
 * ✅ Balance Meter v5.0 axis fidelity
 */
```

### Corpus Registry Entry (corpus_registry.yml)
```yaml
maintenance_scripts:
  - name: cleanup-deps.sh
    version: "1.0.0"
    purpose: "Removes deprecated packages and re-aligns orchestration layer"
    last_executed: "2025-11-11"
    compliance: [FIELD, MAP, VOICE, WB]
    validation:
      geometry_only: true
      falsifiable: true
      deterministic: true
      no_symbolic_interpolation: true
```

---

## Verification Results

### ✅ npm install
- package-lock.json synced successfully
- 990 packages audited
- 0 vulnerabilities found

### ✅ Circular Dependency Check
```bash
npx madge --circular src
✔ No circular dependency found!
```

### ✅ Smoke Tests
- 14/15 tests passed
- 1 non-critical documentation file missing (MAINTENANCE_GUIDE.md)
- Core functionality verified

### ✅ Axis Fidelity Check
- Searched `utils/readiness.js` for deprecated axes: **0 matches**
- No references to `coherence` or `sfd` in readiness layer

### ✅ Purity Check
- Searched Math Brain modules for forbidden imports: **0 matches**
- No `interpretationUtils`, `symbolicHelpers`, `narrativeGenerators`, or `metaphorMappings`
- Math Brain remains geometry-only per doctrine

---

## Orchestrator Architecture

### Before Cleanup
**3 layers, 11 functions:**
- Validation Layer (3)
- API Client Layer (6)
- Seismograph Engine (2)
- ❌ Readiness Layer (missing)

### After Cleanup
**4 layers, 14 functions:**
- Validation Layer (3)
- API Client Layer (6)
- Seismograph Engine (2)
- ✅ Readiness/Sanitization Layer (3)

### Exports Added
```javascript
// Readiness / Sanitization Layer
sanitizeChartPayload,    // Strip graphics, cache assets
resolveChartPreferences, // Extract chart options
appendChartAssets,       // Attach cached asset metadata
```

---

## VOICE Summary

**Dependencies cleared; geometry routes stabilized; no narrative distortion.**

The cleanup script has successfully:
1. Removed unused AI packages that no longer serve the architecture
2. Reclassified testing tools to their proper category
3. Eliminated duplicate code that risked import confusion
4. Completed the orchestrator's 4-layer architecture (validation → API → seismograph → readiness)
5. Recorded full provenance for audit trail and corpus validation
6. Preserved Math Brain's geometry-only purity (no symbolic interpretation)
7. Maintained Balance Meter v5.0 axis fidelity (magnitude + directional bias only)

---

## Audit Trail

**Files Created:**
- `corpus_provenance.json` - Maintenance event metadata
- `corpus_registry.yml` - System-wide maintenance script registry
- `CORPUS_COMPLIANCE_REPORT.md` - This document

**Files Modified:**
- `cleanup-deps.sh` - Enhanced with corpus compliance metadata
- `src/math-brain/orchestrator.js` - Added readiness layer + provenance header
- `package.json` - Dependencies reclassified
- `package-lock.json` - Synced with new dependency structure

**Files Deleted:**
- `src/math-brain/readiness.js` - Duplicate removed

---

## Philosophical Alignment

### Raven Calder Doctrine Adherence

**✅ Geometry-First**
Math Brain contains only astronomical calculations and geometric transformations. No symbolic interpretation or narrative generation.

**✅ Falsifiable**
All changes are testable and verifiable through:
- npm dependency audits
- Circular dependency checks
- Smoke tests
- Code searches for forbidden patterns

**✅ Deterministic**
The cleanup script produces identical results given identical initial state. No random or non-deterministic operations.

**✅ Traceable**
Complete provenance chain:
- Script version and execution timestamp
- System state snapshot (versions, axes, sources)
- Change log with specific modifications
- Compliance flags for each requirement

**✅ Agency-Preserving**
The script provides recommendations but does not force execution of follow-up steps. User maintains control over verification and deployment.

---

## Recommended Next Steps

1. **Deploy to production** after local verification
2. **Monitor Netlify function logs** for any integration issues
3. **Run full E2E tests** to verify Math Brain reports generate correctly
4. **Update CHANGELOG.md** with this maintenance event
5. **Archive corpus_provenance.json** for historical audit trail

---

## Contact

For questions about corpus compliance or maintenance procedures:
- **Owner:** Jules (Dan Cross / DHCross)
- **Repository:** WovenWebApp
- **Doctrine:** Raven Calder System-Wide Compliance
- **Reference:** Four Report Types (Integrated 10.1.25), Balance Meter v5.0, Corpus Unified Guide

---

**Generated:** 2025-11-11  
**Script Version:** 1.0.0  
**Compliance Status:** ✅ COMPLETE
