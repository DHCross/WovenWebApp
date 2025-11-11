# Clear Mirror PDF - Session Diagnostics Integration

**Date:** November 6, 2025  
**Feature:** Actor/Role Composite + Session Stats in Clear Mirror PDF exports

## Overview

The Clear Mirror PDF export now optionally includes a **Session Validation Layer** that captures:
- Actor/Role diagnostic composite from user feedback patterns
- Session resonance statistics (WB/ABE/OSR breakdown)
- Reading Rubric scores (if submitted)

This provides a complete picture of both the **symbolic geometry** (from Math Brain) and the **validation data** (from user interaction with Poetic Brain).

---

## Data Flow

```
User completes Poetic Brain session
  ↓
Provides feedback on mirrors (WB/ABE/OSR via ping tracker)
  ↓
WrapUpCard generates Actor/Role composite + collects session stats
  ↓
Optional: User submits Reading Rubric scores
  ↓
User clicks "Clear Mirror PDF" button
  ↓
WrapUpCard passes sessionDiagnostics to ChatClient
  ↓
ChatClient → buildClearMirrorFromContexts(reportContexts, sessionDiagnostics)
  ↓
generateClearMirrorMarkdown() renders new section
  ↓
PDF generated with complete validation layer
```

---

## What's Included

### 1. Actor / Role Composite

Diagnostic pattern detected from feedback:

```markdown
#### Actor / Role Composite

**Detected Pattern:** Initiator/Architect

- **Actor (Driver):** Initiator
- **Role (Style):** Architect
- **Confidence:** MODERATE (72%)
- **Sample Size:** 12 feedback points

**Sidereal Drift Detection:**
Some clarifications aligned with sidereal (Driver-first) orientation. 
Drift index: 45% (n=5)

*This composite emerged from your resonance pattern—what landed (✅) and 
how you clarified misses (❌). Raven tests patterns; you validate them.*
```

### 2. Resonance Summary

Session statistics table:

```markdown
#### Resonance Summary

| Metric | Value |
|--------|-------|
| Total Mirrors Presented | 15 |
| Accuracy Rate (✅ WB) | 73.3% |
| Clarity Rate (🟡 ABE) | 20.0% |
| Within Boundary | 11 |
| At Boundary Edge | 3 |
| Outside Symbolic Range | 1 |
```

### 3. Reading Rubric (if submitted)

User's subjective scores:

```markdown
#### Reading Rubric

| Category | Score |
|----------|-------|
| Pressure Mirror | 3/3 |
| Outlet Type | 2/3 |
| Internal Conflict | 3/3 |
| Emotional Tone | 2/3 |
| Surprise Signal | 1/3 |
| **Total** | **11/15** |
| **Assessment** | **Some clear hits** |
| Items Marked Off-Base | 2 |

*These scores apply to this session only and help calibrate future mirrors.*
```

---

## Technical Implementation

### Updated Interfaces

**`ClearMirrorData` (lib/templates/clear-mirror-template.ts)**

```typescript
sessionDiagnostics?: {
  actorRoleComposite?: {
    actor: string;
    role: string;
    composite: string;
    confidence: number;
    confidenceBand: 'LOW' | 'MODERATE' | 'HIGH';
    siderealDrift?: boolean;
    driftBand?: 'NONE' | 'POSSIBLE' | 'STRONG';
    driftIndex?: number;
    evidenceN?: number;
    sampleSize?: number;
  };
  sessionStats?: {
    totalMirrors: number;
    accuracyRate: number;
    clarityRate: number;
    breakdown: {
      wb: number;
      abe: number;
      osr: number;
      pending: number;
    };
  };
  rubricScores?: {
    pressure: number;
    outlet: number;
    conflict: number;
    tone: number;
    surprise: number;
    totalScore: number;
    scoreBand: string;
    nullCount?: number;
  };
};
```

### Updated Function Signatures

**`buildClearMirrorFromContexts()`**

```typescript
export function buildClearMirrorFromContexts(
  contexts: ReportContext[], 
  sessionDiagnostics?: SessionDiagnostics
): ClearMirrorData
```

**`handleGenerateClearMirrorPDF()`**

```typescript
const handleGenerateClearMirrorPDF = useCallback(async (
  sessionDiagnostics?: any
) => { ... }, [reportContexts, setStatusMessage, performSessionReset]);
```

**`onExportClearMirror` callback**

```typescript
onExportClearMirror?: (sessionDiagnostics?: {
  actorRoleComposite?: any;
  sessionStats?: any;
  rubricScores?: any;
}) => void;
```

---

## PDF Structure

The Session Validation Layer appears **after Mirror Voice** and **before Socratic Closure**:

```
1. Header (Person name + date)
2. Preface
3. Individual Field Snapshots (relational) OR Frontstage (solo)
4. Resonant Summary
5. Core Insights
6. Personality Blueprint
7. Polarity Cards
8. Integration
9. Inner Constitution
10. Mirror Voice
11. ⭐ **Session Validation Layer** ⭐  ← NEW
12. Socratic Closure (WB/ABE/OSR marking instructions)
13. Structure Note
14. Audit Layer (developer tables)
```

---

## Usage Scenarios

### Scenario 1: Full Session with Rubric

User completes reading → provides feedback on 15+ mirrors → submits rubric scores → generates Clear Mirror PDF.

**Result:** PDF includes complete validation layer with all three components.

### Scenario 2: Skip Rubric, Keep Stats

User completes reading → provides feedback → skips rubric → generates Clear Mirror PDF.

**Result:** PDF includes Actor/Role + Session Stats, but no Rubric section.

### Scenario 3: Direct Export (Skip Wrap-Up)

User uploads report → clicks "Skip to Clear Mirror Export" from modal → generates PDF immediately.

**Result:** PDF contains only symbolic geometry (no session diagnostics, since no feedback was collected).

---

## Benefits

1. **Complete Record:** Captures both geometry AND validation in one document
2. **Falsifiable:** Shows exactly how well the reading landed (accuracy rate)
3. **Diagnostic Value:** Actor/Role composite provides meta-insight about resonance pattern
4. **Calibration Data:** Rubric scores help tune future mirror generation
5. **Transparency:** User can see the evidence behind diagnostic claims

---

## Example Output

For a solo reading with moderate confidence composite:

```markdown
### Session Validation Layer
*Diagnostic feedback from this reading session*

#### Actor / Role Composite

**Detected Pattern:** Stabilizer/Architect

- **Actor (Driver):** Stabilizer
- **Role (Style):** Architect
- **Confidence:** MODERATE (68%)
- **Sample Size:** 14 feedback points

*This composite emerged from your resonance pattern—what landed (✅) 
and how you clarified misses (❌). Raven tests patterns; you validate them.*

#### Resonance Summary

| Metric | Value |
|--------|-------|
| Total Mirrors Presented | 14 |
| Accuracy Rate (✅ WB) | 71.4% |
| Clarity Rate (🟡 ABE) | 21.4% |
| Within Boundary | 10 |
| At Boundary Edge | 3 |
| Outside Symbolic Range | 1 |

#### Reading Rubric

| Category | Score |
|----------|-------|
| Pressure Mirror | 3/3 |
| Outlet Type | 2/3 |
| Internal Conflict | 2/3 |
| Emotional Tone | 3/3 |
| Surprise Signal | 2/3 |
| **Total** | **12/15** |
| **Assessment** | **Some clear hits** |

*These scores apply to this session only and help calibrate future mirrors.*
```

---

## Future Enhancements

- **Visual charts:** Bar graphs for WB/ABE/OSR distribution
- **Time-series tracking:** Compare Actor/Role across multiple sessions
- **Pattern evolution:** Track how composite changes with more data
- **Confidence thresholds:** Flag LOW confidence composites for user review
- **Comparative analysis:** Show drift between natal geometry and feedback patterns

---

## Related Files

- `lib/templates/clear-mirror-template.ts` - Template rendering
- `lib/pdf/clear-mirror-context-adapter.ts` - Data adapter
- `lib/pdf/clear-mirror-pdf.ts` - PDF generator
- `components/WrapUpCard.tsx` - Session diagnostics collection
- `components/ChatClient.tsx` - Export orchestration
- `lib/actor-role-detector.ts` - Composite generation
- `lib/ping-tracker.ts` - Session statistics
