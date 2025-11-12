#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * STC Experiment Logger
 *
 * Appends structured experiment outcomes to `.logs/stc-experiments.jsonl` so
 * Signal → Trace → Convergence tests have durable telemetry.
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { execSync } = require('child_process');

function parseArgs(argv) {
  const options = {
    links: [],
    tags: [],
  };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--experiment':
      case '--name':
        options.experiment = args[++i];
        break;
      case '--result':
      case '--outcome':
        options.result = args[++i];
        break;
      case '--notes':
        options.notes = args[++i];
        break;
      case '--link':
      case '--links':
        options.links.push(args[++i]);
        break;
      case '--tag':
      case '--tags':
        options.tags.push(args[++i]);
        break;
      case '--context':
        options.context = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (!options.notes && !arg.startsWith('--')) {
          options.notes = arg;
        } else {
          console.warn(`Unrecognized argument: ${arg}`);
        }
    }
  }
  return options;
}

function usage() {
  console.log(`STC Experiment Logger\n\n` +
    'Usage:\n  node scripts/stc-experiment-log.js --experiment "Ablation Test" --result success --notes "Copilot still surfaced thesis"\n\n' +
    'Flags:\n  --experiment, --name   Experiment identifier (required)\n  --result, --outcome   Result label (success|failure|pending, required)\n  --notes               Free-form summary\n  --link                Append a link (repeatable)\n  --tag                 Append a short tag (repeatable)\n  --context             Optional run context (e.g., tool)\n');
}

function ensureFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }
}

function gitContext() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
    const commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
    return { branch, commit };
  } catch (err) {
    return { branch: null, commit: null };
  }
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    usage();
    process.exit(0);
  }
  if (!opts.experiment || !opts.result) {
    usage();
    console.error('\n⚠️  Missing required flags --experiment and/or --result.');
    process.exit(1);
  }

  const logPath = path.resolve(process.cwd(), process.env.STC_EXPERIMENT_LOG_PATH || '.logs/stc-experiments.jsonl');
  ensureFile(logPath);

  const git = gitContext();
  const entry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    experiment: opts.experiment,
    result: opts.result,
    notes: opts.notes || null,
    links: opts.links.length ? opts.links : undefined,
    tags: opts.tags.length ? opts.tags : undefined,
    context: opts.context || undefined,
    branch: git.branch,
    commit: git.commit,
  };

  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
  console.log(`✅ Logged ${entry.experiment} (${entry.result}) to ${logPath}`);
  console.log('Next: summarize the run in docs/STC_EXPERIMENT_LOG.md for traceability.');
}

main();
