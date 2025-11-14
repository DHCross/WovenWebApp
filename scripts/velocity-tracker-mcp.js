#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function isoNow() {
  return new Date().toISOString();
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = { days: 7, since: null, until: null, maxSamples: 20 };
  argv.forEach((a, i) => {
    if (a === '--days' && argv[i+1]) out.days = Number(argv[i+1]);
    if (a === '--since' && argv[i+1]) out.since = argv[i+1];
    if (a === '--until' && argv[i+1]) out.until = argv[i+1];
    if (a === '--max-samples' && argv[i+1]) out.maxSamples = Number(argv[i+1]);
  });
  return out;
}

function gitLog(sinceIso, untilIso) {
  const since = sinceIso ? `--since="${sinceIso}"` : '';
  const until = untilIso ? `--until="${untilIso}"` : '';
  const fmt = '%H%x1f%an%x1f%ae%x1f%ai%x1f%s';
  const cmd = `git log ${since} ${until} --pretty=format:"${fmt}"`;
  try {
    const out = execSync(cmd, { encoding: 'utf8' });
    if (!out.trim()) return [];
    return out.split('\n').map(line => {
      const parts = line.split('\x1f');
      return {
        sha: parts[0],
        author: parts[1],
        email: parts[2],
        date: parts[3],
        subject: parts[4],
      };
    });
  } catch (err) {
    console.error('git log failed:', err.message);
    return [];
  }
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJsonl(filePath, obj) {
  const line = JSON.stringify(obj) + '\n';
  fs.appendFileSync(filePath, line, { encoding: 'utf8' });
}

function main() {
  const args = parseArgs();
  const until = args.until ? new Date(args.until) : new Date();
  const since = args.since ? new Date(args.since) : new Date(until.getTime() - args.days * 24 * 60 * 60 * 1000);

  const sinceIso = since.toISOString();
  const untilIso = until.toISOString();

  const commits = gitLog(sinceIso, untilIso);
  const totalCommits = commits.length;
  const elapsedMs = Math.max(1, new Date(untilIso) - new Date(sinceIso));
  const totalElapsedMinutes = elapsedMs / 1000 / 60;
  const totalElapsedHours = totalElapsedMinutes / 60;
  const commitsPerHour = totalCommits / totalElapsedHours;

  const samples = commits.slice(0, args.maxSamples).map(c => ({ sha: c.sha, author: c.author, date: c.date, subject: c.subject }));

  const entry = {
    timestamp: isoNow(),
    source: 'mcp-local-git',
    total_commits: totalCommits,
    total_elapsed_minutes: totalElapsedMinutes,
    total_elapsed_hours: totalElapsedHours,
    commits_per_hour: commitsPerHour,
    start: sinceIso,
    end: untilIso,
    samples,
  };

  const outPath = path.join(process.cwd(), '.logs', 'velocity-log.jsonl');
  ensureDir(outPath);
  writeJsonl(outPath, entry);

  console.log('Wrote tokenless velocity entry to', outPath);
  console.log(JSON.stringify({ total_commits: totalCommits, commits_per_hour: commitsPerHour, start: sinceIso, end: untilIso }, null, 2));
}

if (require.main === module) main();
