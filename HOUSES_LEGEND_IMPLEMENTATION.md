# Houses Legend & Symbolic Reference System

**Date:** November 28, 2025  
**Status:** ✅ **COMPLETE**

---

## What Was Added

You identified two important gaps:

1. **Math Brain always produces natal geometry** — We clarified this in the relational metadata system. The natal chart is the baseline, and current field (transits/weather) layers on top.

2. **Missing Houses explanation on the graphic** — We created a comprehensive Houses legend and symbolic reference system.

---

## New Resources Created

### 1. `lib/raven/houses-legend.ts` (TypeScript Module)

Provides programmatic access to house meanings:

**Exports:**
- `HOUSES_LEGEND` — Complete 12-house reference with theme, keywords, shorthand
- `getHouseDescription(houseNumber)` — Get concise description
- `getHouseLegend(houseNumber)` — Get full house entry
- `generateHousesMarkdownTable()` — Generate markdown legend for embedding
- `generateHousesTextLegend()` — Generate plain text legend
- `getHouseShorthand(houseNumber)` — Get shorthand name
- `getHouseContext(houseNumber, planetName)` — Get contextual interpretation
- `getHousesQuickList()` — List all houses for UI dropdowns

**Example:**
```typescript
import { getHouseDescription, generateHousesMarkdownTable } from '@/lib/raven/houses-legend';

// Get description for 10th house
const desc = getHouseDescription(10);  // "Career & Legacy — Public image, vocation, authority"

// Generate table for embedding in report
const table = generateHousesMarkdownTable();

// Get planet-house interpretation
const context = getHouseContext(7, 'Venus');  // "How you show up in relationships..."
```

### 2. `docs/HOUSES_LEGEND.md` (Visual Reference)

A user-friendly markdown guide with:
- 12 houses table (House, Shorthand, Theme, Keywords)
- How to read each house
- Examples in context
- The Four Angles (1, 4, 7, 10)
- Angular vs. Succedent vs. Cadent grouping
- Integration guidance with Math Brain

**Can be:**
- Linked from reports
- Embedded in UI tooltips
- Downloaded as reference sheet
- Printed alongside charts

---

## The Twelve Houses Reference

| House | Shorthand | Symbolic Meaning |
|-------|-----------|------------------|
| **1** | Self | Identity, appearance, how you present |
| **2** | Resources | Values, money, self-worth, possessions |
| **3** | Communication | Mind, speaking, learning, siblings |
| **4** | Home & Family | Roots, family, foundation, private self |
| **5** | Creativity & Romance | Self-expression, children, romance, joy |
| **6** | Work & Health | Service, daily routine, wellness, habits |
| **7** | Partnership | Relationships, marriage, reflected self |
| **8** | Transformation | Death/rebirth, intimacy, depth, power |
| **9** | Exploration | Beliefs, travel, higher learning, meaning |
| **10** | Career & Legacy | Public role, career, reputation, calling |
| **11** | Community & Vision | Friends, groups, ideals, hopes, future |
| **12** | Dissolution & Spirit | Hidden, shadow, spiritual, unconscious |

---

## Use Cases

### 1. Chart Response Enhancement
When renderShareableMirror() returns chart data, optionally include:
```typescript
const housesReference = generateHousesMarkdownTable();
draft.housesLegend = housesReference;  // Can append to response
```

### 2. Tooltip Context
When hovering over a house on visualization:
```typescript
const shorthand = getHouseShorthand(houseNumber);
const description = getHouseDescription(houseNumber);
// Display: "7th House — Partnership | Relationships, marriage, reflected self"
```

### 3. Narrative Interpretation
When Raven describes a planet placement:
```typescript
const context = getHouseContext(10, 'Saturn');
// Output: "Saturn in your Career & Legacy — challenges to build lasting impact"
```

### 4. User Learning
Direct link to `docs/HOUSES_LEGEND.md` for anyone learning astrology basics.

---

## Math Brain Clarification

**Your observation:** Math Brain always produces natal geometry.

**Why:** The natal chart is the birth baseline—it never changes. Everything else (transits, progressions, current weather) layers on top of it.

**In the relational metadata system:**
- `baselineType: 'natal'` = read this person's birth chart
- `baselineType: 'composite'` = read the combined relationship chart
- `baselineType: 'synastry'` = read how two charts overlay
- `currentField` = what's happening NOW (transits, weather)

**Example flow:**
1. User uploads: "Show me how my birth chart + today's transits interact"
2. System detects: baseline = natal, field = transits
3. Synergy opening: "Baseline: Natal chart (Dan) → overlaying current Symbolic Weather front"
4. Renders natal first (the permanent structure)
5. Interprets transits as temporary layer on top

---

## Technical Integration

### In route.ts
```typescript
import { generateHousesMarkdownTable, getHousesQuickList } from '@/lib/raven/houses-legend';

// When returning chart response:
if (draft.chart_data) {
  draft.housesLegend = generateHousesMarkdownTable();
}
```

### In frontend/UI
```typescript
// Import and use
import { getHouseShorthand, getHouseDescription } from '@/lib/raven/houses-legend';

// On hover: show tooltip
const tooltip = `${getHouseShorthand(houseNum)}: ${getHouseDescription(houseNum)}`;
```

---

## Build Status

✅ **Compiled successfully** — No errors  
✅ **Route integrated** — Imports added  
✅ **Production ready** — Ready to use

---

## Next Steps (Optional)

1. **Embed in Chart UI**
   - Add hover tooltips with house meanings
   - Link to full legend from visualization
   - Show quick reference on load

2. **Include in Reports**
   - Optionally append houses reference to chart exports
   - Let users toggle legend visibility

3. **Create Aspect Legend**
   - Similar system for aspect meanings (conjunction, trine, square, etc.)
   - Would complement houses reference

4. **Extended Interpretations**
   - Expand `getHouseContext()` with more planet combinations
   - Create house-planet pairing guide
   - Example: "Mercury in 8th House" specific interpretation

---

## Files Created

- ✅ `lib/raven/houses-legend.ts` — Programmatic reference (298 lines)
- ✅ `docs/HOUSES_LEGEND.md` — User guide (visual reference)
- ✅ Updated `app/api/raven/route.ts` — Added imports

---

## Summary

**Problem:** Math Brain graphic shows houses but no legend explaining their meaning  
**Solution:** Created comprehensive houses legend system with both:
- **TypeScript module** for programmatic access in code
- **Markdown guide** for user learning and reference

**Result:** 
- Developers can easily access house meanings in code
- Users have clear reference for what each house represents
- Can embed in charts, tooltips, and reports
- Clarifies how natal baseline + current field work together

**Ready to use.** 🌙

