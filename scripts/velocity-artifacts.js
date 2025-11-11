#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Velocity Artifacts Generator
 *
 * Generates:
 * 1. Badge SVG showing current velocity
 * 2. HTML charts for 7-day and 30-day trends
 * 3. JSON summary for dashboard integration
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE_PATH = path.resolve(__dirname, '../velocity-log.jsonl');
const ARTIFACTS_DIR = path.resolve(__dirname, '../velocity-artifacts');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

/**
 * Read velocity log and compute statistics
 */
function readVelocityLog() {
  if (!fs.existsSync(LOG_FILE_PATH)) {
    return [];
  }

  const lines = fs.readFileSync(LOG_FILE_PATH, 'utf8').trim().split('\n');
  const runs = lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);

  return runs;
}

/**
 * Compute trend statistics
 */
function computeStats(runs, windowDays = 7) {
  if (runs.length === 0) {
    return null;
  }

  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const recentRuns = runs.filter(run => {
    const runTime = new Date(run.timestamp).getTime();
    return now - runTime <= windowMs;
  });

  if (recentRuns.length === 0) {
    return null;
  }

  const avgCommitsPerHour = recentRuns.reduce((sum, r) => sum + r.commits_per_hour, 0) / recentRuns.length;
  const maxCommitsPerHour = Math.max(...recentRuns.map(r => r.commits_per_hour));
  const minCommitsPerHour = Math.min(...recentRuns.map(r => r.commits_per_hour));
  const totalCommits = recentRuns.reduce((sum, r) => sum + r.total_commits, 0);
  const totalHours = recentRuns.reduce((sum, r) => sum + r.total_elapsed_hours, 0);

  // Compute trend
  const trend = recentRuns.length > 1
    ? recentRuns[recentRuns.length - 1].commits_per_hour - recentRuns[0].commits_per_hour
    : 0;

  return {
    window_days: windowDays,
    samples: recentRuns.length,
    avg_commits_per_hour: avgCommitsPerHour,
    max_commits_per_hour: maxCommitsPerHour,
    min_commits_per_hour: minCommitsPerHour,
    total_commits: totalCommits,
    total_hours: totalHours,
    trend: trend,
    first_run: recentRuns[0].timestamp,
    last_run: recentRuns[recentRuns.length - 1].timestamp,
  };
}

/**
 * Generate SVG badge
 */
function generateBadge(stats) {
  if (!stats) {
    return generateErrorBadge('No data');
  }

  const commitsPerHour = stats.avg_commits_per_hour.toFixed(2);
  const color = commitsPerHour > 0.5 ? '#28a745' : commitsPerHour > 0.2 ? '#ffc107' : '#dc3545';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="160" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="160" height="20" rx="3"/>
  </clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h110v20H0z"/>
    <path fill="${color}" d="M110 0h50v20H110z"/>
    <path fill="url(#b)" d="M0 0h160v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="55" y="15" fill="#010101" fill-opacity=".3">velocity</text>
    <text x="55" y="14">velocity</text>
    <text x="134" y="15" fill="#010101" fill-opacity=".3">${commitsPerHour} c/h</text>
    <text x="134" y="14">${commitsPerHour} c/h</text>
  </g>
</svg>`.trim();

  return svg;
}

/**
 * Generate error badge
 */
function generateErrorBadge(message) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="160" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="160" height="20" rx="3"/>
  </clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h110v20H0z"/>
    <path fill="#dc3545" d="M110 0h50v20H110z"/>
    <path fill="url(#b)" d="M0 0h160v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="55" y="15" fill="#010101" fill-opacity=".3">velocity</text>
    <text x="55" y="14">velocity</text>
    <text x="134" y="15" fill="#010101" fill-opacity=".3">${message}</text>
    <text x="134" y="14">${message}</text>
  </g>
</svg>`.trim();

  return svg;
}

/**
 * Generate HTML charts
 */
function generateCharts(runs) {
  if (runs.length === 0) {
    return '<p>No velocity data available</p>';
  }

  const labels = runs.map(r => {
    const date = new Date(r.timestamp);
    return date.toLocaleDateString();
  });

  const commitsPerHour = runs.map(r => r.commits_per_hour.toFixed(3));

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Velocity Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.0.0/dist/chart.umd.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 40px;
    }
    .chart-box {
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 20px;
    }
    h2 {
      margin-top: 0;
    }
    canvas {
      max-height: 300px;
    }
  </style>
</head>
<body>
  <h1>📊 Velocity Dashboard</h1>

  <div class="container">
    <div class="chart-box">
      <h2>7-Day Trend</h2>
      <canvas id="chart7day"></canvas>
    </div>
    <div class="chart-box">
      <h2>30-Day Trend</h2>
      <canvas id="chart30day"></canvas>
    </div>
  </div>

  <script>
    const data = ${JSON.stringify({ labels, commitsPerHour })};

    const ctx7 = document.getElementById('chart7day').getContext('2d');
    new Chart(ctx7, {
      type: 'line',
      data: {
        labels: data.labels.slice(-14),
        datasets: [{
          label: 'Commits/Hour',
          data: data.commitsPerHour.slice(-14),
          borderColor: '#0969da',
          backgroundColor: 'rgba(9, 105, 218, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#0969da',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true, position: 'top' }
        },
        scales: {
          y: { min: 0 }
        }
      }
    });

    const ctx30 = document.getElementById('chart30day').getContext('2d');
    new Chart(ctx30, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Commits/Hour',
          data: data.commitsPerHour,
          borderColor: '#238636',
          backgroundColor: 'rgba(35, 134, 54, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#238636',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true, position: 'top' }
        },
        scales: {
          y: { min: 0 }
        }
      }
    });
  </script>
</body>
</html>`;

  return html;
}

/**
 * Main execution
 */
function main() {
  const runs = readVelocityLog();
  const stats7 = computeStats(runs, 7);
  const stats30 = computeStats(runs, 30);

  // Generate and save badge
  const badge = generateBadge(stats7);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'velocity-badge.svg'), badge);
  console.log('✅ Generated velocity-badge.svg');

  // Generate and save charts
  const charts = generateCharts(runs);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'velocity-dashboard.html'), charts);
  console.log('✅ Generated velocity-dashboard.html');

  // Generate and save JSON summary
  const summary = {
    generated_at: new Date().toISOString(),
    stats_7day: stats7,
    stats_30day: stats30,
    total_runs: runs.length,
    recent_runs: runs.slice(-10),
  };
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'velocity-summary.json'), JSON.stringify(summary, null, 2));
  console.log('✅ Generated velocity-summary.json');

  // Output for GitHub Actions
  if (stats7) {
    console.log(`\n📈 Current Velocity (7-day): ${stats7.avg_commits_per_hour.toFixed(2)} commits/hour`);
    if (stats7.trend > 0) {
      console.log(`   📈 Trending UP (+${stats7.trend.toFixed(3)})`);
    } else if (stats7.trend < 0) {
      console.log(`   📉 Trending DOWN (${stats7.trend.toFixed(3)})`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  readVelocityLog,
  computeStats,
  generateBadge,
  generateCharts,
};
