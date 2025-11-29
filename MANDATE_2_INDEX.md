# MANDATE 2: Quick Navigation

**Status:** Plan Complete ✅ | Ready for Implementation ⏳  
**Created:** November 28, 2025

---

## 📋 The Plan at a Glance

**Goal:** Implement interactive tooltips that make Balance Meter calculations transparent and falsifiable

**Key Insight:** When users click magnitude/directional bias metrics, they see exactly which aspects created that value, with calculation formulas and house context for interpretation.

**Effort:** ~12.5 hours across 7 sequential phases

---

## 📚 Documentation Files

### 1. **MANDATE_2_PLAN_SUMMARY.md** ← START HERE
Executive summary with all decisions locked. ~3 min read.
- Overview of what's being built
- Design decisions (all locked, no ambiguity)
- Success criteria
- Next steps

### 2. **MANDATE_2_IMPLEMENTATION_PLAN.md** ← TECHNICAL SPEC
Detailed phase-by-phase breakdown with pseudo-code.
- All 7 phases with specific file changes
- Pseudo-code for each phase
- Integration points
- Complete test strategy

### 3. **MANDATE_2_ARCHITECTURE.md** ← VISUAL REFERENCE
Data flow diagrams, component hierarchy, timelines.
- Full system architecture diagram
- Phase execution timeline
- Component hierarchy
- Testing checklist
- Quick reference tables

### 4. **MANDATE_2_INTEGRATION_PATTERN.md** ← CONTEXT
Initial research findings and integration strategy (from earlier planning).
- Math Brain response structure
- Seismograph calculations
- Current UI components
- Data flow existing system

---

## 🎯 Design Decisions (Locked)

| Decision | Value | Rationale |
|----------|-------|-----------|
| House Scope | Aggregate (global) | Seismograph doesn't track per-house yet |
| API Flag | `include_balance_tooltips: boolean` | Opt-in keeps payloads lightweight |
| Trigger | Click/focus (primary) | Works on desktop, mobile, keyboard |
| A11y Library | Radix `<Popover>` | Built-in accessibility support |

See MANDATE_2_PLAN_SUMMARY.md for full decision rationale.

---

## 🔨 Implementation Phases

| Phase | Duration | What | File(s) |
|-------|----------|------|---------|
| 1 | 2h | Expose scored aspects | `src/seismograph.js` |
| 2 | 1.5h | Add API flag | `app/api/astrology-mathbrain/route.ts` |
| 3 | 2h | Build context | `lib/raven/tooltip-context.ts` (NEW) |
| 4 | 1h | Integrate into Raven | `app/api/raven/route.ts` |
| 5 | 2.5h | Create component | `components/BalanceMeterPopover.tsx` (NEW) |
| 6 | 1.5h | Wire into UI | `SnapshotDisplay.tsx`, `BalanceMeterSummary.tsx` |
| 7 | 2h | Test suite | `__tests__/mandate-2.test.ts` (NEW) |

---

## 📊 Data Flow (Simple Version)

```
User clicks "Magnitude: 4.2"
    ↓
Popover opens with:
    ├─ Aspects that created 4.2 (Opposition, Square, Trine)
    ├─ Each aspect's individual bias weight (-3, -2.5, +3)
    ├─ Formula showing how they combine
    ├─ Houses legend for reference
    └─ User reflection prompt
    ↓
User sees: "I see – Opposition is pulling down, Trine pulling up, net is -3"
    ↓
User can verify against their chart/experience
    ↓
✅ FALSIFIABLE - system is auditable
```

---

## 🚀 Getting Started

### Step 1: Read the Plan
1. Read **MANDATE_2_PLAN_SUMMARY.md** (3 min)
2. Skim **MANDATE_2_ARCHITECTURE.md** (visual reference)
3. Keep **MANDATE_2_IMPLEMENTATION_PLAN.md** open for phases

### Step 2: Prepare Environment
```bash
npm install @radix-ui/react-popover
```

### Step 3: Begin Phase 1
- Open `src/seismograph.js`
- Locate `aggregate()` function
- Preserve `scored` array (currently discarded)
- See MANDATE_2_IMPLEMENTATION_PLAN.md Phase 1 for pseudo-code

### Step 4: Iterate Phases
- Complete each phase sequentially (Phase N depends on N-1)
- Build after each phase
- Test checkpoint: build should pass

### Step 5: Final Testing
- Run comprehensive test suite (Phase 7)
- Verify falsifiability chain
- Manual smoke test: click, ESC, Tab keyboard nav

---

## ✅ Checklist: Before You Start

- [ ] Read MANDATE_2_PLAN_SUMMARY.md
- [ ] Understand the 4 locked design decisions
- [ ] `npm install @radix-ui/react-popover` executed
- [ ] Have MANDATE_2_IMPLEMENTATION_PLAN.md open for reference
- [ ] Have MANDATE_2_ARCHITECTURE.md open for data flow visualization
- [ ] Run `npm run build` to verify baseline

---

## 🔗 Related Files (Already Exist)

These are ready to use in Mandate 2 implementation:

- `lib/raven/aspects-legend.ts` — Aspect definitions + formulas
- `lib/raven/houses-legend.ts` — Houses reference tables
- `MANDATE_1_COMPLETION_REPORT.md` — Aspects system verification
- `MANDATE_2_INTEGRATION_PATTERN.md` — Initial research findings

---

## 📞 Key Imports You'll Need

### Phase 3 (Tooltip Context Builder)
```typescript
import { getAspectDefinition, generateAspectsMarkdownTable } from '@/lib/raven/aspects-legend';
import { generateHousesMarkdownTable } from '@/lib/raven/houses-legend';
```

### Phase 5 (Popover Component)
```typescript
import * as Popover from '@radix-ui/react-popover';
import { BalanceMeterTooltipContext } from '@/lib/raven/tooltip-context';
import ReactMarkdown from 'react-markdown';
```

### Phase 6 (Wire Into Components)
```typescript
import { BalanceMeterPopover } from '@/components/BalanceMeterPopover';
```

---

## 🧪 Testing Strategy

Each phase has integration tests. Final Phase 7 has comprehensive suite covering:
- Aspects exposed in seismograph
- API flag behavior (on/off)
- Context builds correctly
- Raven passes context
- Component renders
- Keyboard navigation
- Screen reader compatibility
- Full falsifiability chain end-to-end

See MANDATE_2_IMPLEMENTATION_PLAN.md Phase 7 for full test list.

---

## 🎓 Learning Path

If new to this codebase:
1. Start: MANDATE_1_COMPLETION_REPORT.md (understand aspects system)
2. Then: RELATIONAL_METADATA_QUICK_REF.md (understand data flow)
3. Then: MANDATE_2_PLAN_SUMMARY.md (understand this mandate)
4. Then: MANDATE_2_ARCHITECTURE.md (visual reference)
5. Then: MANDATE_2_IMPLEMENTATION_PLAN.md (technical details)

---

## ❓ FAQ

**Q: Why opt-in API flag?**  
A: Default API stays lightweight. Tooltip data only sent when requested. Backwards compatible.

**Q: Why not per-house tracking?**  
A: Seismograph doesn't currently track house placement. Would require separate math work. Future mandate.

**Q: Why click instead of hover?**  
A: Mobile devices can't hover. Click works everywhere: desktop, mobile, keyboard.

**Q: Why Radix Popover?**  
A: Built-in accessibility (keyboard nav, screen readers, focus management). Production-ready.

**Q: Can I do phases in parallel?**  
A: No – each phase depends on previous (Phase 2 needs Phase 1's output, etc.). Do them sequentially.

---

## 📝 Notes

- **Build should pass after each phase** — Don't leave broken code
- **Test incrementally** — Don't wait until Phase 7 to test
- **Reference MANDATE_2_ARCHITECTURE.md often** — Visual reference is helpful
- **Pseudo-code in MANDATE_2_IMPLEMENTATION_PLAN.md is specific** — Use it as implementation template

---

## 🎯 Success Looks Like

After Phase 7:
✅ User clicks magnitude → tooltip opens  
✅ Tooltip shows aspects + formulas + calculations  
✅ ESC closes tooltip  
✅ Tab navigates through fields  
✅ Screen reader reads content  
✅ Mobile users can access (no hover required)  
✅ Falsifiability chain verified: geometry → aspects → weights → formula → user experience  

---

**MANDATE 2 PLAN: COMPLETE AND READY**

All phases documented. All decisions locked. No ambiguity.

👉 **Next: Begin Phase 1 implementation**

