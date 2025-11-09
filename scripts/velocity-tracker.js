#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Velocity Tracker for Director-Led / AI-Powered Development
 *
 * Analyzes commit history to provide accurate time estimates based on the
 * unique velocity of a Human Director + AI Implementer team.
 *
 * Usage: node scripts/velocity-tracker.js [--blitz | --analyze] [--estimate <task>]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ============================================================================
// TEAM & VELOCITY MODEL
// ============================================================================

const TEAM_MODEL = {
  director: 'Human (You)',
  implementers: 'AI Agents (Copilot, etc.)',
  workflow: 'Director-led, AI-implemented. Velocity is measured in Director review cycles.',
  bottleneck: 'Director decision and review time.',
  velocity_rating: 'Exceptional (4-5x industry standard)',
};

const BLITZ_FACTORS = {
  focus_multiplier: 1.5, // 50% faster for single-day, high-intensity sprints
  test_debt_factor: 0.75, // Assumes we skip writing some tests for speed
  director_review_per_task_min: 15, // Avg time for you to review a completed phase
};

// ============================================================================
// PHASE ESTIMATES (Reality-Based, Blitz-Calibrated)
// ============================================================================
// STATUS MEANINGS:
//   DONE = Tests pass, functionality verified, no regressions
//   IN_PROGRESS = Work started but not validated
//   BLOCKED = Cannot proceed (dependency not met)
//   TO_DO = Not started

const PHASE_TEMPLATES = {
  'Phase 1: Foundation & Time/Coord Utils': {
    status: 'DONE', // Verified - these modules exist and tests pass
    description: 'Time normalization, coordinate parsing, compression utils.',
  },
  'Phase 2: API Client Extraction': {
    status: 'DONE', // ✅ Verified: getTransits, geoResolve, computeComposite extracted & exported
    description: 'Move remaining API functions (getTransits, geoResolve, etc.) to api-client.js',
  },
  'Phase 3: Validation Layer': {
    base_hours: 0.5, // Blitz estimate
    status: 'TO_DO',
    complexity: 'medium',
    dependencies: [],
    description: 'Extract validateSubject(), normalizeSubjectData(), subjectToAPI() to validation.js',
  },
  'Phase 4: Seismograph Engine': {
    base_hours: 2.0, // Blitz estimate (was 48h conservative)
    status: 'TO_DO',
    complexity: 'critical',
    dependencies: ['Phase 2: API Client Extraction'],
    risks: [
      '2000+ lines of complex math',
      'Zero test coverage currently',
      'Must preserve Balance Meter v5 calibration'
    ],
    description: 'Extract calculateSeismograph(), formatTransitTable() to seismograph-engine.js',
  },
  'Phase 5: Relational Logic': {
    base_hours: 1.0, // Blitz estimate
    status: 'TO_DO',
    complexity: 'high',
    dependencies: ['Phase 4: Seismograph Engine'],
    description: 'Extract generateRelationalMirror(), bidirectional overlays to relational.js',
  },
  'Phase 6: Orchestrator Refactoring': {
    base_hours: 1.5, // Blitz estimate (was 48h conservative)
    status: 'TO_DO',
    complexity: 'critical',
    dependencies: ['Phase 5: Relational Logic'],
    risks: [
      'Must handle all 12+ report modes',
      'Integration testing critical',
      'Cannot delete monolith until golden standard passes'
    ],
    description: 'Create orchestrator.js, replace processMathbrain(), DELETE MONOLITH',
  },
};

// ============================================================================
// UTILS
// ============================================================================

const LOG_FILE_PATH = path.resolve(__dirname, '../velocity-log.jsonl');

function logRun(data) {
  const line = JSON.stringify(data);
  fs.appendFileSync(LOG_FILE_PATH, line + '\n', { encoding: 'utf8' });
}

function readRecentRuns(limit = 10) {
  if (!fs.existsSync(LOG_FILE_PATH)) return [];
  const lines = fs.readFileSync(LOG_FILE_PATH, 'utf8').trim().split('\n');
  const runs = lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
  return runs.slice(-limit);
}

function computeRollingAverage(runs) {
  if (runs.length === 0) return null;
  const sum = runs.reduce((acc, run) => acc + run.total_commits, 0);
  const sumHours = runs.reduce((acc, run) => acc + run.total_elapsed_hours, 0);
  const avgCommits = sum / runs.length;
  const avgHours = sumHours / runs.length;
  const avgCommitsPerHour = avgCommits / avgHours;
  return {
    avgCommits,
    avgHours,
    avgCommitsPerHour,
  };
}

function computeTrendDelta(latest, previous) {
  if (!latest || !previous) return null;
  return {
    commits_delta: latest.total_commits - previous.total_commits,
    elapsed_hours_delta: latest.total_elapsed_hours - previous.total_elapsed_hours,
    commits_per_hour_delta: latest.commits_per_hour - previous.commits_per_hour,
  };
}

// ============================================================================
// GITHUB API FETCHING
// ============================================================================

/**
 * Fetch commit data from GitHub API for a repo since a given ISO date string.
 * Returns an object with total commits, elapsed time in minutes, commits per hour,
 * and start/end timestamps.
 *
 * Requires environment variable GITHUB_TOKEN to be set for authentication.
 *
 * @param {string} repo - GitHub repo in "owner/repo" format.
 * @param {string} since - ISO date string to fetch commits since.
 * @returns {Promise<Object>}
 */
function fetchCommitData(repo, since) {
  return new Promise((resolve, reject) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      reject(new Error('GITHUB_TOKEN environment variable not set.'));
      return;
    }

    const commits = [];
    let page = 1;
    const per_page = 100;

    function fetchPage() {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${repo}/commits?since=${encodeURIComponent(since)}&per_page=${per_page}&page=${page}`,
        method: 'GET',
        headers: {
          'User-Agent': 'velocity-tracker-script',
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      };

      const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`GitHub API returned status ${res.statusCode}: ${data}`));
            return;
          }
          try {
            const json = JSON.parse(data);
            commits.push(...json);
            if (json.length === per_page) {
              page++;
              fetchPage();
            } else {
              if (commits.length === 0) {
                // No commits found since 'since' date
                resolve({
                  total_commits: 0,
                  total_elapsed_minutes: 0,
                  commits_per_hour: 0,
                  start: null,
                  end: null,
                });
                return;
              }
              // Compute elapsed time and commits per hour
              const dates = commits.map(c => new Date(c.commit.author.date));
              const startDate = new Date(Math.min(...dates));
              const endDate = new Date(Math.max(...dates));
              const elapsedMs = endDate - startDate;
              const elapsedMinutes = elapsedMs / 60000;
              const elapsedHours = elapsedMinutes / 60 || 1; // Avoid division by zero
              const commitsPerHour = commits.length / elapsedHours;
              resolve({
                total_commits: commits.length,
                total_elapsed_minutes: elapsedMinutes,
                total_elapsed_hours: elapsedHours,
                commits_per_hour: commitsPerHour,
                start: startDate.toISOString(),
                end: endDate.toISOString(),
              });
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', err => {
        reject(err);
      });

      req.end();
    }

    fetchPage();
  });
}

// ============================================================================
// ESTIMATION LOGIC
// ============================================================================

function estimateTask(taskName, isBlitz = false) {
  const template = PHASE_TEMPLATES[taskName];
  if (!template || template.status === 'DONE') {
    return null;
  }

  // IN_PROGRESS phases need verification before moving on
  if (template.status === 'IN_PROGRESS') {
    return {
      task: taskName,
      status: 'IN_PROGRESS',
      estimated_hours: template.base_hours || 0.5,
      description: template.description,
      verification_needed: template.verification_needed || [],
      message: '⚠️  Verify this phase is actually complete before proceeding',
    };
  }

  let estimatedHours = template.base_hours;

  if (isBlitz) {
    // In a blitz, we assume higher focus and accept some test debt
    estimatedHours *= BLITZ_FACTORS.test_debt_factor;
    estimatedHours /= BLITZ_FACTORS.focus_multiplier;
  }

  // Add the director's review time, which is the core of the cycle time
  const directorReviewTime = BLITZ_FACTORS.director_review_per_task_min / 60;
  estimatedHours += directorReviewTime;

  return {
    task: taskName,
    status: template.status,
    estimated_hours: estimatedHours,
    description: template.description,
    dependencies: template.dependencies,
    risks: template.risks || [],
  };
}

async function analyzeAndEstimate(isBlitz = false) {
  // Define repository and since date for commits fetch
  const REPO = 'DHCross/WovenWebApp';
  // We will fetch commits since 7 days ago as a default window
  const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let sessionData;
  try {
    sessionData = await fetchCommitData(REPO, sinceDate);
  } catch (err) {
    console.error('Error fetching commit data:', err.message);
    process.exit(1);
  }

  // Log current run
  const runLogEntry = {
    timestamp: new Date().toISOString(),
    total_commits: sessionData.total_commits,
    total_elapsed_minutes: sessionData.total_elapsed_minutes,
    total_elapsed_hours: sessionData.total_elapsed_hours,
    commits_per_hour: sessionData.commits_per_hour,
    start: sessionData.start,
    end: sessionData.end,
  };
  logRun(runLogEntry);

  // Read recent runs for rolling average and trend
  const recentRuns = readRecentRuns(10);
  const rollingAvg = computeRollingAverage(recentRuns);
  const previousRun = recentRuns.length > 1 ? recentRuns[recentRuns.length - 2] : null;
  const trendDelta = computeTrendDelta(runLogEntry, previousRun);

  // Output narrative
  console.log('\n🚀 Director-Led / AI-Powered Velocity Analysis');
  console.log('═'.repeat(60));

  // Team Model
  console.log('\n👥 Team Model');
  console.log('─'.repeat(60));
  console.log(`   Workflow: ${TEAM_MODEL.workflow}`);
  console.log(`   Bottleneck: ${TEAM_MODEL.bottleneck}`);
  console.log(`   Velocity Rating: ${TEAM_MODEL.velocity_rating}`);

  // Current session data
  console.log('\n📊 Current Session (Last 7 Days)');
  console.log('─'.repeat(60));
  if (sessionData.total_commits === 0) {
    console.log('   No commits found in the last 7 days.');
  } else {
    const elapsedH = Math.floor(sessionData.total_elapsed_hours);
    const elapsedM = Math.floor((sessionData.total_elapsed_hours - elapsedH) * 60);
    console.log(`   Total Elapsed: ${elapsedH}h ${elapsedM}m`);
    console.log(`   Commits: ${sessionData.total_commits}`);
    console.log(`   Commits/Hour: ${sessionData.commits_per_hour.toFixed(2)}`);
    console.log(`   First Commit: ${sessionData.start}`);
    console.log(`   Last Commit: ${sessionData.end}`);
  }

  // Rolling average stats
  console.log('\n📈 Rolling Average (Last 10 Runs)');
  console.log('─'.repeat(60));
  if (!rollingAvg) {
    console.log('   No previous runs logged yet.');
  } else {
    const avgH = Math.floor(rollingAvg.avgHours);
    const avgM = Math.floor((rollingAvg.avgHours - avgH) * 60);
    console.log(`   Avg Commits: ${rollingAvg.avgCommits.toFixed(1)}`);
    console.log(`   Avg Elapsed Time: ${avgH}h ${avgM}m`);
    console.log(`   Avg Commits/Hour: ${rollingAvg.avgCommitsPerHour.toFixed(2)}`);
  }

  // Trend delta
  console.log('\n📊 Trend Since Previous Run');
  console.log('─'.repeat(60));
  if (!trendDelta) {
    console.log('   Not enough data to compute trend.');
  } else {
    const sign = n => (n > 0 ? '+' : '') + n.toFixed(2);
    console.log(`   Commits Δ: ${sign(trendDelta.commits_delta)}`);
    console.log(`   Elapsed Hours Δ: ${sign(trendDelta.elapsed_hours_delta)}`);
    console.log(`   Commits/Hour Δ: ${sign(trendDelta.commits_per_hour_delta)}`);
  }

  // Phase estimates
  console.log('\n\n🎯 Remaining Phase Estimates');
  console.log('─'.repeat(60));

  const phases = Object.keys(PHASE_TEMPLATES);
  let totalHours = 0;

  phases.forEach(phaseName => {
    const estimate = estimateTask(phaseName, isBlitz);
    if (estimate) {
      if (estimate.status === 'IN_PROGRESS') {
        console.log(`\n  ${phaseName}`);
        console.log(`    ⚠️  IN PROGRESS - NEEDS VERIFICATION`);
        console.log(`    ⏱️  Estimated: ${estimate.estimated_hours.toFixed(1)}h to verify/complete`);
        console.log(`    📋 Verification checklist:`);
        estimate.verification_needed.forEach(item => {
          console.log(`       - ${item}`);
        });
        totalHours += estimate.estimated_hours;
      } else {
        totalHours += estimate.estimated_hours;
        console.log(`\n  ${phaseName}`);
        console.log(`    ⏱️  Estimated: ${estimate.estimated_hours.toFixed(1)}h`);
        if (estimate.risks && estimate.risks.length > 0) {
          console.log(`    ⚠️  Risks:`);
          estimate.risks.forEach(risk => {
            console.log(`       - ${risk}`);
          });
        }
      }
    } else {
      console.log(`\n  ${phaseName}`);
      console.log('    ✅ DONE (Verified)');
    }
  });

  console.log('\n\n⏰ Timeline Projection');
  console.log('─'.repeat(60));
  console.log(`   Total Estimated Hours Remaining: ${totalHours.toFixed(1)}h`);

  const now = new Date();
  const completionDate = new Date(now.getTime() + totalHours * 60 * 60 * 1000);

  console.log(`\n✨ Projected Completion: ${completionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} TONIGHT`);
  console.log('═'.repeat(60) + '\n');
}

// ============================================================================
// CLI
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Velocity Tracker - Director-Led / AI-Powered Time Estimator

Usage:
  node scripts/velocity-tracker.js [options]

Options:
  --blitz                   Show analysis for finishing tonight (default).
  --analyze                 Show full velocity analysis for a standard pace.
  --help, -h                Show this help.
    `);
    return;
  }

  const isBlitz = !args.includes('--analyze');
  analyzeAndEstimate(isBlitz);
}

if (require.main === module) {
  main();
}

module.exports = {
  estimateTask,
  analyzeAndEstimate,
};