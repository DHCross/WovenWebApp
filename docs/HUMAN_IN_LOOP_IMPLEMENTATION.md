# Human-in-the-Loop Audit Implementation — COMPLETE

**Date:** 2025-01-21  
**Status:** ✅ Implemented & Documented

---

## What Was Built

A **human-in-the-loop quality audit system** to catch tone drift that automated tests miss.

### Core Philosophy
- **Automated tests** catch correctness (schema, E-Prime, Safe Lexicon)
- **Manual audits** catch tone nuance that only human ears detect
- **The Eight Questions** validate voice identity, poetic vitality, geometric grounding, conditional naturalness, rhythm, somatic resonance, falsifiability, and agency safety

---

## Files Created/Modified

### 1. **scripts/raven-resonance-audit.js** (220 lines)
Main audit script that:
- Samples 10% of recent outputs from `test-results/`
- Displays audit criteria (The Eight Questions)
- Shows output samples with first 50 lines
- Provides manual review checklist

**Run with:**
```bash
npm run raven:audit
```

### 2. **docs/RAVEN_RESONANCE_AUDIT_GUIDE.md** (415 lines)
Comprehensive guide including:
- **The Eight Questions** with detailed guidance and red flags:
  1. Voice Identity (pattern witness, not oracle)
  2. Poetic Vitality (E-Prime without sterilization)
  3. Geometric Grounding (metaphors leashed to math)
  4. Conditional Naturalness (may/might/could flows smoothly)
  5. Rhythm & Cadence (sentence variation, not robotic)
  6. Somatic Resonance (FIELD descriptions land in body)
  7. Falsifiability (can reader test claims?)
  8. Agency Safety (preserves reader sovereignty)

- **Scoring System:** ✅ Pass / ⚠️ Borderline / ❌ Fail
- **Common Tone Drift Patterns:** Mystical Oracle, Academic Sterilization, Generic Horoscope, Abstract Philosophy, Robotic Generation
- **Audit Log Template:** Structured format for documenting findings
- **Maintenance Cadence:** Quarterly routine, before major releases, after voice changes, on suspicion
- **Emergency Response Protocol:** STOP → investigate → revert/fix → re-audit

### 3. **package.json**
Added script:
```json
"raven:audit": "node scripts/raven-resonance-audit.js"
```

### 4. **docs/POETIC_BRAIN_TEST_PAGE.md**
Updated "Linting + Quality Checks" section to include:
- `npm run raven:audit` command
- Note that automated checks (lint) + manual audit (tone) both required before production

### 5. **Architecture.md**
Added "Human-in-the-Loop Quality" section:
- Command reference
- Explanation of automated vs manual quality checks
- Link to full audit guide

### 6. **README.md**
Added "Quality Assurance" subsection to Testing & Verification:
- Commands for automated checks (raven:lint, lexicon:lint, test:ci)
- Command for human audit (raven:audit)
- Reference to audit guide

---

## How It Works

### Sampling Strategy
- Script looks in `test-results/` directory
- Random 10% sample (minimum 1 file)
- Displays first 50 lines of each output
- For JSON files, extracts `draft.appendix.reader_markdown` or `reader_markdown`

### The Eight Questions
Each question targets a specific aspect of Raven voice:

| # | Question | What It Catches |
|---|----------|-----------------|
| 1 | Voice Identity | Oracular tone, deterministic predictions |
| 2 | Poetic Vitality | E-Prime sterilization, clinical dryness |
| 3 | Geometric Grounding | Free-floating abstraction, generic platitudes |
| 4 | Conditional Naturalness | Hedging, evasive language, horoscope weasel words |
| 5 | Rhythm & Cadence | Monotonous structure, robotic generation |
| 6 | Somatic Resonance | Abstract FIELD descriptions, no embodied sensation |
| 7 | Falsifiability | Unfalsifiable mysticism, vague claims |
| 8 | Agency Safety | Prescriptive tone, disempowering language |

### Review Process
1. **Run audit script** → See sampled outputs with criteria
2. **Review each sample** → Mark ✅/⚠️/❌ for each of 8 questions
3. **Document findings** → Use audit log template
4. **Take action** if needed:
   - All pass → Continue
   - 1-2 borderline → Monitor
   - 3+ fail → STOP, investigate, fix

---

## When to Run

| Trigger | Scope | Priority |
|---------|-------|----------|
| **Quarterly routine** | Random 10% | Maintenance |
| **Before major release** | 20% + edge cases | Required |
| **After voice changes** | 30% + focused | Critical |
| **On suspicion** | Targeted investigation | Immediate |

---

## Integration with Existing Quality Systems

### Automated Checks (Before Every Deploy)
```bash
npm run raven:lint      # E-Prime + forbidden patterns
npm run lexicon:lint    # Safe Lexicon + terminology
npm run test:ci         # Full test suite
```
Zero violations required.

### Manual Audit (Quarterly + Pre-Release)
```bash
npm run raven:audit     # Human tone review
```
Pass rate >90% required for production.

### Test Coverage
- **UI Tests:** `tests/e2e/poetic-brain.ui.spec.ts`
- **API Tests:** `tests/e2e/poetic-brain.api.spec.ts`
- **Raven Compliance:** `tests/e2e/poetic-brain.raven-compliance.spec.ts` (8 tests)
- **Temporal Integrity:** `tests/e2e/poetic-brain.temporal-integrity.spec.ts` (6 tests)
- **Human Audit:** `scripts/raven-resonance-audit.js` (qualitative)

---

## Success Criteria

✅ **Audit script runs successfully**
- Finds and samples outputs from test-results/
- Displays criteria and samples clearly
- Provides actionable checklist

✅ **Documentation complete**
- Comprehensive guide with The Eight Questions
- Red flags and scoring system documented
- Audit log template provided
- Maintenance cadence specified

✅ **Integration complete**
- Script added to package.json
- Referenced in POETIC_BRAIN_TEST_PAGE.md
- Integrated into Architecture.md
- Added to README.md Quality Assurance section

✅ **Emergency protocol defined**
- Clear escalation path for critical findings
- STOP → investigate → fix → re-audit process
- Root cause documentation required

---

## Example Workflow

### Normal Quarterly Audit
```bash
# 1. Generate outputs (if needed)
npm run test:e2e

# 2. Run audit
npm run raven:audit

# 3. Review samples using The Eight Questions
# 4. Document in audit log
# 5. If all pass: Continue. If concerns: Investigate.
```

### Pre-Release Audit
```bash
# 1. Generate broader output sample (20%)
npm run test:e2e
# Upload various test JSON files

# 2. Run audit multiple times to see different samples
npm run raven:audit

# 3. Focus on edge cases:
#    - Complex relational readings
#    - Heavy transit stacks
#    - Boundary conditions (ABE, OSR)

# 4. Document findings
# 5. Address any concerns before release
```

### Emergency Response
```bash
# User reports "doesn't sound like Raven anymore"

# 1. Run immediate audit
npm run raven:audit

# 2. If confirms drift:
git log --oneline -20  # Recent changes
git diff HEAD~5 lib/legacy/polarityHelpers.js
git diff HEAD~5 src/formatter/

# 3. Identify culprit commit
# 4. Revert or fix forward
# 5. Re-audit to confirm fix
# 6. Document in audit log + CHANGELOG.md
```

---

## Tips for Reviewers

### Read Aloud
Tone issues become obvious when spoken. Awkward phrasing stands out.

### Check Your Body
FIELD descriptions should create sensation. If reading feels purely intellectual, somatic layer failing.

### Test Falsifiability
Can you imagine disagreeing with a claim and testing it against lived experience? If not, too vague/mystical.

### Compare to Reference
Keep 2-3 known-good Raven outputs as golden standard. Does new output match that voice?

### Trust Your Ears
If something feels "off," mark it. Gut reactions often catch what checklists miss.

---

## Future Enhancements (Optional)

### Automated Sampling
Could extend script to:
- Sample from production logs (if available)
- Track audit history over time
- Generate trend reports

### Integration with CI
Could add pre-commit hook:
- Requires audit pass before merging to main
- Enforces quarterly audit schedule
- Blocks deploys if audit overdue

### User Feedback Loop
Could integrate user feedback:
- "Does this resonate?" button in UI
- Correlate low-resonance outputs with failed audit criteria
- Automatic flagging for manual review

**Note:** These are future possibilities, not current requirements.

---

## Maintenance Notes

### Updating The Eight Questions
If Raven voice principles evolve:
1. Update `AUDIT_CRITERIA` array in `scripts/raven-resonance-audit.js`
2. Update corresponding section in `docs/RAVEN_RESONANCE_AUDIT_GUIDE.md`
3. Document change in audit log with rationale

### Adding New Red Flags
As tone drift patterns emerge:
1. Document in "Common Tone Drift Patterns" section
2. Add examples to relevant question guidance
3. Update audit log template if new categories needed

### Calibrating Sample Rate
Default 10% may need adjustment:
- Increase for larger output volumes
- Decrease if fewer outputs available
- Adjust `SAMPLE_RATE` constant in script

---

## Conclusion

Human-in-the-loop audit now complete. System provides:
- **Automated correctness** (tests + linters)
- **Manual tone quality** (audit script + guide)
- **Clear protocols** (when to run, how to respond)
- **Emergency safeguards** (STOP → investigate → fix)

Raven voice stays true through combination of:
1. E-Prime + lexical firewall (automated)
2. Test coverage (correctness)
3. Human audit (tone nuance)

**Next:** Run first quarterly audit to establish baseline. Document findings in new `AUDIT_LOG.md` file.
