#!/usr/bin/env node
// eslint-disable-next-line
// Above shebang must remain first line for CLI execution
/**
 * velocity-artifacts.js v1.0.0
 *
 * Generates a human‑readable velocity forecast markdown file from the
 * structured line‑delimited JSON log at ./.logs/velocity-log.jsonl.
 *
 * Usage:
 *   node scripts/velocity-artifacts.js                 # default output docs/velocity-forecast.md
 *   node scripts/velocity-artifacts.js --out other.md  # custom output path
 *   node scripts/velocity-artifacts.js --limit 15       # limit recent samples considered for rolling avg
 *
 * Each JSONL entry is expected to contain at minimum:
 *   timestamp, commitCount, totalDurationSeconds, phases (object of phaseName -> {status})
 * Optional fields (if present) are surfaced: estimates, cliCommand.
 *
 * The script selects the latest entry (chronological by timestamp) as the
 * anchor snapshot, computes rolling averages over the last N (default 10)
 * entries, and emits a markdown summary similar to the manually written
 * example currently in docs/velocity-forecast.md.
 *
 * Safety & Failure Modes:
 * - If log file missing or empty: produces a placeholder forecast with guidance.
 * - If JSON parse fails on a line: line skipped (reported in diagnostics section).
 * - Never throws for common file errors (exits 0 with placeholder).
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function parseArgs(argv){
  const args = { out: 'docs/velocity-forecast.md', limit: 10 };
  for (let i=2;i<argv.length;i++){
    const a = argv[i];
    if (a === '--out' && argv[i+1]) { args.out = argv[++i]; continue; }
    if (a === '--limit' && argv[i+1]) { args.limit = Math.max(1, parseInt(argv[++i],10)||10); continue; }
    if (a === '--help') { args.help = true; }
  }
  return args;
}

function formatDuration(seconds){
  if (!Number.isFinite(seconds) || seconds <= 0) return '0h00m';
  const h = Math.floor(seconds/3600);
  const m = Math.floor((seconds%3600)/60);
  const s = Math.floor(seconds%60);
  return `${h}h${String(m).padStart(2,'0')}m${s>0?`${String(s).padStart(2,'0')}s`:''}`;
}

function pct(n){
  return (Math.round(n*1000)/10).toFixed(1)+'%';
}

function humanList(arr){
  if (!arr.length) return 'None';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr.join(' & ');
  return arr.slice(0,-1).join(', ') + ' & ' + arr[arr.length-1];
}

function computeRolling(entries, limit){
  const slice = entries.slice(-limit);
  if (!slice.length) return null;
  const totalCommits = slice.reduce((a,e)=>a+(e.commitCount||0),0);
  const totalSeconds = slice.reduce((a,e)=>a+(e.totalDurationSeconds||0),0);
  return {
    sampleSize: slice.length,
    commitCount: totalCommits,
    totalDurationSeconds: totalSeconds,
    commitsPerHour: totalSeconds>0 ? (totalCommits / (totalSeconds/3600)) : 0
  };
}

function phaseSummary(phasesObj){
  if (!phasesObj || typeof phasesObj !== 'object') return { done: [], pending: [] };
  const done = [], pending = [];
  for (const [k,v] of Object.entries(phasesObj)){
    const status = (v && v.status) || v || '';
    if (['done','complete','completed','ok','finished'].includes(String(status).toLowerCase())) done.push(k);
    else pending.push(k);
  }
  return { done, pending };
}

function renderMarkdown({ nowISO, latest, rolling, parseErrors, args }){
  if (!latest){
    return `# Velocity Forecast Summary\n\n**Generated:** ${nowISO}\n\n_No velocity log entries found.\n\nAdd telemetry by appending structured JSON lines to \
\`.logs/velocity-log.jsonl\` (one object per run). Example:_\n\n\n\`\`\`json\n{\\n  \"timestamp\": \"2025-11-11T00:12:33Z\",\n  \"commitCount\": 42,\n  \"totalDurationSeconds\": 28800,\n  \"phases\": { \"api_client\": \"done\", \"relational_logic\": \"in_progress\" }\n}\n\`\`\`\n\nThen re-run: \`npm run velocity:report\`.\n`;
  }

  const phase = phaseSummary(latest.phases);
  const rollingLine = rolling
    ? `${rolling.commitCount} commits in ${formatDuration(rolling.totalDurationSeconds)} (sample=${rolling.sampleSize}) → **${rolling.commitsPerHour.toFixed(2)} commits/hour**`
    : 'Insufficient data for rolling window.';

  const est = latest.estimate || latest.estimatedTask || null;
  const estBlock = est ? `\n- Current estimate target: **${est.name || est.task || est}** → remaining: ${est.remainingHours ?? 0}h` : '';

  return `# Velocity Forecast Summary\n\n**Generated:** ${nowISO}  \n**Snapshot Timestamp:** ${latest.timestamp}  \n**Subject:** Math Brain refactor velocity\n\n## What the data says\n\n- Latest run: **${latest.commitCount} commits** over **${formatDuration(latest.totalDurationSeconds)}** (${(latest.commitCount/(latest.totalDurationSeconds/3600)).toFixed(2)} commits/hour).\n- Rolling window (${args.limit}): ${rollingLine}.\n- Phases DONE: ${humanList(phase.done)}.  \n- Phases Pending: ${humanList(phase.pending)}.${estBlock}\n\n## Plain-English Outlook\n\n1. Current cadence suggests ~${(rolling?.commitsPerHour||latest.commitCount/(latest.totalDurationSeconds/3600)).toFixed(2)} commits/hour is sustainable short‑term.  \n2. All done phases indicate remaining focus should shift to documentation, CI hardening, and post‑refactor cleanup.  \n3. Feed more runs via \`velocity-tracker.js --analyze\` to refine rolling accuracy and detect acceleration or decay.\n\n## Suggested pipeline hook\n\nAdd an npm script: \`velocity:report\` → \`node scripts/velocity-artifacts.js\` and invoke it in CI after merge to main. Commit the updated \`docs/velocity-forecast.md\` so stakeholders always see a fresh forecast.\n\n---\n_Parsed lines: ${(latest._index||0)+1}/${(latest._total||0)}. Parse errors: ${parseErrors}. Generated by velocity-artifacts.js v1.0.0._\n`;
}

function main(){
  const args = parseArgs(process.argv);
  if (args.help){
    console.log('Usage: node scripts/velocity-artifacts.js [--out docs/velocity-forecast.md] [--limit 10]');
    process.exit(0);
  }
  const logPath = path.join(process.cwd(), '.logs', 'velocity-log.jsonl');
  let entries = [];
  let parseErrors = 0;
  if (fs.existsSync(logPath)) {
    const raw = fs.readFileSync(logPath,'utf8').split(/\r?\n/).filter(Boolean);
    raw.forEach((line,i)=>{
      try { const obj = JSON.parse(line); obj._index = i; obj._total = raw.length; entries.push(obj); }
      catch { parseErrors++; }
    });
    entries.sort((a,b)=> new Date(a.timestamp) - new Date(b.timestamp));
  }
  const latest = entries.length ? entries[entries.length-1] : null;
  const rolling = entries.length ? computeRolling(entries, args.limit) : null;
  const md = renderMarkdown({ nowISO: new Date().toISOString(), latest, rolling, parseErrors, args });
  const outPath = path.isAbsolute(args.out) ? args.out : path.join(process.cwd(), args.out);
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`Velocity forecast written: ${outPath}`);
}

main();

