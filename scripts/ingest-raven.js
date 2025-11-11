#!/usr/bin/env node
/**
 * Ingests the Raven-ChatBot-V2 repo into a JSON “vector store” (demo only).
 * Replace embedText() with your Perplexity embedding call when ready.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_DIR = path.resolve(process.cwd(), 'external/raven-chatbot-v2');
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'raven_store.json');

const INCLUDE_DIRS = ['components', 'services'];
const INCLUDE_FILES = ['README.md', 'App.tsx', 'index.tsx', 'types.ts', 'metadata.json'];
const TEXT_EXT = /\.(md|ts|tsx|js|jsx|json|html|css)$/;

function sha1(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

function isIncluded(relativePath) {
  if (INCLUDE_FILES.includes(relativePath)) return true;
  const topLevel = relativePath.split(path.sep)[0];
  return INCLUDE_DIRS.includes(topLevel) && TEXT_EXT.test(relativePath);
}

function collectFiles(baseDir) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['.git', 'node_modules', '.next', 'dist', 'build'].includes(entry.name)) continue;
        walk(full);
      } else {
        const rel = path.relative(baseDir, full);
        if (isIncluded(rel)) files.push(full);
      }
    }
  };
  walk(baseDir);
  return files;
}

function chunkText(text, maxLen = 1800, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxLen, text.length);

    if (end < text.length) {
      const windowStart = start + 400;
      if (windowStart < end) {
        const boundary = text.lastIndexOf('\n', end);
        if (boundary !== -1 && boundary >= windowStart) {
          end = boundary + 1; // include newline so next chunk starts cleanly
        }
      }
    }

    const chunk = text.slice(start, end);
    if (chunk.length === 0) break;
    chunks.push(chunk);

    if (end >= text.length) break;
    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}

async function embedText(text) {
  const seed = parseInt(sha1(text).slice(0, 8), 16);
  return Array.from({ length: 128 }, (_, i) => ((seed % (i + 23)) / (i + 23)));
}

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source directory not found: ${SOURCE_DIR}`);
  }

  const files = collectFiles(SOURCE_DIR);
  const writer = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });
  writer.write('[\n');

  let totalDocs = 0;
  let first = true;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(SOURCE_DIR, file);
    const chunks = chunkText(content);

    for (let i = 0; i < chunks.length; i++) {
      const doc = {
        id: `raven::${relPath}::${i}`,
        repo: 'raven-chatbot-v2',
        path: file,
        relPath,
        chunkIndex: i,
        text: chunks[i],
        embedding: await embedText(chunks[i]),
      };

      if (!first) {
        writer.write(',\n');
      } else {
        first = false;
      }
      writer.write(JSON.stringify(doc));
      totalDocs += 1;
    }
  }

  writer.write('\n]\n');
  writer.end();

  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  console.log(`Ingested ${totalDocs} chunks from ${files.length} files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
