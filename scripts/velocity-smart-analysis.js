#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Velocity Smart Analysis
 * -----------------------
 * Distinguishes code velocity from planning/consultware and cleanup.
 * - Walks recent commits (default 7 days) via `git log` + `git show --numstat`
 * - Classifies files into velocity vs planning
 * - Flags consultware filenames
 * - Rewards cleanup-heavy commits
 * - Flags hollow commits (lots of lines, low control flow)
 *
 * Usage: node scripts/velocity-smart-analysis.js [days]
 * Outputs JSON to stdout.
 */

const { execSync } = require('child_process');

const DAYS_DEFAULT = Number.isFinite(parseInt(process.argv[2], 10))
  ? parseInt(process.argv[2], 10)
  : 7;

const CONSULTWARE_RE = /(IMPLEMENTATION_PLAN|AUDIT_REPORT|ROADMAP)/i;
const DOC_EXTS = new Set(['.md', '.txt']);

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function getCommits(days) {
  const cmd = `git log --since="${days} days ago" --no-merges --pretty=format:%H`;
  const out = run(cmd);
  if (!out) return [];
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNumstatLine(line) {
  const parts = line.split(/\s+/);
  if (parts.length < 3) return null;
  const a = parts[0];
  const d = parts[1];
  if (a === '-' || d === '-') return null; // binary
  const added = parseInt(a, 10) || 0;
  const deleted = parseInt(d, 10) || 0;
  const file = parts.slice(2).join(' ').trim();
  if (!file) return null;
  return { added, deleted, file };
}

function isPlanning(file) {
  const lower = file.toLowerCase();
  if (lower.startsWith('docs/')) return true;
  const dot = lower.lastIndexOf('.');
  if (dot !== -1 && DOC_EXTS.has(lower.slice(dot))) return true;
  if (CONSULTWARE_RE.test(file)) return true;
  return false;
}

function countControlTokens(diffText) {
  if (!diffText) return 0;
  const lines = diffText.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  let tokens = 0;
  for (const line of lines) {
    const matches = line.match(/\b(if|for|while|switch|case|catch|else|try)\b|&&|\|\|/g);
    if (matches) tokens += matches.length;
  }
  return tokens;
}

function analyzeCommit(sha) {
  const numstatRaw = run(`git show --numstat --pretty=format:"" ${sha}`);
  const lines = numstatRaw ? numstatRaw.split('\n').filter(Boolean) : [];

  let velocity = 0;
  let planning = 0;
  let cleanup = 0;
  let codeAdded = 0;
  const consultwareEvents = [];

  for (const line of lines) {
    const parsed = parseNumstatLine(line);
    if (!parsed) continue;
    const { added, deleted, file } = parsed;

    const consultware = CONSULTWARE_RE.test(file);
    if (consultware) {
      consultwareEvents.push({ commit: sha, file, reason: 'consultware' });
    }

    if (isPlanning(file)) {
      planning += added;
    } else {
      velocity += added;
      codeAdded += added;
    }

    if (deleted > 100 && added < 20) {
      cleanup += deleted;
    }
  }

  let hollowEvent = null;
  if (codeAdded > 500) {
    const diffText = run(`git show --pretty=format:"" ${sha}`);
    const tokens = countControlTokens(diffText);
    if (tokens < Math.max(5, Math.floor(codeAdded * 0.01))) {
      hollowEvent = { commit: sha, code_added: codeAdded, control_tokens: tokens, reason: 'hollow' };
    }
  }

  return { velocity, planning, cleanup, consultwareEvents, hollowEvent };
}

function main() {
  const commits = getCommits(DAYS_DEFAULT);
  let velocityScore = 0;
  let planningScore = 0;
  let cleanupScore = 0;
  const consultwareEvents = [];
  const hollowEvents = [];

  for (const sha of commits) {
    const result = analyzeCommit(sha);
    velocityScore += result.velocity;
    planningScore += result.planning;
    cleanupScore += result.cleanup;
    consultwareEvents.push(...result.consultwareEvents);
    if (result.hollowEvent) hollowEvents.push(result.hollowEvent);
  }

  const payload = {
    window_days: DAYS_DEFAULT,
    commits_analyzed: commits.length,
    velocity_score: velocityScore,
    planning_score: planningScore,
    cleanup_score: cleanupScore,
    consultware_events: consultwareEvents,
    hollow_events: hollowEvents,
    generated_at: new Date().toISOString(),
  };

  console.log(JSON.stringify(payload));
}

main();
