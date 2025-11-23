#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * scripts/velocity-survival-runner.js
 * Wraps velocity-survival.js analysis and persists output to a JSONL log.
 *
 * Design goals:
 * - Use only local git (delegated to velocity-survival.js)
 * - Treat survival metrics as durable telemetry (JSONL in .logs/)
 * - Be resilient: even if the analysis exits non-zero, try to parse its JSON
 *   fallback and still append a record rather than failing the pipeline.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_DIR = path.resolve(__dirname, '../.logs');
const LOG_FILE = path.join(LOG_DIR, 'velocity-survival-log.jsonl');
const ANALYSIS_SCRIPT = path.join(__dirname, 'velocity-survival.js');

// Default args for analysis window (can be overridden by passing args to runner)
const DEFAULT_ARGS = ['--days', '7', '--max-commits', '200'];

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getGitContext() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
    return { branch, commit };
  } catch {
    return { branch: null, commit: null };
  }
}

function runAnalysis() {
  const extraArgs = process.argv.slice(2);
  const argsToUse = extraArgs.length > 0 ? extraArgs : DEFAULT_ARGS;
  const cmd = `node "${ANALYSIS_SCRIPT}" ${argsToUse.join(' ')}`;

  try {
    const stdout = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(stdout);
  } catch (error) {
    // velocity-survival.js prints a structured fallback JSON even on non-zero exit.
    const stdout = error && error.stdout ? String(error.stdout) : '';
    if (stdout) {
      try {
        return JSON.parse(stdout);
      } catch (parseErr) {
        console.error('velocity-survival-runner: failed to parse analysis stdout:', parseErr.message);
      }
    }
    console.error('velocity-survival-runner: analysis failed:', error && error.message ? error.message : String(error));
    return null;
  }
}

function appendToLog(result) {
  const now = new Date().toISOString();
  const git = getGitContext();

  const entry = {
    timestamp: now,
    run_id: Date.now().toString(36),
    repo_branch: git.branch,
    repo_commit: git.commit,
    survival: result,
  };

  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', { encoding: 'utf8' });
}

function main() {
  ensureLogDir();
  const result = runAnalysis();

  if (!result) {
    // Still append a minimal error record so gaps are visible in telemetry.
    appendToLog({
      error: 'velocity-survival analysis failed; see CI logs',
    });
    // Do not hard-fail the pipeline; survival is diagnostic, not gating.
    return;
  }

  appendToLog(result);

  // Optional human-readable summary to CI logs.
  const avg = result.metrics && typeof result.metrics.average_survival_rate === 'number'
    ? Math.round(result.metrics.average_survival_rate * 100)
    : (typeof result.average_survival_rate === 'number' ? Math.round(result.average_survival_rate * 100) : null);
  const churn = result.metrics && typeof result.metrics.churn_risk_score === 'number'
    ? result.metrics.churn_risk_score
    : (typeof result.churn_risk_score === 'number' ? result.churn_risk_score : null);

  if (avg != null || churn != null) {
    console.log(`Survival Telemetry: ${avg != null ? `Survival ${avg}%` : ''}${avg != null && churn != null ? ' | ' : ''}${churn != null ? `Churn Risk ${churn}` : ''}`);
  } else {
    console.log('Survival Telemetry: (no metrics available)');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runAnalysis,
};
