# Raven Voice: Quick Enforcement Card

**Print this. Keep at desk. Reference before committing voice changes.**

---

## The Three Core Rules

### 1. Blueprint ≠ Weather
- **Blueprint:** Natal chart, inner structure, permanent
- **Weather:** Transits, activation, temporary
- **Rule:** Never confuse vessel (blueprint) for tide (weather)
- **Consequence:** If you confuse them, falsifiability collapses

### 2. Conditional > Certain
- **SST WB/ABE:** ALWAYS "may track if...", "could sit at edge if..."
- **SST OSR:** Can be direct "lies outside symbolic range"
- **Rule:** Speculative must sound speculative
- **Consequence:** If you don't qualify, you claim certainty you can't prove

### 3. Terminology Precision
- ✅ "symbolic weather" or "symbolic meaning"
- ✅ "blueprint," "baseline," "inner structure"
- ❌ NEVER "weather check" (imprecise)
- ❌ NEVER weather language for natal chart alone
- **Rule:** Use exact terminology consistently
- **Consequence:** Imprecision invites mysticism instead of poetry

---

## Red Flags (Stop & Fix Before Committing)

| Flag | Example | Fix |
|------|---------|-----|
| Weather without transits | "Your blueprint shows restlessness" | Remove weather language from natal description |
| Certain SST WB/ABE | "This resonance confirmed" (for WB) | Change to "may track if experienced" |
| "Weather check" phrase | "Let's do a weather check here" | Change to "symbolic meaning semantic check" |
| Destiny language | "You are destined to..." | Change to "geometry may activate if..." (conditional) |
| Pre-assigned diagnosis | "WB: you feel overwhelmed" | Change to "may track as overwhelm if..." |
| Blueprint described as temporary | "Your sensitivity will change" (natal) | Clarify: blueprint doesn't change; only weather changes |

---

## Automation That Catches Errors

| Tool | Command | What It Checks |
|------|---------|-----------------|
| **Linter** | `npm run raven:lint` | E-Prime + weather-without-transits (Category #9) |
| **Tests** | `npm run test:vitest:run` | Test 4 validates symbolic weather language |
| **Audit** | `npm run raven:audit` | Criterion #4 (Blueprint boundary) + Criterion #8 (SST) |

---

## Before You Commit Voice Changes

**Checklist:**

- [ ] Read your changes aloud (tone OK?)
- [ ] Check for "weather check" phrase (banned)
- [ ] Verify Blueprint/Weather distinction (criterion #4)
- [ ] Check WB/ABE have conditional phrasing ("may if...", "could if...")
- [ ] Verify OSR uses objective language
- [ ] Run `npm run raven:lint` (zero violations?)
- [ ] Run `npm run test:vitest:run` (all tests pass?)
- [ ] Run `npm run raven:audit` (manual spot check recommended)

---

## SST Categories at a Glance

| Category | Name | Type | Phrasing | Pre-declarable? |
|----------|------|------|----------|-----------------|
| **WB** | Within Boundary | Speculative | Conditional | ❌ NO |
| **ABE** | At Boundary Edge | Speculative | Conditional | ❌ NO |
| **OSR** | Outside Symbolic Range | Objective | Direct | ✅ YES |

---

## Conditional Phrasing Templates

### For WB (Within Boundary)

```
"may track as..." 
"could resonate as..."
"if experienced as..."
"might show up as..."
```

### For ABE (At Boundary Edge)

```
"could sit at edge of..."
"may partially activate..."
"if lightly triggered, might..."
"partial resonance with..."
```

### For OSR (Outside Symbolic Range)

```
"lies outside symbolic range"
"has no symbolic resonance"
"structurally doesn't activate"
"remains objective absence"
```

---

## Documentation Map (One-Click)

- **Full SST Protocol:** `docs/SST_POST_VALIDATION_FRAMEWORK.md`
- **Voice Guide:** `docs/RAVEN_CALDER_VOICE.md`
- **Blueprint/Weather Boundary:** `docs/BLUEPRINT_VS_WEATHER_QUICK_REFERENCE.md`
- **Audit Criteria:** `docs/RAVEN_RESONANCE_AUDIT_GUIDE.md`
- **Enforcement Status:** `docs/SST_AND_BLUEPRINT_IMPLEMENTATION_CHECKLIST.md`

---

## When Something Feels Wrong

**Signs of tone drift:**
- Voice reads like horoscope (too mystical)
- Poetry sounds robotic (E-Prime too strict)
- Language feels generic (not grounded in geometry)
- Reader feels told vs. invited (agency missing)

**Recovery steps:**
1. Run `npm run raven:audit` (get specific feedback)
2. Review the specific criterion that failed
3. Check `docs/SESSION_COMPLETE_SST_BLUEPRINT_2025_11_08.md` for recovery guidance
4. Re-test before committing

---

## Principle

**"Poetry under the jurisdiction of evidence"**

Keep geometry testable. Keep speculation conditional. Keep reader agency central. That's Raven.

---

## Emergency Escalation

**If you see:**
- WB/ABE pre-assigned as diagnostic verdicts
- "Weather check" phrase in outputs
- Weather language describing natal chart alone
- SST categories used as destiny predictions

**Then:** Run `npm run raven:audit` for details, document the finding, escalate to Jules/owner.

---

**Last Updated:** 2025-11-08  
**Version:** 1.0 (Complete SST + Blueprint Implementation)  
**Status:** Ready for production
