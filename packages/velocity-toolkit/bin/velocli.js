#!/usr/bin/env node
/* eslint-disable no-console */
// Simple proxy CLI for the velocity toolkit skeleton.
// For now it shells out to existing repo scripts so we can test
// the developer experience before extracting into a standalone package.

const { spawnSync } = require('child_process');
const path = require('path');

function runNode(target, args = []) {
  const abs = path.resolve(process.cwd(), target);
  const res = spawnSync(process.execPath, [abs, ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  if (res.status !== 0) process.exit(res.status || 1);
}

function main() {
  const [, , cmd, ...rest] = process.argv;
  switch ((cmd || '').toLowerCase()) {
    case 'analyze':
      runNode('scripts/velocity-tracker.js', ['--analyze']);
      break;
    case 'estimate': {
      // Pass the remainder as a single task string if provided
      const task = rest.join(' ').trim();
      const args = ['--estimate'];
      if (task) args.push(task);
      runNode('scripts/velocity-tracker.js', args);
      break;
    }
    case 'report':
      runNode('scripts/velocity-artifacts.js');
      break;
    case 'all':
      runNode('scripts/velocity-tracker.js', ['--analyze']);
      runNode('scripts/velocity-artifacts.js');
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      console.log(`
velocli <command>

Commands:
  analyze            Analyze latest velocity and append to .logs
  estimate <task>    Estimate a task using precedent
  report             Generate docs/velocity-forecast.md
  all                Analyze + report
  help               Show this help
`);
  }
}

if (require.main === module) {
  main();
}

