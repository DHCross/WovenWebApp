# Relational Context: Negative Constraints Architecture

## Design Philosophy

**Math Brain describes weather. Raven Chatbot handles nuance.**

The relationship context (PARTNER/FRIEND/FAMILY, intimacy tiers) acts as **guardrails** (what NOT to assume), not a **steering wheel** (what to say). Daily climate cards stay generic and safe; the Raven chatbot holds the full nuance of relationship dynamics.

## Key Insight

> "Treating contact as optional already forms the foundation of their approach."

If someone tells you their relationship is a situationship (P3), saying "you might treat contact as optional" isn't helpful—it matches their current baseline. The phrase reads as hollow or even validating avoidance.

## Implementation: Negative Constraints

The `RelationshipContext` interface tells the narrative generator what NOT to assume:

```typescript
interface RelationshipContext {
  type?: 'PARTNER' | 'FRIEND' | 'FAMILY';
  intimacy_tier?: 'P1' | 'P2' | 'P3' | 'P4' | 'P5a' | 'P5b';
  role?: string;
}
```

### Constraint Matrix

| Relationship | Constraint | Reason |
|-------------|-----------|--------|
| **FAMILY** | Don't say "if contact doesn't happen, nothing breaks" | High-obligation relationship; skipping contact may have real consequences |
| **FAMILY** | Don't suggest "subtlety may land more easily" | Could sound like "walk on eggshells around your family" |
| **FRIEND** | Allow "contact optional" language | Friends genuinely have optional contact |
| **PARTNER/P3 (situationship)** | Don't say "treat contact as optional" | Matches their baseline—stating the obvious |
| **PARTNER/P4 (casual)** | Allow "contact optional" language | Low-stakes, genuinely optional |
| **PARTNER/P5a/P5b (committed)** | Don't give momentum/shared action advice | Could read as "work on your relationship today" |

### Code Implementation

In `lib/climate-narrative.ts`:

```typescript
// Only add "contact optional" language if appropriate
const canDescribeContactOptional = 
  !relationshipContext?.type || // No context = stay generic
  (relationshipContext.type === 'FRIEND') || // Friends: genuinely optional
  (relationshipContext.type === 'PARTNER' && relationshipContext.intimacy_tier === 'P4'); // Casual

// Don't give relationship work advice to committed partners
const canDescribeMomentum =
  !relationshipContext?.type ||
  relationshipContext.type !== 'PARTNER' ||
  !['P5a', 'P5b'].includes(relationshipContext.intimacy_tier || '');

// Don't tell FAMILY about communication subtlety
const canDescribeSensitivity =
  !relationshipContext?.type ||
  relationshipContext.type !== 'FAMILY';
```

## What This Enables

1. **Safe Defaults**: Without relationship context, output stays maximally guarded
2. **Selective Expansion**: Only adds specific phrasing when relationship type permits
3. **Graceful Degradation**: If context is missing or partial, falls back to generic
4. **Architecture Split**: Math Brain stays weather-focused; Raven handles advice

## Files Modified

- `lib/climate-narrative.ts` - Added `RelationshipContext` interface, updated `generateRelationalGuidance()`
- `components/mathbrain/EnhancedDailyClimateCard.tsx` - Added `relationshipContext` prop
- `app/math-brain/page.tsx` - Passes relationship context to climate cards

## E-Prime Compliance

All narrative output follows E-Prime principles:
- No forms of "to be" (is/are/was/were)
- No directive verbs ("keep," "make sure," "expect")
- Weather description only, not behavioral instruction

## Example Output Variations

### FAMILY + Sensitive Field
> "The field feels sensitive today. How you engage—or whether you engage—remains yours to determine."

(Omits both "subtlety" suggestion and "nothing breaks if you skip contact")

### FRIEND + Sensitive Field
> "The field feels sensitive today. If contact happens, subtlety may land more easily than intensity. If contact doesn't happen, nothing breaks. How you engage—or whether you engage—remains yours to determine."

(Full phrasing—friends have genuinely optional contact)

### PARTNER/P5a + Momentum Field
> "The field carries momentum today. How you engage—or whether you engage—remains yours to determine."

(Omits "shared action tends to flow"—don't give relationship work advice)

---

*Implementation Date: Session continuation*
*Architecture: Math Brain v5.0 + E-Prime + Negative Constraints*
