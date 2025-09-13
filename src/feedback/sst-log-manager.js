// SST Logs (Falsifiability Table)
// Tracks WB (Within Boundary), ABE (At Boundary Edge), OSR (Outside Symbolic Range)
// Purpose: Keep mirrors honest; misses become calibration data, not user error

/**
 * SST (Symbolic Resonance Test) Categories
 */
const SST_CATEGORIES = {
  WB: 'within_boundary',    // Clear, felt resonance; user confirms
  ABE: 'at_boundary_edge',  // Partial/inverted/mis-toned resonance; still useful signal
  OSR: 'outside_symbolic_range' // No resonance; valid non-hit
};

/**
 * Driver vs Role alignment for Drift Index tracking
 */
const ALIGNMENT_TYPES = {
  DRIVER: 'driver_aligned',  // Sidereal-leaning: action, movement, external
  ROLE: 'role_aligned',     // Tropical-leaning: identity, internal, psychological
  NEUTRAL: 'neutral'        // No clear lean
};

/**
 * Create a new SST log entry
 */
function createLogEntry(hookTitle, category, alignment = null, clarification = '', metadata = {}) {
  return {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    hook_title: hookTitle,
    category,
    alignment: alignment || ALIGNMENT_TYPES.NEUTRAL,
    clarification: clarification.slice(0, 500), // Limit clarification length
    metadata: {
      session_id: metadata.session_id || null,
      hook_intensity: metadata.hook_intensity || null,
      orb_degrees: metadata.orb_degrees || null,
      aspect_type: metadata.aspect_type || null,
      ...metadata
    }
  };
}

/**
 * Generate unique log entry ID
 */
function generateLogId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 4);
  return `sst_${timestamp}_${random}`;
}

/**
 * Process clarification text to detect alignment type
 */
function detectAlignment(clarification, hookTitle) {
  if (!clarification) return ALIGNMENT_TYPES.NEUTRAL;
  
  const text = clarification.toLowerCase();
  
  // Driver-aligned (sidereal-leaning) indicators
  const driverKeywords = [
    'doing', 'action', 'movement', 'external', 'events', 'timing', 'when',
    'working', 'activity', 'behavior', 'performance', 'results', 'outcomes',
    'schedule', 'routine', 'practical', 'concrete', 'observable'
  ];
  
  // Role-aligned (tropical-leaning) indicators  
  const roleKeywords = [
    'feeling', 'identity', 'who i am', 'internal', 'emotional', 'psychological',
    'personality', 'character', 'nature', 'essence', 'being', 'self',
    'mindset', 'attitude', 'perspective', 'inner', 'soul', 'core'
  ];
  
  const driverMatches = driverKeywords.filter(keyword => text.includes(keyword)).length;
  const roleMatches = roleKeywords.filter(keyword => text.includes(keyword)).length;
  
  // Require significant difference to classify
  if (driverMatches > roleMatches + 1) return ALIGNMENT_TYPES.DRIVER;
  if (roleMatches > driverMatches + 1) return ALIGNMENT_TYPES.ROLE;
  
  return ALIGNMENT_TYPES.NEUTRAL;
}

/**
 * SST Log manager class
 */
class SSTLogManager {
  constructor() {
    this.logs = [];
    this.sessionStats = null;
  }
  
  /**
   * Add a new log entry
   */
  addEntry(hookTitle, category, clarification = '', metadata = {}) {
    const alignment = detectAlignment(clarification, hookTitle);
    const entry = createLogEntry(hookTitle, category, alignment, clarification, metadata);
    this.logs.push(entry);
    return entry;
  }
  
  /**
   * Get logs for a specific session
   */
  getSessionLogs(sessionId) {
    return this.logs.filter(log => log.metadata.session_id === sessionId);
  }
  
  /**
   * Calculate session scores
   */
  calculateSessionScores(sessionId = null) {
    const sessionLogs = sessionId ? this.getSessionLogs(sessionId) : this.logs;
    
    if (sessionLogs.length === 0) {
      return {
        accuracy: 0,
        edge_capture: 0,
        clarity: 1,
        total_entries: 0,
        wb_count: 0,
        abe_count: 0,
        osr_count: 0
      };
    }
    
    const wb = sessionLogs.filter(log => log.category === SST_CATEGORIES.WB).length;
    const abe = sessionLogs.filter(log => log.category === SST_CATEGORIES.ABE).length;
    const osr = sessionLogs.filter(log => log.category === SST_CATEGORIES.OSR).length;
    const total = wb + abe + osr;
    
    // Unclear prompts: entries with very short or empty clarifications
    const unclearCount = sessionLogs.filter(log => 
      log.clarification.length < 10 && log.category !== SST_CATEGORIES.WB
    ).length;
    
    const accuracy = total > 0 ? wb / total : 0;
    const edgeCapture = (wb + abe) > 0 ? abe / (wb + abe) : 0;
    const clarity = total > 0 ? 1 - (unclearCount / total) : 1;
    
    return {
      accuracy: Math.round(accuracy * 100) / 100,
      edge_capture: Math.round(edgeCapture * 100) / 100,
      clarity: Math.round(clarity * 100) / 100,
      total_entries: total,
      wb_count: wb,
      abe_count: abe,
      osr_count: osr,
      unclear_count: unclearCount
    };
  }
  
  /**
   * Calculate Drift Index (sidereal lean detector)
   */
  calculateDriftIndex(sessionId = null, minOSRThreshold = 3) {
    const sessionLogs = sessionId ? this.getSessionLogs(sessionId) : this.logs;
    const osrLogs = sessionLogs.filter(log => log.category === SST_CATEGORIES.OSR);
    
    if (osrLogs.length < minOSRThreshold) {
      return {
        drift_detected: false,
        drift_direction: null,
        confidence: 0,
        osr_count: osrLogs.length,
        driver_aligned: 0,
        role_aligned: 0
      };
    }
    
    const driverAligned = osrLogs.filter(log => log.alignment === ALIGNMENT_TYPES.DRIVER).length;
    const roleAligned = osrLogs.filter(log => log.alignment === ALIGNMENT_TYPES.ROLE).length;
    const total = driverAligned + roleAligned;
    
    if (total === 0) {
      return {
        drift_detected: false,
        drift_direction: null,
        confidence: 0,
        osr_count: osrLogs.length,
        driver_aligned: 0,
        role_aligned: 0
      };
    }
    
    const driverRatio = driverAligned / total;
    const roleRatio = roleAligned / total;
    
    // Require 60%+ lean and minimum sample size for drift detection
    let driftDetected = false;
    let driftDirection = null;
    let confidence = 0;
    
    if (driverRatio >= 0.6 && total >= 3) {
      driftDetected = true;
      driftDirection = 'sidereal';
      confidence = Math.round(driverRatio * 100) / 100;
    } else if (roleRatio >= 0.6 && total >= 3) {
      driftDetected = true;
      driftDirection = 'tropical';
      confidence = Math.round(roleRatio * 100) / 100;
    }
    
    return {
      drift_detected: driftDetected,
      drift_direction: driftDirection,
      confidence,
      osr_count: osrLogs.length,
      driver_aligned: driverAligned,
      role_aligned: roleAligned,
      sample_size: total
    };
  }
  
  /**
   * Export logs for persistence
   */
  exportLogs() {
    return {
      logs: this.logs,
      exported_at: new Date().toISOString(),
      version: '1.0.0'
    };
  }
  
  /**
   * Import logs from storage
   */
  importLogs(data) {
    if (data && Array.isArray(data.logs)) {
      this.logs = data.logs;
      return true;
    }
    return false;
  }
  
  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }
}

/**
 * Generate falsifiability prompt for a hook
 */
function generateFalsifiabilityPrompt(hookTitle, context = {}) {
  return {
    hook_title: hookTitle,
    prompt: `How does "${hookTitle}" land in your felt experience?`,
    options: [
      {
        category: SST_CATEGORIES.WB,
        label: 'Within Boundary (WB)',
        description: 'Clear, felt resonance - this fits my lived experience'
      },
      {
        category: SST_CATEGORIES.ABE,
        label: 'At Boundary Edge (ABE)', 
        description: 'Partial fit - almost right but needs adjustment'
      },
      {
        category: SST_CATEGORIES.OSR,
        label: 'Outside Symbolic Range (OSR)',
        description: 'No resonance - this doesn\'t match my experience'
      }
    ],
    clarification_prompt: 'Optional: Add specific details about how this lands (or doesn\'t) for you:',
    context
  };
}

module.exports = {
  SSTLogManager,
  SST_CATEGORIES,
  ALIGNMENT_TYPES,
  createLogEntry,
  detectAlignment,
  generateFalsifiabilityPrompt
};