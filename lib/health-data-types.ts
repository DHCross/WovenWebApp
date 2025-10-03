// lib/health-data-types.ts
// TypeScript types for Apple Health Auto Export data integration

/**
 * State of Mind entry from Apple Health
 */
export interface StateOfMind {
  kind: 'daily_mood' | 'momentary_emotion';
  start: string; // ISO 8601 timestamp
  end: string; // ISO 8601 timestamp
  id: string;
  valence: number; // -1 to 1
  valenceClassification?: 'very_unpleasant' | 'unpleasant' | 'slightly_unpleasant' | 'neutral' | 'slightly_pleasant' | 'pleasant' | 'very_pleasant';
  labels?: string[]; // e.g., ["anxious", "stressed", "drained"]
  associations?: string[]; // e.g., ["work", "family", "health"]
  metadata?: Record<string, any>;
}

/**
 * Generic health metric data point
 */
export interface HealthDataPoint {
  date: string; // YYYY-MM-DD format
  value: number;
  unit?: string;
}

/**
 * Raw Apple Health Auto Export JSON structure
 */
export interface AppleHealthExport {
  data: {
    stateOfMind?: StateOfMind[];
    heartRate?: Array<{ start: string; value: number }>;
    heartRateVariability?: Array<{ start: string; value: number }>;
    restingHeartRate?: Array<{ start: string; value: number }>;
    sleepAnalysis?: Array<{ start: string; end: string; value: string }>;
    activeEnergyBurned?: Array<{ start: string; value: number; unit: string }>;
    stepCount?: Array<{ start: string; value: number }>;
    walkingHeartRateAverage?: Array<{ start: string; value: number }>;
    walkingDistance?: Array<{ start: string; value: number; unit: string }>;
    walkingAsymmetryPercentage?: Array<{ start: string; value: number }>;
    walkingDoubleSupportPercentage?: Array<{ start: string; value: number }>;
    appleExerciseTime?: Array<{ start: string; value: number; unit: string }>;
    appleStandTime?: Array<{ start: string; value: number; unit: string }>;
    mindfulSession?: Array<{ start: string; end: string }>;
    // Add more as needed
    [key: string]: any;
  };
}

/**
 * Normalized health metrics by date (for correlation analysis)
 */
export interface NormalizedHealthMetrics {
  hrv?: HealthDataPoint[];
  resting_hr?: HealthDataPoint[];
  heart_rate?: HealthDataPoint[];
  sleep_hours?: HealthDataPoint[];
  sleep_temp?: HealthDataPoint[];
  mood_valence?: HealthDataPoint[];
  mood_label_count?: HealthDataPoint[];
  active_energy?: HealthDataPoint[];
  stand_minutes?: HealthDataPoint[];
  exercise_minutes?: HealthDataPoint[];
  mindful_minutes?: HealthDataPoint[];
  walking_hr_avg?: HealthDataPoint[];
  walking_distance?: HealthDataPoint[];
  walk_asym_pct?: HealthDataPoint[];
  walk_double_support_pct?: HealthDataPoint[];
}

/**
 * Health data indexed by date for fast lookup
 */
export interface HealthByDate {
  [date: string]: {
    hrv?: number;
    resting_hr?: number;
    heart_rate?: number;
    sleep_hours?: number;
    sleep_temp?: number;
    mood_valence?: number;
    mood_label_count?: number;
    active_energy?: number;
    stand_minutes?: number;
    exercise_minutes?: number;
    mindful_minutes?: number;
    walking_hr_avg?: number;
    walking_distance?: number;
    walk_asym_pct?: number;
    walk_double_support_pct?: number;
  };
}

/**
 * Seismograph data structure (from Balance Meter)
 */
export interface SeismographDay {
  magnitude: number; // 0-5
  valence?: number; // -5 to +5 (or valence_bounded)
  valence_bounded?: number; // -5 to +5
  volatility: number; // 0-5
  sfd?: number; // Symbolic Friction Density
  coherence?: number; // Narrative coherence 0-5
  [key: string]: any;
}

/**
 * Seismograph data indexed by date
 */
export interface SeismographMap {
  [date: string]: SeismographDay;
}

/**
 * Three-axis correlation results
 */
export interface CorrelationResults {
  valence_mood?: number; // 0-1 similarity score
  magnitude_intensity?: number;
  volatility_swings?: number;
  composite?: number; // Average of available scores
  supplemental?: {
    magnitude_rhr?: number;
    magnitude_active_energy?: number;
    volatility_temp_delta?: number;
  };
}

/**
 * Shuffle test (statistical significance) results
 */
export interface ShuffleTestResults {
  observed: number; // Observed correlation score
  null_mean: number; // Mean of shuffled distribution
  null_sd: number; // Standard deviation of shuffled distribution
  null_max: number; // Maximum shuffled score
  p_value: number; // Proportion of shuffled scores >= observed
  iterations: number; // Number of shuffle iterations (typically 1000)
}

/**
 * Band classification (SST-style resonance categories)
 */
export interface BandSummary {
  within: number; // WB (Works Beautifully) - high resonance
  edge: number; // ABE (At Boundary Edge) - partial resonance
  outside: number; // OSR (Outside Symbolic Range) - no resonance
}

/**
 * Complete comparative report data
 */
export interface ComparativeReportData {
  dateRange: {
    start: string;
    end: string;
  };
  correlation: CorrelationResults;
  shuffleTest?: ShuffleTestResults;
  bandSummary: BandSummary;
  dailyScores: Array<{
    date: string;
    seismo: SeismographDay;
    health: HealthByDate[string];
    score: number; // 0-1 heuristic alignment score
  }>;
  availableMetrics: string[]; // List of health metrics present
}

/**
 * Uncanny Scoring configuration
 */
export interface UncannyScoreConfig {
  includeShuffleTest: boolean;
  shuffleIterations: number;
  withinThreshold: number; // Mean diff <= this = "within" (default 0.20)
  edgeThreshold: number; // Mean diff <= this = "edge" (default 0.35)
}

/**
 * Default configuration
 */
export const DEFAULT_UNCANNY_CONFIG: UncannyScoreConfig = {
  includeShuffleTest: true,
  shuffleIterations: 1000,
  withinThreshold: 0.20,
  edgeThreshold: 0.35,
};

// Re-export for convenience
export type { UncannyScoreConfig as UncannyConfig };
