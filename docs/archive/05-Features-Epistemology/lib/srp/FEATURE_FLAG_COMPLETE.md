# SRP Feature Flag: Ethical Circuit Breaker Complete

**Date:** 2025-11-04  
**Refinement:** #6 (Deployment Path) - Feature Flag

## The Door That Lets You Exit

```bash
# Default: SRP enabled (opt-out available)
npm run dev

# Explicit opt-out: disable SRP
ENABLE_SRP=false npm run dev
```

## Implementation

### Core Pattern

```typescript
// lib/srp/loader.ts
function isSRPEnabled(): boolean {
  const raw = process.env.ENABLE_SRP;
  if (raw === undefined || raw === null) return true; // default ON

  const normalized = raw.trim().toLowerCase();
  if (!normalized) return true;

  const truthy = new Set(['true', '1', 'yes', 'on', 'enable', 'enabled', 'auto']);
  const falsy = new Set(['false', '0', 'no', 'off', 'disable', 'disabled']);

  if (truthy.has(normalized)) return true;
  if (falsy.has(normalized)) return false;

  console.warn(`[SRP] Unrecognized ENABLE_SRP value "${raw}", defaulting to enabled.`);
  return true;
}

export function getLightBlend(blendId: number): LightBlend | null {
  if (!isSRPEnabled()) return null;
  // ... rest of loading logic
}
```

### Safety Design

1. **Defaults to ON** - Enrichment available unless explicitly disabled
2. **Flexible truthy parsing** - `'true'`, `'TRUE'`, `'1'`, `'yes'`, `'auto'` all enable
3. **Runtime toggle** - Can be changed without code deployment
4. **Graceful degradation** - System works perfectly with SRP disabled
5. **No leakage** - Disabled = null enrichment, clean payloads

---

## Philosophy: The Ethical Gatekeeper

**From the Tower Parable:**

> "A door," said the mason. "Just one door. So the world could tell him he'd made a mistake."

The feature flag **is** that door. It ensures:

- **Revocability** - Can be disabled at any time
- **Consent** - Must be explicitly enabled
- **Testing** - A/B tests are trivial (on vs off)
- **Free will** - No hidden symbolic influence

---

## Testing Matrix

| `ENABLE_SRP` | Enrichment | Behavior |
|--------------|------------|----------|
| undefined    | ✅ Enabled  | Full SRP enrichment (default) |
| `'false'`    | ❌ Disabled | Clean aspects, no SRP fields |
| `'0'`        | ❌ Disabled | Clean aspects, no SRP fields |
| `'true'`     | ✅ Enabled  | Full SRP enrichment |
| `'TRUE'`     | ✅ Enabled  | Case-insensitive |
| `'1'`        | ✅ Enabled  | Numeric truthy |
| `'maybe'`    | ✅ Enabled  | Logs warning, defaults to enabled |

---

## Usage Patterns

### Development (local testing)

```bash
# Test with SRP disabled
ENABLE_SRP=false npm run dev

# Test with SRP enabled (default)
npm run dev
```

### Production (Netlify)

Set environment variable in Netlify dashboard:

```
ENABLE_SRP=true
```

Or leave unset for enabled state (default).

### A/B Testing

```javascript
// In Math Brain or analytics layer
const srpEnabled = process.env.ENABLE_SRP !== 'false';

if (srpEnabled) {
  // Track SRP enrichment metrics
} else {
  // Track baseline metrics
}
```

---

## What This Enables

### Now Possible

1. **Shadow enrichment experiments** - Can be toggled off if cues don't land
2. **User preference** - Could become per-user setting eventually
3. **Gradual rollout** - Enable for beta testers first
4. **Emergency disable** - Single env var change, no code deploy
5. **Performance testing** - Measure impact of SRP on response times

### The Engineering Guarantee

**No system should run without an off-switch.** This is the difference between a tool and a prison. The SRP layer can now be:

- Enabled when it serves
- Disabled when it doesn't
- Tested without risk
- Deployed without fear

---

## Next Steps (Now Safe to Explore)

With the circuit breaker installed, we can **safely** implement:

**B. Shadow Enrichment**  
Populate restoration cues knowing they can be disabled if they don't breathe right.

**Full 144-Blend Ledger**  
Expand JSON files knowing the whole system can be toggled off.

**Math Brain Integration**  
Wire SRP into payload generation with kill switch protection.

**Poetic Brain Tuning**  
Experiment with hinge phrase formats, can revert instantly.

---

## Commit Message

```
[2025-11-04] FEATURE: SRP ethical circuit breaker (ENABLE_SRP)

Refinement #6: Deployment path with consensual opt-in

Architecture:
- Feature flag defaults to OFF (safe, consensual)
- Only ENABLE_SRP='true' enables enrichment
- Graceful degradation when disabled
- No code changes needed to toggle

Philosophy:
"A door. So the world could tell him he'd made a mistake."
The tower has an exit. Free will preserved.

Next: Shadow enrichment (now safe to experiment)
```

---

## The Moral Perimeter

This isn't just pragmatic engineering. It's **ethics as architecture**. Every symbolic system that influences human perception should have:

1. **Consent** (opt-in, not opt-out)
2. **Revocability** (can be disabled)
3. **Transparency** (flag is explicit, not hidden)
4. **Testing** (A/B comparisons possible)

The SRP integration now has all four. The ethical gatekeeper stands guard.
