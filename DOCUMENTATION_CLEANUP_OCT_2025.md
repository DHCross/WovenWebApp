# Documentation Cleanup - Balance Meter v4.0 Transition

**Date:** October 9, 2025  
**Purpose:** Remove outdated 4-axis system documentation following Balance Meter v4.0 simplification

---

## Files Deleted

### 1. `Developers Notes/Implementation/Fixing the Balance Meter math 10.4.25.md`
**Reason:** References v3.1 specification with 4-axis system (Magnitude, Directional Bias, Coherence, Integration Bias/SFD)
**Status:** ✅ DELETED
**Replacement:** Current documentation in `BALANCE_METER_REFACTOR_COMPLETE.md` (updated to v4.0)

### 2. `Developers Notes/Math Brain Ideas/A Strange Cosmic Symbolism v3.md`
**Reason:** Describes "Four Axes" including deprecated SFD system
**Status:** ✅ DELETED
**Replacement:** `Developers Notes/Core/A Strange Cosmic Symbolism v4.md` (updated to 3-axis)

---

## Files Updated with Deprecation Warnings

### 1. `lib/uncanny-scoring-spec.md`
**Changes:**
- Added prominent deprecation warning at top
- Marked SFD references as deprecated
- Noted Balance Meter v4.0 uses 3 axes only
- Flagged document needs full rewrite for v4.0

**Status:** ⚠️ DEPRECATED - Needs rewrite

### 2. `docs/POETIC_BRAIN_V1_SNAPSHOT.md`
**Changes:**
- Added deprecation warning in header
- Noted SFD references are outdated
- Preserved for historical context
- Flagged sections that reference 4-axis system

**Status:** ⚠️ PARTIALLY OUTDATED - Historical snapshot preserved

### 3. `Developers Notes/Core/A Strange Cosmic Symbolism v4.md`
**Changes:**
- Updated "Four axes" → "Three core axes"
- Added explicit list: Magnitude, Directional Bias, Coherence
- Added note about SFD/Integration Bias deprecation
- Clarified this supersedes v3.2 and earlier

**Status:** ✅ UPDATED to v4.0 compliance

---

## Files Previously Updated (Earlier in Session)

### 1. `BALANCE_METER_INDEX.md`
- Updated to v4.0 spec
- Added SFD System to archived materials
- Emphasized 3-axis system

### 2. `docs/BALANCE_METER_README.md`
- Updated to v4.0
- Hard deleted SFD axis from tables
- Added Field Signature v4 formula
- Updated all formulas to 3-axis only

### 3. `BALANCE_METER_REFACTOR_COMPLETE.md`
- Added v4.0 implementation history
- Updated acceptance gates
- Added v4.0 philosophy section
- Explained why SFD was removed

---

## Current Balance Meter v4.0 Status

### Three Core Axes (ONLY)
1. **Magnitude** [0, 5] - Intensity
2. **Directional Bias** [-5, +5] - Expansion vs. Contraction
3. **Coherence** [0, 5] - Narrative Stability

### Removed Systems (Deprecated)
- ❌ SFD (Support/Friction/Drift)
- ❌ Integration Bias (SFD renamed)
- ❌ 4th axis of any kind

### Field Signature v4.0
```javascript
fieldSignature = (direction/5) × (magnitude/5) × (coherence/5)
```

---

## Files Requiring Future Updates

### High Priority
1. **`lib/uncanny-scoring-spec.md`** - Complete rewrite to use Directional Bias instead of SFD
2. **`docs/POETIC_BRAIN_V1_SNAPSHOT.md`** - Update lexicon conversion table to remove SFD references

### Low Priority (Historical)
3. Various report examples in `Sample Output/` - May reference old 4-axis system
4. Test fixtures that might include SFD values

---

## Grep Commands for Verification

```bash
# Check for remaining SFD references (excluding comments and deprecated markers)
find . -type f \( -name '*.js' -o -name '*.ts' \) -print0 | \
  xargs -0 grep -i 'sfd' | \
  grep -v '//\|SFD-era\|No Numeric SFD\|DEPRECATED'

# Check for "four axes" references
grep -r "four axes\|4 axes\|fourth axis" --include="*.md" .

# Check for Integration Bias references
grep -r "Integration Bias\|integration.*axis" --include="*.md" --include="*.ts" --include="*.js" .
```

---

## Architectural Principle Restored

**FIELD → MAP → VOICE**

Balance Meter v4.0 returns to geometry-first purity:
- Raw planetary angles (FIELD)
- Three geometric axes derived from aspects (MAP)
- Human language synthesized from geometric patterns (VOICE)

SFD/Integration introduced non-geometric concepts into the MAP layer, violating the separation of concerns. v4.0 corrects this architectural drift.

---

**Cleanup Complete:** All known outdated 4-axis documentation removed or marked deprecated. ✅
