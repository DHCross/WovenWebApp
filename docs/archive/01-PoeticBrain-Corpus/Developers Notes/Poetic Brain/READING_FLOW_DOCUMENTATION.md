# Raven Calder (Poetic Brain) Reading Flow Documentation

> [!CAUTION]
> **DEPRECATED — Pre-Shipyard / File-Upload Era**
> This document describes the original architecture where users uploaded JSON/PDF reports.
> The current Shipyard architecture uses conversational intake with the Chart Engine.
> See: `/Shipyard/vessel/docs/READING_FLOW.md` for current documentation.

**Last Updated:** October 12, 2025  
**Status:** ⚠️ DEPRECATED — See Shipyard docs for current architecture

## 📖 Complete Reading Flow

### **Phase 1: Starting a Reading**

#### **Option A: Upload Report** ✅
1. User clicks **🪞 Mirror** or **🌡️ Balance** button in header
2. File dialog opens → User selects JSON/PDF report
3. `handleFileChange()` reads and parses file content
4. `analyzeReportContext()` is triggered automatically:
   - Creates optimistic Raven message placeholder
   - Sends full JSON content to `/api/raven`
   - **NEW:** Report content now includes natal charts, aspects, daily readings
   - Raven responds with acknowledgment + Balance Meter summary
5. Report context added to sidebar badge (🪞 or 🌡️ icon + name)
6. **Reading has begun** - user can now ask questions

**What Changed (Our Fix):**
- ✅ Raven now receives FULL JSON context (natal data, aspects, synastry)
- ✅ Can answer: "What's my Sun sign?", "Which day has Mars square Pluto?"
- ❌ Before: Only received Balance Meter summary

---

#### **Option B: Conversational Start** ✅
1. User types message without uploading report
2. If message requests personal reading → Guard message prompts for upload
3. If simple greeting → Raven replies naturally
4. If general question → Raven engages conversationally
5. **Reading can continue** but lacks chart-specific data until report uploaded

---

### **Phase 2: Active Reading**

#### **During Conversation:**
1. User asks questions, Raven responds
2. **Ping Feedback System** tracks resonance:
   - **WB (Whole Body):** Mirror confirmed, pattern recognized
   - **ABE (Almost But Edge):** Close but needs adjustment
   - **OSR (Off / Sidereal / Redundant):** Miss or unneeded repetition
3. Actor/Role Detector builds composite profile from feedback
4. Session context accumulates conversation history

#### **Available Actions:**
| Button | Location | Function |
|--------|----------|----------|
| **🎭 Poetic** | Header (if has mirror data) | Request symbol-to-poem translation |
| **📔 Session Recap** | Header (always) | Generate journal narrative immediately |
| **🔮 End Reading** | Desktop action bar | Show comprehensive summary |
| **📔 Transcript** | Desktop action bar | Export full conversation JSON |

---

### **Phase 3: Ending a Reading**

#### **Option A: End Reading (Comprehensive)** ✅

**Location:** Desktop view, purple button "🔮 End Reading"

**Trigger:** Clicks → `onShowReadingSummary()` → `setShowReadingSummary(true)`

**What Happens:**
1. **Reading Summary Card** opens with:
   - **Big Vectors:** Primary tension patterns (e.g., "Restless / Grounded")
   - **Resonance Fidelity:** WB/ABE/OSR breakdown (e.g., "78% alignment")
   - **Actor/Role Composite:** Jungian function stack (e.g., "Ti-Ne" with confidence band)
   - **Key Moments:** Top 3 resonant exchanges
   - **Symbolic Images:** Pattern themes
   - **Poem Lines:** Affirmed paradoxes

2. **Generate Journal Button** inside summary:
   - Calls `generateJournalEntry()`
   - Opens journal modal within summary card
   - Includes: Title, narrative, session metadata, primary patterns

3. **Actions Available:**
   - Copy journal to clipboard
   - Export as PDF (fast generator)
   - Start New Reading (resets session context)
   - Close (keep conversation visible)

**Flow:**
```
Click "End Reading" 
  → Reading Summary Card opens
    → [Optional] Click "Generate Journal"
      → Journal modal opens within card
        → Copy/Export/Close
    → [OR] Start New Reading
      → Session context resets
      → Conversation preserved
```

---

#### **Option B: Session Recap (Quick Journal)** ✅ **NEW**

**Location:** Header, gradient purple-blue button "📔 Session Recap"

**Trigger:** Clicks → `handleSessionRecap()` → generates journal → modal opens

**What Happens:**
1. **Session Recap Modal** opens immediately with:
   - **Title:** Auto-generated from session
   - **Narrative:** Conversation paraphrase (opening → exchanges → closing)
   - **Metadata:**
     - Total interactions count
     - Resonance fidelity percentage
     - Primary patterns list
   - **Copy to Clipboard** button

2. **No Actor/Role analysis** - just the narrative
3. **Does NOT close the reading** - user can continue after viewing

**Flow:**
```
Click "Session Recap"
  → Journal generated instantly
    → Modal shows narrative + metadata
      → Copy to clipboard
        → Close modal
          → Reading continues
```

---

#### **Option C: Continue Reading** ✅
- User doesn't click anything
- Conversation continues with same report context
- Can upload additional reports (multi-report analysis)
- All report contexts visible in sidebar badges

---

### **Phase 4: Multi-Report Readings**

#### **How It Works:** ✅
1. User uploads **Report A** (e.g., Solo Mirror)
   - Badge appears: 🪞 Report A
   - Raven has natal chart data for Person A

2. User uploads **Report B** (e.g., Synastry Report)
   - Badge appears: 🪞 Report B
   - Raven has natal charts for Person A + Person B
   - Can now answer synastry questions

3. User asks: "How does my Venus aspect their Mars?"
   - Raven references BOTH reports
   - **NEW FIX:** Has access to full JSON from both uploads
   - Can provide specific aspect details (orb, potency, interpretation)

4. User removes report: Click ✕ on badge
   - Report context removed from session
   - Raven no longer references that data

---

## 🔧 Technical Implementation

### **Report Upload Flow**

```typescript
// 1. File selected
handleFileChange(event) {
  const file = event.target.files[0];
  const content = await readFile(file); // Full JSON
  
  // 2. Create report context
  const reportContext: ReportContext = {
    id: generateId(),
    type: 'mirror' | 'balance',
    name: 'Report name',
    summary: 'Balance Meter summary',
    content: content  // ← FULL JSON STORED HERE
  };
  
  // 3. Trigger analysis
  await analyzeReportContext(reportContext);
}

// 4. Send to API
analyzeReportContext(reportContext) {
  const payload = {
    input: reportContext.content,  // ← Full JSON sent
    options: {
      reportContexts: [reportContext]  // ← All reports included
    }
  };
  
  fetch('/api/raven', { body: JSON.stringify(payload) });
}
```

---

### **API Processing (Our Fix)**

```typescript
// lib/raven/render.ts - conversational flow

const reportContexts = options?.reportContexts || [];
let contextSummary = '';

// NEW: Extract data from each uploaded report
for (const ctx of reportContexts) {
  const parsed = JSON.parse(ctx.content);
  
  // Extract natal data
  if (parsed.person_a?.details) {
    contextSummary += `Person A: ${name}, born ${date}...\n`;
  }
  
  // Extract aspects
  if (parsed.symbolic_weather_context?.daily_readings) {
    contextSummary += `Daily aspects: Mars □ Pluto (0.82°)...\n`;
  }
}

// Inject into LLM prompt
const prompt = `You are Raven Calder.
Report Context:
${contextSummary}

User: "${userMessage}"

Answer using the actual chart data above.`;
```

---

### **Journal Generation**

```typescript
// Same function used by BOTH flows:
generateJournalEntry() {
  // Extract conversation history
  const userMessages = messages.filter(m => m.role === 'user');
  const ravenMessages = messages.filter(m => m.role === 'raven');
  
  // Build narrative paraphrase
  const narrative = buildNarrative(userMessages, ravenMessages);
  
  // Calculate metadata
  const metadata = {
    sessionDate: new Date().toISOString(),
    totalInteractions: userMessages.length,
    resonanceFidelity: calculateFidelity(),
    primaryPatterns: extractPatterns()
  };
  
  return { title, narrative, metadata };
}
```

**Used By:**
1. ✅ **End Reading** → Reading Summary Card → "Generate Journal" button
2. ✅ **Session Recap** → Header button → Direct modal

---

## 🎯 User Experience Summary

### **When to Use Each Feature:**

| Feature | Purpose | When to Use |
|---------|---------|-------------|
| **🪞 Mirror Upload** | Start reading with natal data | Beginning of session |
| **🌡️ Balance Upload** | Start reading with transit data | Beginning of session |
| **🎭 Poetic** | Get symbol-to-poem translation | During reading, when pattern resonates |
| **📔 Session Recap** | Quick journal summary | Anytime during/after reading |
| **🔮 End Reading** | Comprehensive Actor/Role analysis | When ready to formally close session |
| **📔 Transcript** | Export raw conversation | For external processing |

---

### **Typical Reading Flow:**

```
1. Upload Mirror Report (🪞)
   ↓
2. Ask questions ("What's my Sun-Moon dynamic?")
   ↓
3. Mark resonances (WB / ABE / OSR)
   ↓
4. Request Poetic translation (🎭)
   ↓
5. [Optional] Session Recap (📔) - check narrative
   ↓
6. Continue conversation
   ↓
7. End Reading (🔮) - see Actor/Role composite
   ↓
8. Generate Journal from summary
   ↓
9. Start New Reading or Close
```

---

## ✅ Verification Checklist

After our fixes, verify:

- [x] Upload solo mirror → Raven acknowledges natal data
- [x] Ask "What's my Sun sign?" → Raven answers from JSON
- [x] Upload synastry → Raven acknowledges both charts
- [x] Ask "How does my Venus aspect their Mars?" → Raven references actual aspect
- [x] Click "Session Recap" → Journal modal opens (NOT upload dialog)
- [x] Click "End Reading" → Reading Summary Card shows
- [x] "Generate Journal" in summary → Journal modal opens within card
- [x] Both journals use same `generateJournalEntry()` function
- [x] Multiple reports → All contexts available to Raven
- [x] Remove report badge → Context removed from session
- [x] iOS mobile → All buttons visible and functional

---

## 🐛 Known Issues (All Fixed)

### ~~1. Journal Button Opened Upload Dialog~~ ✅ FIXED
- **Before:** 📔 Journal opened file selection
- **After:** 📔 Session Recap generates journal modal
- **Fix:** Removed "journal" from upload types, created separate handler

### ~~2. Raven Ignoring Chart Data~~ ✅ FIXED
- **Before:** Only used Balance Meter summary
- **After:** Full JSON context passed to LLM
- **Fix:** Extract reportContexts in `lib/raven/render.ts`

### ~~3. Deprecated Terminology~~ ✅ FIXED
- **Before:** "Valence" (v4.0)
- **After:** "Directional Bias" (v5.0)
- **Fix:** Updated glossary and UI components

---

## 📚 Related Files

- `components/ChatClient.tsx` - Main chat logic, report handling
- `components/chat/Header.tsx` - Upload buttons, Session Recap button
- `components/ReadingSummaryCard.tsx` - End Reading summary
- `lib/raven/render.ts` - Conversational flow, report context injection
- `lib/raven/reportSummary.ts` - Balance Meter extraction (metadata only)
- `lib/natural-followup-flow.ts` - Journal narrative generation
- `lib/ping-tracker.ts` - WB/ABE/OSR feedback tracking
- `lib/actor-role-detector.ts` - Jungian function composite

---

**Status:** ✅ All reading flows verified working correctly after fixes
