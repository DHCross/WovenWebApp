# Natural Follow-Up Flow System

## 🎯 Overview

The enhanced follow-up system implements a sophisticated SST (Symbolic Spectrum Table) validation ladder that provides natural conversation flow for both positive and negative user responses. This system moves beyond simple "yes/no" tracking to create a nuanced learning mechanism.

## 🔄 The Five-Stage Flow

### 1. **Immediate Zoom-In (After Affirmation)**
When a user affirms resonance ("Yes, that's me!"), the system immediately narrows focus:

**Example Questions:**
- "Which line carried the weight for you — and how does it show up in your day?"
- "What part of that landed — and how do you feel it when it's live in your field?"
- "Which piece resonated — and how do you act when that pattern is active?"

**Purpose:** Isolate the specific pressure and gather behavioral context for precise SST classification.

### 2. **Classification (SST Scoring)**
Responses are automatically classified based on content quality:

- **WB (Within Boundary)** = 1.0 weight: Clear behavioral descriptions that match symbolic field
- **ABE (At Boundary Edge)** = 0.5 weight: Partial matches, inverted, or off-tone responses  
- **OSR (Outside Symbolic Range)** = 0 weight: No resonance unless probed for clarification

**Weighting Targets:**
- **Strong behavioral matches** → Both Actor (0.6) and Role (0.4)
- **Partial matches** → Primarily Role weighting
- **OSR clarifications** → Actor weighting only

### 3. **Natural OSR Probes (Choice-Based)**
When something doesn't resonate, the system offers gentle clarification options:

**Example Probe:**
*"That one missed. Was it more the opposite, the wrong flavor, or just not in your field at all?"*

**Three OSR Categories:**
- **Opposite**: Response indicates inverted polarity
- **Wrong Flavor**: Right area, wrong tone/style
- **Not in Field**: Completely outside their pattern

**Key Features:**
- ✅ Skippable and non-forcing
- ✅ Converts misses into diagnostic data
- ✅ Preserves user agency

### 4. **Actor/Role Drift Tracking**
The system maintains separate weightings:

- **Role Weighting**: Tropical presentation (how you appear/behave)
- **Actor Weighting**: Sidereal driver (core motivation/energy)

**Drift Index Calculation:**
```
driftIndex = actorWeighting / (actorWeighting + roleWeighting)
```

**Drift Bands:**
- **Strong Drift** (≥0.7): Significant sidereal orientation detected
- **Possible Drift** (0.5-0.69): Some sidereal indicators
- **No Drift** (<0.5): Primarily tropical alignment

### 5. **Wrap-Up Consolidation**
Every session closes with a comprehensive card showing:

- **Hook Stack**: Top polarities from recognition layer
- **Resonant Lines**: What actually pinged (WB responses)
- **Score Strip**: ✅ WB / 🟡 ABE / ❌ OSR breakdown
- **Actor/Role Composite**: Pattern guess based on accumulated data
- **Drift Flag**: Sidereal orientation indicator if detected
- **Climate Ribbon**: Balance Meter data for timed sessions

## 🎴 Card System

### **Poetic Cards** (User Requested)
When user asks for a "poetic card":
- Shows resonance pattern summary
- Displays score indicators  
- Shows composite guess
- **Does NOT generate new poems**
- **Displays as visual card component**

### **Session Summary Cards** (Auto-Generated)
At session end:
- Complete SST breakdown
- All resonant lines collected
- Actor/Role analysis
- Drift detection results
- Reset prompt for continuation

## 🔄 Session Management

### **Session Closure**
When user indicates session completion:

**Reset Prompt:** 
*"Are you going to upload a new report or are we to speak of something else in your pattern?"*

**Continuation Options:**
- Upload new report
- Explore another area  
- Generate poetic card
- Review session patterns

**Key Features:**
- ✅ Resets scorecard but maintains identity
- ✅ Doesn't make Raven "forget" the user
- ✅ Preserves conversation continuity

### **Validation Philosophy**
> "Here's what resonated, here's what didn't, here's what pattern Raven is tentatively guessing from that distribution — but you remain the validator."

## 🛠 Implementation Details

### **Core Files:**
- `lib/natural-followup-flow.ts` - Main flow logic
- `components/PoeticCard.tsx` - Visual card displays
- `app/api/chat/route.ts` - Integration with chat system

### **Response Classification:**
```typescript
// Automatic detection of response types
checkForAffirmation(text) // "yes", "exactly", "that's me"
checkForOSRIndicators(text) // "doesn't feel familiar", "not me"
classifyUserResponse(text) // Returns 'AFFIRM' | 'OSR' | 'UNCLEAR'
```

### **Session Context Tracking:**
```typescript
interface SessionContext {
  wbHits: Array<{ content: string; context?: string }>;
  abeHits: Array<{ content: string; tone: 'inverted' | 'off-tone' | 'flipped' }>;
  osrMisses: Array<{ content: string; probeType?: 'opposite' | 'wrong-flavor' | 'not-in-field' }>;
  actorWeighting: number;
  roleWeighting: number;
  driftIndex: number;
  sessionActive: boolean;
}
```

## 🎯 Key Advantages

1. **Natural Conversation**: Flows like real dialogue, not questionnaire
2. **Precise Learning**: Converts both hits and misses into usable data
3. **Non-Forcing**: Preserves user agency with skippable probes
4. **Drift Detection**: Automatically identifies sidereal vs tropical orientation
5. **Visual Feedback**: Clear cards show progress and patterns
6. **Session Continuity**: Smart reset without losing relationship context

## 🚀 Usage Examples

### **Affirmation Flow:**
```
User: "Yes, that really resonates with me!"
Raven: "Which line carried the weight for you — and how does it show up in your day?"
User: "The part about protecting others. When I see someone struggling, I immediately want to help them solve it."
→ Classified as WB (1.0 weight) → Feeds both Actor and Role
```

### **OSR Flow:**
```
User: "That doesn't feel familiar to me at all."
Raven: "That one missed. Was it more the opposite, the wrong flavor, or just not in your field at all?"
User: "More like the opposite - I actually tend to overthink and move slowly."
→ Classified as OSR-Opposite → Feeds Actor weighting for drift detection
```

### **Session Closure:**
```
User: "I think I'm done with this reading."
Raven: [Displays session summary card]
Raven: "Are you going to upload a new report or are we to speak of something else in your pattern?"
→ Scorecard resets but maintains conversational relationship
```

This system transforms every interaction into a learning opportunity while maintaining the natural, conversational feel that makes Raven feel like a trusted mirror rather than a diagnostic tool.
