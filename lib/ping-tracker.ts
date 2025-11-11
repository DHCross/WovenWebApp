export interface PingFeedbackData {
  messageId: string;
  response: 'yes' | 'no' | 'maybe' | 'unclear' | 'pending';
  note?: string;
  timestamp: string;
  sessionId: string;
  checkpointType?: 'hook' | 'vector' | 'aspect' | 'general' | 'repair';
  messageContent?: string; // Store content for Actor/Role analysis
  sstCategory?: 'WB' | 'ABE' | 'OSR'; // SST classification
  probe?: {
    type: 'INVERSION' | 'TONE' | 'DIRECTION';
    userText?: string; // user's clarification text
    mappedTo?: 'DRIVER' | 'ROLE' | 'INCONCLUSIVE';
    area?: string; // thematic area: e.g., agency/energy, boundaries, communication
  };
  createdAt?: string;
  firstSessionId?: string;
}

export interface HitRateStats {
  total: number;
  accuracyRate: number; // (yes + maybe/2) / total
  clarityRate: number; // (total - unclear) / total
  breakdown: Record<string, number>;
  byCheckpointType: Record<string, { total: number; accuracyRate: number; clarityRate: number }>;
}

class PingTracker {
  private feedbackData: PingFeedbackData[] = [];
  private sessionId: string;
  // Ephemeral set of sealed session IDs (not persisted across reload)
  private sealedSessions: Set<string> = new Set();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadFromStorage();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('raven_ping_feedback');
        if (stored) {
          this.feedbackData = JSON.parse(stored);
        }
      } catch (error) {
        console.warn('Failed to load ping feedback data:', error);
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('raven_ping_feedback', JSON.stringify(this.feedbackData));
      } catch (error) {
        console.warn('Failed to save ping feedback data:', error);
      }
    }
  }

  /** Get the active session/container id */
  getCurrentSessionId(): string {
    return this.sessionId;
  }

  /**
   * Seal a session's diagnostic container. If sealing the current session,
   * a fresh session id is generated so future pings go into a new container.
   * This is ephemeral and only applies within the open tab/session.
   */
  sealSession(sessionId?: string): void {
    const target = sessionId || this.sessionId;
    this.sealedSessions.add(target);
    // If sealing the current, immediately rotate to a new container
    if (!sessionId || sessionId === this.sessionId) {
      this.sessionId = this.generateSessionId();
    }
  }

  /** Whether a given session id has been sealed (closed/archived) */
  isSessionSealed(sessionId?: string): boolean {
    const target = sessionId || this.sessionId;
    return this.sealedSessions.has(target);
  }

  private autoRegisterEnabled = true;

  enableAutoRegister(): void {
    this.autoRegisterEnabled = true;
  }

  disableAutoRegister(): void {
    this.autoRegisterEnabled = false;
  }

  // Register a pending ping for an item that's been shown but not answered yet
  registerPending(
    messageId: string,
    checkpointType?: PingFeedbackData['checkpointType'],
    messageContent?: string
  ): void {
    if (!this.autoRegisterEnabled) return;
    // Ignore writes to sealed sessions; pendings always attach to current container
    if (this.isSessionSealed()) {
      // no-op if somehow called after sealing; ensure we are writing to current (fresh) container
    }
    const existing = this.feedbackData.find(f => f.messageId === messageId);
    if (existing) return; // don't overwrite existing feedback
    const nowIso = new Date().toISOString();
    const pending: PingFeedbackData = {
      messageId,
      response: 'pending',
      timestamp: nowIso,
      sessionId: this.sessionId,
      checkpointType,
      messageContent,
      createdAt: nowIso,
      firstSessionId: this.sessionId
    };
    this.feedbackData.push(pending);
    this.saveToStorage();
  }

  recordFeedback(
    messageId: string, 
    response: PingFeedbackData['response'], 
    note?: string,
    checkpointType?: PingFeedbackData['checkpointType'],
    messageContent?: string
  ): void {
  // If prior container was sealed, we are already on a fresh session id
  // Proceed to record under current session
    // Classify SST category based on response
  let sstCategory: 'WB' | 'ABE' | 'OSR' | undefined;
  if (response === 'yes') sstCategory = 'WB'; // Within Boundary
  else if (response === 'maybe') sstCategory = 'ABE'; // At Boundary Edge  
  else if (response === 'no' || response === 'unclear') sstCategory = 'OSR'; // Outside Symbolic Range (no/unclear)
  else sstCategory = undefined; // pending has no SST

    const feedback: PingFeedbackData = {
      messageId,
      response,
      note,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      checkpointType,
      messageContent,
      sstCategory
    };

  // Remove any existing feedback for this message
    this.feedbackData = this.feedbackData.filter(f => f.messageId !== messageId);
    
    // Add new feedback
    this.feedbackData.push(feedback);
    
    this.saveToStorage();
  }

  getFeedback(messageId: string): PingFeedbackData | undefined {
    return this.feedbackData.find(f => f.messageId === messageId);
  }

  getHitRateStats(sessionOnly: boolean = false): {
    total: number;
    accuracyRate: number;
    clarityRate: number;
    breakdown: Record<string, number>;
    byCheckpointType: Record<string, { total: number; accuracyRate: number; clarityRate: number }>;
  } {
    const relevantData = sessionOnly 
      ? this.feedbackData.filter(f => f.sessionId === this.sessionId)
      : this.feedbackData;
    // Ignore archived-on-age pendings (7+ days) for counts
    const now = Date.now();
    const isArchived = (f: PingFeedbackData) => f.response === 'pending' && f.createdAt && (now - new Date(f.createdAt).getTime()) > (7 * 24 * 60 * 60 * 1000);
    const pool = relevantData.filter(f => !isArchived(f));

    const nonPending = pool.filter(f => f.response !== 'pending');
    const totalPings = nonPending.length;
    const yesCount = nonPending.filter(f => f.response === 'yes').length;
    const noCount = nonPending.filter(f => f.response === 'no').length;
    const maybeCount = nonPending.filter(f => f.response === 'maybe').length;
    const unclearCount = nonPending.filter(f => f.response === 'unclear').length;
    const pendingCount = pool.filter(f => f.response === 'pending').length;

    // Accuracy: Yes responses + half weight for maybe responses
    const accuracyRate = totalPings > 0 
      ? ((yesCount + (maybeCount * 0.5)) / totalPings) * 100 
      : 0;

    // Clarity: Non-unclear responses
    const clarityRate = totalPings > 0 
      ? ((totalPings - unclearCount) / totalPings) * 100 
      : 0;

    // Breakdown by response type
    const breakdown = {
      yes: yesCount,
      no: noCount,
      maybe: maybeCount,
      unclear: unclearCount,
      pending: pendingCount
    };

    // Calculate by checkpoint type
    const byCheckpointType: Record<string, { total: number; accuracyRate: number; clarityRate: number }> = {};
    
  const checkpointTypes = ['hook', 'vector', 'aspect', 'general', 'repair'];
    
    checkpointTypes.forEach(type => {
  const typeFeedback = nonPending.filter(f => f.checkpointType === type);
      const typeTotal = typeFeedback.length;
      
      if (typeTotal > 0) {
        const typeYes = typeFeedback.filter(f => f.response === 'yes').length;
        const typeMaybe = typeFeedback.filter(f => f.response === 'maybe').length;
        const typeUnclear = typeFeedback.filter(f => f.response === 'unclear').length;
        
        byCheckpointType[type] = {
          total: typeTotal,
          accuracyRate: Math.round(((typeYes + (typeMaybe * 0.5)) / typeTotal) * 1000) / 10,
          clarityRate: Math.round(((typeTotal - typeUnclear) / typeTotal) * 1000) / 10
        };
      }
    });

    return {
      total: totalPings,
      accuracyRate: Math.round(accuracyRate * 10) / 10,
      clarityRate: Math.round(clarityRate * 10) / 10,
      breakdown,
      byCheckpointType
    };
  }

  getAllFeedback(): PingFeedbackData[] {
    return [...this.feedbackData];
  }

  clearData(): void {
    this.feedbackData = [];
    this.saveToStorage();
  }

  // Get session patterns for Actor/Role analysis
  getSessionPatterns(sessionId?: string): {
    wbPatterns: string[];
    abePatterns: string[];
  osrPatterns: Array<{ content: string; response: string; note?: string }>;
  osrProbes: Array<{ mirrorId: string; probe: 'INVERSION' | 'TONE' | 'DIRECTION'; mappedTo: 'DRIVER' | 'ROLE' | 'INCONCLUSIVE'; area?: string; text?: string }>;
  } {
    const targetSession = sessionId || this.sessionId;
    const sessionData = this.feedbackData.filter(f => f.sessionId === targetSession);
    const answered = sessionData.filter(f => f.response !== 'pending');

    const wbPatterns = answered
      .filter(f => f.sstCategory === 'WB' && f.messageContent)
      .map(f => f.messageContent!);

    const abePatterns = answered
      .filter(f => f.sstCategory === 'ABE' && f.messageContent)
      .map(f => f.messageContent!);

    const osrPatterns = answered
      // Exclude OSR items that have probes to avoid double-counting; probe text will be used instead
      .filter(f => f.sstCategory === 'OSR' && f.messageContent && !f.probe)
      .map(f => ({
        content: f.messageContent!,
        response: f.response,
        note: f.note
      }));

    const osrProbes = answered
      .filter(f => f.sstCategory === 'OSR' && f.probe)
      .map(f => ({
        mirrorId: f.messageId,
        probe: f.probe!.type,
        mappedTo: f.probe!.mappedTo || 'INCONCLUSIVE',
        area: f.probe!.area,
        text: f.probe!.userText
      }));

    return { wbPatterns, abePatterns, osrPatterns, osrProbes };
  }

  getPendingItems(sessionOnly: boolean = false): Array<{
    messageId: string;
    checkpointType?: 'hook' | 'vector' | 'aspect' | 'general' | 'repair';
    messageContent?: string;
    createdAt?: string;
    ageDays: number;
    priority: number;
  }> {
    const relevant = sessionOnly ? this.feedbackData.filter(f => f.sessionId === this.sessionId) : this.feedbackData;
    const now = Date.now();
    const isArchived = (f: PingFeedbackData) => f.response === 'pending' && f.createdAt && (now - new Date(f.createdAt).getTime()) > (7 * 24 * 60 * 60 * 1000);
    const pendings = relevant.filter(f => f.response === 'pending' && !isArchived(f));
    const items = pendings.map(f => {
      const created = f.createdAt ? new Date(f.createdAt).getTime() : new Date(f.timestamp).getTime();
      const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      const priority = (f.checkpointType === 'hook' ? 3 : f.checkpointType === 'aspect' ? 2 : f.checkpointType === 'vector' ? 1 : 0);
      return { messageId: f.messageId, checkpointType: f.checkpointType, messageContent: f.messageContent, createdAt: f.createdAt, ageDays, priority };
    });
    return items.sort((a, b) => (b.priority - a.priority) || (b.ageDays - a.ageDays));
  }

  getPendingCount(sessionOnly: boolean = false): number {
    const relevant = sessionOnly ? this.feedbackData.filter(f => f.sessionId === this.sessionId) : this.feedbackData;
    const now = Date.now();
    const isArchived = (f: PingFeedbackData) => f.response === 'pending' && f.createdAt && (now - new Date(f.createdAt).getTime()) > (7 * 24 * 60 * 60 * 1000);
    return relevant.filter(f => f.response === 'pending' && !isArchived(f)).length;
  }

  // Get OSR patterns for sidereal drift analysis
  getOSRPatterns(sessionId?: string): Array<{ content: string; response: string; note?: string }> {
    const patterns = this.getSessionPatterns(sessionId);
    return patterns.osrPatterns;
  }

  // Export session data for Actor/Role diagnostics
  exportSessionDiagnostics(sessionId?: string): {
    sessionId: string;
    patterns: {
      wbPatterns: string[];
      abePatterns: string[];
  osrPatterns: Array<{ content: string; response: string; note?: string }>;
  osrProbes: Array<{ mirrorId: string; probe: 'INVERSION' | 'TONE' | 'DIRECTION'; mappedTo: 'DRIVER' | 'ROLE' | 'INCONCLUSIVE'; area?: string; text?: string }>;
    };
    stats: {
      total: number;
      accuracyRate: number;
      clarityRate: number;
      breakdown: Record<string, number>;
      byCheckpointType: Record<string, { total: number; accuracyRate: number; clarityRate: number }>;
    };
  } {
    const targetSession = sessionId || this.sessionId;
    return {
      sessionId: targetSession,
      patterns: this.getSessionPatterns(targetSession),
      stats: this.getHitRateStats(true) // session-only stats
    };
  }

  exportData(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportDate: new Date().toISOString(),
      feedbackData: this.feedbackData,
      stats: this.getHitRateStats()
    }, null, 2);
  }
}

// Singleton instance
export const pingTracker = new PingTracker();
