#!/usr/bin/env node
/* eslint-disable no-console */

// Velocity Survival Analyzer
// ---------------------------
// Computes a "Code Survival Rate" for recent commits using only local git
// commands. For each commit in a time window, it:
//   1. Parses `git show --numstat <sha>` to find lines added per file
//   2. Runs `git blame HEAD -- <file>` to see how many of those lines remain
//   3. Aggregates survival rates and flags low-survival commits
//
// Output: JSON to stdout (no extra logging on stdout).
// Errors and warnings are written to stderr.

const { execSync } = require('child_process');
const path = require('path');

// Paths / patterns to ignore when attributing survival.
// These are primarily build artifacts and large, non-source directories.
const EXCLUDED_PATH_SUBSTRINGS = [
  'node_modules/',
  'node_modules\\',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.git/',
  'dist/',
  'build/',
  '.next/',
  'coverage/',
  'public/',
  'assets/',
  'vendor/',
  'test/fixtures/',
];

// File extensions that are treated as "noise" (data, assets, logs) rather than
// hand-authored source logic. These are excluded from survival calculations.
const IGNORED_EXTENSIONS = [
  '.json',
  '.lock',
  '.md',
  '.map',
  '.log',
  '.txt',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.css',
  '.csv',
  '.xml',
];

// Commits with survival below this fraction are treated as "low survival".
const LOW_SURVIVAL_THRESHOLD = 0.5; // 50%

function runGit(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    process.stderr.write(`git command failed: ${command}\n${msg}\n`);
    throw err;
  }
}

function isExcludedPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const basename = path.basename(normalized);
  if (!normalized || normalized === '.' || normalized === '..') return true;
  for (const pat of EXCLUDED_PATH_SUBSTRINGS) {
    if (normalized.includes(pat)) return true;
  }
  // Extension-based noise filter: ignore obvious data / asset files.
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = normalized.slice(dotIndex).toLowerCase();
    if (IGNORED_EXTENSIONS.includes(ext)) return true;
  }
  // Exclude obvious lock/config artifacts
  if (basename === 'package-lock.json' || basename === 'yarn.lock' || basename === 'pnpm-lock.yaml') {
    return true;
  }
  return false;
}

function normalizeNumstatPath(rawPath) {
  let file = rawPath.trim();
  // For renamed files like "src/old.js => src/new.js", take the new path.
  const arrowIdx = file.lastIndexOf('=>');
  if (arrowIdx !== -1) {
    file = file.slice(arrowIdx + 2).trim();
  }
  if (file.startsWith('{') && file.endsWith('}')) {
    file = file.slice(1, -1);
  }
  return file;
}

function getRecentCommits(days, maxCommits) {
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const limitPart = maxCommits && maxCommits > 0 ? `-n ${maxCommits} ` : '';
  const cmd = `git log ${limitPart}--since="${sinceDate}" --no-merges --pretty=format:"%H%x1f%s"`;
  let out;
  try {
    out = runGit(cmd);
  } catch {
    return [];
  }
  if (!out) return [];
  return out.split('\n').filter(Boolean).map(line => {
    const [sha, subject] = line.split('\x1f');
    return {
      sha: sha || '',
      message: subject || '',
    };
  }).filter(c => c.sha);
}

function getCommitNumstat(sha) {
  const cmd = `git show --numstat --pretty=format:"" ${sha}`;
  let raw;
  try {
    raw = runGit(cmd);
  } catch {
    return { totalAdded: 0, files: [] };
  }
  if (!raw) return { totalAdded: 0, files: [] };

  const lines = raw.split('\n').filter(Boolean);
  const files = [];
  let totalAdded = 0;

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;
    const addedStr = parts[0];
    const deletedStr = parts[1];
    // Binary files show "-" in numstat; skip them.
    if (addedStr === '-' || deletedStr === '-') continue;

    const added = parseInt(addedStr, 10) || 0;
    if (added <= 0) continue;

    const rawPath = parts.slice(2).join(' ');
    const filePath = normalizeNumstatPath(rawPath);
    if (isExcludedPath(filePath)) continue;

    totalAdded += added;
    files.push({ path: filePath, added });
  }

  return { totalAdded, files };
}

// Cache blame results per file so we only call git blame once per path.
const blameCache = new Map(); // filePath -> { total: number, counts: Map<sha, count> }

function getBlameForFile(filePath) {
  if (blameCache.has(filePath)) return blameCache.get(filePath);

  const result = { total: 0, counts: new Map() };
  try {
    const safePath = filePath.replace(/"/g, '\\"');
    const cmd = `git blame --line-porcelain HEAD -- "${safePath}"`;
    const raw = runGit(cmd);
    if (!raw) {
      blameCache.set(filePath, result);
      return result;
    }
    const lines = raw.split('\n');
    for (const line of lines) {
      const m = line.match(/^([0-9a-f^]{7,40})\s+\d+\s+\d+\s+(\d+)/);
      if (!m) continue;
      let sha = m[1];
      if (sha.startsWith('^')) sha = sha.slice(1);
      const count = parseInt(m[2], 10) || 1;
      result.total += count;
      const prev = result.counts.get(sha) || 0;
      result.counts.set(sha, prev + count);
    }
  } catch (err) {
    // File may have been deleted or blame may fail; treat as no surviving lines.
    const msg = err && err.message ? err.message : String(err);
    process.stderr.write(`git blame failed for ${filePath}: ${msg}\n`);
  }

  blameCache.set(filePath, result);
  return result;
}

function analyzeSurvival(options) {
  const days = options && Number.isFinite(options.days) ? options.days : 7;
  const maxCommits = options && Number.isFinite(options.maxCommits) ? options.maxCommits : null;

  const commits = getRecentCommits(days, maxCommits);
  const perCommit = [];

  let netLinesAdded = 0;
  let netLinesRemaining = 0;

  for (const commit of commits) {
    const { sha, message } = commit;
    const numstat = getCommitNumstat(sha);
    if (!numstat.totalAdded || !numstat.files.length) {
      continue; // nothing added we can track for this commit
    }

    let commitAdded = 0;
    let commitRemaining = 0;

    for (const file of numstat.files) {
      commitAdded += file.added;
      const blame = getBlameForFile(file.path);

      let survivingForCommit = 0;
      if (blame && blame.counts.size > 0) {
        // Prefer exact SHA match; fall back to prefix match if needed.
        if (blame.counts.has(sha)) {
          survivingForCommit += blame.counts.get(sha) || 0;
        } else {
          const prefix = sha.slice(0, 7);
          for (const [blameSha, count] of blame.counts.entries()) {
            if (blameSha.startsWith(prefix)) {
              survivingForCommit += count;
            }
          }
        }
      }

      if (survivingForCommit > 0) {
        commitRemaining += survivingForCommit;
      }
    }

    if (commitRemaining > commitAdded) {
      commitRemaining = commitAdded;
    }

    const survivalRate = commitAdded > 0 ? commitRemaining / commitAdded : 0;

    netLinesAdded += commitAdded;
    netLinesRemaining += commitRemaining;

    perCommit.push({
      hash: sha,
      short_hash: sha.substring(0, 7),
      message,
      original_lines_added: commitAdded,
      lines_surviving: commitRemaining,
      survival_rate: survivalRate,
    });
  }

  const totalCommitsAnalyzed = perCommit.length;
  const averageSurvival = netLinesAdded > 0 ? netLinesRemaining / netLinesAdded : 0;
  const churnRiskScore = Math.round((1 - averageSurvival) * 100);

  const lowSurvivalCommits = perCommit
    .filter(c => c.survival_rate < LOW_SURVIVAL_THRESHOLD)
    .sort((a, b) => {
      if (a.survival_rate !== b.survival_rate) {
        return a.survival_rate - b.survival_rate;
      }
      return b.original_lines_added - a.original_lines_added;
    });

  const output = {
    analyzed_window_days: days,
    total_commits_analyzed: totalCommitsAnalyzed,
    average_survival_rate: Number.isFinite(averageSurvival) ? averageSurvival : 0,
    churn_risk_score: Number.isFinite(churnRiskScore) ? churnRiskScore : 0,
    metrics: {
      average_survival_rate: Number.isFinite(averageSurvival) ? averageSurvival : 0,
      net_lines_added: netLinesAdded,
      net_lines_remaining: netLinesRemaining,
      churn_risk_score: Number.isFinite(churnRiskScore) ? churnRiskScore : 0,
    },
    low_survival_commits: lowSurvivalCommits,
    risk_commits: lowSurvivalCommits,
  };

  return output;
}

function printUsage() {
  const text = `Velocity Survival Analyzer\n\n` +
`Usage: node scripts/velocity-survival.js [options]\n\n` +
`Options:\n` +
`  --days <n>         Analyze commits from the last N days (default: 7)\n` +
`  --max-commits <n>  Limit the number of commits analyzed (optional)\n` +
`  --help, -h         Show this help message\n`;
  process.stderr.write(text);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  let days = 7;
  let maxCommits = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--days' && i + 1 < args.length) {
      const val = parseInt(args[i + 1], 10);
      if (Number.isFinite(val) && val > 0) {
        days = val;
      }
      i += 1;
    } else if (arg === '--max-commits' && i + 1 < args.length) {
      const val = parseInt(args[i + 1], 10);
      if (Number.isFinite(val) && val > 0) {
        maxCommits = val;
      }
      i += 1;
    }
  }

  try {
    const result = analyzeSurvival({ days, maxCommits });
    // Print structured JSON only on stdout.
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    const fallback = {
      analyzed_window_days: days,
      total_commits_analyzed: 0,
      average_survival_rate: 0,
      churn_risk_score: 100,
      metrics: {
        average_survival_rate: 0,
        net_lines_added: 0,
        net_lines_remaining: 0,
        churn_risk_score: 100,
      },
      low_survival_commits: [],
      risk_commits: [],
      error: msg,
    };
    process.stdout.write(`${JSON.stringify(fallback, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeSurvival,
};
