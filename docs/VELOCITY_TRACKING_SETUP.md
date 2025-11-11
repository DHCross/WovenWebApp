# 📊 Velocity Tracking System

This is a comprehensive, automated velocity tracking system that measures your team's development speed using Git commit history and GitHub Actions.

## 🎯 What It Tracks

- **Commits/Hour:** Core metric of team velocity
- **7-Day & 30-Day Trends:** Historical performance windows
- **Trend Detection:** Alerts when velocity changes significantly
- **Rolling Averages:** Smoothed velocity metrics
- **Git History:** Live data from your repository

## 🔧 Components

### 1. **Velocity Tracker** (`scripts/velocity-tracker.js`)
Fetches commit data from GitHub API and computes velocity metrics.

```bash
npm run velocity              # Show analysis (default: blitz mode)
npm run velocity:estimate     # Estimate time for specific task
npm run velocity:report       # Generate JSON report
```

**Features:**
- Live GitHub API integration (requires `GITHUB_TOKEN`)
- 7-day lookback window
- Computes commits/hour, rolling averages, trends
- Logs all runs to `velocity-log.jsonl` for historical analysis

### 2. **Artifacts Generator** (`scripts/velocity-artifacts.js`)
Generates badge, charts, and summary JSON.

```bash
npm run velocity:artifacts
```

**Outputs:**
- `velocity-badge.svg` - Dynamic badge showing current velocity (updates on each run)
- `velocity-dashboard.html` - Interactive charts (7-day & 30-day trends)
- `velocity-summary.json` - Structured data for dashboards

### 3. **Notifier** (`scripts/velocity-notifier.js`)
Posts notifications to Slack/Discord when velocity changes significantly.

```bash
npm run velocity:notify
```

**Triggers on:**
- Velocity change >0.1 commits/hour, OR
- Velocity change >20% from previous run

**Environment Variables:**
- `SLACK_WEBHOOK_URL` - Optional Slack webhook for notifications
- `DISCORD_WEBHOOK_URL` - Optional Discord webhook for notifications

### 4. **GitHub Actions Workflow** (`.github/workflows/velocity.yml`)
Automatically runs on every push + every 12 hours.

**Automatically:**
- ✅ Runs velocity tracker
- ✅ Generates artifacts
- ✅ Sends notifications (if configured)
- ✅ Commits `velocity-log.jsonl` back to repo
- ✅ Uploads report as workflow artifact

## 📈 How to Use

### View Current Velocity
```bash
npm run velocity
```

Output shows:
- Last 7 days summary
- Commits/hour
- Trend (up/down/flat)
- Estimated time for remaining phases

### View Detailed Report
```bash
node scripts/velocity-artifacts.js
```

Then open `velocity-artifacts/velocity-dashboard.html` in a browser to see interactive charts.

### Check Dashboard
1. Go to GitHub Actions → "Velocity Tracker" workflow
2. Click latest run
3. Download "velocity-report-NNN" artifact
4. Open `velocity-dashboard.html`

### Set Up Notifications

**For Slack:**
1. Create incoming webhook at your Slack workspace
2. Add to GitHub repo secrets: `SLACK_WEBHOOK_URL`

**For Discord:**
1. Create webhook in Discord channel
2. Add to GitHub repo secrets: `DISCORD_WEBHOOK_URL`

Notifications only post on significant changes (>0.1 c/h or >20%).

## 📊 Velocity Data Structure

`velocity-log.jsonl` stores one JSON object per line:

```json
{
  "timestamp": "2025-11-09T20:35:51.589Z",
  "total_commits": 60,
  "total_elapsed_minutes": 9915.15,
  "total_elapsed_hours": 165.2525,
  "commits_per_hour": 0.3630807400795752,
  "start": "2025-11-02T22:02:56.000Z",
  "end": "2025-11-09T19:18:05.000Z"
}
```

## 🎨 Badge Usage

Embed the badge in your README:

```markdown
![Velocity](velocity-artifacts/velocity-badge.svg)
```

**Badge colors:**
- 🟢 **Green** (>0.5 c/h): Exceptional velocity
- 🟡 **Yellow** (0.2-0.5 c/h): Good velocity
- 🔴 **Red** (<0.2 c/h): Low velocity

## 🔄 Automation Flow

```
Push/Schedule
    ↓
GitHub Actions triggers
    ↓
Fetch commits (GitHub API)
    ↓
Calculate velocity metrics
    ↓
Log to velocity-log.jsonl
    ↓
Generate badge + charts + summary
    ↓
Send notifications (if configured)
    ↓
Commit log back to repo
    ↓
Upload artifacts
```

## 🛠️ Advanced: Custom Analysis

You can import the modules for custom analysis:

```javascript
const { readVelocityLog, computeStats, generateBadge } = require('./scripts/velocity-tracker');
const { generateCharts } = require('./scripts/velocity-artifacts');

const runs = readVelocityLog();
const stats = computeStats(runs, 30);  // 30-day window

console.log(`Team velocity: ${stats.avgCommitsPerHour.toFixed(2)} c/h`);
```

## 📋 Velocity Philosophy

This system is built for **Director-Led / AI-Powered development**:

- **Director:** Makes decisions, reviews work, sets priorities
- **AI Agents:** Implement code, run tests, generate documentation
- **Bottleneck:** Director review cycles, not implementation time
- **Velocity:** Measured in commits/hour of productive work

**Why commits/hour?**
- ✅ Objective and measurable
- ✅ Includes all work (refactoring, features, fixes)
- ✅ Aggregates team effort
- ✅ Shows trends over time

## ⚙️ Configuration

### Environment Variables

```bash
# Required for live data
GITHUB_TOKEN=your_token_here

# Optional for notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...

# Optional for GitHub Actions
LOG_LEVEL=debug  # Set for verbose output
```

### GitHub Secrets

1. Go to Settings → Secrets and Variables → Actions
2. Add `SLACK_WEBHOOK_URL` (optional)
3. Add `DISCORD_WEBHOOK_URL` (optional)
4. `GITHUB_TOKEN` is automatic

## 📊 Interpreting Results

| Velocity | Status | Interpretation |
|----------|--------|-----------------|
| >0.8 c/h | 🚀 Exceptional | Unsustainable sprint pace (short-term only) |
| 0.5-0.8 c/h | ⚡ Excellent | High productivity, sustainable |
| 0.2-0.5 c/h | ✅ Good | Normal, healthy pace |
| 0.1-0.2 c/h | ⚠️ Moderate | Consider blockers or complexity |
| <0.1 c/h | 🔴 Low | Investigate causes |

## 🔍 Troubleshooting

### "GitHub API returned 404"
- Check repo owner/name in script (should be `DHCross/WovenWebApp`)
- Verify `GITHUB_TOKEN` is valid

### No notifications sent
- Check `SLACK_WEBHOOK_URL` / `DISCORD_WEBHOOK_URL` in repo secrets
- Verify webhook URLs are valid and not expired
- Notifications only send on **significant** changes (>0.1 c/h or >20%)

### Dashboard shows no data
- Run `npm run velocity:artifacts` first to generate charts
- Open `velocity-artifacts/velocity-dashboard.html` locally

### Badge shows "No data"
- Ensure `velocity-log.jsonl` exists and has entries
- Run `npm run velocity` to generate first entry

## 📚 Related Files

- `.github/workflows/velocity.yml` - GitHub Actions workflow
- `scripts/velocity-tracker.js` - Main tracker script
- `scripts/velocity-artifacts.js` - Badge/chart generator
- `scripts/velocity-notifier.js` - Slack/Discord notifier
- `velocity-log.jsonl` - Historical velocity data (committed to repo)
- `velocity-artifacts/` - Generated badges, charts, summaries

## 🎯 Future Enhancements

- [ ] Velocity prediction (ML-based forecasting)
- [ ] Phase-specific velocity tracking
- [ ] Team member contribution breakdown
- [ ] Custom alerts (velocity drops, peaks, etc.)
- [ ] Velocity vs quality metrics correlation
- [ ] Time-to-resolution tracking

---

**Last Updated:** 2025-11-09
**Version:** 1.0 (Production)
