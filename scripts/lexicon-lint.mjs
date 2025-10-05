import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.json']);
const SEARCH_ROOTS = [
  'lib/voice',
  'lib/balance',
  'lib/export',
  'lib/reporting',
  'lib/weatherDataTransforms.ts',
  'lib/weatherTransforms.ts',
  'scripts',
];
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'out',
  'coverage',
  'public'
]);

const rules = [
  {
    name: 'Uncodified phrases',
    scopeHint: /./,
    forbidden: /\b(storm system|surge collapse|apocalyptic|doomsday)\b/i,
    message: 'Unapproved phrase detected.',
  },
];

function walk(startDir) {
  const stack = [startDir];
  const files = [];

  while (stack.length) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.git')) continue;
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          stack.push(fullPath);
        }
        continue;
      }

      const ext = path.extname(entry.name);
      if (EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function lintFile(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const issues = [];

  for (const rule of rules) {
    const hintRegex = new RegExp(rule.scopeHint);
    if (!hintRegex.test(text)) continue;

    hintRegex.lastIndex = 0;
    const forbiddenRegex = new RegExp(rule.forbidden);
    if (forbiddenRegex.test(text)) {
      issues.push(`${filePath}: ${rule.message}`);
    }
  }

  return issues;
}

const root = process.cwd();
const rawCandidates = SEARCH_ROOTS
  .map((entry) => path.join(root, entry))
  .flatMap((entry) => {
    try {
      const stats = statSync(entry);
      if (stats.isDirectory()) {
        return walk(entry);
      }
      if (stats.isFile() && EXTENSIONS.has(path.extname(entry))) {
        return [entry];
      }
    } catch {
      return [];
    }
    return [];
  });
const candidates = rawCandidates.filter((filePath) => !filePath.includes('lib/voice/guard.ts'));
const errors = candidates.flatMap(lintFile);

if (errors.length) {
  console.error('\nLexicon lint failed:');
  for (const err of errors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}

console.log('Lexicon lint passed.');
