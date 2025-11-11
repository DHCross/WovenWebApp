/**
 * Math Brain Orchestrator
 *
 * Main orchestration layer that coordinates all Math Brain modules:
 * - Validation (subject normalization)
 * - API Client (transit/composite calculations)
 * - Seismograph Engine (daily aggregation)
 * - Readiness/Sanitization (graphic stripping, asset caching)
 *
 * This module serves as the primary import point for the refactored
 * Math Brain architecture. The monolith (lib/server/astrology-mathbrain.js)
 * uses these exports to keep dependencies clean and modular.
 *
 * Exports:
 * - validateSubject, normalizeSubjectData (from validation.js)
 * - getTransits, geoResolve, computeComposite, etc. (from api-client.js)
 * - calculateSeismograph, formatTransitTable (from seismograph-engine.js)
 * - sanitizeChartPayload, resolveChartPreferences, etc. (from utils/readiness.js)
 */

// ============================================================================
// VALIDATION MODULE
// ============================================================================
const {
  validateSubject,
  validateSubjectLean,
  normalizeSubjectData,
} = require('./validation');

// ============================================================================
// API CLIENT MODULE
// ============================================================================
const {
  getTransits,
  geoResolve,
  computeComposite,
  getTransitsByDateRange,
  getNatalAspectsData,
  synastryComparison,
} = require('./api-client');

// ============================================================================
// SEISMOGRAPH ENGINE MODULE
// ============================================================================
const {
  calculateSeismograph,
  formatTransitTable,
} = require('./seismograph-engine');

// ============================================================================
// READINESS / SANITIZATION MODULE
// ============================================================================
const {
  sanitizeChartPayload,
  resolveChartPreferences,
  appendChartAssets,
} = require('./utils/readiness');

// ============================================================================
// ORCHESTRATOR EXPORTS
// ============================================================================
// Re-export all extracted modules for clean consumption in monolith
module.exports = {
  // Validation Layer
  validateSubject,
  validateSubjectLean,
  normalizeSubjectData,

  // API Client Layer
  getTransits,
  geoResolve,
  computeComposite,
  getTransitsByDateRange,
  getNatalAspectsData,
  synastryComparison,

  // Seismograph Engine
  calculateSeismograph,
  formatTransitTable,

  // Readiness / Sanitization Layer
  sanitizeChartPayload,
  resolveChartPreferences,
  appendChartAssets,
};

/**
 * ARCHITECTURE PHILOSOPHY
 *
 * The refactored Math Brain follows a clean dependency graph:
 *
 * User Request
 * ↓
 * processMathbrain() [in monolith]
 * ↓
 * ├─ Validation Layer (validate subject, normalize input)
 * │   └─ validation.js
 * │
 * ├─ API Client (fetch natal/transit data from RapidAPI)
 * │   └─ api-client.js
 * │
 * ├─ Seismograph Engine (compute daily metrics, format tables)
 * │   └─ seismograph-engine.js
 * │
 * ├─ Readiness / Sanitization (strip graphics, cache assets)
 * │   └─ utils/readiness.js
 * │
 * └─ Report Formatting (narrative synthesis, presentation)
 * └─ Remains in monolith until Phase 7
 *
 * FIELD → MAP → VOICE:
 * 1. FIELD: Raw geometry (coordinates, dates, aspects from API)
 * 2. MAP: Structural patterns (validation, transit mapping, seismograph aggregation)
 * 3. VOICE: Narrative synthesis (report generation, symbolic language)
 *
 * Each module is:
 * ✅ Independently testable
 * ✅ Single responsibility
 * ✅ Falsifiable (geometry-first, then language)
 * ✅ Reusable across report modes (solo/dyad/synastry/composite)
 */
