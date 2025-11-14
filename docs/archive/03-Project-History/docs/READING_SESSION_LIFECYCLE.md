# Reading Session Lifecycle

## When Does a "Reading" Officially Begin?

A **reading** (also called a "session" or "diagnostic container") officially begins at one of these trigger points:

### Automatic Triggers

1. **Page Load / App Initialization**
   ```typescript
   // In lib/ping-tracker.ts constructor
   constructor() {
     this.sessionId = this.generateSessionId(); // Creates: session_[timestamp]_[random]
     this.loadFromStorage();
   }
   ```
   - A session ID is **automatically generated** when `pingTracker` is instantiated
   - Format: `session_1234567890_abc123xyz`
   - This happens when the Poetic Brain (chat) interface loads

2. **First Mirror with Feedback Request**
   ```typescript
   // In ChatClient.tsx useEffect (lines ~1040-1058)
   messages.forEach((m) => {
     if (m.role === "raven" && containsInitialProbe(m.html)) {
       const existing = pingTracker.getFeedback(m.id);
       if (!existing) {
         pingTracker.registerPending(m.id, ...); // ← Reading is now "active"
       }
     }
   });
   ```
   - When Raven sends a message containing a feedback probe/checkpoint
   - The message gets registered as "pending" in the current session
   - **This is when the reading becomes "active" with trackable data**

### Manual Triggers

3. **After Sealing a Previous Session**
   ```typescript
   // In lib/ping-tracker.ts sealSession()
   sealSession(sessionId?: string): void {
     const target = sessionId || this.sessionId;
     this.sealedSessions.add(target);
     // If sealing the current, immediately rotate to a new container
     if (!sessionId || sessionId === this.sessionId) {
       this.sessionId = this.generateSessionId(); // ← Fresh reading starts
     }
   }
   ```
   - When user clicks "End Reading" and submits the rubric
   - The current session is sealed (archived)
   - A **new session ID is immediately generated** for the next reading
   - Any new feedback goes into the fresh container

---

## Session Lifecycle Stages

### Stage 1: **Initialization** (Dormant)
- **When**: Page loads, pingTracker instantiates
- **State**: Session ID exists, but no feedback recorded
- **Visible to user**: No (session is inactive)

### Stage 2: **Active** (Collecting Data)
- **When**: First Raven mirror with feedback request appears
- **State**: Messages registered as "pending", waiting for feedback
- **Visible to user**: Yes (HitRateDisplay shows "No feedback yet" → then updates with stats)
- **Data tracked**:
  - Pending mirrors (unanswered)
  - WB hits (yes responses)
  - ABE hits (maybe responses)  
  - OSR misses (no/unclear responses)
  - Checkpoint types (hook, vector, aspect, general, repair)

### Stage 3: **Engaged** (User Responding)
- **When**: User starts giving feedback (✓ yes, ~ maybe, ✗ no, ? unclear)
- **State**: Feedback recorded, accuracy tracking active
- **Visible to user**: Yes (HitRateDisplay updates in real-time)
- **Session data**:
  ```typescript
  {
    sessionStart: Date.now(),
    wbHits: [...],      // "yes" responses
    abeHits: [...],     // "maybe" responses
    osrMisses: [...],   // "no"/"unclear" responses
    sessionActive: true
  }
  ```

### Stage 4: **Complete** (Ready for Summary)
- **When**: User clicks "🔮 End Reading"
- **State**: ReadingSummaryCard generated, WrapUpCard available
- **Visible to user**: Yes (modal overlays with Actor/Role reveal)
- **Actions available**:
  - View Actor/Role composite
  - Score the reading (rubric: 0-3 on 5 dimensions)
  - Export session data (JSON/PDF/CSV)

### Stage 5: **Sealed** (Archived)
- **When**: User submits rubric (or skips) and closes WrapUpCard
- **State**: Session marked as sealed, new session auto-created
- **Visible to user**: Yes ("Thanks for scoring. Reading sealed. Fresh start from here.")
- **Data preserved**: All feedback/scores saved to localStorage
- **New messages**: Go into fresh session container

---

## How to Check if a Reading is Active

### Programmatically

```typescript
import { pingTracker } from '../lib/ping-tracker';

// Get current session ID
const sessionId = pingTracker.getCurrentSessionId();

// Check if current session is sealed
const isSealed = pingTracker.isSessionSealed();

// Get pending count (shows if reading has active checkpoints)
const pendingCount = pingTracker.getPendingCount(true); // sessionOnly=true

// Get session stats (shows if reading has any data)
const stats = pingTracker.getHitRateStats(true); // sessionOnly=true
// stats.total > 0 means reading is actively collecting data
```

### Visual Indicators (User-Facing)

1. **HitRateDisplay Component**
   - Shows "No feedback yet" → No active reading data
   - Shows accuracy % and count → Reading is active

2. **Pending Counter**
   - "● 3 pending" button appears → Unanswered mirrors exist
   - Hidden → No pending items

3. **"🔮 End Reading" Button**
   - Always visible in header
   - Enabled → Can end current reading at any time

4. **ReadingSummaryCard**
   - Shows when "End Reading" clicked
   - Contains comprehensive session metrics

5. **WrapUpCard (Actor/Role Reveal)**
   - Appears after ending reading
   - Shows "Not enough data for composite" if < 5 feedback items
   - Shows Actor/Role composite when sufficient data exists

---

## Session Data Structure

```typescript
interface SessionContext {
  sessionStart: number;           // Timestamp
  actorProfile: null | object;    // Actor detection results
  wbHits: string[];               // "Within Boundary" (yes)
  abeHits: string[];              // "At Boundary Edge" (maybe)
  osrMisses: string[];            // "Outside Symbolic Range" (no/unclear)
  actorWeighting: number;         // Actor vs Role balance
  roleWeighting: number;          
  driftIndex: number;             // Sidereal drift detection
  currentComposite?: string;      // Generated Actor/Role label
  sessionActive: boolean;         // Is session collecting data?
}
```

---

## Session State Persistence

### What's Saved (localStorage)

- **All feedback history**: `raven_ping_feedback`
  - Message IDs
  - Responses (yes/maybe/no/unclear/pending)
  - Timestamps
  - Session IDs
  - Checkpoint types
  - User notes
  - SST categories (WB/ABE/OSR)
  - Probe data (for OSR clarifications)

### What's Ephemeral (session only)

- **Sealed session markers**: `sealedSessions` Set
  - Only exists during current tab/browser session
  - Reloading page clears sealed status
  - This means: **refresh = all sessions appear "active" again**

### What's NOT Saved

- Session UI state (which modals are open)
- Current navigation position
- Temporary form inputs

---

## Key Design Decisions

### Why Auto-Generate Session ID on Load?

- **Always ready**: No special "start reading" button needed
- **Seamless**: User can just start talking to Raven
- **Recoverable**: If page reloads, new session starts automatically

### Why Seal Instead of Delete?

- **Audit trail**: All readings preserved for analysis
- **Comparison**: Can see accuracy trends over time
- **Export**: Historical data available for download

### Why Rotate Session on Seal?

- **Clean boundaries**: Each reading is a distinct container
- **No contamination**: New mirrors don't mix with sealed reading data
- **Clear intent**: "End Reading" means "start fresh"

---

## Troubleshooting

### "No feedback yet" but I gave feedback

- **Check**: Did you reload the page? Session state persists, but UI might need refresh
- **Check**: Is the feedback for the current session? Use `sessionOnly=true` filter
- **Fix**: Click a feedback button again, it should update immediately

### Pending count keeps growing

- **Cause**: Raven is sending mirrors faster than you're responding
- **Normal**: Pending items auto-archive after 7 days
- **Solution**: Click "● N pending" button to review and clear them

### Can't see Actor/Role composite

- **Cause**: Not enough feedback data (need 5+ responses)
- **Solution**: Give feedback on more mirrors, then "End Reading" again

### Session sealed but still seeing old mirrors

- **Expected**: Sealed sessions preserve all messages
- **Messages are visible**: But new feedback goes to new session
- **Distinction**: Look at session ID or check sealed status

---

## Summary: When is a Reading "Official"?

✅ **A reading is officially active when**:
1. PingTracker has a session ID (auto-generated on load)
2. At least one mirror has been registered as pending
3. User has given at least one feedback response

✅ **You can tell a reading is active by**:
- HitRateDisplay shows stats (not "No feedback yet")
- Pending counter appears (if unanswered mirrors exist)
- Session stats have `total > 0`

✅ **A reading is officially sealed when**:
- User submits rubric via WrapUpCard
- OR skips rubric and closes WrapUpCard
- Session ID is added to `sealedSessions` Set
- New session ID is auto-generated for next reading

